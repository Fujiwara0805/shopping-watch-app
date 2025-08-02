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

    // 🔥 Stripe Express Connectアカウント作成（日本向け最適化）
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'JP',
      email: session.user.email || undefined,
      business_type: 'individual', // 個人アカウントとして作成
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        mcc: '8398', // Political Organizations（政治組織）
        product_description: '地域情報共有プラットフォームでの応援購入機能',
      },
      metadata: {
        user_id: session.user.id,
        profile_id: profile.id,
        platform: 'tokudoku',
        account_type: 'support_purchase',
      },
    });

    // データベースに保存
    const { error: updateError } = await supabase
      .from('app_profiles')
      .update({ 
        stripe_account_id: account.id,
        stripe_onboarding_completed: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json({ error: 'データベース更新に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ 
      accountId: account.id,
      onboardingCompleted: false 
    });

  } catch (error) {
    console.error('Stripe Connect account creation error:', error);
    
    // より詳細なエラーハンドリング
    if (error instanceof Error) {
      if (error.message.includes('Connect')) {
        return NextResponse.json({ 
          error: 'Stripe Connect設定に問題があります。管理者にお問い合わせください。',
          code: 'CONNECT_NOT_ENABLED'
        }, { status: 503 });
      }
    }
    
    return NextResponse.json({ error: 'アカウント作成に失敗しました' }, { status: 500 });
  }
}
