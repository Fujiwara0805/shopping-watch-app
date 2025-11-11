import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { userId, userEmail, checkIns } = await request.json();
    
    if (!userId || !userEmail || !checkIns || checkIns.length !== 9) {
      return NextResponse.json(
        { error: '必要な情報が不足しています' },
        { status: 400 }
      );
    }
    
    // チェックインリストをHTMLに整形
    const checkInList = checkIns
      .map((c: any, i: number) => 
        `<li style="margin-bottom: 8px;">
          <strong>${i + 1}.</strong> ${c.event_name}<br>
          <span style="color: #666; font-size: 0.9em;">
            チェックイン日時: ${new Date(c.checked_in_at).toLocaleString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </li>`
      )
      .join('');
    
    const { data, error } = await resend.emails.send({
      from: 'noreply@tokudoku.com',
      to: 'sobota@nobody-info.com',
      subject: '🎉 トクドク スタンプボード達成通知',
      html: `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>スタンプボード達成通知</title>
        </head>
        <body style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #73370c 0%, #a04d14 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🎉 スタンプボード達成！</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">ユーザーが9個のスタンプを集めました</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #73370c; font-size: 20px; margin-top: 0;">📋 ユーザー情報</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; width: 120px;"><strong>ユーザーID:</strong></td>
                  <td style="padding: 8px 0;">${userId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>メールアドレス:</strong></td>
                  <td style="padding: 8px 0;">${userEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>達成日時:</strong></td>
                  <td style="padding: 8px 0;">${new Date().toLocaleString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</td>
                </tr>
              </table>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px;">
              <h2 style="color: #73370c; font-size: 20px; margin-top: 0;">✅ チェックインイベント一覧</h2>
              <ol style="padding-left: 20px; margin: 0;">
                ${checkInList}
              </ol>
            </div>
            
            <div style="margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #fef3e8 0%, #fff9f0 100%); border-radius: 8px; border-left: 4px solid #73370c;">
              <p style="margin: 0; color: #73370c; font-weight: bold;">💡 次のステップ</p>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">
                ユーザーへ賞金の送付手続きを進めてください。
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              このメールはトクドクのスタンプボード機能から自動送信されています
            </p>
          </div>
        </body>
        </html>
      `,
    });
    
    if (error) {
      console.error('Resend API error:', error);
      throw error;
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('スタンプボード送信エラー:', error);
    return NextResponse.json(
      { error: 'メール送信に失敗しました' },
      { status: 500 }
    );
  }
}

