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
    console.error('RESEND_API_KEY environment variable is not configured');
    throw new Error('メール送信の設定が完了していません。管理者にお問い合わせください。');
  }
  
  // 必要な環境変数をチェック
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    console.error('NEXT_PUBLIC_APP_URL environment variable is not configured');
    throw new Error('アプリケーションURLが設定されていません。');
  }
  
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;
  
  // 環境に応じた送信者情報の設定
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  
  let fromEmail: string;
  const fromName = process.env.RESEND_FROM_NAME || 'Tokudoku App';
  
  if (isProduction) {
    // 本番環境：認証されたtokudoku.comドメインを使用
    fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@tokudoku.com';
  } else {
    // 開発環境：Resendのデフォルトまたは設定された値を使用
    fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  }
  
  console.log('メール送信設定:', {
    environment: process.env.NODE_ENV,
    from: `${fromName} <${fromEmail}>`,
    to: to,
    resetUrl: resetUrl.substring(0, 50) + '...' // セキュリティのため一部のみログ出力
  });
  
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
      console.error('Resend APIエラー詳細:', {
        name: error.name,
        message: error.message,
        statusCode: (error as any).statusCode,
        to: to,
        from: fromEmail,
        environment: process.env.NODE_ENV
      });
      
      // 403エラー（validation_error）の場合の具体的な処理
      if (error.message?.includes('validation_error') || 
          error.message?.includes('verify a domain') ||
          (error as any).statusCode === 403) {
        
        if (isDevelopment) {
          // 開発環境では管理者メールアドレスのみ送信可能
          const testEmail = 'tiki4091@gmail.com';
          if (to !== testEmail) {
            throw new Error(`開発環境では ${testEmail} にのみメール送信が可能です。`);
          }
        }
        
        if (isProduction) {
          // 本番環境でドメイン認証が必要
          throw new Error('tokudoku.comドメインの認証が完了していません。Resendダッシュボードでドメイン認証を完了してください。');
        }
        
        // 一般的なドメイン認証エラー
        throw new Error('メール送信にはドメインの認証が必要です。管理者にお問い合わせください。');
      }
      
      // その他のエラー
      throw new Error(`メールの送信に失敗しました: ${error.message}`);
    }

    console.log('パスワードリセットメール送信成功:', {
      messageId: data?.id,
      to: to,
      environment: process.env.NODE_ENV
    });
    return { success: true, messageId: data?.id };
  } catch (error: any) {
    console.error('メール送信中にエラー:', {
      error: error.message,
      stack: error.stack,
      to: to,
      fromEmail: fromEmail,
      environment: process.env.NODE_ENV
    });
    
    // エラーメッセージをそのまま再スロー（既に適切に処理されている）
    throw error;
  }
}