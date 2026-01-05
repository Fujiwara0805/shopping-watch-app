"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  ExternalLink, 
  AlertCircle, 
  X, 
  Navigation,
  Tag,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ArrowUpFromLine,
  ScrollText,
  Sword,
  ChevronDown,
  ChevronUp,
  Feather,
  Clock,
  ArrowRight,
  Shield,
  Compass,
  Home,
  ChevronRight as ChevronRightIcon
} from 'lucide-react';
import Script from 'next/script';
import Link from 'next/link';

// 🎮 RPG風移動手段アイコン（ピクセルアート風）
const TRANSPORT_ICONS: { [key: string]: { icon: string; label: string; color: string } } = {
  walk: { icon: '🚶', label: '徒歩', color: '#4CAF50' },
  bus: { icon: '🚌', label: 'バス', color: '#2196F3' },
  taxi: { icon: '🚕', label: 'タクシー', color: '#FFC107' },
  car: { icon: '🚗', label: '車', color: '#9C27B0' },
  bicycle: { icon: '🚲', label: '自転車', color: '#00BCD4' },
  train: { icon: '🚃', label: '電車', color: '#F44336' },
};
import { supabase } from '@/lib/supabaseClient';

// 🔥 CloudinaryのURLを高品質化する関数
const optimizeCloudinaryImageUrl = (url: string): string => {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    if (url.includes('q_auto') || url.includes('q_')) return url;
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex !== -1) {
      const beforeUpload = url.substring(0, uploadIndex + '/upload/'.length);
      const afterUpload = url.substring(uploadIndex + '/upload/'.length);
      return `${beforeUpload}q_auto:best,f_auto/${afterUpload}`;
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
  // 新規追加項目
  stay_duration?: number; // 滞在予定時間（分）
  recommended_transport?: string; // 推奨移動手段
  next_transport?: string; // 次のスポットへの移動手段
  next_travel_time?: number; // 次のスポットへの所要時間（分）
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

// パンくずリストコンポーネント（スポット詳細用）
interface SpotBreadcrumbProps {
  mapData: MapData | null;
  className?: string;
}

function SpotBreadcrumb({ mapData, className = '' }: SpotBreadcrumbProps) {
  const pathname = usePathname();
  const baseUrl = 'https://tokudoku.com';
  
  // パンくずアイテムを生成
  const breadcrumbItems = [
    { label: 'ホーム', href: '/' },
    { label: '公開マップ', href: '/public-maps' },
    { label: mapData?.title || 'マップ詳細', href: pathname, isCurrent: true },
  ];

  // JSON-LD構造化データ
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbItems.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.label,
      "item": new URL(item.href, baseUrl).toString()
    }))
  };

  return (
    <nav aria-label="breadcrumb" className={`flex items-center flex-wrap gap-1 text-sm ${className}`}>
      <Script
        id="spot-breadcrumb-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {breadcrumbItems.map((item, index) => (
        <div key={item.href} className="flex items-center">
          {index > 0 && <ChevronRightIcon className="h-4 w-4 text-[#8b6914]/50 mx-1" />}
          {item.isCurrent ? (
            <span className="font-bold text-[#3d2914] truncate max-w-[200px]" style={{ fontFamily: "'Noto Serif JP', serif" }}>
              {item.label}
            </span>
          ) : (
            <Link 
              href={item.href} 
              className="text-[#8b6914] hover:text-[#3d2914] hover:underline transition-colors flex items-center"
            >
              {index === 0 && <Home className="h-4 w-4 mr-1" />}
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}

export function SpotDetailClient({ spotId }: SpotDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedImageIndex, setExpandedImageIndex] = useState<{ spotIndex: number; imageIndex: number } | null>(null);
  const [currentImageIndices, setCurrentImageIndices] = useState<{ [key: number]: number }>({});
  const [targetOrder, setTargetOrder] = useState<number | null>(null);
  const [isTocOpen, setIsTocOpen] = useState(false); // 目次のトグル状態

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
        const orderParam = searchParams.get('order');
        if (orderParam) setTargetOrder(parseInt(orderParam, 10));

        const { data: mapDataResult, error: mapError } = await supabase
          .from('maps').select('*').eq('id', mapId).eq('is_deleted', false).single();

        if (mapError || !mapDataResult) {
          setError('マップ情報の取得に失敗しました。');
          return;
        }

        const locations = mapDataResult.locations || [];
        setMapData({
          id: mapDataResult.id,
          title: mapDataResult.title,
          hashtags: mapDataResult.hashtags,
          description: mapDataResult.description || null,
          locations: locations,
          total_locations: locations.length,
        });

        const initialIndices: { [key: number]: number } = {};
        locations.forEach((_: SpotLocation, index: number) => { initialIndices[index] = 0; });
        setCurrentImageIndices(initialIndices);
      } catch (error) {
        setError('予期しないエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };
    fetchMapData();
  }, [spotId, searchParams]);

  useEffect(() => {
    if (mapData && targetOrder !== null && !loading) {
      const targetIndex = mapData.locations.findIndex(loc => loc.order === targetOrder);
      if (targetIndex !== -1) {
        setTimeout(() => {
          const element = document.getElementById(`spot-${targetIndex}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('highlight-flash');
            setTimeout(() => { element.classList.remove('highlight-flash'); }, 2000);
          }
        }, 300);
      }
      setTargetOrder(null);
    }
  }, [mapData, targetOrder, loading]);

  const handleImageNav = (spotIndex: number, direction: 'prev' | 'next', totalImages: number) => {
    setCurrentImageIndices(prev => {
      const current = prev[spotIndex] || 0;
      const newIndex = direction === 'next' ? (current + 1) % totalImages : current === 0 ? totalImages - 1 : current - 1;
      return { ...prev, [spotIndex]: newIndex };
    });
  };

  const openInGoogleMaps = (location: SpotLocation) => {
    if (location?.store_latitude && location?.store_longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${location.store_latitude},${location.store_longitude}`;
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
    <div className="min-h-screen bg-[#f5e6d3]">
      <style jsx>{`
        @keyframes highlight {
          0%, 100% { box-shadow: 0 0 0 0 rgba(139, 105, 20, 0); }
          50% { box-shadow: 0 0 25px 8px rgba(139, 105, 20, 0.4); }
        }
        .highlight-flash { animation: highlight 1s ease-in-out 2; }
      `}</style>
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

      <main className="pt-20 pb-12">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto px-4">
          
          {/* パンくずリスト */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-[#fdf5e6]/80 backdrop-blur-sm rounded-lg border-2 border-[#d4c4a8]"
          >
            <SpotBreadcrumb mapData={mapData} />
          </motion.div>
          
          {/* タイトルセクション */}
          <section className="py-6 text-center">
            <h2 className="text-3xl font-extrabold mb-6 text-[#3d2914] tracking-tight" style={{ fontFamily: "'Noto Serif JP', serif" }}>
              {mapData.title}
            </h2>

            {mapData.description && (
              <div className="mb-6 bg-[#fff8f0] border-2 border-[#d4c4a8] rounded-lg p-5 text-left shadow-inner">
                <p className="text-[#5c3a21] leading-relaxed whitespace-pre-wrap font-medium">
                  {mapData.description}
                </p>
              </div>
            )}

            {/* 冒険の書風 目次改修 */}
            {mapData.locations && mapData.locations.length > 0 && (
              <div className="mt-8 border-4 border-double border-[#8b6914] bg-[#fdf5e6] shadow-[6px_6px_0px_0px_rgba(61,41,20,0.2)] overflow-hidden">
                <button 
                  onClick={() => setIsTocOpen(!isTocOpen)}
                  className="w-full p-4 flex items-center justify-between bg-[#8b6914] hover:bg-[#73370c] transition-all text-[#ffecd2]"
                >
                  <div className="flex items-center gap-3">
                    <ScrollText className="h-6 w-6" />
                    <span className="text-lg font-bold tracking-widest" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                      CONTENTS
                    </span>
                  </div>
                  {isTocOpen ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
                </button>

                <AnimatePresence>
                  {isTocOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] bg-[#fdf5e6]"
                    >
                      <div className="p-4 space-y-1">
                        {mapData.locations.map((location, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              const element = document.getElementById(`spot-${index}`);
                              if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                element.classList.add('highlight-flash');
                                setTimeout(() => { element.classList.remove('highlight-flash'); }, 2000);
                              }
                            }}
                            className="w-full flex items-center justify-start gap-4 px-4 py-3 border-b border-[#8b6914]/10 last:border-0 hover:bg-[#8b6914]/5 transition-all group"
                          >
                            <Sword className="h-4 w-4 text-[#8b6914] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
                            <span className="text-left font-bold text-[#5c3a21] text-base">
                              {String(index + 1).padStart(2, '0')}. {location.store_name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </section>

          {/* スポットカード一覧（RPG風デザイン＋スポット間移動表示） */}
          <div className="mt-12">
            {mapData.locations.map((location, index) => (
              <div key={index}>
                {/* スポットカード */}
                <motion.article
                  id={`spot-${index}`}
                  initial={{ opacity: 0, y: 30 }} 
                  whileInView={{ opacity: 1, y: 0 }} 
                  viewport={{ once: true }}
                  className="bg-[#fdf5e6] rounded-xl shadow-[0_10px_25px_-5px_rgba(61,41,20,0.15)] overflow-hidden border-4 border-double border-[#8b6914]"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    backgroundBlendMode: 'overlay',
                  }}
                >
                  <div className="p-6 relative">
                    {/* RPG風ヘッダー */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-[#8b6914] to-[#5c3a21] flex items-center justify-center text-[#ffecd2] font-bold text-xl shadow-lg border-2 border-[#ffecd2]">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-[#3d2914]" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                          {location.store_name}
                        </h3>
                      </div>
                    </div>

                    {/* 画像 */}
                    {location.image_urls && location.image_urls.length > 0 && (
                      <div className="relative aspect-[16/10] bg-gray-100 rounded-lg overflow-hidden mb-5 shadow-inner border-2 border-[#d4c4a8]">
                        <img
                          src={optimizeCloudinaryImageUrl(location.image_urls[currentImageIndices[index] || 0])}
                          alt={location.store_name}
                          className="w-full h-full object-cover cursor-pointer hover:scale-[1.03] transition-transform duration-500"
                          onClick={() => setExpandedImageIndex({ spotIndex: index, imageIndex: currentImageIndices[index] || 0 })}
                        />
                        {location.image_urls.length > 1 && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); handleImageNav(index, 'prev', location.image_urls.length); }}
                              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-[#8b6914] rounded-full text-white transition-all shadow-lg"><ChevronLeft /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleImageNav(index, 'next', location.image_urls.length); }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-[#8b6914] rounded-full text-white transition-all shadow-lg"><ChevronRight /></button>
                            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full text-[#ffecd2] text-xs font-bold border border-white/20">
                              <ImageIcon className="h-3.5 w-3.5" /> {(currentImageIndices[index] || 0) + 1} / {location.image_urls.length}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* コンテンツ（RPG風巻物デザイン） */}
                    <div className="bg-[#fff8f0] border-l-4 border-[#8b6914] rounded-r-lg p-4 mb-5 shadow-sm relative">
                      <Feather className="absolute -top-2 -left-2 h-5 w-5 text-[#8b6914] opacity-60" />
                      <p className="text-[#5c3a21] text-base leading-relaxed whitespace-pre-wrap">
                        {location.content}
                      </p>
                    </div>

                    {/* リンク */}
                    {location.url && (
                      <div className="mb-5">
                        <a href={location.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-white hover:bg-[#ffecd2] rounded-lg border-2 border-[#d4c4a8] transition-all group shadow-sm"
                        >
                          <img src={location.url.includes('instagram.com') ? 'https://res.cloudinary.com/dz9trbwma/image/upload/v1759308496/icons8-%E3%82%A4%E3%83%B3%E3%82%B9%E3%82%BF%E3%82%AF%E3%82%99%E3%83%A9%E3%83%A0-100_idedfz.png' : 'https://res.cloudinary.com/dz9trbwma/image/upload/v1759366399/icons8-%E3%82%A6%E3%82%A7%E3%83%95%E3%82%99-100_a6uwwq.png'}
                            alt="link" className="w-8 h-8 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[#8b6914] group-hover:underline truncate">
                              {location.url.includes('instagram') ? 'CHECK INSTAGRAM' : 'OFFICIAL WEBSITE'}
                            </p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-[#8b6914]" />
                        </a>
                      </div>
                    )}

                    {/* Googleマップボタン */}
                    {location.store_latitude && location.store_longitude && (
                      <Button onClick={() => openInGoogleMaps(location)} className="w-full bg-gradient-to-r from-[#8b6914] to-[#5c3a21] hover:from-[#5c3a21] hover:to-[#3d2914] text-[#ffecd2] font-bold py-5 rounded-xl shadow-lg transition-all active:scale-95 border-2 border-[#ffecd2]/30">
                        <Navigation className="mr-2 h-5 w-5" /> Googleマップで道案内
                      </Button>
                    )}
                  </div>
                </motion.article>

                {/* 🎮 RPG風タイムライン移動セクション（最後のスポット以外、かつ移動情報がある場合のみ表示） */}
                {index < mapData.locations.length - 1 && (location.next_transport || location.next_travel_time) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="relative py-4"
                  >
                    {/* タイムラインの縦線 */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-[#8b6914] via-[#d4c4a8] to-[#8b6914] -translate-x-1/2" />
                    
                    {/* RPG風移動コマンドウィンドウ */}
                    <div className="relative z-10 mx-auto max-w-[280px]">
                      <div 
                        className="bg-[#1a1a2e] border-4 border-[#ffecd2] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5),inset_2px_2px_0px_0px_rgba(255,255,255,0.1)] p-4"
                        style={{ fontFamily: "'DotGothic16', 'Courier New', monospace" }}
                      >
                        {/* ウィンドウヘッダー */}
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#ffecd2]/30">
                          <Compass className="h-4 w-4 text-[#ffecd2]" />
                          <span className="text-[#ffecd2] text-xs font-bold tracking-wider">MOVE TO NEXT</span>
                        </div>
                        
                        {/* 移動情報 */}
                        <div className="space-y-2">
                          {/* 移動手段 */}
                          {location.next_transport && (
                            <div className="flex items-center gap-3">
                              <span className="text-[#ffecd2] text-lg">▶</span>
                              <span className="text-2xl">
                                {TRANSPORT_ICONS[location.next_transport]?.icon || '🚶'}
                              </span>
                              <span className="text-[#ffecd2] text-sm font-bold">
                                {TRANSPORT_ICONS[location.next_transport]?.label || '移動'}
                              </span>
                            </div>
                          )}
                          
                          {/* 所要時間 */}
                          {location.next_travel_time && (
                            <div className={`flex items-center gap-3 ${location.next_transport ? 'pl-7' : ''}`}>
                              <Clock className="h-4 w-4 text-[#ffecd2]/70" />
                              <span className="text-[#ffecd2] text-sm">
                                約 <span className="text-lg font-bold text-[#ffd700]">{location.next_travel_time}</span> 分
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* 装飾的な矢印 */}
                      <div className="flex justify-center mt-2">
                        <motion.div
                          animate={{ y: [0, 4, 0] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="text-[#8b6914] text-2xl"
                        >
                          ▼
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* アクションボタン */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} size="icon" className="h-16 w-16 rounded-2xl shadow-2xl bg-[#5c3a21] border-2 border-[#ffecd2] flex flex-col items-center">
            <ArrowUpFromLine className="h-6 w-6 text-[#ffecd2]" />
            <span className="text-[10px] font-bold text-[#ffecd2]">TOP</span>
          </Button>
        </motion.div>
      </div>

      {/* 画像拡大モーダル */}
      <AnimatePresence>
        {expandedImageIndex !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4" onClick={() => setExpandedImageIndex(null)}>
            <button className="absolute top-6 right-6 p-2 bg-white/10 rounded-full"><X className="text-white h-8 w-8" /></button>
            <img 
              src={optimizeCloudinaryImageUrl(mapData.locations[expandedImageIndex.spotIndex].image_urls[expandedImageIndex.imageIndex])}
              alt={mapData.locations[expandedImageIndex.spotIndex].store_name}
              className="max-w-full max-h-full object-contain rounded shadow-2xl" 
              onClick={(e) => e.stopPropagation()} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}