import NextAuth, { AuthOptions, Profile as NextAuthProfile, Account as NextAuthAccount, User as NextAuthUser } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import LineProvider from 'next-auth/providers/line';
import CredentialsProvider from 'next-auth/providers/credentials';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

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
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "test@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        console.log("Credentials Provider: Authorize function triggered.");
        if (!credentials?.email || !credentials.password) {
          console.log("Credentials Provider: Email or password missing.");
          return null; // Emailまたはパスワードがない場合は認証失敗
        }

        try {
          // 1. emailでユーザーを検索
          const { data: userRecord, error: fetchError } = await supabase
            .from('app_users')
            .select('id, email, password_hash, google_id, line_id')
            .eq('email', credentials.email)
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116はレコードが見つからないエラーコード
            console.error('Credentials Provider: Error fetching user by email:', JSON.stringify(fetchError, null, 2));
            return null; // データベースエラーの場合は認証失敗
          }

          if (!userRecord || !userRecord.password_hash) {
            console.log('Credentials Provider: User not found or password_hash missing for email:', credentials.email);
            return null; // ユーザーが見つからない、またはパスワードが設定されていない場合は認証失敗
          }

          // 2. パスワードの検証
          const isPasswordValid = await bcrypt.compare(credentials.password, userRecord.password_hash);
          
          if (!isPasswordValid) {
            console.log('Credentials Provider: Invalid password for email:', credentials.email);
            return null; // パスワードが一致しない場合は認証失敗
          }

          // 認証成功: NextAuthがセッションに保存するユーザー情報を返します
          // ここで返すユーザーオブジェクトには、NextAuthUserインタフェースで定義されているプロパティ（id, name, email, image）を含める必要があります。
          // idはSupabaseのapp_users.id（UUID）を使用します。
          console.log('Credentials Provider: User authenticated successfully:', userRecord.id);
          return {
            id: userRecord.id,
            email: userRecord.email,
            name: userRecord.email, // ユーザー名としてメールアドレスを使用、必要に応じてdisplayNameに変更
            // image: null, // アバター画像がなければnull
          };

        } catch (e: any) {
          console.error('Credentials Provider: Unexpected error during authorization:', e.message, e.stack);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt', // JWTセッションを使用
  },
  secret: process.env.NEXTAUTH_SECRET, // .env.localで設定したシークレット
  callbacks: {
    async jwt({ token, user, account, profile }) {
      console.log("JWT Callback: Triggered");
      
      // OAuthプロバイダーからの初回サインイン時
      if (account && user) { // profile && profile.sub はCredentialsProviderにはないため条件を調整
        console.log("JWT Callback: Initial sign-in with provider data or credentials.", { provider: account.provider, accountType: account.type });
        token.provider = account.provider;
        
        if (account.type === 'oauth' && profile && profile.sub) {
          token.providerAccountId = profile.sub;

          let userRecord: any = null; // ここでuserRecordを宣言

          let providerColumn: string;
          if (account.provider === 'google') {
            providerColumn = 'google_id';
          } else if (account.provider === 'line') {
            providerColumn = 'line_id';
          } else {
            console.warn(`JWT Callback: Unsupported OAuth provider: ${account.provider}`);
            token.error = "UnsupportedOAuthProvider";
            return token;
          }

          try {
            // 1. プロバイダー固有のID (google_id または line_id) でユーザーを検索
            const { data: userByProviderId, error: errorByProviderId } = await supabase
              .from('app_users')
              .select('id, email, google_id, line_id, password_hash') // password_hashも選択
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
                  .select('id, email, google_id, line_id, password_hash') // password_hashも選択
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
                      .select('id, email, google_id, line_id, password_hash') // password_hashも選択
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
                    .select('id, email, password_hash') // password_hashも選択
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
        } else if (account.type === 'credentials') {
          // CredentialsProviderでのログイン
          console.log("JWT Callback: Credentials Provider login. User object:", JSON.stringify(user, null, 2));
          token.userId = user.id;
          token.email = user.email;
          token.name = user.name;
          token.picture = user.image;
          // CredentialsProviderではproviderAccountIdは通常設定しない
          // CredentialsProviderではproviderは'credentials'になる
        }
      } else if (token.userId && token.provider) { // token.providerAccountIdもここでは含めるべき
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
    provider?: string; // 認証プロバイダー (例: 'google', 'line', 'credentials')
    // name, pictureはNextAuth/jwtのデフォルトに既に存在する可能性があるが、明示的に追加も可
  }
}
