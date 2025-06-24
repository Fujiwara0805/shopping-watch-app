import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// 現在のアクティブセッションを取得または作成
export async function GET() {
  try {
    // 現在のアクティブセッションを確認
    const { data: activeSession, error: sessionError } = await supabase
      .from('board_sessions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (sessionError && sessionError.code !== 'PGRST116') {
      console.error('セッション取得エラー:', sessionError);
      return NextResponse.json({ error: 'セッション取得に失敗しました' }, { status: 500 });
    }

    const now = new Date();

    // アクティブセッションが存在し、まだ有効な場合はそれを返す
    if (activeSession && new Date(activeSession.session_end) > now) {
      return NextResponse.json({ session: activeSession });
    }

    // 既存のセッションを無効化
    if (activeSession) {
      await supabase
        .from('board_sessions')
        .update({ is_active: false })
        .eq('id', activeSession.id);
    }

    // 新しいセッションを作成（8時間後に終了）
    const sessionEnd = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    
    const { data: newSession, error: createError } = await supabase
      .from('board_sessions')
      .insert({
        session_start: now.toISOString(),
        session_end: sessionEnd.toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error('セッション作成エラー:', createError);
      return NextResponse.json({ error: 'セッション作成に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ session: newSession });
  } catch (error) {
    console.error('API エラー:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// 商品リクエストを送信
export async function POST(request: NextRequest) {
  try {
    const { product_name } = await request.json();

    if (!product_name) {
      return NextResponse.json({ error: '商品名が必要です' }, { status: 400 });
    }

    // 現在のアクティブセッションを取得
    const { data: activeSession, error: sessionError } = await supabase
      .from('board_sessions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (sessionError || !activeSession) {
      return NextResponse.json({ error: 'アクティブなセッションがありません' }, { status: 400 });
    }

    // セッションが有効かチェック
    const now = new Date();
    if (new Date(activeSession.session_end) <= now) {
      return NextResponse.json({ error: 'セッションが終了しています' }, { status: 400 });
    }

    // リクエストを作成
    const { data: newRequest, error: requestError } = await supabase
      .from('board_requests')
      .insert({
        product_name,
        session_id: activeSession.id,
      })
      .select()
      .single();

    if (requestError) {
      console.error('リクエスト作成エラー:', requestError);
      return NextResponse.json({ error: 'リクエスト作成に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ request: newRequest });
  } catch (error) {
    console.error('API エラー:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
