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

    // ユーザーのLINE接続状況を確認
    const { data: userData, error } = await supabase
      .from('app_users')
      .select('line_id')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('Error checking LINE connection:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const isConnected = !!(userData?.line_id);

    return NextResponse.json({ 
      isConnected,
      lineId: userData?.line_id || null
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

    // Webhookイベントからの最新のLINE友達追加を確認して紐付け
    const result = await linkLatestLineUser(session.user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in LINE connection linking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function linkLatestLineUser(userId: string) {
  try {
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
      return { 
        success: true, 
        alreadyConnected: true,
        message: 'Already connected to LINE'
      };
    }

    console.log(`User ${userId} is not connected to LINE. Attempting to link...`);

    // 2. 現在のユーザーのメールアドレスでLINE認証履歴を確認
    // （LINE Provider経由でログインしたことがある場合）
    const { data: lineAuthUser, error: lineAuthError } = await supabase
      .from('app_users')
      .select('id, line_id, email')
      .eq('email', currentUser.email)
      .not('line_id', 'is', null)
      .single();

    if (!lineAuthError && lineAuthUser && lineAuthUser.line_id) {
      // 同じメールアドレスで既にLINE認証されたアカウントがある場合、そのline_idを使用
      const { error: updateError } = await supabase
        .from('app_users')
        .update({ line_id: lineAuthUser.line_id })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user with existing LINE ID:', updateError);
        return { success: false, error: 'Failed to link existing LINE account' };
      }

      console.log(`Successfully linked user ${userId} to existing LINE ID ${lineAuthUser.line_id}`);
      
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
        .limit(5);

      if (!debugError && recentFollows && recentFollows.length > 0) {
        console.log(`Found ${recentFollows.length} recent follow events`);
        
        // 最新の友達追加イベントの中で、まだ紐付けられていないユーザーがいるかチェック
        for (const follow of recentFollows) {
          const lineUserId = follow.data.lineUserId;
          
          if (lineUserId) {
            // このLINE IDが既に他のユーザーに紐付けられていないかチェック
            const { data: existingUser, error: checkError } = await supabase
              .from('app_users')
              .select('id')
              .eq('line_id', lineUserId)
              .single();

            if (checkError && checkError.code === 'PGRST116') {
              // まだ紐付けられていないLINE IDを発見
              console.log(`Found unlinked LINE user: ${lineUserId}`);
              
              // 紐付けを実行
              const { error: linkError } = await supabase
                .from('app_users')
                .update({ line_id: lineUserId })
                .eq('id', userId);

              if (!linkError) {
                console.log(`Successfully auto-linked user ${userId} to LINE ${lineUserId}`);
                
                // 成功ログを保存
                await supabase
                  .from('debug_logs')
                  .insert({
                    type: 'auto_line_link_success',
                    data: {
                      userId: userId,
                      userEmail: currentUser.email,
                      lineUserId: lineUserId,
                      followTimestamp: follow.created_at
                    }
                  });
                
                return {
                  success: true,
                  newConnection: true,
                  message: 'Successfully auto-linked to recent follow event',
                  lineId: lineUserId
                };
              }
            }
          }
        }
      }
    } catch (debugError) {
      console.warn('Error checking debug logs for recent follows:', debugError);
    }

    // 4. 自動紐付けできない場合
    return { 
      success: false, 
      error: 'LINE connection not found. Please make sure you have added the bot as a friend and try the manual connection option.' 
    };

  } catch (error) {
    console.error('Error in linkLatestLineUser:', error);
    return { success: false, error: 'Internal server error' };
  }
}