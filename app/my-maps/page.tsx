"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from "next-auth/react";
import { motion } from 'framer-motion';
import { Loader2, MapPin, Calendar, Trash2, Edit, Eye, Plus, ChevronRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from "@/hooks/use-toast";
import { useLoading } from '@/contexts/loading-context';

interface MyMap {
  id: string;
  title: string;
  total_locations: number;
  cover_image_url: string | null;
  created_at: string;
  expires_at: string | null;
  hashtags: string[] | null;
}

export default function MyMapsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const { showLoading, hideLoading } = useLoading();
  
  const [myMaps, setMyMaps] = useState<MyMap[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ログインチェック
  useEffect(() => {
    if (status !== "loading" && !session) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [session, status, router]);
  
  // マイマップを取得
  useEffect(() => {
    if (session?.user?.id) {
      fetchMyMaps();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);
  
  const fetchMyMaps = async () => {
    try {
      setLoading(true);
      
      // ユーザーのプロフィールIDを取得
      const { data: profile, error: profileError } = await supabase
        .from('app_profiles')
        .select('id')
        .eq('user_id', session?.user?.id)
        .single();
      
      if (profileError || !profile) {
        throw new Error("プロフィール情報が見つかりません");
      }
      
      // マップ一覧を取得（locationsも取得して計算）
      const { data: maps, error: mapsError } = await supabase
        .from('maps')
        .select('id, title, locations, created_at, expires_at, hashtags')
        .eq('app_profile_id', profile.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      
      if (mapsError) {
        throw new Error(mapsError.message);
      }
      
      // total_locationsとcover_image_urlを計算
      const mapsWithCalculated = (maps || []).map(map => {
        const locations = map.locations || [];
        const totalLocations = locations.length;
        const coverImageUrl = locations.length > 0 && locations[0].image_urls?.length > 0
          ? locations[0].image_urls[0]
          : null;
        
        return {
          ...map,
          total_locations: totalLocations,
          cover_image_url: coverImageUrl,
        };
      });
      
      setMyMaps(mapsWithCalculated);
    } catch (error: any) {
      console.error("マイマップ取得エラー:", error);
      toast({
        title: "⚠️ エラー",
        description: error.message || "マイマップの取得に失敗しました",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };
  
  // マップを削除
  const handleDelete = async (mapId: string, mapTitle: string) => {
    if (!confirm(`「${mapTitle}」を削除しますか？\nこの操作は取り消せません。`)) {
      return;
    }
    
    try {
      showLoading();
      
      const { error } = await supabase
        .from('maps')
        .update({ is_deleted: true })
        .eq('id', mapId);
      
      if (error) {
        throw new Error(error.message);
      }
      
      toast({
        title: "🗑️ 削除完了",
        description: `「${mapTitle}」を削除しました`,
        duration: 2000,
      });
      
      await fetchMyMaps();
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
  const handleEdit = (mapId: string) => {
    router.push(`/my-maps/edit/${mapId}`);
  };
  
  // 新規作成
  const handleCreate = () => {
    router.push('/create-map');
  };
  
  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!session) return null;
  
  return (
    <div className="container mx-auto max-w-5xl px-4 py-4 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        
        {/* マップ一覧 */}
        {myMaps.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
              <MapPin className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">マップがまだありません</h3>
            <p className="text-gray-500 mb-6">最初のマップを作成しましょう！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myMaps.map((map, index) => (
              <motion.div
                key={map.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-white rounded-xl border border-gray-200 hover:border-[#73370c] overflow-hidden transition-all hover:shadow-lg"
              >
                {/* カバー画像 */}
                <div 
                  className="h-40 bg-gradient-to-br from-[#fef3e8] to-[#f5e6d3] relative overflow-hidden cursor-pointer"
                  onClick={() => handleView(map.id)}
                >
                  {map.cover_image_url ? (
                    <img
                      src={map.cover_image_url}
                      alt={map.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <MapPin className="h-12 w-12 text-[#73370c]/30" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-medium text-[#73370c]">
                    {map.total_locations || 0}箇所
                  </div>
                </div>
                
                {/* コンテンツ */}
                <div className="p-4">
                  <h3 
                    className="text-lg font-bold text-gray-800 mb-2 line-clamp-2 cursor-pointer hover:text-[#73370c] transition-colors"
                    onClick={() => handleView(map.id)}
                  >
                    {map.title}
                  </h3>
                  
                  {/* ハッシュタグ */}
                  {map.hashtags && map.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {map.hashtags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-xs bg-[#fef3e8] text-[#73370c] px-2 py-0.5 rounded-full">
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
                  
                  {/* メタ情報 */}
                  <div className="flex items-center text-xs text-gray-500 mb-3">
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    {new Date(map.created_at).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                  
                  {/* アクションボタン */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(map.id)}
                      className="flex-1 h-9 text-sm rounded-lg"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      見る
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(map.id)}
                      className="flex-1 h-9 text-sm rounded-lg"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      編集
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(map.id, map.title)}
                      className="h-9 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* フローティングアクションボタン（左下配置） */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3">
        {/* マイページアイコン */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Button
            onClick={() => router.push('/profile')}
            size="icon"
            className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl shadow-2xl bg-[#73370c] hover:bg-[#8b4513] flex flex-col items-center justify-center gap-1"
          >
            <User className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            <span className="text-xs text-white font-medium">マイページ</span>
          </Button>
        </motion.div>

        {/* プラスアイコン */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Button
            onClick={handleCreate}
            size="icon"
            className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl shadow-2xl bg-[#73370c] hover:bg-[#8b4513] flex flex-col items-center justify-center gap-1"
          >
            <Plus className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            <span className="text-xs text-white font-medium">作成</span>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}