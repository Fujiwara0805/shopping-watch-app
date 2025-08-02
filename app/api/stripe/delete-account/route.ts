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

    const { confirmDeletion } = await request.json();

    if (!confirmDeletion) {
      return NextResponse.json({ 
        error: '削除の確認が必要です' 
      }, { status: 400 });
    }

    // ユーザーのStripeアカウントIDを取得
    const { data: profile, error } = await supabase
      .from('app_profiles')
      .select('stripe_account_id, display_name')
      .eq('user_id', session.user.id)
      .single();

    if (error || !profile?.stripe_account_id) {
      return NextResponse.json({ 
        error: 'Stripeアカウントが見つかりません' 
      }, { status: 404 });
    }

    // 🔥 重要：アカウント削除前に未処理の支払いや残高をチェック
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    
    // 残高をチェック
    const balance = await stripe.balance.retrieve({
      stripeAccount: profile.stripe_account_id,
    });

    const hasAvailableBalance = balance.available.some(b => b.amount > 0);
    const hasPendingBalance = balance.pending.some(b => b.amount > 0);

    if (hasAvailableBalance || hasPendingBalance) {
      return NextResponse.json({ 
        error: 'アカウントに未処理の残高があります。すべての支払いが完了してから削除してください。',
        details: {
          available: balance.available,
          pending: balance.pending
        }
      }, { status: 400 });
    }

    // 🔥 注意：Stripe Connectアカウントの削除は慎重に行う
    // 実際の削除ではなく、無効化を推奨
    const deletedAccount = await stripe.accounts.del(profile.stripe_account_id);

    console.log('Stripe account deleted:', {
      accountId: profile.stripe_account_id,
      deleted: deletedAccount.deleted
    });

    // データベースからStripe情報を削除
    const { error: updateError } = await supabase
      .from('app_profiles')
      .update({ 
        stripe_account_id: null,
        stripe_onboarding_completed: false,
        payout_enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', session.user.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json({ 
        error: 'データベース更新に失敗しました' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Stripeアカウントを削除しました'
    });

  } catch (error) {
    console.error('Stripe account deletion error:', error);
    
    if (error instanceof Error) {
      // 削除できない場合のエラーハンドリング
      if (error.message.includes('cannot be deleted')) {
        return NextResponse.json({ 
          error: 'このアカウントは削除できません。未処理の取引がある可能性があります。',
          details: error.message
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: 'アカウントの削除に失敗しました',
        details: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: 'アカウントの削除に失敗しました'
    }, { status: 500 });
  }
} 