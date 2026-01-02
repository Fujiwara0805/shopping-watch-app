/**
 * セマンティックURL生成ヘルパー
 * クライアントサイドで使用するURL生成関数
 */

import { OITA_CITIES } from './utils';

/**
 * 市町村名をスラッグに変換
 */
function cityToSlug(city: string): string {
  return OITA_CITIES[city] || city.toLowerCase().replace(/[市町村]/g, '');
}

/**
 * イベント名からスラッグを生成
 */
function generateEventSlug(eventName: string): string {
  if (!eventName) return 'event';
  
  // 全角英数字を半角に変換
  let slug = eventName.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => 
    String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
  );
  
  // 特殊文字を削除し、スペースをハイフンに変換
  slug = slug
    .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  // 最大長を制限
  if (slug.length > 50) {
    slug = slug.substring(0, 50).replace(/-$/, '');
  }
  
  return slug || 'event';
}

/**
 * セマンティックイベントURLを生成
 * 形式: /events/oita/{city}/{category}/{slug}-{id}
 */
export function generateSemanticEventUrl(params: {
  eventId: string;
  eventName: string;
  city?: string;
  prefecture?: string;
  category?: string;
}): string {
  const { eventId, eventName, city, category } = params;
  
  const prefectureSlug = 'oita';
  const citySlug = city ? cityToSlug(city) : 'all';
  const categorySlug = category || 'event';
  const eventSlug = generateEventSlug(eventName);
  
  return `/events/${prefectureSlug}/${citySlug}/${categorySlug}/${eventSlug}-${eventId}`;
}

/**
 * セマンティックURLからイベントIDを抽出
 */
export function extractEventIdFromSemanticUrl(url: string): string | null {
  // UUIDパターン: 8-4-4-4-12の形式
  const uuidPattern = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i;
  const match = url.match(uuidPattern);
  return match ? match[1] : null;
}

/**
 * 旧URLからセマンティックURLへの変換
 */
export function convertLegacyToSemanticUrl(
  legacyUrl: string,
  eventData: {
    eventName: string;
    city?: string;
    prefecture?: string;
  }
): string | null {
  // /map/event/{id} 形式からIDを抽出
  const match = legacyUrl.match(/\/map\/event\/([a-f0-9-]+)/i);
  if (!match) return null;
  
  const eventId = match[1];
  return generateSemanticEventUrl({
    eventId,
    eventName: eventData.eventName,
    city: eventData.city,
    prefecture: eventData.prefecture,
  });
}

