'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabaseClient';

export function useSupabaseSession() {
  const { data: session } = useSession();

  useEffect(() => {
    const token = (session as any)?.supabaseAccessToken;
    if (!token) return;
    supabase.auth.setSession({
      access_token: token,
      refresh_token: '',
    });
  }, [session]);

  return supabase;
}
