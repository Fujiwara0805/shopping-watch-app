import { Metadata } from 'next';
import { redirect } from 'next/navigation';

interface PageProps {
  params: {
    prefecture: string;
    city: string;
  };
}

// 動的メタデータ生成
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const prefecture = decodeURIComponent(params.prefecture);
  const city = decodeURIComponent(params.city);
  const locationName = `${prefecture}${city}`;
  
  return {
    title: `${locationName}のイベント情報 - お祭り・マルシェ | トクドク`,
    description: `${locationName}で開催されるお祭り、マルシェ、ワークショップなどのイベント情報一覧。現在地から近いイベントを地図で検索。週末の予定探しに最適。リアルタイム更新の地域密着イベント情報。`,
    keywords: `${prefecture},${city},${locationName},イベント,お祭り,秋祭り,夏祭り,マルシェ,ワークショップ,地域イベント,週末,予定,トクドク`,
    openGraph: {
      title: `${locationName}のイベント情報 | トクドク`,
      description: `${locationName}で開催されるお祭り、マルシェ、ワークショップなどのイベント情報。`,
      type: 'website',
      locale: 'ja_JP',
      siteName: 'トクドク',
      url: `https://tokudoku.com/area/${params.prefecture}/${params.city}`,
      images: [
        {
          url: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png',
          width: 1200,
          height: 630,
          alt: `${locationName}のイベント情報`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${locationName}のイベント情報`,
      description: `${locationName}で開催されるイベント一覧`,
      images: ['https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png'],
    },
    alternates: {
      canonical: `https://tokudoku.com/area/${params.prefecture}/${params.city}`,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

// 人気地域の静的パス生成
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
  ];

  return locations.map((loc) => ({
    prefecture: encodeURIComponent(loc.prefecture),
    city: encodeURIComponent(loc.city),
  }));
}

// ページコンポーネント - イベント一覧ページにリダイレクト
export default function AreaPage({ params }: PageProps) {
  const prefecture = decodeURIComponent(params.prefecture);
  const city = decodeURIComponent(params.city);
  
  // イベント一覧ページにリダイレクト（地域フィルター付き）
  // 実際のフィルタリング機能はイベント一覧ページで実装されている
  redirect('/events');
}

