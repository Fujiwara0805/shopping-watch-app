"use server";

import { supabaseServer } from '@/lib/supabase-server';

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
