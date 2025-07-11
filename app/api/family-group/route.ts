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

// GET: ユーザーのグループ情報を取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    // ユーザーが参加しているグループを取得
    const { data: memberGroups, error: memberError } = await supabase
      .from('family_group_members')
      .select(`
        group_id,
        role,
        joined_at,
        family_groups (
          id,
          name,
          owner_id,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', session.user.id);

    if (memberError) {
      console.error('Member groups fetch error:', memberError);
      throw memberError;
    }

    // グループのメンバー情報も取得
    const groups = await Promise.all(
      (memberGroups || []).map(async (memberGroup) => {
        // メンバー情報を取得
        const { data: members, error: membersError } = await supabase
          .from('family_group_members')
          .select(`
            user_id,
            role,
            joined_at
          `)
          .eq('group_id', memberGroup.group_id);

        if (membersError) {
          console.error('Group members fetch error:', membersError);
        }

        // 各メンバーのプロフィール情報を別途取得
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

        return {
          ...memberGroup.family_groups,
          userRole: memberGroup.role,
          joinedAt: memberGroup.joined_at,
          members: membersWithProfiles
        };
      })
    );

    return NextResponse.json({ groups });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

// POST: 新しいグループを作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'グループ名が必要です' }, { status: 400 });
    }

    if (name.length > 50) {
      return NextResponse.json({ error: 'グループ名は50文字以内で入力してください' }, { status: 400 });
    }

    // グループを作成
    const { data: group, error: groupError } = await supabase
      .from('family_groups')
      .insert({
        name: name.trim(),
        owner_id: session.user.id
      })
      .select()
      .single();

    if (groupError) {
      console.error('Group creation error:', groupError);
      throw groupError;
    }

    // 作成者をオーナーとしてメンバーに追加
    const { error: memberError } = await supabase
      .from('family_group_members')
      .insert({
        group_id: group.id,
        user_id: session.user.id,
        role: 'owner'
      });

    if (memberError) {
      console.error('Member addition error:', memberError);
      throw memberError;
    }

    return NextResponse.json({ 
      group,
      message: 'グループが作成されました' 
    }, { status: 201 });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
