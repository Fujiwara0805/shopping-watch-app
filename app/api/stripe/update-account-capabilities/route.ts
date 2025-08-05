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

    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json({ 
        error: 'アカウントIDが必要です' 
      }, { status: 400 });
    }

    console.log('Updating capabilities for account:', accountId);

    // 🔥 修正：既存アカウントのcapabilitiesを更新（tos_acceptanceを削除）
    const updatedAccount = await stripe.accounts.update(accountId, {
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        mcc: '5734', // Computer Software Stores
        product_description: '地域情報共有プラットフォームでのおすそわけ・支援機能',
        url: process.env.NEXTAUTH_URL || 'https://tokudoku.com',
      },
      // 🔥 削除：日本では tos_acceptance[service_agreement] はサポートされていない
      // tos_acceptance: {
      //   service_agreement: 'recipient',
      // },
    });

    console.log('Account capabilities updated:', {
      accountId: updatedAccount.id,
      capabilities: updatedAccount.capabilities,
      requirements: updatedAccount.requirements
    });

    return NextResponse.json({
      success: true,
      accountId: updatedAccount.id,
      capabilities: updatedAccount.capabilities,
      requirements: updatedAccount.requirements
    });

  } catch (error) {
    console.error('Account capabilities update error:', error);
    
    if (error instanceof Error) {
      // 🔥 追加：ToS関連のエラーハンドリング
      if (error.message.includes('ToS') || error.message.includes('tos_acceptance')) {
        return NextResponse.json({ 
          error: 'Stripe利用規約の設定は日本では自動的に処理されます。オンボーディングを完了してください。',
          code: 'TOS_ACCEPTANCE_NOT_NEEDED',
          details: error.message
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: 'アカウント機能の更新に失敗しました',
        details: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: 'アカウント機能の更新に失敗しました'
    }, { status: 500 });
  }
} 