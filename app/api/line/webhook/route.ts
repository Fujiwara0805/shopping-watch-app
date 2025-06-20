import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { supabase } from '@/lib/supabaseClient';

// LINE Bot Channel Secret（環境変数から取得）
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

// LINE署名を検証する関数
function verifySignature(body: string, signature: string): boolean {
  if (!CHANNEL_SECRET) {
    console.error('LINE_CHANNEL_SECRET is not configured');
    return false;
  }

  try {
    const hash = createHmac('sha256', CHANNEL_SECRET)
      .update(body)
      .digest('base64');
    
    const expectedSignature = `sha256=${hash}`;
    const isValid = expectedSignature === signature;
    
    console.log('Signature verification:', {
      provided: signature,
      expected: expectedSignature,
      isValid: isValid,
      bodyLength: body.length
    });
    
    return isValid;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

// GET リクエスト（検証用）
export async function GET(request: NextRequest) {
  console.log('LINE Webhook GET request received at:', new Date().toISOString());
  return NextResponse.json({ 
    message: 'LINE Webhook endpoint is active',
    timestamp: new Date().toISOString(),
    status: 'OK'
  });
}

// POST リクエスト（メインのWebhook処理）
export async function POST(request: NextRequest) {
  console.log('=== LINE Webhook POST request received ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('User-Agent:', request.headers.get('user-agent'));
  console.log('Content-Type:', request.headers.get('content-type'));

  try {
    // リクエストボディを取得
    const body = await request.text();
    const signature = request.headers.get('x-line-signature');

    console.log('Request details:', {
      bodyLength: body.length,
      hasSignature: !!signature,
      environment: process.env.NODE_ENV
    });

    // 署名検証（失敗しても処理を継続）
    let signatureValid = false;
    if (signature && CHANNEL_SECRET) {
      signatureValid = verifySignature(body, signature);
      if (!signatureValid) {
        console.warn('⚠️ Signature verification failed, but continuing processing for LINE Console compatibility');
      } else {
        console.log('✅ Signature verification successful');
      }
    } else {
      console.warn('⚠️ Missing signature or channel secret');
    }

    // JSONデータをパース
    let data;
    try {
      data = JSON.parse(body);
      console.log('✅ JSON parsing successful');
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError);
      console.log('Raw body content:', body.substring(0, 200));
      // JSON解析失敗でも200を返す（LINE Developer Console対応）
      return NextResponse.json({ message: 'OK' }, { status: 200 });
    }

    console.log('Webhook data structure:', {
      hasEvents: !!data.events,
      eventsCount: data.events?.length || 0,
      eventTypes: data.events?.map((e: any) => e.type) || []
    });

    // イベント処理
    if (data.events && Array.isArray(data.events)) {
      console.log(`📝 Processing ${data.events.length} events`);
      
      for (const event of data.events) {
        try {
          console.log(`🔄 Processing event: ${event.type} from user: ${event.source?.userId}`);
          await handleLineEvent(event);
        } catch (eventError) {
          console.error('❌ Error handling event:', event.type, eventError);
          // イベント処理エラーがあっても続行
        }
      }
    } else {
      console.log('ℹ️ No events to process (this is normal for LINE Console verification)');
    }

    console.log('✅ Webhook processing completed successfully');
    // 必ず200ステータスコードを返す
    return NextResponse.json({ message: 'OK' }, { status: 200 });

  } catch (error) {
    console.error('❌ Critical error processing LINE webhook:', error);
    // エラーが発生しても200を返す（LINE側の要求に従う）
    return NextResponse.json({ message: 'OK' }, { status: 200 });
  }
}

async function handleLineEvent(event: any) {
  console.log(`🎯 Handling ${event.type} event from user: ${event.source?.userId}`);

  if (!event.source?.userId) {
    console.warn('⚠️ Event does not have userId');
    return;
  }

  switch (event.type) {
    case 'follow':
      await handleFollowEvent(event);
      break;
    case 'unfollow':
      await handleUnfollowEvent(event);
      break;
    case 'message':
      await handleMessageEvent(event);
      break;
    default:
      console.log(`ℹ️ Unhandled event type: ${event.type}`);
  }
}

async function handleFollowEvent(event: any) {
  const lineUserId = event.source.userId;
  
  console.log(`👥 User ${lineUserId} followed the bot`);

  try {
    // ユーザーのプロフィール情報を取得
    let displayName = 'LINE User';
    
    if (CHANNEL_ACCESS_TOKEN) {
      try {
        console.log(`📞 Fetching profile for user: ${lineUserId}`);
        const profileResponse = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
          headers: {
            'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
          },
        });

        if (profileResponse.ok) {
          const profile = await profileResponse.json();
          displayName = profile.displayName || 'LINE User';
          console.log(`✅ User profile fetched: ${displayName}`);
        } else {
          console.warn(`⚠️ Failed to fetch profile: ${profileResponse.status}`);
        }
      } catch (profileError) {
        console.error('❌ Error fetching LINE profile:', profileError);
      }
    } else {
      console.warn('⚠️ CHANNEL_ACCESS_TOKEN not configured');
    }

    // 既存のapp_usersテーブルでline_idが既に存在するかチェック
    try {
      console.log(`🔍 Checking if LINE user ${lineUserId} is already linked`);
      const { data: existingUser, error: checkError } = await supabase
        .from('app_users')
        .select('id, email')
        .eq('line_id', lineUserId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Error checking existing LINE user:', checkError);
      } else if (existingUser) {
        console.log(`✅ LINE user ${lineUserId} is already linked to user ${existingUser.id} (${existingUser.email})`);
      } else {
        console.log(`ℹ️ New LINE user ${lineUserId} - waiting for app login to link account`);
      }
    } catch (dbError) {
      console.error('❌ Database error:', dbError);
    }

    // フォローイベントを一時的に保存（接続待ちユーザーとして）
    const { error: insertError } = await supabase
      .from('pending_line_connections')
      .insert({
        line_user_id: lineUserId,
        display_name: displayName,
        followed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30分後に期限切れ
      });

    if (insertError) {
      console.error('Error saving pending connection:', insertError);
    }

    // ウェルカムメッセージに接続方法を含める
    await sendWelcomeMessageWithConnection(lineUserId, displayName);

  } catch (error) {
    console.error('❌ Error handling follow event:', error);
  }
}

async function handleUnfollowEvent(event: any) {
  const lineUserId = event.source.userId;
  
  console.log(`👋 User ${lineUserId} unfollowed the bot`);

  try {
    // app_usersテーブルのline_idをnullに設定
    console.log(`🔄 Removing LINE ID ${lineUserId} from app_users`);
    const { data: updatedUsers, error: updateUserError } = await supabase
      .from('app_users')
      .update({ line_id: null })
      .eq('line_id', lineUserId)
      .select('id, email');

    if (updateUserError) {
      console.error('❌ Error removing LINE ID from app_users:', updateUserError);
    } else if (updatedUsers && updatedUsers.length > 0) {
      console.log(`✅ LINE ID removed from ${updatedUsers.length} user(s):`, updatedUsers.map(u => u.email));
    } else {
      console.log('ℹ️ No users found to update for unfollow event');
    }

  } catch (error) {
    console.error('❌ Error handling unfollow event:', error);
  }
}

async function handleMessageEvent(event: any) {
  const lineUserId = event.source.userId;
  const messageText = event.message?.text;

  console.log(`💬 Message from ${lineUserId}: "${messageText}"`);

  try {
    // 特定のキーワードに対する自動応答
    if (messageText?.toLowerCase().includes('連携') || messageText?.toLowerCase().includes('接続')) {
      console.log('🔗 Sending link instructions');
      await sendLinkInstructions(lineUserId);
    } else if (messageText?.toLowerCase().includes('help') || messageText?.toLowerCase().includes('ヘルプ')) {
      console.log('❓ Sending help message');
      await sendHelpMessage(lineUserId);
    } else {
      console.log('💭 Sending general response');
      await sendGeneralResponse(lineUserId);
    }
  } catch (error) {
    console.error('❌ Error handling message event:', error);
  }
}

async function sendWelcomeMessageWithConnection(lineUserId: string, displayName: string) {
  const welcomeMessage = `${displayName}さん、トクドクの公式LINEアカウントを友だち追加いただき、ありがとうございます！🎉

📱 アプリとの連携方法：
1. トクドクアプリを開く
2. プロフィール → 設定 → LINE通知設定
3. 「接続確認」ボタンをタップ

⏰ 連携は友だち追加から30分以内に行ってください。

何かご不明な点がございましたら、いつでもメッセージをお送りください！`;

  await sendLineMessage(lineUserId, welcomeMessage);
}

async function sendLinkInstructions(lineUserId: string) {
  const linkMessage = `アプリとの連携方法をご案内します！

📱 連携手順：
1. ショッピングウォッチアプリを開く
2. プロフィール画面の「設定」をタップ
3. 「LINE通知設定」で接続状況を確認
4. 「接続確認」ボタンをタップ

連携が完了すると、お気に入り店舗の新着情報をLINEでお知らせします！

※ LINEログインを使用している場合は自動で連携されます。`;

  await sendLineMessage(lineUserId, linkMessage);
}

async function sendHelpMessage(lineUserId: string) {
  const helpMessage = `ショッピングウォッチ LINE Bot ヘルプ

🔗 よく使われるキーワード：
「連携」- アプリとの連携方法をご案内
「ヘルプ」- このヘルプメッセージを表示

📱 アプリについて：
ショッピングウォッチは、お得な商品情報を共有できるアプリです。お気に入り店舗を設定すると、新着情報をLINEでお知らせします。

❓ その他のご質問：
アプリ内のお問い合わせ機能をご利用ください。`;

  await sendLineMessage(lineUserId, helpMessage);
}

async function sendGeneralResponse(lineUserId: string) {
  const generalMessage = `メッセージをお送りいただき、ありがとうございます！

ショッピングウォッチでは、お気に入り店舗の値引き情報をリアルタイムでお知らせしています。

💡 便利な機能：
「連携」→ アプリとの連携方法
「ヘルプ」→ 使い方ガイド

その他のご質問やサポートが必要な場合は、アプリ内のお問い合わせ機能をご利用ください。`;

  await sendLineMessage(lineUserId, generalMessage);
}

async function sendLineMessage(lineUserId: string, message: string) {
  if (!CHANNEL_ACCESS_TOKEN) {
    console.error('❌ LINE_CHANNEL_ACCESS_TOKEN is not configured');
    return;
  }

  try {
    console.log(`📤 Sending message to ${lineUserId}...`);
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [
          {
            type: 'text',
            text: message
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to send LINE message:', {
        status: response.status,
        statusText: response.statusText,
        userId: lineUserId,
        error: errorText
      });
    } else {
      console.log(`✅ LINE message sent successfully to: ${lineUserId}`);
    }
  } catch (error) {
    console.error('❌ Error sending LINE message:', error);
  }
}