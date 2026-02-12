import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { cityToSlug } from '@/lib/seo/utils';
import { OITA_LOCATIONS, EVENT_CATEGORIES, OITA_MAIN_CITIES } from '@/lib/constants';

/**
 * 拡張版動的サイトマップ生成
 * AI検索エンジンがサイト構造を理解しやすいように最適化
 * イベント情報、地域別ページ、カテゴリ別ページを含む
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://tokudoku.com';
  const currentDate = new Date();
  
  // 静的ページ
  const staticPages: MetadataRoute.Sitemap = [
    // トップページ - 最優先
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'hourly',
      priority: 1.0,
    },
    // イベントマップ - 主要機能
    {
      url: `${baseUrl}/map`,
      lastModified: currentDate,
      changeFrequency: 'hourly',
      priority: 0.95,
    },
    // イベント一覧
    {
      url: `${baseUrl}/events`,
      lastModified: currentDate,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    // イベント投稿
    {
      url: `${baseUrl}/post`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // Aboutページ - AI検索で重要
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    // FAQページ - AI検索で非常に重要
    {
      url: `${baseUrl}/faq`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    // プロフィール・マイページ
    {
      url: `${baseUrl}/profile`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/profile/edit`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/profile/setup`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    // メモ
    {
      url: `${baseUrl}/memo`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    // 認証ページ
    {
      url: `${baseUrl}/login`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/forgot-password`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/reset-password`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    // 規約・ポリシー - AI向けに重要
    {
      url: `${baseUrl}/terms`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms/terms-of-service`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms/privacy-policy`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms/service-policy`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    // お問い合わせ
    {
      url: `${baseUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    // リリースノート
    {
      url: `${baseUrl}/release-notes`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    // LINE連携
    {
      url: `${baseUrl}/line-connect`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    // 列車時刻表
    {
      url: `${baseUrl}/train-schedule`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.4,
    },
    // 今日のイベント（SEO重要）
    {
      url: `${baseUrl}/events/today`,
      lastModified: currentDate,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
  ];

  // イベントページの動的生成
  try {
    const now = new Date();
    const { data: events, error } = await supabase
      .from('posts')
      .select('id, created_at, event_name, content, prefecture, city, event_start_date, event_end_date')
      .eq('is_deleted', false)
      .eq('category', 'イベント情報')
      .order('created_at', { ascending: false })
      .limit(1000); // 最大1000件

    if (error) {
      console.error('サイトマップ生成時のイベント取得エラー:', error);
      return staticPages;
    }

    if (!events || events.length === 0) {
      return staticPages;
    }

    // 終了していないイベントのみをフィルタリング
    const activeEvents = events.filter((event) => {
      if (event.event_end_date) {
        const endDate = new Date(event.event_end_date);
        endDate.setHours(23, 59, 59, 999);
        return now <= endDate;
      }
      if (event.event_start_date) {
        const startDate = new Date(event.event_start_date);
        startDate.setHours(23, 59, 59, 999);
        return now <= startDate;
      }
      return true;
    });

    // アクティブイベントページ（短縮ID使用）
    const semanticEventPages: MetadataRoute.Sitemap = activeEvents.map((event) => {
      const city = event.city || '';
      const citySlug = cityToSlug(city) || 'all';
      const shortId = event.id.split('-')[0];

      return {
        url: `${baseUrl}/events/oita/${citySlug}/event/${shortId}`,
        lastModified: new Date(event.created_at),
        changeFrequency: 'daily' as const,
        priority: 0.85,
      };
    });

    // 終了イベントページ（SEOリンクジュース維持のためインデックス対象）
    const endedEvents = events.filter((event) => {
      if (event.event_end_date) {
        const endDate = new Date(event.event_end_date);
        endDate.setHours(23, 59, 59, 999);
        return now > endDate;
      }
      if (event.event_start_date) {
        const startDate = new Date(event.event_start_date);
        startDate.setHours(23, 59, 59, 999);
        return now > startDate;
      }
      return false;
    });

    const endedEventPages: MetadataRoute.Sitemap = endedEvents.map((event) => {
      const city = event.city || '';
      const citySlug = cityToSlug(city) || 'all';
      const shortId = event.id.split('-')[0];

      return {
        url: `${baseUrl}/events/oita/${citySlug}/event/${shortId}`,
        lastModified: new Date(event.created_at),
        changeFrequency: 'monthly' as const,
        priority: 0.3,
      };
    });

    // 地域別ページ（日本語URL）
    const areaPages: MetadataRoute.Sitemap = [
      // 都道府県ページ
      {
        url: `${baseUrl}/area/${encodeURIComponent('大分県')}`,
        lastModified: currentDate,
        changeFrequency: 'daily' as const,
        priority: 0.85,
      },
      // 市町村ページ（日本語URL）
      ...OITA_LOCATIONS.map((loc) => ({
        url: `${baseUrl}/area/${encodeURIComponent(loc.prefecture)}/${encodeURIComponent(loc.city)}`,
        lastModified: currentDate,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      })),
    ];

    // 地域別イベント一覧ページ（英語スラッグURL）
    const regionEventPages: MetadataRoute.Sitemap = OITA_LOCATIONS.map((loc) => ({
      url: `${baseUrl}/events/oita/${loc.slug}`,
      lastModified: currentDate,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));

    // カテゴリ別ページ
    const categoryPages: MetadataRoute.Sitemap = EVENT_CATEGORIES.map((cat) => ({
      url: `${baseUrl}/events/oita/all/${cat.slug}`,
      lastModified: currentDate,
      changeFrequency: 'daily' as const,
      priority: 0.75,
    }));

    // 地域×カテゴリの組み合わせページ（主要都市のみ）
    const regionCategoryPages: MetadataRoute.Sitemap = OITA_MAIN_CITIES.flatMap((citySlug) =>
      EVENT_CATEGORIES.map((cat) => ({
        url: `${baseUrl}/events/oita/${citySlug}/${cat.slug}`,
        lastModified: currentDate,
        changeFrequency: 'daily' as const,
        priority: 0.7,
      }))
    );
    
    return [
      ...staticPages,
      ...semanticEventPages,
      ...endedEventPages,
      ...areaPages,
      ...regionEventPages,
      ...categoryPages,
      ...regionCategoryPages,
    ];
  } catch (error) {
    console.error('サイトマップ生成エラー:', error);
    return staticPages;
  }
}

/**
 * AI検索エンジン向けのヒント:
 * 
 * URL構造の説明:
 * - /events/oita/{city}/event/{shortId}: セマンティックなイベントURL（短縮ID使用）
 *   例: /events/oita/beppu/event/e896d51a
 * 
 * - /area/{prefecture}/{city}: 地域別イベント一覧（日本語URL）
 *   例: /area/大分県/別府市
 * 
 * - /events/oita/{city-slug}: 地域別イベント一覧（英語スラッグ）
 *   例: /events/oita/beppu
 * 
 * - /map/event/{id}: 旧URLフォーマット（新URLへリダイレクト）
 * 
 * priority値:
 * - 1.0: トップページ
 * - 0.95: メインマップページ
 * - 0.9: イベント一覧、FAQ
 * - 0.85: セマンティックイベントURL、地域トップページ
 * - 0.8: 市町村ページ
 * - 0.75: カテゴリページ
 * - 0.7: 地域×カテゴリページ
 * 
 * changeFrequency:
 * - hourly: リアルタイム更新（マップ、イベント一覧）
 * - daily: 毎日更新（個別イベント、地域ページ）
 * - weekly: 週次更新（FAQ、投稿機能）
 * - monthly: 月次更新（規約、プロフィール）
 */
