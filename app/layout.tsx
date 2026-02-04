import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Noto_Sans_JP } from 'next/font/google';
import { RootLayoutClient } from './layout-client';

/**
 * ========================================
 * 大分県イベント情報ポータル SEO最適化設定
 * ========================================
 * 
 * 対象検索クエリ:
 * - 「大分県 イベント」「大分 イベント」
 * - 「[市町村名] イベント」
 * - 「大分 お祭り」「大分 マルシェ」
 * - 「[イベント名]」単体
 * 
 * 大分県全18市町村:
 * 大分市、別府市、中津市、日田市、佐伯市、臼杵市、津久見市、竹田市、
 * 豊後高田市、杵築市、宇佐市、豊後大野市、由布市、国東市、
 * 姫島村、日出町、九重町、玖珠町
 */

// フォント設定
const notoSansJP = Noto_Sans_JP({ 
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
  preload: true,
});

// サイト基本情報
const SITE_NAME = 'トクドク';
const SITE_URL = 'https://tokudoku.com';
const SITE_DESCRIPTION = 'いつもの街に、まだ知らない景色がある。県内全域のお祭り、マルシェ、ワークショップを地図から発見。気になる場所をまとめて、あなただけのオリジナルマップに。大分をもっと好きになる——完全無料の地域情報サイト。';
const OG_IMAGE = 'https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png';

// SEO用キーワード（大分県全18市町村 + イベントカテゴリ）
const SEO_KEYWORDS = [
  // ブランド名
  'トクドク',
  // 地域（県）
  '大分', '大分県',
  // 市部（14市）
  '大分市', '別府市', '中津市', '日田市', '佐伯市', '臼杵市', '津久見市', '竹田市',
  '豊後高田市', '杵築市', '宇佐市', '豊後大野市', '由布市', '国東市',
  // 郡部（1村3町）
  '姫島村', '日出町', '九重町', '玖珠町',
  // イベントカテゴリ
  'イベント', '地域イベント', 'お祭り', '夏祭り', '秋祭り', '花火大会',
  'マルシェ', 'ワークショップ', '体験イベント', '手作り市', 'フードフェス',
  '音楽イベント', 'フェスティバル', '地域コミュニティ',
  // 機能キーワード
  '地図', 'マップ', 'イベント検索', '無料', '週末', '今日', '明日',
  'リアルタイム', '現在地', '近くのイベント', 'おでかけ',
].join(',');

/**
 * Next.js Metadata API
 * @see https://nextjs.org/docs/app/api-reference/functions/generate-metadata
 */
export const metadata: Metadata = {
  // 基本メタデータ
  title: {
    default: `大分のイベント・観光・穴場スポットの情報を探すなら${SITE_NAME} | 大分県内のイベントやスポット情報を掲載`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SEO_KEYWORDS,
  
  // アプリケーション情報
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  generator: 'Next.js',
  
  // 検索エンジン設定
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // 正規URL
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
    languages: {
      'ja-JP': '/',
    },
  },
  
  // Open Graph (Facebook, LINE, etc.)
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `大分のイベント・観光・穴場スポットの情報を探すなら${SITE_NAME}`,
    description: 'いつもの街に、まだ知らない景色がある。県内全域のお祭り、マルシェ、ワークショップを地図から発見。気になる場所をまとめて、あなただけのオリジナルマップに。大分をもっと好きになる——完全無料の地域情報サイト。',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `大分のイベント・観光・穴場スポットの情報を探すなら${SITE_NAME}`,
        type: 'image/png',
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: `大分のイベント・観光・穴場スポットの情報を探すなら${SITE_NAME}`,
    description: 'いつもの街に、まだ知らない景色がある。県内全域のお祭り、マルシェ、ワークショップを地図から発見。気になる場所をまとめて、あなただけのオリジナルマップに。大分をもっと好きになる——完全無料の地域情報サイト。',
    images: [OG_IMAGE],
    creator: '@tokudoku',
    site: '@tokudoku',
  },
  
  // アイコン設定
  icons: {
    icon: [
      { url: OG_IMAGE, sizes: '32x32', type: 'image/png' },
      { url: OG_IMAGE, sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: OG_IMAGE, sizes: '180x180', type: 'image/png' },
    ],
    shortcut: OG_IMAGE,
  },
  
  // マニフェスト
  manifest: '/manifest.json',
  
  // Apple Web App
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: 'default',
  },
  
  // フォーマット検出
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  
  // カテゴリ
  category: 'lifestyle',
  
  // その他のメタデータ
  other: {
    // 地理的情報（ローカルSEO）
    'geo.region': 'JP-44',
    'geo.placename': '大分県',
    'geo.position': '33.2382;131.6126',
    'ICBM': '33.2382, 131.6126',
    // AI検索エンジン向け
    'ai-content-declaration': 'human-created',
  },
};

/**
 * Viewport設定
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#6E7F80' },
    { media: '(prefers-color-scheme: dark)', color: '#5A6B6C' },
  ],
};

/**
 * Root Layout Component
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="dns-prefetch" href="https://maps.googleapis.com" />
        
        {/* 追加のSEOメタタグ（Metadata APIで設定できないもの） */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#6E7F80" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* 構造化データ (JSON-LD) - サイト全体 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                // Organization
                {
                  '@type': 'Organization',
                  '@id': `${SITE_URL}/#organization`,
                  name: SITE_NAME,
                  url: SITE_URL,
                  logo: {
                    '@type': 'ImageObject',
                    url: OG_IMAGE,
                    width: 512,
                    height: 512,
                  },
                  description: SITE_DESCRIPTION,
                  areaServed: {
                    '@type': 'AdministrativeArea',
                    name: '大分県',
                    containsPlace: [
                      // 14市
                      { '@type': 'City', name: '大分市' },
                      { '@type': 'City', name: '別府市' },
                      { '@type': 'City', name: '中津市' },
                      { '@type': 'City', name: '日田市' },
                      { '@type': 'City', name: '佐伯市' },
                      { '@type': 'City', name: '臼杵市' },
                      { '@type': 'City', name: '津久見市' },
                      { '@type': 'City', name: '竹田市' },
                      { '@type': 'City', name: '豊後高田市' },
                      { '@type': 'City', name: '杵築市' },
                      { '@type': 'City', name: '宇佐市' },
                      { '@type': 'City', name: '豊後大野市' },
                      { '@type': 'City', name: '由布市' },
                      { '@type': 'City', name: '国東市' },
                      // 1村3町
                      { '@type': 'AdministrativeArea', name: '姫島村' },
                      { '@type': 'AdministrativeArea', name: '日出町' },
                      { '@type': 'AdministrativeArea', name: '九重町' },
                      { '@type': 'AdministrativeArea', name: '玖珠町' },
                    ],
                  },
                },
                // WebSite with SearchAction
                {
                  '@type': 'WebSite',
                  '@id': `${SITE_URL}/#website`,
                  url: SITE_URL,
                  name: `大分のイベント・観光・穴場スポットの情報を探すなら${SITE_NAME}`,
                  description: SITE_DESCRIPTION,
                  publisher: { '@id': `${SITE_URL}/#organization` },
                  inLanguage: 'ja',
                  potentialAction: {
                    '@type': 'SearchAction',
                    target: {
                      '@type': 'EntryPoint',
                      urlTemplate: `${SITE_URL}/events?q={search_term_string}`,
                    },
                    'query-input': 'required name=search_term_string',
                  },
                },
                // WebApplication
                {
                  '@type': 'WebApplication',
                  '@id': `${SITE_URL}/#webapp`,
                  name: SITE_NAME,
                  url: SITE_URL,
                  applicationCategory: 'LifestyleApplication',
                  operatingSystem: 'Web',
                  browserRequirements: 'Requires JavaScript. Requires HTML5.',
                  offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'JPY',
                  },
                  featureList: [
                    '大分県内の地域イベント検索',
                    '地図上でスポット位置を確認',
                    '現在地周辺のイベント表示',
                    'お祭り・マルシェ・ワークショップ情報',
                    '完全無料・登録不要',
                    'リアルタイム情報更新',
                  ],
                  description: 'いつもの街に、まだ知らない景色がある。県内全域のお祭り、マルシェ、ワークショップを地図から発見。気になる場所をまとめて、あなただけのオリジナルマップに。大分をもっと好きになる——完全無料の地域情報サイト。',
                },
                // BreadcrumbList (トップページ)
                {
                  '@type': 'BreadcrumbList',
                  itemListElement: [
                    {
                      '@type': 'ListItem',
                      position: 1,
                      name: 'ホーム',
                      item: SITE_URL,
                    },
                  ],
                },
              ],
            }),
          }}
        />
      </head>
      <body className={`${notoSansJP.variable} font-sans bg-background text-foreground`}>
        <RootLayoutClient>
          {children}
        </RootLayoutClient>
      </body>
    </html>
  );
}
