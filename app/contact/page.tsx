"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import AppLayout from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const contactSchema = z.object({
  name: z.string().min(1, { message: 'お名前を入力してください。' }).max(50, { message: 'お名前は50文字以内で入力してください。' }),
  email: z.string().min(1, { message: 'メールアドレスを入力してください。' }).email({ message: '有効なメールアドレスを入力してください。' }),
  subject: z.string().min(1, { message: '件名を選択してください。' }),
  message: z.string().min(10, { message: 'お問い合わせ内容は10文字以上入力してください。' }).max(500, { message: 'お問い合わせ内容は500文字以内で入力してください。' }),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const { toast } = useToast();

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
    },
    mode: 'onChange',
  });

  const { formState: { isSubmitting, isValid } } = form;

  const handleSubmit = async (values: ContactFormValues) => {
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        toast({
          title: "お問い合わせありがとうございます！",
          description: "内容を確認後、担当者よりご連絡いたします。",
        });
        form.reset();
      } else {
        const errorData = await response.json();
        toast({
          title: "送信に失敗しました",
          description: errorData.message || "エラーが発生しました。もう一度お試しください。",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('お問い合わせ送信エラー:', error);
      toast({
        title: "送信に失敗しました",
        description: "ネットワークエラーまたはサーバーエラーが発生しました。",
        variant: "destructive",
      });
    }
  };

  const subjectOptions = [
    { value: 'サービスについて', label: 'サービスについて' },
    { value: '技術的な問題', label: '技術的な問題' },
    { value: 'デザインの問題', label: 'デザインの問題' },
    { value: '機能リクエスト', label: '機能リクエスト' },
    { value: 'その他', label: 'その他' },
  ];

  const faqItems = [
    {
      q: 'アプリのアイコンやロゴは何を表していますか？',
      a: 'トクドクのアイコンは伝書鳩です。伝書鳩が「情報を届ける」という意味を込めています。「お店を探す」画面では、ユーザーの現在地を表しています。また、画面左上のアイコンをクリックするとタイムライン画面に戻ります。困った時はアイコンをタップしてください。'
    },
    {
      q: '「タイムライン」と「お店を探す」の違いは何ですか？',
      a: '「タイムライン」は他のユーザーが投稿したお得な情報を新しい順に一覧で見られるページです。一方、「お店を探す」は地図上で店舗を検索し、その店舗の投稿や詳細情報を確認できるページです。'
    },
    {
      q: '投稿の中で見る顔アイコンは何ですか？',
      a: 'お得度を顔文字であらわしています。お得な情報ほど笑顔になります。また、お得度は、投稿者が自由に設定できます。'
    },
    {
      q: '投稿するにはどうすればいいですか？',
      a: '画面下部のナビゲーションバーにある「投稿する」（プラスマークのアイコン）をタップすると、あなたが見つけたお得な情報を簡単に投稿できます。投稿には写真の添付も可能です。'
    },
    {
      q: '位置情報の許可はなぜ必要ですか？',
      a: '「お店を探す」機能で現在地周辺の店舗を検索したり、タイムラインの「周辺から検索」機能で近くのお得情報を表示するために必要となります。許可していただくことで、よりパーソナライズされた情報をお届けできます。'
    },
  ];

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-8 max-w-2xl"
      >        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-8"
        >
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl sm:text-3xl">よくある質問（FAQ）</CardTitle>
              <CardDescription className="text-base sm:text-lg">お問い合わせの前にご確認ください。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-base">
              <Accordion type="single" collapsible className="w-full">
                {faqItems.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.1, duration: 0.3 }}
                  >
                    <AccordionItem value={`item-${index}`}>
                      <AccordionTrigger className="text-lg sm:text-xl text-left hover:no-underline">Q: {item.q}</AccordionTrigger>
                      <AccordionContent className="text-base sm:text-lg">A: {item.a}</AccordionContent>
                    </AccordionItem>
                  </motion.div>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </motion.div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl sm:text-3xl">お問い合わせフォーム</CardTitle>
            <CardDescription className="text-base sm:text-lg">ご不明な点やご要望がございましたら、<br className="sm:hidden"/>お気軽にお問い合わせください。</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                    >
                      <FormItem>
                        <FormLabel className="block text-base sm:text-lg font-medium text-foreground mb-1">
                          お名前 <span className="text-destructive ml-1">＊</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="例: 山田 太郎"
                            className="w-full text-base sm:text-lg"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </motion.div>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2, duration: 0.3 }}
                    >
                      <FormItem>
                        <FormLabel className="block text-base sm:text-lg font-medium text-foreground mb-1">
                          メールアドレス <span className="text-destructive ml-1">＊</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="例: example@email.com"
                            className="w-full text-base sm:text-lg"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </motion.div>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3, duration: 0.3 }}
                    >
                      <FormItem>
                        <FormLabel className="block text-base sm:text-lg font-medium text-foreground mb-1">
                          件名 <span className="text-destructive ml-1">＊</span>
                        </FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value} required>
                            <SelectTrigger className="w-full text-base sm:text-lg">
                              <SelectValue placeholder="選択してください" />
                            </SelectTrigger>
                            <SelectContent>
                              {subjectOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value} className="text-base sm:text-lg">
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </motion.div>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4, duration: 0.3 }}
                    >
                      <FormItem>
                        <FormLabel className="block text-base sm:text-lg font-medium text-foreground mb-1">
                          お問い合わせ内容 <span className="text-destructive ml-1">＊</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            rows={6}
                            placeholder="お問い合わせ内容を具体的にご記入ください。（10文字以上500文字以内）"
                            className="w-full text-base sm:text-lg"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </motion.div>
                  )}
                />

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                >
                  <Button 
                    type="submit" 
                    className="w-full py-3 text-lg sm:text-xl"
                    disabled={isSubmitting || !isValid}
                  >
                    {isSubmitting ? '送信中...' : '送信'}
                  </Button>
                </motion.div>
              </form>
            </Form>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.3 }}
              className="mt-8 pt-6 border-t border-border text-center text-base sm:text-lg text-muted-foreground bg-green-50/50 p-4 rounded-lg"
            >
              <h3 className="font-semibold text-foreground mb-2 text-xl sm:text-2xl">運営情報</h3>
              <p className="text-base sm:text-lg">トクドク開発チーム</p>
              <p className="mt-4 text-sm sm:text-base">
                お問い合わせへの返信は、通常3~5営業日以内に行います。<br/>
                (個人開発のため時間を要してしまいます。大変申し訳ございません)<br/>
                土日祝日は対応が遅れる場合がございますので、あらかじめご了承ください。
              </p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </AppLayout>
  );
}
