import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { EventStructuredDataEnhanced } from '@/components/seo/event-structured-data';
import { EventDetailClient } from '@/components/event/event-detail-client';
import { RelatedEvents } from '@/components/seo/related-events';
import { generateEventMetadata, generateExpiredEventMetadata, generateNotFoundMetadata } from '@/lib/seo/metadata';
import { extractEventIdFromUrl, slugToCity, slugToCategory } from '@/lib/seo/utils';
import { SEOEventData } from '@/lib/seo/types';

interface PageProps {
  params: {
    prefecture: string;
    city: string;
    category: string;
    slug: string;
  };
}

/**
 * イベントIDをスラッグから抽出
 * スラッグ形式: event-name-{uuid}
 */
function extractEventId(slug: string): string | null {
  // UUIDパターン: 8-4-4-4-12の形式
  const uuidPattern = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i;
  const match = slug.match(uuidPattern);
  return match ? match[1] : null;
}

/**
 * イベントデータを取得
 */
async function getEventData(eventId: string): Promise<SEOEventData | null> {
  const { data: event, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', eventId)
    .eq('is_deleted', false)
    .single();

  if (error || !event) {
    return null;
  }

  return event as SEOEventData;
}

/**
 * イベントが終了しているかチェック
 */
function isEventEnded(event: SEOEventData): boolean {
  const now = new Date();
  
  if (event.event_end_date) {
    const endDate = new Date(event.event_end_date);
    endDate.setHours(23, 59, 59, 999);
    return now > endDate;
  }
  
  if (event.event_start_date) {
    const startDate = new Date(event.event_start_date);
    startDate.setHours(23, 59, 59, 999);
    return now > startDate;
  }
  
  if (event.expires_at) {
    return now > new Date(event.expires_at);
  }
  
  return false;
}

/**
 * 動的メタデータ生成
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const eventId = extractEventId(params.slug);
  
  if (!eventId) {
    return generateNotFoundMetadata();
  }
  
  const event = await getEventData(eventId);
  
  if (!event) {
    return generateNotFoundMetadata();
  }
  
  // 終了したイベントはnoindex
  if (isEventEnded(event)) {
    const eventName = event.event_name || event.content || 'イベント';
    return generateExpiredEventMetadata(eventName);
  }
  
  return generateEventMetadata(event);
}

/**
 * 静的パラメータ生成（ビルド時に生成するページ）
 */
export async function generateStaticParams() {
  const now = new Date();
  
  const { data: events, error } = await supabase
    .from('posts')
    .select('id, event_name, content, prefecture, city, category, event_start_date, event_end_date')
    .eq('is_deleted', false)
    .eq('category', 'イベント情報')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error || !events) {
    return [];
  }

  // 終了していないイベントのみ
  const activeEvents = events.filter((event) => {
    if (event.event_end_date) {
      const endDate = new Date(event.event_end_date);
      endDate.setHours(23, 59, 59, 999);
      return now <= endDate;
    }
    if (event.event_start_date) {
      const startDate = new Date(event.event_start_date);
      startDate.setHours(23, 59, 59, 999);
      return now <= startDate;
    }
    return true;
  });

  // URLパラメータを生成
  return activeEvents.map((event) => {
    const eventName = event.event_name || event.content || 'event';
    const city = event.city || 'all';
    const category = event.category || 'event';
    
    // スラッグを生成（日本語を含む場合はそのまま、最後にIDを付与）
    const slug = `${eventName.substring(0, 50).replace(/\s+/g, '-')}-${event.id}`;
    
    return {
      prefecture: 'oita',
      city: city.replace('市', '').replace('町', '').replace('村', '').toLowerCase(),
      category: 'event',
      slug: encodeURIComponent(slug),
    };
  });
}

/**
 * ページコンポーネント
 */
export default async function EventDetailPage({ params }: PageProps) {
  const eventId = extractEventId(decodeURIComponent(params.slug));
  
  if (!eventId) {
    notFound();
  }
  
  const event = await getEventData(eventId);
  
  if (!event) {
    notFound();
  }
  
  // 終了したイベントの場合
  const ended = isEventEnded(event);
  
  // 旧URLからのリダイレクト対応
  // /map/event/[id] からのアクセスは新URLにリダイレクト
  
  return (
    <>
      {/* 構造化データ（終了していないイベントのみ） */}
      {!ended && (
        <EventStructuredDataEnhanced event={event} includesBreadcrumb={true} />
      )}
      
      {/* イベント詳細クライアントコンポーネント */}
      <EventDetailClient eventId={eventId} />
      
      {/* 関連イベント（同じ市町村または隣接市町村） */}
      {!ended && (
        <RelatedEvents 
          currentEventId={eventId}
          city={event.city || undefined}
          prefecture={event.prefecture || '大分県'}
        />
      )}
    </>
  );
}

