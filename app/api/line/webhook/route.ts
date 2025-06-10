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
    
    return `sha256=${hash}` === signature;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

// GET リクエスト（検証用）
export async function GET(request: NextRequest) {
  console.log('LINE Webhook GET request received');
  return NextResponse.json({ 
    message: 'LINE Webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}

// POST リクエスト（メインのWebhook処理）
export async function POST(request: NextRequest) {
  console.log('LINE Webhook POST request received');

  try {
    // リクエストボディを取得
    const body = await request.text();
    const signature = request.headers.get('x-line-signature');

    console.log('Request body length:', body.length);
    console.log('Signature present:', !!signature);

    // 開発環境では署名検証をスキップ（本番環境では必ず有効にする）
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!isDevelopment) {
      // 本番環境では署名を検証
      if (!signature || !verifySignature(body, signature)) {
        console.error('Invalid LINE signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      console.log('Development mode: Skipping signature verification');
    }

    // JSONデータをパース
    let data;
    try {
      data = JSON.parse(body);
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    console.log('LINE Webhook data:', JSON.stringify(data, null, 2));

    // イベント処理
    if (data.events && Array.isArray(data.events)) {
      for (const event of data.events) {
        try {
          await handleLineEvent(event);
        } catch (eventError) {
          console.error('Error handling event:', eventError);
          // イベント処理エラーがあっても200を返す（LINE側の要求）
        }
      }
    }

    // 必ず200ステータスコードを返す
    return NextResponse.json({ message: 'OK' }, { status: 200 });

  } catch (error) {
    console.error('Error processing LINE webhook:', error);
    // エラーが発生しても200を返す（LINE側の要求に従う）
    return NextResponse.json({ message: 'OK' }, { status: 200 });
  }
}

async function handleLineEvent(event: any) {
  console.log('Processing LINE event:', event.type, 'from user:', event.source?.userId);

  if (!event.source?.userId) {
    console.warn('Event does not have userId');
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
      console.log('Unhandled event type:', event.type);
  }
}

async function handleFollowEvent(event: any) {
  const lineUserId = event.source.userId;
  
  console.log(`User ${lineUserId} followed the bot`);

  try {
    // ユーザーのプロフィール情報を取得
    let displayName = 'LINE User';
    
    if (CHANNEL_ACCESS_TOKEN) {
      try {
        const profileResponse = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
          headers: {
            'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
          },
        });

        if (profileResponse.ok) {
          const profile = await profileResponse.json();
          displayName = profile.displayName || 'LINE User';
          console.log(`User profile: ${displayName}`);
        }
      } catch (profileError) {
        console.error('Error fetching LINE profile:', profileError);
      }
    }

    // 既存のapp_usersテーブルでline_idが既に存在するかチェック
    const { data: existingUser, error: checkError } = await supabase
      .from('app_users')
      .select('id, email')
      .eq('line_id', lineUserId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing LINE user:', checkError);
    } else if (existingUser) {
      console.log(`LINE user ${lineUserId} is already linked to user ${existingUser.id}`);
    } else {
      console.log(`New LINE user ${lineUserId} - waiting for app login to link account`);
    }

    // ウェルカムメッセージを送信
    await sendWelcomeMessage(lineUserId, displayName);

  } catch (error) {
    console.error('Error handling follow event:', error);
  }
}

async function handleUnfollowEvent(event: any) {
  const lineUserId = event.source.userId;
  
  console.log(`User ${lineUserId} unfollowed the bot`);

  try {
    // app_usersテーブルのline_idをnullに設定
    const { data: updatedUsers, error: updateUserError } = await supabase
      .from('app_users')
      .update({ line_id: null })
      .eq('line_id', lineUserId)
      .select('id, email');

    if (updateUserError) {
      console.error('Error removing LINE ID from app_users:', updateUserError);
    } else if (updatedUsers && updatedUsers.length > 0) {
      console.log(`LINE ID removed from ${updatedUsers.length} user(s):`, updatedUsers);
    }

  } catch (error) {
    console.error('Error handling unfollow event:', error);
  }
}

async function handleMessageEvent(event: any) {
  const lineUserId = event.source.userId;
  const messageText = event.message?.text;

  console.log(`Message from ${lineUserId}: ${messageText}`);

  try {
    // 特定のキーワードに対する自動応答
    if (messageText?.toLowerCase().includes('連携') || messageText?.toLowerCase().includes('接続')) {
      await sendLinkInstructions(lineUserId);
    } else if (messageText?.toLowerCase().includes('help') || messageText?.toLowerCase().includes('ヘルプ')) {
      await sendHelpMessage(lineUserId);
    } else {
      // 一般的な応答
      await sendGeneralResponse(lineUserId);
    }
  } catch (error) {
    console.error('Error handling message event:', error);
  }
}

async function sendWelcomeMessage(lineUserId: string, displayName: string) {
  const welcomeMessage = `${displayName}さん、ショッピングウォッチの公式LINEアカウントを友だち追加いただき、ありがとうございます！🎉

お気に入り店舗の新着情報をLINEで受け取るには、アプリでアカウント設定を完了してください。

📱 アプリの設定手順：
1. アプリにログイン
2. プロフィール → 設定 → LINE通知設定
3. 「接続確認」で連携を確認

何かご不明な点がございましたら、「ヘルプ」とメッセージをお送りください！`;

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
    console.error('LINE_CHANNEL_ACCESS_TOKEN is not configured');
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
      console.error('Failed to send LINE message:', response.status, errorText);
    } else {
      console.log('LINE message sent successfully to:', lineUserId);
    }
  } catch (error) {
    console.error('Error sending LINE message:', error);
  }
}