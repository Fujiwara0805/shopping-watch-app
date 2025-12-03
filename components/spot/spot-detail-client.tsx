"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  ExternalLink, 
  AlertCircle, 
  X, 
  Navigation,
  Clock,
  Tag,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// 🔥 CloudinaryのURLを高品質化する関数
const optimizeCloudinaryImageUrl = (url: string): string => {
  if (!url || typeof url !== 'string') return url;
  
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    if (url.includes('q_auto') || url.includes('q_')) {
      return url;
    }
    
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex !== -1) {
      const beforeUpload = url.substring(0, uploadIndex + '/upload/'.length);
      const afterUpload = url.substring(uploadIndex + '/upload/'.length);
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
  description?: string | null;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedImageIndex, setExpandedImageIndex] = useState<{ spotIndex: number; imageIndex: number } | null>(null);
  const [currentImageIndices, setCurrentImageIndices] = useState<{ [key: number]: number }>({});

  // 閉じるボタンの処理
  const handleClose = () => {
    const from = searchParams.get('from');
    const titleId = searchParams.get('title_id');
    
    if (from === 'map' && titleId) {
      router.push(`/map?title_id=${titleId}`);
    } else {
      router.back();
    }
  };

  useEffect(() => {
    if (!spotId) return;

    const fetchMapData = async () => {
      setLoading(true);
      try {
        const [mapId] = spotId.split('_');

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

        const locations = mapDataResult.locations || [];
        if (locations.length === 0) {
          setError('場所が見つかりませんでした。');
          return;
        }

        setMapData({
          id: mapDataResult.id,
          title: mapDataResult.title,
          hashtags: mapDataResult.hashtags,
          description: mapDataResult.description || null,
          locations: locations,
          total_locations: locations.length,
        });

        // 各スポットの画像インデックスを初期化
        const initialIndices: { [key: number]: number } = {};
        locations.forEach((_: SpotLocation, index: number) => {
          initialIndices[index] = 0;
        });
        setCurrentImageIndices(initialIndices);

      } catch (error) {
        console.error('場所詳細の取得中にエラー:', error);
        setError('予期しないエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchMapData();
  }, [spotId]);

  // 画像ナビゲーション
  const handleImageNav = (spotIndex: number, direction: 'prev' | 'next', totalImages: number) => {
    setCurrentImageIndices(prev => {
      const current = prev[spotIndex] || 0;
      let newIndex: number;
      if (direction === 'next') {
        newIndex = (current + 1) % totalImages;
      } else {
        newIndex = current === 0 ? totalImages - 1 : current - 1;
      }
      return { ...prev, [spotIndex]: newIndex };
    });
  };

  // Google Mapsで開く
  const openInGoogleMaps = (location: SpotLocation) => {
    if (location?.store_latitude && location?.store_longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${location.store_name},`;
      window.open(url, '_blank');
    }
  };

  // アニメーション設定
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  // ローディング中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73370c] mx-auto mb-4"></div>
          <p className="text-gray-600 font-bold">読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラー表示
  if (error || !mapData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full bg-white rounded-2xl shadow-xl p-6 text-center"
        >
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">エラー</h2>
          <p className="text-gray-600 text-sm mb-4">{error || '場所が見つかりませんでした。'}</p>
          <Button onClick={handleClose} size="sm" style={{ backgroundColor: '#73370c' }} className="text-white hover:opacity-90">
            戻る
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 固定ヘッダー */}
      <motion.header
        variants={headerVariants}
        initial="hidden"
        animate="visible"
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm"
      >
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-end">
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="閉じる"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </motion.header>

      {/* メインコンテンツ */}
      <main className="pt-16 pb-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-2xl mx-auto px-4"
        >
          {/* タイトルセクション */}
          <motion.section variants={itemVariants} className="py-6">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 leading-tight" style={{ color: '#73370c' }}>
                {mapData.title}
              </h2>

              {/* 説明文カード */}
              {mapData.description && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-4"
                >
                  <div className="bg-gray-100 border-l-4 border-teal-400 rounded-lg p-4 text-left">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 mt-0.5 flex-shrink-0 text-teal-600" />
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 mb-2">説明</p>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {mapData.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ハッシュタグ */}
              {mapData.hashtags && mapData.hashtags.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {mapData.hashtags.map((tag, index) => (
                    <motion.span
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + index * 0.05 }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-xs font-medium rounded-full shadow-sm border border-gray-200"
                      style={{ color: '#73370c' }}
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </motion.span>
                  ))}
                </div>
              )}
            </div>
          </motion.section>

          {/* スポットカード一覧 */}
          <div className="space-y-6">
            {mapData.locations.map((location, index) => (
              <motion.article
                key={index}
                variants={itemVariants}
                className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200"
              >
                {/* コンテンツセクション */}
                <div className="p-5">
                  {/* 場所名（番号付き） */}
                  <h3 className="text-xl font-bold mb-4 flex items-start gap-2">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: '#73370c' }}>
                      {index + 1}
                    </span>
                    <span className="leading-tight pt-1" style={{ color: '#73370c' }}>{location.store_name}</span>
                  </h3>

                  {/* 画像セクション */}
                  {location.image_urls && location.image_urls.length > 0 && (
                    <div className="relative aspect-[16/10] bg-gray-100 rounded-lg overflow-hidden mb-4">
                        <img
                          src={optimizeCloudinaryImageUrl(location.image_urls[currentImageIndices[index] || 0])}
                          alt={location.store_name}
                          className="w-full h-full object-cover cursor-pointer transition-transform hover:scale-[1.02]"
                          onClick={() => setExpandedImageIndex({ spotIndex: index, imageIndex: currentImageIndices[index] || 0 })}
                        />
                        
                        {/* 画像ナビゲーション */}
                        {location.image_urls.length > 1 && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleImageNav(index, 'prev', location.image_urls.length); }}
                              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 hover:bg-black/60 rounded-full transition-colors"
                            >
                              <ChevronLeft className="h-5 w-5 text-white" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleImageNav(index, 'next', location.image_urls.length); }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 hover:bg-black/60 rounded-full transition-colors"
                            >
                              <ChevronRight className="h-5 w-5 text-white" />
                            </button>
                            
                            {/* 画像カウンター */}
                            <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/50 rounded-full text-white text-xs">
                              <ImageIcon className="h-3 w-3" />
                              {(currentImageIndices[index] || 0) + 1}/{location.image_urls.length}
                            </div>
                          </>
                        )}
                    </div>
                  )}

                  {/* 説明文 */}
                  <div className="bg-gray-100 border-l-4 border-teal-400 rounded-lg p-4 mb-4">
                    <p className="text-gray-700 text-base leading-relaxed whitespace-pre-wrap">
                      {location.content}
                    </p>
                  </div>

                  {/* アクションボタン */}
                  {location.store_latitude && location.store_longitude && (
                    <div className="flex justify-center">
                      <Button
                        onClick={() => openInGoogleMaps(location)}
                        size="sm"
                        className="text-white text-sm px-4 py-2 h-auto rounded-lg shadow-sm"
                        style={{ backgroundColor: '#73370c' }}
                      >
                        <Navigation className="mr-1.5 h-4 w-4" />
                        地図で見る
                      </Button>
                    </div>
                  )}
                </div>
              </motion.article>
            ))}
          </div>

          {/* フッター */}
          <motion.div
            variants={itemVariants}
            className="mt-8 text-center"
          >
            <button
              onClick={handleClose}
              className="inline-flex items-center gap-2 px-4 py-2 text-amber-700 hover:text-amber-800 font-medium text-sm transition-colors"
            >
              <X className="h-4 w-4" />
              閉じる
            </button>
          </motion.div>
        </motion.div>
      </main>

      {/* 画像拡大モーダル */}
      {expandedImageIndex !== null && mapData.locations[expandedImageIndex.spotIndex]?.image_urls && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setExpandedImageIndex(null)}
        >
          <button
            onClick={() => setExpandedImageIndex(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="h-6 w-6 text-white" />
          </button>
          
          <img
            src={optimizeCloudinaryImageUrl(
              mapData.locations[expandedImageIndex.spotIndex].image_urls[expandedImageIndex.imageIndex]
            )}
            alt={mapData.locations[expandedImageIndex.spotIndex].store_name}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          
          {/* モーダル内画像ナビゲーション */}
          {mapData.locations[expandedImageIndex.spotIndex].image_urls.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const totalImages = mapData.locations[expandedImageIndex.spotIndex].image_urls.length;
                  const newIndex = expandedImageIndex.imageIndex === 0 ? totalImages - 1 : expandedImageIndex.imageIndex - 1;
                  setExpandedImageIndex({ ...expandedImageIndex, imageIndex: newIndex });
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <ChevronLeft className="h-8 w-8 text-white" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const totalImages = mapData.locations[expandedImageIndex.spotIndex].image_urls.length;
                  const newIndex = (expandedImageIndex.imageIndex + 1) % totalImages;
                  setExpandedImageIndex({ ...expandedImageIndex, imageIndex: newIndex });
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <ChevronRight className="h-8 w-8 text-white" />
              </button>
              
              {/* 画像インジケーター */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {mapData.locations[expandedImageIndex.spotIndex].image_urls.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedImageIndex({ ...expandedImageIndex, imageIndex: idx });
                    }}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === expandedImageIndex.imageIndex
                        ? 'bg-white w-6'
                        : 'bg-white/40 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}