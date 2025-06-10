import { NextRequest } from 'next/server';

// インメモリストレージ（本番環境ではRedisを推奨）
const requestCounts = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

/**
 * レート制限を実装する関数
 */
export function rateLimit(req: NextRequest, options: RateLimitOptions) {
  const { maxRequests, windowMs, message = 'リクエストが多すぎます。しばらく時間をおいて再度お試しください。' } = options;
  
  // IPアドレスを取得（プロキシ環境を考慮）
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown';
  
  const now = Date.now();
  const key = `${ip}:${req.nextUrl.pathname}`;
  
  // 既存の記録を取得
  const record = requestCounts.get(key);
  
  if (!record) {
    // 初回リクエスト
    requestCounts.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return null;
  }
  
  // 時間窓がリセットされた場合
  if (now > record.resetTime) {
    requestCounts.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return null;
  }
  
  // 制限を超えた場合
  if (record.count >= maxRequests) {
    const resetTimeRemaining = Math.ceil((record.resetTime - now) / 1000);
    return {
      error: message,
      retryAfter: resetTimeRemaining
    };
  }
  
  // カウントを増加
  record.count++;
  requestCounts.set(key, record);
  
  return null;
}

/**
 * 期限切れのレコードをクリーンアップ
 */
export function cleanupRateLimitRecords() {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  requestCounts.forEach((record, key) => {
    if (now > record.resetTime) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => {
    requestCounts.delete(key);
  });
}

// 5分ごとにクリーンアップを実行
if (typeof window === 'undefined') {
  setInterval(cleanupRateLimitRecords, 5 * 60 * 1000);
}