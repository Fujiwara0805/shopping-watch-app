"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Star,
  MessageSquare,
  Send,
  X,
  ThumbsUp,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/lib/hooks/use-toast';
import { cn } from '@/lib/utils';
import { designTokens } from '@/lib/constants/colors';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const feedbackSchema = z.object({
  rating: z.number().min(1, { message: '評価を選択してください' }).max(5),
  comment: z.string().max(500, { message: 'コメントは500文字以内で入力してください' }).optional(),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 星評価コンポーネント
const StarRating = ({
  rating,
  onRatingChange,
}: {
  rating: number;
  onRatingChange: (rating: number) => void;
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return '改善が必要';
      case 2: return '普通';
      case 3: return '良い';
      case 4: return 'とても良い';
      case 5: return '最高！';
      default: return 'タップして評価';
    }
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="flex space-x-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.button
            key={star}
            type="button"
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onRatingChange(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="focus:outline-none"
          >
            <Star
              className={cn(
                'h-10 w-10 transition-all duration-200',
                (hoverRating >= star || rating >= star)
                  ? 'fill-current'
                  : ''
              )}
              style={{
                color: (hoverRating >= star || rating >= star)
                  ? designTokens.colors.accent.gold
                  : designTokens.colors.secondary.stone,
              }}
            />
          </motion.button>
        ))}
      </div>
      <p
        className="text-sm font-medium"
        style={{ color: designTokens.colors.text.secondary }}
      >
        {getRatingText(hoverRating || rating)}
      </p>
    </div>
  );
};

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      rating: 0,
      comment: '',
    },
    mode: 'onChange',
  });

  const { formState: { isValid } } = form;

  const handleSubmit = async (values: FeedbackFormValues) => {
    if (!session?.user?.email) {
      toast({
        title: "エラー",
        description: "ログインが必要です",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: session.user.email,
          rating: values.rating,
          comment: values.comment,
          userAgent: navigator.userAgent,
          timestamp: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);

        const userEmail = session.user.email;
        const feedbackSubmittedKey = `tokudoku_feedback_submitted_${userEmail}`;
        localStorage.setItem(feedbackSubmittedKey, 'true');

        toast({
          title: "フィードバックありがとうございます",
          description: "貴重なご意見をいただき、ありがとうございました",
          duration: 4000,
        });

        setTimeout(() => {
          onClose();
          setIsSubmitted(false);
          form.reset();
        }, 3000);
      } else {
        const errorData = await response.json();
        toast({
          title: "送信に失敗しました",
          description: errorData.message || "エラーが発生しました。もう一度お試しください。",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('フィードバック送信エラー:', error);
      toast({
        title: "送信に失敗しました",
        description: "ネットワークエラーが発生しました。",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    if (!isSubmitted) {
      form.reset();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          {/* オーバーレイ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            style={{
              background: `${designTokens.colors.primary.base}40`,
              backdropFilter: 'blur(8px)',
            }}
            onClick={handleClose}
          />

          {/* モーダルコンテンツ */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative max-w-md w-full max-h-[90vh] overflow-y-auto rounded-2xl"
            style={{
              background: designTokens.colors.background.white,
              boxShadow: designTokens.elevation.dramatic,
              border: `1px solid ${designTokens.colors.secondary.stone}30`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {!isSubmitted ? (
              <>
                {/* ヘッダー */}
                <div className="relative p-6 pb-4">
                  {/* 閉じるボタン */}
                  <motion.button
                    whileHover={{ rotate: 90 }}
                    transition={{ duration: 0.2 }}
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 rounded-full transition-colors"
                    style={{ color: designTokens.colors.text.muted }}
                  >
                    <X className="h-5 w-5" />
                  </motion.button>

                  <div className="text-center">
                    {/* アイコン */}
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                      style={{
                        background: `${designTokens.colors.accent.lilac}18`,
                        color: designTokens.colors.accent.lilac,
                      }}
                    >
                      <MessageSquare className="h-7 w-7" />
                    </div>
                    <h2
                      className="text-xl font-semibold mb-2"
                      style={{
                        fontFamily: designTokens.typography.display,
                        color: designTokens.colors.primary.base,
                      }}
                    >
                      ご意見をお聞かせください
                    </h2>
                    <p
                      className="text-sm leading-relaxed"
                      style={{
                        fontFamily: designTokens.typography.body,
                        color: designTokens.colors.text.secondary,
                      }}
                    >
                      より良いサービスにするため、<br />
                      あなたの声をお聞かせください。
                    </p>
                  </div>
                </div>

                {/* フォーム */}
                <div className="px-6 pb-6">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                      {/* 星評価 */}
                      <FormField
                        control={form.control}
                        name="rating"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel
                              className="text-sm font-semibold flex items-center justify-center gap-2"
                              style={{ color: designTokens.colors.text.primary }}
                            >
                              <Star className="h-4 w-4" style={{ color: designTokens.colors.accent.gold }} />
                              総合評価
                            </FormLabel>
                            <FormControl>
                              <div className="flex justify-center py-3">
                                <StarRating
                                  rating={field.value}
                                  onRatingChange={field.onChange}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* 区切り線 */}
                      <div
                        className="h-px w-full"
                        style={{ background: `${designTokens.colors.secondary.stone}30` }}
                      />

                      {/* コメント */}
                      <FormField
                        control={form.control}
                        name="comment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel
                              className="text-sm font-semibold flex items-center gap-2"
                              style={{ color: designTokens.colors.text.primary }}
                            >
                              <MessageSquare className="h-4 w-4" style={{ color: designTokens.colors.secondary.fern }} />
                              コメント（任意）
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="改善点やご要望があれば..."
                                className="resize-none rounded-xl"
                                rows={4}
                                style={{
                                  fontSize: '16px',
                                  borderColor: `${designTokens.colors.secondary.stone}50`,
                                  fontFamily: designTokens.typography.body,
                                }}
                                {...field}
                              />
                            </FormControl>
                            <p
                              className="text-xs text-right"
                              style={{ color: designTokens.colors.text.muted }}
                            >
                              {field.value?.length || 0}/500
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* 送信ボタン */}
                      <motion.div whileTap={{ scale: 0.98 }}>
                        <Button
                          type="submit"
                          disabled={!isValid || isSubmitting}
                          className="w-full py-3 rounded-xl font-semibold text-base transition-all hover:opacity-90"
                          style={{
                            background: designTokens.colors.accent.lilac,
                            color: designTokens.colors.text.inverse,
                          }}
                        >
                          {isSubmitting ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mr-2"
                              />
                              送信中...
                            </>
                          ) : (
                            <>
                              <Send className="h-5 w-5 mr-2" />
                              フィードバックを送信
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </form>
                  </Form>
                </div>
              </>
            ) : (
              /* 送信完了画面 */
              <div className="p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
                  style={{
                    background: `${designTokens.colors.functional.success}15`,
                    color: designTokens.colors.functional.success,
                  }}
                >
                  <ThumbsUp className="h-8 w-8" />
                </motion.div>

                <h2
                  className="text-xl font-semibold mb-3"
                  style={{
                    fontFamily: designTokens.typography.display,
                    color: designTokens.colors.primary.base,
                  }}
                >
                  ありがとうございました
                </h2>
                <p
                  className="text-sm mb-6 leading-relaxed"
                  style={{
                    fontFamily: designTokens.typography.body,
                    color: designTokens.colors.text.secondary,
                  }}
                >
                  貴重なご意見をいただき、<br />
                  ありがとうございました。
                </p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="rounded-xl p-4"
                  style={{
                    background: `${designTokens.colors.accent.gold}15`,
                    border: `1px solid ${designTokens.colors.accent.gold}30`,
                  }}
                >
                  <div
                    className="flex items-center justify-center gap-2 mb-1"
                    style={{ color: designTokens.colors.accent.goldDark }}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span
                      className="font-semibold text-sm"
                      style={{ fontFamily: designTokens.typography.display }}
                    >
                      今後もよろしくお願いします
                    </span>
                  </div>
                  <p
                    className="text-xs"
                    style={{ color: designTokens.colors.text.secondary }}
                  >
                    引き続きTOKUDOKUをお楽しみください
                  </p>
                </motion.div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
