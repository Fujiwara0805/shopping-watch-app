import { v4 as uuidv4 } from 'uuid';

const SESSION_KEY = 'anonymous_session_id';

/**
 * localStorageから匿名ユーザー用のセッションIDを取得または新規作成する
 * @returns {string} session ID
 */
export function getAnonymousSessionId(): string {
  // サーバーサイドで実行された場合は何もしない
  if (typeof window === 'undefined') {
    return '';
  }

  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

// セッションIDをクリア（ログイン時など）
export function clearAnonymousSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('anonymousSessionId');
  }
}
