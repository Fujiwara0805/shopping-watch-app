import NextAuth, { AuthOptions, Profile as NextAuthProfile, Account as NextAuthAccount, User as NextAuthUser } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import LineProvider from 'next-auth/providers/line';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    LineProvider({
      clientId: process.env.LINE_CLIENT_ID!,
      clientSecret: process.env.LINE_CLIENT_SECRET!,
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

        let userRecord = null;
        let providerColumn: string;

        if (account.provider === 'google') {
          providerColumn = 'google_id';
        } else if (account.provider === 'line') {
          providerColumn = 'line_id';
        } else {
          console.warn(`JWT Callback: Unsupported provider: ${account.provider}`);
          token.error = "UnsupportedProvider";
          return token;
        }

        try {
          // 1. プロバイダー固有のID (google_id または line_id) でユーザーを検索
          const { data: userByProviderId, error: errorByProviderId } = await supabase
            .from('app_users')
            .select('id, email, google_id, line_id')
            .eq(providerColumn, profile.sub)
            .single();

          if (errorByProviderId && errorByProviderId.code !== 'PGRST116') {
            console.error(`JWT Callback: Error fetching user by ${providerColumn}:`, JSON.stringify(errorByProviderId, null, 2));
            token.error = `SupabaseFetchErrorByProviderId_${account.provider}`;
            return token;
          }

          if (userByProviderId) {
            // プロバイダーIDでユーザーが見つかった場合 (既存ユーザーの再ログイン)
            console.log("JWT Callback: Existing user found by provider ID:", JSON.stringify(userByProviderId, null, 2));
            userRecord = userByProviderId;
          } else {
            // プロバイダーIDで見つからなかった場合、メールアドレスでユーザーを検索してアカウントを紐付ける
            if (profile.email) {
              const { data: userByEmail, error: errorByEmail } = await supabase
                .from('app_users')
                .select('id, email, google_id, line_id')
                .eq('email', profile.email)
                .single();

              if (errorByEmail && errorByEmail.code !== 'PGRST116') {
                console.error('JWT Callback: Error fetching user by email:', JSON.stringify(errorByEmail, null, 2));
                token.error = "SupabaseFetchErrorByEmail";
                return token;
              }

              if (userByEmail) {
                // メールアドレスでユーザーが見つかった場合 (既存ユーザーに新しいプロバイダーを紐付け)
                console.log("JWT Callback: Existing user found by email. Linking new provider.", JSON.stringify(userByEmail, null, 2));
                const updatePayload: { google_id?: string, line_id?: string } = {};

                if (account.provider === 'google' && !userByEmail.google_id) {
                  updatePayload.google_id = profile.sub;
                } else if (account.provider === 'line' && !userByEmail.line_id) {
                  updatePayload.line_id = profile.sub;
                }

                if (Object.keys(updatePayload).length > 0) {
                  const { data: updatedUser, error: updateError } = await supabase
                    .from('app_users')
                    .update(updatePayload)
                    .eq('id', userByEmail.id)
                    .select('id, email, google_id, line_id')
                    .single();

                  if (updateError) {
                    console.error('JWT Callback: Error updating existing user with new provider ID:', JSON.stringify(updateError, null, 2));
                    token.error = `SupabaseUpdateError_app_users_${account.provider}`;
                    return token;
                  }
                  console.log("JWT Callback: User updated with new provider ID:", JSON.stringify(updatedUser, null, 2));
                  userRecord = updatedUser;
                } else {
                  // ユーザーはメールアドレスで見つかったが、すでにプロバイダーが紐付けられているか、更新不要
                  console.log("JWT Callback: User found by email, but provider ID already linked or no update needed. Using existing user.", JSON.stringify(userByEmail, null, 2));
                  userRecord = userByEmail;
                }
              } else {
                // プロバイダーIDでもメールアドレスでも見つからなかった場合 (全くの新規ユーザー)
                console.log("JWT Callback: No existing user found by provider ID or email. Creating new user.");
                const newUserId = uuidv4();
                const newUserPayload: { id: string, email: string, google_id?: string, line_id?: string } = {
                  id: newUserId,
                  email: profile.email,
                };

                if (account.provider === 'google') {
                  newUserPayload.google_id = profile.sub;
                } else if (account.provider === 'line') {
                  newUserPayload.line_id = profile.sub;
                }

                const { data: newSupabaseUser, error: insertError } = await supabase
                  .from('app_users')
                  .insert(newUserPayload)
                  .select('id, email')
                  .single();

                if (insertError) {
                  console.error('JWT Callback: Error inserting new user to app_users:', JSON.stringify(insertError, null, 2));
                  token.error = `SupabaseInsertError_app_users_${account.provider}`;
                  return token;
                }

                if (newSupabaseUser) {
                  console.log("JWT Callback: New user created successfully in app_users:", JSON.stringify(newSupabaseUser, null, 2));
                  userRecord = newSupabaseUser;
                } else {
                  console.error('JWT Callback: New app_users data is null after insert.');
                  token.error = "SupabaseInsertReturnedNull_app_users";
                  return token;
                }
              }
            } else {
              // profile.email が存在しない場合のハンドリング
              console.warn("JWT Callback: Profile email is missing. Cannot search/link by email.", { provider: account.provider, profileSub: profile.sub });
              token.error = "ProfileEmailMissing";
              return token;
            }
          }

          // 最終的なユーザーレコードからトークンを構築
          if (userRecord) {
            token.userId = userRecord.id;
            token.email = userRecord.email;
            token.name = profile.name; // プロバイダーから取得した名前
            token.picture = profile.image; // プロバイダーから取得した画像
          } else {
            console.error("JWT Callback: User record could not be determined.");
            token.error = "UserRecordUndetermined";
            delete token.userId;
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
    provider?: string; // 認証プロバイダー (例: 'google', 'line')
    // name, pictureはNextAuth/jwtのデフォルトに既に存在する可能性があるが、明示的に追加も可
  }
}
