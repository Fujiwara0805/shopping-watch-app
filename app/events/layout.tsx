import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'イベント一覧 - 大分県のお祭り・マルシェ情報 | トクドク',
  description: '大分県内で開催されるお祭り、マルシェ、ワークショップなどのイベント一覧。地域ごとに検索して、週末の予定を見つけよう。リアルタイムで更新される最新イベント情報をチェック。',
  keywords: '大分,大分県,イベント一覧,お祭り,秋祭り,夏祭り,マルシェ,ワークショップ,週末,予定,地域イベント,フェスティバル,体験イベント,手作り市,フードフェス,音楽イベント,トクドク',
  openGraph: {
    title: 'イベント一覧 - 大分県のお祭り・マルシェ情報 | トクドク',
    description: '大分県内で開催されるお祭り、マルシェ、ワークショップなどのイベント一覧。',
    type: 'website',
    locale: 'ja_JP',
    siteName: 'トクドク',
    url: 'https://tokudoku.com/events',
    images: [
      {
        url: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png',
        width: 1200,
        height: 630,
        alt: 'トクドク - イベント一覧',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'イベント一覧 - 大分県のお祭り・マルシェ情報',
    description: '大分県内で開催されるイベント一覧。お祭り、マルシェ、ワークショップを探そう。',
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

