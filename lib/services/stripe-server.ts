import Stripe from 'stripe';
import { supabaseServer } from '@/lib/supabase-server';

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;

let cached: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!STRIPE_SECRET) return null;
  if (cached) return cached;
  cached = new Stripe(STRIPE_SECRET, { apiVersion: '2024-06-20' as any });
  return cached;
}

export async function getOrCreateStripeCustomer(
  userId: string,
  email?: string | null
): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const { data: user } = await supabaseServer
    .from('app_users')
    .select('id, email, stripe_customer_id')
    .eq('id', userId)
    .single();

  if (!user) return null;

  if (user.stripe_customer_id) {
    return user.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email: email ?? user.email ?? undefined,
    metadata: { app_user_id: userId },
  });

  await supabaseServer
    .from('app_users')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);

  return customer.id;
}

const PRICE_TIER_MAP: Record<string, 'plus' | 'pro'> = {
  ...(process.env.STRIPE_PRICE_PLUS ? { [process.env.STRIPE_PRICE_PLUS]: 'plus' as const } : {}),
  ...(process.env.STRIPE_PRICE_PRO ? { [process.env.STRIPE_PRICE_PRO]: 'pro' as const } : {}),
};

export async function fetchActiveTierFromStripe(
  customerId: string
): Promise<'plus' | 'pro' | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 5,
  });

  let best: 'plus' | 'pro' | null = null;
  for (const sub of subs.data) {
    for (const item of sub.items.data) {
      const priceId = item.price.id;
      const tier = PRICE_TIER_MAP[priceId];
      if (tier === 'pro') return 'pro';
      if (tier === 'plus') best = best ?? 'plus';
    }
  }
  return best;
}

export function getTierForPrice(priceId: string): 'plus' | 'pro' | null {
  return PRICE_TIER_MAP[priceId] ?? null;
}

export const STRIPE_PRICE_PLUS = process.env.STRIPE_PRICE_PLUS ?? null;
export const STRIPE_PRICE_PRO = process.env.STRIPE_PRICE_PRO ?? null;
