import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: 招待を受諾してグループに参加
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: '招待トークンが必要です' }, { status: 400 });
    }

    // 招待情報を取得
    const { data: invitation, error: invitationError } = await supabase
      .from('family_group_invitations')
      .select(`
        id,
        group_id,
        invitee_email,
        status,
        expires_at,
        family_groups (
          id,
          name,
          owner_id
        )
      `)
      .eq('token', token)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json({ error: '無効な招待トークンです' }, { status: 404 });
    }

    // 招待の有効性をチェック
    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: 'この招待は既に処理済みです' }, { status: 400 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: '招待の有効期限が切れています' }, { status: 400 });
    }

    // メールアドレスチェックを削除
    // リンクを知っているユーザーであれば誰でも参加可能

    // 既にメンバーかチェック
    const { data: existingMember } = await supabase
      .from('family_group_members')
      .select('id')
      .eq('group_id', invitation.group_id)
      .eq('user_id', session.user.id)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: '既にこのグループのメンバーです' }, { status: 400 });
    }

    // グループメンバーに追加
    const { error: memberError } = await supabase
      .from('family_group_members')
      .insert({
        group_id: invitation.group_id,
        user_id: session.user.id,
        role: 'member'
      });

    if (memberError) {
      console.error('Member addition error:', memberError);
      throw memberError;
    }

    // 招待ステータスを更新
    const { error: updateError } = await supabase
      .from('family_group_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Invitation update error:', updateError);
    }

    return NextResponse.json({ 
      group: invitation.family_groups,
      message: 'グループに参加しました' 
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
