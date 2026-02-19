"use client";

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MessageSquarePlus, X, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { designTokens } from '@/lib/constants';

interface ReviewData {
  id: string;
  post_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  visited_date: string | null;
  created_at: string;
  guest_nickname: string | null;
  app_profiles: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface EventReviewSectionProps {
  postId: string;
}

function StarRating({ rating, size = 'md', interactive = false, onChange }: {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (rating: number) => void;
}) {
  const [hoverRating, setHoverRating] = useState(0);
  const sizeMap = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' };
  const cls = sizeMap[size];

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = interactive ? (hoverRating || rating) >= i : rating >= i;
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            className={interactive ? 'cursor-pointer transition-transform hover:scale-110' : 'cursor-default'}
            onMouseEnter={() => interactive && setHoverRating(i)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            onClick={() => interactive && onChange?.(i)}
          >
            <Star
              className={cls}
              style={{
                color: filled ? designTokens.colors.accent.gold : designTokens.colors.secondary.stone,
                fill: filled ? designTokens.colors.accent.gold : 'none',
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

function ReviewFormModal({ postId, onClose, onSubmitted }: {
  postId: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { data: session } = useSession();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [visitedDate, setVisitedDate] = useState('');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('評価を選択してください。');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/event-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          rating,
          title: title.trim() || null,
          comment: comment.trim() || null,
          visited_date: visitedDate || null,
          guest_nickname: !session?.user ? nickname.trim() || null : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || '投稿に失敗しました。');
        return;
      }

      onSubmitted();
      onClose();
    } catch {
      setError('通信エラーが発生しました。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
        style={{
          background: designTokens.colors.background.white,
          boxShadow: designTokens.elevation.high,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: `${designTokens.colors.secondary.stone}30` }}>
          <h3 className="text-lg font-semibold" style={{ fontFamily: designTokens.typography.display, color: designTokens.colors.text.primary }}>
            感想・レビューを書く
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5" style={{ color: designTokens.colors.text.muted }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Nickname for guests */}
          {!session?.user && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: designTokens.colors.text.secondary }}>
                ニックネーム（任意）
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={30}
                placeholder="匿名さん"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2"
                style={{
                  background: designTokens.colors.background.mist,
                  border: `1px solid ${designTokens.colors.secondary.stone}40`,
                  color: designTokens.colors.text.primary,
                }}
              />
              <p className="text-xs mt-1" style={{ color: designTokens.colors.text.muted }}>
                未入力の場合「匿名ユーザー」として投稿されます
              </p>
            </div>
          )}

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: designTokens.colors.text.secondary }}>
              評価 <span style={{ color: designTokens.colors.functional.error }}>*</span>
            </label>
            <StarRating rating={rating} size="lg" interactive onChange={setRating} />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: designTokens.colors.text.secondary }}>
              タイトル
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="ひと言で感想を（任意）"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2"
              style={{
                background: designTokens.colors.background.mist,
                border: `1px solid ${designTokens.colors.secondary.stone}40`,
                color: designTokens.colors.text.primary,
              }}
            />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: designTokens.colors.text.secondary }}>
              感想・レビュー
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="イベントに参加した感想を書いてください（任意）"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2 resize-none"
              style={{
                background: designTokens.colors.background.mist,
                border: `1px solid ${designTokens.colors.secondary.stone}40`,
                color: designTokens.colors.text.primary,
              }}
            />
            <p className="text-xs mt-1 text-right" style={{ color: designTokens.colors.text.muted }}>
              {comment.length}/1000
            </p>
          </div>

          {/* Visited Date */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: designTokens.colors.text.secondary }}>
              訪問日
            </label>
            <input
              type="date"
              value={visitedDate}
              onChange={(e) => setVisitedDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2"
              style={{
                background: designTokens.colors.background.mist,
                border: `1px solid ${designTokens.colors.secondary.stone}40`,
                color: designTokens.colors.text.primary,
              }}
            />
          </div>

          {error && (
            <p className="text-sm font-medium" style={{ color: designTokens.colors.functional.error }}>
              {error}
            </p>
          )}

          <div
            className="px-4 py-3 rounded-xl text-xs leading-relaxed"
            style={{
              background: `${designTokens.colors.accent.gold}10`,
              border: `1px solid ${designTokens.colors.accent.gold}30`,
              color: designTokens.colors.text.secondary,
            }}
          >
            ⚠️ 投稿したレビューは後から削除・編集することができません。内容をよくご確認のうえ投稿してください。
          </div>

          <Button
            type="submit"
            disabled={submitting || rating === 0}
            className="w-full h-12 rounded-xl font-semibold"
            style={{
              background: rating > 0 ? designTokens.colors.accent.lilac : designTokens.colors.secondary.stone,
              color: designTokens.colors.text.inverse,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? '投稿中...' : 'レビューを投稿'}
          </Button>

          {!session?.user && (
            <p className="text-xs text-center" style={{ color: designTokens.colors.text.muted }}>
              ログインなしで投稿できます
            </p>
          )}
        </form>
      </motion.div>
    </motion.div>
  );
}

export function EventReviewSection({ postId }: EventReviewSectionProps) {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch(`/api/event-reviews?post_id=${postId}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const getReviewerName = (review: ReviewData): string => {
    if (review.app_profiles?.display_name && review.app_profiles.display_name !== 'ゲスト') {
      return review.app_profiles.display_name;
    }
    if (review.guest_nickname) {
      return review.guest_nickname;
    }
    return '匿名ユーザー';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquarePlus className="h-5 w-5" style={{ color: designTokens.colors.accent.lilac }} />
          <h2 className="text-lg font-semibold" style={{ fontFamily: designTokens.typography.display, color: designTokens.colors.text.primary }}>
            感想・レビュー
          </h2>
          {reviews.length > 0 && (
            <span className="text-sm" style={{ color: designTokens.colors.text.muted }}>
              ({reviews.length}件)
            </span>
          )}
        </div>

        {reviews.length > 0 && (
          <div className="flex items-center gap-1.5">
            <StarRating rating={Math.round(averageRating)} size="sm" />
            <span className="text-sm font-semibold" style={{ color: designTokens.colors.text.primary }}>
              {averageRating.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Write Review Button */}
      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="mb-5">
        <Button
          onClick={() => setShowForm(true)}
          className="w-full h-12 rounded-xl font-semibold text-base"
          style={{
            background: `${designTokens.colors.accent.gold}15`,
            color: designTokens.colors.accent.goldDark || designTokens.colors.text.primary,
            border: `1px solid ${designTokens.colors.accent.gold}40`,
          }}
        >
          <MessageSquarePlus className="mr-2 h-5 w-5" />
          感想・レビューを書く
        </Button>
      </motion.div>

      {/* Reviews List */}
      {loading ? (
        <div className="text-center py-6">
          <p className="text-sm" style={{ color: designTokens.colors.text.muted }}>読み込み中...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div
          className="text-center py-8 rounded-2xl"
          style={{ background: designTokens.colors.background.cloud }}
        >
          <MessageSquarePlus className="h-10 w-10 mx-auto mb-3" style={{ color: designTokens.colors.text.muted }} />
          <p className="text-sm" style={{ color: designTokens.colors.text.secondary }}>
            まだレビューはありません。<br />最初のレビューを書いてみましょう！
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl"
              style={{
                background: designTokens.colors.background.cloud,
                border: `1px solid ${designTokens.colors.secondary.stone}20`,
              }}
            >
              {/* Reviewer info & rating */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden"
                    style={{ background: `${designTokens.colors.accent.lilac}20` }}
                  >
                    {review.app_profiles?.avatar_url ? (
                      <img
                        src={review.app_profiles.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4" style={{ color: designTokens.colors.accent.lilac }} />
                    )}
                  </div>
                  <span className="text-sm font-medium" style={{ color: designTokens.colors.text.primary }}>
                    {getReviewerName(review)}
                  </span>
                </div>
                <StarRating rating={review.rating} size="sm" />
              </div>

              {/* Title */}
              {review.title && (
                <p className="font-semibold text-sm mb-1" style={{ color: designTokens.colors.text.primary }}>
                  {review.title}
                </p>
              )}

              {/* Comment */}
              {review.comment && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: designTokens.colors.text.secondary }}>
                  {review.comment}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center gap-3 mt-3">
                {review.visited_date && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: designTokens.colors.text.muted }}>
                    <Calendar className="h-3 w-3" />
                    {new Date(review.visited_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}に訪問
                  </span>
                )}
                <span className="text-xs" style={{ color: designTokens.colors.text.muted }}>
                  {new Date(review.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Review Form Modal */}
      <AnimatePresence>
        {showForm && (
          <ReviewFormModal
            postId={postId}
            onClose={() => setShowForm(false)}
            onSubmitted={fetchReviews}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
