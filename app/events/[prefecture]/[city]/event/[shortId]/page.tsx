import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { EventStructuredDataEnhanced } from '@/components/seo/event-structured-data';
import { EventDetailClient } from '@/components/event/event-detail-client';
import { RelatedEvents } from '@/components/seo/related-events';
import { generateEventMetadata, generateExpiredEventMetadata, generateNotFoundMetadata } from '@/lib/seo/metadata';
import { SEOEventData } from '@/lib/seo/types';

interface PageProps {
  params: {
    prefecture: string;
    city: string;
    shortId: string;
  };
}

/**
 * 短縮IDからイベントデータを取得
 * 短縮ID（UUIDの最初の8文字）でフィルタリング
 * サーバー用クライアントでRLSを考慮せず確実に取得
 */
async function getEventDataByShortId(shortId: string): Promise<SEOEventData | null> {
  // 短縮IDは英数字8文字（UUIDの先頭部分）。正規化
  const normalizedShortId = shortId.toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 8);
  if (!normalizedShortId) return null;

  const { data: events, error } = await supabaseServer
    .from('posts')
    .select('*')
    .eq('is_deleted', false)
    .eq('category', 'イベント情報');

  if (error) {
    console.error('[EventDetail] getEventDataByShortId error:', error.message);
    return null;
  }

  const matchedEvent = (events ?? []).find((e) => String(e.id).toLowerCase().startsWith(normalizedShortId));
  return matchedEvent ? (matchedEvent as SEOEventData) : null;
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
 * 動的メタデータ生成（Next.js 14: params は同期的なオブジェクト）
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
 * ページコンポーネント（Next.js 14: params は同期的なオブジェクト）
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

      {/* 関連イベント（同じ市町村かつ開催期間が重なるイベント） */}
      {!ended && (
        <RelatedEvents
          currentEventId={event.id}
          city={event.city || undefined}
          prefecture={event.prefecture || '大分県'}
          currentEventStartDate={event.event_start_date}
          currentEventEndDate={event.event_end_date}
        />
      )}
    </>
  );
}
