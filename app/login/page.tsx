"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/app/layout";
import { GoogleIcon } from "@/components/common/icons/GoogleIcon";
import { LineConsentModal } from "@/components/common/LineConsentModal";
import { Loader2, AlertTriangle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Link from "next/link";

const loginFormSchema = z.object({
  email: z.string().email({ message: "有効なメールアドレスを入力してください。" }),
  password: z.string()
    .min(6, { message: "パスワードは6文字以上で入力してください。" })
    .regex(/^[a-zA-Z0-9]+$/, { message: "パスワードは半角英数字のみ使用できます。" }),
});

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLineConsentModal, setShowLineConsentModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

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
        case "CredentialsSignin":
          setError("メールアドレスまたはパスワードが正しくありません。");
          break;
        default:
          setError(`ログインエラーが発生しました: ${nextAuthError}`);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (status === "authenticated") {
      const callbackUrl = searchParams.get("callbackUrl") || "/map";
      router.replace(callbackUrl);
    }
  }, [status, router, searchParams]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    await signIn("google", { redirect: false });
  };

  const handleLineLogin = () => {
    setShowLineConsentModal(true);
  };

  const handleConfirmLineLogin = async () => {
    setShowLineConsentModal(false);
    setIsLoading(true);
    setError(null);
    await signIn("line", { redirect: false });
  };

  const handleCredentialsLogin = async (values: z.infer<typeof loginFormSchema>) => {
    setIsLoading(true);
    setError(null);
    const result = await signIn("credentials", {
      redirect: false,
      email: values.email,
      password: values.password,
    });

    if (result?.error) {
      setError("メールアドレスまたはパスワードが正しくありません。");
      console.error("Credentials login error:", result.error);
    } else {
      const callbackUrl = searchParams.get("callbackUrl") || "/timeline";
      router.replace(callbackUrl);
    }
    setIsLoading(false);
  };

  const handleContinueWithoutLogin = () => {
    router.push("/timeline");
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
          className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#73370c]/5"
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="bg-white p-8 sm:p-10 rounded-xl shadow-xl w-full max-w-md text-center border border-[#73370c]/10"
          >
            <motion.h1 
              className="text-3xl sm:text-4xl font-bold text-[#73370c] mb-4"
              initial={{ letterSpacing: "-0.05em" }}
              animate={{ letterSpacing: "0em" }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              ログインして<br />素敵な体験を始めよう
            </motion.h1>
            <p className="text-[#73370c]/60 mb-8 text-base sm:text-base">
              ログインすると、お気に入り機能や<br />投稿機能を使用できます
            </p>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-100 border border-red-400 text-red-700 p-3 rounded-md mb-6 flex items-start space-x-2"
              >
                <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-left">{error}</p>
              </motion.div>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCredentialsLogin)} className="space-y-4 mb-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#73370c] text-left block">メールアドレス</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="例: user@example.com"
                          {...field}
                          className="text-[#73370c] border-[#73370c]/20 focus-visible:ring-[#73370c]"
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#73370c] text-left block">パスワード</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="半角英数字6文字以上"
                            {...field}
                            className="pr-10 text-[#73370c] border-[#73370c]/20 focus-visible:ring-[#73370c]"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-1 hover:bg-transparent"
                            onClick={() => setShowPassword((prev) => !prev)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-[#73370c]/60" />
                            ) : (
                              <Eye className="h-4 w-4 text-[#73370c]/60" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-500 text-xs" />
                    </FormItem>
                  )}
                />
                <Link href="/forgot-password">
                  <p className="text-sm text-[#73370c]/70 hover:underline text-right mt-2 cursor-pointer">
                    パスワードをお忘れですか？
                  </p>
                </Link>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#73370c] hover:bg-[#73370c]/90 text-white text-base sm:text-lg py-6 sm:py-7 shadow-md rounded-lg transition-colors"
                    style={{ fontSize: '16px' }}
                  >
                    {isLoading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <span className="font-medium">メールアドレスでログイン</span>
                    )}
                  </Button>
                </motion.div>
              </form>
            </Form>

            <div className="relative flex justify-center text-xs uppercase mb-6">
              <span className="bg-white px-2 text-[#73370c]/60">または</span>
            </div>
            
            <motion.div whileTap={{ scale: 0.98 }} className="mb-4">
              <Button 
                onClick={handleGoogleLogin}
                disabled={isLoading}
                variant="outline"
                className="w-full border-[#73370c]/20 hover:bg-[#73370c]/30 text-[#73370c] text-base sm:text-lg py-6 sm:py-7 shadow-md flex items-center justify-center space-x-3 rounded-lg transition-colors"
                style={{ fontSize: '16px' }}
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <GoogleIcon className="w-6 h-6" />
                    <span className="font-medium">Googleで続ける</span>
                  </>
                )}
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mb-6">
              <Link href="/register" className="w-full">
                <Button
                  variant="ghost"
                  className="w-full bg-[#73370c] hover:bg-[#73370c]/90 text-white text-base sm:text-lg py-6 sm:py-7 shadow-md rounded-lg transition-colors"
                  style={{ fontSize: '16px' }}
                >
                  <span>新規登録</span>
                </Button>
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mb-6">
              <Button
                onClick={handleContinueWithoutLogin}
                variant="ghost"
                className="w-full text-[#73370c]/70 hover:text-[#73370c] hover:bg-[#73370c]/5 text-sm sm:text-base py-4 flex items-center justify-center space-x-2 rounded-lg transition-colors border border-[#73370c]/10"
                style={{ fontSize: '16px' }}
              >
                <span>ログインせず続ける</span>
              </Button>
            </motion.div>

            <p className="text-xs text-[#73370c]/60 mt-4">
              ログインすることで、
              <a href="/terms/terms-of-service" className="underline hover:text-[#73370c] transition-colors">利用規約</a>および
              <a href="/terms/privacy-policy" className="underline hover:text-[#73370c] transition-colors">プライバシーポリシー</a>
              に同意したものとみなされます。
            </p>
          </motion.div>
        </motion.div>

        <LineConsentModal
          isOpen={showLineConsentModal}
          onClose={() => {
            setShowLineConsentModal(false);
            setIsLoading(false);
          }}
          onConfirm={handleConfirmLineLogin}
        />
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