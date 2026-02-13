"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { MapPin, Calendar, Compass, Camera, User, Pencil, Trash2, Leaf, Sun, TreePine, Snowflake } from 'lucide-react';
import { getPublicSpots, deleteSpot } from '@/app/_actions/spots';
import { Breadcrumb } from '@/components/seo/breadcrumb';
import { designTokens } from '@/lib/constants/colors';
import { useSession } from 'next-auth/react';
import { useToast } from '@/lib/hooks/use-toast';
import type { SpotWithAuthor } from '@/types/spot';

// 季節を判定するヘルパー関数
const getSeasonFromDate = (dateStr: string): { label: string; color: string; icon: React.ReactNode } => {
  const month = new Date(dateStr).getMonth() + 1;
  if (month >= 3 && month <= 5) {
    return { label: '春', color: '#F472B6', icon: <Leaf className="h-3 w-3" /> };
  } else if (month >= 6 && month <= 8) {
    return { label: '夏', color: '#38BDF8', icon: <Sun className="h-3 w-3" /> };
  } else if (month >= 9 && month <= 11) {
    return { label: '秋', color: '#FB923C', icon: <TreePine className="h-3 w-3" /> };
  } else {
    return { label: '冬', color: '#94A3B8', icon: <Snowflake className="h-3 w-3" /> };
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      delay: i * 0.08,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

export default function SpotsListPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [spots, setSpots] = useState<SpotWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSpots = useCallback(async () => {
    try {
      setLoading(true);
      const { spots: fetchedSpots, error } = await getPublicSpots();
      if (error) throw new Error(error);
      setSpots(fetchedSpots);
    } catch (error: any) {
      console.error('スポット取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpots();
  }, [fetchSpots]);

  const handleSpotClick = (spotId: string) => {
    router.push(`/map?view=spots&spot_id=${spotId}`);
  };

  const handleEdit = (e: React.MouseEvent, spotId: string) => {
    e.stopPropagation();
    router.push(`/edit-spot/${spotId}`);
  };

  const handleDelete = async (e: React.MouseEvent, spotId: string) => {
    e.stopPropagation();
    if (!session?.user?.id) return;
    if (!confirm('このスポットを削除してもよろしいですか？\nこの操作は取り消せません。')) return;

    setDeletingId(spotId);
    try {
      const { success, error } = await deleteSpot(spotId, session.user.id);
      if (success) {
        toast({ title: '削除完了', description: 'スポットを削除しました', duration: 2000 });
        setSpots(prev => prev.filter(s => s.id !== spotId));
      } else {
        toast({ title: 'エラー', description: error || '削除に失敗しました', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'エラー', description: '削除に失敗しました', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: designTokens.colors.background.mist }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Compass className="h-12 w-12" style={{ color: designTokens.colors.accent.gold }} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: designTokens.colors.background.mist }}>
      {/* 背景装飾 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2"
          style={{ background: `radial-gradient(circle, ${designTokens.colors.secondary.fern}10 0%, transparent 70%)`, filter: 'blur(80px)' }}
        />
        <motion.div
          animate={{ x: [0, -50, 0], y: [0, 40, 0], scale: [1.1, 1, 1.1] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-1/4 -left-1/4 w-2/3 h-2/3"
          style={{ background: `radial-gradient(circle, ${designTokens.colors.accent.lilac}08 0%, transparent 70%)`, filter: 'blur(100px)' }}
        />
      </div>

      {/* ヘッダー */}
      <div className="relative z-10">
        <div className="px-4 pt-3 pb-2">
          <Breadcrumb />
        </div>
      </div>

      {/* スポット一覧 */}
      <div className="px-4 space-y-4 pb-4 relative z-10">
        {spots.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center py-16"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
              style={{ background: `${designTokens.colors.secondary.fern}15` }}
            >
              <Camera className="h-10 w-10" style={{ color: designTokens.colors.secondary.fern }} />
            </motion.div>
            <h3
              className="text-xl font-semibold mb-2"
              style={{ fontFamily: designTokens.typography.display, color: designTokens.colors.text.primary }}
            >
              スポットがまだありません
            </h3>
            <p style={{ color: designTokens.colors.text.secondary }}>スポットが登録され次第、ここに表示されます</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {spots.map((spot, index) => {
              const season = getSeasonFromDate(spot.created_at);
              const displayName = spot.reporter_nickname || spot.author_name;

              return (
                <motion.div
                  key={spot.id}
                  custom={index}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ y: -4, boxShadow: designTokens.elevation.high }}
                  whileTap={{ scale: 0.98 }}
                  className="rounded-2xl overflow-hidden cursor-pointer transition-all"
                  style={{
                    background: designTokens.colors.background.white,
                    boxShadow: designTokens.elevation.low,
                    border: `1px solid ${designTokens.colors.secondary.stone}25`,
                  }}
                  onClick={() => handleSpotClick(spot.id)}
                >
                  <div className="flex gap-4 p-4">
                    {/* サムネイル画像 */}
                    <div
                      className="flex-shrink-0 rounded-xl overflow-hidden relative"
                      style={{
                        width: '88px',
                        height: '88px',
                        background: designTokens.colors.background.cloud,
                      }}
                    >
                      {spot.image_urls && spot.image_urls.length > 0 ? (
                        <Image
                          src={spot.image_urls[0]}
                          alt={spot.store_name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 88px, 104px"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Camera className="h-8 w-8" style={{ color: designTokens.colors.text.muted }} />
                        </div>
                      )}
                    </div>

                    {/* コンテンツ */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h3
                          className="text-base sm:text-lg font-semibold mb-1.5 line-clamp-2"
                          style={{
                            fontFamily: designTokens.typography.display,
                            color: designTokens.colors.text.primary,
                          }}
                        >
                          {spot.store_name}
                        </h3>

                        {/* 季節カテゴリ */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: `${season.color}18`,
                              color: season.color,
                            }}
                          >
                            {season.icon}
                            {season.label}
                          </span>
                          {spot.city && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: designTokens.colors.text.muted }}>
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              {spot.city}
                            </span>
                          )}
                        </div>

                        {/* 作成日 */}
                        <div className="flex items-center gap-1 mb-1.5">
                          <Calendar className="h-3.5 w-3.5 flex-shrink-0" style={{ color: designTokens.colors.text.muted }} />
                          <span className="text-xs" style={{ color: designTokens.colors.text.muted }}>
                            {new Date(spot.created_at).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                        </div>

                        {/* 投稿者 (reporter nickname or author name) */}
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 flex-shrink-0" style={{ color: designTokens.colors.accent.lilac }} />
                          <span className="text-xs font-medium" style={{ color: designTokens.colors.text.secondary }}>
                            {displayName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 自分のスポットの場合: 編集・削除ボタン */}
                    {session?.user?.id && spot.author_user_id === session.user.id && (
                      <div className="flex flex-col gap-1.5 flex-shrink-0 justify-center">
                        <button
                          type="button"
                          onClick={(e) => handleEdit(e, spot.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"
                          style={{ color: designTokens.colors.text.muted }}
                          title="編集"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, spot.id)}
                          disabled={deletingId === spot.id}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50 disabled:opacity-50"
                          style={{ color: designTokens.colors.functional.error }}
                          title="削除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=IBM+Plex+Sans+JP:wght@400;500;600&family=Noto+Sans+JP:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
}
