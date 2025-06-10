import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'トークンと新しいパスワードは必須です。' }, 
        { status: 400 }
      );
    }

    // パスワードの長さを検証
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'パスワードは6文字以上で入力してください。' }, 
        { status: 400 }
      );
    }

    // 1. トークンの検証
    const { data: tokenData, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select(`
        id,
        user_id,
        expires_at,
        used,
        app_users:user_id (
          id,
          email
        )
      `)
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      console.error('トークン検索エラー:', tokenError);
      return NextResponse.json(
        { error: '無効なリセットリンクです。' }, 
        { status: 400 }
      );
    }

    // 2. トークンの有効性をチェック
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (tokenData.used) {
      console.warn('使用済みトークンへのアクセス:', token.substring(0, 8) + '...');
      return NextResponse.json(
        { error: 'このリセットリンクは既に使用されています。' }, 
        { status: 400 }
      );
    }

    if (now > expiresAt) {
      console.warn('期限切れトークンへのアクセス:', token.substring(0, 8) + '...');
      return NextResponse.json(
        { error: 'リセットリンクの有効期限が切れています。新しいリセットリンクを取得してください。' }, 
        { status: 400 }
      );
    }

    // 3. パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4. データベース内でパスワードを更新とトークンを無効化
    try {
      // パスワードを更新
      const { error: passwordUpdateError } = await supabase
        .from('app_users')
        .update({ 
          password_hash: hashedPassword,
          update_at: new Date().toISOString()
        })
        .eq('id', tokenData.user_id);

      if (passwordUpdateError) {
        throw passwordUpdateError;
      }

      // トークンを使用済みにマーク
      const { error: tokenUpdateError } = await supabase
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('id', tokenData.id);

      if (tokenUpdateError) {
        console.error('トークン無効化エラー:', tokenUpdateError);
        // パスワード更新は成功しているので、ログだけ出力して続行
      }

      // 5. 同一ユーザーの他の有効なトークンも無効化
      await supabase
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('user_id', tokenData.user_id)
        .eq('used', false)
        .neq('id', tokenData.id);

      console.log('パスワードリセット成功:', tokenData.user_id);
      
      return NextResponse.json(
        { 
          message: 'パスワードが正常に更新されました。新しいパスワードでログインしてください。' 
        },
        { status: 200 }
      );

    } catch (updateError) {
      console.error('パスワード更新エラー:', updateError);
      return NextResponse.json(
        { error: 'パスワードの更新に失敗しました。' }, 
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('パスワードリセット実行API エラー:', error);
    return NextResponse.json(
      { error: error.message || '予期せぬエラーが発生しました。' }, 
      { status: 500 }
    );
  }
}

// トークン検証のみを行うGETメソッド
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'トークンが必要です。' }, 
        { status: 400 }
      );
    }

    // トークンの検証
    const { data: tokenData, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('expires_at, used')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { valid: false, error: '無効なトークンです。' }, 
        { status: 400 }
      );
    }

    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (tokenData.used) {
      return NextResponse.json(
        { valid: false, error: 'このリンクは既に使用されています。' }, 
        { status: 400 }
      );
    }

    if (now > expiresAt) {
      return NextResponse.json(
        { valid: false, error: 'リンクの有効期限が切れています。' }, 
        { status: 400 }
      );
    }

    return NextResponse.json(
      { valid: true, message: 'トークンは有効です。' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('トークン検証エラー:', error);
    return NextResponse.json(
      { valid: false, error: '予期せぬエラーが発生しました。' }, 
      { status: 500 }
    );
  }
}