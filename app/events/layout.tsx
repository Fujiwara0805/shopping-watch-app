import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '大分のイベント情報【今日・今週末】お祭り・マルシェ一覧 | トクドク',
  description: '大分県内で今日・今週末に開催されるお祭り、マルシェ、ワークショップなどのイベント一覧。大分市・別府市・中津市・日田市・由布市など県内全域のイベントを地域ごとに検索。リアルタイム更新の最新情報をチェック。',
  keywords: '大分 イベント,大分 イベント 今日,大分県 イベント,大分市 イベント,別府市 イベント,中津市 イベント,日田市 イベント,由布市 イベント,大分 お祭り,大分 マルシェ,大分 今週末,イベント一覧,秋祭り,夏祭り,ワークショップ,体験イベント,手作り市,フードフェス,音楽イベント,地域イベント,週末 予定,明日 イベント,トクドク',
  openGraph: {
    title: '大分のイベント情報【今日・今週末】お祭り・マルシェ一覧 | トクドク',
    description: '大分県内で今日・今週末に開催されるお祭り、マルシェ、ワークショップなどのイベント一覧。大分市・別府市・中津市など県内全域を網羅。',
    type: 'website',
    locale: 'ja_JP',
    siteName: 'トクドク',
    url: 'https://tokudoku.com/events',
    images: [
      {
        url: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png',
        width: 1200,
        height: 630,
        alt: 'トクドク - 大分県のイベント情報',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '大分のイベント情報【今日・今週末】お祭り・マルシェ一覧',
    description: '大分県内で今日・今週末に開催されるイベント一覧。お祭り、マルシェ、ワークショップを探そう。',
    images: ['https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png'],
    site: '@tokudoku',
    creator: '@tokudoku',
  },
  alternates: {
    canonical: 'https://tokudoku.com/events',
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

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
