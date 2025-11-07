import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabaseClient';

/**
 * 動的サイトマップ生成
 * AI検索エンジンがサイト構造を理解しやすいように最適化
 * イベント情報を含む全ページを検索エンジンに通知
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
    // 通知とメモ
    {
      url: `${baseUrl}/notifications`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.6,
    },
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
  ];

  // イベントページの動的生成
  try {
    const now = new Date();
    const { data: events, error } = await supabase
      .from('posts')
      .select('id, created_at, event_name, event_start_date, event_end_date')
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
      // event_end_dateがある場合はその日の23:59:59まで有効
      if (event.event_end_date) {
        const endDate = new Date(event.event_end_date);
        endDate.setHours(23, 59, 59, 999);
        return now <= endDate;
      }
      // event_end_dateがない場合は、event_start_dateの23:59:59まで有効
      if (event.event_start_date) {
        const startDate = new Date(event.event_start_date);
        startDate.setHours(23, 59, 59, 999);
        return now <= startDate;
      }
      // どちらもない場合は含める（expires_atで判定される）
      return true;
    });

    const eventPages: MetadataRoute.Sitemap = activeEvents.map((event) => ({
      url: `${baseUrl}/map/event/${event.id}`,
      lastModified: new Date(event.created_at),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));

    // 地域別ページ（ローカルSEO強化）
    const locations = [
      { prefecture: '大分県', city: '大分市' },
      { prefecture: '大分県', city: '別府市' },
      { prefecture: '大分県', city: '中津市' },
      { prefecture: '大分県', city: '日田市' },
      { prefecture: '大分県', city: '佐伯市' },
      { prefecture: '大分県', city: '臼杵市' },
      { prefecture: '大分県', city: '津久見市' },
      { prefecture: '大分県', city: '竹田市' },
      { prefecture: '大分県', city: '豊後高田市' },
      { prefecture: '大分県', city: '杵築市' },
      { prefecture: '大分県', city: '宇佐市' },
      { prefecture: '大分県', city: '豊後大野市' },
      { prefecture: '大分県', city: '由布市' },
      { prefecture: '大分県', city: '国東市' },
    ];

    const areaPages: MetadataRoute.Sitemap = [
      // 都道府県ページ
      {
        url: `${baseUrl}/area/${encodeURIComponent('大分県')}`,
        lastModified: currentDate,
        changeFrequency: 'daily' as const,
        priority: 0.85,
      },
      // 市町村ページ
      ...locations.map((loc) => ({
        url: `${baseUrl}/area/${encodeURIComponent(loc.prefecture)}/${encodeURIComponent(loc.city)}`,
        lastModified: currentDate,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      })),
    ];

    console.log(`✅ サイトマップ生成: 静的ページ ${staticPages.length}件、イベントページ ${eventPages.length}件、地域ページ ${areaPages.length}件`);
    
    return [...staticPages, ...eventPages, ...areaPages];
  } catch (error) {
    console.error('サイトマップ生成エラー:', error);
    // エラーが発生しても静的ページは返す
    return staticPages;
  }
}

/**
 * AI検索エンジン向けのヒント:
 * - hourly: リアルタイムで更新されるイベント情報（マップ、イベント一覧）
 * - daily: 毎日変化する可能性のあるコンテンツ（個別イベントページ）
 * - weekly: 定期的に更新されるコンテンツ（FAQ、投稿機能）
 * - monthly: あまり変わらないが重要なページ（規約、プロフィール設定）
 * 
 * priority値は相対的な重要度を示し、AI検索エンジンが
 * どのページを優先的にクロールすべきかの判断材料になります
 * 
 * 個別イベントページ (priority: 0.8):
 * - 「大分 秋祭り」「別府 マルシェ」などの具体的な検索クエリで
 *   個別イベントページが検索結果に表示されるように高めの優先度を設定
 * - 各イベント名、場所、日時などの詳細情報が含まれており、
 *   ローカル検索で重要な役割を果たす
 */
