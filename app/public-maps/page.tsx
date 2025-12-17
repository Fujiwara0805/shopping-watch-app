"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Search, MapPin, Calendar, Map as MapIcon, Loader2, User } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Input } from '@/components/ui/input';
import { getPublicMaps } from '@/app/_actions/maps';

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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 固定検索バー */}
      <div className="sticky top-0 z-40 bg-background border-b border-gray-200 shadow-sm">
        <div className="px-3 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="マップ名・タグで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 bg-white border-gray-200 text-gray-800 placeholder-gray-400 rounded-lg focus:border-[#73370c] focus:ring-1 focus:ring-[#73370c]"
            />
          </div>
        </div>

        {/* 件数表示 */}
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-500">
            {filteredMaps.length}件のマップ
          </p>
        </div>
      </div>

      {/* マップ一覧 */}
      <div className="px-4 space-y-4 pb-4">
        {filteredMaps.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
              <MapPin className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {searchQuery ? '検索結果が見つかりませんでした' : 'マップがまだありません'}
            </h3>
            {!searchQuery && (
              <p className="text-gray-500">マップが投稿され次第、ここに表示されます</p>
            )}
          </div>
        ) : (
          filteredMaps.map((map, index) => (
            <motion.div
              key={map.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="bg-white rounded-xl border border-gray-200 hover:border-[#73370c] overflow-hidden transition-all hover:shadow-lg cursor-pointer"
              onClick={() => handleMapClick(map.id)}
            >
              <div className="flex gap-3 p-3">
                {/* サムネイル画像（正方形） */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-gradient-to-br from-[#fef3e8] to-[#f5e6d3] rounded overflow-hidden relative">
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
                      <MapPin className="h-8 w-8 text-[#73370c]/30" />
                    </div>
                  )}
                </div>

                {/* コンテンツ */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-1.5 line-clamp-2 hover:text-[#73370c] transition-colors">
                      {map.title}
                    </h3>
                    
                    {/* スポット数 */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <MapPin className="h-4 w-4 text-[#73370c] flex-shrink-0" />
                      <span className="text-sm text-gray-600">
                        {map.total_locations || 0}箇所
                      </span>
                    </div>

                    {/* 作成日 */}
                    <div className="flex items-center gap-1 mb-2">
                      <Calendar className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                      <span className="text-xs text-gray-500">
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
                            className="text-xs bg-[#fef3e8] text-[#73370c] px-2 py-0.5 rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                        {map.hashtags.length > 3 && (
                          <span className="text-xs text-gray-500 px-1.5 py-0.5">
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
          transition={{ duration: 0.3, delay: 0.1 }}
          onClick={handleMyPage}
          className="w-16 h-16 sm:w-20 sm:h-20 bg-[#73370c] hover:bg-[#8b4513] rounded-xl shadow-lg transition-colors flex flex-col items-center justify-center gap-1"
        >
          <User className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
          <span className="text-xs text-white font-medium">マイページ</span>
        </motion.button>

        {/* Mapボタン */}
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          onClick={handleMapButtonClick}
          className="w-16 h-16 sm:w-20 sm:h-20 bg-[#73370c] hover:bg-[#8b4513] rounded-xl shadow-lg transition-colors flex flex-col items-center justify-center gap-1"
        >
          <MapIcon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
          <span className="text-xs text-white font-medium">Map</span>
        </motion.button>
      </div>
    </div>
  );
}

