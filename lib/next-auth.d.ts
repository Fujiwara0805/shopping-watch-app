import NextAuth, { DefaultSession } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    supabaseAccessToken?: string;
    supabaseRefreshToken?: string; // 必要に応じて
    user: {
      id?: string | null; // app_users テーブルの user_id を想定
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    supabaseAccessToken?: string;
    supabaseRefreshToken?: string; // 必要に応じて
    userId?: string; // app_users テーブルの user_id を想定
  }
}
