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
      return NextResponse.json({ success: false, error: 'User not found' });
    }

    if (currentUser.line_id) {
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

    if (existingLineUser?.line_id) {
      // 既存の接続を現在のユーザーにコピー
      const { error: updateError } = await supabase
        .from('app_users')
        .update({ line_id: existingLineUser.line_id })
        .eq('id', session.user.id);

      if (!updateError) {
        return NextResponse.json({
          success: true,
          newConnection: true,
          lineId: existingLineUser.line_id
        });
      }
    }

    // 3. 最近のフォローイベントから自動接続を試行
    const { data: pendingConnections, error: pendingError } = await supabase
      .from('pending_line_connections')
      .select('*')
      .is('connected_to_user_id', null)
      .gt('expires_at', new Date().toISOString())
      .order('followed_at', { ascending: false })
      .limit(5);

    if (!pendingError && pendingConnections && pendingConnections.length > 0) {
      console.log(`📋 Found ${pendingConnections.length} pending connections for auto-linking`);
      
      // 最新のフォローイベントを使用（時間的に最も近いもの）
      const latestConnection = pendingConnections[0];
      
      console.log(`🔗 Attempting to link user ${session.user.id} with LINE ID: ${latestConnection.line_user_id}`);
      
      // 接続を実行
      const { error: linkError } = await supabase
        .from('app_users')
        .update({ 
          line_id: latestConnection.line_user_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id);

      if (!linkError) {
        console.log(`✅ Successfully updated app_users table for user ${session.user.id}`);
        
        // 接続済みとしてマーク
        const { error: markError } = await supabase
          .from('pending_line_connections')
          .update({ connected_to_user_id: session.user.id })
          .eq('id', latestConnection.id);

        if (markError) {
          console.error('⚠️ Failed to mark connection as used:', markError);
        } else {
          console.log(`✅ Successfully marked connection ${latestConnection.id} as used`);
        }

        // 接続完了メッセージをLINEに送信
        await sendConnectionSuccessMessage(latestConnection.line_user_id);

        return NextResponse.json({
          success: true,
          newConnection: true,
          lineId: latestConnection.line_user_id
        });
      } else {
        console.error('❌ Failed to update app_users table:', linkError);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to update user LINE ID',
          details: linkError.message 
        });
      }
    } else {
      if (pendingError) {
        console.error('❌ Error fetching pending connections:', pendingError);
        return NextResponse.json({ 
          success: false, 
          error: 'Database error while fetching pending connections',
          details: pendingError.message 
        });
      } else {
        console.log('📋 No pending connections found for auto-linking');
      }
    }

    // 4. 自動接続できない場合
    return NextResponse.json({ 
      success: false, 
      error: 'No recent LINE follow events found. Please add the bot as a friend first.' 
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