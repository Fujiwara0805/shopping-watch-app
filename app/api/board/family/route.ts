import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 家族グループの投稿一覧を取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    // ユーザーが参加しているグループを取得
    const { data: userGroups, error: groupsError } = await supabase
      .from('family_group_members')
      .select(`
        group_id,
        role,
        family_groups (
          id,
          name,
          owner_id,
          created_at
        )
      `)
      .eq('user_id', session.user.id);

    if (groupsError) {
      console.error('Groups fetch error:', groupsError);
      throw groupsError;
    }

    if (!userGroups || userGroups.length === 0) {
      return NextResponse.json({ 
        group: null,
        posts: [],
        rankings: [],
        message: 'グループに参加していません' 
      });
    }

    // 最初のグループを使用（将来的に複数グループ対応可能）
    const currentGroup = userGroups[0];
    const groupId = currentGroup.group_id;

    // グループの全メンバーを取得
    const { data: groupMembers, error: membersError } = await supabase
      .from('family_group_members')
      .select(`
        user_id,
        role,
        joined_at,
        app_profiles (
          display_name,
          avatar_url
        )
      `)
      .eq('group_id', groupId);

    if (membersError) {
      console.error('Members fetch error:', membersError);
    }

    // グループの投稿一覧を取得
    const { data: posts, error: postsError } = await supabase
      .from('location_board_posts')
      .select(`
        id,
        product_name,
        memo,
        created_at,
        expires_at,
        user_id
      `)
      .eq('group_id', groupId)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('Posts fetch error:', postsError);
      throw postsError;
    }

    // 投稿者のプロフィール情報を取得
    const userIds = Array.from(new Set((posts || []).map(post => post.user_id)));
    const { data: profiles, error: profilesError } = await supabase
      .from('app_profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', userIds);

    if (profilesError) {
      console.error('Profiles fetch error:', profilesError);
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

    // 投稿データにユーザー情報を追加
    const postsWithUsers = (posts || []).map(post => ({
      ...post,
      user: profileMap.get(post.user_id) || {
        nickname: '匿名ユーザー',
        profile_image_url: null
      }
    }));

    // 商品ランキングを生成
    const productCounts = new Map<string, number>();
    postsWithUsers.forEach(post => {
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

    // グループ情報を整形
    const groupInfo = {
      ...currentGroup.family_groups,
      userRole: currentGroup.role,
      members: groupMembers || []
    };

    return NextResponse.json({ 
      group: groupInfo,
      posts: postsWithUsers,
      rankings: rankings,
      total: postsWithUsers.length 
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// POST: 家族グループに新しい投稿を作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { product_name, memo } = body;

    // バリデーション
    if (!product_name || product_name.length > 50) {
      return NextResponse.json({ error: '商品名は1文字以上50文字以下で入力してください' }, { status: 400 });
    }

    if (memo && memo.length > 100) {
      return NextResponse.json({ error: 'メモは100文字以下で入力してください' }, { status: 400 });
    }

    // ユーザーが参加しているグループを取得
    const { data: userGroup, error: groupError } = await supabase
      .from('family_group_members')
      .select('group_id, role')
      .eq('user_id', session.user.id)
      .single();

    if (groupError || !userGroup) {
      return NextResponse.json({ error: 'グループに参加していません' }, { status: 403 });
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
          group_id: userGroup.group_id,
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
      .select('user_id, group_id')
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
