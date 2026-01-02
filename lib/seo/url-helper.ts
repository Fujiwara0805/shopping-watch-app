/**
 * セマンティックURL生成ヘルパー
 * クライアントサイドで使用するURL生成関数
 * 
 * 注意: ファイル名の長さ制限（255バイト）を考慮し、
 * スラッグには日本語を含めず、短いIDベースのURLを使用
 */

import { OITA_CITIES } from './utils';

/**
 * 市町村名をスラッグに変換
 */
function cityToSlug(city: string): string {
  return OITA_CITIES[city] || city.toLowerCase().replace(/[市町村]/g, '');
}

/**
 * イベント名から短いスラッグを生成
 * ファイルシステムの制限を考慮し、日本語は除去してIDのみを使用
 */
function generateEventSlug(eventId: string): string {
  // UUIDの最初の8文字を使用（短縮版）
  const shortId = eventId.split('-')[0] || eventId.substring(0, 8);
  return shortId;
}

/**
 * セマンティックイベントURLを生成
 * 形式: /events/oita/{city}/event/{shortId}
 * 
 * 例: /events/oita/beppu/event/e896d51a
 */
export function generateSemanticEventUrl(params: {
  eventId: string;
  eventName: string;
  city?: string;
  prefecture?: string;
  category?: string;
}): string {
  const { eventId, city } = params;
  
  const prefectureSlug = 'oita';
  const citySlug = city ? cityToSlug(city) : 'all';
  const eventSlug = generateEventSlug(eventId);
  
  // シンプルで短いURL構造
  return `/events/${prefectureSlug}/${citySlug}/event/${eventSlug}`;
}

/**
 * セマンティックURLからイベントIDを抽出
 * 短縮IDから完全なIDを取得するにはデータベース検索が必要
 */
export function extractEventIdFromSemanticUrl(url: string): string | null {
  // 短縮ID（8文字）を抽出
  const match = url.match(/\/event\/([a-f0-9]{8})$/i);
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
