"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
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

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "有効なメールアドレスを入力してください。" }),
});

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof forgotPasswordSchema>) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: values.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(`${data.error}${data.retryAfter ? ` ${data.retryAfter}秒後に再試行してください。` : ''}`);
        }
        throw new Error(data.error || 'パスワードリセットメールの送信に失敗しました。');
      }

      toast({
        title: "メールを送信しました",
        description: "パスワードリセットのリンクをメールで送信しました。ご確認ください。",
      });

      router.push("/login?message=reset_email_sent");

    } catch (error: any) {
      console.error("Forgot password submit error:", error);
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
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
            className="mb-6"
          >
            <Mail className="h-16 w-16 text-[#73370c] mx-auto mb-4" />
          </motion.div>

          <motion.h1
            className="text-3xl sm:text-4xl font-bold text-[#73370c] mb-4"
            initial={{ letterSpacing: "-0.05em" }}
            animate={{ letterSpacing: "0em" }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            パスワードをリセット
          </motion.h1>
          <p className="text-[#73370c]/70 mb-8 text-sm sm:text-base">
            登録済みのメールアドレスを入力してください。<br />
            パスワードリセットのためのリンクを送信します。
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
                    <span className="font-medium">リセットメールを送信</span>
                  )}
                </Button>
              </motion.div>
            </form>
          </Form>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mb-6">
            <Link href="/login" className="w-full">
              <Button
                variant="ghost"
                className="w-full text-[#73370c]/70 hover:text-[#73370c] hover:bg-[#73370c]/5 text-sm sm:text-base py-4 flex items-center justify-center space-x-2 rounded-lg transition-colors border border-[#73370c]/10"
                style={{ fontSize: '16px' }}
              >
                <ArrowLeft className="h-4 w-4" />
                <span>ログインページに戻る</span>
              </Button>
            </Link>
          </motion.div>

          <div className="text-xs text-[#73370c]/60 space-y-2">
            <p>メールが届かない場合は、迷惑メールフォルダもご確認ください。</p>
            <p>⏰ リセットリンクの有効期限は1時間です。</p>
            <p>🔄 1時間に5回まで送信可能です。</p>
          </div>
        </motion.div>
      </motion.div>
  );
}