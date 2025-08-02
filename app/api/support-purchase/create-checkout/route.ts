import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';
import Stripe from 'stripe';

// 環境変数の存在確認
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY environment variable is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export async function GET() {
  return NextResponse.json({
    status: 'API Route is accessible',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    stripeKeyLength: process.env.STRIPE_SECRET_KEY?.length || 0,
  });
}

export async function POST(request: NextRequest) {
  try {
    // 環境変数チェックを追加
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('Missing STRIPE_SECRET_KEY in production');
      return NextResponse.json({ 
        error: 'サーバー設定エラーが発生しました' 
      }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const { postId, amount } = await request.json();

    // 購入者のプロフィール取得
    const { data: buyerProfile, error: buyerError } = await supabase
      .from('app_profiles')
      .select('id')
      .eq('user_id', session.user.id)
      .single();

    if (buyerError || !buyerProfile) {
      return NextResponse.json({ error: 'プロフィールが見つかりません' }, { status: 404 });
    }

    // 投稿と投稿者情報を取得
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(`
        id, content, app_profile_id, support_purchase_enabled, support_purchase_options,
        app_profiles(
          display_name, stripe_account_id, 
          stripe_onboarding_completed, payout_enabled
        )
      `)
      .eq('id', postId)
      .eq('support_purchase_enabled', true)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: '投稿が見つかりません' }, { status: 404 });
    }

    // 金額が設定されたオプションに含まれているかチェック
    const validAmounts = JSON.parse(post.support_purchase_options || '[]');
    if (!validAmounts.includes(amount)) {
      return NextResponse.json({ error: '無効な金額です' }, { status: 400 });
    }

    // 自分の投稿への応援購入を防ぐ
    if (post.app_profile_id === buyerProfile.id) {
      return NextResponse.json({ error: '自分の投稿には応援購入できません' }, { status: 400 });
    }

    // Access the first element of the app_profiles array
    const profile = post.app_profiles?.[0];

    // 投稿者のStripe設定確認
    if (!profile?.stripe_account_id || !profile?.stripe_onboarding_completed) {
      return NextResponse.json({ 
        error: '投稿者の収益受取設定が完了していません' 
      }, { status: 400 });
    }

    // プラットフォーム手数料計算（5%）
    const platformFeeAmount = Math.floor(amount * 0.05);
    const sellerAmount = amount - platformFeeAmount;

    // Stripe Checkout Session作成（Connect対応）
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: `応援購入 - ${profile?.display_name}さんの投稿`,
              description: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL}/support-purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/timeline`,
      payment_intent_data: {
        application_fee_amount: platformFeeAmount,
        transfer_data: {
          destination: profile?.stripe_account_id,
        },
      },
      metadata: {
        post_id: postId,
        buyer_profile_id: buyerProfile.id,
        seller_profile_id: post.app_profile_id,
        amount: amount.toString(),
        platform_fee: platformFeeAmount.toString(),
        seller_amount: sellerAmount.toString(),
      },
    });

    return NextResponse.json({ 
      checkoutUrl: checkoutSession.url 
    });

  } catch (error) {
    console.error('Checkout session creation error:', error);
    return NextResponse.json({ error: '決済処理でエラーが発生しました' }, { status: 500 });
  }
} 