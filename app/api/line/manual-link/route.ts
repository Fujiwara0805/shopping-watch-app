// app/api/line/manual-link/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lineUserId } = await request.json();

    if (!lineUserId || typeof lineUserId !== 'string') {
      return NextResponse.json({ error: 'LINE User ID is required' }, { status: 400 });
    }

    const cleanLineUserId = lineUserId.trim();

    // LINE User IDの形式チェック
    if (!cleanLineUserId.startsWith('U') || cleanLineUserId.length !== 33) {
      console.warn(`❌ Invalid LINE User ID format: ${cleanLineUserId}`);
      return NextResponse.json({ 
        error: 'Invalid LINE User ID format. Should start with "U" and be 33 characters long.' 
      }, { status: 400 });
    }

    console.log(`🔗 Manual LINE linking request: User ${session.user.id} -> LINE ${cleanLineUserId}`);

    // 1. 現在のユーザーの状況確認
    const { data: currentUser, error: userError } = await supabase
      .from('app_users')
      .select('line_id, email')
      .eq('id', session.user.id)
      .single();

    if (userError) {
      console.error('Error fetching current user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (currentUser.line_id) {
      console.log(`ℹ️  User ${session.user.id} already connected to LINE: ${currentUser.line_id}`);
      return NextResponse.json({ 
        error: 'Already connected to LINE',
        currentLineId: currentUser.line_id
      }, { status: 400 });
    }

    // 2. 指定されたLINE IDが既に他のユーザーに紐付けられていないかチェック
    const { data: existingLineUser, error: lineUserError } = await supabase
      .from('app_users')
      .select('id, email')
      .eq('line_id', cleanLineUserId)
      .single();

    if (lineUserError && lineUserError.code !== 'PGRST116') {
      console.error('Error checking existing LINE user:', lineUserError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (existingLineUser) {
      console.log(`❌ LINE ID ${cleanLineUserId} already connected to user ${existingLineUser.id}`);
      return NextResponse.json({ 
        error: 'This LINE account is already connected to another user',
        connectedToEmail: existingLineUser.email?.replace(/(.{2}).*(@.*)/, '$1***$2') // メールアドレスの一部をマスク
      }, { status: 400 });
    }

    // 3. デバッグログからこのLINE IDが実際に友達追加されているかチェック
    const { data: debugLogs, error: debugError } = await supabase
      .from('debug_logs')
      .select('data, created_at')
      .eq('type', 'new_line_user_follow')
      .contains('data', { lineUserId: cleanLineUserId })
      .order('created_at', { ascending: false })
      .limit(1);

    if (debugError) {
      console.error('Error checking debug logs:', debugError);
    }

    const hasFollowEvent = debugLogs && debugLogs.length > 0;
    const followEventTime = hasFollowEvent ? debugLogs[0].created_at : null;

    if (!hasFollowEvent) {
      console.warn(`⚠️  No follow event found for LINE user ${cleanLineUserId}`);
      // 警告するが、紐付けは許可する（デバッグログが無い場合もある）
    } else {
      console.log(`✅ Found follow event for LINE user ${cleanLineUserId} at ${followEventTime}`);
    }

    // 4. LINE User IDを現在のユーザーに紐付け
    const { error: updateError } = await supabase
      .from('app_users')
      .update({ 
        line_id: cleanLineUserId,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id);

    if (updateError) {
      console.error('Error updating user with LINE ID:', updateError);
      
      // エラーログを保存
      await supabase
        .from('debug_logs')
        .insert({
          type: 'manual_line_link_error',
          data: {
            userId: session.user.id,
            userEmail: currentUser.email,
            lineUserId: cleanLineUserId,
            error: updateError.message,
            timestamp: new Date().toISOString()
          }
        });

      return NextResponse.json({ error: 'Failed to link LINE account' }, { status: 500 });
    }

    // 5. 成功ログを保存
    await supabase
      .from('debug_logs')
      .insert({
        type: 'manual_line_link_success',
        data: {
          userId: session.user.id,
          userEmail: currentUser.email,
          lineUserId: cleanLineUserId,
          hasFollowEvent: hasFollowEvent,
          followEventTime: followEventTime,
          timestamp: new Date().toISOString()
        }
      });

    console.log(`✅ Successfully linked user ${session.user.id} to LINE ${cleanLineUserId}`);

    return NextResponse.json({
      success: true,
      message: 'LINE account successfully linked',
      lineUserId: cleanLineUserId,
      hasFollowEvent: hasFollowEvent,
      followEventTime: followEventTime
    });

  } catch (error) {
    console.error('Error in manual LINE linking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: デバッグ用 - 最近の友達追加イベントを取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`🔍 Fetching recent follows for user: ${session.user.id}`);

    // 最近の友達追加イベントを取得
    const { data: recentFollows, error } = await supabase
      .from('debug_logs')
      .select('data, created_at')
      .eq('type', 'new_line_user_follow')
      .order('created_at', { ascending: false })
      .limit(20); // より多くのイベントを取得

    if (error) {
      console.error('Error fetching recent follows:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // 未連携のLINE IDのみをフィルタリング
    const filteredFollows = [];
    
    for (const log of recentFollows || []) {
      const lineUserId = log.data.lineUserId;
      
      if (lineUserId) {
        // このLINE IDが既に連携されているかチェック
        const { data: existingUser, error: checkError } = await supabase
          .from('app_users')
          .select('id')
          .eq('line_id', lineUserId)
          .single();

        // 未連携の場合のみ追加
        if (checkError && checkError.code === 'PGRST116') {
          // 追加可能時間を計算（5分以内のもののみ表示）
          const followTime = new Date(log.created_at);
          const now = new Date();
          const diffMinutes = (now.getTime() - followTime.getTime()) / (1000 * 60);
          
          if (diffMinutes <= 30) { // 30分以内のもので表示（手動接続の場合は少し長めに）
            filteredFollows.push({
              lineUserId: lineUserId,
              displayName: log.data.displayName || 'Unknown User',
              timestamp: log.created_at,
              minutesAgo: Math.floor(diffMinutes)
            });
          }
        }
      }
    }

    console.log(`📝 Found ${filteredFollows.length} unlinked recent follows (last 30 minutes)`);

    return NextResponse.json({
      recentFollows: filteredFollows,
      count: filteredFollows.length,
      totalEvents: recentFollows?.length || 0
    });

  } catch (error) {
    console.error('Error fetching recent follows:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: LINE接続を解除する（オプション機能）
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`🔓 LINE disconnection request for user: ${session.user.id}`);

    // 現在の接続状況を確認
    const { data: currentUser, error: userError } = await supabase
      .from('app_users')
      .select('line_id, email')
      .eq('id', session.user.id)
      .single();

    if (userError) {
      console.error('Error fetching current user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!currentUser.line_id) {
      return NextResponse.json({ 
        error: 'No LINE connection found' 
      }, { status: 400 });
    }

    // LINE接続を解除
    const { error: updateError } = await supabase
      .from('app_users')
      .update({ 
        line_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id);

    if (updateError) {
      console.error('Error disconnecting LINE:', updateError);
      return NextResponse.json({ error: 'Failed to disconnect LINE account' }, { status: 500 });
    }

    // 解除ログを保存
    await supabase
      .from('debug_logs')
      .insert({
        type: 'line_disconnection',
        data: {
          userId: session.user.id,
          userEmail: currentUser.email,
          disconnectedLineId: currentUser.line_id,
          timestamp: new Date().toISOString()
        }
      });

    console.log(`✅ Successfully disconnected LINE for user ${session.user.id}`);

    return NextResponse.json({
      success: true,
      message: 'LINE account successfully disconnected'
    });

  } catch (error) {
    console.error('Error in LINE disconnection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}