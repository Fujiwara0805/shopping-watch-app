/**
 * サブスクリプション抽象（M4 Phase 8）
 *
 * Stripe が設定されている場合は live で問い合わせる。未設定環境では 'free' フォールバック。
 * キャッシュは持たないため、ホットパスで多用する箇所は将来的に短期キャッシュを検討。
 */

import { supabaseServer } from '@/lib/supabase-server';
import { fetchActiveTierFromStripe, getStripe } from '@/lib/services/stripe-server';

export type SubscriptionTier = 'free' | 'plus' | 'pro';

const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  plus: 1,
  pro: 2,
};

export async function getUserTier(userId: string | null | undefined): Promise<SubscriptionTier> {
  if (!userId) return 'free';
  if (!getStripe()) return 'free';

  const { data: user } = await supabaseServer
    .from('app_users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .maybeSingle();

  if (!user?.stripe_customer_id) return 'free';

  try {
    const tier = await fetchActiveTierFromStripe(user.stripe_customer_id);
    return tier ?? 'free';
  } catch (e: any) {
    console.error('getUserTier: Stripe lookup failed:', e?.message);
    return 'free';
  }
}

export function tierAtLeast(actual: SubscriptionTier, required: SubscriptionTier): boolean {
  return TIER_RANK[actual] >= TIER_RANK[required];
}

export const FEATURE_REQUIRED_TIER = {
  closed_room_create: 'plus',
  unlimited_room_create: 'pro',
} as const satisfies Record<string, SubscriptionTier>;
