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

    // オンボーディングリンク作成
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXTAUTH_URL}/profile/stripe-setup?refresh=true`,
      return_url: `${process.env.NEXTAUTH_URL}/profile/stripe-setup?success=true`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });

  } catch (error) {
    console.error('Onboarding link creation error:', error);
    return NextResponse.json({ error: 'リンク生成に失敗しました' }, { status: 500 });
  }
} 