"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/common/icons/GoogleIcon";
import { Loader2, AlertTriangle, Eye, EyeOff, ArrowLeft, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { trackEvent } from '@/lib/services/analytics';
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
import { AnimatePresence } from "framer-motion";
import { Breadcrumb } from '@/components/seo/breadcrumb';
import { designTokens } from '@/lib/constants/colors';

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
      const callbackUrl = searchParams.get("callbackUrl") || "/profile";
      router.replace(callbackUrl);
    }
  }, [status, router, searchParams]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    trackEvent('login_attempt', { method: 'google' });
    await signIn("google", { redirect: false });
  };

  const handleCredentialsLogin = async (values: z.infer<typeof loginFormSchema>) => {
    setIsLoading(true);
    setError(null);
    trackEvent('login_attempt', { method: 'credentials' });
    const result = await signIn("credentials", {
      redirect: false,
      email: values.email,
      password: values.password,
    });

    if (result?.error) {
      setError("メールアドレスまたはパスワードが正しくありません。");
      console.error("Credentials login error:", result.error);
    } else {
      const callbackUrl = searchParams.get("callbackUrl") || "/profile";
      router.replace(callbackUrl);
    }
    setIsLoading(false);
  };

  // 🔥 戻るボタンの処理を修正（112行目付近）
  const handleGoBack = () => {
    // 常にトップページ（LP画面）に遷移
    router.push('/');
  };

  if (status === "loading" && !isLoading) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center min-h-screen p-4 bg-background"
        >
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
          <p className="text-lg text-muted-foreground">読み込み中...</p>
        </motion.div>
      </>
    );
  }

  if (status === "unauthenticated") {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center min-h-screen p-4"
          style={{ backgroundColor: `${designTokens.colors.primary.base}08` }}
        >
          {/* パンくずリスト */}
          <div className="w-full max-w-md mb-4">
            <Breadcrumb />
          </div>
          
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="p-8 sm:p-10 rounded-xl shadow-xl w-full max-w-md text-center border"
            style={{ backgroundColor: designTokens.colors.background.white, borderColor: `${designTokens.colors.primary.base}20` }}
          >
            <motion.h1 
              className="text-2xl sm:text-3xl font-bold mb-4"
              style={{ color: designTokens.colors.text.primary }}
              initial={{ letterSpacing: "-0.05em" }}
              animate={{ letterSpacing: "0em" }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              ログインして<br />素敵な体験を始めよう
            </motion.h1>
            <p className="mb-8 text-base sm:text-base" style={{ color: designTokens.colors.text.secondary }}>
              ログインすると、コースを作成できます
            </p>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-md mb-6 flex items-start space-x-2"
                style={{ backgroundColor: `${designTokens.colors.functional.error}15`, borderColor: designTokens.colors.functional.error, color: designTokens.colors.functional.error }}
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
                      <FormLabel className="text-left block" style={{ color: designTokens.colors.text.primary }}>メールアドレス</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="例: user@example.com"
                          {...field}
                          className="focus-visible:ring-2"
                          style={{ color: designTokens.colors.text.primary, borderColor: `${designTokens.colors.primary.base}30`, outlineColor: designTokens.colors.primary.base }}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" style={{ color: designTokens.colors.functional.error }} />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-left block" style={{ color: designTokens.colors.text.primary }}>パスワード</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="半角英数字6文字以上"
                            {...field}
                            className="pr-10 focus-visible:ring-2"
                            style={{ color: designTokens.colors.text.primary, borderColor: `${designTokens.colors.primary.base}30`, outlineColor: designTokens.colors.primary.base }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-1 hover:bg-transparent"
                            onClick={() => setShowPassword((prev) => !prev)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" style={{ color: designTokens.colors.text.secondary }} />
                            ) : (
                              <Eye className="h-4 w-4" style={{ color: designTokens.colors.text.secondary }} />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" style={{ color: designTokens.colors.functional.error }} />
                    </FormItem>
                  )}
                />
                <Link href="/forgot-password">
                  <p className="text-sm hover:underline text-right mt-2 cursor-pointer" style={{ color: designTokens.colors.text.secondary }}>
                    パスワードをお忘れですか？
                  </p>
                </Link>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full text-white text-base sm:text-lg py-6 sm:py-7 shadow-md rounded-lg transition-colors"
                    style={{ backgroundColor: designTokens.colors.primary.base, fontSize: '16px' }}
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
              <span className="px-2" style={{ backgroundColor: designTokens.colors.background.white, color: designTokens.colors.text.secondary }}>または</span>
            </div>
            
            <motion.div whileTap={{ scale: 0.98 }} className="mb-4">
              <Button 
                onClick={handleGoogleLogin}
                disabled={isLoading}
                variant="outline"
                className="w-full text-base sm:text-lg py-6 sm:py-7 shadow-md flex items-center justify-center space-x-3 rounded-lg transition-colors"
                style={{ borderColor: `${designTokens.colors.primary.base}30`, color: designTokens.colors.text.primary, fontSize: '16px' }}
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
                  className="w-full text-white text-base sm:text-lg py-6 sm:py-7 shadow-md rounded-lg transition-colors"
                  style={{ backgroundColor: designTokens.colors.primary.base, fontSize: '16px' }}
                >
                  <span>新規登録</span>
                </Button>
              </Link>
            </motion.div>

            {/* 🔥 戻るボタン（285行目付近） */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mb-6">
              <Button
                onClick={handleGoBack}
                variant="ghost"
                className="w-full text-sm sm:text-base py-4 flex items-center justify-center space-x-2 rounded-lg transition-colors border"
                style={{ color: designTokens.colors.text.secondary, borderColor: `${designTokens.colors.primary.base}20`, fontSize: '16px' }}
              >
                <span>トップページに戻る</span>
              </Button>
            </motion.div>

            <p className="text-xs mt-4" style={{ color: designTokens.colors.text.secondary }}>
              ログインすることで、
              <a href="/terms/terms-of-service" className="underline transition-colors" style={{ color: designTokens.colors.text.primary }}>利用規約</a>および
              <a href="/terms/privacy-policy" className="underline transition-colors" style={{ color: designTokens.colors.text.primary }}>プライバシーポリシー</a>
              に同意したものとみなされます。
            </p>
          </motion.div>
        </motion.div>

      </>
    );
  }

  return (
     <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center min-h-screen p-4 bg-background"
        >
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
          <p className="text-lg text-muted-foreground">ようこそ、{session?.user?.name || 'ユーザー'}さん</p>
          <p className="text-sm text-muted-foreground mt-2">まもなくリダイレクトします...</p>
        </motion.div>
      </>
  );
}