import NextAuth, { AuthOptions, Profile as NextAuthProfile, Account as NextAuthAccount, User as NextAuthUser } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt', // JWTセッションを使用
  },
  secret: process.env.NEXTAUTH_SECRET, // .env.localで設定したシークレット
  callbacks: {
    async jwt({ token, user, account, profile }) {
      console.log("JWT Callback: Triggered");
      if (account && user && profile && profile.sub) {
        console.log("JWT Callback: Initial sign-in with provider data.", { provider: account.provider, profileSub: profile.sub });
        token.provider = account.provider;
        token.providerAccountId = profile.sub;

        try {
          let { data: existingUser, error: fetchError } = await supabase
            .from('app_users')
            .select('id, email, google_id') // 'name', 'image' を削除
            .eq('google_id', profile.sub)
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('JWT Callback: Error fetching user from app_users by google_id:', JSON.stringify(fetchError, null, 2));
            token.error = "SupabaseFetchError_app_users";
            return token;
          }

          if (existingUser) {
            console.log("JWT Callback: Existing user found in app_users:", JSON.stringify(existingUser, null, 2));
            token.userId = existingUser.id;
            token.email = existingUser.email; // DBのemail
            // Googleのprofileからnameとpictureを取得してトークンに直接入れる
            token.name = profile.name;
            token.picture = profile.image;

          } else {
            console.log("JWT Callback: New user for app_users. Creating record.");
            const newUserId = uuidv4();
            const newUserPayload = { // 'name', 'image' を削除
              id: newUserId,
              google_id: profile.sub,
              email: profile.email,
              // created_at, updated_at はSupabaseが自動設定することが多い
            };

            console.log("JWT Callback: New app_users payload:", JSON.stringify(newUserPayload, null, 2));

            const { data: newSupabaseUser, error: insertError } = await supabase
              .from('app_users')
              .insert(newUserPayload)
              .select('id, email') // 'name', 'image' を削除
              .single();

            if (insertError) {
              console.error('JWT Callback: Error inserting new user to app_users:', JSON.stringify(insertError, null, 2));
              token.error = "SupabaseInsertError_app_users";
              return token;
            }

            if (newSupabaseUser) {
              console.log("JWT Callback: New user created successfully in app_users:", JSON.stringify(newSupabaseUser, null, 2));
              token.userId = newSupabaseUser.id;
              token.email = newSupabaseUser.email;
              // Googleのprofileからnameとpictureを取得してトークンに直接入れる
              token.name = profile.name;
              token.picture = profile.image;
            } else {
              console.error('JWT Callback: New app_users data is null after insert.');
              token.error = "SupabaseInsertReturnedNull_app_users";
              return token;
            }
          }
        } catch (e: any) {
          console.error("JWT Callback: General Catch Block Error (app_users context):", e.message, e.stack);
          token.error = "JwtCallbackError_app_users";
          delete token.userId;
        }
      } else if (token.providerAccountId && token.provider) {
        console.log("JWT Callback: Existing token - session refresh (app_users context).", { userId: token.userId });
      } else {
        console.log("JWT Callback: Account, User, or Profile missing (app_users context).");
      }

      console.log("JWT Callback: Returning token (app_users context):", JSON.stringify(token, null, 2));
      return token;
    },
    async session({ session, token }) {
      console.log("Session Callback: Triggered with token (app_users context):", JSON.stringify(token, null, 2));
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      if (token.email) {
        session.user.email = token.email as string;
      }
      // nameとpictureはprofileから直接トークンに入っているので、そのままsessionに渡る
      if (token.name) {
        session.user.name = token.name as string;
      }
      if (token.picture) {
        session.user.image = token.picture as string;
      }

      if (token.error) {
        (session as any).error = token.error;
        console.warn("Session Callback: Error propagated from JWT token (app_users context):", token.error);
      } else {
        if ((session as any).error) {
          delete (session as any).error;
        }
      }
      console.log("Session Callback: Returning session (app_users context):", JSON.stringify(session, null, 2));
      return session;
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
      id?: string; // Supabaseの`app_users.id` (UUID)
    } & NextAuthUser; // name, email, image をNextAuthのデフォルトから継承
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;   // Supabaseの`app_users.id` (UUID)
    providerAccountId?: string;   // プロバイダーのユーザーID (例: Googleのsub)
    provider?: string; // 認証プロバイダー (例: 'google')
    // name, pictureはNextAuth/jwtのデフォルトに既に存在する可能性があるが、明示的に追加も可
  }
}
