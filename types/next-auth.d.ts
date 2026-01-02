import NextAuth, { DefaultSession } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    supabaseAccessToken?: string;
    supabaseRefreshToken?: string;
    user: {
      id?: string | null;
      role?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    supabaseAccessToken?: string;
    supabaseRefreshToken?: string;
    userId?: string;
    providerAccountId?: string;
    provider?: string;
    role?: string;
  }
}
