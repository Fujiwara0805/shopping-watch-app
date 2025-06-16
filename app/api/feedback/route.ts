import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// フィードバック専用の環境変数
const FEEDBACK_GOOGLE_SHEETS_ID = process.env.FEEDBACK_GOOGLE_SHEETS_ID;
const GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY;

if (!FEEDBACK_GOOGLE_SHEETS_ID) {
  console.error('環境変数 FEEDBACK_GOOGLE_SHEETS_ID が設定されていません。');
}
if (!GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY) {
  console.error('環境変数 GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY が設定されていません。');
}

export async function POST(request: Request) {
  try {
    const { userEmail, rating, comment, userAgent, timestamp } = await request.json();

    if (!userEmail || !rating) {
      return NextResponse.json({ message: '必須項目を入力してください。' }, { status: 400 });
    }

    if (!FEEDBACK_GOOGLE_SHEETS_ID || !GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY) {
      throw new Error('フィードバック用Google Sheetsの環境変数が正しく設定されていません。');
    }

    const credentials = JSON.parse(GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // シート名を「フィードバック」に統一
    const sheetName = 'フィードバック';
    const headerRange = `${sheetName}!A1:G1`;

    // ヘッダーの確認・作成（エラーハンドリングを改善）
    try {
      const headerCheck = await sheets.spreadsheets.values.get({
        spreadsheetId: FEEDBACK_GOOGLE_SHEETS_ID,
        range: headerRange,
      });

      if (!headerCheck.data.values || headerCheck.data.values.length === 0 || headerCheck.data.values[0].length === 0) {
        const headers = ['送信日時', 'メールアドレス', '評価', '評価（星）', 'コメント', 'ユーザーエージェント', '処理状況'];
        await sheets.spreadsheets.values.append({
          spreadsheetId: FEEDBACK_GOOGLE_SHEETS_ID,
          range: `${sheetName}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [headers],
          },
        });
        console.log('フィードバックシートにヘッダーを作成しました。');
      }
    } catch (sheetError: any) {
      // シートが存在しない場合、まずシートを作成
      if (sheetError.code === 400) {
        console.log('フィードバックシートを新規作成します...');
        
        try {
          // 新しいシートを作成
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: FEEDBACK_GOOGLE_SHEETS_ID,
            requestBody: {
              requests: [{
                addSheet: {
                  properties: {
                    title: sheetName,
                  }
                }
              }]
            }
          });
          
          // ヘッダーを追加
          const headers = ['送信日時', 'メールアドレス', '評価', '評価（星）', 'コメント', 'ユーザーエージェント', '処理状況'];
          await sheets.spreadsheets.values.append({
            spreadsheetId: FEEDBACK_GOOGLE_SHEETS_ID,
            range: `${sheetName}!A1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [headers],
            },
          });
          console.log('フィードバックシートとヘッダーを作成しました。');
        } catch (createError) {
          console.error('シート作成エラー:', createError);
          throw createError;
        }
      } else {
        throw sheetError;
      }
    }

    const dataRange = `${sheetName}!A:G`;

    // 評価を星の数で表現
    const ratingStars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    const formattedTimestamp = timestamp || new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: FEEDBACK_GOOGLE_SHEETS_ID,
      range: dataRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          formattedTimestamp,
          userEmail, 
          `${rating}/5`, 
          ratingStars,
          comment || '（コメントなし）', 
          userAgent || '不明', 
          '未処理'
        ]],
      },
    });

    console.log('フィードバックをスプレッドシートに保存しました:', { 
      userEmail, 
      rating, 
      comment: comment || '（コメントなし）',
      timestamp: formattedTimestamp 
    });

    return NextResponse.json({ message: 'フィードバックを受け付けました。ありがとうございます！' }, { status: 200 });

  } catch (error: any) {
    console.error('フィードバックAPIエラー:', error);
    
    // より詳細なエラー情報を提供
    let errorMessage = 'フィードバックの送信に失敗しました。';
    if (error.code === 403) {
      errorMessage = 'スプレッドシートへのアクセス権限がありません。';
    } else if (error.code === 404) {
      errorMessage = 'スプレッドシートが見つかりません。IDを確認してください。';
    }
    
    return NextResponse.json(
      { 
        message: errorMessage, 
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
