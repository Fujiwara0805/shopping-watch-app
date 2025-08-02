import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';
import Stripe from 'stripe';

// より安全なStripe初期化
function createStripeInstance() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error('STRIPE_SECRET_KEY is not set');
    return null;
  }
  
  try {
    return new Stripe(secretKey, {
      apiVersion: '2025-07-30.basil',
    });
  } catch (error) {
    console.error('Failed to create Stripe instance:', error);
    return null;
  }
}

// 診断用GETエンドポイント
export async function GET() {
  console.log('GET endpoint accessed at:', new Date().toISOString());
  
  const stripe = createStripeInstance();
  
  return NextResponse.json({
    status: 'API Route is accessible',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    stripeKeyLength: process.env.STRIPE_SECRET_KEY?.length || 0,
    stripeInitialized: !!stripe,
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    nextAuthUrl: process.env.NEXTAUTH_URL
  });
}

export async function POST(request: NextRequest) {
  console.log('=== Support Purchase Request ===');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    const stripe = createStripeInstance();
    if (!stripe) {
      console.error('Stripe initialization failed');
      return NextResponse.json({ 
        error: 'Stripe設定エラーが発生しました',
        details: 'Stripe initialization failed'
      }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    let buyerProfileId = null;
    
    if (session?.user?.id) {
      // 認証ユーザーの場合、プロフィールを取得
      const { data: buyerProfile } = await supabase
        .from('app_profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single();
      
      buyerProfileId = buyerProfile?.id;
    } else {
      // 匿名ユーザーの場合、一時的なIDを生成
      buyerProfileId = `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    const { postId, amount } = await request.json();
    console.log('Request data:', { postId, amount });

    if (!postId || !amount) {
      return NextResponse.json({ 
        error: '必要なパラメータが不足しています' 
      }, { status: 400 });
    }

    // 🔥 修正：投稿情報の取得方法を改善
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, content, app_profile_id, support_purchase_enabled, support_purchase_options')
      .eq('id', postId)
      .eq('support_purchase_enabled', true)
      .single();

    if (postError || !post) {
      console.error('Post fetch error:', postError);
      return NextResponse.json({ error: '投稿が見つかりません' }, { status: 404 });
    }

    // 🔥 修正：投稿者のプロフィール情報を別途取得
    const { data: profile, error: profileError } = await supabase
      .from('app_profiles')
      .select('display_name, stripe_account_id, stripe_onboarding_completed, payout_enabled')
      .eq('id', post.app_profile_id)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({ 
        error: '投稿者の情報が見つかりません',
        details: profileError?.message 
      }, { status: 404 });
    }

    console.log('Profile data:', {
      hasStripeAccount: !!profile.stripe_account_id,
      onboardingCompleted: profile.stripe_onboarding_completed,
      payoutEnabled: profile.payout_enabled,
      displayName: profile.display_name
    });

    // 金額検証
    const validAmounts = JSON.parse(post.support_purchase_options || '[]');
    if (!validAmounts.includes(amount)) {
      return NextResponse.json({ error: '無効な金額です' }, { status: 400 });
    }

    // 自分の投稿チェック
    if (post.app_profile_id === buyerProfileId) {
      return NextResponse.json({ error: '自分の投稿には応援購入できません' }, { status: 400 });
    }

    // 🔥 修正：Stripe設定確認を改善（transfers機能チェックを追加）
    if (!profile.stripe_account_id) {
      console.error('Seller Stripe account not found:', {
        profileId: post.app_profile_id,
        displayName: profile.display_name
      });
      
      return NextResponse.json({ 
        error: `${profile.display_name || '投稿者'}さんはまだ応援購入の受取設定を完了していません。`,
        errorCode: 'SELLER_STRIPE_ACCOUNT_NOT_FOUND',
        sellerName: profile.display_name
      }, { status: 400 });
    }

    // 🔥 追加：Stripeアカウントのcapabilities確認
    try {
      const account = await stripe.accounts.retrieve(profile.stripe_account_id);
      const transfersEnabled = account.capabilities?.transfers === 'active';
      const cardPaymentsEnabled = account.capabilities?.card_payments === 'active';
      
      console.log('Stripe account capabilities check:', {
        accountId: profile.stripe_account_id,
        transfers: account.capabilities?.transfers,
        card_payments: account.capabilities?.card_payments,
        charges_enabled: account.charges_enabled,
        details_submitted: account.details_submitted,
        payouts_enabled: account.payouts_enabled
      });

      if (!transfersEnabled) {
        return NextResponse.json({ 
          error: `${profile.display_name || '投稿者'}さんの応援購入設定で転送機能が有効になっていません。設定を完了してください。`,
          errorCode: 'SELLER_TRANSFERS_NOT_ENABLED',
          sellerName: profile.display_name
        }, { status: 400 });
      }

      if (!cardPaymentsEnabled) {
        return NextResponse.json({ 
          error: `${profile.display_name || '投稿者'}さんの応援購入設定でカード決済機能が有効になっていません。`,
          errorCode: 'SELLER_CARD_PAYMENTS_NOT_ENABLED',
          sellerName: profile.display_name
        }, { status: 400 });
      }

      if (!account.charges_enabled) {
        return NextResponse.json({ 
          error: `${profile.display_name || '投稿者'}さんの応援購入設定が未完了のため、決済を受け付けできません。`,
          errorCode: 'SELLER_CHARGES_NOT_ENABLED',
          sellerName: profile.display_name
        }, { status: 400 });
      }

    } catch (stripeError) {
      console.error('Stripe account verification error:', stripeError);
      return NextResponse.json({ 
        error: `${profile.display_name || '投稿者'}さんの応援購入設定の確認に失敗しました。`,
        errorCode: 'SELLER_STRIPE_VERIFICATION_FAILED',
        sellerName: profile.display_name
      }, { status: 400 });
    }

    if (!profile.stripe_onboarding_completed) {
      console.error('Seller Stripe onboarding incomplete:', {
        hasStripeAccount: !!profile.stripe_account_id,
        onboardingCompleted: profile.stripe_onboarding_completed,
        displayName: profile.display_name
      });
      
      return NextResponse.json({ 
        error: `${profile.display_name || '投稿者'}さんの収益受取設定が未完了のため、応援購入できません。`,
        errorCode: 'SELLER_STRIPE_SETUP_INCOMPLETE',
        sellerName: profile.display_name
      }, { status: 400 });
    }

    if (!profile.payout_enabled) {
      console.error('Seller payout not enabled:', {
        hasStripeAccount: !!profile.stripe_account_id,
        onboardingCompleted: profile.stripe_onboarding_completed,
        payoutEnabled: profile.payout_enabled,
        displayName: profile.display_name
      });
      
      return NextResponse.json({ 
        error: `${profile.display_name || '投稿者'}さんの支払い受取設定が有効になっていないため、応援購入できません。`,
        errorCode: 'SELLER_PAYOUT_NOT_ENABLED',
        sellerName: profile.display_name
      }, { status: 400 });
    }

    // 🔥 プラットフォーム手数料計算（5%）
    const platformFeeAmount = Math.floor(amount * 0.05);
    const sellerAmount = amount - platformFeeAmount;
    
    console.log('Amounts:', { amount, platformFeeAmount, sellerAmount });

    // 🔥 Direct Charge with Application Fee（推奨設定）
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: `応援購入 - ${profile.display_name}さんの投稿`,
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
      
      // 🔥 Direct Charge設定
      payment_intent_data: {
        application_fee_amount: platformFeeAmount,
        transfer_data: {
          destination: profile.stripe_account_id,
        },
        metadata: {
          post_id: postId,
          buyer_profile_id: buyerProfileId,
          seller_profile_id: post.app_profile_id,
          amount: amount.toString(),
          platform_fee: platformFeeAmount.toString(),
          seller_amount: sellerAmount.toString(),
          support_purchase: 'true',
        },
      },
      
      metadata: {
        post_id: postId,
        buyer_profile_id: buyerProfileId,
        seller_profile_id: post.app_profile_id,
        amount: amount.toString(),
        platform_fee: platformFeeAmount.toString(),
        seller_amount: sellerAmount.toString(),
        support_purchase: 'true',
      },
    });

    console.log('Checkout session created successfully:', checkoutSession.id);

    return NextResponse.json({ 
      checkoutUrl: checkoutSession.url 
    });

  } catch (error) {
    console.error('=== Support Purchase Error ===');
    console.error('Error details:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json({ 
      error: '決済処理の初期化に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 