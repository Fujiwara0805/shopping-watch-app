import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 距離計算関数（ハーバーサイン公式）
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // 地球の半径（km）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// GET: 位置情報掲示板の投稿一覧取得（5km圏内）
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const latitude = parseFloat(searchParams.get('latitude') || '0');
    const longitude = parseFloat(searchParams.get('longitude') || '0');

    if (!latitude || !longitude) {
      return NextResponse.json({ error: '位置情報が必要です' }, { status: 400 });
    }

    // 投稿一覧を取得（5km圏内）
    const { data: posts, error: postsError } = await supabase
      .from('location_board_posts')
      .select(`
        id,
        product_name,
        memo,
        latitude,
        longitude,
        created_at,
        expires_at,
        user_id
      `)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('Database error:', postsError);
      throw postsError;
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({ posts: [], rankings: [] });
    }

    // ユーザー情報を取得
    const userIds = Array.from(new Set(posts.map(post => post.user_id)));
    const { data: profiles, error: profilesError } = await supabase
      .from('app_profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', userIds);

    if (profilesError) {
      console.error('Profile fetch error:', profilesError);
    }

    // プロフィール情報をマップに変換
    const profileMap = new Map(
      profiles?.map(profile => [
        profile.user_id,
        {
          nickname: profile.display_name || '匿名ユーザー',
          profile_image_url: profile.avatar_url 
            ? supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl
            : null
        }
      ]) || []
    );

    // 5km圏内の投稿をフィルタリングして距離情報を追加
    const nearbyPosts = posts
      .map(post => {
        const distance = calculateDistance(
          latitude,
          longitude,
          post.latitude,
          post.longitude
        );
        
        return {
          ...post,
          distance,
          user: profileMap.get(post.user_id) || {
            nickname: '匿名ユーザー',
            profile_image_url: null
          }
        };
      })
      .filter(post => post.distance <= 5)
      .sort((a, b) => a.distance - b.distance);

    // 商品ランキングを生成
    const productCounts = new Map<string, number>();
    nearbyPosts.forEach(post => {
      const count = productCounts.get(post.product_name) || 0;
      productCounts.set(post.product_name, count + 1);
    });

    const rankings = Array.from(productCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([product_name, count], index) => ({
        product_name,
        count,
        rank: index + 1
      }));

    return NextResponse.json({ 
      posts: nearbyPosts,
      rankings: rankings,
      total: nearbyPosts.length 
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// POST: 新しい投稿の作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { product_name, memo, latitude, longitude } = body;

    // バリデーション
    if (!product_name || product_name.length > 50) {
      return NextResponse.json({ error: '商品名は1文字以上50文字以下で入力してください' }, { status: 400 });
    }

    if (memo && memo.length > 100) {
      return NextResponse.json({ error: 'メモは100文字以下で入力してください' }, { status: 400 });
    }

    if (!latitude || !longitude) {
      return NextResponse.json({ error: '位置情報が必要です' }, { status: 400 });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: '無効な位置情報です' }, { status: 400 });
    }

    // 有効期限を5時間後に設定
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 5);

    // データベースに保存
    const { data: newPost, error: insertError } = await supabase
      .from('location_board_posts')
      .insert([
        {
          user_id: session.user.id,
          product_name,
          memo: memo || null,
          latitude,
          longitude,
          expires_at: expiresAt.toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Database error:', insertError);
      return NextResponse.json({ error: 'データベースエラー' }, { status: 500 });
    }

    // プロフィール情報を取得
    const { data: profile, error: profileError } = await supabase
      .from('app_profiles')
      .select('display_name, avatar_url')
      .eq('user_id', session.user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
    }

    // レスポンス用にデータを整形
    const formattedPost = {
      id: newPost.id,
      product_name: newPost.product_name,
      memo: newPost.memo,
      created_at: newPost.created_at,
      expires_at: newPost.expires_at,
      user: {
        nickname: profile?.display_name || 'ユーザー',
        profile_image_url: profile?.avatar_url 
          ? supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl
          : null
      }
    };

    return NextResponse.json({ 
      post: formattedPost,
      message: '投稿が作成されました' 
    }, { status: 201 });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// DELETE: 投稿の削除
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('id');

    if (!postId) {
      return NextResponse.json({ error: '投稿IDが必要です' }, { status: 400 });
    }

    // 投稿の所有者確認
    const { data: post, error: fetchError } = await supabase
      .from('location_board_posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (fetchError) {
      console.error('Post fetch error:', fetchError);
      return NextResponse.json({ error: '投稿が見つかりません' }, { status: 404 });
    }

    if (post.user_id !== session.user.id) {
      return NextResponse.json({ error: '削除権限がありません' }, { status: 403 });
    }

    // 投稿を削除
    const { error: deleteError } = await supabase
      .from('location_board_posts')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: 'データベースエラー' }, { status: 500 });
    }

    return NextResponse.json({ message: '投稿が削除されました' });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
