"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AppLayout from "@/app/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
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

// フォームのバリデーションスキーマを定義
const registerFormSchema = z.object({
  email: z.string().email({ message: "有効なメールアドレスを入力してください。" }),
  password: z.string()
    .min(6, { message: "パスワードは6文字以上で入力してください。" })
    .regex(/^[a-zA-Z0-9]+$/, { message: "パスワードは半角英数字のみ使用できます。" }),
  confirmPassword: z.string()
    .min(6, { message: "パスワード確認は6文字以上で入力してください。" })
    .regex(/^[a-zA-Z0-9]+$/, { message: "パスワード確認は半角英数字のみ使用できます。" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "パスワードが一致しません。",
  path: ["confirmPassword"], // エラーをconfirmPasswordフィールドに表示
});

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // React Hook Formの設定
  const form = useForm<z.infer<typeof registerFormSchema>>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof registerFormSchema>) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "登録成功",
          description: "アカウントが作成されました。ログインしてください。",
        });
        router.push("/login?success=registered"); // 登録成功後、ログインページへリダイレクト
      } else {
        toast({
          title: "登録失敗",
          description: data.error || "アカウントの作成中にエラーが発生しました。",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "エラー",
        description: "ネットワークエラーが発生しました。",
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
          <motion.h1
            className="text-3xl sm:text-4xl font-bold text-[#73370c] mb-4"
            initial={{ letterSpacing: "-0.05em" }}
            animate={{ letterSpacing: "0em" }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            新規アカウント作成
          </motion.h1>
          <p className="text-[#73370c]/70 mb-8 text-sm sm:text-base">
            メールアドレスとパスワードで新しいアカウントを作成します。
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mb-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#73370c]">メールアドレス</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="メールアドレス"
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
                    <FormLabel className="text-[#73370c]">パスワード</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="パスワード (半角英数字6文字以上)"
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
                          placeholder="パスワードを再入力"
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
                    <span className="font-medium">アカウントを作成</span>
                  )}
                </Button>
              </motion.div>
            </form>
          </Form>

          <div className="relative flex justify-center text-xs uppercase mb-6">
            <span className="bg-white px-2 text-[#73370c]/60">または</span>
          </div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mb-6">
            <Link href="/login" className="w-full">
              <Button
                variant="ghost"
                className="w-full text-[#73370c]/70 hover:text-[#73370c] hover:bg-[#73370c]/5 text-sm sm:text-base py-4 flex items-center justify-center space-x-2 rounded-lg transition-colors border border-[#73370c]/10"
                style={{ fontSize: '16px' }}
              >
                <span>ログインページに戻る</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>

          <p className="text-xs text-[#73370c]/60 mt-4">
            登録することで、
            <a href="/terms" className="underline hover:text-[#73370c] transition-colors">利用規約</a>および
            <a href="/privacy" className="underline hover:text-[#73370c] transition-colors">プライバシーポリシー</a>
            に同意したものとみなされます。
          </p>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}