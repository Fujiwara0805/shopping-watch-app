import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase-server';

/**
 * GET /api/event-reviews?post_id=xxx
 * イベントのレビュー一覧を取得
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('post_id');

  if (!postId) {
    return NextResponse.json({ message: 'post_id は必須です。' }, { status: 400 });
  }

  const { data: reviews, error } = await supabaseServer
    .from('event_reviews')
    .select('id, post_id, rating, title, comment, visited_date, created_at, app_profiles(id, display_name, avatar_url)')
    .eq('post_id', postId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[EventReviews] GET error:', error.message);
    return NextResponse.json({ message: 'レビューの取得に失敗しました。' }, { status: 500 });
  }

  return NextResponse.json({ reviews: reviews ?? [] });
}

/**
 * POST /api/event-reviews
 * レビューを投稿（要ログイン）
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'ログインが必要です。' }, { status: 401 });
  }

  const body = await request.json();
  const { post_id, rating, title, comment, visited_date } = body;

  if (!post_id || !rating) {
    return NextResponse.json({ message: 'post_id と rating は必須です。' }, { status: 400 });
  }

  if (rating < 1 || rating > 5) {
    return NextResponse.json({ message: '評価は1〜5の範囲で指定してください。' }, { status: 400 });
  }

  // ユーザーのプロフィールIDを取得
  const { data: profile, error: profileError } = await supabaseServer
    .from('app_profiles')
    .select('id')
    .eq('user_id', session.user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ message: 'プロフィールが見つかりません。' }, { status: 404 });
  }

  // 同じイベントに対する既存レビューをチェック
  const { data: existing } = await supabaseServer
    .from('event_reviews')
    .select('id')
    .eq('post_id', post_id)
    .eq('app_profile_id', profile.id)
    .eq('is_deleted', false)
    .single();

  if (existing) {
    return NextResponse.json({ message: 'このイベントには既にレビューを投稿済みです。' }, { status: 409 });
  }

  // レビューを作成
  const { data: review, error: insertError } = await supabaseServer
    .from('event_reviews')
    .insert({
      post_id,
      app_profile_id: profile.id,
      rating,
      title: title || null,
      comment: comment || null,
      visited_date: visited_date || null,
    })
    .select('id, post_id, rating, title, comment, visited_date, created_at')
    .single();

  if (insertError) {
    console.error('[EventReviews] POST error:', insertError.message);
    return NextResponse.json({ message: 'レビューの投稿に失敗しました。' }, { status: 500 });
  }

  return NextResponse.json({ review }, { status: 201 });
}
