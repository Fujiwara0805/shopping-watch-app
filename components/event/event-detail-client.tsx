"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Compass, MapPin, Calendar, ExternalLink, AlertCircle, Phone, FileText, DollarSign, Link as LinkIcon, ChevronLeft, ChevronRight, X, CalendarPlusIcon, Shield, ScrollText, Search, Home, ChevronRight as ChevronRightIcon, ArrowLeft, Share2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import Script from 'next/script';
import Link from 'next/link';
import Image from 'next/image';
import { designTokens, COLORS } from '@/lib/constants';

interface EventDetail {
  id: string;
  category: string | null;
  store_name: string;
  content: string;
  store_latitude: number;
  store_longitude: number;
  created_at: string;
  expires_at: string;
  image_urls: string[] | null;
  event_name?: string | null;
  event_price?: string | null;
  prefecture?: string | null;
  city?: string | null;
  address?: string | null;
  url?: string | null;
  phone_number?: string | null;
  file_urls?: string[] | null;
  event_start_date?: string | null;
  event_end_date?: string | null;
}

interface EventDetailClientProps {
  eventId: string;
}

// パンくずリストコンポーネント
interface EventBreadcrumbProps {
  event: EventDetail | null;
  className?: string;
}

function EventBreadcrumb({ event, className = '' }: EventBreadcrumbProps) {
  const pathname = usePathname();
  const baseUrl = 'https://tokudoku.com';
  
  const breadcrumbItems = [
    { label: 'ホーム', href: '/' },
    { label: '大分県', href: '/events' },
    ...(event?.city ? [{ label: event.city, href: `/events?city=${encodeURIComponent(event.city)}` }] : []),
    { label: event?.event_name || 'イベント詳細', href: pathname, isCurrent: true },
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
        id="event-breadcrumb-jsonld"
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

// 情報行コンポーネント
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

export function EventDetailClient({ eventId }: EventDetailClientProps) {
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);

  const handleBack = () => {
    router.push('/events');
  };

  // 表示する画像が切り替わったら画像ローディングを表示
  useEffect(() => {
    if (event?.image_urls?.length) setImageLoading(true);
  }, [currentImageIndex]);

  useEffect(() => {
    if (!eventId) return;
    const fetchEventDetail = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const { data, error } = await supabase
          .from('posts').select('*').eq('id', eventId).eq('is_deleted', false).single();

        if (error || !data) {
          setError(error ? 'イベント情報の取得に失敗しました。' : 'イベントが見つかりませんでした。');
          return;
        }

        let isEventEnded = false;
        if (data.event_end_date) {
          const endDate = new Date(data.event_end_date);
          endDate.setHours(23, 59, 59, 999);
          isEventEnded = now > endDate;
        } else if (data.event_start_date) {
          const startDate = new Date(data.event_start_date);
          startDate.setHours(23, 59, 59, 999);
          isEventEnded = now > startDate;
        } else {
          isEventEnded = now > new Date(data.expires_at);
        }

        if (isEventEnded) {
          setError('このイベントは終了しました。');
          return;
        }

        const normalizeUrls = (val: any) => {
          if (typeof val === 'string') {
            try { return JSON.parse(val); } catch { return null; }
          }
          return val;
        };

        setEvent({
          ...data,
          image_urls: normalizeUrls(data.image_urls),
          file_urls: normalizeUrls(data.file_urls)
        });
      } catch (error) {
        setError('予期しないエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };
    fetchEventDetail();
  }, [eventId]);

  const getEventStatus = () => {
    if (!event) return { status: '未定', color: 'gray', remainingTime: '' };
    const now = new Date();
    const startDate = event.event_start_date ? new Date(event.event_start_date) : null;
    let endDate: Date;
    if (event.event_end_date) {
      endDate = new Date(event.event_end_date);
      endDate.setHours(23, 59, 59, 999);
    } else if (event.event_start_date) {
      endDate = new Date(event.event_start_date);
      endDate.setHours(23, 59, 59, 999);
    } else {
      endDate = new Date(event.expires_at);
    }

    if (startDate && now < startDate) {
      const diffDays = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { status: '開催予定', color: designTokens.colors.functional.info, remainingTime: `開催まであと${diffDays}日` };
    }
    if (now <= endDate) {
      const diffMs = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
      let remainingText = diffDays > 1 ? `あと${diffDays}日` : diffHours > 1 ? `あと${diffHours}時間` : 'まもなく終了';
      return { status: '開催中', color: designTokens.colors.functional.success, remainingTime: remainingText };
    }
    return { status: '終了', color: designTokens.colors.text.muted, remainingTime: '' };
  };

  // ローディング
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: designTokens.colors.background.mist }}>
        <div className="text-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
            <Compass className="h-12 w-12 mx-auto mb-4" style={{ color: designTokens.colors.accent.gold }} />
          </motion.div>
          <p className="font-medium" style={{ color: designTokens.colors.text.secondary }}>イベント情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラー
  if (error || !event) {
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
          <p className="mb-6" style={{ color: designTokens.colors.text.secondary }}>{error || 'イベントが見つかりませんでした。'}</p>
          <Button 
            onClick={handleBack} 
            className="w-full rounded-xl py-3"
            style={{ background: designTokens.colors.accent.lilac, color: designTokens.colors.text.inverse }}
          >
            戻る
          </Button>
        </motion.div>
      </div>
    );
  }

  const eventStatus = getEventStatus();

  return (
    <div className="min-h-screen overflow-y-auto pb-10" style={{ background: designTokens.colors.background.mist }}>
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
          <EventBreadcrumb event={event} />
        </motion.div>
        
        {/* メインカード */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl overflow-hidden"
          style={{ 
            background: designTokens.colors.background.white,
            boxShadow: designTokens.elevation.high,
          }}
        >
          {/* 画像カルーセル */}
          <div className="relative w-full aspect-square max-h-[600px]" style={{ background: designTokens.colors.background.cloud }}>
            {event.image_urls && event.image_urls.length > 0 ? (
              <>
                {/* 画像読込中: 既存のコンパスローディング */}
                <AnimatePresence>
                  {imageLoading && (
                    <motion.div
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 z-10 flex items-center justify-center"
                      style={{ background: designTokens.colors.background.cloud }}
                    >
                      <div className="text-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        >
                          <Compass className="h-12 w-12 mx-auto mb-2" style={{ color: designTokens.colors.accent.gold }} />
                        </motion.div>
                        <p className="text-sm font-medium" style={{ color: designTokens.colors.text.secondary }}>画像を読み込み中...</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentImageIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full relative"
                  >
                    <Image
                      src={event.image_urls[currentImageIndex]}
                      alt={event.event_name || event.store_name}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 768px"
                      priority={currentImageIndex === 0}
                      onLoad={() => setImageLoading(false)}
                      onError={() => setImageLoading(false)}
                    />
                  </motion.div>
                </AnimatePresence>
                
                {event.image_urls.length > 1 && (
                  <>
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setCurrentImageIndex((prev) => (prev - 1 + event.image_urls!.length) % event.image_urls!.length)}
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
                      onClick={() => setCurrentImageIndex((prev) => (prev + 1) % event.image_urls!.length)}
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
                      {event.image_urls.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className="w-2 h-2 rounded-full transition-all"
                          style={{ 
                            background: index === currentImageIndex ? designTokens.colors.accent.gold : `${designTokens.colors.background.white}80`,
                            transform: index === currentImageIndex ? 'scale(1.3)' : 'scale(1)',
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <ScrollText className="h-24 w-24" style={{ color: designTokens.colors.text.muted }} />
              </div>
            )}
            
            {/* 閉じるボタン */}
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleBack} 
              className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md"
              style={{ 
                background: `${designTokens.colors.text.primary}90`,
                color: designTokens.colors.text.inverse,
              }}
            >
              <X className="h-5 w-5" />
            </motion.button>
            
            {/* 戻るボタン */}
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleBack} 
              className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md"
              style={{ 
                background: `${designTokens.colors.background.white}90`,
                boxShadow: designTokens.elevation.medium,
              }}
            >
              <ArrowLeft className="h-5 w-5" style={{ color: designTokens.colors.text.primary }} />
            </motion.button>
          </div>

          {/* コンテンツ */}
          <div className="p-6 sm:p-8">
            {/* ステータスと名前 */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <span 
                  className="px-4 py-1.5 rounded-full text-xs font-semibold"
                  style={{ 
                    background: `${eventStatus.color}20`,
                    color: eventStatus.color,
                  }}
                >
                  {eventStatus.status}
                </span>
                {eventStatus.remainingTime && (
                  <motion.span 
                    animate={{ opacity: [1, 0.6, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-sm font-semibold"
                    style={{ color: designTokens.colors.functional.warning }}
                  >
                    {eventStatus.remainingTime}
                  </motion.span>
                )}
              </div>
              <h1 
                className="text-2xl sm:text-3xl font-semibold leading-tight"
                style={{ 
                  fontFamily: designTokens.typography.display,
                  color: designTokens.colors.text.primary,
                }}
              >
                {event.event_name}
              </h1>
              <div 
                className="w-20 h-1 rounded-full mt-4"
                style={{ background: `linear-gradient(90deg, ${designTokens.colors.accent.gold}, transparent)` }}
              />
            </div>

            {/* 本文 */}
            <div 
              className="mb-8 p-5 rounded-2xl relative"
              style={{ background: designTokens.colors.background.cloud }}
            >
              <p 
                className="leading-relaxed whitespace-pre-wrap"
                style={{ 
                  fontFamily: designTokens.typography.body,
                  color: designTokens.colors.text.primary,
                }}
              >
                {event.content}
              </p>
            </div>

            {/* 詳細情報 */}
            <div className="space-y-6 pt-6" style={{ borderTop: `1px dashed ${designTokens.colors.secondary.stone}50` }}>
              
              {/* 開催場所 */}
              <InfoRow icon={MapPin} label="Location" iconColor={designTokens.colors.functional.error}>
                <p className="text-lg font-semibold mb-2" style={{ color: designTokens.colors.text.primary }}>{event.store_name}</p>
                <Button 
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${event.store_name}`, '_blank')}
                  variant="link" 
                  className="p-0 h-auto font-medium underline decoration-dotted"
                  style={{ color: designTokens.colors.accent.lilacDark }}
                >
                  Google Mapで開く
                </Button>
              </InfoRow>

              {/* 開催期日 */}
              <InfoRow icon={Calendar} label="Period" iconColor={designTokens.colors.functional.info}>
                <div className="text-lg font-semibold mb-2" style={{ color: designTokens.colors.text.primary }}>
                  {event.event_start_date ? (
                    <>
                      {new Date(event.event_start_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                      {event.event_end_date && event.event_end_date !== event.event_start_date && (
                        <>
                          <span className="mx-2" style={{ color: designTokens.colors.text.muted }}>〜</span>
                          {new Date(event.event_end_date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}
                        </>
                      )}
                    </>
                  ) : (
                    <span>{new Date(event.expires_at).toLocaleDateString('ja-JP')}まで</span>
                  )}
                </div>
                {event.event_start_date && (
                  <Button 
                    onClick={() => {
                      const startDate = new Date(event.event_start_date!);
                      const endDate = event.event_end_date ? new Date(event.event_end_date) : startDate;
                      const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
                      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.event_name || '')}&dates=${fmt(startDate)}/${fmt(new Date(endDate.getTime() + 86400000))}&location=${encodeURIComponent(event.store_name)}`;
                      window.open(url, '_blank');
                    }} 
                    variant="outline" 
                    className="mt-2 rounded-xl h-10 font-medium"
                    style={{ 
                      borderColor: designTokens.colors.secondary.stone,
                      color: designTokens.colors.text.secondary,
                    }}
                  >
                    <CalendarPlusIcon className="h-4 w-4 mr-2" />
                    Googleカレンダーに追加
                  </Button>
                )}
              </InfoRow>

              {/* 料金 */}
              {event.event_price && (
                <InfoRow icon={DollarSign} label="Cost" iconColor={designTokens.colors.functional.success}>
                  <p className="text-lg font-semibold" style={{ color: designTokens.colors.text.primary }}>{event.event_price}</p>
                </InfoRow>
              )}

              {/* 連絡先 */}
              {event.phone_number && (
                <InfoRow icon={Phone} label="Contact" iconColor={designTokens.colors.functional.warning}>
                  <a 
                    href={`tel:${event.phone_number}`} 
                    className="text-lg font-semibold underline decoration-dotted"
                    style={{ color: designTokens.colors.text.primary }}
                  >
                    {event.phone_number}
                  </a>
                </InfoRow>
              )}

              {/* メディアリンク */}
              {event.url && (
                <InfoRow icon={LinkIcon} label="Media" iconColor={designTokens.colors.accent.lilac}>
                  <a href={event.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 transition-transform hover:scale-110">
                    <img 
                      src={event.url.includes('instagram.com') 
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
                </InfoRow>
              )}

              {/* 添付ファイル */}
              {event.file_urls && event.file_urls.length > 0 && (
                <InfoRow icon={FileText} label="Attachments" iconColor={designTokens.colors.text.secondary}>
                  <div className="space-y-2 mt-1">
                    {event.file_urls.map((fileUrl, index) => (
                      <motion.a 
                        key={index} 
                        href={fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        whileHover={{ scale: 1.01 }}
                        className="flex items-center justify-between p-3 rounded-xl group transition-all"
                        style={{ 
                          background: designTokens.colors.background.mist,
                          border: `1px solid ${designTokens.colors.secondary.stone}50`,
                        }}
                      >
                        <span className="text-sm font-medium" style={{ color: designTokens.colors.text.primary }}>添付資料 {index + 1}</span>
                        <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-1" style={{ color: designTokens.colors.accent.lilacDark }} />
                      </motion.a>
                    ))}
                  </div>
                </InfoRow>
              )}
            </div>

            {/* アクションボタン */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={() => event.url ? window.open(event.url, '_blank') : window.open(`https://www.google.com/maps/search/?api=1&query=${event.store_name}`, '_blank')}
                  className="w-full h-14 rounded-xl font-semibold text-base"
                  style={{ 
                    background: designTokens.colors.accent.lilac,
                    color: designTokens.colors.text.inverse,
                    boxShadow: `0 8px 24px ${designTokens.colors.accent.lilac}40`,
                  }}
                >
                  <Search className="mr-2 h-5 w-5" />
                  {event.url ? '詳細情報を確認' : '地図で確認'}
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={handleBack} 
                  variant="outline"
                  className="w-full h-14 rounded-xl font-semibold text-base"
                  style={{ 
                    borderColor: designTokens.colors.secondary.stone,
                    color: designTokens.colors.text.secondary,
                  }}
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  イベント一覧へ
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=IBM+Plex+Sans+JP:wght@400;500;600&family=Noto+Sans+JP:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
}
