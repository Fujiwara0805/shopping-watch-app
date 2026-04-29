"use client"; // このコンポーネントはクライアントサイドで動作するため "use client" が必要

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import SupabaseAuthSync from "./SupabaseAuthSync";

interface NextAuthProviderProps {
  children: ReactNode;
  // セッション情報をサーバーコンポーネントから渡す場合は session プロパティを追加することも可能
  // session?: Session;
}

export default function NextAuthProvider({ children }: NextAuthProviderProps) {
  // SessionProviderでラップすることで、子コンポーネントで useSession() などが使えるようになる
  return (
    <SessionProvider>
      <SupabaseAuthSync />
      {children}
    </SessionProvider>
  );
}
