"use server";

import { supabaseAnon } from '@/lib/supabase-server';

// =============================================================================
// 型定義
// =============================================================================

export interface LocationData {
  order: number;
  store_id: string | null;
  store_name: string;
  store_latitude?: number;
  store_longitude?: number;
  content: string;
  image_urls: string[];
  url: string | null;
  // 新規追加項目
  stay_duration?: number; // 滞在予定時間（分）
  recommended_transport?: string; // 推奨移動手段
  transport_details?: string | null; // 詳細な移動手段情報（JSON文字列）
}

export interface CreateMapInput {
  userId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  locations: LocationData[];
  hashtags: string[] | null;
  expiresAt: string;
  expiryOption: string;
  publicationStartDate: string;
  publicationEndDate: string | null;
  authorRole: 'admin' | 'user';
  isPublic: boolean;
}

export interface UpdateMapInput {
  mapId: string;
  userId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  locations: LocationData[];
  hashtags: string[] | null;
  expiresAt: string;
  expiryOption: string;
  publicationStartDate: string;
  publicationEndDate: string | null;
  isPublic: boolean;
}

export interface MapData {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  locations: LocationData[];
  hashtags: string[] | null;
  expires_at: string | null;
  expiry_option: string;
  publication_start_date: string;
  publication_end_date: string | null;
  is_public: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// プロフィール関連
// =============================================================================

/**
 * ユーザーIDからプロフィールIDを取得
 */
export async function getProfileIdByUserId(userId: string): Promise<{ profileId: string | null; error: string | null }> {
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
// 画像アップロード
// =============================================================================

/**
 * 画像をSupabase Storageにアップロード
 */
export async function uploadImage(
  userId: string,
  fileBuffer: ArrayBuffer,
  fileName: string,
  contentType: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const fileExt = fileName.split('.').pop();
    const uniqueFileName = `${crypto.randomUUID()}.${fileExt}`;
    const objectPath = `${userId}/${uniqueFileName}`;

    const { error: uploadError } = await supabaseAnon.storage
      .from('images')
      .upload(objectPath, fileBuffer, {
        cacheControl: '3600',
        upsert: true,
        contentType,
      });

    if (uploadError) {
      return { url: null, error: `画像のアップロードに失敗しました: ${uploadError.message}` };
    }

    const { data: publicUrlData } = supabaseAnon.storage
      .from('images')
      .getPublicUrl(objectPath);

    return { url: publicUrlData?.publicUrl || null, error: null };
  } catch (error: any) {
    console.error('uploadImage error:', error);
    return { url: null, error: error.message };
  }
}

/**
 * 複数画像をアップロード
 */
export async function uploadImages(
  userId: string,
  files: { buffer: ArrayBuffer; name: string; type: string }[]
): Promise<{ urls: string[]; error: string | null }> {
  const urls: string[] = [];

  for (const file of files) {
    const result = await uploadImage(userId, file.buffer, file.name, file.type);
    if (result.error) {
      return { urls: [], error: result.error };
    }
    if (result.url) {
      urls.push(result.url);
    }
  }

  return { urls, error: null };
}

// =============================================================================
// マップ作成
// =============================================================================

/**
 * 新しいマップを作成
 */
export async function createMap(input: CreateMapInput): Promise<{ mapId: string | null; error: string | null }> {
  try {
    // プロフィールIDを取得
    const { profileId, error: profileError } = await getProfileIdByUserId(input.userId);
    if (profileError || !profileId) {
      return { mapId: null, error: profileError || '投稿者のプロフィール情報が見つかりません' };
    }

    // マップを作成
    const { data, error } = await supabaseAnon
      .from('maps')
      .insert({
        title: input.title,
        description: input.description,
        thumbnail_url: input.thumbnailUrl,
        app_profile_id: profileId,
        locations: input.locations,
        hashtags: input.hashtags,
        expires_at: input.expiresAt,
        expiry_option: input.expiryOption,
        publication_start_date: input.publicationStartDate,
        publication_end_date: input.publicationEndDate,
        author_role: input.authorRole,
        is_public: input.isPublic,
      })
      .select('id')
      .single();

    if (error || !data) {
      return { mapId: null, error: `マップの作成に失敗しました: ${error?.message}` };
    }

    return { mapId: data.id, error: null };
  } catch (error: any) {
    console.error('createMap error:', error);
    return { mapId: null, error: error.message || 'マップ作成中にエラーが発生しました' };
  }
}

// =============================================================================
// マップ更新
// =============================================================================

/**
 * マップを更新
 */
export async function updateMap(input: UpdateMapInput): Promise<{ success: boolean; error: string | null }> {
  try {
    // プロフィールIDを取得して所有権を確認
    const { profileId, error: profileError } = await getProfileIdByUserId(input.userId);
    if (profileError || !profileId) {
      return { success: false, error: profileError || '投稿者のプロフィール情報が見つかりません' };
    }

    // マップを更新
    const { error } = await supabaseAnon
      .from('maps')
      .update({
        title: input.title,
        description: input.description,
        thumbnail_url: input.thumbnailUrl,
        locations: input.locations,
        hashtags: input.hashtags,
        expires_at: input.expiresAt,
        expiry_option: input.expiryOption,
        publication_start_date: input.publicationStartDate,
        publication_end_date: input.publicationEndDate,
        is_public: input.isPublic,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.mapId)
      .eq('app_profile_id', profileId); // 所有権チェック

    if (error) {
      return { success: false, error: `マップの更新に失敗しました: ${error.message}` };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('updateMap error:', error);
    return { success: false, error: error.message || 'マップ更新中にエラーが発生しました' };
  }
}

// =============================================================================
// マップ取得
// =============================================================================

/**
 * マップを1件取得
 */
export async function getMapById(mapId: string): Promise<{ map: MapData | null; error: string | null }> {
  try {
    const { data, error } = await supabaseAnon
      .from('maps')
      .select('*')
      .eq('id', mapId)
      .eq('is_deleted', false)
      .single();

    if (error || !data) {
      return { map: null, error: 'マップが見つかりません' };
    }

    return { map: data as MapData, error: null };
  } catch (error: any) {
    console.error('getMapById error:', error);
    return { map: null, error: error.message };
  }
}

/**
 * ユーザーのマップ一覧を取得（計算フィールド付き）
 */
export interface CourseListItem {
  id: string;
  title: string;
  total_locations: number;
  cover_image_url: string | null;
  created_at: string;
  expires_at: string | null;
  hashtags: string[] | null;
}

export async function getMapsByUserId(userId: string): Promise<{ maps: CourseListItem[]; error: string | null }> {
  try {
    // プロフィールIDを取得
    const { profileId, error: profileError } = await getProfileIdByUserId(userId);
    if (profileError || !profileId) {
      return { maps: [], error: profileError };
    }

    const { data, error } = await supabaseAnon
      .from('maps')
      .select('id, title, locations, created_at, expires_at, hashtags, thumbnail_url')
      .eq('app_profile_id', profileId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      return { maps: [], error: error.message };
    }

    // 計算フィールドを追加
    const mapsWithCalculated = (data || []).map((map: any) => {
      const locations = map.locations || [];
      const totalLocations = locations.length;

      // thumbnail_urlを優先、なければ最初のロケーションの画像を使用
      let coverImageUrl = map.thumbnail_url || null;
      if (!coverImageUrl && locations.length > 0 && locations[0].image_urls?.length > 0) {
        coverImageUrl = locations[0].image_urls[0];
      }

      return {
        id: map.id,
        title: map.title,
        total_locations: totalLocations,
        cover_image_url: coverImageUrl,
        created_at: map.created_at,
        expires_at: map.expires_at,
        hashtags: map.hashtags,
      };
    });

    return { maps: mapsWithCalculated, error: null };
  } catch (error: any) {
    console.error('getMapsByUserId error:', error);
    return { maps: [], error: error.message };
  }
}

/**
 * 編集用にマップを取得（所有権確認付き）
 */
export async function getMapForEdit(
  mapId: string,
  userId: string
): Promise<{ map: MapData | null; error: string | null }> {
  try {
    // プロフィールIDを取得
    const { profileId, error: profileError } = await getProfileIdByUserId(userId);
    if (profileError || !profileId) {
      return { map: null, error: profileError };
    }

    const { data, error } = await supabaseAnon
      .from('maps')
      .select('*')
      .eq('id', mapId)
      .eq('app_profile_id', profileId)
      .eq('is_deleted', false)
      .single();

    if (error || !data) {
      return { map: null, error: 'マップが見つかりません' };
    }

    return { map: data as MapData, error: null };
  } catch (error: any) {
    console.error('getMapForEdit error:', error);
    return { map: null, error: error.message };
  }
}

/**
 * 公開マップ一覧を取得（掲載終了日を過ぎたものは表示しない）
 */
export async function getPublicMaps(limit?: number): Promise<{ maps: any[]; error: string | null }> {
  try {
    const nowIso = new Date().toISOString();
    let query = supabaseAnon
      .from('maps')
      .select(`
        id, 
        title, 
        locations, 
        created_at, 
        hashtags,
        app_profile_id,
        thumbnail_url,
        publication_end_date,
        app_profiles (
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('is_deleted', false)
      .eq('is_public', true)
      .or(`publication_end_date.is.null,publication_end_date.gte.${nowIso}`)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      return { maps: [], error: error.message };
    }

    // データを整形
    const mapsWithMetadata = (data || []).map((map: any) => {
      const locations = Array.isArray(map.locations) ? map.locations : [];
      const totalLocations = locations.length;

      // thumbnail_urlを優先、なければ最初のロケーションの画像を使用
      let coverImageUrl = map.thumbnail_url || null;
      if (!coverImageUrl) {
        for (const location of locations) {
          if (location.image_urls && Array.isArray(location.image_urls) && location.image_urls.length > 0) {
            coverImageUrl = location.image_urls[0];
            break;
          }
        }
      }

      const profile = map.app_profiles as { id: string; display_name: string | null; avatar_url: string | null } | null;

      return {
        id: map.id,
        title: map.title,
        locations: locations,
        created_at: map.created_at,
        hashtags: map.hashtags,
        app_profile_id: map.app_profile_id,
        cover_image_url: coverImageUrl,
        total_locations: totalLocations,
        author_name: profile?.display_name || '匿名ユーザー',
        author_avatar_path: profile?.avatar_url || null,
      };
    });

    return { maps: mapsWithMetadata, error: null };
  } catch (error: any) {
    console.error('getPublicMaps error:', error);
    return { maps: [], error: error.message };
  }
}

// =============================================================================
// マップ削除
// =============================================================================

/**
 * マップを削除（物理削除 + 画像削除）
 */
export async function deleteMap(
  mapId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // プロフィールIDを取得
    const { profileId, error: profileError } = await getProfileIdByUserId(userId);
    if (profileError || !profileId) {
      return { success: false, error: profileError };
    }

    // マップデータを取得（画像URLを取得するため）
    const { data: mapData, error: fetchError } = await supabaseAnon
      .from('maps')
      .select('locations, thumbnail_url')
      .eq('id', mapId)
      .eq('app_profile_id', profileId)
      .single();

    if (fetchError || !mapData) {
      return { success: false, error: 'マップが見つかりません' };
    }

    // 画像を削除
    const imagesToDelete: string[] = [];

    // サムネイル画像
    if (mapData.thumbnail_url) {
      const match = mapData.thumbnail_url.match(/\/images\/(.+)$/);
      if (match && match[1]) {
        imagesToDelete.push(match[1]);
      }
    }

    // ロケーションの画像
    if (mapData.locations && Array.isArray(mapData.locations)) {
      for (const location of mapData.locations) {
        if (location.image_urls && Array.isArray(location.image_urls)) {
          for (const imageUrl of location.image_urls) {
            const match = imageUrl.match(/\/images\/(.+)$/);
            if (match && match[1]) {
              imagesToDelete.push(match[1]);
            }
          }
        }
      }
    }

    // 画像を一括削除
    if (imagesToDelete.length > 0) {
      const { error: deleteImageError } = await supabaseAnon.storage
        .from('images')
        .remove(imagesToDelete);

      if (deleteImageError) {
        console.error('画像削除エラー:', deleteImageError);
      }
    }

    // マップを物理削除
    const { error: deleteError } = await supabaseAnon
      .from('maps')
      .delete()
      .eq('id', mapId)
      .eq('app_profile_id', profileId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('deleteMap error:', error);
    return { success: false, error: error.message };
  }
}
