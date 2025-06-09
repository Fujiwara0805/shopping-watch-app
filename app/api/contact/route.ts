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
    const { name, email, subject, message } = await request.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ message: 'すべてのフィールドを入力してください。' }, { status: 400 });
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

    const sheetName = 'シート1';
    const headerRange = `${sheetName}!A1:E1`;

    const headerCheck = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEETS_ID,
      range: headerRange,
    });

    if (!headerCheck.data.values || headerCheck.data.values.length === 0 || headerCheck.data.values[0].length === 0) {
      const headers = ['名前', 'メールアドレス', '件名', 'メッセージ', '更新日'];
      await sheets.spreadsheets.values.append({
        spreadsheetId: GOOGLE_SHEETS_ID,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });
      console.log('スプレッドシートにヘッダーを挿入しました。');
    }

    const dataRange = `${sheetName}!A:E`;

    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEETS_ID,
      range: dataRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[name, email, subject, message, new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })]],
      },
    });

    console.log('お問い合わせを受信し、スプレッドシートに書き込みました:', { name, email, subject, message });

    return NextResponse.json({ message: 'お問い合わせを受け付けました。' }, { status: 200 });

  } catch (error: any) {
    console.error('APIエラー:', error);
    return NextResponse.json(
      { message: 'お問い合わせの送信に失敗しました。', error: error.message },
      { status: 500 }
    );
  }
}

// 実際のGoogle SheetsまたはNotion連携のためのヘルパー関数はここに定義されます。
// 例:
// async function sendToGoogleSheets(data: { name: string; email: string; message: string }) {
//   // Google Sheets API呼び出しロジック
// }

// async function sendToNotion(data: { name: string; email: string; message: string }) {
//   // Notion API呼び出しロジック
// }
