import { NextRequest, NextResponse } from 'next/server';
import { fetchAnalyticsData, generateDummyAnalyticsData } from '@/lib/services/analytics';

/**
 * Vercel Analytics データ取得API
 * フロントエンドからの安全なアクセスを提供
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = (searchParams.get('period') || '24h') as '24h' | '7d' | '30d';
    
    // 環境変数からプロジェクト情報を取得
    const projectId = process.env.VERCEL_PROJECT_ID;
    const teamId = process.env.VERCEL_TEAM_ID;
    const apiToken = process.env.VERCEL_API_TOKEN;

    // APIトークンが未設定の場合はダミーデータを返す
    if (!apiToken || !projectId) {
      console.log('Analytics API: トークンまたはプロジェクトIDが未設定、ダミーデータを返します');
      return NextResponse.json({
        success: true,
        data: generateDummyAnalyticsData(),
        isDummy: true,
      });
    }

    const { data, error } = await fetchAnalyticsData(projectId, teamId, period);

    if (error) {
      // エラー時もダミーデータを返す（ユーザー体験を損なわないため）
      console.error('Analytics API エラー:', error);
      return NextResponse.json({
        success: true,
        data: generateDummyAnalyticsData(),
        isDummy: true,
        error: error.message,
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

