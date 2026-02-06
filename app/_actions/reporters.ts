"use server";

import { supabaseAnon } from '@/lib/supabase-server';
import type { Reporter } from '@/types/reporter';

/**
 * リポーター登録（ニックネーム + デバイストークン）
 * reporter_no はDBトリガーで自動採番される
 */
export async function registerReporter(
  nickname: string,
  deviceToken: string
): Promise<{ reporter: Reporter | null; error: string | null }> {
  try {
    const { data, error } = await supabaseAnon
      .from('reporters')
      .insert({
        nickname,
        device_token: deviceToken,
        reporter_no: 'TEMP', // トリガーで上書きされる
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        // unique constraint violation → 既にデバイス登録済み
        return { reporter: null, error: 'このデバイスは既にリポーター登録済みです' };
      }
      return { reporter: null, error: `リポーター登録に失敗しました: ${error.message}` };
    }

    return { reporter: data as Reporter, error: null };
  } catch (err: any) {
    console.error('registerReporter error:', err);
    return { reporter: null, error: err.message || 'リポーター登録中にエラーが発生しました' };
  }
}

/**
 * デバイストークンからリポーターを取得
 */
export async function getReporterByDeviceToken(
  deviceToken: string
): Promise<{ reporter: Reporter | null; error: string | null }> {
  try {
    const { data, error } = await supabaseAnon
      .from('reporters')
      .select('*')
      .eq('device_token', deviceToken)
      .maybeSingle();

    if (error) {
      return { reporter: null, error: error.message };
    }

    return { reporter: data as Reporter | null, error: null };
  } catch (err: any) {
    console.error('getReporterByDeviceToken error:', err);
    return { reporter: null, error: err.message };
  }
}

/**
 * IDからリポーターを取得
 */
export async function getReporterById(
  reporterId: string
): Promise<{ reporter: Reporter | null; error: string | null }> {
  try {
    const { data, error } = await supabaseAnon
      .from('reporters')
      .select('*')
      .eq('id', reporterId)
      .single();

    if (error) {
      return { reporter: null, error: error.message };
    }

    return { reporter: data as Reporter, error: null };
  } catch (err: any) {
    console.error('getReporterById error:', err);
    return { reporter: null, error: err.message };
  }
}
