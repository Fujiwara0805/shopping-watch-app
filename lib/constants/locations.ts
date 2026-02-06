/**
 * 大分県の市町村データ定義
 * ローカルSEO、サイトマップ、地域検索などで使用
 */

export interface OitaLocation {
  prefecture: string;
  city: string;
  slug: string;
}

/**
 * 大分県の市町村リスト（スラッグ付き）
 * サイトマップ、地域別ページ生成などで使用
 */
export const OITA_LOCATIONS: OitaLocation[] = [
  { prefecture: '大分県', city: '大分市', slug: 'oita' },
  { prefecture: '大分県', city: '別府市', slug: 'beppu' },
  { prefecture: '大分県', city: '中津市', slug: 'nakatsu' },
  { prefecture: '大分県', city: '日田市', slug: 'hita' },
  { prefecture: '大分県', city: '佐伯市', slug: 'saiki' },
  { prefecture: '大分県', city: '臼杵市', slug: 'usuki' },
  { prefecture: '大分県', city: '津久見市', slug: 'tsukumi' },
  { prefecture: '大分県', city: '竹田市', slug: 'taketa' },
  { prefecture: '大分県', city: '豊後高田市', slug: 'bungotakada' },
  { prefecture: '大分県', city: '杵築市', slug: 'kitsuki' },
  { prefecture: '大分県', city: '宇佐市', slug: 'usa' },
  { prefecture: '大分県', city: '豊後大野市', slug: 'bungoono' },
  { prefecture: '大分県', city: '由布市', slug: 'yufu' },
  { prefecture: '大分県', city: '国東市', slug: 'kunisaki' },
  { prefecture: '大分県', city: '姫島村', slug: 'himeshima' },
  { prefecture: '大分県', city: '日出町', slug: 'hiji' },
  { prefecture: '大分県', city: '九重町', slug: 'kokonoe' },
  { prefecture: '大分県', city: '玖珠町', slug: 'kusu' },
];

/**
 * 大分県の市町村名リスト（シンプルな配列）
 * セレクトボックスなどで使用
 */
export const OITA_MUNICIPALITIES: string[] = OITA_LOCATIONS.map(loc => loc.city);

/**
 * 主要都市のスラッグリスト
 * 地域×カテゴリページの生成などで使用
 */
export const OITA_MAIN_CITIES = ['oita', 'beppu', 'nakatsu', 'hita', 'yufu'];

/**
 * イベントカテゴリ
 */
export interface EventCategory {
  name: string;
  slug: string;
}

export const EVENT_CATEGORIES: EventCategory[] = [
  { name: 'お祭り', slug: 'festival' },
  { name: 'マルシェ', slug: 'marche' },
  { name: 'ワークショップ', slug: 'workshop' },
  { name: '音楽イベント', slug: 'music' },
  { name: 'フードフェス', slug: 'food-festival' },
  { name: '体験', slug: 'experience' },
];
