"use server";

import { supabaseAnon } from '@/lib/supabase-server';

// =============================================================================
// 型定義
// =============================================================================

export type PostCategory = 'イベント情報' | '聖地巡礼' | '観光スポット' | '温泉' | 'グルメ';

export interface CreatePostInput {
  userId: string;
  storeId: string | null;
  storeName: string;
  category: PostCategory;
  content: string;
  imageUrls: string[];
  fileUrls: string[];
  url: string | null;
  phoneNumber: string | null;
  prefecture: string | null;
  city: string | null;
  authorRole: 'admin' | 'user';
  enableCheckin: boolean;
  collaboration?: string | null;
  // 位置情報
  storeLatitude?: number;
  storeLongitude?: number;
  userLatitude?: number;
  userLongitude?: number;
  // イベント情報用
  eventName?: string;
  eventStartDate?: string;
  eventEndDate?: string | null;
  eventPrice?: string | null;
  // 掲載期間
  expiryOption: string;
  customExpiryMinutes?: number | null;
  expiresAt: string;
}

export interface PostData {
  id: string;
  app_profile_id: string;
  store_id: string | null;
  store_name: string;
  category: string;
  content: string;
  image_urls: string | null;
  file_urls: string | null;
  url: string | null;
  created_at: string;
}

// =============================================================================
// プロフィール関連
// =============================================================================

/**
 * ユーザーIDからプロフィールIDを取得
 */
async function getProfileIdByUserId(userId: string): Promise<{ profileId: string | null; error: string | null }> {
  try {
    const { data, error } = await supabaseAnon
      .from('app_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return { profileId: null, error: 'プロフィール情報が見つかりません' };
    }

    return { profileId: data.id, error: null };
  } catch (error: any) {
    console.error('getProfileIdByUserId error:', error);
    return { profileId: null, error: error.message };
  }
}

// =============================================================================
// 投稿作成
// =============================================================================

/**
 * 新しい投稿を作成
 */
export async function createPost(input: CreatePostInput): Promise<{ postId: string | null; error: string | null }> {
  try {
    // プロフィールIDを取得
    const { profileId, error: profileError } = await getProfileIdByUserId(input.userId);
    if (profileError || !profileId) {
      return { postId: null, error: profileError || '投稿者のプロフィール情報が見つかりません' };
    }

    // 投稿データを準備
    const postData: any = {
      app_profile_id: profileId,
      store_id: input.storeId,
      store_name: input.storeName,
      category: input.category,
      content: input.content,
      image_urls: input.imageUrls.length > 0 ? JSON.stringify(input.imageUrls) : null,
      file_urls: input.fileUrls.length > 0 ? JSON.stringify(input.fileUrls) : null,
      url: input.url,
      is_deleted: false,
      phone_number: input.phoneNumber,
      prefecture: input.prefecture,
      city: input.city,
      author_role: input.authorRole,
      enable_checkin: input.enableCheckin,
      expiry_option: input.expiryOption,
      custom_expiry_minutes: input.customExpiryMinutes,
      expires_at: input.expiresAt,
    };

    // イベント情報の場合の追加フィールド
    if (input.category === 'イベント情報') {
      postData.event_name = input.eventName;
      postData.event_start_date = input.eventStartDate;
      postData.event_end_date = input.eventEndDate;
      postData.event_price = input.eventPrice;
    }

    // コラボフィールド
    if (input.collaboration) {
      postData.collaboration = input.collaboration;
    }

    // 店舗の位置情報
    if (input.storeLatitude !== undefined && input.storeLongitude !== undefined) {
      postData.store_latitude = input.storeLatitude;
      postData.store_longitude = input.storeLongitude;
      postData.location_geom = `POINT(${input.storeLongitude} ${input.storeLatitude})`;
    }

    // ユーザーの位置情報
    if (input.userLatitude !== undefined && input.userLongitude !== undefined) {
      postData.user_latitude = input.userLatitude;
      postData.user_longitude = input.userLongitude;
      postData.user_location_geom = `POINT(${input.userLongitude} ${input.userLatitude})`;
    }

    // 投稿を作成
    const { data, error } = await supabaseAnon
      .from('posts')
      .insert(postData)
      .select('id')
      .single();

    if (error || !data) {
      return { postId: null, error: `投稿の保存に失敗しました: ${error?.message}` };
    }

    return { postId: data.id, error: null };
  } catch (error: any) {
    console.error('createPost error:', error);
    return { postId: null, error: error.message || '投稿処理中にエラーが発生しました' };
  }
}

// =============================================================================
// 投稿取得
// =============================================================================

/**
 * 投稿を1件取得
 */
export async function getPostById(postId: string): Promise<{ post: PostData | null; error: string | null }> {
  try {
    const { data, error } = await supabaseAnon
      .from('posts')
      .select('*')
      .eq('id', postId)
      .eq('is_deleted', false)
      .single();

    if (error || !data) {
      return { post: null, error: '投稿が見つかりません' };
    }

    return { post: data as PostData, error: null };
  } catch (error: any) {
    console.error('getPostById error:', error);
    return { post: null, error: error.message };
  }
}

/**
 * カテゴリー別の投稿一覧を取得
 */
export async function getPostsByCategory(
  category: PostCategory,
  limit?: number
): Promise<{ posts: PostData[]; error: string | null }> {
  try {
    let query = supabaseAnon
      .from('posts')
      .select('*')
      .eq('category', category)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      return { posts: [], error: error.message };
    }

    return { posts: (data || []) as PostData[], error: null };
  } catch (error: any) {
    console.error('getPostsByCategory error:', error);
    return { posts: [], error: error.message };
  }
}

// =============================================================================
// 投稿削除
// =============================================================================

/**
 * 投稿を削除
 */
export async function deletePost(
  postId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // プロフィールIDを取得
    const { profileId, error: profileError } = await getProfileIdByUserId(userId);
    if (profileError || !profileId) {
      return { success: false, error: profileError };
    }

    // 投稿を論理削除
    const { error } = await supabaseAnon
      .from('posts')
      .update({ is_deleted: true })
      .eq('id', postId)
      .eq('app_profile_id', profileId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('deletePost error:', error);
    return { success: false, error: error.message };
  }
}
