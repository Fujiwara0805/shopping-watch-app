"use server";

import { supabaseServer } from '@/lib/supabase-server';
import type { FacilityReportWithAuthor } from '@/types/facility-report';

export interface CreateFacilityReportInput {
  userId?: string | null;
  reporterId?: string | null;
  facilityType: string;
  storeName: string;
  description?: string;
  storeLatitude: number;
  storeLongitude: number;
  imageUrls?: string[];
}

/**
 * ユーザーIDからプロフィールIDを取得
 */
async function getProfileIdByUserId(userId: string): Promise<string | null> {
  const { data } = await supabaseServer
    .from('app_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();
  return data?.id ?? null;
}

/**
 * ゲスト用プロフィールIDを取得（なければ作成）
 */
export async function getGuestProfileId(): Promise<string | null> {
  const { data: existing } = await supabaseServer
    .from('app_profiles')
    .select('id')
    .is('user_id', null)
    .eq('display_name', 'ゲスト')
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created } = await supabaseServer
    .from('app_profiles')
    .insert({ user_id: null, display_name: 'ゲスト', data_consent: true })
    .select('id')
    .single();

  return created?.id ?? null;
}

/**
 * 施設報告を作成（ゴミ箱など）
 */
export async function createFacilityReport(
  input: CreateFacilityReportInput
): Promise<{ reportId: string | null; error: string | null }> {
  try {
    let profileId: string | null = null;

    if (input.userId) {
      profileId = await getProfileIdByUserId(input.userId);
    }
    if (!profileId) {
      profileId = await getGuestProfileId();
    }

    const { data, error } = await supabaseServer
      .from('facility_reports')
      .insert({
        facility_type: input.facilityType,
        store_name: input.storeName,
        description: input.description || null,
        store_latitude: input.storeLatitude,
        store_longitude: input.storeLongitude,
        image_urls: input.imageUrls && input.imageUrls.length > 0 ? input.imageUrls : null,
        app_profile_id: profileId,
        reporter_id: input.reporterId || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[FacilityReports] createFacilityReport error:', error.message);
      return { reportId: null, error: '施設報告の作成に失敗しました。' };
    }

    return { reportId: data.id, error: null };
  } catch (err: any) {
    console.error('[FacilityReports] unexpected error:', err);
    return { reportId: null, error: err.message || '予期しないエラーが発生しました。' };
  }
}

/**
 * 施設報告を取得（タイプでフィルタ可能）
 */
export async function getFacilityReports(
  facilityType?: string
): Promise<{ reports: FacilityReportWithAuthor[]; error: string | null }> {
  try {
    let query = supabaseServer
      .from('facility_reports')
      .select('*, app_profiles(display_name), reporters(nickname)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (facilityType) {
      query = query.eq('facility_type', facilityType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[FacilityReports] getFacilityReports error:', error.message);
      return { reports: [], error: '施設報告の取得に失敗しました。' };
    }

    const reports: FacilityReportWithAuthor[] = (data ?? []).map((r: any) => ({
      ...r,
      author_name: r.app_profiles?.display_name || 'ゲスト',
      reporter_nickname: r.reporters?.nickname || null,
    }));

    return { reports, error: null };
  } catch (err: any) {
    console.error('[FacilityReports] unexpected error:', err);
    return { reports: [], error: err.message || '予期しないエラーが発生しました。' };
  }
}
