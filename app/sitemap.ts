import { MetadataRoute } from 'next'

/**
 * サイトマップ生成
 * AI検索エンジンがサイト構造を理解しやすいように最適化
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://tokudoku.com'
  const currentDate = new Date()
  
  return [
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
    // 列車時刻表（もし使用している場合）
    {
      url: `${baseUrl}/train-schedule`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.4,
    },
  ]
}

/**
 * AI検索エンジン向けのヒント:
 * - hourly: リアルタイムで更新されるイベント情報
 * - daily: 毎日変化する可能性のあるコンテンツ
 * - weekly: 定期的に更新されるコンテンツ
 * - monthly: あまり変わらないが重要なページ
 * 
 * priority値は相対的な重要度を示し、AI検索エンジンが
 * どのページを優先的にクロールすべきかの判断材料になります
 */

