"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  AlertCircle,
  X,
  Navigation,
  Tag,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ArrowUpFromLine,
  ChevronDown,
  ChevronUp,
  Clock,
  ArrowRight,
  Compass,
  Home,
  ChevronRight as ChevronRightIcon,
  Ship,
  Users,
  List,
  Activity
} from 'lucide-react';
import Script from 'next/script';
import Link from 'next/link';
import Image from 'next/image';
import { designTokens, TARGET_TAG_LABELS, TAG_ACTIVITIES, TAG_ACTIVITY_LABELS } from '@/lib/constants';
import { supabase } from '@/lib/supabaseClient';

// 移動手段アイコンマッピング
const TRANSPORT_ICONS: { [key: string]: { icon: string; label: string; color: string } } = {
  walk: { icon: '🚶', label: '徒歩', color: designTokens.colors.functional.success },
  bus: { icon: '🚌', label: 'バス', color: designTokens.colors.functional.info },
  taxi: { icon: '🚕', label: 'タクシー', color: designTokens.colors.functional.warning },
  car: { icon: '🚗', label: '車', color: designTokens.colors.accent.lilac },
  bicycle: { icon: '🚲', label: '自転車', color: designTokens.colors.primary.base },
  train: { icon: '🚃', label: '電車', color: designTokens.colors.functional.error },
  airplane: { icon: '✈️', label: '飛行機', color: designTokens.colors.functional.info },
  ship: { icon: '🚢', label: '船・フェリー', color: designTokens.colors.primary.base },
  ferry: { icon: '🚢', label: '船・フェリー', color: designTokens.colors.primary.base },
};

// CloudinaryのURLを高品質化する関数
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

interface TransportDetails {
  type: string;
  travelTime?: number;
  departureStop?: string;
  arrivalStop?: string;
  busLine?: string;
  departureStation?: string;
  arrivalStation?: string;
  lineName?: string;
  fare?: number;
  parkingInfo?: string;
  rentalInfo?: string;
  note?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  flightNumber?: string;
  departurePort?: string;
  arrivalPort?: string;
  ferryLine?: string;
  shipName?: string;
  segments?: Array<{
    id?: string;
    type?: string;
    travelTime?: number;
    departureStop?: string;
    arrivalStop?: string;
    busLine?: string;
    departureStation?: string;
    arrivalStation?: string;
    lineName?: string;
    fare?: number;
    departureAirport?: string;
    arrivalAirport?: string;
    flightNumber?: string;
    departurePort?: string;
    arrivalPort?: string;
    ferryLine?: string;
    shipName?: string;
    parkingInfo?: string;
    rentalInfo?: string;
    note?: string;
  }>;
}

interface SpotLocation {
  order: number;
  store_id: string;
  store_name: string;
  store_latitude?: number;
  store_longitude?: number;
  content: string;
  image_urls: string[];
  url?: string | null;
  stay_duration?: number;
  recommended_transport?: string;
  transport_details?: string | TransportDetails | null;
  next_transport?: string;
  next_travel_time?: number;
}

interface MapData {
  id: string;
  title: string;
  hashtags: string[] | null;
  description?: string | null;
  locations: SpotLocation[];
  total_locations: number;
  target_tags?: string[] | null;
  tag_activities?: Record<string, string[]> | null;
}

interface SpotDetailClientProps {
  spotId: string;
}

// パンくずリストコンポーネント（designTokensスタイル）
interface SpotBreadcrumbProps {
  mapData: MapData | null;
  className?: string;
}

function SpotBreadcrumb({ mapData, className = '' }: SpotBreadcrumbProps) {
  const pathname = usePathname();
  const baseUrl = 'https://tokudoku.com';

  const breadcrumbItems = [
    { label: 'ホーム', href: '/' },
    { label: 'コース一覧', href: '/courses' },
    { label: mapData?.title || 'マップ詳細', href: pathname, isCurrent: true },
  ];

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
          {index > 0 && <ChevronRightIcon className="h-4 w-4 mx-1" style={{ color: designTokens.colors.text.muted }} />}
          {item.isCurrent ? (
            <span className="font-medium truncate max-w-[200px]" style={{ color: designTokens.colors.text.primary }}>
              {item.label}
            </span>
          ) : (
            <Link
              href={item.href}
              className="flex items-center transition-colors hover:underline"
              style={{ color: designTokens.colors.accent.lilacDark }}
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

// 情報行コンポーネント（event-detail-clientと同じパターン）
const InfoRow = ({ icon: Icon, label, children, iconColor }: { icon: React.ElementType; label: string; children: React.ReactNode; iconColor?: string }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex items-start gap-4 group"
  >
    <div
      className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
      style={{
        background: `${iconColor || designTokens.colors.accent.lilac}20`,
      }}
    >
      <Icon className="h-5 w-5" style={{ color: iconColor || designTokens.colors.accent.lilac }} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold tracking-wide uppercase mb-1" style={{ color: designTokens.colors.text.muted }}>
        {label}
      </p>
      {children}
    </div>
  </motion.div>
);

export function SpotDetailClient({ spotId }: SpotDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedImageIndex, setExpandedImageIndex] = useState<{ spotIndex: number; imageIndex: number } | null>(null);
  const [currentImageIndices, setCurrentImageIndices] = useState<{ [key: number]: number }>({});
  const [targetOrder, setTargetOrder] = useState<number | null>(null);
  const [isTocOpen, setIsTocOpen] = useState(false);

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

        // target_tags と tag_activities のパース
        let targetTags = mapDataResult.target_tags;
        if (typeof targetTags === 'string') {
          try { targetTags = JSON.parse(targetTags); } catch { targetTags = null; }
        }
        let tagActivities = mapDataResult.tag_activities;
        if (typeof tagActivities === 'string') {
          try { tagActivities = JSON.parse(tagActivities); } catch { tagActivities = null; }
        }

        setMapData({
          id: mapDataResult.id,
          title: mapDataResult.title,
          hashtags: mapDataResult.hashtags,
          description: mapDataResult.description || null,
          locations: locations,
          total_locations: locations.length,
          target_tags: targetTags,
          tag_activities: tagActivities,
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

  // ローディング
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: designTokens.colors.background.mist }}>
        <div className="text-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
            <Compass className="h-12 w-12 mx-auto mb-4" style={{ color: designTokens.colors.accent.gold }} />
          </motion.div>
          <p className="font-medium" style={{ color: designTokens.colors.text.secondary }}>コース情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラー
  if (error || !mapData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: designTokens.colors.background.mist }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-8 max-w-md w-full text-center"
          style={{ background: designTokens.colors.background.white, boxShadow: designTokens.elevation.high }}
        >
          <AlertCircle className="h-16 w-16 mx-auto mb-4" style={{ color: designTokens.colors.functional.error }} />
          <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: designTokens.typography.display, color: designTokens.colors.text.primary }}>
            読み込みエラー
          </h2>
          <p className="mb-6" style={{ color: designTokens.colors.text.secondary }}>{error || '場所が見つかりませんでした。'}</p>
          <Button
            onClick={handleClose}
            className="w-full rounded-xl py-3"
            style={{ background: designTokens.colors.accent.lilac, color: designTokens.colors.text.inverse }}
          >
            戻る
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto pb-10" style={{ background: designTokens.colors.background.mist }}>
      <style jsx>{`
        @keyframes highlight {
          0%, 100% { box-shadow: 0 0 0 0 rgba(191, 163, 209, 0); }
          50% { box-shadow: 0 0 25px 8px rgba(191, 163, 209, 0.4); }
        }
        .highlight-flash { animation: highlight 1s ease-in-out 2; }
      `}</style>

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

      <div className="max-w-3xl mx-auto px-4 pt-6 relative z-10">
        {/* パンくずリスト */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-xl backdrop-blur-sm"
          style={{
            background: `${designTokens.colors.background.white}90`,
            boxShadow: designTokens.elevation.subtle,
          }}
        >
          <SpotBreadcrumb mapData={mapData} />
        </motion.div>

        {/* メインカード */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl overflow-hidden mb-6"
          style={{
            background: designTokens.colors.background.white,
            boxShadow: designTokens.elevation.high,
          }}
        >
          {/* ヘッダー部 */}
          <div className="p-6 sm:p-8">
            {/* タイトル */}
            <h1
              className="text-2xl sm:text-3xl font-semibold leading-tight mb-2"
              style={{
                fontFamily: designTokens.typography.display,
                color: designTokens.colors.text.primary,
              }}
            >
              {mapData.title}
            </h1>
            <div
              className="w-20 h-1 rounded-full mt-3 mb-6"
              style={{ background: `linear-gradient(90deg, ${designTokens.colors.accent.gold}, transparent)` }}
            />

            {/* 説明文 */}
            {mapData.description && (
              <div
                className="mb-6 p-5 rounded-2xl"
                style={{ background: designTokens.colors.background.cloud }}
              >
                <p
                  className="leading-relaxed whitespace-pre-wrap"
                  style={{
                    fontFamily: designTokens.typography.body,
                    color: designTokens.colors.text.primary,
                  }}
                >
                  {mapData.description}
                </p>
              </div>
            )}

            {/* ハッシュタグ */}
            {mapData.hashtags && mapData.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {mapData.hashtags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                      background: `${designTokens.colors.secondary.fern}15`,
                      color: designTokens.colors.secondary.fernDark,
                      border: `1px solid ${designTokens.colors.secondary.fern}30`,
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* 対象者タグ */}
            {mapData.target_tags && mapData.target_tags.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4" style={{ color: designTokens.colors.accent.lilac }} />
                  <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: designTokens.colors.text.muted }}>
                    Target
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {mapData.target_tags.map((tagId) => (
                    <div key={tagId}>
                      <span
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium"
                        style={{
                          background: `${designTokens.colors.accent.lilac}15`,
                          color: designTokens.colors.accent.lilacDark,
                          border: `1px solid ${designTokens.colors.accent.lilac}30`,
                        }}
                      >
                        {TARGET_TAG_LABELS[tagId] || tagId}
                      </span>
                      {/* タグアクティビティ表示 */}
                      {mapData.tag_activities && mapData.tag_activities[tagId] && mapData.tag_activities[tagId].length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5 ml-2">
                          {mapData.tag_activities[tagId].map((actId) => (
                            <span
                              key={actId}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                background: `${designTokens.colors.secondary.fern}12`,
                                color: designTokens.colors.secondary.fernDark,
                                border: `1px solid ${designTokens.colors.secondary.fern}25`,
                              }}
                            >
                              <Activity className="h-3 w-3" />
                              {TAG_ACTIVITY_LABELS[actId] || actId}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* スポット数 */}
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4" style={{ color: designTokens.colors.accent.gold }} />
              <span className="text-sm font-medium" style={{ color: designTokens.colors.text.secondary }}>
                {mapData.total_locations}箇所のスポット
              </span>
            </div>
          </div>
        </motion.div>

        {/* 目次カード */}
        {mapData.locations && mapData.locations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl overflow-hidden mb-8"
            style={{
              background: designTokens.colors.background.white,
              boxShadow: designTokens.elevation.medium,
            }}
          >
            <button
              onClick={() => setIsTocOpen(!isTocOpen)}
              className="w-full p-4 flex items-center justify-between transition-colors"
              style={{ background: `${designTokens.colors.accent.lilac}10` }}
            >
              <div className="flex items-center gap-3">
                <List className="h-5 w-5" style={{ color: designTokens.colors.accent.lilac }} />
                <span
                  className="text-base font-semibold tracking-wide"
                  style={{
                    fontFamily: designTokens.typography.display,
                    color: designTokens.colors.text.primary,
                  }}
                >
                  CONTENTS
                </span>
              </div>
              <motion.div
                animate={{ rotate: isTocOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown className="h-5 w-5" style={{ color: designTokens.colors.text.muted }} />
              </motion.div>
            </button>

            <AnimatePresence>
              {isTocOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="px-4 pb-4 space-y-1">
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
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all hover:scale-[1.01]"
                        style={{ background: 'transparent' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = `${designTokens.colors.background.cloud}`; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span
                          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                          style={{
                            background: `${designTokens.colors.accent.gold}20`,
                            color: designTokens.colors.accent.goldDark,
                          }}
                        >
                          {index + 1}
                        </span>
                        <span
                          className="text-left font-medium text-sm"
                          style={{ color: designTokens.colors.text.primary }}
                        >
                          {location.store_name}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* スポットカード一覧 */}
        <div className="space-y-0">
          {mapData.locations.map((location, index) => (
            <div key={index}>
              {/* スポットカード */}
              <motion.article
                id={`spot-${index}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
                className="rounded-3xl overflow-hidden"
                style={{
                  background: designTokens.colors.background.white,
                  boxShadow: designTokens.elevation.high,
                }}
              >
                {/* 画像カルーセル */}
                {location.image_urls && location.image_urls.length > 0 && (
                  <div className="relative w-full aspect-square max-h-[600px]" style={{ background: designTokens.colors.background.cloud }}>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentImageIndices[index] || 0}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="w-full h-full relative cursor-pointer"
                        onClick={() => setExpandedImageIndex({ spotIndex: index, imageIndex: currentImageIndices[index] || 0 })}
                      >
                        <Image
                          src={optimizeCloudinaryImageUrl(location.image_urls[currentImageIndices[index] || 0])}
                          alt={location.store_name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 768px"
                        />
                      </motion.div>
                    </AnimatePresence>

                    {location.image_urls.length > 1 && (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => { e.stopPropagation(); handleImageNav(index, 'prev', location.image_urls.length); }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md"
                          style={{
                            background: `${designTokens.colors.background.white}90`,
                            boxShadow: designTokens.elevation.medium,
                          }}
                        >
                          <ChevronLeft className="h-5 w-5" style={{ color: designTokens.colors.text.primary }} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => { e.stopPropagation(); handleImageNav(index, 'next', location.image_urls.length); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md"
                          style={{
                            background: `${designTokens.colors.background.white}90`,
                            boxShadow: designTokens.elevation.medium,
                          }}
                        >
                          <ChevronRight className="h-5 w-5" style={{ color: designTokens.colors.text.primary }} />
                        </motion.button>

                        {/* インジケーター */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                          {location.image_urls.map((_, imgIdx) => (
                            <button
                              key={imgIdx}
                              onClick={(e) => { e.stopPropagation(); setCurrentImageIndices(prev => ({ ...prev, [index]: imgIdx })); }}
                              className="w-2 h-2 rounded-full transition-all"
                              style={{
                                background: imgIdx === (currentImageIndices[index] || 0) ? designTokens.colors.accent.gold : `${designTokens.colors.background.white}80`,
                                transform: imgIdx === (currentImageIndices[index] || 0) ? 'scale(1.3)' : 'scale(1)',
                              }}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {/* スポット番号バッジ */}
                    <div
                      className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-lg backdrop-blur-md"
                      style={{
                        background: `${designTokens.colors.accent.gold}E0`,
                        color: designTokens.colors.text.primary,
                        boxShadow: designTokens.elevation.medium,
                      }}
                    >
                      {index + 1}
                    </div>
                  </div>
                )}

                {/* コンテンツ */}
                <div className="p-6 sm:p-8">
                  {/* 番号なしの場合のヘッダー */}
                  {(!location.image_urls || location.image_urls.length === 0) && (
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-lg"
                        style={{
                          background: `${designTokens.colors.accent.gold}20`,
                          color: designTokens.colors.accent.goldDark,
                        }}
                      >
                        {index + 1}
                      </div>
                      <h3
                        className="text-xl font-semibold"
                        style={{
                          fontFamily: designTokens.typography.display,
                          color: designTokens.colors.text.primary,
                        }}
                      >
                        {location.store_name}
                      </h3>
                    </div>
                  )}

                  {/* 画像がある場合のタイトル */}
                  {location.image_urls && location.image_urls.length > 0 && (
                    <h3
                      className="text-xl font-semibold mb-4"
                      style={{
                        fontFamily: designTokens.typography.display,
                        color: designTokens.colors.text.primary,
                      }}
                    >
                      {location.store_name}
                    </h3>
                  )}

                  {/* 本文 */}
                  <div
                    className="mb-6 p-5 rounded-2xl"
                    style={{ background: designTokens.colors.background.cloud }}
                  >
                    <p
                      className="leading-relaxed whitespace-pre-wrap"
                      style={{
                        fontFamily: designTokens.typography.body,
                        color: designTokens.colors.text.primary,
                      }}
                    >
                      {location.content}
                    </p>
                  </div>

                  {/* 詳細情報 */}
                  <div className="space-y-5" style={{ borderTop: `1px dashed ${designTokens.colors.secondary.stone}50`, paddingTop: '1.25rem' }}>
                    {/* 滞在時間 */}
                    {location.stay_duration && (
                      <InfoRow icon={Clock} label="Stay Duration" iconColor={designTokens.colors.accent.gold}>
                        <p className="text-base font-semibold" style={{ color: designTokens.colors.text.primary }}>
                          約{location.stay_duration}分
                        </p>
                      </InfoRow>
                    )}

                    {/* リンク */}
                    {location.url && (
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold tracking-wide uppercase mb-1" style={{ color: designTokens.colors.text.muted }}>
                            Media
                          </p>
                          <a href={location.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 transition-transform hover:scale-110">
                            <img
                              src={location.url.includes('instagram.com')
                                ? 'https://res.cloudinary.com/dz9trbwma/image/upload/v1759308496/icons8-%E3%82%A4%E3%83%B3%E3%82%B9%E3%82%BF%E3%82%AF%E3%82%99%E3%83%A9%E3%83%A0-100_idedfz.png'
                                : 'https://res.cloudinary.com/dz9trbwma/image/upload/v1759366399/icons8-%E3%82%A6%E3%82%A7%E3%83%95%E3%82%99-100_a6uwwq.png'
                              }
                              alt="Media icon"
                              className="h-10 w-10 rounded-xl p-1"
                              style={{
                                background: designTokens.colors.background.white,
                                border: `1px solid ${designTokens.colors.secondary.stone}`,
                              }}
                            />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Googleマップ */}
                    {location.store_latitude && location.store_longitude && (
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold tracking-wide uppercase mb-1" style={{ color: designTokens.colors.text.muted }}>
                            Location
                          </p>
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                              onClick={() => openInGoogleMaps(location)}
                              className="w-full h-12 rounded-xl font-semibold"
                              style={{
                                background: designTokens.colors.accent.lilac,
                                color: designTokens.colors.text.inverse,
                                boxShadow: `0 4px 16px ${designTokens.colors.accent.lilac}40`,
                              }}
                            >
                              <Navigation className="mr-2 h-5 w-5" /> Googleマップで道案内
                            </Button>
                          </motion.div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.article>

              {/* 移動セクション（最後のスポット以外に表示） */}
              {index < mapData.locations.length - 1 && (() => {
                let transportDetails: TransportDetails | null = null;

                if (location?.transport_details) {
                  if (typeof location.transport_details === 'string') {
                    try {
                      transportDetails = JSON.parse(location.transport_details);
                    } catch {
                      transportDetails = null;
                    }
                  } else {
                    transportDetails = location.transport_details as TransportDetails;
                  }
                }

                let segmentData: any = null;
                if (transportDetails && 'segments' in transportDetails && transportDetails.segments && transportDetails.segments.length > 0) {
                  segmentData = transportDetails.segments[0];
                  const totalTravelTime = transportDetails.segments.reduce((sum: number, s: any) => sum + (s.travelTime || 0), 0);
                  const totalFare = transportDetails.segments.reduce((sum: number, s: any) => sum + (s.fare || 0), 0);
                  if (segmentData && !segmentData.travelTime && totalTravelTime > 0) {
                    segmentData.travelTime = totalTravelTime;
                  }
                  if (segmentData && !segmentData.fare && totalFare > 0) {
                    segmentData.fare = totalFare;
                  }
                }

                const transportType = segmentData?.type || transportDetails?.type || location?.recommended_transport || location.next_transport;
                const travelTime = segmentData?.travelTime || transportDetails?.travelTime || location.next_travel_time;

                // 移動情報がない場合はシンプルな接続線
                if (!transportType || transportType === 'none') {
                  return (
                    <div className="relative py-6">
                      <div className="flex flex-col items-center">
                        <div className="w-px h-6" style={{ background: `linear-gradient(to bottom, ${designTokens.colors.secondary.stone}, ${designTokens.colors.secondary.stoneLight})` }} />
                        <motion.div
                          animate={{ y: [0, 4, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <ChevronDown className="h-5 w-5" style={{ color: designTokens.colors.accent.lilac }} />
                        </motion.div>
                        <div className="w-px h-6" style={{ background: `linear-gradient(to bottom, ${designTokens.colors.secondary.stoneLight}, ${designTokens.colors.secondary.stone})` }} />
                      </div>
                    </div>
                  );
                }

                const transportIcon = TRANSPORT_ICONS[transportType];

                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="relative py-4"
                  >
                    {/* 上の接続線 */}
                    <div className="flex flex-col items-center">
                      <div className="w-px h-4" style={{ background: designTokens.colors.secondary.stone }} />
                    </div>

                    {/* 移動カード */}
                    <div className="mx-auto max-w-[320px]">
                      <div
                        className="rounded-2xl p-4"
                        style={{
                          background: `${designTokens.colors.background.white}`,
                          border: `1px dashed ${designTokens.colors.secondary.stone}`,
                          boxShadow: designTokens.elevation.subtle,
                        }}
                      >
                        {/* 移動手段 */}
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{transportIcon?.icon || '🚶'}</span>
                          <span
                            className="text-sm font-semibold"
                            style={{ color: designTokens.colors.text.primary }}
                          >
                            {transportIcon?.label || '移動'}
                          </span>
                          {travelTime && (
                            <span
                              className="ml-auto text-sm font-semibold px-3 py-1 rounded-full"
                              style={{
                                background: `${designTokens.colors.accent.gold}20`,
                                color: designTokens.colors.accent.goldDark,
                              }}
                            >
                              約{travelTime}分
                            </span>
                          )}
                        </div>

                        {/* 詳細情報 */}
                        {(transportDetails || segmentData) && (
                          <div className="space-y-1.5 pt-2" style={{ borderTop: `1px solid ${designTokens.colors.secondary.stone}30` }}>
                            {/* バス停情報 */}
                            {transportType === 'bus' && (segmentData?.departureStop || segmentData?.arrivalStop || transportDetails?.departureStop || transportDetails?.arrivalStop) && (
                              <p className="text-xs" style={{ color: designTokens.colors.text.secondary }}>
                                🚏 {(segmentData?.departureStop || transportDetails?.departureStop) || '?'} → {(segmentData?.arrivalStop || transportDetails?.arrivalStop) || '?'}
                                {(segmentData?.busLine || transportDetails?.busLine) && (
                                  <span style={{ color: designTokens.colors.text.muted }}> ({segmentData?.busLine || transportDetails?.busLine})</span>
                                )}
                              </p>
                            )}

                            {/* 駅情報 */}
                            {transportType === 'train' && (segmentData?.departureStation || segmentData?.arrivalStation || transportDetails?.departureStation || transportDetails?.arrivalStation) && (
                              <p className="text-xs" style={{ color: designTokens.colors.text.secondary }}>
                                🚉 {(segmentData?.departureStation || transportDetails?.departureStation) || '?'} → {(segmentData?.arrivalStation || transportDetails?.arrivalStation) || '?'}
                                {(segmentData?.lineName || transportDetails?.lineName) && (
                                  <span style={{ color: designTokens.colors.text.muted }}> ({segmentData?.lineName || transportDetails?.lineName})</span>
                                )}
                              </p>
                            )}

                            {/* 空港情報 */}
                            {transportType === 'airplane' && (segmentData?.departureAirport || segmentData?.arrivalAirport || transportDetails?.departureAirport || transportDetails?.arrivalAirport) && (
                              <p className="text-xs" style={{ color: designTokens.colors.text.secondary }}>
                                ✈️ {(segmentData?.departureAirport || transportDetails?.departureAirport) || '?'} → {(segmentData?.arrivalAirport || transportDetails?.arrivalAirport) || '?'}
                                {(segmentData?.flightNumber || transportDetails?.flightNumber) && (
                                  <span style={{ color: designTokens.colors.text.muted }}> ({segmentData?.flightNumber || transportDetails?.flightNumber})</span>
                                )}
                              </p>
                            )}

                            {/* 船・フェリー情報 */}
                            {(transportType === 'ferry' || transportType === 'ship') && (segmentData?.departurePort || segmentData?.arrivalPort || transportDetails?.departurePort || transportDetails?.arrivalPort) && (
                              <p className="text-xs" style={{ color: designTokens.colors.text.secondary }}>
                                ⚓ {(segmentData?.departurePort || transportDetails?.departurePort) || '?'} → {(segmentData?.arrivalPort || transportDetails?.arrivalPort) || '?'}
                                {(segmentData?.ferryLine || segmentData?.shipName || transportDetails?.ferryLine || transportDetails?.shipName) && (
                                  <span style={{ color: designTokens.colors.text.muted }}>
                                    {' '}({segmentData?.ferryLine || transportDetails?.ferryLine || transportDetails?.shipName || segmentData?.shipName})
                                  </span>
                                )}
                              </p>
                            )}

                            {/* 運賃 */}
                            {(segmentData?.fare || transportDetails?.fare) && (
                              <p className="text-xs font-medium" style={{ color: designTokens.colors.accent.goldDark }}>
                                💰 ¥{(segmentData?.fare || transportDetails?.fare).toLocaleString()}
                              </p>
                            )}

                            {/* 駐車場情報 */}
                            {transportType === 'car' && (segmentData?.parkingInfo || transportDetails?.parkingInfo) && (
                              <p className="text-xs" style={{ color: designTokens.colors.text.secondary }}>
                                🅿️ {segmentData?.parkingInfo || transportDetails?.parkingInfo}
                              </p>
                            )}

                            {/* メモ */}
                            {(segmentData?.note || transportDetails?.note) && (
                              <p className="text-xs italic" style={{ color: designTokens.colors.text.muted }}>
                                📝 {segmentData?.note || transportDetails?.note}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 下の接続線 + 矢印 */}
                    <div className="flex flex-col items-center">
                      <div className="w-px h-2" style={{ background: designTokens.colors.secondary.stone }} />
                      <motion.div
                        animate={{ y: [0, 4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <ChevronDown className="h-5 w-5" style={{ color: designTokens.colors.accent.lilac }} />
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })()}
            </div>
          ))}
        </div>
      </div>

      {/* スクロールトップFAB */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md"
        style={{
          background: `${designTokens.colors.accent.lilac}E0`,
          color: designTokens.colors.text.inverse,
          boxShadow: `0 8px 24px ${designTokens.colors.accent.lilac}40`,
        }}
      >
        <ArrowUpFromLine className="h-5 w-5" />
      </motion.button>

      {/* 画像拡大モーダル */}
      <AnimatePresence>
        {expandedImageIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
            onClick={() => setExpandedImageIndex(null)}
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: `${designTokens.colors.background.white}20` }}
            >
              <X className="h-6 w-6" style={{ color: designTokens.colors.text.inverse }} />
            </motion.button>
            <img
              src={optimizeCloudinaryImageUrl(mapData.locations[expandedImageIndex.spotIndex].image_urls[expandedImageIndex.imageIndex])}
              alt={mapData.locations[expandedImageIndex.spotIndex].store_name}
              className="max-w-full max-h-full object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
              style={{ boxShadow: designTokens.elevation.dramatic }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=IBM+Plex+Sans+JP:wght@400;500;600&family=Noto+Sans+JP:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
}
