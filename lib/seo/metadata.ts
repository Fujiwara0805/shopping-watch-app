/**
 * Next.js Metadata API用のSEOメタデータ生成関数
 * 動的なメタデータ生成とE-E-A-T対応
 */

import { Metadata } from 'next';
import { SEOEventData } from './types';
import {
  generateTitle,
  generateMetaDescription,
  generateKeywords,
  generateCanonicalUrl,
  generateOgImageUrl,
  cityToSlug,
  generateEventSlug,
} from './utils';

/**
 * イベント詳細ページのメタデータを生成
 */
export function generateEventMetadata(event: SEOEventData): Metadata {
  const eventName = event.event_name || event.content || 'イベント';
  const prefecture = event.prefecture || '大分県';
  const city = event.city || '';
  const citySlug = cityToSlug(city || '大分市');
  
  // 画像URLの処理
  let imageUrl = 'https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png';
  if (event.image_urls) {
    try {
      const images = typeof event.image_urls === 'string'
        ? JSON.parse(event.image_urls)
        : event.image_urls;
      if (Array.isArray(images) && images.length > 0) {
        imageUrl = images[0];
      }
    } catch {
      // デフォルト画像を使用
    }
  }
  
  const title = generateTitle({ eventName, city, prefecture });
  const description = generateMetaDescription({
    eventName,
    storeName: event.store_name,
    city,
    prefecture,
    startDate: event.event_start_date || undefined,
    content: event.content,
  });
  const keywords = generateKeywords({
    eventName,
    city,
    prefecture,
    category: event.category || undefined,
    storeName: event.store_name,
  });
  
  const canonicalUrl = generateCanonicalUrl(
    `/events/oita/${citySlug}/event/${generateEventSlug(eventName, event.id)}-${event.id}`
  );
  
  // 日付情報
  const publishedTime = event.created_at;
  const modifiedTime = event.created_at; // 更新日がある場合はそれを使用
  
  return {
    title,
    description,
    keywords: keywords.join(', '),
    authors: [{ name: 'トクドク' }],
    creator: 'トクドク',
    publisher: 'トクドク',
    
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonicalUrl,
      siteName: 'トクドク',
      locale: 'ja_JP',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${eventName} - ${city || prefecture}のイベント情報`,
        },
      ],
      publishedTime,
      modifiedTime,
      section: 'イベント',
      tags: keywords,
    },
    
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    
    alternates: {
      canonical: canonicalUrl,
    },
    
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
    
    // 追加のメタデータ
    other: {
      'geo.region': 'JP-44',
      'geo.placename': city || prefecture,
      'geo.position': event.store_latitude && event.store_longitude
        ? `${event.store_latitude};${event.store_longitude}`
        : '33.2382;131.6126',
      'ICBM': event.store_latitude && event.store_longitude
        ? `${event.store_latitude}, ${event.store_longitude}`
        : '33.2382, 131.6126',
    },
  };
}

/**
 * 地域ページのメタデータを生成
 */
export function generateAreaMetadata(params: {
  prefecture: string;
  city?: string;
  eventCount?: number;
}): Metadata {
  const { prefecture, city, eventCount = 0 } = params;
  const locationName = city ? `${prefecture}${city}` : prefecture;
  
  const title = city
    ? `${city}のイベント情報 - お祭り・マルシェ | トクドク`
    : `${prefecture}のイベント情報 - お祭り・マルシェ | トクドク`;
  
  const description = `${locationName}で開催されるお祭り、マルシェ、ワークショップなどのイベント情報一覧。${eventCount > 0 ? `現在${eventCount}件のイベントが掲載中。` : ''}現在地から近いイベントを地図で検索。週末の予定探しに最適。リアルタイム更新の地域密着イベント情報。`;
  
  const keywords = [
    prefecture,
    city || '',
    locationName,
    'イベント',
    'お祭り',
    '秋祭り',
    '夏祭り',
    'マルシェ',
    'ワークショップ',
    '地域イベント',
    '週末',
    '予定',
    'トクドク',
  ].filter(Boolean);
  
  const canonicalUrl = city
    ? generateCanonicalUrl(`/area/${encodeURIComponent(prefecture)}/${encodeURIComponent(city)}`)
    : generateCanonicalUrl(`/area/${encodeURIComponent(prefecture)}`);
  
  return {
    title,
    description,
    keywords: keywords.join(', '),
    
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonicalUrl,
      siteName: 'トクドク',
      locale: 'ja_JP',
      images: [
        {
          url: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png',
          width: 1200,
          height: 630,
          alt: `${locationName}のイベント情報`,
        },
      ],
    },
    
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png'],
    },
    
    alternates: {
      canonical: canonicalUrl,
    },
    
    robots: {
      index: true,
      follow: true,
    },
    
    other: {
      'geo.region': 'JP-44',
      'geo.placename': locationName,
    },
  };
}

/**
 * イベント一覧ページのメタデータを生成
 */
export function generateEventsListMetadata(params?: {
  category?: string;
  city?: string;
  month?: string;
}): Metadata {
  const { category, city, month } = params || {};
  
  let title = '大分県のイベント一覧';
  let description = '大分県内で開催されるお祭り、マルシェ、ワークショップなどのイベント情報を一覧表示。';
  
  if (city) {
    title = `${city}のイベント一覧`;
    description = `${city}で開催されるイベント情報を一覧表示。`;
  }
  
  if (category) {
    title = `${category} - ${title}`;
    description = `${category}の${description}`;
  }
  
  if (month) {
    title = `${month} - ${title}`;
    description = `${month}開催の${description}`;
  }
  
  title += ' | トクドク';
  description += '週末の予定探しに最適。リアルタイム更新の地域密着イベント情報。';
  
  const keywords = [
    '大分県',
    city || '',
    category || '',
    'イベント一覧',
    'イベント',
    'お祭り',
    'マルシェ',
    'ワークショップ',
    '地域イベント',
    'トクドク',
  ].filter(Boolean);
  
  return {
    title,
    description,
    keywords: keywords.join(', '),
    
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'トクドク',
      locale: 'ja_JP',
      images: [
        {
          url: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png',
          width: 1200,
          height: 630,
          alt: 'トクドク - 大分県のイベント一覧',
        },
      ],
    },
    
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png'],
    },
    
    robots: {
      index: true,
      follow: true,
    },
  };
}

/**
 * 終了したイベントのメタデータを生成（noindex）
 */
export function generateExpiredEventMetadata(eventName: string): Metadata {
  return {
    title: `${eventName}（終了） | トクドク`,
    description: 'このイベントは終了しました。',
    robots: {
      index: false,
      follow: false,
    },
  };
}

/**
 * 404ページのメタデータを生成
 */
export function generateNotFoundMetadata(): Metadata {
  return {
    title: 'ページが見つかりません - トクドク',
    description: '指定されたページが見つかりませんでした。',
    robots: {
      index: false,
      follow: false,
    },
  };
}

