"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/app-layout";
import { LineIcon } from "@/components/common/icons/LineIcon";
import { Loader2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const nextAuthError = searchParams.get("error");
    if (nextAuthError) {
      switch (nextAuthError) {
        case "OAuthAccountNotLinked":
          setError("このLINEアカウントは、他の方法で登録された既存のアカウントとは紐付けられません。");
          break;
        case "Callback":
          setError("LINEアカウントでのログインに失敗しました。時間をおいて再度お試しください。(コールバックエラー)");
          break;
        default:
          setError(`ログインエラーが発生しました: ${nextAuthError}`);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (status === "authenticated") {
      const callbackUrl = searchParams.get("callbackUrl") || "/timeline";
      router.replace(callbackUrl);
    }
  }, [status, router, searchParams]);

  const handleLineLogin = async () => {
    setIsLoading(true);
    setError(null);
    await signIn("line", { redirect: false });
  };

  if (status === "loading" && !isLoading) {
    return (
      <AppLayout showHeader={false} showNav={false}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50 dark:bg-slate-900"
        >
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
          <p className="text-lg text-muted-foreground">読み込み中...</p>
        </motion.div>
      </AppLayout>
    );
  }

  if (status === "unauthenticated") {
    return (
      <AppLayout showHeader={false} showNav={false}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-slate-800 dark:via-slate-900 dark:to-black"
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="bg-card p-8 rounded-xl shadow-2xl w-full max-w-sm text-center border dark:border-slate-700"
          >
            <motion.h1 
              className="text-4xl font-bold text-primary mb-3"
              initial={{ letterSpacing: "-0.05em" }}
              animate={{ letterSpacing: "0em" }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              おかえりなさい
            </motion.h1>
            <p className="text-muted-foreground mb-8">
              LINEアカウントで簡単ログイン！<br />お得な情報を見つけよう。
            </p>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-destructive/10 border border-destructive/50 text-destructive p-3 rounded-md mb-6 flex items-start space-x-2"
              >
                <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-left">{error}</p>
              </motion.div>
            )}
            
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Button 
                onClick={handleLineLogin} 
                disabled={isLoading}
                className="w-full bg-[#00C300] hover:bg-[#00B300] text-white text-lg py-7 shadow-lg flex items-center justify-center space-x-3 rounded-lg"
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <LineIcon className="w-7 h-7" />
                    <span className="font-semibold">LINEでログイン</span>
                  </>
                )}
              </Button>
            </motion.div>

            <p className="text-xs text-muted-foreground mt-8">
              ログインすることで、
              <a href="/terms" className="underline hover:text-primary transition-colors">利用規約</a>および
              <a href="/privacy" className="underline hover:text-primary transition-colors">プライバシーポリシー</a>
              に同意したものとみなされます。
            </p>
          </motion.div>
        </motion.div>
      </AppLayout>
    );
  }

  return (
     <AppLayout showHeader={false} showNav={false}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50 dark:bg-slate-900"
        >
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
          <p className="text-lg text-muted-foreground">ようこそ、{session?.user?.name || 'ユーザー'}さん</p>
          <p className="text-sm text-muted-foreground mt-2">まもなくリダイレクトします...</p>
        </motion.div>
      </AppLayout>
  );
}