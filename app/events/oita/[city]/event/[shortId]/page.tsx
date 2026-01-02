import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { EventStructuredDataEnhanced } from '@/components/seo/event-structured-data';
import { EventDetailClient } from '@/components/event/event-detail-client';
import { RelatedEvents } from '@/components/seo/related-events';
import { generateEventMetadata, generateExpiredEventMetadata, generateNotFoundMetadata } from '@/lib/seo/metadata';
import { SEOEventData } from '@/lib/seo/types';

interface PageProps {
  params: {
    city: string;
    shortId: string;
  };
}

/**
 * 短縮IDからイベントデータを取得
 * 短縮ID（UUIDの最初の8文字）でフィルタリング
 */
async function getEventDataByShortId(shortId: string): Promise<SEOEventData | null> {
  // UUID型のカラムではilike/likeが使えないため、
  // idをtext型にキャストしてフィルタリング
  const { data: events, error } = await supabase
    .from('posts')
    .select('*')
    .eq('is_deleted', false)
    .filter('id::text', 'ilike', `${shortId}%`)
    .limit(1);

  if (error || !events || events.length === 0) {
    // フォールバック: 全件取得してフィルタリング（非効率だが確実）
    const { data: allEvents, error: fallbackError } = await supabase
      .from('posts')
      .select('*')
      .eq('is_deleted', false);
    
    if (fallbackError || !allEvents) {
      return null;
    }
    
    const matchedEvent = allEvents.find(e => e.id.startsWith(shortId));
    return matchedEvent as SEOEventData | null;
  }

  return events[0] as SEOEventData;
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
  const event = await getEventDataByShortId(params.shortId);
  
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
 * 動的レンダリングを強制（静的生成を無効化）
 * これによりビルド時のファイル名長さ問題を回避
 */
export const dynamic = 'force-dynamic';

/**
 * ページコンポーネント
 */
export default async function EventDetailPage({ params }: PageProps) {
  const event = await getEventDataByShortId(params.shortId);
  
  if (!event) {
    notFound();
  }
  
  // 終了したイベントの場合
  const ended = isEventEnded(event);
  
  return (
    <>
      {/* 構造化データ（終了していないイベントのみ） */}
      {!ended && (
        <EventStructuredDataEnhanced event={event} includesBreadcrumb={true} />
      )}
      
      {/* イベント詳細クライアントコンポーネント */}
      <EventDetailClient eventId={event.id} />
      
      {/* 関連イベント（同じ市町村または隣接市町村） */}
      {!ended && (
        <RelatedEvents 
          currentEventId={event.id}
          city={event.city || undefined}
          prefecture={event.prefecture || '大分県'}
        />
      )}
    </>
  );
}

