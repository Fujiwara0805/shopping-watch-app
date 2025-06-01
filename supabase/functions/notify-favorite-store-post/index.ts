// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Hello from Functions!")

// Supabaseクライアントを初期化するためのヘルパー関数
const getSupabaseAdmin = (): SupabaseClient => {
  const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in environment variables.');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

serve(async (req: Request) => {
  // CORSヘッダーの設定 (必要に応じてオリジンを制限)
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // 本番環境では特定のオリジンに制限してください
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // OPTIONSリクエストへの対応 (プリフライトリクエスト用)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Function called with method:', req.method);
    const body = await req.json();
    console.log('Request body:', body);

    const {
      postId,       // 新しい投稿のID (posts.id)
      storeId,      // 投稿された店舗のID (posts.store_id)
      storeName,    // 投稿された店舗の名前 (posts.store_name)
      postCreatorProfileId // 投稿を作成したユーザーのapp_profile_id (posts.app_profile_id に相当)
    } = body;

    if (!postId || !storeId || !storeName || !postCreatorProfileId) {
      console.error('Missing required fields in request body.');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: postId, storeId, storeName, postCreatorProfileId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 該当のstoreIdをお気に入り登録しており、かつ投稿者自身ではないユーザープロファイルを取得
    // app_profiles の id はプロファイル自体のID、user_id は auth.users.id を指すと想定
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('app_profiles')
      .select('id, user_id') // user_id は auth.users.id を参照
      .or(`favorite_store_1_id.eq.${storeId},favorite_store_2_id.eq.${storeId},favorite_store_3_id.eq.${storeId}`)
      .not('id', 'eq', postCreatorProfileId); // 投稿者自身のプロファイルIDは除外

    if (profileError) {
      console.error('Error fetching profiles:', profileError.message);
      throw profileError;
    }

    if (!profiles || profiles.length === 0) {
      console.log(`No users (excluding creator) have favorited store ${storeId}. No notifications to create.`);
      return new Response(
        JSON.stringify({ message: 'No users to notify (excluding creator).' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${profiles.length} users to notify for store ${storeId}.`);

    const notificationsToInsert = profiles.map(profile => ({
      user_id: profile.id, // notifications.user_id は app_profiles.id を参照
      type: 'favorite_store_post',
      message: `${storeName}の新しい情報が投稿されました！`, // 通知メッセージの変更
      reference_post_id: postId, // `reference_post_id` に変更
      reference_store_id: storeId,
      reference_store_name: storeName,
      // is_read はテーブルのデフォルトで false に設定
    }));

    const { error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert(notificationsToInsert);

    if (insertError) {
      console.error('Error inserting notifications:', insertError.message);
      throw insertError;
    }

    console.log(`Successfully created ${notificationsToInsert.length} notifications for store ${storeId}, post ${postId}.`);
    return new Response(
      JSON.stringify({ message: `Successfully created ${notificationsToInsert.length} notifications.` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
      errorMessage = (error as any).message;
    }
    console.error('Error in function execution:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/notify-favorite-store-post' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/