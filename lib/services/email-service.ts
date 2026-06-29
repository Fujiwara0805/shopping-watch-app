import { Resend } from 'resend';

// 環境変数の詳細ログ出力（本番環境でも一時的に有効にする）
console.log('=== 環境変数チェック ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
console.log('RESEND_API_KEY prefix:', process.env.RESEND_API_KEY?.substring(0, 10) + '...');
console.log('RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL);
console.log('RESEND_FROM_NAME:', process.env.RESEND_FROM_NAME);
console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
console.log('========================');

const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  console.error('❌ RESEND_API_KEY environment variable is not set');
} else {
  console.log('✅ RESEND_API_KEY is configured');
}

const resend = new Resend(resendApiKey || 'dummy-key-for-build');

interface SendPasswordResetEmailParams {
  to: string;
  resetToken: string;
}

export async function sendPasswordResetEmail({ to, resetToken }: SendPasswordResetEmailParams) {
  console.log('🚀 sendPasswordResetEmail called with:', { to, tokenLength: resetToken.length });

  // 実際のメール送信時にAPIキーをチェック
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY environment variable is not configured');
    throw new Error('メール送信の設定が完了していません。管理者にお問い合わせください。');
  }

  // 必要な環境変数をチェック
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    console.error('❌ NEXT_PUBLIC_APP_URL environment variable is not configured');
    throw new Error('アプリケーションURLが設定されていません。');
  }

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;

  // 送信者情報の設定
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const fromName = process.env.RESEND_FROM_NAME || 'TALE';

  console.log('📧 メール送信設定:', {
    environment: process.env.NODE_ENV,
    from: `${fromName} <${fromEmail}>`,
    to: to,
    resetUrl: resetUrl.substring(0, 50) + '...',
    apiKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 10) + '...'
  });

  try {
    console.log('📤 Resend API呼び出し開始...');

    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject: 'パスワードリセットのご案内',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="width: 64px; height: 64px; background-color: #829A2A; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                <!-- SVGロックアイコン -->
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 10V8C6 5.79086 7.79086 4 10 4H14C16.2091 4 18 5.79086 18 8V10" stroke="white" stroke-width="2" stroke-linecap="round"/>
                  <rect x="4" y="10" width="16" height="10" rx="2" fill="white"/>
                  <circle cx="12" cy="15" r="2" fill="#829A2A"/>
                </svg>
              </div>
              <h1 style="color: #829A2A; margin: 0; font-size: 24px; font-weight: bold;">パスワードリセット</h1>
            </div>

            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
              パスワードリセットのリクエストを受け付けました。
            </p>

            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
              下記のボタンをクリックして、新しいパスワードを設定してください：
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}"
                 style="background-color: #829A2A; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; transition: background-color 0.2s;">
                パスワードをリセット
              </a>
            </div>

            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 600;">
                ⏰ このリンクは<strong>1時間</strong>で期限切れになります
              </p>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 32px;">
              <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 16px;">
                もしボタンが機能しない場合は、下記のURLを直接ブラウザにコピー&ペーストしてください：
              </p>
              <p style="word-break: break-all; color: #829A2A; font-size: 12px; background-color: #f3f4f6; padding: 12px; border-radius: 4px; font-family: 'Courier New', monospace;">
                ${resetUrl}
              </p>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 24px;">
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                このメールに心当たりがない場合は、無視してください。<br>
                パスワードは変更されません。<br><br>
                © ${new Date().getFullYear()} ${fromName}
              </p>
            </div>
          </div>
        </div>
      `,
    });

    console.log('📨 Resend API レスポンス:', {
      success: !error,
      data: data,
      error: error,
      timestamp: new Date().toISOString()
    });

    if (error) {
      console.error('❌ Resend APIエラー詳細:', {
        name: error.name,
        message: error.message,
        statusCode: (error as any).statusCode,
        to: to,
        from: fromEmail,
        environment: process.env.NODE_ENV,
        fullError: error
      });

      // エラーを必ず投げる
      throw new Error(`メール送信エラー: ${error.message}`);
    }

    if (!data) {
      console.error('❌ Resend APIからデータが返されませんでした');
      throw new Error('メール送信に失敗しました：レスポンスデータが空です');
    }

    console.log('✅ パスワードリセットメール送信成功:', {
      messageId: data.id,
      to: to,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });

    return { success: true, messageId: data.id };

  } catch (error: any) {
    console.error('💥 メール送信中にエラー:', {
      error: error.message,
      stack: error.stack,
      to: to,
      fromEmail: fromEmail,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });

    // エラーを必ず再スロー
    throw new Error(`メール送信に失敗しました: ${error.message}`);
  }
}

interface SendMeetupVerificationEmailParams {
  to: string;
  verifyToken: string;
}

export async function sendMeetupVerificationEmail({ to, verifyToken }: SendMeetupVerificationEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('メール送信の設定が完了していません。');
  }
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    throw new Error('アプリケーションURLが設定されていません。');
  }

  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/meetup/verify-email?token=${verifyToken}`;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const fromName = process.env.RESEND_FROM_NAME || 'TALE';

  const { data, error } = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: [to],
    subject: '【TALE】待ち合わせ機能のメール確認',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #EFF4F8;">
        <div style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 12px rgba(4,0,0,0.15);">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #000000; margin: 0; font-size: 22px; font-weight: 600;">メールアドレスの確認</h1>
            <div style="width: 48px; height: 4px; background: linear-gradient(90deg, #EEB200, transparent); border-radius: 2px; margin: 12px auto 0;"></div>
          </div>

          <p style="color: #000000; font-size: 15px; line-height: 1.7; margin-bottom: 16px;">
            TALEの<strong>待ち合わせ機能</strong>を安心してお使いいただくため、メールアドレスのご確認をお願いします。
          </p>
          <p style="color: #3D3D3B; font-size: 14px; line-height: 1.7; margin-bottom: 24px;">
            確認すると Verified バッジが付き、ホストルームへの参加など一部機能が解禁されます。
          </p>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${verifyUrl}"
               style="background-color: #DC8F74; color: white; padding: 14px 32px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 600; font-size: 15px;">
              メールアドレスを確認する
            </a>
          </div>

          <div style="background-color: #FFF8E1; border: 1px solid #EEB200; border-radius: 8px; padding: 14px; margin: 20px 0;">
            <p style="color: #C99500; font-size: 13px; margin: 0;">
              ⏰ このリンクは <strong>24 時間</strong> で期限切れになります。
            </p>
          </div>

          <div style="border-top: 1px dashed #949490; padding-top: 20px; margin-top: 28px;">
            <p style="color: #949490; font-size: 12px; line-height: 1.6;">
              ボタンが機能しない場合は、以下の URL をブラウザに貼り付けてください：
            </p>
            <p style="word-break: break-all; color: #C4715A; font-size: 11px; background-color: #EFF4F8; padding: 10px; border-radius: 6px; font-family: 'Courier New', monospace;">
              ${verifyUrl}
            </p>
          </div>

          <p style="color: #949490; font-size: 11px; text-align: center; margin: 20px 0 0;">
            心当たりがない場合は、このメールを無視してください。<br>
            © ${new Date().getFullYear()} TALE
          </p>
        </div>
      </div>
    `,
  });

  if (error) {
    throw new Error(`メール送信エラー: ${error.message}`);
  }
  if (!data) {
    throw new Error('メール送信レスポンスが空でした。');
  }
  return { success: true, messageId: data.id };
}
