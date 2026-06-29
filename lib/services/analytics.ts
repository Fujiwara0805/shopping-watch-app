/**
 * GA4 Custom Event Tracking
 *
 * @next/third-parties/google の sendGAEvent をラップした型安全なイベントトラッキング。
 * クライアントサイド専用・非ブロッキング。
 */
import { sendGAEvent } from '@next/third-parties/google';

// ============================================================
// Event Type Definitions
// ============================================================

/** マップ操作イベント */
type MapEvents = {
  map_view: Record<string, never>;
  spot_type_filter: { spot_type: string };
  facility_detail_view: { facility_type: string; facility_id: string };
};

/** イベント発見イベント */
type EventDiscoveryEvents = {
  event_list_view: { filter_city?: string; filter_target?: string };
  event_detail_view: { event_id: string; event_name?: string; city?: string };
  event_search: { search_query?: string; city?: string; target?: string };
};

/** ユーザーアクションイベント */
type UserActionEvents = {
  post_submit: { category: string; city?: string };
  review_submit: { event_id: string; rating: number };
  facility_report: { facility_type: string };
  facility_vote: { facility_id: string; vote_type: 'exists' | 'not_exists' };
};

/** エンゲージメントイベント */
type EngagementEvents = {
  feedback_submit: { rating: number };
  contact_submit: Record<string, never>;
  login_attempt: { method: string };
  register_attempt: { method: string };
};

/** ナビゲーションイベント */
type NavigationEvents = {
  cta_click: { cta_name: string; page: string };
};

/** 待ち合わせイベント（イベントを口実にした集合機能） */
type MeetupEvents = {
  meetup_room_create: { post_id: string; type: 'open' | 'host' | 'closed' };
  meetup_join: { room_id: string; status: 'going' | 'maybe' | 'cancelled' };
  meetup_leave: { room_id: string };
  meetup_message_send: { room_id: string };
  meetup_report: { room_id?: string };
  meetup_email_verify_request: Record<string, never>;
  meetup_email_verified: Record<string, never>;
};

/** 全カスタムイベント */
type AnalyticsEventMap = MapEvents &
  EventDiscoveryEvents &
  UserActionEvents &
  EngagementEvents &
  NavigationEvents &
  MeetupEvents;

// ============================================================
// Public API
// ============================================================

/**
 * GA4 カスタムイベントを送信する。
 * 型安全: 定義済みイベント名と正しいパラメータのみ許可。
 * サーバーサイドでの呼び出しも安全（no-op）。
 */
export function trackEvent<K extends keyof AnalyticsEventMap>(
  eventName: K,
  ...args: AnalyticsEventMap[K] extends Record<string, never>
    ? []
    : [params: AnalyticsEventMap[K]]
): void {
  try {
    const params = args[0] ?? {};
    sendGAEvent('event', eventName, params);
  } catch {
    // Analytics should never break the app
  }
}
