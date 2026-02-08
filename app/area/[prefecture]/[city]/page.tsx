import { Metadata } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { generateAreaMetadata } from '@/lib/seo/metadata';
import { AreaStructuredData, EventListStructuredData } from '@/components/seo/event-structured-data';
import { AreaEventListClient } from '@/components/seo/area-event-list';
import { SEOEventData } from '@/lib/seo/types';

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

  // 終了していないイベントのみフィルタリング
  return events.filter((event) => {
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
  }) as SEOEventData[];
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

  const events = await getAreaEvents(prefecture, city);
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
      />
    </>
  );
}
