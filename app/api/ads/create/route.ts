import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

// サーバーサイド用のSupabaseクライアント（ANON_KEYを使用）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // admin権限をチェック
    const { data: userData, error: userError } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'ユーザー情報の取得に失敗しました' },
        { status: 500 }
      );
    }

    if (userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'admin権限が必要です' },
        { status: 403 }
      );
    }

    // リクエストボディを取得
    const adData = await req.json();

    // 広告データを挿入（ANON_KEYを使用、RLSポリシーが適用される）
    const { data, error } = await supabase
      .from('ads')
      .insert(adData)
      .select()
      .single();

    if (error) {
      console.error('広告登録エラー:', error);
      return NextResponse.json(
        { error: error.message || '広告の登録に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('広告作成APIエラー:', error);
    return NextResponse.json(
      { error: error.message || 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

