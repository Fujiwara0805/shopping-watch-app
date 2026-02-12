import { Metadata } from 'next';
import { supabaseServer } from '@/lib/supabase-server';
import { cityToSlug } from '@/lib/seo/utils';
import Link from 'next/link';
import Image from 'next/image';
import { OITA_LOCATIONS } from '@/lib/constants';

export const metadata: Metadata = {
  title: '大分県の今日のイベント | 本日開催中のお祭り・マルシェ情報 | トクドク',
  description: '大分県内で今日開催されているイベント情報。大分市・別府市・中津市・日田市・由布市など県内全域のお祭り、マルシェ、ワークショップをリアルタイムで確認。今すぐ参加できるイベントを探そう。',
  keywords: '大分 イベント 今日,大分県 今日のイベント,大分市 イベント 今日,別府 イベント 今日,本日開催,今日のお祭り,大分 マルシェ 今日,トクドク',
  openGraph: {
    title: '大分県の今日のイベント | 本日開催中のお祭り・マルシェ情報',
    description: '大分県内で今日開催されているイベント情報。今すぐ参加できるお祭り、マルシェ、ワークショップを探そう。',
    type: 'website',
    locale: 'ja_JP',
    siteName: 'トクドク',
    url: 'https://tokudoku.com/events/today',
    images: [
      {
        url: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png',
        width: 1200,
        height: 630,
        alt: 'トクドク - 今日のイベント',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '大分県の今日のイベント | 本日開催中',
    description: '大分県内で今日開催されているイベント情報。今すぐ参加できるお祭り・マルシェを探そう。',
    images: ['https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png'],
    site: '@tokudoku',
    creator: '@tokudoku',
  },
  alternates: {
    canonical: 'https://tokudoku.com/events/today',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const dynamic = 'force-dynamic';

interface TodayEvent {
  id: string;
  event_name: string | null;
  store_name: string;
  event_start_date: string | null;
  event_end_date: string | null;
  city: string | null;
  prefecture: string | null;
  content: string;
  image_urls: string[] | string | null;
}

async function getTodayEvents(): Promise<TodayEvent[]> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const { data: events, error } = await supabaseServer
    .from('posts')
    .select('id, event_name, store_name, event_start_date, event_end_date, city, prefecture, content, image_urls')
    .eq('is_deleted', false)
    .eq('category', 'イベント情報')
    .order('event_start_date', { ascending: true });

  if (error || !events) return [];

  return events.filter((event: any) => {
    const startDate = event.event_start_date;
    const endDate = event.event_end_date;

    if (endDate) {
      return startDate <= todayStr && endDate >= todayStr;
    }
    if (startDate) {
      return startDate === todayStr;
    }
    return false;
  });
}

function getEventImageUrl(imageUrls: string[] | string | null): string | null {
  if (!imageUrls) return null;
  try {
    const images = typeof imageUrls === 'string' ? JSON.parse(imageUrls) : imageUrls;
    return Array.isArray(images) && images.length > 0 ? images[0] : null;
  } catch {
    return null;
  }
}

export default async function TodayEventsPage() {
  const events = await getTodayEvents();
  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* パンくず */}
        <nav className="text-sm mb-6" aria-label="breadcrumb">
          <ol className="flex items-center gap-2 text-muted-foreground">
            <li><Link href="/" className="hover:text-foreground">ホーム</Link></li>
            <li>/</li>
            <li><Link href="/events" className="hover:text-foreground">イベント一覧</Link></li>
            <li>/</li>
            <li className="text-foreground font-medium">今日のイベント</li>
          </ol>
        </nav>

        {/* ヘッダー */}
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            大分県の今日のイベント
          </h1>
          <p className="text-muted-foreground">
            {dateStr} - 本日開催中のイベント {events.length}件
          </p>
        </header>

        {/* イベント一覧 */}
        {events.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((event) => {
              const imageUrl = getEventImageUrl(event.image_urls);
              const shortId = event.id.split('-')[0];
              const citySlug = event.city ? cityToSlug(event.city) : 'all';
              const eventUrl = `/events/oita/${citySlug}/event/${shortId}`;

              return (
                <Link
                  key={event.id}
                  href={eventUrl}
                  className="block rounded-2xl overflow-hidden border border-border bg-card hover:shadow-md transition-shadow"
                >
                  {imageUrl && (
                    <div className="relative w-full aspect-video">
                      <Image
                        src={imageUrl}
                        alt={event.event_name || event.store_name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 50vw"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h2 className="text-lg font-semibold text-foreground line-clamp-2 mb-1">
                      {event.event_name || event.store_name}
                    </h2>
                    {event.city && (
                      <p className="text-sm text-muted-foreground mb-1">
                        {event.city}
                      </p>
                    )}
                    {event.event_start_date && (
                      <p className="text-xs text-muted-foreground">
                        {event.event_start_date}
                        {event.event_end_date && event.event_end_date !== event.event_start_date && (
                          <> ~ {event.event_end_date}</>
                        )}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-lg text-muted-foreground mb-4">
              本日開催中のイベントはありません
            </p>
            <Link
              href="/events"
              className="inline-block px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              イベント一覧を見る
            </Link>
          </div>
        )}

        {/* 市町村別リンク（内部リンク強化） */}
        <section className="mt-12 pt-8 border-t border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            市町村別イベント情報
          </h2>
          <div className="flex flex-wrap gap-2">
            {OITA_LOCATIONS.map((loc) => (
              <Link
                key={loc.city}
                href={`/area/${encodeURIComponent('大分県')}/${encodeURIComponent(loc.city)}`}
                className="px-3 py-1.5 rounded-full text-sm border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                {loc.city}
              </Link>
            ))}
          </div>
        </section>

        {/* 構造化データ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'CollectionPage',
              name: `大分県の今日のイベント - ${dateStr}`,
              description: `${dateStr}に大分県内で開催中のイベント情報。${events.length}件のイベントを掲載。`,
              url: 'https://tokudoku.com/events/today',
              isPartOf: {
                '@type': 'WebSite',
                name: 'トクドク',
                url: 'https://tokudoku.com',
              },
              about: {
                '@type': 'Place',
                name: '大分県',
                address: {
                  '@type': 'PostalAddress',
                  addressRegion: '大分県',
                  addressCountry: 'JP',
                },
              },
              numberOfItems: events.length,
            }),
          }}
        />
      </div>
    </div>
  );
}
