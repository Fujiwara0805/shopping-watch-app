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

    const { updateData } = await request.json();

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

    // 🔥 修正：プラットフォームが編集可能なフィールドのみに制限
    const updateParams: any = {};

    // ビジネスプロフィールの更新（これらは通常編集可能）
    const businessProfile: any = {};
    if (updateData.businessName) businessProfile.name = updateData.businessName;
    if (updateData.productDescription) businessProfile.product_description = updateData.productDescription;
    if (updateData.website) businessProfile.url = updateData.website;
    if (updateData.supportPhone) businessProfile.support_phone = updateData.supportPhone;
    if (updateData.supportEmail) businessProfile.support_email = updateData.supportEmail;
    if (updateData.mcc) businessProfile.mcc = updateData.mcc;

    if (Object.keys(businessProfile).length > 0) {
      updateParams.business_profile = businessProfile;
    }

    // 🔥 削除：email と individual フィールドを除外
    // これらのフィールドはStripe Connectアカウントの所有者のみが編集可能

    // メタデータの更新（これは通常編集可能）
    if (updateData.metadata) {
      updateParams.metadata = {
        ...updateData.metadata,
        updated_at: new Date().toISOString(),
      };
    }

    // 🔥 新規追加：更新するフィールドがない場合のチェック
    if (Object.keys(updateParams).length === 0) {
      return NextResponse.json({
        success: true,
        message: '更新可能なフィールドがありませんでした。メールアドレスや個人情報はStripeダッシュボードから直接更新してください。'
      });
    }

    // Stripeアカウント情報を更新
    const updatedAccount = await stripe.accounts.update(profile.stripe_account_id, updateParams);

    console.log('Stripe account updated:', {
      accountId: updatedAccount.id,
      businessProfile: updatedAccount.business_profile
    });

    return NextResponse.json({
      success: true,
      accountId: updatedAccount.id,
      message: 'アカウント情報を更新しました'
    });

  } catch (error) {
    console.error('Stripe account update error:', error);
    
    if (error instanceof Error) {
      // 🔥 追加：権限エラーのハンドリング
      if (error.message.includes('not authorized to edit')) {
        return NextResponse.json({ 
          error: '一部の情報はStripeダッシュボードから直接更新する必要があります。',
          code: 'PERMISSION_ERROR',
          details: error.message
        }, { status: 403 });
      }
      
      if (error.message.includes('ToS') || error.message.includes('tos_acceptance')) {
        return NextResponse.json({ 
          error: 'Stripe利用規約の設定は日本では自動的に処理されます。',
          code: 'TOS_ACCEPTANCE_NOT_NEEDED',
          details: error.message
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: 'アカウント情報の更新に失敗しました',
        details: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: 'アカウント情報の更新に失敗しました'
    }, { status: 500 });
  }
} 