"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { MapPin, Calendar, Compass, User, Feather, Route } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getPublicMaps } from '@/app/_actions/maps';
import { Breadcrumb } from '@/components/seo/breadcrumb';
import { designTokens } from '@/lib/constants/colors';

interface PublicMap {
  id: string;
  title: string;
  total_locations: number;
  cover_image_url: string | null;
  created_at: string;
  hashtags: string[] | null;
  author_name: string;
  author_avatar_path: string | null;
}

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

export default function PublicMapsPage() {
  const router = useRouter();
  const [publicMaps, setPublicMaps] = useState<PublicMap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicMaps();
  }, []);

  const fetchPublicMaps = async () => {
    try {
      setLoading(true);
      const { maps, error } = await getPublicMaps();
      if (error) throw new Error(error);

      const mapsWithMetadata: PublicMap[] = maps.map((map: any) => ({
        id: map.id,
        title: map.title,
        total_locations: map.total_locations,
        cover_image_url: map.cover_image_url,
        created_at: map.created_at,
        hashtags: map.hashtags,
        author_name: map.author_name,
        author_avatar_path: map.author_avatar_path,
      }));

      setPublicMaps(mapsWithMetadata);
    } catch (error: any) {
      console.error('公開マップ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (mapId: string) => {
    router.push(`/map?title_id=${mapId}`);
  };

  const handleMapButtonClick = () => {
    router.push('/map');
  };

  const handleMyPage = () => {
    router.push('/profile');
  };

  const getAvatarPublicUrl = (avatarPath: string | null): string | null => {
    if (!avatarPath) return null;
    return supabase.storage.from('avatars').getPublicUrl(avatarPath).data.publicUrl;
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
          style={{ background: `radial-gradient(circle, ${designTokens.colors.accent.gold}10 0%, transparent 70%)`, filter: 'blur(80px)' }}
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
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="px-4 pb-4"
        >
          <div className="flex items-center gap-3 mb-1">
            <Route className="h-5 w-5" style={{ color: designTokens.colors.accent.lilac }} />
            <h1
              className="text-xl font-semibold"
              style={{ fontFamily: designTokens.typography.display, color: designTokens.colors.text.primary }}
            >
              モデルコース
            </h1>
          </div>
          <div
            className="w-16 h-1 rounded-full ml-8"
            style={{ background: `linear-gradient(90deg, ${designTokens.colors.accent.gold}, transparent)` }}
          />
        </motion.div>
      </div>

      {/* マップ一覧 */}
      <div className="px-4 space-y-4 pb-4 relative z-10">
        {publicMaps.length === 0 ? (
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
              style={{ background: `${designTokens.colors.accent.gold}15` }}
            >
              <Compass className="h-10 w-10" style={{ color: designTokens.colors.accent.gold }} />
            </motion.div>
            <h3
              className="text-xl font-semibold mb-2"
              style={{ fontFamily: designTokens.typography.display, color: designTokens.colors.text.primary }}
            >
              モデルコースがまだありません
            </h3>
            <p style={{ color: designTokens.colors.text.secondary }}>モデルコースが投稿され次第、ここに表示されます</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {publicMaps.map((map, index) => (
              <motion.div
                key={map.id}
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
                onClick={() => handleMapClick(map.id)}
              >
                <div className="flex gap-4 p-4">
                  {/* サムネイル画像 */}
                  <div
                    className="w-22 h-22 sm:w-26 sm:h-26 flex-shrink-0 rounded-xl overflow-hidden relative"
                    style={{
                      width: '88px',
                      height: '88px',
                      background: designTokens.colors.background.cloud,
                    }}
                  >
                    {map.cover_image_url ? (
                      <Image
                        src={map.cover_image_url}
                        alt={map.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 88px, 104px"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Route className="h-8 w-8" style={{ color: designTokens.colors.text.muted }} />
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
                        {map.title}
                      </h3>

                      {/* スポット数 */}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <MapPin className="h-4 w-4 flex-shrink-0" style={{ color: designTokens.colors.accent.lilac }} />
                        <span className="text-sm" style={{ color: designTokens.colors.text.secondary }}>
                          {map.total_locations || 0}箇所
                        </span>
                      </div>

                      {/* 作成日 */}
                      <div className="flex items-center gap-1 mb-2">
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0" style={{ color: designTokens.colors.text.muted }} />
                        <span className="text-xs" style={{ color: designTokens.colors.text.muted }}>
                          {new Date(map.created_at).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      {/* ハッシュタグ */}
                      {map.hashtags && map.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {map.hashtags.slice(0, 3).map((tag, i) => (
                            <span
                              key={i}
                              className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                              style={{
                                background: `${designTokens.colors.accent.lilac}15`,
                                color: designTokens.colors.accent.lilacDark,
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                          {map.hashtags.length > 3 && (
                            <span className="text-xs px-1.5 py-0.5" style={{ color: designTokens.colors.text.muted }}>
                              +{map.hashtags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* 右下のFABボタン */}
      <div className="fixed bottom-6 right-4 sm:bottom-8 sm:right-8 z-50 flex flex-col gap-3">
        {/* マイページボタン */}
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05, boxShadow: designTokens.elevation.high }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          onClick={handleMyPage}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-lg transition-colors flex flex-col items-center justify-center gap-1"
          style={{ background: designTokens.colors.primary.dark, boxShadow: designTokens.elevation.high }}
        >
          <User className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: designTokens.colors.text.inverse }} />
          <span className="text-xs font-medium" style={{ color: designTokens.colors.text.inverse }}>MyPage</span>
        </motion.button>

        {/* モデルコース作成ボタン */}
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05, boxShadow: designTokens.elevation.high }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          onClick={() => router.push('/create-map')}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-lg transition-colors flex flex-col items-center justify-center gap-1"
          style={{
            background: `linear-gradient(135deg, ${designTokens.colors.accent.lilacDark}, ${designTokens.colors.accent.lilac})`,
            boxShadow: `0 8px 24px ${designTokens.colors.accent.lilac}40`,
          }}
        >
          <Feather className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: designTokens.colors.text.inverse }} />
          <span className="text-xs font-medium" style={{ color: designTokens.colors.text.inverse }}>作成</span>
        </motion.button>

        {/* Mapボタン */}
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05, boxShadow: designTokens.elevation.high }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          onClick={handleMapButtonClick}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-lg transition-colors flex flex-col items-center justify-center gap-1"
          style={{
            background: designTokens.colors.accent.gold,
            boxShadow: `0 8px 24px ${designTokens.colors.accent.gold}40`,
          }}
        >
          <Compass className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: designTokens.colors.text.primary }} />
          <span className="text-xs font-medium" style={{ color: designTokens.colors.text.primary }}>Map</span>
        </motion.button>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=IBM+Plex+Sans+JP:wght@400;500;600&family=Noto+Sans+JP:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
}
