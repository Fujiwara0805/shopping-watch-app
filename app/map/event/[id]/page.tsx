import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { generateSemanticEventUrl } from '@/lib/seo/url-helper';

interface PageProps {
  params: {
    id: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
}

/**
 * イベントデータを取得
 */
async function getEventData(eventId: string) {
  const { data: event, error } = await supabase
    .from('posts')
    .select('id, event_name, content, city, prefecture')
    .eq('id', eventId)
    .eq('is_deleted', false)
    .single();

  if (error || !event) {
    return null;
  }

  return event;
}

/**
 * 動的メタデータ生成
 * 旧URLにアクセスした場合も適切なメタデータを返す（リダイレクト前）
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const event = await getEventData(params.id);

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

  const eventName = event.event_name || event.content || 'イベント';
  
  // 新しいセマンティックURLを生成
  const semanticUrl = generateSemanticEventUrl({
    eventId: event.id,
    eventName,
    city: event.city || undefined,
    prefecture: event.prefecture || '大分県',
  });
  const canonicalUrl = `https://tokudoku.com${semanticUrl}`;

  // 旧URLはnoindexにして、新URLにcanonicalを向ける
  return {
    title: `${eventName} - トクドク`,
    description: `${eventName}の詳細情報`,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: false, // 旧URLはインデックスしない
      follow: true,
    },
  };
}

/**
 * ページコンポーネント
 * 旧URL (/map/event/[id]) から新URL (/events/oita/[city]/event/[shortId]) へ301リダイレクト
 */
export default async function LegacyEventDetailPage({ params, searchParams }: PageProps) {
  const event = await getEventData(params.id);

  if (!event) {
    // イベントが見つからない場合はイベント一覧へリダイレクト
    redirect('/events');
  }

  const eventName = event.event_name || event.content || 'イベント';

  // 新しいセマンティックURLを生成
  const semanticUrl = generateSemanticEventUrl({
    eventId: event.id,
    eventName,
    city: event.city || undefined,
    prefecture: event.prefecture || '大分県',
  });

  // クエリパラメータを保持してリダイレクト
  const queryParams = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) {
      queryParams.set(key, Array.isArray(value) ? value[0] : value);
    }
  });
  
  const queryString = queryParams.toString();
  const redirectUrl = queryString ? `${semanticUrl}?${queryString}` : semanticUrl;

  // 301リダイレクト（永続的リダイレクト）
  redirect(redirectUrl);
}
