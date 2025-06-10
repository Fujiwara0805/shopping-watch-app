import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { sendPasswordResetEmail } from '@/lib/emailService';
import { rateLimit } from '@/lib/rateLimit';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  // レート制限を適用（1時間に5回まで）
  const rateLimitResult = rateLimit(req, {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1時間
    message: 'パスワードリセットの要求が多すぎます。1時間後に再度お試しください。'
  });

  if (rateLimitResult) {
    console.warn('レート制限に達しました:', {
      ip: req.headers.get('x-forwarded-for') || req.ip,
      retryAfter: rateLimitResult.retryAfter
    });

    return NextResponse.json(
      { 
        error: rateLimitResult.error,
        retryAfter: rateLimitResult.retryAfter 
      }, 
      { 
        status: 429,
        headers: {
          'Retry-After': rateLimitResult.retryAfter.toString()
        }
      }
    );
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'メールアドレスは必須です。' }, 
        { status: 400 }
      );
    }

    // メールアドレスの形式を検証
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '有効なメールアドレスを入力してください。' }, 
        { status: 400 }
      );
    }

    // 1. ユーザーの存在確認
    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('ユーザー検索エラー:', userError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました。' }, 
        { status: 500 }
      );
    }

    // セキュリティ上、ユーザーが存在しない場合でも成功レスポンスを返す
    if (!user) {
      console.warn('存在しないメールアドレスに対するリセット要求:', email);
      // 実際のレスポンス時間を模倣するため少し遅延
      await new Promise(resolve => setTimeout(resolve, 100));
      return NextResponse.json(
        { message: 'パスワードリセットメールを送信しました。メールをご確認ください。' },
        { status: 200 }
      );
    }

    // 2. 既存の有効なトークンを無効化
    const { error: invalidateError } = await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('user_id', user.id)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString());

    if (invalidateError) {
      console.error('既存トークン無効化エラー:', invalidateError);
    }

    // 3. 新しいリセットトークンを生成
    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1時間後

    // 4. トークンをデータベースに保存
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (tokenError) {
      console.error('トークン保存エラー:', tokenError);
      return NextResponse.json(
        { error: 'リセットトークンの生成に失敗しました。' }, 
        { status: 500 }
      );
    }

    // 5. メール送信
    try {
      await sendPasswordResetEmail({
        to: user.email,
        resetToken: resetToken
      });

      console.log('パスワードリセットメール送信成功:', user.email);
      return NextResponse.json(
        { message: 'パスワードリセットメールを送信しました。メールをご確認ください。' },
        { status: 200 }
      );
    } catch (emailError) {
      console.error('メール送信エラー:', emailError);
      
      // メール送信に失敗した場合はトークンを無効化
      await supabase
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('token', resetToken);

      return NextResponse.json(
        { error: 'メールの送信に失敗しました。しばらく時間をおいて再度お試しください。' }, 
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('パスワードリセットAPI エラー:', error);
    return NextResponse.json(
      { error: error.message || '予期せぬエラーが発生しました。' }, 
      { status: 500 }
    );
  }
}