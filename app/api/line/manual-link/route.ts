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

    if (!lineUserId) {
      return NextResponse.json({ error: 'LINE User ID is required' }, { status: 400 });
    }

    console.log(`🔗 Manual LINE linking request: User ${session.user.id} -> LINE ${lineUserId}`);

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
      return NextResponse.json({ 
        error: 'Already connected to LINE',
        currentLineId: currentUser.line_id
      }, { status: 400 });
    }

    // 2. 指定されたLINE IDが既に他のユーザーに紐付けられていないかチェック
    const { data: existingLineUser, error: lineUserError } = await supabase
      .from('app_users')
      .select('id, email')
      .eq('line_id', lineUserId)
      .single();

    if (lineUserError && lineUserError.code !== 'PGRST116') {
      console.error('Error checking existing LINE user:', lineUserError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (existingLineUser) {
      return NextResponse.json({ 
        error: 'This LINE account is already connected to another user',
        connectedToEmail: existingLineUser.email
      }, { status: 400 });
    }

    // 3. デバッグログからこのLINE IDが実際に友達追加されているかチェック
    const { data: debugLogs, error: debugError } = await supabase
      .from('debug_logs')
      .select('data, created_at')
      .eq('type', 'new_line_user_follow')
      .contains('data', { lineUserId: lineUserId })
      .order('created_at', { ascending: false })
      .limit(1);

    if (debugError) {
      console.error('Error checking debug logs:', debugError);
    }

    const hasFollowEvent = debugLogs && debugLogs.length > 0;

    if (!hasFollowEvent) {
      console.warn(`No follow event found for LINE user ${lineUserId}`);
      // 警告するが、紐付けは許可する（デバッグログが無い場合もある）
    }

    // 4. LINE User IDを現在のユーザーに紐付け
    const { error: updateError } = await supabase
      .from('app_users')
      .update({ line_id: lineUserId })
      .eq('id', session.user.id);

    if (updateError) {
      console.error('Error updating user with LINE ID:', updateError);
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
          lineUserId: lineUserId,
          hasFollowEvent: hasFollowEvent,
          timestamp: new Date().toISOString()
        }
      });

    console.log(`✅ Successfully linked user ${session.user.id} to LINE ${lineUserId}`);

    return NextResponse.json({
      success: true,
      message: 'LINE account successfully linked',
      lineUserId: lineUserId,
      hasFollowEvent: hasFollowEvent
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

    // 最近の友達追加イベントを取得
    const { data: recentFollows, error } = await supabase
      .from('debug_logs')
      .select('data, created_at')
      .eq('type', 'new_line_user_follow')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching recent follows:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const follows = recentFollows?.map(log => ({
      lineUserId: log.data.lineUserId,
      displayName: log.data.displayName,
      timestamp: log.created_at
    })) || [];

    return NextResponse.json({
      recentFollows: follows,
      count: follows.length
    });

  } catch (error) {
    console.error('Error fetching recent follows:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}