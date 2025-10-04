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

    // 1. 既に接続済みかチェック
    const { data: currentUser, error: userError } = await supabase
      .from('app_users')
      .select('line_id, email')
      .eq('id', session.user.id)
      .single();

    if (userError) {
      console.error('❌ User fetch error:', userError);
      return NextResponse.json({ success: false, error: 'User not found' });
    }

    console.log(`👤 Current user data:`, { 
      userId: session.user.id, 
      email: currentUser.email, 
      currentLineId: currentUser.line_id 
    });

    if (currentUser.line_id) {
      console.log(`✅ User already connected with LINE ID: ${currentUser.line_id}`);
      return NextResponse.json({ 
        success: true, 
        alreadyConnected: true,
        lineId: currentUser.line_id
      });
    }

    // 2. 同じメールアドレスでの既存LINE接続をチェック
    const { data: existingLineUser } = await supabase
      .from('app_users')
      .select('line_id')
      .eq('email', currentUser.email)
      .filter('line_id', 'not.is', null)
      .maybeSingle();

    console.log(`🔍 Existing LINE user check:`, existingLineUser);

    if (existingLineUser?.line_id) {
      console.log(`📋 Found existing LINE connection: ${existingLineUser.line_id}`);
      // 既存の接続を現在のユーザーにコピー
      const { error: updateError } = await supabase
        .from('app_users')
        .update({ line_id: existingLineUser.line_id })
        .eq('id', session.user.id);

      if (!updateError) {
        console.log(`✅ Copied existing LINE connection to current user`);
        return NextResponse.json({
          success: true,
          newConnection: true,
          lineId: existingLineUser.line_id
        });
      } else {
        console.error('❌ Error copying existing connection:', updateError);
      }
    }

    // 3. 最近のフォローイベントから自動接続を試行
    console.log(`🔍 Searching for pending connections...`);
    const { data: pendingConnections, error: pendingError } = await supabase
      .from('pending_line_connections')
      .select('*')
      .is('connected_to_user_id', null)
      .gte('expires_at', new Date().toISOString())
      .order('followed_at', { ascending: false })
      .limit(5);

    console.log(`📊 Pending connections query result:`, {
      error: pendingError,
      count: pendingConnections?.length || 0,
      connections: pendingConnections?.map(c => ({
        id: c.id,
        line_user_id: c.line_user_id,
        display_name: c.display_name,
        followed_at: c.followed_at,
        expires_at: c.expires_at,
        connected_to_user_id: c.connected_to_user_id
      }))
    });

    if (pendingError) {
      console.error('❌ Error fetching pending connections:', pendingError);
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while checking pending connections' 
      });
    }

    if (!pendingConnections || pendingConnections.length === 0) {
      console.log(`❌ No pending connections found`);
      return NextResponse.json({ 
        success: false, 
        error: 'No recent LINE follow events found. Please add the bot as a friend first.' 
      });
    }

    // 最新のフォローイベントを使用（時間的に最も近いもの）
    const latestConnection = pendingConnections[0];
    console.log(`🎯 Using latest connection:`, {
      id: latestConnection.id,
      line_user_id: latestConnection.line_user_id,
      display_name: latestConnection.display_name,
      followed_at: latestConnection.followed_at
    });
    
    // 接続を実行
    console.log(`🔗 Attempting to link LINE ID ${latestConnection.line_user_id} to user ${session.user.id}`);
    const { error: linkError } = await supabase
      .from('app_users')
      .update({ 
        line_id: latestConnection.line_user_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id);

    if (linkError) {
      console.error('❌ Error linking LINE ID to user:', linkError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to link LINE account' 
      });
    }

    console.log(`✅ Successfully linked LINE ID to user`);

    // 接続済みとしてマーク
    const { error: markError } = await supabase
      .from('pending_line_connections')
      .update({ connected_to_user_id: session.user.id })
      .eq('id', latestConnection.id);

    if (markError) {
      console.error('❌ Error marking connection as used:', markError);
      // 接続は成功したので、マークエラーは無視して続行
    } else {
      console.log(`✅ Marked pending connection as used`);
    }

    // 接続完了メッセージをLINEに送信
    try {
      await sendConnectionSuccessMessage(latestConnection.line_user_id);
      console.log(`✅ Connection success message sent to LINE`);
    } catch (messageError) {
      console.error('❌ Error sending connection success message:', messageError);
      // メッセージ送信エラーは無視して続行
    }

    return NextResponse.json({
      success: true,
      newConnection: true,
      lineId: latestConnection.line_user_id
    });

  } catch (error) {
    console.error('Error in LINE connection linking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// LINE Messaging API関数を追加
async function sendLineMessage(lineUserId: string, message: string) {
  const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  
  if (!CHANNEL_ACCESS_TOKEN) {
    console.warn('LINE_CHANNEL_ACCESS_TOKEN not configured');
    return;
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: 'text', text: message }]
      })
    });

    if (!response.ok) {
      console.error('Failed to send LINE message:', await response.text());
    }
  } catch (error) {
    console.error('Error sending LINE message:', error);
  }
}

async function sendConnectionSuccessMessage(lineUserId: string) {
  const successMessage = `🎉 アプリとの連携が完了しました！

これで、お気に入り店舗の新着情報をLINEで受け取れるようになりました。

📱 通知設定の変更はアプリのプロフィール画面から行えます。`;

  await sendLineMessage(lineUserId, successMessage);
}