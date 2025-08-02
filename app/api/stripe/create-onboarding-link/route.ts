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

    // 🔥 accountIdの検証を追加
    if (!accountId) {
      return NextResponse.json({ 
        error: 'アカウントIDが指定されていません' 
      }, { status: 400 });
    }

    // 🔥 日本向けオンボーディングリンク作成
    // ライブモードではHTTPS必須のため、URLを強制的にHTTPSに変換
    const baseUrl = process.env.NEXTAUTH_URL || '';
    const httpsUrl = baseUrl.startsWith('http://') 
      ? baseUrl.replace('http://', 'https://') 
      : baseUrl;
    
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${httpsUrl}/profile/stripe-setup?refresh=true`,
      return_url: `${httpsUrl}/profile/stripe-setup?success=true`,
      type: 'account_onboarding',
      collect: 'eventually_due', // 必要な情報を段階的に収集
    });

    return NextResponse.json({ url: accountLink.url });

  } catch (error) {
    console.error('Onboarding link creation error:', error);
    
    // より詳細なエラーハンドリング
    if (error instanceof Error) {
      // HTTPS必須エラー
      if (error.message.includes('HTTPS') || error.message.includes('redirected via HTTPS')) {
        return NextResponse.json({ 
          error: 'セキュリティ上の理由により、HTTPS接続が必要です。管理者にお問い合わせください。',
          code: 'HTTPS_REQUIRED'
        }, { status: 400 });
      }
      
      if (error.message.includes('account')) {
        return NextResponse.json({ 
          error: 'アカウント情報に問題があります。再度お試しください。',
          code: 'INVALID_ACCOUNT'
        }, { status: 400 });
      }
    }
    
    return NextResponse.json({ error: 'リンク生成に失敗しました' }, { status: 500 });
  }
} 