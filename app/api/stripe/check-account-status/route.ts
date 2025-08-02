import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json({ 
        error: 'アカウントIDが必要です' 
      }, { status: 400 });
    }

    // Stripeアカウント状態を確認
    const account = await stripe.accounts.retrieve(accountId);

    // 🔥 修正：capabilities状態も含めて詳細な状態を返す
    const transfersEnabled = account.capabilities?.transfers === 'active';
    const cardPaymentsEnabled = account.capabilities?.card_payments === 'active';
    
    console.log('Account status check:', {
      accountId,
      capabilities: account.capabilities,
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      transfers_enabled: transfersEnabled,
      card_payments_enabled: cardPaymentsEnabled
    });

    return NextResponse.json({
      onboardingCompleted: account.details_submitted && account.charges_enabled && transfersEnabled,
      payoutsEnabled: account.payouts_enabled,
      transfersEnabled: transfersEnabled, // 🔥 追加
      cardPaymentsEnabled: cardPaymentsEnabled, // 🔥 追加
      requirementsNeeded: account.requirements?.currently_due || [],
      accountStatus: {
        charges_enabled: account.charges_enabled,
        details_submitted: account.details_submitted,
        payouts_enabled: account.payouts_enabled,
        transfers_enabled: transfersEnabled, // 🔥 追加
        card_payments_enabled: cardPaymentsEnabled, // 🔥 追加
      },
      capabilities: account.capabilities // 🔥 追加：全capabilities情報
    });

  } catch (error) {
    console.error('Account status check error:', error);
    return NextResponse.json({ 
      error: 'アカウント状態の確認に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 