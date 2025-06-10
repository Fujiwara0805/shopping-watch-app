import { Resend } from 'resend';

// 環境変数が存在しない場合のフォールバック処理を追加
const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  console.warn('RESEND_API_KEY environment variable is not set');
}

const resend = new Resend(resendApiKey || 'dummy-key-for-build');

interface SendPasswordResetEmailParams {
  to: string;
  resetToken: string;
}

export async function sendPasswordResetEmail({ to, resetToken }: SendPasswordResetEmailParams) {
  // 実際のメール送信時にAPIキーをチェック
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY environment variable is not configured');
  }
  
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;
  
  // 送信者情報を環境変数から取得（フォールバック付き）
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const fromName = process.env.RESEND_FROM_NAME || 'パスワードリセット';
  
  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject: 'パスワードリセットのご案内',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="width: 64px; height: 64px; background-color: #73370c; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 24px;">🔒</span>
              </div>
              <h1 style="color: #73370c; margin: 0; font-size: 24px; font-weight: bold;">パスワードリセット</h1>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
              パスワードリセットのリクエストを受け付けました。
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
              下記のボタンをクリックして、新しいパスワードを設定してください：
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #73370c; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; transition: background-color 0.2s;">
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
              <p style="word-break: break-all; color: #73370c; font-size: 12px; background-color: #f3f4f6; padding: 12px; border-radius: 4px; font-family: 'Courier New', monospace;">
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

    if (error) {
      console.error('メール送信エラー:', error);
      throw new Error('メールの送信に失敗しました');
    }

    console.log('パスワードリセットメール送信成功:', data);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('メール送信中にエラー:', error);
    throw error;
  }
}