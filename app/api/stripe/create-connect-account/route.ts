import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';
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

    // ユーザープロフィール取得
    const { data: profile, error } = await supabase
      .from('app_profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'プロフィールが見つかりません' }, { status: 404 });
    }

    // 既にStripeアカウントがある場合
    if (profile.stripe_account_id) {
      return NextResponse.json({ 
        accountId: profile.stripe_account_id,
        onboardingCompleted: profile.stripe_onboarding_completed 
      });
    }

    // Stripe Connectアカウント作成
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'JP',
      email: session.user.email || undefined,
      metadata: {
        user_id: session.user.id,
        profile_id: profile.id,
      },
    });

    // データベースに保存
    await supabase
      .from('app_profiles')
      .update({ stripe_account_id: account.id })
      .eq('id', profile.id);

    return NextResponse.json({ 
      accountId: account.id,
      onboardingCompleted: false 
    });

  } catch (error) {
    console.error('Stripe Connect account creation error:', error);
    return NextResponse.json({ error: 'アカウント作成に失敗しました' }, { status: 500 });
  }
}
