"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from "next-auth/react";
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Search, MapPin, Calendar, Trash2, Edit, Feather, User, Loader2, Compass } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/lib/hooks/use-toast';
import { useLoading } from '@/lib/contexts/loading-context';
import { getMapsByUserId, deleteMap, type CourseListItem } from '@/app/_actions/maps';
import { Breadcrumb } from '@/components/seo/breadcrumb';

import { COLORS } from '@/lib/constants/colors';

export default function CoursesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const { showLoading, hideLoading } = useLoading();
  
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [filteredMaps, setFilteredMaps] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // ログインチェック
  useEffect(() => {
    if (status !== "loading" && !session) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [session, status, router]);
  
  // コースを取得
  useEffect(() => {
    if (session?.user?.id) {
      fetchCourses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // 検索フィルター
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMaps(courses);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = courses.filter(map => {
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
  }, [searchQuery, courses]);
  
  const fetchCourses = async () => {
    if (!session?.user?.id) return;
    
    try {
      setLoading(true);
      
      // 🔥 Server Actionを使用してマップ一覧を取得
      const { maps, error } = await getMapsByUserId(session.user.id);
      
      if (error) {
        throw new Error(error);
      }
      
      setCourses(maps);
      setFilteredMaps(maps);
    } catch (error: any) {
      console.error("コース取得エラー:", error);
      toast({
        title: "⚠️ エラー",
        description: error.message || "コースの取得に失敗しました",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };
  
  // マップを削除（物理削除 + 画像削除）
  const handleDelete = async (e: React.MouseEvent, mapId: string, mapTitle: string) => {
    e.stopPropagation(); // カード全体のクリックを防止
    if (!session?.user?.id) return;
    
    if (!confirm(`「${mapTitle}」を削除しますか？\nこの操作は取り消せません。`)) {
      return;
    }
    
    try {
      showLoading();
      
      // 🔥 Server Actionを使用してマップを削除
      const { success, error } = await deleteMap(mapId, session.user.id);
      
      if (!success || error) {
        throw new Error(error || '削除に失敗しました');
      }
      
      toast({
        title: "🗑️ 削除完了",
        description: `「${mapTitle}」を削除しました`,
        duration: 2000,
      });
      
      await fetchCourses();
    } catch (error: any) {
      console.error("削除エラー:", error);
      toast({
        title: "⚠️ エラー",
        description: error.message || "削除に失敗しました",
        duration: 3000,
      });
    } finally {
      hideLoading();
    }
  };
  
  // マップをマップ画面で表示
  const handleView = (mapId: string) => {
    router.push(`/map?title_id=${mapId}`);
  };
  
  // マップを編集
  const handleEdit = (e: React.MouseEvent, mapId: string) => {
    e.stopPropagation(); // カード全体のクリックを防止
    router.push(`/my-maps/edit/${mapId}`);
  };
  
  // 新規作成
  const handleCreate = () => {
    router.push('/create-map');
  };

  // マイページへ
  const handleMyPage = () => {
    router.push('/profile');
  };
  
  if (status === "loading" || loading) {
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
  
  if (!session) return null;
  
  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: COLORS.background }}>
      {/* パンくずリスト */}
      <div className="px-4 pt-3">
        <Breadcrumb />
      </div>
      
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
            {filteredMaps.length}件のコース
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
              <p className="mb-6" style={{ color: COLORS.secondary }}>最初のマップを作成しましょう！</p>
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
              onClick={() => handleView(map.id)}
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

                {/* アクションボタン（右側に縦並び） */}
                <div className="flex flex-col gap-2 justify-center">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={(e) => handleEdit(e, map.id)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
                    style={{ backgroundColor: COLORS.cream }}
                    title="編集"
                  >
                    <Edit className="h-4 w-4" style={{ color: COLORS.secondary }} />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={(e) => handleDelete(e, map.id, map.title)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors hover:bg-red-50"
                    style={{ backgroundColor: COLORS.cream }}
                    title="削除"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </motion.button>
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

        {/* 新規作成ボタン（羽ペンアイコン） */}
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(139, 105, 20, 0.3)" }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          onClick={handleCreate}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl shadow-lg transition-colors flex flex-col items-center justify-center gap-1"
          style={{ background: `linear-gradient(135deg, ${COLORS.secondary}, ${COLORS.primary})` }}
        >
          <Feather className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: COLORS.cream }} />
          <span className="text-xs font-medium" style={{ color: COLORS.cream }}>作成</span>
        </motion.button>
      </div>
    </div>
  );
}
