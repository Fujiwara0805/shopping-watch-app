"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MapPin, Map, ExternalLink, AlertCircle, Link as LinkIcon, ChevronLeft, ChevronRight, X, Navigation } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// 🔥 CloudinaryのURLを高品質化する関数
const optimizeCloudinaryImageUrl = (url: string): string => {
  if (!url || typeof url !== 'string') return url;
  
  // CloudinaryのURLの場合、品質パラメータを追加
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    // 既に品質パラメータが含まれているかチェック
    if (url.includes('q_auto') || url.includes('q_')) {
      // 既に品質パラメータがある場合はそのまま返す
      return url;
    }
    
    // /upload/の後に品質パラメータを追加
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex !== -1) {
      const beforeUpload = url.substring(0, uploadIndex + '/upload/'.length);
      const afterUpload = url.substring(uploadIndex + '/upload/'.length);
      
      // 高品質パラメータを追加（q_auto:best, f_auto）
      const qualityParams = 'q_auto:best,f_auto';
      return `${beforeUpload}${qualityParams}/${afterUpload}`;
    }
  }
  
  return url;
};

interface SpotLocation {
  order: number;
  store_id: string;
  store_name: string;
  store_latitude?: number;
  store_longitude?: number;
  content: string;
  image_urls: string[];
  url?: string | null;
}

interface MapData {
  id: string;
  title: string;
  hashtags: string[] | null;
  locations: SpotLocation[];
  total_locations: number;
}

interface SpotDetailClientProps {
  spotId: string;
}

export function SpotDetailClient({ spotId }: SpotDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);

  // 戻るボタンの処理
  const handleBack = () => {
    const from = searchParams.get('from');
    const titleId = searchParams.get('title_id');
    
    if (from === 'map' && titleId) {
      // マップ画面から来た場合は、title_idを保持して戻る
      router.push(`/map?title_id=${titleId}`);
    } else {
      // その他の場合はブラウザの履歴で戻る
      router.back();
    }
  };

  useEffect(() => {
    if (!spotId) return;

    const fetchMapData = async () => {
      setLoading(true);
      try {
        // IDからmap_idとorderを抽出（形式: "mapId_order"）
        const [mapId, orderStr] = spotId.split('_');
        const initialOrder = parseInt(orderStr || '0');

        // mapsテーブルから該当するマップを取得
        const { data: mapDataResult, error: mapError } = await supabase
          .from('maps')
          .select('*')
          .eq('id', mapId)
          .eq('is_deleted', false)
          .single();

        if (mapError || !mapDataResult) {
          console.error('マップ情報の取得に失敗:', mapError);
          setError('マップ情報の取得に失敗しました。');
          return;
        }

        // locations配列を取得
        const locations = mapDataResult.locations || [];
        if (locations.length === 0) {
          setError('場所が見つかりませんでした。');
          return;
        }

        setMapData({
          id: mapDataResult.id,
          title: mapDataResult.title,
          hashtags: mapDataResult.hashtags,
          locations: locations,
          total_locations: locations.length,
        });

        // タップした場所のインデックスを初期表示
        if (initialOrder >= 0 && initialOrder < locations.length) {
          setCurrentLocationIndex(initialOrder);
        }
      } catch (error) {
        console.error('場所詳細の取得中にエラー:', error);
        setError('予期しないエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchMapData();
  }, [spotId]);

  // 場所が変更されたら画像インデックスをリセット
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [currentLocationIndex]);

  // 次の場所
  const nextLocation = () => {
    if (mapData && mapData.locations.length > 0) {
      setCurrentLocationIndex((prev) => (prev + 1) % mapData.locations.length);
    }
  };

  // 前の場所
  const prevLocation = () => {
    if (mapData && mapData.locations.length > 0) {
      setCurrentLocationIndex((prev) => 
        prev === 0 ? mapData.locations.length - 1 : prev - 1
      );
    }
  };

  // 次の画像
  const nextImage = () => {
    if (mapData && mapData.locations[currentLocationIndex].image_urls.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % mapData.locations[currentLocationIndex].image_urls.length);
    }
  };

  // 前の画像
  const prevImage = () => {
    if (mapData && mapData.locations[currentLocationIndex].image_urls.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? mapData.locations[currentLocationIndex].image_urls.length - 1 : prev - 1
      );
    }
  };

  // Google Mapsで開く
  const openInGoogleMaps = () => {
    const location = mapData?.locations[currentLocationIndex];
    if (location?.store_latitude && location?.store_longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${location.store_latitude},${location.store_longitude}`;
      window.open(url, '_blank');
    }
  };

  // ローディング中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#fef3e8] to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#73370c] mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラー表示
  if (error || !mapData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#fef3e8] to-white p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
        >
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">エラー</h2>
          <p className="text-gray-600 mb-6">{error || '場所が見つかりませんでした。'}</p>
          <Button onClick={handleBack} className="w-full">
            戻る
          </Button>
        </motion.div>
      </div>
    );
  }

  const currentLocation = mapData.locations[currentLocationIndex];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fef3e8] to-white pb-20">
      {/* ヘッダー */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2 text-[#73370c] hover:bg-[#fef3e8]"
          >
            <ChevronLeft className="h-5 w-5" />
            戻る
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">{mapData.title}</span>
            <span className="text-xs text-gray-500">
              {currentLocationIndex + 1} / {mapData.total_locations}
            </span>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentLocationIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            {/* 画像スライダー */}
            {currentLocation.image_urls && currentLocation.image_urls.length > 0 && (
              <div className="relative rounded-2xl overflow-hidden shadow-2xl mb-8 bg-gray-100">
                <div className="aspect-video relative">
                  <img
                    src={optimizeCloudinaryImageUrl(currentLocation.image_urls[currentImageIndex])}
                    alt={currentLocation.store_name}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setShowImageModal(true)}
                  />
                  
                  {/* 画像ナビゲーション */}
                  {currentLocation.image_urls.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all"
                      >
                        <ChevronLeft className="h-6 w-6 text-[#73370c]" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all"
                      >
                        <ChevronRight className="h-6 w-6 text-[#73370c]" />
                      </button>
                      
                      {/* 画像インジケーター */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {currentLocation.image_urls.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              index === currentImageIndex
                                ? 'bg-white w-8'
                                : 'bg-white/50 hover:bg-white/75'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 場所情報 */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
              {/* ハッシュタグ */}
              {mapData.hashtags && mapData.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {mapData.hashtags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-block px-3 py-1 bg-[#fef3e8] text-[#73370c] text-sm font-medium rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 場所番号バッジ */}
              <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-gradient-to-r from-[#73370c] to-[#8b4513] text-white rounded-full shadow-lg">
                <MapPin className="h-5 w-5" />
                <span className="font-bold text-lg">
                  スポット {currentLocationIndex + 1}
                </span>
              </div>

              {/* 場所名 */}
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                {currentLocation.store_name}
              </h1>

              {/* 説明文 */}
              <div className="prose prose-lg max-w-none mb-6">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {currentLocation.content}
                </p>
              </div>

              {/* アクションボタン */}
              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                {currentLocation.store_latitude && currentLocation.store_longitude && (
                  <Button
                    onClick={openInGoogleMaps}
                    className="flex-1 bg-[#73370c] hover:bg-[#5c2b0a] text-white py-6 text-lg font-semibold rounded-xl shadow-lg"
                  >
                    <Navigation className="mr-2 h-5 w-5" />
                    Google Mapsで開く
                  </Button>
                )}
                
                {currentLocation.url && (
                  <Button
                    onClick={() => window.open(currentLocation.url!, '_blank')}
                    variant="outline"
                    className="flex-1 border-2 border-[#73370c] text-[#73370c] hover:bg-[#fef3e8] py-6 text-lg font-semibold rounded-xl"
                  >
                    <ExternalLink className="mr-2 h-5 w-5" />
                    公式サイト
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* 場所ナビゲーション（複数の場所がある場合のみ表示） */}
        {mapData.locations.length > 1 && (
          <div className="flex items-center justify-between gap-4 mt-8">
            <Button
              onClick={prevLocation}
              variant="outline"
              className="flex-1 h-16 border-2 border-[#73370c] text-[#73370c] hover:bg-[#fef3e8] font-bold text-lg rounded-xl shadow-lg"
            >
              <ChevronLeft className="mr-2 h-6 w-6" />
              前のスポット
            </Button>
            
            <Button
              onClick={nextLocation}
              variant="outline"
              className="flex-1 h-16 border-2 border-[#73370c] text-[#73370c] hover:bg-[#fef3e8] font-bold text-lg rounded-xl shadow-lg"
            >
              次のスポット
              <ChevronRight className="ml-2 h-6 w-6" />
            </Button>
          </div>
        )}

        {/* スポット一覧（サムネイル） */}
        {mapData.locations.length > 1 && (
          <div className="mt-8 bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Map className="mr-2 h-6 w-6 text-[#73370c]" />
              全てのスポット
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {mapData.locations.map((location, index) => (
                <motion.button
                  key={index}
                  onClick={() => setCurrentLocationIndex(index)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`relative aspect-square rounded-xl overflow-hidden shadow-lg transition-all ${
                    index === currentLocationIndex
                      ? 'ring-4 ring-[#73370c]'
                      : 'ring-2 ring-gray-200 hover:ring-[#73370c]/50'
                  }`}
                >
                  {location.image_urls && location.image_urls.length > 0 ? (
                    <img
                      src={optimizeCloudinaryImageUrl(location.image_urls[0])}
                      alt={location.store_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#fef3e8] to-[#f5e6d3] flex items-center justify-center">
                      <MapPin className="h-8 w-8 text-[#73370c]/30" />
                    </div>
                  )}
                  
                  {/* 番号バッジ */}
                  <div className="absolute top-2 left-2 bg-[#73370c] text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow-lg">
                    {index + 1}
                  </div>
                  
                  {/* 場所名 */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-white text-xs font-semibold truncate">
                      {location.store_name}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 画像モーダル */}
      {showImageModal && currentLocation.image_urls && currentLocation.image_urls.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <X className="h-6 w-6 text-white" />
          </button>
          <img
            src={optimizeCloudinaryImageUrl(currentLocation.image_urls[currentImageIndex])}
            alt={currentLocation.store_name}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

