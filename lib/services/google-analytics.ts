/**
 * Google Analytics 4 Data API サービス
 * PVと訪問者数を取得
 * 
 * 既存のGoogle Sheets用サービスアカウント認証情報を共有して使用
 * 必要な設定:
 * 1. Google Cloud Consoleで「Google Analytics Data API」を有効化
 * 2. Google Analyticsでサービスアカウントに「閲覧者」権限を付与
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data';

export interface AnalyticsData {
  pageViews: number;
  visitors: number;
  period: string;
  lastUpdated: string;
}

export interface AnalyticsError {
  message: string;
  code?: string;
}

/**
 * Google Analytics 4からデータを取得
 * 既存のGOOGLE_SHEETS_SERVICE_ACCOUNT_KEYを使用
 * 
 * @param propertyId - GA4のプロパティID（数字のみ）
 * @param period - 取得期間
 */
export async function fetchGoogleAnalyticsData(
  propertyId: string,
  period: '24h' | '7d' | '30d' = '30d'
): Promise<{ data?: AnalyticsData; error?: AnalyticsError }> {
  try {
    // 既存のサービスアカウント認証情報を使用（Google Sheetsと共有）
    const serviceAccountKey = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY;
    
    if (!serviceAccountKey) {
      return {
        error: {
          message: 'Googleサービスアカウント認証情報が設定されていません（GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY）',
          code: 'MISSING_CREDENTIALS',
        },
      };
    }

    let credentials;
    try {
      credentials = JSON.parse(serviceAccountKey);
    } catch {
      return {
        error: {
          message: '認証情報のJSONパースに失敗しました',
          code: 'INVALID_CREDENTIALS_JSON',
        },
      };
    }

    // Analytics Data APIクライアントを初期化
    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials,
    });

    // 期間の計算
    let startDate: string;
    let periodLabel: string;

    switch (period) {
      case '24h':
        startDate = '1daysAgo';
        periodLabel = '過去24時間';
        break;
      case '7d':
        startDate = '7daysAgo';
        periodLabel = '過去7日間';
        break;
      case '30d':
      default:
        startDate = '30daysAgo';
        periodLabel = '過去30日間';
        break;
    }

    // 訪問者数（totalUsers）とページビュー数を同時に取得
    // totalUsersはセッションベースではなくユーザーベースの合計
    // activeUsersはアクティブなユーザーのみをカウントするため、totalUsersを使用
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate,
          endDate: 'today',
        },
      ],
      metrics: [
        { name: 'totalUsers' },         // 総ユーザー数（訪問者数）
        { name: 'screenPageViews' },    // ページビュー数
        { name: 'sessions' },           // セッション数（参考用）
      ],
    });

    // レスポンスからデータを抽出
    const row = response.rows?.[0];
    const visitors = Number(row?.metricValues?.[0]?.value || 0);
    const pageViews = Number(row?.metricValues?.[1]?.value || 0);
    const sessions = Number(row?.metricValues?.[2]?.value || 0);
    
    // デバッグログ
    console.log('GA4 Data:', { visitors, pageViews, sessions, period: periodLabel });

    return {
      data: {
        pageViews,
        visitors,
        period: periodLabel,
        lastUpdated: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Google Analytics API エラー:', error);
    
    // エラーメッセージの詳細化
    let errorMessage = 'データの取得に失敗しました';
    let errorCode = 'FETCH_ERROR';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // よくあるエラーの判定
      if (error.message.includes('permission')) {
        errorCode = 'PERMISSION_DENIED';
        errorMessage = 'Google Analyticsへのアクセス権限がありません。サービスアカウントに権限を付与してください。';
      } else if (error.message.includes('not found')) {
        errorCode = 'PROPERTY_NOT_FOUND';
        errorMessage = '指定されたプロパティが見つかりません。プロパティIDを確認してください。';
      } else if (error.message.includes('quota')) {
        errorCode = 'QUOTA_EXCEEDED';
        errorMessage = 'APIのクォータを超過しました。しばらく待ってから再試行してください。';
      }
    }
    
    return {
      error: {
        message: errorMessage,
        code: errorCode,
      },
    };
  }
}

/**
 * ダミーデータを生成（API未設定時のフォールバック）
 */
export function generateDummyAnalyticsData(): AnalyticsData {
  // より現実的なダミーデータを生成
  const baseVisitors = 150;
  const basePV = 450;
  const variance = 0.2; // 20%の変動
  
  return {
    pageViews: Math.floor(basePV * (1 + (Math.random() - 0.5) * variance)),
    visitors: Math.floor(baseVisitors * (1 + (Math.random() - 0.5) * variance)),
    period: '過去30日間',
    lastUpdated: new Date().toISOString(),
  };
}

