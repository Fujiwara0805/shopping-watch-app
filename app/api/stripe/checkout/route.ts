import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getStripe,
  getOrCreateStripeCustomer,
  STRIPE_PRICE_PLUS,
  STRIPE_PRICE_PRO,
} from '@/lib/services/stripe-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const tier = req.nextUrl.searchParams.get('tier');
  const priceId =
    tier === 'pro' ? STRIPE_PRICE_PRO : tier === 'plus' ? STRIPE_PRICE_PLUS : null;
  if (!priceId) {
    return NextResponse.json({ error: 'invalid_tier_or_price_unset' }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }

  const customerId = await getOrCreateStripeCustomer(userId, session.user.email);
  if (!customerId) {
    return NextResponse.json({ error: 'customer_create_failed' }, { status: 500 });
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin).replace(/\/$/, '');

  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/meetup?stripe=success`,
    cancel_url: `${appUrl}/meetup?stripe=cancelled`,
    allow_promotion_codes: true,
  });

  if (!checkout.url) {
    return NextResponse.json({ error: 'no_checkout_url' }, { status: 500 });
  }
  return NextResponse.redirect(checkout.url, { status: 303 });
}
