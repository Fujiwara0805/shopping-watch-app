import { Metadata } from 'next';
import { redirect } from 'next/navigation';

interface PageProps {
  params: {
    prefecture: string;
  };
}

// 動的メタデータ生成
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const prefecture = decodeURIComponent(params.prefecture);
  
  return {
    title: `${prefecture}のイベント情報 - お祭り・マルシェ・ワークショップ | トクドク`,
    description: `${prefecture}で開催されるお祭り、マルシェ、ワークショップなどのイベント情報一覧。現在地から近いイベントを地図で検索。週末の予定探しに最適な地域密着イベントアプリ。`,
    keywords: `${prefecture},イベント,お祭り,秋祭り,夏祭り,マルシェ,ワークショップ,フェスティバル,地域イベント,週末,予定,体験イベント,トクドク`,
    openGraph: {
      title: `${prefecture}のイベント情報 | トクドク`,
      description: `${prefecture}で開催されるイベント情報を地図で検索`,
      type: 'website',
      locale: 'ja_JP',
      siteName: 'トクドク',
      url: `https://tokudoku.com/area/${params.prefecture}`,
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
      canonical: `https://tokudoku.com/area/${params.prefecture}`,
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
    // 将来的に他の都道府県を追加可能
  ];

  return prefectures.map((pref) => ({
    prefecture: encodeURIComponent(pref),
  }));
}

// ページコンポーネント - イベント一覧ページにリダイレクト
export default function PrefecturePage({ params }: PageProps) {
  // イベント一覧ページにリダイレクト
  redirect('/events');
}

