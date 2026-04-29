'use client';

import { useSupabaseSession } from '@/lib/hooks/use-supabase-session';

export default function SupabaseAuthSync() {
  useSupabaseSession();
  return null;
}
