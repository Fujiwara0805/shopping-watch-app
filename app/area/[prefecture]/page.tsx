import { Metadata } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { isEventNotEnded } from '@/lib/seo/utils';
import { AreaStructuredData, EventListStructuredData } from '@/components/seo/event-structured-data';
import { PrefectureEventListClient } from '@/components/seo/prefecture-event-list';
import { SEOEventData } from '@/lib/seo/types';

/** 1時間ごとにISR再生成し、終了イベントを除外 */
export const revalidate = 3600;

interface PageProps {
  params: Promise<{ prefecture: string }> | { prefecture: string };
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
 * 都道府県全体のイベントを取得（開催中・開催予定のみ）
 */
async function getPrefectureEvents(prefecture: string): Promise<SEOEventData[]> {
  const now = new Date();
  const { data: events, error } = await supabase
    .from('posts')
    .select('*')
    .eq('is_deleted', false)
    .eq('category', 'イベント情報')
    .eq('prefecture', prefecture)
    .order('event_start_date', { ascending: true });

  if (error || !events) return [];

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

  // 開催中・開催予定のみでカウント
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

// 動的メタデータ生成
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await Promise.resolve(params);
  const prefecture = decodeSegment(resolved.prefecture);
  const events = await getPrefectureEvents(prefecture);

  return {
    title: `${prefecture}のイベント情報 - お祭り・マルシェ・ワークショップ | トクドク`,
    description: `${prefecture}で開催中・開催予定のイベント${events.length}件。お祭り、マルシェ、ワークショップなどの情報一覧。現在地から近いイベントを地図で検索。`,
    keywords: `${prefecture},イベント,お祭り,秋祭り,夏祭り,マルシェ,ワークショップ,フェスティバル,地域イベント,週末,予定,体験イベント,トクドク`,
    openGraph: {
      title: `${prefecture}のイベント情報 | トクドク`,
      description: `${prefecture}で開催されるイベント情報を地図で検索`,
      type: 'website',
      locale: 'ja_JP',
      siteName: 'トクドク',
      url: `https://tokudoku.com/area/${encodeURIComponent(prefecture)}`,
      images: [
        {
          url: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png',
          width: 1200,
          height: 630,
          alt: `${prefecture}のイベント情報`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${prefecture}のイベント情報`,
      description: `${prefecture}で開催されるお祭り、マルシェ、ワークショップ情報`,
      images: ['https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png'],
    },
    alternates: {
      canonical: `https://tokudoku.com/area/${encodeURIComponent(prefecture)}`,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

// 都道府県の静的パス生成
export async function generateStaticParams() {
  const prefectures = [
    '大分県',
  ];

  return prefectures.map((pref) => ({
    prefecture: encodeURIComponent(pref),
  }));
}

// ページコンポーネント
export default async function PrefecturePage({ params }: PageProps) {
  const resolved = await Promise.resolve(params);
  const prefecture = decodeSegment(resolved.prefecture);

  const [events, municipalityEventCounts] = await Promise.all([
    getPrefectureEvents(prefecture),
    getMunicipalityEventCounts(prefecture),
  ]);

  const pageUrl = `https://tokudoku.com/area/${encodeURIComponent(prefecture)}`;

  return (
    <>
      {/* 構造化データ */}
      <AreaStructuredData
        prefecture={prefecture}
        city=""
        eventCount={events.length}
      />

      {events.length > 0 && (
        <EventListStructuredData
          events={events}
          pageTitle={`${prefecture}のイベント情報`}
          pageUrl={pageUrl}
        />
      )}

      {/* クライアントコンポーネント */}
      <PrefectureEventListClient
        prefecture={prefecture}
        initialEvents={events}
        municipalityEventCounts={municipalityEventCounts}
      />
    </>
  );
}
