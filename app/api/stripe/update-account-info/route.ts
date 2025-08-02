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

    // 🔥 修正：更新データからtos_acceptanceを除外
    const updateParams: any = {
      // 基本情報の更新
      ...(updateData.email && { email: updateData.email }),
      
      // ビジネスプロフィールの更新
      business_profile: {
        ...(updateData.businessName && { name: updateData.businessName }),
        ...(updateData.productDescription && { 
          product_description: updateData.productDescription 
        }),
        ...(updateData.website && { url: updateData.website }),
        ...(updateData.supportPhone && { support_phone: updateData.supportPhone }),
        ...(updateData.supportEmail && { support_email: updateData.supportEmail }),
        ...(updateData.mcc && { mcc: updateData.mcc }),
      },

      // 個人情報の更新（個人アカウントの場合）
      ...(updateData.individual && {
        individual: {
          ...(updateData.individual.firstName && { 
            first_name: updateData.individual.firstName 
          }),
          ...(updateData.individual.lastName && { 
            last_name: updateData.individual.lastName 
          }),
          ...(updateData.individual.phone && { 
            phone: updateData.individual.phone 
          }),
          ...(updateData.individual.email && { 
            email: updateData.individual.email 
          }),
          // 住所情報
          ...(updateData.individual.address && {
            address: {
              line1: updateData.individual.address.line1,
              line2: updateData.individual.address.line2,
              city: updateData.individual.address.city,
              state: updateData.individual.address.state,
              postal_code: updateData.individual.address.postal_code,
              country: 'JP',
            }
          }),
        }
      }),

      // メタデータの更新
      ...(updateData.metadata && {
        metadata: {
          ...updateData.metadata,
          updated_at: new Date().toISOString(),
        }
      }),
    };

    // 🔥 削除：日本では tos_acceptance は含めない
    // tos_acceptance は日本のアカウントでは自動的に処理される

    // Stripeアカウント情報を更新
    const updatedAccount = await stripe.accounts.update(profile.stripe_account_id, updateParams);

    console.log('Stripe account updated:', {
      accountId: updatedAccount.id,
      email: updatedAccount.email,
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
      // 🔥 追加：ToS関連のエラーハンドリング
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