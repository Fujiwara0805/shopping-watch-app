/**
 * 拡張版イベント構造化データコンポーネント
 * Google検索のリッチリザルト表示に最適化
 * E-E-A-T対応の詳細なスキーマを提供
 */

import Script from 'next/script';
import { SEOEventData, EventJsonLd, BreadcrumbJsonLd } from '@/lib/seo/types';
import { 
  generateCanonicalUrl, 
  cityToSlug,
  toISODateString 
} from '@/lib/seo/utils';

interface EventStructuredDataEnhancedProps {
  event: SEOEventData;
  includesBreadcrumb?: boolean;
}

/**
 * イベントの構造化データを生成
 */
function generateEventStructuredData(event: SEOEventData): EventJsonLd {
  const eventName = event.event_name || event.content || 'イベント';
  const prefecture = event.prefecture || '大分県';
  const city = event.city || '';
  const address = event.address || '';
  const fullAddress = `${prefecture}${city}${address}`;
  
  // 画像URLの処理
  let images: string[] = [];
  if (event.image_urls) {
    if (typeof event.image_urls === 'string') {
      try {
        const parsed = JSON.parse(event.image_urls);
        images = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        images = [event.image_urls];
      }
    } else if (Array.isArray(event.image_urls)) {
      images = event.image_urls;
    }
  }
  
  // デフォルト画像を追加
  if (images.length === 0) {
    images = ['https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png'];
  }
  
  // 日付の処理
  const startDate = event.event_start_date 
    ? toISODateString(event.event_start_date)
    : toISODateString(event.created_at);
  
  const endDate = event.event_end_date 
    ? toISODateString(event.event_end_date)
    : event.event_start_date 
      ? toISODateString(event.event_start_date)
      : event.expires_at 
        ? toISODateString(event.expires_at)
        : startDate;
  
  // 価格の処理
  const price = event.event_price || '0';
  const priceValue = price.replace(/[^0-9]/g, '') || '0';
  
  // イベントURLの生成（短縮ID使用）
  const shortId = event.id.split('-')[0];
  const eventUrl = generateCanonicalUrl(`/events/oita/${cityToSlug(city || '大分市')}/event/${shortId}`);
  
  const structuredData: EventJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: eventName,
    description: event.content || `${eventName}の詳細情報。${event.store_name}で開催。`,
    startDate,
    endDate,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: event.store_name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: address,
        addressLocality: city,
        addressRegion: prefecture,
        addressCountry: 'JP',
      },
    },
    image: images,
    url: eventUrl,
    organizer: {
      '@type': 'Organization',
      name: event.store_name,
    },
    offers: {
      '@type': 'Offer',
      price: priceValue,
      priceCurrency: 'JPY',
      availability: 'https://schema.org/InStock',
      validFrom: startDate,
    },
  };
  
  // 位置情報がある場合は追加
  if (event.store_latitude && event.store_longitude) {
    structuredData.location.geo = {
      '@type': 'GeoCoordinates',
      latitude: event.store_latitude,
      longitude: event.store_longitude,
    };
  }
  
  // 外部URLがある場合
  if (event.url) {
    structuredData.offers!.url = event.url;
  }
  
  return structuredData;
}

/**
 * パンくずリストの構造化データを生成
 */
function generateBreadcrumbStructuredData(event: SEOEventData): BreadcrumbJsonLd {
  const eventName = event.event_name || event.content || 'イベント';
  const prefecture = event.prefecture || '大分県';
  const city = event.city || '';
  const citySlug = cityToSlug(city || '大分市');
  const shortId = event.id.split('-')[0];
  
  const items = [
    {
      '@type': 'ListItem' as const,
      position: 1,
      name: 'トクドク',
      item: 'https://tokudoku.com',
    },
    {
      '@type': 'ListItem' as const,
      position: 2,
      name: 'イベント',
      item: 'https://tokudoku.com/events',
    },
    {
      '@type': 'ListItem' as const,
      position: 3,
      name: prefecture,
      item: `https://tokudoku.com/area/${encodeURIComponent(prefecture)}`,
    },
  ];
  
  if (city) {
    items.push({
      '@type': 'ListItem' as const,
      position: 4,
      name: city,
      item: `https://tokudoku.com/area/${encodeURIComponent(prefecture)}/${encodeURIComponent(city)}`,
    });
    
    items.push({
      '@type': 'ListItem' as const,
      position: 5,
      name: eventName,
      item: generateCanonicalUrl(`/events/oita/${citySlug}/event/${shortId}`),
    });
  } else {
    items.push({
      '@type': 'ListItem' as const,
      position: 4,
      name: eventName,
      item: generateCanonicalUrl(`/events/oita/all/event/${shortId}`),
    });
  }
  
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

/**
 * 拡張版イベント構造化データコンポーネント
 */
export function EventStructuredDataEnhanced({ 
  event, 
  includesBreadcrumb = true 
}: EventStructuredDataEnhancedProps) {
  const eventData = generateEventStructuredData(event);
  const breadcrumbData = includesBreadcrumb ? generateBreadcrumbStructuredData(event) : null;
  
  // 複数のスキーマを@graphで統合
  const combinedData = breadcrumbData 
    ? {
        '@context': 'https://schema.org',
        '@graph': [
          { ...eventData, '@context': undefined },
          { ...breadcrumbData, '@context': undefined },
        ],
      }
    : eventData;
  
  return (
    <Script
      id={`event-structured-data-${event.id}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(combinedData) }}
    />
  );
}

/**
 * イベント一覧ページ用の構造化データ
 */
interface EventListStructuredDataProps {
  events: SEOEventData[];
  pageTitle: string;
  pageUrl: string;
}

export function EventListStructuredData({ 
  events, 
  pageTitle, 
  pageUrl 
}: EventListStructuredDataProps) {
  const itemListData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: pageTitle,
    url: pageUrl,
    numberOfItems: events.length,
    itemListElement: events.slice(0, 10).map((event, index) => {
      const eventName = event.event_name || event.content || 'イベント';
      const city = event.city || '';
      const citySlug = cityToSlug(city || '大分市');
      const shortId = event.id.split('-')[0];
      
      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Event',
          name: eventName,
          url: generateCanonicalUrl(`/events/oita/${citySlug}/event/${shortId}`),
          startDate: event.event_start_date 
            ? toISODateString(event.event_start_date) 
            : toISODateString(event.created_at),
          location: {
            '@type': 'Place',
            name: event.store_name,
            address: `${event.prefecture || '大分県'}${event.city || ''}`,
          },
        },
      };
    }),
  };
  
  return (
    <Script
      id="event-list-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListData) }}
    />
  );
}

/**
 * 地域ページ用の構造化データ
 */
interface AreaStructuredDataProps {
  prefecture: string;
  city?: string;
  eventCount: number;
}

export function AreaStructuredData({ 
  prefecture, 
  city, 
  eventCount 
}: AreaStructuredDataProps) {
  const locationName = city ? `${prefecture}${city}` : prefecture;
  const url = city 
    ? `https://tokudoku.com/area/${encodeURIComponent(prefecture)}/${encodeURIComponent(city)}`
    : `https://tokudoku.com/area/${encodeURIComponent(prefecture)}`;
  
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${locationName}のイベント情報`,
    description: `${locationName}で開催されるお祭り、マルシェ、ワークショップなどのイベント情報一覧。現在${eventCount}件のイベントが掲載中。`,
    url,
    isPartOf: {
      '@type': 'WebSite',
      name: 'トクドク',
      url: 'https://tokudoku.com',
    },
    about: {
      '@type': 'Place',
      name: locationName,
      address: {
        '@type': 'PostalAddress',
        addressLocality: city || '',
        addressRegion: prefecture,
        addressCountry: 'JP',
      },
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'トクドク',
          item: 'https://tokudoku.com',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'エリア',
          item: 'https://tokudoku.com/area',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: prefecture,
          item: `https://tokudoku.com/area/${encodeURIComponent(prefecture)}`,
        },
        ...(city ? [{
          '@type': 'ListItem',
          position: 4,
          name: city,
          item: url,
        }] : []),
      ],
    },
  };
  
  return (
    <Script
      id="area-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export default EventStructuredDataEnhanced;

