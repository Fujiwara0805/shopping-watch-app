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

    // 🔥 修正：日本向けオンボーディングリンク作成
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXTAUTH_URL}/profile/stripe-setup?refresh=true`,
      return_url: `${process.env.NEXTAUTH_URL}/profile/stripe-setup?success=true`,
      type: 'account_onboarding',
      // 🔥 追加：日本向けの設定
      collect: 'eventually_due', // 必要な情報を段階的に収集
    });

    console.log('Onboarding link created:', {
      accountId,
      url: accountLink.url,
      expires_at: accountLink.expires_at
    });

    return NextResponse.json({ 
      url: accountLink.url,
      expires_at: accountLink.expires_at
    });

  } catch (error) {
    console.error('Onboarding link creation error:', error);
    
    if (error instanceof Error) {
      // 🔥 追加：日本特有のエラーハンドリング
      if (error.message.includes('ToS') || error.message.includes('tos_acceptance')) {
        return NextResponse.json({ 
          error: 'オンボーディング設定に問題があります。管理者にお問い合わせください。',
          code: 'ONBOARDING_TOS_ERROR',
          details: error.message
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: 'オンボーディングリンクの作成に失敗しました',
        details: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: 'オンボーディングリンクの作成に失敗しました'
    }, { status: 500 });
  }
} 