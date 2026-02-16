import { Metadata } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { generateAreaMetadata } from '@/lib/seo/metadata';
import { isEventNotEnded } from '@/lib/seo/utils';
import { AreaStructuredData, EventListStructuredData } from '@/components/seo/event-structured-data';
import { AreaEventListClient } from '@/components/seo/area-event-list';
import { SEOEventData } from '@/lib/seo/types';
import { OITA_MUNICIPALITIES } from '@/lib/constants';

/** 1時間ごとにISR再生成し、終了イベントを除外 */
export const revalidate = 3600;

interface PageProps {
  params: Promise<{ prefecture: string; city: string }> | { prefecture: string; city: string };
}

/** 本番でURLエンコードされたparamsを確実にデコードする（二重エンコードにも対応） */
function decodeSegment(value: string): string {
  if (!value || typeof value !== 'string') return value;
  let decoded = value;
  try {
    while (decoded !== decodeURIComponent(decoded)) {
      decoded = decodeURIComponent(decoded);
    }
  } catch {
    // デコード失敗時はそのまま返す
  }
  return decoded;
}

/**
 * 地域のイベントを取得
 */
async function getAreaEvents(prefecture: string, city: string): Promise<SEOEventData[]> {
  const now = new Date();
  // 今日の日付（YYYY-MM-DD形式）を取得して、Supabase側で終了済みイベントを除外
  const todayStr = now.toISOString().split('T')[0];

  // event_end_dateがあるイベント：end_date >= 今日 のものを取得
  // event_end_dateがないイベント：start_date >= 今日 のものを取得
  // 日付がないイベント：すべて取得
  // → Supabaseのorフィルタではこの複合条件が難しいため、
  //   limit無しで全件取得し、クライアント側でフィルタリング
  const { data: events, error } = await supabase
    .from('posts')
    .select('*')
    .eq('is_deleted', false)
    .eq('category', 'イベント情報')
    .eq('prefecture', prefecture)
    .eq('city', city)
    .order('event_start_date', { ascending: true });

  if (error || !events) {
    return [];
  }

  // 終了していないイベントのみフィルタリング（isEventNotEnded で共通化）
  return events.filter((event) => isEventNotEnded(event, now)) as SEOEventData[];
}

/**
 * 各市町村の開催中・開催予定イベント件数を取得
 */
async function getMunicipalityEventCounts(prefecture: string): Promise<Record<string, number>> {
  const now = new Date();
  const { data: events, error } = await supabase
    .from('posts')
    .select('city, event_start_date, event_end_date')
    .eq('is_deleted', false)
    .eq('category', 'イベント情報')
    .eq('prefecture', prefecture);

  if (error || !events) return {};

  // 開催中・開催予定のみ isEventNotEnded でフィルタし、市町村ごとにカウント
  const counts: Record<string, number> = {};
  events
    .filter((event) => isEventNotEnded(event as { event_start_date?: string | null; event_end_date?: string | null }, now))
    .forEach((event) => {
      if (event.city) {
        counts[event.city] = (counts[event.city] || 0) + 1;
      }
    });
  return counts;
}

/**
 * 動的メタデータ生成
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await Promise.resolve(params);
  const prefecture = decodeSegment(resolved.prefecture);
  const city = decodeSegment(resolved.city);
  const events = await getAreaEvents(prefecture, city);
  return generateAreaMetadata({
    prefecture,
    city,
    eventCount: events.length,
  });
}

/**
 * 静的パス生成
 */
export async function generateStaticParams() {
  // 大分県の主要市町村
  const locations = [
    { prefecture: '大分県', city: '大分市' },
    { prefecture: '大分県', city: '別府市' },
    { prefecture: '大分県', city: '中津市' },
    { prefecture: '大分県', city: '日田市' },
    { prefecture: '大分県', city: '佐伯市' },
    { prefecture: '大分県', city: '臼杵市' },
    { prefecture: '大分県', city: '津久見市' },
    { prefecture: '大分県', city: '竹田市' },
    { prefecture: '大分県', city: '豊後高田市' },
    { prefecture: '大分県', city: '杵築市' },
    { prefecture: '大分県', city: '宇佐市' },
    { prefecture: '大分県', city: '豊後大野市' },
    { prefecture: '大分県', city: '由布市' },
    { prefecture: '大分県', city: '国東市' },
    { prefecture: '大分県', city: '姫島村' },
    { prefecture: '大分県', city: '日出町' },
    { prefecture: '大分県', city: '九重町' },
    { prefecture: '大分県', city: '玖珠町' },
  ];

  return locations.map((loc) => ({
    prefecture: encodeURIComponent(loc.prefecture),
    city: encodeURIComponent(loc.city),
  }));
}

/**
 * ページコンポーネント（本番でparamsがエンコードされたまま渡る場合にもデコードして表示）
 */
export default async function AreaPage({ params }: PageProps) {
  const resolved = await Promise.resolve(params);
  const prefecture = decodeSegment(resolved.prefecture);
  const city = decodeSegment(resolved.city);

  const [events, municipalityEventCounts] = await Promise.all([
    getAreaEvents(prefecture, city),
    getMunicipalityEventCounts(prefecture),
  ]);
  const locationName = `${prefecture}${city}`;
  const pageUrl = `https://tokudoku.com/area/${encodeURIComponent(prefecture)}/${encodeURIComponent(city)}`;

  return (
    <>
      {/* 構造化データ */}
      <AreaStructuredData
        prefecture={prefecture}
        city={city}
        eventCount={events.length}
      />

      {/* イベント一覧の構造化データ */}
      {events.length > 0 && (
        <EventListStructuredData
          events={events}
          pageTitle={`${locationName}のイベント情報`}
          pageUrl={pageUrl}
        />
      )}

      {/* クライアントコンポーネント */}
      <AreaEventListClient
        prefecture={prefecture}
        city={city}
        initialEvents={events}
        municipalityEventCounts={municipalityEventCounts}
      />
    </>
  );
}
