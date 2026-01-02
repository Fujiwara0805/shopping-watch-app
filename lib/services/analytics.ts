/**
 * Vercel Analytics サービス
 * Web Analytics APIを使用してPVと訪問者数を取得
 */

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
 * Vercel Analytics APIからデータを取得
 * 注意: この関数はサーバーサイドでのみ使用可能（APIトークンが必要）
 */
export async function fetchAnalyticsData(
  projectId: string,
  teamId?: string,
  period: '24h' | '7d' | '30d' = '24h'
): Promise<{ data?: AnalyticsData; error?: AnalyticsError }> {
  const token = process.env.VERCEL_API_TOKEN;
  
  if (!token) {
    return {
      error: {
        message: 'Vercel API トークンが設定されていません',
        code: 'MISSING_TOKEN',
      },
    };
  }

  try {
    // 期間の計算
    const now = new Date();
    let from: Date;
    
    switch (period) {
      case '7d':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '24h':
      default:
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
    }

    const params = new URLSearchParams({
      projectId,
      from: from.toISOString(),
      to: now.toISOString(),
      ...(teamId && { teamId }),
    });

    // Vercel Analytics API エンドポイント
    const response = await fetch(
      `https://api.vercel.com/v1/web-analytics/stats?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        next: { revalidate: 300 }, // 5分間キャッシュ
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: {
          message: errorData.error?.message || `API エラー: ${response.status}`,
          code: errorData.error?.code || `HTTP_${response.status}`,
        },
      };
    }

    const data = await response.json();

    return {
      data: {
        pageViews: data.pageViews || 0,
        visitors: data.visitors || 0,
        period: getPeriodLabel(period),
        lastUpdated: now.toISOString(),
      },
    };
  } catch (error) {
    console.error('Analytics API エラー:', error);
    return {
      error: {
        message: error instanceof Error ? error.message : 'データの取得に失敗しました',
        code: 'FETCH_ERROR',
      },
    };
  }
}

/**
 * 期間のラベルを取得
 */
function getPeriodLabel(period: '24h' | '7d' | '30d'): string {
  switch (period) {
    case '7d':
      return '過去7日間';
    case '30d':
      return '過去30日間';
    case '24h':
    default:
      return '過去24時間';
  }
}

/**
 * ダミーデータを生成（API未設定時のフォールバック）
 */
export function generateDummyAnalyticsData(): AnalyticsData {
  return {
    pageViews: Math.floor(Math.random() * 500) + 100,
    visitors: Math.floor(Math.random() * 200) + 50,
    period: '過去24時間',
    lastUpdated: new Date().toISOString(),
  };
}

