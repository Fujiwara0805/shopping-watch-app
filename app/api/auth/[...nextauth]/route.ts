import NextAuth, { AuthOptions, Profile as NextAuthProfile, Account as NextAuthAccount, User as NextAuthUser } from 'next-auth';
import LineProvider from 'next-auth/providers/line';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

interface LineProfile extends NextAuthProfile {
  sub: string; // LINEのユーザーID (必須)
  name?: string;
  picture?: string;
  email?: string; // LINE Profile+で取得可能 (要申請・LINE側でのユーザー同意)
}

export const authOptions: AuthOptions = {
  providers: [
    LineProvider({
      clientId: process.env.LINE_CLIENT_ID!,
      clientSecret: process.env.LINE_CLIENT_SECRET!,
      // LINEからemailを取得するには、LINE Developers Consoleで「メールアドレス取得権限」を申請し、
      // ユーザーが同意した場合にのみ取得可能です。
      // authorization: { params: { scope: "profile openid email" } }, // emailスコープを追加する場合
    }),
  ],
  session: {
    strategy: 'jwt', // JWTセッションを使用
  },
  secret: process.env.NEXTAUTH_SECRET, // .env.localで設定したシークレット
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // 初期サインイン時 (LINEから返却されたprofile情報がある)
      if (account && user && profile) {
        const lineProfile = profile as LineProfile; // LINEから返ってくるプロファイル情報
        token.provider = account.provider; // 'line'
        token.lineId = lineProfile.sub;    // LINE User ID (subクレーム)

        try {
          // 1. Supabaseの`users`テーブルでLINE IDを検索
          let { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('id, email, line_id') // `users`テーブルから必要な情報を取得
            .eq('line_id', lineProfile.sub)
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116は '単一行が見つかりません'
            console.error('Error fetching user from Supabase by line_id:', fetchError);
            throw new Error('Supabase user fetch failed');
          }

          if (existingUser) {
            // 既存ユーザーの場合、そのユーザーのシステムID (`users.id`) をトークンに格納
            token.userId = existingUser.id; // Supabaseの`users.id` (UUID)

            // (任意) LINEプロファイル情報で既存のemailなどを更新する場合
            if (lineProfile.email && lineProfile.email !== existingUser.email) {
              const { error: updateUserError } = await supabase
                .from('users')
                .update({ email: lineProfile.email, updated_at: new Date().toISOString() })
                .eq('id', existingUser.id);
              if (updateUserError) {
                console.warn('Failed to update user email in Supabase:', updateUserError);
              }
            }
          } else {
            // 新規ユーザーの場合、Supabaseの`users`テーブルに新しいレコードを作成
            const newUserId = uuidv4(); // 新しいシステムユーザーID (UUID)を生成
            const newUserPayload: { id: string; line_id: string; email?: string; created_at: string; updated_at: string } = {
              id: newUserId,
              line_id: lineProfile.sub,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            if (lineProfile.email) { // LINEからemailが取得できた場合のみセット
              newUserPayload.email = lineProfile.email;
            }

            const { data: newSupabaseUser, error: insertError } = await supabase
              .from('users')
              .insert(newUserPayload)
              .select('id') // 挿入されたユーザーのIDを取得
              .single();

            if (insertError) {
              console.error('Error inserting new user to Supabase:', insertError);
              throw new Error('Supabase user creation failed');
            }
            if (newSupabaseUser) {
              token.userId = newSupabaseUser.id; // 新しく作成された`users.id`をトークンに格納
            } else {
              console.error('New Supabase user data is null after insert.');
              throw new Error('Supabase user creation returned null');
            }
          }

          // トークンにLINEの表示名と画像URLも一時的に含める (セッションコールバックで使用)
          token.name = lineProfile.name;
          token.picture = lineProfile.picture;

        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          console.error("JWT Callback Error:", errorMessage);
          token.error = "CallbackError"; // エラー情報をトークンに含める
          // 認証エラーとするため、userId など必須情報を削除または未設定にする
          delete token.userId;
          delete token.lineId;
        }
      }
      return token; // JWTトークンを返す
    },
    async session({ session, token }) {
      // JWTトークンからセッションオブジェクトに必要な情報を詰める
      if (token.userId) {
        session.user.id = token.userId as string; // `users.id` (UUID) をセッションに設定
      }
      // NextAuthのデフォルトのname, imageはLINEのものをそのまま使う場合
      if (token.name) {
        session.user.name = token.name as string;
      }
      if (token.picture) {
        session.user.image = token.picture as string;
      }
      // (任意) LINE IDをセッションに含めたい場合
      // if (token.lineId) {
      //   (session.user as any).lineId = token.lineId as string;
      // }

      if (token.error) {
        (session as any).error = token.error; // エラー情報をセッションに渡す
        // エラーがある場合はユーザー情報をクリアするなど、セッションを無効化する処理も検討
      }
      return session; // セッションオブジェクトを返す
    },
  },
  // pages: { // カスタムログインページを指定する場合 (今回はapp/login/page.tsxを使用)
  //   signIn: '/login',
  //   // error: '/auth/error', // エラーページを指定する場合
  // },
  // debug: process.env.NODE_ENV === 'development', // 開発中にデバッグ情報を表示する場合
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

// NextAuthの型定義を拡張して、セッションとJWTにカスタムプロパティを追加
declare module 'next-auth' {
  interface Session {
    user: {
      id?: string; // Supabaseの`users.id` (UUID)
    } & NextAuthUser; // name, email, image をNextAuthのデフォルトから継承
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;   // Supabaseの`users.id` (UUID)
    lineId?: string;   // LINE User ID
    provider?: string; // 認証プロバイダー (例: 'line')
    // name, pictureはNextAuth/jwtのデフォルトに既に存在する可能性があるが、明示的に追加も可
  }
}
