"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/app-layout";
import { GoogleIcon } from "@/components/common/icons/GoogleIcon";
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
          setError("このGoogleアカウントは、他の方法で登録された既存のアカウントとは紐付けられません。");
          break;
        case "Callback":
          setError("Googleアカウントでのログインに失敗しました。時間をおいて再度お試しください。(コールバックエラー)");
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

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    await signIn("google", { redirect: false });
  };

  if (status === "loading" && !isLoading) {
    return (
      <AppLayout showHeader={false} showNav={false}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-100 dark:bg-slate-900"
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
          className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-100 dark:bg-slate-900"
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="bg-card p-8 sm:p-10 rounded-xl shadow-xl w-full max-w-md text-center border dark:border-slate-700"
          >
            <motion.h1 
              className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4"
              initial={{ letterSpacing: "-0.05em" }}
              animate={{ letterSpacing: "0em" }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              アカウントにログイン
            </motion.h1>
            <p className="text-muted-foreground mb-8 text-sm sm:text-base">
              Googleアカウントで続行します。
            </p>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 p-3 rounded-md mb-6 flex items-start space-x-2"
              >
                <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-left">{error}</p>
              </motion.div>
            )}
            
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                onClick={handleGoogleLogin}
                disabled={isLoading}
                variant="outline"
                className="w-full border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-base sm:text-lg py-6 sm:py-7 shadow-md flex items-center justify-center space-x-3 rounded-lg"
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <GoogleIcon className="w-6 h-6" />
                    <span className="font-medium">Googleでログイン</span>
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