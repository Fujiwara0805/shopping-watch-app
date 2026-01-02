/**
 * SEOユーティリティ関数
 * URL生成、スラッグ変換、メタデータ生成のヘルパー関数
 */

// 大分県の市町村マッピング（日本語 → ローマ字）
export const OITA_CITIES: Record<string, string> = {
  '大分市': 'oita',
  '別府市': 'beppu',
  '中津市': 'nakatsu',
  '日田市': 'hita',
  '佐伯市': 'saiki',
  '臼杵市': 'usuki',
  '津久見市': 'tsukumi',
  '竹田市': 'taketa',
  '豊後高田市': 'bungotakada',
  '杵築市': 'kitsuki',
  '宇佐市': 'usa',
  '豊後大野市': 'bungoono',
  '由布市': 'yufu',
  '国東市': 'kunisaki',
  '姫島村': 'himeshima',
  '日出町': 'hiji',
  '九重町': 'kokonoe',
  '玖珠町': 'kusu',
};

// ローマ字 → 日本語の逆マッピング
export const OITA_CITIES_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(OITA_CITIES).map(([jp, en]) => [en, jp])
);

// イベントカテゴリのマッピング
export const EVENT_CATEGORIES: Record<string, string> = {
  '祭り': 'festival',
  'お祭り': 'festival',
  '夏祭り': 'summer-festival',
  '秋祭り': 'autumn-festival',
  'マルシェ': 'marche',
  'ワークショップ': 'workshop',
  'フードフェス': 'food-festival',
  '音楽イベント': 'music',
  'ライブ': 'live',
  'コンサート': 'concert',
  '展示会': 'exhibition',
  'スポーツ': 'sports',
  '体験': 'experience',
  'その他': 'other',
};

export const EVENT_CATEGORIES_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(EVENT_CATEGORIES).map(([jp, en]) => [en, jp])
);

/**
 * 日本語テキストをURL用スラッグに変換
 */
export function generateSlug(text: string): string {
  if (!text) return '';
  
  // 全角英数字を半角に変換
  let slug = text.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => 
    String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
  );
  
  // 特殊文字を削除し、スペースをハイフンに変換
  slug = slug
    .toLowerCase()
    .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF-]/g, '') // 英数字、ひらがな、カタカナ、漢字、ハイフンのみ残す
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  // 最大長を制限（URLが長くなりすぎないように）
  if (slug.length > 80) {
    slug = slug.substring(0, 80).replace(/-$/, '');
  }
  
  return slug;
}

/**
 * イベント名からURLスラッグを生成
 */
export function generateEventSlug(eventName: string, eventId: string): string {
  const slug = generateSlug(eventName);
  // スラッグが空の場合はIDを使用
  return slug || eventId;
}

/**
 * 市町村名をローマ字に変換
 */
export function cityToSlug(city: string): string {
  return OITA_CITIES[city] || generateSlug(city);
}

/**
 * ローマ字から市町村名に変換
 */
export function slugToCity(slug: string): string {
  return OITA_CITIES_REVERSE[slug] || slug;
}

/**
 * カテゴリをスラッグに変換
 */
export function categoryToSlug(category: string): string {
  return EVENT_CATEGORIES[category] || 'event';
}

/**
 * スラッグからカテゴリに変換
 */
export function slugToCategory(slug: string): string {
  return EVENT_CATEGORIES_REVERSE[slug] || slug;
}

/**
 * セマンティックURLを生成
 * 例: /events/oita/beppu/festival/summer-festival-2025-abc123
 */
export function generateEventUrl(params: {
  prefecture?: string;
  city?: string;
  category?: string;
  eventName: string;
  eventId: string;
}): string {
  const { prefecture, city, category, eventName, eventId } = params;
  
  const prefectureSlug = prefecture === '大分県' ? 'oita' : 'oita';
  const citySlug = city ? cityToSlug(city) : 'all';
  const categorySlug = category ? categoryToSlug(category) : 'event';
  const eventSlug = generateEventSlug(eventName, eventId);
  
  return `/events/${prefectureSlug}/${citySlug}/${categorySlug}/${eventSlug}-${eventId}`;
}

/**
 * イベントURLからIDを抽出
 */
export function extractEventIdFromUrl(url: string): string | null {
  // パターン: /events/oita/city/category/slug-{uuid}
  const match = url.match(/([a-f0-9-]{36})$/);
  return match ? match[1] : null;
}

/**
 * メタディスクリプションを生成（120文字以内）
 */
export function generateMetaDescription(params: {
  eventName: string;
  storeName?: string;
  city?: string;
  prefecture?: string;
  startDate?: string;
  content?: string;
}): string {
  const { eventName, storeName, city, prefecture, startDate, content } = params;
  
  let description = `${eventName}`;
  
  if (city || prefecture) {
    description += `（${prefecture || ''}${city || ''}）`;
  }
  
  if (storeName) {
    description += `。${storeName}で開催`;
  }
  
  if (startDate) {
    const date = new Date(startDate);
    const formattedDate = date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    description += `。${formattedDate}`;
  }
  
  // 本文からキーワードを抽出して追加
  if (content && description.length < 100) {
    const remaining = 117 - description.length;
    const contentSnippet = content.substring(0, remaining);
    description += `。${contentSnippet}`;
  }
  
  // 120文字に制限
  if (description.length > 120) {
    description = description.substring(0, 117) + '...';
  }
  
  return description;
}

/**
 * タイトルタグを生成
 * フォーマット: [イベント名] | [市町村名]のイベント情報 - トクドク
 */
export function generateTitle(params: {
  eventName: string;
  city?: string;
  prefecture?: string;
}): string {
  const { eventName, city, prefecture } = params;
  
  let location = '';
  if (city) {
    location = city;
  } else if (prefecture) {
    location = prefecture;
  }
  
  if (location) {
    return `${eventName} | ${location}のイベント情報 - トクドク`;
  }
  
  return `${eventName} | 大分県のイベント情報 - トクドク`;
}

/**
 * キーワードを生成
 */
export function generateKeywords(params: {
  eventName: string;
  city?: string;
  prefecture?: string;
  category?: string;
  storeName?: string;
}): string[] {
  const { eventName, city, prefecture, category, storeName } = params;
  
  const keywords: string[] = [
    eventName,
    'トクドク',
    '大分',
    'イベント',
  ];
  
  if (prefecture) keywords.push(prefecture);
  if (city) keywords.push(city, `${city} イベント`);
  if (category) keywords.push(category);
  if (storeName) keywords.push(storeName);
  
  // 一般的なイベント関連キーワード
  keywords.push(
    '地域イベント',
    'お祭り',
    'マルシェ',
    'ワークショップ',
    '週末',
    '予定'
  );
  
  return Array.from(new Set(keywords)); // 重複を除去
}

/**
 * Open Graph画像URLを生成
 */
export function generateOgImageUrl(params: {
  eventName: string;
  imageUrl?: string;
}): string {
  const { eventName, imageUrl } = params;
  
  // イベント画像がある場合はそれを使用
  if (imageUrl) {
    return imageUrl;
  }
  
  // デフォルトのOG画像
  return 'https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png';
}

/**
 * 日付をISO 8601形式に変換
 */
export function toISODateString(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

/**
 * 日本語の日付形式に変換
 */
export function toJapaneseDateString(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

/**
 * Canonical URLを生成
 */
export function generateCanonicalUrl(path: string): string {
  const baseUrl = 'https://tokudoku.com';
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

