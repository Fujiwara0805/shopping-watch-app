"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Star, 
  Heart, 
  MessageSquare, 
  Send, 
  X, 
  ThumbsUp,
  Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/lib/hooks/use-toast';
import { cn } from '@/lib/utils';
import { COLORS } from '@/lib/constants/colors';
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
  size = 'large' 
}: { 
  rating: number; 
  onRatingChange: (rating: number) => void;
  size?: 'small' | 'large';
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  const starSize = size === 'large' ? 'h-12 w-12' : 'h-8 w-8';

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return '😞 改善が必要';
      case 2: return '😐 普通';
      case 3: return '🙂 良い';
      case 4: return '😊 とても良い';
      case 5: return '🤩 最高！';
      default: return '評価してください';
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex space-x-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.button
            key={star}
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onRatingChange(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="focus:outline-none"
          >
            <Star
              className={cn(
                starSize,
                'transition-colors duration-200',
                (hoverRating >= star || rating >= star)
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-300'
              )}
            />
          </motion.button>
        ))}
      </div>
      <p className="text-lg font-medium text-gray-700">
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

  const { watch, formState: { isValid } } = form;
  const watchedRating = watch('rating');

  const handleSubmit = async (values: FeedbackFormValues) => {
    if (!session?.user?.email) {
      toast({
        title: "⚠️ エラー",
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
        
        // フィードバック送信成功時に永続的なフラグを保存
        const userEmail = session.user.email;
        const feedbackSubmittedKey = `tokudoku_feedback_submitted_${userEmail}`;
        localStorage.setItem(feedbackSubmittedKey, 'true');
        
        toast({
          title: "✅ フィードバックありがとうございます！",
          description: "貴重なご意見をいただき、ありがとうございました",
          duration: 4000,
        });
        
        // 3秒後にモーダルを閉じる
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        const errorData = await response.json();
        toast({
          title: "⚠️ 送信に失敗しました",
          description: errorData.message || "エラーが発生しました。もう一度お試しください。",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('フィードバック送信エラー:', error);
      toast({
        title: "⚠️ 送信に失敗しました",
        description: "ネットワークエラーが発生しました。",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // モーダルを閉じる時の処理
  const handleClose = () => {
    onClose();
  };

  if (!session?.user?.email) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* オーバーレイ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />
          
          {/* モーダルコンテンツ */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {!isSubmitted ? (
              <>
                {/* ヘッダー */}
                <div className="relative p-6 pb-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    className="absolute top-4 right-4 rounded-full"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                  
                  <div className="text-center">
                    <h2 className="text-lg font-bold text-gray-900 mb-3">
                      アプリの評価をお聞かせください
                    </h2>
                    <p className="text-base text-gray-600">
                      より良いアプリにするため、<br />
                      ご意見をお聞かせください。
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
                            <FormLabel className="text-xl font-semibold text-gray-900 flex items-center justify-center">
                              <Star className="h-6 w-6 mr-2 text-yellow-500" />
                              総合評価
                            </FormLabel>
                            <FormControl>
                              <div className="flex justify-center py-4">
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

                      {/* コメント */}
                      <FormField
                        control={form.control}
                        name="comment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xl font-semibold text-gray-900 flex items-center">
                              <MessageSquare className="h-6 w-6 mr-2" style={{ color: COLORS.primary }} />
                              コメント（任意）
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="改善点やご要望があれば..."
                                className="resize-none text-lg"
                                rows={6}
                                style={{ fontSize: '16px' }}
                                {...field}
                              />
                            </FormControl>
                            <p className="text-sm text-gray-500">
                              {field.value?.length || 0}/500文字
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* 送信ボタン */}
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          type="submit"
                          disabled={!isValid || isSubmitting}
                          className="w-full py-4 text-xl font-semibold text-white hover:opacity-90 transition-opacity"
                          style={{ backgroundColor: COLORS.primary }}
                        >
                          {isSubmitting ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full mr-2"
                              />
                              送信中...
                            </>
                          ) : (
                            <>
                              <Send className="h-6 w-6 mr-2" />
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
                  className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
                >
                  <ThumbsUp className="h-10 w-10 text-white" />
                </motion.div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  ありがとうございました！
                </h2>
                <p className="text-xl text-gray-600 mb-6">
                  貴重なご意見をいただき、<br />
                  ありがとうございました。
                </p>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="rounded-lg p-4 border-2"
                  style={{ 
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    borderColor: COLORS.primary
                  }}
                >
                  <div className="flex items-center justify-center mb-2" style={{ color: COLORS.primary }}>
                    <Gift className="h-6 w-6 mr-2" />
                    <span className="font-semibold text-lg">今後もよろしくお願いします</span>
                  </div>
                  <p className="text-base" style={{ color: COLORS.primary }}>
                    引き続きトクドクをお楽しみください！
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
