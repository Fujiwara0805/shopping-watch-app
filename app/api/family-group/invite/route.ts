import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { sendInvitationEmail } from '@/lib/emailService';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: 招待を送信
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const { email, groupId, generateOnly } = await request.json();

    if (!groupId) {
      return NextResponse.json({ error: 'グループIDが必要です' }, { status: 400 });
    }

    // generateOnlyの場合はemailは不要
    if (!generateOnly && !email) {
      return NextResponse.json({ error: 'メールアドレスが必要です' }, { status: 400 });
    }

    // メールアドレスのバリデーション（generateOnlyでない場合のみ）
    if (!generateOnly && email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: '有効なメールアドレスを入力してください' }, { status: 400 });
      }
    }

    // グループの存在確認とユーザーの権限確認
    const { data: membership, error: membershipError } = await supabase
      .from('family_group_members')
      .select('role, group_id')
      .eq('group_id', groupId)
      .eq('user_id', session.user.id)
      .single();

    if (membershipError || !membership) {
      console.error('Membership check error:', membershipError);
      return NextResponse.json({ error: 'グループが見つからないか、権限がありません' }, { status: 403 });
    }

    // グループ情報を別途取得
    const { data: groupInfo, error: groupError } = await supabase
      .from('family_groups')
      .select('id, name, owner_id')
      .eq('id', groupId)
      .single();

    if (groupError || !groupInfo) {
      console.error('Group info error:', groupError);
      return NextResponse.json({ error: 'グループ情報の取得に失敗しました' }, { status: 500 });
    }

    // 招待トークン生成
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7日後に期限切れ

    // 招待者の名前を取得
    const { data: inviterProfile } = await supabase
      .from('app_profiles')
      .select('display_name')
      .eq('user_id', session.user.id)
      .single();

    const inviterName = inviterProfile?.display_name || session.user.name || 'ユーザー';
    const inviteLink = `${process.env.NEXTAUTH_URL}/family-group/join/${token}`;

    // generateOnlyの場合は、リンクのみを返す
    if (generateOnly) {
      // 一時的な招待レコードを作成（実際の招待は後で行う）
      const { data: invitation, error: invitationError } = await supabase
        .from('family_group_invitations')
        .insert({
          group_id: groupId,
          inviter_id: session.user.id,
          invitee_email: 'temp@example.com', // 一時的なメール
          token,
          expires_at: expiresAt.toISOString(),
          status: 'pending'
        })
        .select()
        .single();

      if (invitationError) {
        console.error('Invitation creation error:', invitationError);
        return NextResponse.json({ 
          error: '招待リンクの生成に失敗しました'
        }, { status: 500 });
      }

      return NextResponse.json({ 
        inviteLink,
        groupName: groupInfo.name,
        inviterName,
        message: '招待リンクを生成しました'
      }, { status: 200 });
    }

    // 通常のメール招待処理
    // 既に招待済みかチェック
    const { data: existingInvitation } = await supabase
      .from('family_group_invitations')
      .select('id, status')
      .eq('group_id', groupId)
      .eq('invitee_email', email)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      return NextResponse.json({ error: 'このメールアドレスには既に招待を送信済みです' }, { status: 400 });
    }

    // 既にメンバーかチェック
    const { data: existingUser } = await supabase
      .from('app_users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      const { data: existingMember } = await supabase
        .from('family_group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', existingUser.id)
        .single();

      if (existingMember) {
        return NextResponse.json({ error: 'このユーザーは既にグループのメンバーです' }, { status: 400 });
      }
    }

    // メール送信を先に試行
    let emailSent = false;
    let emailError = null;

    try {
      console.log('Attempting to send invitation email:', {
        email,
        groupName: groupInfo.name,
        inviterName,
        token: token.substring(0, 8) + '...'
      });

      await sendInvitationEmail(email, token, groupInfo.name, inviterName);
      emailSent = true;
      console.log('✅ Invitation email sent successfully to:', email);
    } catch (error: any) {
      console.error('❌ Email send failed:', error);
      emailError = error.message;
      
      // メール送信に失敗した場合はエラーを返す
      return NextResponse.json({ 
        error: 'メール送信に失敗しました',
        details: emailError,
        suggestion: process.env.NODE_ENV === 'development' 
          ? 'テスト環境では自分のメールアドレス（tiki4091@gmail.com）のみに送信可能です'
          : 'しばらく時間をおいてから再度お試しください'
      }, { status: 400 });
    }

    // メール送信が成功した場合のみ、データベースに招待レコードを作成
    const { data: invitation, error: invitationError } = await supabase
      .from('family_group_invitations')
      .insert({
        group_id: groupId,
        inviter_id: session.user.id,
        invitee_email: email,
        token,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (invitationError) {
      console.error('Invitation creation error:', invitationError);
      return NextResponse.json({ 
        error: 'メールは送信されましたが、招待レコードの作成に失敗しました。管理者にお問い合わせください。'
      }, { status: 500 });
    }

    return NextResponse.json({ 
      invitation,
      inviteLink,
      emailSent: true,
      message: 'メールで招待を送信しました'
    }, { status: 201 });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
