import { NextRequest, NextResponse } from 'next/server';
import { fetchGoogleAnalyticsData, generateDummyAnalyticsData } from '@/lib/services/google-analytics';

/**
 * Analytics データ取得API
 * Google Analytics 4 Data APIを使用
 * 既存のGoogle Sheets用サービスアカウント認証情報を共有
 * 
 * 環境変数:
 * - GOOGLE_ANALYTICS_PROPERTY_ID: GA4のプロパティID（数字のみ）
 * - GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY: 既存のサービスアカウントJSONキー（Google Sheetsと同じ）
 * 
 * 必要な設定:
 * 1. Google Cloud Consoleで「Google Analytics Data API」を有効化
 * 2. Google Analyticsでサービスアカウントに「閲覧者」権限を付与
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = (searchParams.get('period') || '30d') as '24h' | '7d' | '30d';
    
    // 環境変数からプロパティIDを取得
    const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;
    // 既存のサービスアカウント認証情報を使用（Google Sheetsと共有）
    const serviceAccountKey = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY;

    // デバッグ用ログ（本番環境では削除可能）
    console.log('Analytics API: 環境変数チェック', {
      hasPropertyId: !!propertyId,
      propertyIdLength: propertyId?.length || 0,
      hasServiceAccountKey: !!serviceAccountKey,
      serviceAccountKeyLength: serviceAccountKey?.length || 0,
      period,
    });

    // 環境変数が未設定の場合はダミーデータを返す
    if (!propertyId || !serviceAccountKey) {
      const missingVars = [];
      if (!propertyId) missingVars.push('GOOGLE_ANALYTICS_PROPERTY_ID');
      if (!serviceAccountKey) missingVars.push('GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY');
      
      console.log('Analytics API: 環境変数が未設定', { missingVars });
      return NextResponse.json({
        success: true,
        data: generateDummyAnalyticsData(),
        isDummy: true,
        message: `環境変数が未設定: ${missingVars.join(', ')}`,
        debug: {
          missingVars,
          hint: 'Vercelダッシュボードで環境変数を設定し、再デプロイしてください',
        },
      });
    }

    // Google Analytics 4からデータを取得
    const { data, error } = await fetchGoogleAnalyticsData(propertyId, period);

    if (error) {
      console.error('Analytics API エラー:', error);
      // エラー時もダミーデータを返す（ユーザー体験を損なわないため）
      return NextResponse.json({
        success: true,
        data: generateDummyAnalyticsData(),
        isDummy: true,
        error: error.message,
        errorCode: error.code,
      });
    }

    return NextResponse.json({
      success: true,
      data,
      isDummy: false,
    });
  } catch (error) {
    console.error('Analytics API 予期しないエラー:', error);
    return NextResponse.json({
      success: true,
      data: generateDummyAnalyticsData(),
      isDummy: true,
      error: 'サーバーエラーが発生しました',
    });
  }
}
