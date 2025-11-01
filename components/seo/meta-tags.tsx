/**
 * SEOメタデータコンポーネント
 * AI検索エンジン向けに最適化されたメタタグを提供
 */

import Head from 'next/head';

export interface MetaTagsProps {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';
  url?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
}

/**
 * 拡張メタタグコンポーネント
 * Open Graph, Twitter Card, AI向けメタデータを含む
 */
export function MetaTags({
  title = 'トクドク - 地域イベント発見アプリ | 大分県のお祭り・マルシェ情報',
  description = '大分県内のお祭り、マルシェ、ワークショップを地図で発見！現在地から近いイベントをかんたん検索。週末の予定探しに最適な、完全無料の地域密着イベントアプリです。リアルタイムで更新される最新イベント情報をチェックしよう。',
  keywords = [
    'トクドク',
    '大分',
    '大分県',
    'イベント',
    '地域イベント',
    'お祭り',
    '夏祭り',
    '秋祭り',
    'マルシェ',
    'ワークショップ',
    '地図',
    'マップ',
    'イベント検索',
    '無料',
    '週末',
    '予定',
    '地域情報',
    'フェスティバル',
    '体験イベント',
    '手作り市',
    'フードフェス',
    '音楽イベント',
    '地域コミュニティ',
    'リアルタイム',
    '現在地',
    '近くのイベント',
  ],
  ogImage = 'https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png',
  ogType = 'website',
  url = 'https://tokudoku.com',
  publishedTime,
  modifiedTime,
  author,
  section,
  tags = [],
}: MetaTagsProps) {
  // AI検索エンジン向けの拡張キーワード
  const allKeywords = [...keywords, ...tags].join(', ');

  // タイトルの最適化（AI検索での可読性向上）
  const fullTitle = title.includes('トクドク') ? title : `${title} | トクドク`;

  return (
    <Head>
      {/* 基本メタタグ */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={allKeywords} />
      <meta name="author" content={author || 'トクドク'} />

      {/* AI検索エンジン向けの追加メタデータ */}
      <meta name="application-name" content="トクドク" />
      <meta name="apple-mobile-web-app-title" content="トクドク" />
      <meta name="theme-color" content="#73370c" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />

      {/* 地理的情報 - ローカル検索最適化 */}
      <meta name="geo.region" content="JP-44" />
      <meta name="geo.placename" content="大分県" />
      <meta name="geo.position" content="33.2382;131.6126" />
      <meta name="ICBM" content="33.2382, 131.6126" />

      {/* コンテンツ分類 */}
      <meta name="category" content="Local Events, Community, Lifestyle" />
      <meta name="coverage" content="大分県" />
      <meta name="distribution" content="Global" />
      <meta name="rating" content="General" />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      <meta name="bingbot" content="index, follow" />

      {/* AI向けコンテキスト情報 */}
      <meta property="article:publisher" content="トクドク" />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {section && <meta property="article:section" content={section} />}
      {tags.map((tag, index) => (
        <meta key={`article:tag-${index}`} property="article:tag" content={tag} />
      ))}

      {/* Open Graph メタタグ */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="トクドク - 地域イベント発見アプリ" />
      <meta property="og:site_name" content="トクドク" />
      <meta property="og:locale" content="ja_JP" />

      {/* Twitter Card メタタグ */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content="トクドク - 地域イベント発見アプリ" />

      {/* Canonical URL */}
      <link rel="canonical" href={url} />

      {/* Preconnect - パフォーマンス最適化 */}
      <link rel="preconnect" href="https://res.cloudinary.com" />
      <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

      {/* アイコン関連 */}
      <link rel="icon" href="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png" />
      <link rel="apple-touch-icon" href="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png" />
      <link rel="manifest" href="/manifest.json" />

      {/* AI検索エンジン向けの追加ヒント */}
      <meta name="abstract" content="大分県の地域イベント情報を地図で検索できる無料プラットフォーム" />
      <meta name="summary" content="お祭り、マルシェ、ワークショップなどの地域イベントをリアルタイムで発見" />
      <meta name="classification" content="Event Discovery Platform, Local Community Service" />
      <meta name="url" content={url} />
      <meta name="identifier-URL" content={url} />
      <meta name="directory" content="submission" />
      <meta name="pagename" content={fullTitle} />
      <meta name="language" content="Japanese" />
      <meta name="revisit-after" content="1 days" />
    </Head>
  );
}

/**
 * ページごとのメタデータプリセット
 */
export const metaPresets = {
  home: {
    title: 'トクドク - 地域イベント発見アプリ | 大分県のお祭り・マルシェ情報',
    description:
      '大分県内のお祭り、マルシェ、ワークショップを地図で発見！現在地から近いイベントをかんたん検索。週末の予定探しに最適な、完全無料の地域密着イベントアプリです。リアルタイムで更新される最新イベント情報をチェックしよう。',
    keywords: [
      'トクドク',
      '大分',
      '大分県',
      'イベント',
      '地域イベント',
      'お祭り',
      'マルシェ',
      'ワークショップ',
      '地図',
      'イベント検索',
    ],
  },
  map: {
    title: 'イベントマップ - トクドク | 大分県のイベントを地図で探す',
    description:
      '大分県内のイベントを地図上で検索。お祭り、マルシェ、ワークショップの位置情報をマップで確認できます。現在地周辺のイベントを簡単に発見して、週末の予定を立てましょう。',
    keywords: ['イベントマップ', '地図検索', 'マップ', '現在地', '近くのイベント', '大分イベント'],
  },
  events: {
    title: 'イベント一覧 - トクドク | 大分県の最新イベント情報',
    description:
      '大分県内で開催される最新イベント情報を一覧表示。お祭り、マルシェ、ワークショップなど、さまざまなイベントをチェックして、あなたにぴったりのイベントを見つけましょう。',
    keywords: ['イベント一覧', '最新イベント', 'イベント情報', '大分イベント', 'お祭り情報'],
  },
  contact: {
    title: 'お問い合わせ - トクドク',
    description:
      'トクドクに関するお問い合わせはこちらから。サービスに関するご質問、ご意見、ご要望など、お気軽にお問い合わせください。',
    keywords: ['お問い合わせ', 'コンタクト', 'サポート', '質問'],
  },
};

