// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Hello from Functions!")

// LINE Messaging APIクライアント
class LineMessagingAPI {
  private channelAccessToken: string;

  constructor(channelAccessToken: string) {
    this.channelAccessToken = channelAccessToken;
  }

  async sendPushMessage(to: string, message: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.channelAccessToken}`,
        },
        body: JSON.stringify({
          to: to,
          messages: [
            {
              type: 'text',
              text: message
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('LINE API Error:', response.status, errorText);
        return false;
      }

      console.log('LINE message sent successfully to:', to);
      return true;
    } catch (error) {
      console.error('Error sending LINE message:', error);
      return false;
    }
  }
}

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
    let lineMessagesSent = 0; 
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

    // お気に入り店舗に登録しているユーザーを取得（投稿者は除外）
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('app_profiles')
      .select('id, user_id')
      .or(`favorite_store_1_id.eq.${storeId},favorite_store_2_id.eq.${storeId},favorite_store_3_id.eq.${storeId}`)
      .neq('id', postCreatorProfileId);

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

    // 対象ユーザーのLINE IDを取得（修正：line_id カラムを使用）
    const userIds = profiles.map(p => p.user_id);
    const { data: appUsers, error: appUsersError } = await supabaseAdmin
      .from('app_users')
      .select('id, line_id')
      .in('id', userIds);

    if (appUsersError) {
      console.error('Error fetching app_users:', appUsersError.message);
      throw appUsersError;
    }

    // プロファイルとLINE IDをマッピング
    const profilesWithLineId = profiles.map(profile => {
      const appUser = appUsers?.find(u => u.id === profile.user_id);
      return {
        ...profile,
        line_id: appUser?.line_id || null
      };
    });

    console.log('Profiles with LINE IDs:', profilesWithLineId.map(p => ({ 
      profileId: p.id, 
      userId: p.user_id, 
      lineId: p.line_id ? 'present' : 'null' 
    })));

    // アプリ内通知の作成
    const notificationsToInsert = profilesWithLineId.map(profile => ({
      user_id: profile.id,
      type: 'favorite_store_post',
      message: `${storeName}の新しい情報が投稿されました！`,
      reference_post_id: postId,
      reference_store_id: storeId,
      reference_store_name: storeName,
    }));

    const { error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert(notificationsToInsert);

    if (insertError) {
      console.error('Error inserting notifications:', insertError.message);
      throw insertError;
    }

    // LINE通知の送信（修正：line_id を使用）
    const lineChannelAccessToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN');
    if (lineChannelAccessToken) {
      console.log('LINE_CHANNEL_ACCESS_TOKEN is configured. Attempting to send LINE messages...');
      const lineAPI = new LineMessagingAPI(lineChannelAccessToken);
      
      for (const profile of profilesWithLineId) {
        if (profile.line_id) {
          console.log(`Attempting to send LINE message to user_id: ${profile.user_id}, line_id: ${profile.line_id}`);
          const success = await lineAPI.sendPushMessage(
            profile.line_id,
            `🛍️ ${storeName}の新しい情報が投稿されました！\n\nアプリで詳細をチェックしてみてください。`
          );
          if (success) {
            lineMessagesSent++;
            console.log(`LINE message sent successfully to user: ${profile.user_id}`);
          } else {
            console.error(`Failed to send LINE message to user: ${profile.user_id}`);
          }
        } else {
          console.log(`User ${profile.user_id} does not have a LINE ID. Skipping LINE notification.`);
        }
      }
      
      console.log(`Successfully sent ${lineMessagesSent} LINE messages out of ${profilesWithLineId.length} users.`);
    } else {
      console.log('LINE_CHANNEL_ACCESS_TOKEN not configured. Skipping LINE notifications.');
    }

    console.log(`Successfully created ${notificationsToInsert.length} notifications for store ${storeId}, post ${postId}.`);
    return new Response(
      JSON.stringify({ 
        message: `Successfully created ${notificationsToInsert.length} notifications.`,
        lineMessagesSent: lineMessagesSent,
        totalUsers: profilesWithLineId.length,
        usersWithLineId: profilesWithLineId.filter(p => p.line_id).length
      }),
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
    --data '{"postId":"test-id","storeId":"test-store","storeName":"テストストア","postCreatorProfileId":"test-profile"}'

*/