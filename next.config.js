/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['framer-motion', 'lucide-react'], // LCP改善：パッケージインポートの最適化
  },
  images: {
    // LCP改善：画像最適化の設定
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7日間キャッシュ
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    domains: [
      'res.cloudinary.com', 
      'fuanykkpsjiynzzkkhtv.supabase.co', // Cloudinary画像とSupabase Storage画像の最適化
      'www22.a8.net', // A8.netバナー画像
      'www23.a8.net', // A8.netバナー画像
      'www17.a8.net', // A8.netトラッキングピクセル
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www*.a8.net', // A8.netのすべてのサブドメインを許可
      },
    ],
  },
  // 本番の console.log のみ除去（error/warn は残して調査可能に）
  // ※ 過去に splitChunks を上書きしていた時期があり、Next のチャンクと不整合で
  // 「.css を script として実行しようとして MIME で拒否」となる事例があったため、
  // クライアントの splitChunks は触らない（Next 既定に任せる）。
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? { exclude: ['error', 'warn'] }
        : false,
  },
  // LCP改善：ヘッダー最適化
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          // AI検索エンジン向けのヒント
          {
            key: 'X-Robots-Tag',
            value: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
          }
        ]
      },
      {
        source: '/map',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate'
          }
        ]
      },
      // AI検索エンジンがクロールしやすいように静的ファイルのキャッシュ設定
      {
        source: '/sitemap.xml',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=3600'
          },
          {
            key: 'Content-Type',
            value: 'application/xml'
          }
        ]
      },
      {
        source: '/robots.txt',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=3600'
          },
          {
            key: 'Content-Type',
            value: 'text/plain'
          }
        ]
      }
    ];
  },
  // SEO最適化: トレーリングスラッシュの統一
  trailingSlash: false,
  // SEO最適化: リダイレクト設定
  async redirects() {
    return [
      // wwwなしに統一（SEOでの重複コンテンツ回避）
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.tokudoku.com',
          },
        ],
        destination: 'https://tokudoku.com/:path*',
        permanent: true,
      },
    ];
  }
};

module.exports = nextConfig;