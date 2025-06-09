import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs'; // bcryptjsをインポート

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'メールアドレスとパスワードは必須です。' }, { status: 400 });
    }

    // 既存ユーザーのチェック
    const { data: existingUser, error: fetchError } = await supabase
      .from('app_users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'このメールアドレスは既に登録されています。' }, { status: 409 });
    }

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116はレコードが見つからないエラーコード
      console.error('Error checking existing user:', fetchError);
      return NextResponse.json({ error: 'ユーザー確認中にエラーが発生しました。' }, { status: 500 });
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10); // ソルトラウンドは10が一般的

    // 新しいユーザーをapp_usersテーブルに挿入
    const newUserId = uuidv4();
    const { data: newUser, error: insertError } = await supabase
      .from('app_users')
      .insert({
        id: newUserId,
        email: email,
        password_hash: hashedPassword, // ハッシュ化されたパスワードを保存
      })
      .select('id, email')
      .single();

    if (insertError) {
      console.error('Error inserting new user:', insertError);
      return NextResponse.json({ error: 'ユーザー登録に失敗しました。' }, { status: 500 });
    }

    console.log('New user registered:', newUser.id);
    return NextResponse.json({ message: 'ユーザー登録が成功しました。', userId: newUser.id }, { status: 201 });

  } catch (error: any) {
    console.error('Registration API error:', error);
    return NextResponse.json({ error: error.message || '予期せぬエラーが発生しました。' }, { status: 500 });
  }
}
