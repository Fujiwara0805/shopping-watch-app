"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Search, MapPin, Calendar, Compass, User, Feather } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Input } from '@/components/ui/input';
import { getPublicMaps } from '@/app/_actions/maps';

// 🎨 LPカラーパレット
const COLORS = {
  primary: '#8b6914',      // ゴールドブラウン
  primaryDark: '#3d2914',  // ダークブラウン
  secondary: '#5c3a21',    // ミディアムブラウン
  background: '#f5e6d3',   // ベージュ
  surface: '#fff8f0',      // オフホワイト
  cream: '#ffecd2',        // クリーム
  border: '#d4c4a8',       // ライトベージュ
  mint: '#e8f4e5',         // ミントグリーン
};

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

export default function PublicMapsPage() {
  const router = useRouter();
  const [publicMaps, setPublicMaps] = useState<PublicMap[]>([]);
  const [filteredMaps, setFilteredMaps] = useState<PublicMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPublicMaps();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMaps(publicMaps);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = publicMaps.filter(map => {
        // タイトルで検索
        const matchesTitle = map.title.toLowerCase().includes(query);
        
        // ハッシュタグで検索
        const matchesHashtag = map.hashtags?.some(tag => 
          tag.toLowerCase().includes(query)
        ) || false;
        
        return matchesTitle || matchesHashtag;
      });
      setFilteredMaps(filtered);
    }
  }, [searchQuery, publicMaps]);

  const fetchPublicMaps = async () => {
    try {
      setLoading(true);
      
      // 🔥 Server Actionを使用して公開マップ一覧を取得
      const { maps, error } = await getPublicMaps();
      
      if (error) {
        throw new Error(error);
      }
      
      // Server Actionの結果をPublicMap型に変換
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
      setFilteredMaps(mapsWithMetadata);
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
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: COLORS.background }}>
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Compass className="h-12 w-12" style={{ color: COLORS.primary }} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: COLORS.background }}>
      {/* 固定検索バー */}
      <div 
        className="sticky top-0 z-40 shadow-sm border-b"
        style={{ backgroundColor: COLORS.background, borderColor: COLORS.border }}
      >
        <div className="px-3 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: COLORS.secondary }} />
            <Input
              type="text"
              placeholder="マップ名・タグで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 rounded-lg"
              style={{ 
                backgroundColor: COLORS.surface, 
                borderColor: COLORS.border,
                color: COLORS.primaryDark 
              }}
            />
          </div>
        </div>

        {/* 件数表示 */}
        <div className="px-4 pb-3">
          <p className="text-sm" style={{ color: COLORS.secondary }}>
            {filteredMaps.length}件のマップ
          </p>
        </div>
      </div>

      {/* マップ一覧 */}
      <div className="px-4 space-y-4 pb-4">
        {filteredMaps.length === 0 ? (
          <div className="text-center py-16">
            <div 
              className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
              style={{ backgroundColor: COLORS.cream }}
            >
              <Compass className="h-10 w-10" style={{ color: COLORS.primary }} />
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: COLORS.primaryDark }}>
              {searchQuery ? '検索結果が見つかりませんでした' : 'マップがまだありません'}
            </h3>
            {!searchQuery && (
              <p style={{ color: COLORS.secondary }}>マップが投稿され次第、ここに表示されます</p>
            )}
          </div>
        ) : (
          filteredMaps.map((map, index) => (
            <motion.div
              key={map.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ y: -4, boxShadow: "0 10px 30px rgba(61, 41, 20, 0.15)" }}
              className="rounded-xl border-2 overflow-hidden transition-all cursor-pointer"
              style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}
              onClick={() => handleMapClick(map.id)}
            >
              <div className="flex gap-3 p-3">
                {/* サムネイル画像（正方形） */}
                <div 
                  className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded overflow-hidden relative"
                  style={{ background: `linear-gradient(to bottom right, ${COLORS.cream}, ${COLORS.background})` }}
                >
                  {map.cover_image_url ? (
                    <Image
                      src={map.cover_image_url}
                      alt={map.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 80px, 96px"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <MapPin className="h-8 w-8" style={{ color: `${COLORS.primary}50` }} />
                    </div>
                  )}
                </div>

                {/* コンテンツ */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h3 
                      className="text-base sm:text-lg font-bold mb-1.5 line-clamp-2 transition-colors"
                      style={{ color: COLORS.primaryDark, fontFamily: "'Noto Serif JP', serif" }}
                    >
                      {map.title}
                    </h3>
                    
                    {/* スポット数 */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <MapPin className="h-4 w-4 flex-shrink-0" style={{ color: COLORS.primary }} />
                      <span className="text-sm" style={{ color: COLORS.secondary }}>
                        {map.total_locations || 0}箇所
                      </span>
                    </div>

                    {/* 作成日 */}
                    <div className="flex items-center gap-1 mb-2">
                      <Calendar className="h-3.5 w-3.5 flex-shrink-0" style={{ color: COLORS.secondary }} />
                      <span className="text-xs" style={{ color: COLORS.secondary }}>
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
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: COLORS.mint, color: COLORS.secondary }}
                          >
                            #{tag}
                          </span>
                        ))}
                        {map.hashtags.length > 3 && (
                          <span className="text-xs px-1.5 py-0.5" style={{ color: COLORS.secondary }}>
                            +{map.hashtags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* 右下のFABボタン */}
      <div className="fixed bottom-6 right-4 sm:bottom-8 sm:right-8 z-50 flex flex-col gap-3">
        {/* マイページボタン */}
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(92, 58, 33, 0.3)" }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          onClick={handleMyPage}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl shadow-lg transition-colors flex flex-col items-center justify-center gap-1"
          style={{ backgroundColor: COLORS.secondary }}
        >
          <User className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: COLORS.cream }} />
          <span className="text-xs font-medium" style={{ color: COLORS.cream }}>MyPage</span>
        </motion.button>

        {/* 作成ボタン（羽ペンアイコン） */}
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(139, 105, 20, 0.3)" }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          onClick={() => router.push('/create-map')}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl shadow-lg transition-colors flex flex-col items-center justify-center gap-1"
          style={{ background: `linear-gradient(135deg, ${COLORS.secondary}, ${COLORS.primary})` }}
        >
          <Feather className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: COLORS.cream }} />
          <span className="text-xs font-medium" style={{ color: COLORS.cream }}>作成</span>
        </motion.button>

        {/* Mapボタン（羅針盤アイコン） */}
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(139, 105, 20, 0.3)" }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          onClick={handleMapButtonClick}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl shadow-lg transition-colors flex flex-col items-center justify-center gap-1"
          style={{ backgroundColor: COLORS.primary }}
        >
          <Compass className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: COLORS.cream }} />
          <span className="text-xs font-medium" style={{ color: COLORS.cream }}>Map</span>
        </motion.button>
      </div>
    </div>
  );
}

