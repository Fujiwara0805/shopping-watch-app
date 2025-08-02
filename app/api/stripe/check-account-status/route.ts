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

    return NextResponse.json({
      onboardingCompleted: account.details_submitted && account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirementsNeeded: account.requirements?.currently_due || [],
      accountStatus: {
        charges_enabled: account.charges_enabled,
        details_submitted: account.details_submitted,
        payouts_enabled: account.payouts_enabled,
      }
    });

  } catch (error) {
    console.error('Account status check error:', error);
    return NextResponse.json({ error: 'アカウント状態の確認に失敗しました' }, { status: 500 });
  }
} 