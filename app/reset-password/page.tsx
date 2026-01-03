"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, Eye, EyeOff, AlertTriangle, Key } from "lucide-react";
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
import Link from "next/link";

const resetPasswordSchema = z.object({
  password: z.string().min(6, { message: "パスワードは6文字以上で入力してください。" }),
  confirmPassword: z.string().min(6, { message: "パスワード確認は6文字以上で入力してください。" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "パスワードが一致しません。",
  path: ["confirmPassword"],
});

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isResetSuccess, setIsResetSuccess] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const token = searchParams.get('token');

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenError('無効なリセットリンクです。トークンが見つかりません。');
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`, {
          method: 'GET',
        });

        const data = await response.json();

        if (response.ok && data.valid) {
          setIsValidToken(true);
        } else {
          setTokenError(data.error || '無効なリセットリンクです。');
        }
      } catch (error) {
        console.error('トークン検証エラー:', error);
        setTokenError('リセットリンクの検証中にエラーが発生しました。');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const onSubmit = async (values: z.infer<typeof resetPasswordSchema>) => {
    if (!token) {
      toast({
        title: "エラー",
        description: "無効なリセットリンクです。",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          newPassword: values.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'パスワードの更新に失敗しました。');
      }

      toast({
        title: "パスワードを更新しました",
        description: "新しいパスワードでログインしてください。",
      });

      setIsResetSuccess(true);

      // 3秒後にログインページにリダイレクト
      setTimeout(() => {
        router.push("/login?message=password_reset_success");
      }, 3000);

    } catch (error: any) {
      console.error("Reset password submit error:", error);
      toast({
        title: "エラー",
        description: error.message || "予期せぬエラーが発生しました。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // トークン検証中の表示
  if (isValidating) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#73370c]/5"
      >
        <motion.div className="bg-white p-8 sm:p-10 rounded-xl shadow-xl w-full max-w-md text-center border border-[#73370c]/10">
          <Loader2 className="h-16 w-16 animate-spin text-[#73370c] mx-auto mb-6" />
          <p className="text-lg text-[#73370c]">リセットリンクを確認中...</p>
          <p className="text-sm text-[#73370c]/60 mt-2">しばらくお待ちください</p>
        </motion.div>
      </motion.div>
    );
  }

  // 無効なトークンの場合
  if (!isValidToken && tokenError) {
    return (
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
          className="bg-white p-8 sm:p-10 rounded-xl shadow-xl w-full max-w-md text-center border border-red-200"
        >
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl sm:text-4xl font-bold text-red-600 mb-4">
            無効なリンク
          </h1>
          <p className="text-red-700/80 mb-8 text-sm sm:text-base leading-relaxed">
            {tokenError}
          </p>
          
          <div className="space-y-4">
            <Link href="/forgot-password" className="w-full">
              <Button
                className="w-full bg-[#73370c] hover:bg-[#73370c]/90 text-white text-base sm:text-lg py-6 sm:py-7 shadow-md rounded-lg transition-colors"
                style={{ fontSize: '16px' }}
              >
                新しいリセットリンクを取得
              </Button>
            </Link>
            <Link href="/login" className="w-full">
              <Button
                variant="ghost"
                className="w-full text-[#73370c]/70 hover:text-[#73370c] hover:bg-[#73370c]/5 text-sm sm:text-base py-4 rounded-lg transition-colors border border-[#73370c]/10"
                style={{ fontSize: '16px' }}
              >
                ログインページに戻る
              </Button>
            </Link>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
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
          {isResetSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex flex-col items-center"
            >
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h1 className="text-3xl sm:text-4xl font-bold text-[#73370c] mb-4">
                パスワードリセット完了
              </h1>
              <p className="text-[#73370c]/70 mb-8 text-sm sm:text-base">
                パスワードが正常に更新されました。<br />
                自動的にログインページに移動します...
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <motion.div 
                  className="bg-[#73370c] h-2 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3 }}
                />
              </div>
              <Link href="/login" className="w-full">
                <Button
                  className="w-full bg-[#73370c] hover:bg-[#73370c]/90 text-white text-base sm:text-lg py-6 sm:py-7 shadow-md rounded-lg transition-colors"
                  style={{ fontSize: '16px' }}
                >
                  すぐにログインページへ
                </Button>
              </Link>
            </motion.div>
          ) : (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
                className="mb-6"
              >
                <Key className="h-16 w-16 text-[#73370c] mx-auto mb-4" />
              </motion.div>

              <motion.h1
                className="text-3xl sm:text-4xl font-bold text-[#73370c] mb-4"
                initial={{ letterSpacing: "-0.05em" }}
                animate={{ letterSpacing: "0em" }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                新しいパスワードを設定
              </motion.h1>
              <p className="text-[#73370c]/70 mb-8 text-sm sm:text-base">
                安全で覚えやすいパスワードを入力してください。
              </p>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mb-6">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#73370c]">新しいパスワード</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="新しいパスワード (6文字以上)"
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
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#73370c]">パスワード確認</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="新しいパスワードを再入力"
                              {...field}
                              className="pr-10 text-[#73370c] border-[#73370c]/20 focus-visible:ring-[#73370c]"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-1 hover:bg-transparent"
                              onClick={() => setShowConfirmPassword((prev) => !prev)}
                            >
                              {showConfirmPassword ? (
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
                        <span className="font-medium">パスワードをリセット</span>
                      )}
                    </Button>
                  </motion.div>
                </form>
              </Form>

              <div className="text-xs text-[#73370c]/60 space-y-1">
                <p>💡 パスワードの推奨事項：</p>
                <p>• 6文字以上で設定してください</p>
                <p>• 数字と文字を組み合わせると安全です</p>
                <p>• 他のサービスとは異なるパスワードを使用してください</p>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
  );
}