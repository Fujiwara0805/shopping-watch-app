import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    // ユーザーのStripeアカウントIDを取得
    const { data: profile, error } = await supabase
      .from('app_profiles')
      .select('stripe_account_id, display_name')
      .eq('user_id', session.user.id)
      .single();

    if (error || !profile?.stripe_account_id) {
      return NextResponse.json({ 
        error: 'Stripeアカウントが見つかりません' 
      }, { status: 404 });
    }

    // Stripeアカウント情報を取得
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);

    // 残高情報を取得
    let balance = null;
    try {
      balance = await stripe.balance.retrieve({
        stripeAccount: profile.stripe_account_id,
      });
    } catch (balanceError) {
      console.log('Balance retrieval failed:', balanceError);
      // 残高取得に失敗しても継続
    }

    // 支払い履歴を取得（最新10件）
    let payouts = null;
    try {
      payouts = await stripe.payouts.list(
        { limit: 10 },
        { stripeAccount: profile.stripe_account_id }
      );
    } catch (payoutError) {
      console.log('Payout retrieval failed:', payoutError);
      // 支払い履歴取得に失敗しても継続
    }

    return NextResponse.json({
      accountInfo: {
        id: account.id,
        email: account.email,
        type: account.type,
        country: account.country,
        default_currency: account.default_currency,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        capabilities: account.capabilities,
        business_profile: account.business_profile,
        individual: account.individual ? {
          first_name: account.individual.first_name,
          last_name: account.individual.last_name,
          email: account.individual.email,
          phone: account.individual.phone,
          address: account.individual.address,
        } : null,
        requirements: account.requirements,
        metadata: account.metadata,
        created: account.created,
      },
      balance: balance ? {
        available: balance.available,
        pending: balance.pending,
      } : null,
      recentPayouts: payouts ? payouts.data : null,
    });

  } catch (error) {
    console.error('Stripe account info retrieval error:', error);
    
    return NextResponse.json({ 
      error: 'アカウント情報の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 