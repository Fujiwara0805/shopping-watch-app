'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabaseClient';

export function useSupabaseSession() {
  const { data: session } = useSession();

  useEffect(() => {
    const token = (session as any)?.supabaseAccessToken;
    if (!token) return;
    // supabase-js v2 の setSession は refresh_token が空だと AuthSessionMissingError になり、
    // 以降の supabase クライアント呼び出し（投稿時の Storage アップロードなど）が "Failed to fetch"
    // で連鎖失敗する場合がある。安全に呼び出すため、エラーは握り潰して通常の投稿フローを止めない。
    void supabase.auth
      .setSession({
        access_token: token,
        refresh_token: '',
      })
      .catch(() => {
        /* meetup 機能未利用時は支障なし */
      });
  }, [session]);

  return supabase;
}
