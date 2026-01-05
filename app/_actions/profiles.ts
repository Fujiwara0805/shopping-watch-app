"use server";

import { supabaseAnon } from '@/lib/supabase-server';

// =============================================================================
// 型定義
// =============================================================================

export interface ProfileData {
  display_name: string | null;
  avatar_url: string | null;
  url: string | null;
  data_consent: boolean;
  // 企業設定
  business_url: string | null;
  business_store_id: string | null;
  business_store_name: string | null;
  business_default_content: string | null;
  business_default_phone: string | null;
  business_default_image_path: string | null;
  business_default_coupon: string | null;
}

export interface UpdateProfileInput {
  userId: string;
  displayName: string;
  avatarPath: string | null;
  shouldUpdateAvatar: boolean;
  urlData: string | null;
  dataConsent: boolean;
  // 企業設定
  isBusinessUser: boolean;
  businessUrl?: string | null;
  businessStoreId?: string | null;
  businessStoreName?: string | null;
  businessDefaultContent?: string | null;
  businessDefaultPhone?: string | null;
  businessDefaultImagePath?: string | null;
  shouldUpdateBusinessImage?: boolean;
  businessDefaultCoupon?: string | null;
}

export interface UserRoleData {
  role: string | null;
}

// =============================================================================
// ユーザー情報取得
// =============================================================================

/**
 * ユーザーの役割を取得
 */
export async function getUserRole(userId: string): Promise<{ role: string | null; error: string | null }> {
  try {
    const { data, error } = await supabaseAnon
      .from('app_users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      return { role: null, error: error.message };
    }

    return { role: data?.role || null, error: null };
  } catch (error: any) {
    console.error('getUserRole error:', error);
    return { role: null, error: error.message };
  }
}

// =============================================================================
// プロフィール取得
// =============================================================================

/**
 * ユーザーIDからプロフィールを取得
 */
export async function getProfile(userId: string): Promise<{ profile: ProfileData | null; error: string | null }> {
  try {
    const { data, error } = await supabaseAnon
      .from('app_profiles')
      .select(`
        display_name,
        avatar_url,
        url,
        data_consent,
        business_url,
        business_store_id,
        business_store_name,
        business_default_content,
        business_default_phone,
        business_default_image_path,
        business_default_coupon
      `)
      .eq('user_id', userId)
      .single();

    if (error) {
      return { profile: null, error: error.message };
    }

    return { profile: data as ProfileData, error: null };
  } catch (error: any) {
    console.error('getProfile error:', error);
    return { profile: null, error: error.message };
  }
}

// =============================================================================
// プロフィール更新
// =============================================================================

/**
 * プロフィールを更新
 */
export async function updateProfile(input: UpdateProfileInput): Promise<{ success: boolean; error: string | null }> {
  try {
    const updateData: any = {
      display_name: input.displayName,
      updated_at: new Date().toISOString(),
      url: input.urlData,
      data_consent: input.dataConsent,
    };

    // アバター更新
    if (input.shouldUpdateAvatar) {
      updateData.avatar_url = input.avatarPath;
    }

    // 企業設定（businessユーザーのみ）
    if (input.isBusinessUser) {
      updateData.business_url = input.businessUrl || null;
      updateData.business_store_id = input.businessStoreId || null;
      updateData.business_store_name = input.businessStoreName || null;
      updateData.business_default_content = input.businessDefaultContent || null;
      updateData.business_default_phone = input.businessDefaultPhone || null;
      updateData.business_default_coupon = input.businessDefaultCoupon || null;

      if (input.shouldUpdateBusinessImage) {
        updateData.business_default_image_path = input.businessDefaultImagePath;
      }
    }

    const { error } = await supabaseAnon
      .from('app_profiles')
      .update(updateData)
      .eq('user_id', input.userId);

    if (error) {
      return { success: false, error: `プロフィールの更新に失敗しました: ${error.message}` };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('updateProfile error:', error);
    return { success: false, error: error.message };
  }
}

// =============================================================================
// アバター削除
// =============================================================================

/**
 * アバターをデータベースから削除（nullに更新）
 */
export async function deleteAvatarFromDb(userId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabaseAnon
      .from('app_profiles')
      .update({ 
        avatar_url: null, 
        updated_at: new Date().toISOString() 
      })
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: `アバターの削除に失敗しました: ${error.message}` };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('deleteAvatarFromDb error:', error);
    return { success: false, error: error.message };
  }
}

// =============================================================================
// 画像アップロード
// =============================================================================

/**
 * アバター画像をSupabase Storageにアップロード
 */
export async function uploadAvatar(
  userId: string,
  fileBuffer: ArrayBuffer,
  fileName: string,
  contentType: string
): Promise<{ path: string | null; error: string | null }> {
  try {
    const fileExt = fileName.split('.').pop();
    const uniqueFileName = `${crypto.randomUUID()}.${fileExt}`;
    const objectPath = `${userId}/${uniqueFileName}`;

    const { error: uploadError } = await supabaseAnon.storage
      .from('avatars')
      .upload(objectPath, fileBuffer, {
        cacheControl: '3600',
        upsert: true,
        contentType,
      });

    if (uploadError) {
      return { path: null, error: `アバター画像のアップロードに失敗しました: ${uploadError.message}` };
    }

    return { path: objectPath, error: null };
  } catch (error: any) {
    console.error('uploadAvatar error:', error);
    return { path: null, error: error.message };
  }
}

/**
 * アバター画像をストレージから削除
 */
export async function deleteAvatarFromStorage(avatarPath: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabaseAnon.storage
      .from('avatars')
      .remove([avatarPath]);

    if (error) {
      console.error('アバター削除エラー:', error);
      // エラーがあっても成功として返す（ファイルが存在しない場合など）
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('deleteAvatarFromStorage error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 企業デフォルト画像をストレージから削除
 */
export async function deleteBusinessImageFromStorage(imagePath: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabaseAnon.storage
      .from('images')
      .remove([imagePath]);

    if (error) {
      console.error('企業デフォルト画像削除エラー:', error);
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('deleteBusinessImageFromStorage error:', error);
    return { success: false, error: error.message };
  }
}

// =============================================================================
// プロフィール表示用データ取得
// =============================================================================

export interface ProfileDisplayData {
  id: string;
  user_id: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  updated_at?: string;
  stripe_account_id?: string | null;
  stripe_onboarding_completed?: boolean;
  payout_enabled?: boolean;
}

export interface ProfilePageData {
  profile: ProfileDisplayData | null;
  postsCount: number;
  role: string | null;
}

/**
 * プロフィールページ用のデータを取得
 */
export async function getProfilePageData(userId: string): Promise<{ data: ProfilePageData | null; error: string | null }> {
  try {
    // ユーザーの役割を取得
    const { data: userData, error: userError } = await supabaseAnon
      .from('app_users')
      .select('role')
      .eq('id', userId)
      .single();

    const role = !userError && userData ? userData.role : null;

    // プロフィール取得
    const { data: profileData, error: profileError } = await supabaseAnon
      .from('app_profiles')
      .select('*, stripe_account_id, stripe_onboarding_completed, payout_enabled')
      .eq('user_id', userId)
      .single();

    if (profileError || !profileData) {
      return { data: null, error: 'プロフィールが見つかりません' };
    }

    // 投稿数を取得
    const { count: postsCount, error: postsCountError } = await supabaseAnon
      .from('posts')
      .select('id', { count: 'exact' })
      .eq('app_profile_id', profileData.id);

    return {
      data: {
        profile: profileData as ProfileDisplayData,
        postsCount: postsCount || 0,
        role,
      },
      error: null,
    };
  } catch (error: any) {
    console.error('getProfilePageData error:', error);
    return { data: null, error: error.message };
  }
}

/**
 * プロフィール初期設定を作成
 */
export async function createProfileSetup(input: {
  userId: string;
  displayName: string;
  avatarPath: string | null;
  urlData: string | null;
  dataConsent: boolean;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const updateData = {
      display_name: input.displayName,
      updated_at: new Date().toISOString(),
      url: input.urlData,
      data_consent: input.dataConsent,
      ...(input.avatarPath && { avatar_url: input.avatarPath }),
    };

    const { error } = await supabaseAnon
      .from('app_profiles')
      .update(updateData)
      .eq('user_id', input.userId);

    if (error) {
      return { success: false, error: `プロフィールの保存に失敗しました: ${error.message}` };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('createProfileSetup error:', error);
    return { success: false, error: error.message };
  }
}
