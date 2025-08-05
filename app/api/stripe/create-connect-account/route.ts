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

    // 🔥 修正：日本向けStripe Express Connectアカウント作成（tos_acceptanceを削除）
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'JP',
      email: session.user.email || undefined,
      business_type: 'individual', // 個人アカウントとして作成
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }, // 転送機能を明示的に要求
      },
      business_profile: {
        mcc: '5734', // Computer Software Stores（コンピューターソフトウェア販売）
        product_description: '地域情報共有プラットフォームでのおすそわけ・支援機能',
        url: process.env.NEXTAUTH_URL || 'https://tokudoku.com',
      },
      // 🔥 削除：日本では tos_acceptance[service_agreement] はサポートされていない
      // tos_acceptance: {
      //   service_agreement: 'recipient',
      // },
      metadata: {
        user_id: session.user.id,
        profile_id: profile.id,
        platform: 'tokudoku',
        account_type: 'support_purchase',
        created_at: new Date().toISOString(),
      },
    });

    console.log('Stripe account created:', {
      accountId: account.id,
      capabilities: account.capabilities,
      requirements: account.requirements
    });

    // データベースに保存
    const { error: updateError } = await supabase
      .from('app_profiles')
      .update({ 
        stripe_account_id: account.id,
        stripe_onboarding_completed: false,
        payout_enabled: false, // 初期値を明示的に設定
        updated_at: new Date().toISOString()
      })
      .eq('user_id', session.user.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json({ error: 'データベース更新に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ 
      accountId: account.id,
      onboardingCompleted: false,
      capabilities: account.capabilities // capabilities情報を返す
    });

  } catch (error) {
    console.error('Stripe Connect account creation error:', error);
    
    // より詳細なエラーハンドリング
    if (error instanceof Error) {
      // プラットフォームプロフィール未完了エラー
      if (error.message.includes('complete your platform profile')) {
        return NextResponse.json({ 
          error: 'Stripe Connectの設定が未完了です。管理者がStripeダッシュボードでプラットフォームプロフィールを完了する必要があります。',
          code: 'PLATFORM_PROFILE_INCOMPLETE',
          dashboardUrl: 'https://dashboard.stripe.com/connect/accounts/overview'
        }, { status: 503 });
      }
      
      if (error.message.includes('Connect')) {
        return NextResponse.json({ 
          error: 'Stripe Connect設定に問題があります。管理者にお問い合わせください。',
          code: 'CONNECT_NOT_ENABLED'
        }, { status: 503 });
      }

      // 🔥 追加：ToS関連のエラー
      if (error.message.includes('ToS') || error.message.includes('tos_acceptance')) {
        return NextResponse.json({ 
          error: 'Stripe利用規約の設定に問題があります。管理者にお問い合わせください。',
          code: 'TOS_ACCEPTANCE_ERROR',
          details: error.message
        }, { status: 503 });
      }

      // capabilities関連のエラー
      if (error.message.includes('capabilities') || error.message.includes('transfers')) {
        return NextResponse.json({ 
          error: 'Stripe Connectの機能設定に問題があります。管理者にお問い合わせください。',
          code: 'CAPABILITIES_ERROR',
          details: error.message
        }, { status: 503 });
      }
    }
    
    return NextResponse.json({ 
      error: 'アカウント作成に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
