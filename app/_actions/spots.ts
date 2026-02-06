"use server";

import { supabaseAnon } from '@/lib/supabase-server';
import { getProfileIdByUserId } from './maps';
import type { Spot, SpotWithAuthor } from '@/types/spot';

// =============================================================================
// 型定義
// =============================================================================

export interface CreateSpotInput {
  /** 未ログインの場合は null / 未指定 */
  userId?: string | null;
  /** リポーター登録済みの場合 */
  reporterId?: string | null;
  storeName: string;
  description: string;
  storeLatitude: number;
  storeLongitude: number;
  storeId: string | null;
  imageUrls: string[];
  url: string | null;
  city: string | null;
  prefecture: string;
  targetTags?: string[];
  /** 対象者タグごとのアクティビティ要素 { tagId: [activityId, ...] } */
  tagActivities?: Record<string, string[]>;
}

/**
 * ゲスト（未ログイン）用のプロフィールIDを取得
 * app_profiles に display_name = 'ゲスト' の1件があることを想定
 */
async function getGuestProfileId(): Promise<{ profileId: string | null; error: string | null }> {
  try {
    const { data, error } = await supabaseAnon
      .from('app_profiles')
      .select('id')
      .eq('display_name', 'ゲスト')
      .limit(1)
      .maybeSingle();

    if (error || !data?.id) {
      return { profileId: null, error: 'ゲスト用プロフィールが見つかりません。ログインするか、管理者に問い合わせてください。' };
    }
    return { profileId: data.id, error: null };
  } catch (err: any) {
    return { profileId: null, error: err?.message || 'ゲストプロフィールの取得に失敗しました' };
  }
}

// =============================================================================
// スポット作成
// =============================================================================

export async function createSpot(
  input: CreateSpotInput
): Promise<{ spotId: string | null; error: string | null }> {
  try {
    let profileId: string | null = null;
    let profileError: string | null = null;

    if (input.userId) {
      const result = await getProfileIdByUserId(input.userId);
      profileId = result.profileId;
      profileError = result.error;
    } else {
      const result = await getGuestProfileId();
      profileId = result.profileId;
      profileError = result.error;
    }

    if (profileError || !profileId) {
      return { spotId: null, error: profileError || 'プロフィール情報が見つかりません' };
    }

    const insertData: any = {
        app_profile_id: profileId,
        store_name: input.storeName,
        description: input.description,
        store_latitude: input.storeLatitude,
        store_longitude: input.storeLongitude,
        store_id: input.storeId,
        image_urls: input.imageUrls,
        url: input.url,
        city: input.city,
        prefecture: input.prefecture,
    };

    if (input.targetTags && input.targetTags.length > 0) {
      insertData.target_tags = JSON.stringify(input.targetTags);
    }

    if (input.tagActivities && Object.keys(input.tagActivities).length > 0) {
      insertData.tag_activities = JSON.stringify(input.tagActivities);
    }

    if (input.reporterId) {
      insertData.reporter_id = input.reporterId;
    }

    const { data, error } = await supabaseAnon
      .from('spots')
      .insert(insertData)
      .select('id')
      .single();

    if (error || !data) {
      return { spotId: null, error: `スポットの登録に失敗しました: ${error?.message}` };
    }

    return { spotId: data.id, error: null };
  } catch (error: any) {
    console.error('createSpot error:', error);
    return { spotId: null, error: error.message || 'スポット登録中にエラーが発生しました' };
  }
}

// =============================================================================
// スポット取得
// =============================================================================

export async function getPublicSpots(
  limit?: number
): Promise<{ spots: SpotWithAuthor[]; error: string | null }> {
  try {
    let query = supabaseAnon
      .from('spots')
      .select(`
        *,
        app_profiles (
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      return { spots: [], error: error.message };
    }

    const spotsWithAuthor: SpotWithAuthor[] = (data || []).map((spot: any) => {
      const profile = spot.app_profiles as { id: string; display_name: string | null; avatar_url: string | null } | null;
      return {
        id: spot.id,
        app_profile_id: spot.app_profile_id,
        store_name: spot.store_name,
        description: spot.description,
        store_latitude: spot.store_latitude,
        store_longitude: spot.store_longitude,
        store_id: spot.store_id,
        image_urls: spot.image_urls || [],
        url: spot.url,
        city: spot.city,
        prefecture: spot.prefecture,
        is_deleted: spot.is_deleted,
        created_at: spot.created_at,
        updated_at: spot.updated_at,
        tag_activities: spot.tag_activities ?? null,
        reporter_id: spot.reporter_id ?? null,
        author_name: profile?.display_name || '匿名ユーザー',
        author_avatar_path: profile?.avatar_url || null,
      };
    });

    return { spots: spotsWithAuthor, error: null };
  } catch (error: any) {
    console.error('getPublicSpots error:', error);
    return { spots: [], error: error.message };
  }
}

export async function getSpotById(
  spotId: string
): Promise<{ spot: SpotWithAuthor | null; error: string | null }> {
  try {
    const { data, error } = await supabaseAnon
      .from('spots')
      .select(`
        *,
        app_profiles (
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('id', spotId)
      .eq('is_deleted', false)
      .single();

    if (error || !data) {
      return { spot: null, error: 'スポットが見つかりません' };
    }

    const profile = data.app_profiles as { id: string; display_name: string | null; avatar_url: string | null } | null;

    return {
      spot: {
        ...data,
        image_urls: data.image_urls || [],
        author_name: profile?.display_name || '匿名ユーザー',
        author_avatar_path: profile?.avatar_url || null,
      } as SpotWithAuthor,
      error: null,
    };
  } catch (error: any) {
    console.error('getSpotById error:', error);
    return { spot: null, error: error.message };
  }
}

export async function getSpotsByUserId(
  userId: string
): Promise<{ spots: Spot[]; error: string | null }> {
  try {
    const { profileId, error: profileError } = await getProfileIdByUserId(userId);
    if (profileError || !profileId) {
      return { spots: [], error: profileError };
    }

    const { data, error } = await supabaseAnon
      .from('spots')
      .select('*')
      .eq('app_profile_id', profileId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      return { spots: [], error: error.message };
    }

    return { spots: (data || []) as Spot[], error: null };
  } catch (error: any) {
    console.error('getSpotsByUserId error:', error);
    return { spots: [], error: error.message };
  }
}
