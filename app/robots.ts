import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://tokudoku.com'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/auth/',
          '/api/register/',
          '/api/forgot-password/',
          '/api/reset-password/',
          '/admin/',
          '/_next/',
          '/private/',
        ],
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
