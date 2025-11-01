/**
 * 構造化データ(JSON-LD)コンポーネント
 * AI検索エンジン(ChatGPT, Claude, Gemini, Perplexity)向けに最適化された
 * セマンティックなデータを提供
 */

import Script from 'next/script';

interface WebsiteStructuredDataProps {
  url?: string;
}

/**
 * Webサイト全体の構造化データ
 * Organization, WebSite, WebApplication スキーマを含む
 */
export function WebsiteStructuredData({ url = 'https://tokudoku.com' }: WebsiteStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${url}/#organization`,
        name: 'トクドク',
        url: url,
        logo: {
          '@type': 'ImageObject',
          url: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png',
          width: 512,
          height: 512,
        },
        description: '地域イベント情報を地図で探せる完全無料のイベント発見プラットフォーム。大分県内のお祭り、マルシェ、ワークショップなどの地域密着イベントをリアルタイムで検索できます。',
        sameAs: [],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'Customer Service',
          availableLanguage: ['ja'],
        },
        areaServed: {
          '@type': 'Place',
          name: '大分県',
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${url}/#website`,
        url: url,
        name: 'トクドク - 地域イベント発見アプリ',
        description: '地域のお祭り、マルシェ、ワークショップを地図で発見！現在地から近いイベントをかんたん検索。週末の予定探しに最適な、完全無料の地域密着イベントアプリです。',
        publisher: {
          '@id': `${url}/#organization`,
        },
        inLanguage: 'ja',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${url}/map?search={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'WebApplication',
        '@id': `${url}/#webapp`,
        name: 'トクドク',
        url: url,
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Web, iOS, Android',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'JPY',
        },
        featureList: [
          '地図上でイベント検索',
          '現在地周辺のイベント表示',
          'リアルタイムイベント情報更新',
          'お祭り・マルシェ・ワークショップ情報',
          '完全無料',
          'アカウント登録不要',
        ],
        description: '大分県内の地域イベント情報をマップ上でかんたんに検索できる無料アプリ。お祭り、マルシェ、ワークショップなどのイベントをリアルタイムで発見。位置情報を活用して現在地周辺のイベントを表示します。',
        browserRequirements: 'Requires JavaScript. Requires HTML5.',
      },
    ],
  };

  return (
    <Script
      id="website-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

interface BreadcrumbStructuredDataProps {
  items: Array<{
    name: string;
    url: string;
  }>;
}

/**
 * パンくずリスト構造化データ
 */
export function BreadcrumbStructuredData({ items }: BreadcrumbStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <Script
      id="breadcrumb-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

interface EventStructuredDataProps {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: {
    name: string;
    address: string;
    latitude?: number;
    longitude?: number;
  };
  image?: string;
  url?: string;
  organizer?: string;
}

/**
 * イベント情報の構造化データ
 */
export function EventStructuredData({
  name,
  description,
  startDate,
  endDate,
  location,
  image,
  url,
  organizer,
}: EventStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name,
    description,
    startDate,
    endDate,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: location.name,
      address: {
        '@type': 'PostalAddress',
        addressLocality: location.address,
        addressCountry: 'JP',
      },
      ...(location.latitude && location.longitude
        ? {
            geo: {
              '@type': 'GeoCoordinates',
              latitude: location.latitude,
              longitude: location.longitude,
            },
          }
        : {}),
    },
    ...(image ? { image: [image] } : {}),
    ...(url ? { url } : {}),
    ...(organizer
      ? {
          organizer: {
            '@type': 'Organization',
            name: organizer,
          },
        }
      : {}),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'JPY',
      availability: 'https://schema.org/InStock',
      validFrom: startDate,
    },
  };

  return (
    <Script
      id="event-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

/**
 * FAQページの構造化データ
 * AI検索エンジンが質問と回答を理解しやすい形式
 */
export function FAQStructuredData() {
  const faqData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'トクドクとは何ですか？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'トクドクは、大分県内の地域イベント情報を地図上で検索できる完全無料のイベント発見プラットフォームです。お祭り、マルシェ、ワークショップなどの地域密着型イベントをリアルタイムで発見できます。位置情報を活用することで、現在地周辺のイベントを簡単に見つけることができます。',
        },
      },
      {
        '@type': 'Question',
        name: 'トクドクの利用料金はいくらですか？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'トクドクは完全無料でご利用いただけます。アカウント登録も不要で、今すぐイベント検索を始められます。すべての機能を無料でお使いいただけます。',
        },
      },
      {
        '@type': 'Question',
        name: 'どのようなイベント情報が掲載されていますか？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'トクドクでは、大分県内のお祭り、夏祭り、秋祭り、地域のマルシェ、手作り市、ワークショップ、体験イベント、フードフェスティバル、音楽イベントなど、さまざまな地域密着型イベント情報を掲載しています。終了したイベントは自動的に非表示になるため、常に最新の情報をご覧いただけます。',
        },
      },
      {
        '@type': 'Question',
        name: 'どうやってイベントを探すのですか？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'トクドクでは地図上にイベント情報がマーカーで表示されます。マップを移動・拡大縮小して、気になるエリアのイベントを探すことができます。位置情報を許可すると、現在地周辺のイベントが自動的に表示されます。マーカーをタップすると、イベントの詳細情報を確認できます。',
        },
      },
      {
        '@type': 'Question',
        name: '位置情報を使用する必要がありますか？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '位置情報の使用は任意です。位置情報を許可すると現在地周辺のイベントを簡単に見つけられますが、許可しなくても地図を手動で操作してイベントを探すことができます。位置情報はイベント検索のみに使用され、外部に共有されることはありません。',
        },
      },
      {
        '@type': 'Question',
        name': 'アカウント登録は必要ですか？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'イベント検索にアカウント登録は不要です。今すぐマップを開いてイベントを探し始めることができます。ただし、イベント情報の投稿やお気に入り機能を使用する場合は、アカウント登録が必要です。',
        },
      },
      {
        '@type': 'Question',
        name: '大分県以外のイベントも掲載されていますか？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '現在、トクドクは大分県内のイベント情報に特化していますが、今後は他の地域へもサービスを拡大していく予定です。',
        },
      },
      {
        '@type': 'Question',
        name: 'イベント情報の更新頻度は？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'トクドクのイベント情報はリアルタイムで更新されます。終了したイベントは自動的に表示されなくなり、新しいイベントが随時追加されます。常に最新のイベント情報をご覧いただけます。',
        },
      },
      {
        '@type': 'Question',
        name: 'スマートフォンで使えますか？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'はい、トクドクはスマートフォン、タブレット、パソコンなど、あらゆるデバイスでご利用いただけます。ウェブブラウザから簡単にアクセスでき、アプリのインストールは不要です。',
        },
      },
      {
        '@type': 'Question',
        name: '自分でイベント情報を投稿できますか？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'はい、アカウント登録後、どなたでもイベント情報を投稿できます。地域のお祭りやマルシェ、ワークショップなどの情報を共有して、地域コミュニティを盛り上げましょう。',
        },
      },
    ],
  };

  return (
    <Script
      id="faq-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }}
    />
  );
}

/**
 * LocalBusiness構造化データ
 * 地域ビジネスとしての情報を提供
 */
export function LocalBusinessStructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': 'https://tokudoku.com/#localbusiness',
    name: 'トクドク',
    image: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png',
    description: '大分県の地域イベント情報プラットフォーム。お祭り、マルシェ、ワークショップを地図で発見。',
    url: 'https://tokudoku.com',
    telephone: '',
    priceRange: '無料',
    areaServed: {
      '@type': 'AdministrativeArea',
      name: '大分県',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 33.2382,
      longitude: 131.6126,
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00',
      closes: '23:59',
    },
  };

  return (
    <Script
      id="localbusiness-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

