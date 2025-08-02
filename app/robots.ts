import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://tokudoku.com'
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        // '/api/', // 一時的にコメントアウト
        '/admin/',
        '/_next/',
        '/private/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
