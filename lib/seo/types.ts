/**
 * SEO関連の型定義
 */

// イベントデータの型（SEO用）
export interface SEOEventData {
  id: string;
  event_name: string | null;
  content: string;
  store_name: string;
  prefecture: string | null;
  city: string | null;
  address: string | null;
  store_latitude: number | null;
  store_longitude: number | null;
  event_start_date: string | null;
  event_end_date: string | null;
  event_price: string | null;
  image_urls: string | string[] | null;
  url: string | null;
  phone_number: string | null;
  category: string | null;
  created_at: string;
  expires_at: string | null;
}

// 構造化データ（JSON-LD）の型
export interface EventJsonLd {
  '@context': 'https://schema.org';
  '@type': 'Event';
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  eventAttendanceMode: string;
  eventStatus: string;
  location: {
    '@type': 'Place';
    name: string;
    address: {
      '@type': 'PostalAddress';
      streetAddress?: string;
      addressLocality: string;
      addressRegion: string;
      addressCountry: string;
      postalCode?: string;
    };
    geo?: {
      '@type': 'GeoCoordinates';
      latitude: number;
      longitude: number;
    };
  };
  image?: string[];
  url?: string;
  organizer?: {
    '@type': 'Organization';
    name: string;
    url?: string;
  };
  performer?: {
    '@type': 'Organization' | 'Person';
    name: string;
  };
  offers?: {
    '@type': 'Offer';
    price: string;
    priceCurrency: string;
    availability: string;
    url?: string;
    validFrom?: string;
  };
}

// BreadcrumbList構造化データの型
export interface BreadcrumbJsonLd {
  '@context': 'https://schema.org';
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item: string;
  }>;
}

// ItemList構造化データの型（イベント一覧用）
export interface ItemListJsonLd {
  '@context': 'https://schema.org';
  '@type': 'ItemList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    item: {
      '@type': 'Event';
      name: string;
      url: string;
      startDate: string;
      location: {
        '@type': 'Place';
        name: string;
        address: string;
      };
    };
  }>;
}

// メタデータの型
export interface SEOMetadata {
  title: string;
  description: string;
  keywords: string[];
  canonical: string;
  openGraph: {
    title: string;
    description: string;
    type: 'website' | 'article';
    url: string;
    images: Array<{
      url: string;
      width: number;
      height: number;
      alt: string;
    }>;
    locale: string;
    siteName: string;
  };
  twitter: {
    card: 'summary' | 'summary_large_image';
    title: string;
    description: string;
    images: string[];
  };
  robots: {
    index: boolean;
    follow: boolean;
    'max-image-preview'?: 'none' | 'standard' | 'large';
    'max-snippet'?: number;
    'max-video-preview'?: number;
  };
  alternates?: {
    canonical: string;
    languages?: Record<string, string>;
  };
}

// 地域ページ用のメタデータ
export interface AreaSEOMetadata extends SEOMetadata {
  geo: {
    region: string;
    placename: string;
    position: string;
  };
}

// パンくずリストアイテム
export interface BreadcrumbItem {
  name: string;
  url: string;
}

// 関連イベントの型
export interface RelatedEvent {
  id: string;
  event_name: string | null;
  store_name: string;
  city: string | null;
  event_start_date: string | null;
  event_end_date: string | null;
  image_urls: string | string[] | null;
}

