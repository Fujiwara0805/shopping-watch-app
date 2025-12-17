import { createClient } from '@supabase/supabase-js';

/**
 * サーバーサイド用のSupabaseクライアント
 * Server ActionsやRoute Handlersで使用
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing environment variable NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseServiceKey) {
  throw new Error("Missing environment variable for Supabase key");
}

// サーバーサイド用クライアント
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey!);

// Anon key用クライアント（RLSポリシー適用）
export const supabaseAnon = createClient(
  supabaseUrl, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
