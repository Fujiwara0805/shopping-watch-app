import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID;
const GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY;

if (!GOOGLE_SHEETS_ID) {
  console.error('環境変数 GOOGLE_SHEETS_ID が設定されていません。');
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

    if (!GOOGLE_SHEETS_ID || !GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY) {
      throw new Error('Google Sheetsの環境変数が正しく設定されていません。');
    }

    const credentials = JSON.parse(GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const sheetName = 'フィードバック';
    const headerRange = `${sheetName}!A1:F1`;

    // ヘッダーの確認・作成
    try {
      const headerCheck = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEETS_ID,
        range: headerRange,
      });

      if (!headerCheck.data.values || headerCheck.data.values.length === 0 || headerCheck.data.values[0].length === 0) {
        const headers = ['メールアドレス', '評価', 'コメント', 'ユーザーエージェント', '送信日時', '処理状況'];
        await sheets.spreadsheets.values.append({
          spreadsheetId: GOOGLE_SHEETS_ID,
          range: `${sheetName}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [headers],
          },
        });
        console.log('フィードバックシートにヘッダーを挿入しました。');
      }
    } catch (error) {
      // シートが存在しない場合は新規作成
      console.log('フィードバックシートを新規作成します。');
      const headers = ['メールアドレス', '評価', 'コメント', 'ユーザーエージェント', '送信日時', '処理状況'];
      await sheets.spreadsheets.values.append({
        spreadsheetId: GOOGLE_SHEETS_ID,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });
    }

    const dataRange = `${sheetName}!A:F`;

    // 評価を星の数で表現
    const ratingStars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEETS_ID,
      range: dataRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          userEmail, 
          `${rating}/5 (${ratingStars})`, 
          comment || '（コメントなし）', 
          userAgent || '不明', 
          timestamp || new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
          '未処理'
        ]],
      },
    });

    console.log('フィードバックを受信し、スプレッドシートに書き込みました:', { userEmail, rating, comment });

    return NextResponse.json({ message: 'フィードバックを受け付けました。' }, { status: 200 });

  } catch (error: any) {
    console.error('フィードバックAPIエラー:', error);
    return NextResponse.json(
      { message: 'フィードバックの送信に失敗しました。', error: error.message },
      { status: 500 }
    );
  }
}
