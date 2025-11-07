import { Metadata } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { EventStructuredData } from '@/components/seo/structured-data';
import { EventDetailClient } from '@/components/event/event-detail-client';

interface PageProps {
  params: {
    id: string;
  };
}

// 動的メタデータ生成（SSRで実行される）
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { data: event } = await supabase
    .from('posts')
    .select('*')
    .eq('id', params.id)
    .eq('is_deleted', false)
    .single();

  if (!event) {
    return {
      title: 'イベントが見つかりません - トクドク',
      description: '指定されたイベントが見つかりませんでした。',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  // 🔥 終了判定を追加
  const now = new Date();
  let isEventEnded = false;
  
  if (event.event_end_date) {
    const endDate = new Date(event.event_end_date);
    endDate.setHours(23, 59, 59, 999);
    isEventEnded = now > endDate;
  } else if (event.event_start_date) {
    const startDate = new Date(event.event_start_date);
    startDate.setHours(23, 59, 59, 999);
    isEventEnded = now > startDate;
  } else {
    isEventEnded = now > new Date(event.expires_at);
  }

  const eventName = event.event_name || event.content || 'イベント';
  const prefecture = event.prefecture || '大分県';
  const city = event.city || '';
  const location = `${prefecture}${city}`;
  
  // 説明文を生成（最大160文字）
  let description = `${eventName}の詳細情報。${event.store_name}で開催`;
  if (event.event_start_date) {
    const startDate = new Date(event.event_start_date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    description += `。開催日: ${startDate}`;
  }
  description += `。${event.content ? event.content.substring(0, 80) : ''}`;
  if (description.length > 160) {
    description = description.substring(0, 157) + '...';
  }
  
  // 画像URLの処理
  let imageUrl = 'https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png';
  if (event.image_urls) {
    try {
      const images = typeof event.image_urls === 'string' 
        ? JSON.parse(event.image_urls) 
        : event.image_urls;
      if (images && Array.isArray(images) && images.length > 0) {
        imageUrl = images[0];
      }
    } catch (e) {
      console.error('画像URLのパースに失敗:', e);
    }
  }

  // キーワード生成
  const keywords = [
    eventName,
    prefecture,
    city,
    event.store_name,
    'イベント',
    'お祭り',
    'マルシェ',
    'ワークショップ',
    'トクドク',
    '地域イベント',
  ].filter(Boolean);

  const canonicalUrl = `https://tokudoku.com/map/event/${params.id}`;

  // 🔥 終了したイベントの場合はnoindexを設定
  return {
    title: `${eventName} - ${location} | トクドク`,
    description,
    keywords: keywords.join(', '),
    openGraph: {
      title: `${eventName} - ${location}`,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: eventName,
        },
      ],
      type: 'website',
      locale: 'ja_JP',
      siteName: 'トクドク',
      url: canonicalUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${eventName} - ${location}`,
      description,
      images: [imageUrl],
      site: '@tokudoku',
      creator: '@tokudoku',
    },
    alternates: {
      canonical: canonicalUrl,
    },
    // 🔥 終了したイベントは検索エンジンにインデックスさせない
    robots: isEventEnded
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : {
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
}

// 静的パスの生成（人気イベントのみ事前生成）
export async function generateStaticParams() {
  const now = new Date();
  
  const { data: events } = await supabase
    .from('posts')
    .select('id, event_start_date, event_end_date, expires_at')
    .eq('is_deleted', false)
    .eq('category', 'イベント情報')
    .order('created_at', { ascending: false })
    .limit(100); // 最新100件のみ事前生成

  if (!events) {
    return [];
  }

  // 🔥 終了していないイベントのみをフィルタリング
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
    return now <= new Date(event.expires_at);
  });

  return activeEvents.map((event) => ({
    id: event.id,
  }));
}

// ページコンポーネント
export default async function EventDetailPage({ params }: PageProps) {
  // イベントデータ取得（構造化データ用）
  const { data: event } = await supabase
    .from('posts')
    .select('*')
    .eq('id', params.id)
    .eq('is_deleted', false)
    .single();

  // 🔥 終了判定を追加
  const now = new Date();
  let isEventEnded = false;
  
  if (event) {
    if (event.event_end_date) {
      const endDate = new Date(event.event_end_date);
      endDate.setHours(23, 59, 59, 999);
      isEventEnded = now > endDate;
    } else if (event.event_start_date) {
      const startDate = new Date(event.event_start_date);
      startDate.setHours(23, 59, 59, 999);
      isEventEnded = now > startDate;
    } else {
      isEventEnded = now > new Date(event.expires_at);
    }
  }

  return (
    <>
      {/* 🔥 終了していないイベントのみ構造化データを出力 */}
      {event && !isEventEnded && (
        <EventStructuredData
          name={event.event_name || event.content || 'イベント'}
          description={event.content || ''}
          startDate={event.event_start_date || event.created_at}
          endDate={event.event_end_date || event.event_start_date || event.expires_at}
          location={{
            name: event.store_name,
            address: `${event.prefecture || ''}${event.city || ''}${event.address || ''}`,
            latitude: event.store_latitude,
            longitude: event.store_longitude,
          }}
          image={
            event.image_urls
              ? (typeof event.image_urls === 'string' 
                  ? JSON.parse(event.image_urls)[0] 
                  : event.image_urls[0])
              : undefined
          }
          url={`https://tokudoku.com/map/event/${params.id}`}
          organizer={event.store_name}
        />
      )}
      
      {/* クライアントコンポーネント */}
      <EventDetailClient eventId={params.id} />
    </>
  );
}
