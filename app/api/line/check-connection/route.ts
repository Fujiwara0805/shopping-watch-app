// app/api/line/check-connection/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`🔍 Checking LINE connection for user: ${session.user.id}`);

    // ユーザーのLINE接続状況を確認
    const { data: userData, error } = await supabase
      .from('app_users')
      .select('line_id, email')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('Error checking LINE connection:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const isConnected = !!(userData?.line_id);

    console.log(`✅ LINE connection status for user ${session.user.id}: ${isConnected ? 'Connected' : 'Not connected'}`);

    return NextResponse.json({ 
      isConnected,
      lineId: userData?.line_id || null,
      userEmail: userData?.email || null
    });
  } catch (error) {
    console.error('Error in LINE connection check:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`🔗 Auto-linking attempt for user: ${session.user.id}`);

    // Webhookイベントからの最新のLINE友達追加を確認して紐付け
    const result = await linkLatestLineUser(session.user.id);

    console.log(`🔗 Auto-linking result for user ${session.user.id}:`, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in LINE connection linking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function linkLatestLineUser(userId: string) {
  try {
    console.log(`🔗 Starting auto-link process for user: ${userId}`);

    // 1. 現在のユーザーが既にLINE接続を持っているかチェック
    const { data: currentUser, error: userError } = await supabase
      .from('app_users')
      .select('line_id, email')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching current user:', userError);
      return { success: false, error: 'User not found' };
    }

    if (currentUser.line_id) {
      console.log(`ℹ️  User ${userId} already has LINE ID: ${currentUser.line_id}`);
      return { 
        success: true, 
        alreadyConnected: true,
        message: 'Already connected to LINE',
        lineId: currentUser.line_id
      };
    }

    console.log(`🔍 User ${userId} (${currentUser.email}) is not connected to LINE. Attempting to link...`);

    // 2. 同じメールアドレスでLINE認証履歴を確認
    const { data: lineAuthUser, error: lineAuthError } = await supabase
      .from('app_users')
      .select('id, line_id, email')
      .eq('email', currentUser.email)
      .not('line_id', 'is', null)
      .single();

    if (!lineAuthError && lineAuthUser && lineAuthUser.line_id) {
      console.log(`🔗 Found existing LINE auth for email ${currentUser.email}: ${lineAuthUser.line_id}`);
      
      // 同じメールアドレスで既にLINE認証されたアカウントがある場合、そのline_idを使用
      const { error: updateError } = await supabase
        .from('app_users')
        .update({ 
          line_id: lineAuthUser.line_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user with existing LINE ID:', updateError);
        return { success: false, error: 'Failed to link existing LINE account' };
      }

      // 成功ログを保存
      await supabase
        .from('debug_logs')
        .insert({
          type: 'existing_line_account_linked',
          data: {
            userId: userId,
            userEmail: currentUser.email,
            lineUserId: lineAuthUser.line_id,
            sourceUserId: lineAuthUser.id,
            timestamp: new Date().toISOString()
          }
        });

      console.log(`✅ Successfully linked user ${userId} to existing LINE ID ${lineAuthUser.line_id}`);
      
      return {
        success: true,
        newConnection: true,
        message: 'Successfully connected to existing LINE account',
        lineId: lineAuthUser.line_id
      };
    }

    // 3. デバッグログから最近の友達追加イベントをチェック
    try {
      const { data: recentFollows, error: debugError } = await supabase
        .from('debug_logs')
        .select('data, created_at')
        .eq('type', 'new_line_user_follow')
        .order('created_at', { ascending: false })
        .limit(10); // より多くのレコードをチェック

      if (!debugError && recentFollows && recentFollows.length > 0) {
        console.log(`🔍 Found ${recentFollows.length} recent follow events`);
        
        // 最新の友達追加イベントの中で、まだ紐付けられていないユーザーがいるかチェック
        for (const follow of recentFollows) {
          const lineUserId = follow.data.lineUserId;
          
          if (lineUserId) {
            // このLINE IDが既に他のユーザーに紐付けられていないかチェック
            const { data: existingUser, error: checkError } = await supabase
              .from('app_users')
              .select('id, email')
              .eq('line_id', lineUserId)
              .single();

            if (checkError && checkError.code === 'PGRST116') {
              // まだ紐付けられていないLINE IDを発見
              console.log(`🎯 Found unlinked LINE user: ${lineUserId} from ${follow.created_at}`);
              
              // 5分以内の友達追加のみを自動リンク対象とする（セキュリティ向上）
              const followTime = new Date(follow.created_at);
              const now = new Date();
              const diffMinutes = (now.getTime() - followTime.getTime()) / (1000 * 60);
              
              if (diffMinutes <= 5) {
                // 紐付けを実行
                const { error: linkError } = await supabase
                  .from('app_users')
                  .update({ 
                    line_id: lineUserId,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', userId);

                if (!linkError) {
                  console.log(`✅ Successfully auto-linked user ${userId} to LINE ${lineUserId}`);
                  
                  // 成功ログを保存
                  await supabase
                    .from('debug_logs')
                    .insert({
                      type: 'auto_line_link_success',
                      data: {
                        userId: userId,
                        userEmail: currentUser.email,
                        lineUserId: lineUserId,
                        followTimestamp: follow.created_at,
                        linkDelayMinutes: diffMinutes,
                        timestamp: new Date().toISOString()
                      }
                    });
                  
                  return {
                    success: true,
                    newConnection: true,
                    message: 'Successfully auto-linked to recent follow event',
                    lineId: lineUserId
                  };
                } else {
                  console.error('Error linking user to LINE:', linkError);
                }
              } else {
                console.log(`⏰ Follow event too old (${diffMinutes.toFixed(1)} minutes ago), skipping auto-link`);
              }
            } else if (existingUser) {
              console.log(`ℹ️  LINE ID ${lineUserId} already linked to user ${existingUser.id} (${existingUser.email})`);
            }
          }
        }
      } else {
        console.log('📭 No recent follow events found in debug logs');
      }
    } catch (debugError) {
      console.warn('Warning: Error checking debug logs for recent follows:', debugError);
    }

    // 4. 自動紐付けできない場合
    console.log(`❌ Auto-link failed for user ${userId}`);
    
    // 失敗ログを保存（デバッグ用）
    await supabase
      .from('debug_logs')
      .insert({
        type: 'auto_line_link_failed',
        data: {
          userId: userId,
          userEmail: currentUser.email,
          reason: 'No unlinked recent follow events found',
          timestamp: new Date().toISOString()
        }
      });

    return { 
      success: false, 
      error: 'LINE connection not found. Please make sure you have added the bot as a friend and try the manual connection option.' 
    };

  } catch (error) {
    console.error('Error in linkLatestLineUser:', error);
    
    // エラーログを保存
    await supabase
      .from('debug_logs')
      .insert({
        type: 'auto_line_link_error',
        data: {
          userId: userId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      });

    return { success: false, error: 'Internal server error' };
  }
}