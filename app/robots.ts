import { MetadataRoute } from 'next'

/**
 * Robots.txt設定
 * AI検索エンジン(ChatGPT, Claude, Gemini, Perplexity)を含む
 * すべてのクローラー向けに最適化
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://tokudoku.com'
  
  return {
    rules: [
      // AI検索エンジン向けの設定
      {
        userAgent: [
          'GPTBot', // ChatGPT
          'ChatGPT-User', // ChatGPT user agent
          'Claude-Web', // Claude
          'ClaudeBot', // Claude bot
          'Google-Extended', // Google Bard/Gemini
          'GoogleOther', // Google other services
          'PerplexityBot', // Perplexity
          'Bytespider', // ByteDance (TikTok)
          'Applebot-Extended', // Apple Intelligence
          'anthropic-ai', // Anthropic
          'cohere-ai', // Cohere
        ],
        allow: '/',
        disallow: [
          '/api/auth/',
          '/admin/',
          '/_next/',
          '/private/',
        ],
        // AI検索エンジンに優先的にクロールしてほしいパス
        crawlDelay: 0,
      },
      // 一般的な検索エンジン向け
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/auth/',
          '/admin/',
          '/_next/',
          '/private/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}

/**
 * AI検索エンジン向けの最適化ポイント:
 * 
 * 1. GPTBot (ChatGPT): OpenAIが運用する検索ボット
 *    - ウェブコンテンツを学習データとして収集
 *    - 会話型AIの応答品質向上に使用
 * 
 * 2. ClaudeBot (Claude): Anthropicが運用する検索ボット
 *    - コンテンツの理解と推論に使用
 *    - 構造化データを優先的に解析
 * 
 * 3. Google-Extended (Gemini): Googleの次世代AI
 *    - Bard/Gemini向けのデータ収集
 *    - 既存のGooglebotとは別のクローラー
 * 
 * 4. PerplexityBot (Perplexity AI): 検索特化型AI
 *    - リアルタイム検索結果の生成
 *    - 引用元としての情報収集
 * 
 * これらのボットがサイトをクロールできるようにすることで、
 * AI検索での表示機会が増加し、トラフィックの増加が期待できます。
 */
