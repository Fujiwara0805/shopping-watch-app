import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // おすそわけ記録を作成
    const { error } = await supabase
      .from('support_purchases')
      .insert({
        post_id: session.metadata!.post_id,
        buyer_profile_id: session.metadata!.buyer_profile_id,
        seller_profile_id: session.metadata!.seller_profile_id,
        amount: parseInt(session.metadata!.amount),
        platform_fee: parseInt(session.metadata!.platform_fee),
        seller_amount: parseInt(session.metadata!.seller_amount),
        stripe_payment_intent_id: session.payment_intent as string,
        status: 'completed',
      });

    if (error) {
      console.error('Failed to save support purchase:', error);
    } else {
      console.log('Support purchase saved successfully');
    }
  }

  return NextResponse.json({ received: true });
} 