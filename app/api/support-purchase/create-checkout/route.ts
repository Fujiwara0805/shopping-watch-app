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
  console.log('=== POST request received ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Environment:', process.env.NODE_ENV);
  
  try {
    // Stripe初期化をPOST内で行う
    const stripe = createStripeInstance();
    if (!stripe) {
      console.error('Stripe initialization failed in POST');
      return NextResponse.json({ 
        error: 'Stripe設定エラーが発生しました',
        details: 'Stripe initialization failed'
      }, { status: 500 });
    }
    
    console.log('Stripe initialized successfully');

    // セッション取得
    console.log('Getting server session...');
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('No valid session found');
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }
    
    console.log('Session found for user:', session.user.id);

    // リクエストボディの解析
    console.log('Parsing request body...');
    const { postId, amount } = await request.json();
    console.log('Request data:', { postId, amount });

    if (!postId || !amount) {
      console.error('Missing required parameters:', { postId, amount });
      return NextResponse.json({ 
        error: '必要なパラメータが不足しています' 
      }, { status: 400 });
    }

    // 購入者のプロフィール取得
    console.log('Fetching buyer profile...');
    const { data: buyerProfile, error: buyerError } = await supabase
      .from('app_profiles')
      .select('id')
      .eq('user_id', session.user.id)
      .single();

    if (buyerError || !buyerProfile) {
      console.error('Buyer profile error:', buyerError);
      return NextResponse.json({ error: 'プロフィールが見つかりません' }, { status: 404 });
    }
    console.log('Buyer profile found:', buyerProfile.id);

    // 投稿と投稿者情報を取得
    console.log('Fetching post data...');
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(`
        id, content, app_profile_id, support_purchase_enabled, support_purchase_options,
        app_profiles!posts_app_profile_id_fkey(
          display_name, stripe_account_id, 
          stripe_onboarding_completed, payout_enabled
        )
      `)
      .eq('id', postId)
      .eq('support_purchase_enabled', true)
      .single();

    if (postError || !post) {
      console.error('Post fetch error:', postError);
      return NextResponse.json({ error: '投稿が見つかりません' }, { status: 404 });
    }
    console.log('Post found:', post.id);

    // 金額が設定されたオプションに含まれているかチェック
    const validAmounts = JSON.parse(post.support_purchase_options || '[]');
    if (!validAmounts.includes(amount)) {
      console.error('Invalid amount:', { amount, validAmounts });
      return NextResponse.json({ error: '無効な金額です' }, { status: 400 });
    }

    // 自分の投稿への応援購入を防ぐ
    if (post.app_profile_id === buyerProfile.id) {
      console.error('Self-purchase attempt');
      return NextResponse.json({ error: '自分の投稿には応援購入できません' }, { status: 400 });
    }

    // Access the first element of the app_profiles array
    const profile = post.app_profiles?.[0];

    // 投稿者のStripe設定確認
    if (!profile?.stripe_account_id || !profile?.stripe_onboarding_completed) {
      console.error('Seller Stripe setup incomplete:', {
        hasStripeAccount: !!profile?.stripe_account_id,
        onboardingCompleted: profile?.stripe_onboarding_completed,
        displayName: profile?.display_name
      });
      
      return NextResponse.json({ 
        error: `${profile?.display_name || '投稿者'}さんの収益受取設定が未完了のため、応援購入できません。投稿者にStripe設定の完了を依頼してください。`,
        errorCode: 'SELLER_STRIPE_SETUP_INCOMPLETE',
        sellerName: profile?.display_name
      }, { status: 400 });
    }

    // プラットフォーム手数料計算（5%）
    const platformFeeAmount = Math.floor(amount * 0.05);
    const sellerAmount = amount - platformFeeAmount;
    
    console.log('Creating Stripe checkout session...');
    console.log('Amounts:', { amount, platformFeeAmount, sellerAmount });

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

    console.log('Checkout session created successfully:', checkoutSession.id);

    return NextResponse.json({ 
      checkoutUrl: checkoutSession.url 
    });

  } catch (error) {
    console.error('=== POST Error ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', (error as Error)?.message);
    console.error('Error stack:', (error as Error)?.stack);
    
    return NextResponse.json({ 
      error: '決済処理でエラーが発生しました',
      details: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
    }, { status: 500 });
  }
} 