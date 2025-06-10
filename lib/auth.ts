import { AuthOptions, Profile as NextAuthProfile, Account as NextAuthAccount, User as NextAuthUser } from 'next-auth';
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
          return null;
        }

        try {
          const { data: userRecord, error: fetchError } = await supabase
            .from('app_users')
            .select('id, email, password_hash, google_id, line_id')
            .eq('email', credentials.email)
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Credentials Provider: Error fetching user by email:', JSON.stringify(fetchError, null, 2));
            return null;
          }

          if (!userRecord || !userRecord.password_hash) {
            console.log('Credentials Provider: User not found or password_hash missing for email:', credentials.email);
            return null;
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, userRecord.password_hash);
          
          if (!isPasswordValid) {
            console.log('Credentials Provider: Invalid password for email:', credentials.email);
            return null;
          }

          console.log('Credentials Provider: User authenticated successfully:', userRecord.id);
          return {
            id: userRecord.id,
            email: userRecord.email,
            name: userRecord.email,
          };

        } catch (e: any) {
          console.error('Credentials Provider: Unexpected error during authorization:', e.message, e.stack);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user, account, profile }) {
      console.log("JWT Callback: Triggered");
      
      if (account && user) {
        console.log("JWT Callback: Initial sign-in with provider data or credentials.", { provider: account.provider, accountType: account.type });
        token.provider = account.provider;
        
        if (account.type === 'oauth' && profile && profile.sub) {
          token.providerAccountId = profile.sub;

          let userRecord: any = null;

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
            const { data: userByProviderId, error: errorByProviderId } = await supabase
              .from('app_users')
              .select('id, email, google_id, line_id, password_hash')
              .eq(providerColumn, profile.sub)
              .single();

            if (errorByProviderId && errorByProviderId.code !== 'PGRST116') {
              console.error(`JWT Callback: Error fetching user by ${providerColumn}:`, JSON.stringify(errorByProviderId, null, 2));
              token.error = `SupabaseFetchErrorByProviderId_${account.provider}`;
              return token;
            }

            if (userByProviderId) {
              console.log("JWT Callback: Existing user found by provider ID:", JSON.stringify(userByProviderId, null, 2));
              userRecord = userByProviderId;
            } else {
              if (profile.email) {
                const { data: userByEmail, error: errorByEmail } = await supabase
                  .from('app_users')
                  .select('id, email, google_id, line_id, password_hash')
                  .eq('email', profile.email)
                  .single();

                if (errorByEmail && errorByEmail.code !== 'PGRST116') {
                  console.error('JWT Callback: Error fetching user by email:', JSON.stringify(errorByEmail, null, 2));
                  token.error = "SupabaseFetchErrorByEmail";
                  return token;
                }

                if (userByEmail) {
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
                      .select('id, email, google_id, line_id, password_hash')
                      .single();

                    if (updateError) {
                      console.error('JWT Callback: Error updating existing user with new provider ID:', JSON.stringify(updateError, null, 2));
                      token.error = `SupabaseUpdateError_app_users_${account.provider}`;
                      return token;
                    }
                    console.log("JWT Callback: User updated with new provider ID:", JSON.stringify(updatedUser, null, 2));
                    userRecord = updatedUser;
                  } else {
                    console.log("JWT Callback: User found by email, but provider ID already linked or no update needed. Using existing user.", JSON.stringify(userByEmail, null, 2));
                    userRecord = userByEmail;
                  }
                } else {
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
                    .select('id, email, password_hash')
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
                console.warn("JWT Callback: Profile email is missing. Cannot search/link by email.", { provider: account.provider, profileSub: profile.sub });
                token.error = "ProfileEmailMissing";
                return token;
              }
            }

            if (userRecord) {
              token.userId = userRecord.id;
              token.email = userRecord.email;
              token.name = profile.name;
              token.picture = profile.image;
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
          console.log("JWT Callback: Credentials Provider login. User object:", JSON.stringify(user, null, 2));
          token.userId = user.id;
          token.email = user.email;
          token.name = user.name;
          token.picture = user.image;
        }
      } else if (token.userId && token.provider) {
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
};

// NextAuthの型定義を拡張
declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
    } & NextAuthUser;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    providerAccountId?: string;
    provider?: string;
  }
}
