'use client';

import { useState, useEffect } from 'react';
import { CustomModal } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from 'next-auth/react';
import { useToast } from '@/lib/hooks/use-toast';
import { Loader2, Gift, MapPin, Trophy, Star } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { designTokens } from '@/lib/constants/colors';

interface CheckIn {
  id: string;
  event_name: string;
  checked_in_at: string;
}

const TOTAL_STAMPS = 9;

const StampCell = ({
  checkIn,
  index,
  total,
}: {
  checkIn: CheckIn | null;
  index: number;
  total: number;
}) => {
  const isFilled = !!checkIn;
  const isNext = !isFilled && index === total;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, rotateY: 90 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.06,
        type: 'spring',
        stiffness: 200,
        damping: 20,
      }}
      className="relative aspect-square rounded-2xl overflow-hidden"
      style={{
        background: isFilled
          ? `linear-gradient(135deg, ${designTokens.colors.accent.gold}15, ${designTokens.colors.accent.lilac}10)`
          : isNext
            ? `linear-gradient(135deg, ${designTokens.colors.accent.gold}08, transparent)`
            : designTokens.colors.background.mist,
        border: isFilled
          ? `2px solid ${designTokens.colors.accent.gold}60`
          : isNext
            ? `2px dashed ${designTokens.colors.accent.gold}40`
            : `1.5px solid ${designTokens.colors.secondary.stone}30`,
        boxShadow: isFilled ? designTokens.elevation.low : 'none',
      }}
    >
      {isFilled ? (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.06 + 0.2, type: 'spring', stiffness: 300 }}
          className="flex flex-col items-center justify-center h-full p-1.5 sm:p-2"
        >
          {/* Stamp icon with shine effect */}
          <div className="relative w-9 h-9 sm:w-11 sm:h-11 mb-0.5">
            <Image
              src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png"
              alt="トクドク"
              fill
              className="object-contain drop-shadow-sm"
            />
            {/* Shine overlay */}
            <motion.div
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: '200%', opacity: [0, 0.6, 0] }}
              transition={{ delay: index * 0.1 + 0.5, duration: 0.8 }}
              className="absolute inset-0 w-1/3 skew-x-[-20deg]"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)' }}
            />
          </div>
          <p
            className="text-[9px] sm:text-[10px] font-bold text-center line-clamp-2 leading-tight"
            style={{ color: designTokens.colors.primary.dark }}
          >
            {checkIn.event_name}
          </p>
          <p
            className="text-[8px] sm:text-[9px] mt-0.5"
            style={{ color: designTokens.colors.text.muted }}
          >
            {new Date(checkIn.checked_in_at).toLocaleDateString('ja-JP', {
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full">
          {isNext ? (
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <MapPin
                className="w-5 h-5 sm:w-6 sm:h-6"
                style={{ color: `${designTokens.colors.accent.gold}80` }}
              />
            </motion.div>
          ) : (
            <div
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2"
              style={{ borderColor: `${designTokens.colors.secondary.stone}30` }}
            />
          )}
          <span
            className="text-[9px] mt-1 font-medium"
            style={{ color: designTokens.colors.text.muted }}
          >
            {index + 1}
          </span>
        </div>
      )}
    </motion.div>
  );
};

const CompletionCelebration = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="relative rounded-2xl p-4 sm:p-5 mb-4 overflow-hidden"
    style={{
      background: `linear-gradient(135deg, ${designTokens.colors.accent.gold}15, ${designTokens.colors.accent.lilac}10)`,
      border: `1.5px solid ${designTokens.colors.accent.gold}40`,
    }}
  >
    {/* Confetti particles */}
    {[...Array(8)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1.5 h-1.5 rounded-full"
        style={{
          background: [
            designTokens.colors.accent.gold,
            designTokens.colors.accent.lilac,
            designTokens.colors.secondary.fern,
            designTokens.colors.primary.base,
          ][i % 4],
          left: `${10 + i * 12}%`,
          top: '-4px',
        }}
        animate={{
          y: [0, 80 + Math.random() * 40],
          x: [0, (Math.random() - 0.5) * 30],
          opacity: [1, 0],
          rotate: [0, 360],
        }}
        transition={{
          duration: 1.5 + Math.random(),
          repeat: Infinity,
          repeatDelay: 2 + Math.random() * 2,
          delay: i * 0.3,
        }}
      />
    ))}

    <div className="flex items-center gap-3 relative z-10">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${designTokens.colors.accent.gold}25` }}
      >
        <Trophy className="w-6 h-6" style={{ color: designTokens.colors.accent.goldDark }} />
      </div>
      <div>
        <p
          className="font-bold text-sm sm:text-base"
          style={{ color: designTokens.colors.accent.goldDark, fontFamily: designTokens.typography.display }}
        >
          コンプリート達成!
        </p>
        <p className="text-xs sm:text-sm" style={{ color: designTokens.colors.text.secondary }}>
          Amazonギフトカードをプレゼント! 下のボタンから申請してください。
        </p>
      </div>
    </div>
  </motion.div>
);

export function StampBoardModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchCheckIns = async () => {
      if (!session?.user?.id) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('check_ins')
          .select('id, event_name, checked_in_at')
          .eq('user_id', session.user.id)
          .order('checked_in_at', { ascending: true })
          .limit(TOTAL_STAMPS);

        if (error) throw error;

        if (data) {
          setCheckIns(data);
        }
      } catch (error) {
        console.error('チェックイン取得エラー:', error);
        toast({
          title: 'エラー',
          description: 'スタンプの取得に失敗しました',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchCheckIns();
    }
  }, [isOpen, session?.user?.id, toast]);

  const handleSubmit = async () => {
    if (checkIns.length < TOTAL_STAMPS || !session?.user?.id) return;

    setSubmitting(true);

    try {
      const { error: dbError } = await supabase
        .from('stamp_board_submissions')
        .insert({
          user_id: session.user.id,
          check_in_ids: checkIns.map((c) => c.id),
        });

      if (dbError) throw dbError;

      const response = await fetch('/api/stamp-board/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          userEmail: session.user.email,
          checkIns: checkIns,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'メール送信に失敗しました');
      }

      toast({
        title: '送信完了!',
        description: 'Amazonギフトカードの申請を受け付けました。ご連絡をお待ちください。',
      });

      onClose();
    } catch (error) {
      console.error('送信エラー:', error);
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '送信に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const stampGrid = Array.from({ length: TOTAL_STAMPS }, (_, i) => checkIns[i] || null);
  const progress = (checkIns.length / TOTAL_STAMPS) * 100;
  const isComplete = checkIns.length >= TOTAL_STAMPS;

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      className="max-w-md"
    >
      {/* Custom header */}
      <div className="text-center mb-5">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-3"
          style={{
            background: `${designTokens.colors.accent.gold}15`,
            color: designTokens.colors.accent.goldDark,
            border: `1px solid ${designTokens.colors.accent.gold}30`,
          }}
        >
          <Star className="w-3 h-3" />
          Stamp Rally
        </div>
        <h2
          className="text-xl sm:text-2xl font-bold"
          style={{
            fontFamily: designTokens.typography.display,
            color: designTokens.colors.primary.dark,
          }}
        >
          スタンプボード
        </h2>
        <p className="text-xs sm:text-sm mt-1" style={{ color: designTokens.colors.text.muted }}>
          イベントにチェックインしてスタンプを集めよう
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2
            className="h-8 w-8 animate-spin"
            style={{ color: designTokens.colors.accent.gold }}
          />
          <span className="text-sm" style={{ color: designTokens.colors.text.muted }}>
            読み込み中...
          </span>
        </div>
      ) : (
        <>
          {/* Stamp Grid (3x3) */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-5">
            {stampGrid.map((checkIn, index) => (
              <StampCell
                key={index}
                checkIn={checkIn}
                index={index}
                total={checkIns.length}
              />
            ))}
          </div>

          {/* Progress bar */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-sm font-bold"
                style={{ color: designTokens.colors.primary.dark }}
              >
                {checkIns.length} / {TOTAL_STAMPS}
              </span>
              <span
                className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                style={{
                  background: isComplete
                    ? `${designTokens.colors.functional.success}15`
                    : `${designTokens.colors.primary.base}10`,
                  color: isComplete
                    ? designTokens.colors.functional.success
                    : designTokens.colors.text.secondary,
                }}
              >
                {isComplete ? 'コンプリート!' : `あと${TOTAL_STAMPS - checkIns.length}個`}
              </span>
            </div>
            <div
              className="w-full h-2.5 rounded-full overflow-hidden"
              style={{ background: `${designTokens.colors.secondary.stone}20` }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                className="h-full rounded-full relative"
                style={{
                  background: isComplete
                    ? `linear-gradient(90deg, ${designTokens.colors.accent.gold}, ${designTokens.colors.accent.lilac})`
                    : `linear-gradient(90deg, ${designTokens.colors.accent.gold}, ${designTokens.colors.accent.goldLight})`,
                }}
              >
                {/* Shimmer effect on progress bar */}
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  }}
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                />
              </motion.div>
            </div>
          </div>

          {/* Completion celebration */}
          <AnimatePresence>
            {isComplete && <CompletionCelebration />}
          </AnimatePresence>

          {/* Prize info card (when not complete) */}
          {!isComplete && (
            <div
              className="rounded-2xl p-4 mb-4 flex items-start gap-3"
              style={{
                background: designTokens.colors.background.mist,
                border: `1px solid ${designTokens.colors.secondary.stone}20`,
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${designTokens.colors.accent.lilac}15` }}
              >
                <Gift className="w-5 h-5" style={{ color: designTokens.colors.accent.lilacDark }} />
              </div>
              <div>
                <p
                  className="text-xs font-bold mb-0.5"
                  style={{ color: designTokens.colors.primary.dark }}
                >
                  コンプリート特典
                </p>
                <p className="text-xs leading-relaxed" style={{ color: designTokens.colors.text.secondary }}>
                  9つのスタンプを集めると、Amazonギフトカードをプレゼント!
                </p>
              </div>
            </div>
          )}

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={!isComplete || submitting}
            className="w-full h-12 rounded-xl font-bold text-sm sm:text-base transition-all active:scale-[0.98]"
            style={{
              background: isComplete
                ? `linear-gradient(135deg, ${designTokens.colors.accent.gold}, ${designTokens.colors.accent.goldDark})`
                : `${designTokens.colors.secondary.stone}30`,
              color: isComplete ? designTokens.colors.text.primary : designTokens.colors.text.muted,
              boxShadow: isComplete ? `0 4px 16px ${designTokens.colors.accent.gold}40` : 'none',
              cursor: isComplete ? 'pointer' : 'not-allowed',
              border: 'none',
            }}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                送信中...
              </>
            ) : (
              <span className="flex items-center gap-2">
                <Gift className="w-4 h-4" />
                Amazonギフトカードを申請する
              </span>
            )}
          </Button>
        </>
      )}
    </CustomModal>
  );
}
