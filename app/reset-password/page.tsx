"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import AppLayout from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, Eye, EyeOff } from "lucide-react";
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
import { supabase } from "@/lib/supabaseClient"; // Supabaseクライアントをインポート

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
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    // Supabaseのパスワードリセットフローでは、URLにaccess_tokenとrefresh_tokenが含まれる
    // これらはSupabase Authのクライアントで自動的に処理されるため、明示的に取得する必要はないが、
    // 成功/失敗のハンドリングのため、URLパラメータの存在を確認する
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (accessToken && refreshToken) {
      // Supabaseクライアントが自動的にセッションを処理するため、ここでは特に何もしない
      // ユーザーがこのページに到達した時点で認証状態になっているはず
      console.log("Access token and refresh token found in URL.");
    } else {
      // トークンがない場合、不正なアクセスとして処理
      // toast({
      //   title: "エラー",
      //   description: "不正なパスワードリセットリンクです。",
      //   variant: "destructive",
      // });
      // router.push("/login"); // ログインページに戻すなど
    }
  }, [searchParams, router]);

  const onSubmit = async (values: z.infer<typeof resetPasswordSchema>) => {
    setIsLoading(true);
    try {
      // SupabaseのupdateUser機能を使用してパスワードを更新
      const { data, error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) {
        console.error("Password update error:", error.message);
        toast({
          title: "エラー",
          description: error.message || "パスワードの更新に失敗しました。",
          variant: "destructive",
        });
      } else {
        toast({
          title: "パスワードを更新しました",
          description: "新しいパスワードでログインしてください。",
        });
        setIsResetSuccess(true);
        // パスワード更新後、ログインページにリダイレクト
        router.push("/login?message=password_reset_success");
      }
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
                新しいパスワードでログインしてください。
              </p>
              <Link href="/login" className="w-full">
                <Button
                  className="w-full bg-[#73370c] hover:bg-[#73370c]/90 text-white text-base sm:text-lg py-6 sm:py-7 shadow-md rounded-lg transition-colors"
                  style={{ fontSize: '16px' }}
                >
                  ログインページへ
                </Button>
              </Link>
            </motion.div>
          ) : (
            <>
              <motion.h1
                className="text-3xl sm:text-4xl font-bold text-[#73370c] mb-4"
                initial={{ letterSpacing: "-0.05em" }}
                animate={{ letterSpacing: "0em" }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                新しいパスワードを設定
              </motion.h1>
              <p className="text-[#73370c]/70 mb-8 text-sm sm:text-base">
                新しいパスワードを入力してください。
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
            </>
          )}
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}
