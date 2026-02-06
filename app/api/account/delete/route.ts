import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase-server';

/**
 * ログイン中のユーザーを app_profiles / app_users から物理削除する
 * セッションの userId のみを対象とする
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const userId = session.user.id;

    // 1. app_profiles を先に削除（user_id で紐づくレコード）
    const { error: profileError } = await supabaseServer
      .from('app_profiles')
      .delete()
      .eq('user_id', userId);

    if (profileError) {
      console.error('Account delete: app_profiles delete error', profileError);
      return NextResponse.json(
        { error: 'アカウント削除に失敗しました。（プロフィール）' },
        { status: 500 }
      );
    }

    // 2. app_users から削除
    const { error: userError } = await supabaseServer
      .from('app_users')
      .delete()
      .eq('id', userId);

    if (userError) {
      console.error('Account delete: app_users delete error', userError);
      return NextResponse.json(
        { error: 'アカウント削除に失敗しました。' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Account delete API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '予期せぬエラーが発生しました。' },
      { status: 500 }
    );
  }
}
