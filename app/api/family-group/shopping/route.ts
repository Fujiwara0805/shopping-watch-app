import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 画像URLを生成するヘルパー関数
function getAvatarUrl(avatarPath: string | null): string | null {
  if (!avatarPath) return null;
  
  // 既に完全なURLの場合はそのまま返す
  if (avatarPath.startsWith('http')) {
    return avatarPath;
  }
  
  // Supabaseストレージの公開URLを生成
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(avatarPath);
  
  return data.publicUrl;
}

// GET: 家族グループの買い物メモ一覧を取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    console.log(`Fetching shopping items for user: ${session.user.id}`);
    
    // ユーザーが参加しているグループを取得
    const { data: userGroups, error: groupsError } = await supabase
      .from('family_group_members')
      .select(`
        group_id,
        role,
        family_groups (
          id,
          name,
          owner_id
        )
      `)
      .eq('user_id', session.user.id)
      .order('joined_at', { ascending: false });

    if (groupsError) {
      console.error('Groups fetch error:', groupsError);
      throw groupsError;
    }

    if (!userGroups || userGroups.length === 0) {
      return NextResponse.json({ 
        group: null,
        items: [],
        message: 'グループに参加していません' 
      });
    }

    // 最新に参加したグループを使用
    const currentGroup = userGroups[0];
    const groupId = currentGroup.group_id;

    // グループメンバー情報を取得
    const { data: members } = await supabase
      .from('family_group_members')
      .select('user_id, role, joined_at')
      .eq('group_id', groupId);

    const membersWithProfiles = await Promise.all(
      (members || []).map(async (member) => {
        const { data: profile } = await supabase
          .from('app_profiles')
          .select('display_name, avatar_url')
          .eq('user_id', member.user_id)
          .single();

        // 画像URLを正しく生成
        const avatarUrl = profile?.avatar_url ? getAvatarUrl(profile.avatar_url) : null;

        return {
          ...member,
          app_profiles: {
            display_name: profile?.display_name || null,
            avatar_url: avatarUrl
          }
        };
      })
    );

    // 買い物アイテムを取得
    const { data: items, error: itemsError } = await supabase
      .from('family_shopping_items')
      .select(`
        id,
        item_name,
        memo,
        quantity,
        priority,
        is_completed,
        completed_by,
        completed_at,
        created_at,
        user_id
      `)
      .eq('group_id', groupId)
      .order('is_completed', { ascending: true })
      .order('created_at', { ascending: false });

    if (itemsError) {
      console.error('Items fetch error:', itemsError);
      return NextResponse.json({ error: 'アイテムの取得に失敗しました' }, { status: 500 });
    }

    // アイテムにユーザー情報を追加
    const itemsWithUsers = await Promise.all(
      (items || []).map(async (item) => {
        const { data: creatorProfile } = await supabase
          .from('app_profiles')
          .select('display_name, avatar_url')
          .eq('user_id', item.user_id)
          .single();

        let completedByProfile = null;
        if (item.completed_by) {
          const { data: profile } = await supabase
            .from('app_profiles')
            .select('display_name, avatar_url')
            .eq('user_id', item.completed_by)
            .single();
          completedByProfile = profile;
        }

        // 画像URLを正しく生成
        const creatorAvatarUrl = creatorProfile?.avatar_url ? getAvatarUrl(creatorProfile.avatar_url) : null;
        const completedByAvatarUrl = completedByProfile?.avatar_url ? getAvatarUrl(completedByProfile.avatar_url) : null;

        return {
          ...item,
          creator: {
            display_name: creatorProfile?.display_name || '匿名ユーザー',
            avatar_url: creatorAvatarUrl
          },
          completed_by_profile: completedByProfile ? {
            display_name: completedByProfile.display_name || '匿名ユーザー',
            avatar_url: completedByAvatarUrl
          } : null
        };
      })
    );

    // グループ情報を整形
    const groupInfo = {
      ...currentGroup.family_groups,
      userRole: currentGroup.role,
      members: membersWithProfiles
    };

    return NextResponse.json({ 
      group: groupInfo,
      items: itemsWithUsers,
      total: itemsWithUsers.length,
      completed: itemsWithUsers.filter(item => item.is_completed).length,
      pending: itemsWithUsers.filter(item => !item.is_completed).length
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// POST: 新しい買い物アイテムを追加
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { item_name } = body;

    // バリデーション
    if (!item_name || item_name.length > 100) {
      return NextResponse.json({ error: 'アイテム名は1文字以上100文字以下で入力してください' }, { status: 400 });
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

    // データベースに保存
    const { data: newItem, error: insertError } = await supabase
      .from('family_shopping_items')
      .insert([
        {
          group_id: userGroup.group_id,
          user_id: session.user.id,
          item_name: item_name.trim(),
          quantity: 1,
          priority: 'normal',
          is_completed: false
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Database error:', insertError);
      return NextResponse.json({ error: 'データベースエラー' }, { status: 500 });
    }

    // 作成者のプロフィール情報を取得
    const { data: profile } = await supabase
      .from('app_profiles')
      .select('display_name, avatar_url')
      .eq('user_id', session.user.id)
      .single();

    // 画像URLを正しく生成
    const avatarUrl = profile?.avatar_url ? getAvatarUrl(profile.avatar_url) : null;

    // レスポンス用にデータを整形
    const formattedItem = {
      ...newItem,
      creator: {
        display_name: profile?.display_name || '匿名ユーザー',
        avatar_url: avatarUrl
      },
      completed_by_profile: null
    };

    return NextResponse.json({ 
      item: formattedItem,
      message: 'アイテムが追加されました' 
    }, { status: 201 });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// PUT: アイテムの完了状態を更新
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { item_id, is_completed } = body;

    if (!item_id) {
      return NextResponse.json({ error: 'アイテムIDが必要です' }, { status: 400 });
    }

    // アイテムの存在確認とグループメンバーシップ確認
    const { data: item, error: itemError } = await supabase
      .from('family_shopping_items')
      .select('id, group_id, is_completed')
      .eq('id', item_id)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: 'アイテムが見つかりません' }, { status: 404 });
    }

    // ユーザーがグループメンバーか確認
    const { data: membership, error: membershipError } = await supabase
      .from('family_group_members')
      .select('group_id')
      .eq('group_id', item.group_id)
      .eq('user_id', session.user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'このアイテムを更新する権限がありません' }, { status: 403 });
    }

    // 完了状態を更新
    const updateData: any = { is_completed };
    
    if (is_completed) {
      updateData.completed_by = session.user.id;
      updateData.completed_at = new Date().toISOString();
    } else {
      updateData.completed_by = null;
      updateData.completed_at = null;
    }

    const { error: updateError } = await supabase
      .from('family_shopping_items')
      .update(updateData)
      .eq('id', item_id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'データベースエラー' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: is_completed ? 'アイテムを完了しました' : 'アイテムを未完了に戻しました'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// DELETE: アイテムの削除
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('id');

    if (!itemId) {
      return NextResponse.json({ error: 'アイテムIDが必要です' }, { status: 400 });
    }

    // アイテムの所有者確認またはグループメンバー確認
    const { data: item, error: fetchError } = await supabase
      .from('family_shopping_items')
      .select('user_id, group_id')
      .eq('id', itemId)
      .single();

    if (fetchError || !item) {
      return NextResponse.json({ error: 'アイテムが見つかりません' }, { status: 404 });
    }

    // 作成者またはグループメンバーのみ削除可能
    const { data: membership } = await supabase
      .from('family_group_members')
      .select('group_id')
      .eq('group_id', item.group_id)
      .eq('user_id', session.user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: '削除権限がありません' }, { status: 403 });
    }

    // アイテムを削除
    const { error: deleteError } = await supabase
      .from('family_shopping_items')
      .delete()
      .eq('id', itemId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: 'データベースエラー' }, { status: 500 });
    }

    return NextResponse.json({ message: 'アイテムが削除されました' });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
