"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Compass,
  MapPin, Calendar, ExternalLink, AlertCircle, Phone, 
  FileText, DollarSign, Link as LinkIcon, ChevronLeft, 
  ChevronRight, X, CalendarPlusIcon, Shield, ScrollText, Search,
  Home, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import Script from 'next/script';
import Link from 'next/link';

// 🎨 LPカラーパレット
const COLORS = {
  primary: '#8b6914',      // ゴールドブラウン
  primaryDark: '#3d2914',  // ダークブラウン
  secondary: '#5c3a21',    // ミディアムブラウン
  background: '#f5e6d3',   // ベージュ
  surface: '#fdf5e6',      // 羊皮紙色
  cream: '#ffecd2',        // クリーム
  border: '#d4c4a8',       // ライトベージュ
};

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

// パンくずリストコンポーネント（イベント詳細用）
interface EventBreadcrumbProps {
  event: EventDetail | null;
  className?: string;
}

function EventBreadcrumb({ event, className = '' }: EventBreadcrumbProps) {
  const pathname = usePathname();
  const baseUrl = 'https://tokudoku.com';
  
  // パンくずアイテムを生成
  const breadcrumbItems = [
    { label: 'ホーム', href: '/' },
    { label: '大分県', href: '/events' },
    ...(event?.city ? [{ label: event.city, href: `/events?city=${encodeURIComponent(event.city)}` }] : []),
    { label: event?.event_name || 'イベント詳細', href: pathname, isCurrent: true },
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
        id="event-breadcrumb-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {breadcrumbItems.map((item, index) => (
        <div key={item.href} className="flex items-center">
          {index > 0 && <ChevronRightIcon className="h-4 w-4 text-[#8b6914]/50 mx-1" />}
          {item.isCurrent ? (
            <span className="font-bold text-[#3d2914] truncate max-w-[200px]">
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

export function EventDetailClient({ eventId }: EventDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleBack = () => {
    const from = searchParams.get('from');
    if (from === 'events') {
      const city = searchParams.get('city');
      const sort = searchParams.get('sort');
      const duration = searchParams.get('duration');
      const params = new URLSearchParams();
      if (city) params.set('city', city);
      if (sort) params.set('sort', sort);
      if (duration) params.set('duration', duration);
      router.push(`/events?${params.toString()}`);
    } else {
      router.back();
    }
  };

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
      return { status: '開催予定', color: 'blue', remainingTime: `開催まであと${diffDays}日` };
    }
    if (now <= endDate) {
      const diffMs = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
      let remainingText = diffDays > 1 ? `あと${diffDays}日` : diffHours > 1 ? `あと${diffHours}時間` : 'まもなく終了';
      return { status: '開催中', color: 'green', remainingTime: remainingText };
    }
    return { status: '終了', color: 'gray', remainingTime: '' };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5e6d3]">
        <div className="text-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
            <Compass className="h-12 w-12 text-[#8b6914] mx-auto mb-4" />
          </motion.div>
          <p className="text-[#5c3a21] font-bold">イベント情報を解析中...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5e6d3] p-4">
        <div className="bg-[#fdf5e6] border-4 border-double border-[#8b6914] shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-700 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#3d2914] mb-2 font-serif">通信エラー</h2>
          <p className="text-[#5c3a21] font-bold mb-6">{error || 'イベントが見つかりませんでした。'}</p>
          <Button onClick={handleBack} className="w-full bg-[#8b6914] text-white hover:bg-[#3d2914] font-bold">戻る</Button>
        </div>
      </div>
    );
  }

  const eventStatus = getEventStatus();
  const statusColors = {
    green: { bg: 'bg-green-700', text: 'text-white', label: '現着可能' },
    blue: { bg: 'bg-blue-700', text: 'text-white', label: '待機中' },
    gray: { bg: 'bg-gray-600', text: 'text-white', label: '終了' }
  };
  const colors = statusColors[eventStatus.color as keyof typeof statusColors];

  return (
    <div className="min-h-screen bg-[#f5e6d3] overflow-y-auto pb-10">
      {/* 羊皮紙テクスチャ風オーバーレイ */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] z-0" />

      <div className="max-w-3xl mx-auto px-4 pt-6 relative z-10">
        {/* パンくずリスト */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-[#fdf5e6]/80 backdrop-blur-sm rounded-lg border-2 border-[#d4c4a8]"
        >
          <EventBreadcrumb event={event} />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#fdf5e6] border-4 border-double border-[#8b6914] shadow-[8px_8px_0px_0px_rgba(61,41,20,0.2)] overflow-hidden"
        >
          {/* 画像カルーセル */}
          <div className="relative h-64 sm:h-96 w-full bg-[#3d2914] border-b-4 border-[#8b6914]">
            {event.image_urls && event.image_urls.length > 0 ? (
              <>
                <img
                  src={event.image_urls[currentImageIndex]}
                  alt={event.event_name || event.store_name}
                  className="w-full h-full object-cover"
                />
                {event.image_urls.length > 1 && (
                  <>
                    <button onClick={() => setCurrentImageIndex((prev) => (prev - 1 + event.image_urls!.length) % event.image_urls!.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-[#3d2914]/80 text-[#ffecd2] p-2 border-2 border-[#8b6914]">
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button onClick={() => setCurrentImageIndex((prev) => (prev + 1) % event.image_urls!.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#3d2914]/80 text-[#ffecd2] p-2 border-2 border-[#8b6914]">
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="h-full w-full flex items-center justify-center opacity-40">
                <ScrollText className="h-32 w-32 text-white" />
              </div>
            )}
            
            {/* 右上の閉じるボタン */}
            <button onClick={handleBack} className="absolute top-4 right-4 bg-[#8b2323] text-white p-1 border-2 border-[#ffecd2] shadow-md hover:bg-red-800 transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-4 sm:p-8">
            {/* ステータスと名前 */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <span className={`${colors.bg} ${colors.text} px-3 py-1 text-xs font-bold tracking-widest border border-[#ffecd2]/50 shadow-sm`}>
                  {eventStatus.status}
                </span>
                {eventStatus.remainingTime && (
                  <span className="text-[#8b2323] font-black text-sm animate-pulse">
                    【{eventStatus.remainingTime}】
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-[#3d2914] font-serif leading-tight">
                {event.event_name}
              </h2>
              <div className="w-full h-1 bg-gradient-to-r from-[#8b6914] to-transparent mt-4" />
            </div>

            {/* 本文 */}
            <div className="mb-8 p-4 bg-[#f5e6d3]/50 border-l-4 border-[#8b6914] relative">
              <Shield className="absolute -top-3 -right-3 h-8 w-8 text-[#8b6914] opacity-20" />
              <p className="text-[#3d2914] leading-relaxed whitespace-pre-wrap font-medium">
                {event.content}
              </p>
            </div>

            {/* 詳細パラメータ */}
            <div className="grid grid-cols-1 gap-6 border-t-2 border-dashed border-[#d4c4a8] pt-8">
              
              {/* 開催場所 */}
              <div className="flex items-start gap-4 group">
                <div className="bg-[#8b6914] p-2 rounded-none shadow-sm group-hover:scale-110 transition-transform">
                  <MapPin className="h-5 w-5 text-[#ffecd2]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-[#8b6914] uppercase tracking-tighter">Location / 開催場所</p>
                  <p className="text-[#3d2914] text-lg font-bold">{event.store_name}</p>

                  <Button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${event.store_name}`, '_blank')}
                    variant="link" className="p-0 h-auto text-[#8b6914] font-black underline decoration-double">
                    地図を広げる（Google Map）
                  </Button>
                </div>
              </div>

              {/* 開催期日 */}
              <div className="flex items-start gap-4">
                <div className="bg-[#5c3a21] p-2 rounded-none shadow-sm">
                  <Calendar className="h-5 w-5 text-[#ffecd2]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-[#8b6914] uppercase tracking-tighter">Period / 開催期間</p>
                  <div className="text-[#3d2914] text-lg font-bold">
                    {event.event_start_date ? (
                      <>
                        {new Date(event.event_start_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                        {event.event_end_date && event.event_end_date !== event.event_start_date && (
                          <span className="mx-2 text-[#8b6914]">〜</span>
                        )}
                        {event.event_end_date && event.event_end_date !== event.event_start_date && (
                          new Date(event.event_end_date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })
                        )}
                      </>
                    ) : (
                      <span>{new Date(event.expires_at).toLocaleDateString('ja-JP')}まで</span>
                    )}
                  </div>
                  {event.event_start_date && (
                    <Button onClick={() => {
                      const startDate = new Date(event.event_start_date!);
                      const endDate = event.event_end_date ? new Date(event.event_end_date) : startDate;
                      const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
                      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.event_name || '')}&dates=${fmt(startDate)}/${fmt(new Date(endDate.getTime() + 86400000))}&location=${encodeURIComponent(event.store_name)}`;
                      window.open(url, '_blank');
                    }} variant="outline" className="mt-3 border-[#8b6914] text-[#8b6914] hover:bg-[#8b6914] hover:text-white rounded-none h-8 font-black text-xs uppercase">
                      <CalendarPlusIcon className="h-3 w-3 mr-2" />
                      Googleカレンダーに追加
                    </Button>
                  )}
                </div>
              </div>

              {/* 料金 */}
              {event.event_price && (
                <div className="flex items-start gap-4">
                  <div className="bg-green-800 p-2 rounded-none shadow-sm">
                    <DollarSign className="h-5 w-5 text-[#ffecd2]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-[#8b6914] uppercase tracking-tighter">Cost / 料金</p>
                    <p className="text-[#3d2914] text-lg font-bold">{event.event_price}</p>
                  </div>
                </div>
              )}

              {/* 連絡先 */}
              {event.phone_number && (
                <div className="flex items-start gap-4">
                  <div className="bg-orange-800 p-2 rounded-none shadow-sm">
                    <Phone className="h-5 w-5 text-[#ffecd2]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-[#8b6914] uppercase tracking-tighter">Contact / 連絡先</p>
                    <a href={`tel:${event.phone_number}`} className="text-[#3d2914] text-lg font-bold underline decoration-dotted">{event.phone_number}</a>
                  </div>
                </div>
              )}

              {/* メディアリンク */}
              {event.url && (
                <div className="flex items-start gap-4">
                  <div className="bg-indigo-900 p-2 rounded-none shadow-sm">
                    <LinkIcon className="h-5 w-5 text-[#ffecd2]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-[#8b6914] uppercase tracking-tighter">Media / メディア情報</p>
                    <a href={event.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2">
                      <img src={event.url.includes('instagram.com') ? 'https://res.cloudinary.com/dz9trbwma/image/upload/v1759308496/icons8-%E3%82%A4%E3%83%B3%E3%82%B9%E3%82%BF%E3%82%AF%E3%82%99%E3%83%A9%E3%83%A0-100_idedfz.png' : 'https://res.cloudinary.com/dz9trbwma/image/upload/v1759366399/icons8-%E3%82%A6%E3%82%A7%E3%83%95%E3%82%99-100_a6uwwq.png'}
                        alt="Media icon" className="h-10 w-10 hover:opacity-70 transition-opacity border-2 border-[#8b6914] p-1 bg-white" />
                    </a>
                  </div>
                </div>
              )}

              {/* 添付ファイル */}
              {event.file_urls && event.file_urls.length > 0 && (
                <div className="flex items-start gap-4">
                  <div className="bg-gray-700 p-2 rounded-none shadow-sm">
                    <FileText className="h-5 w-5 text-[#ffecd2]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-[#8b6914] uppercase tracking-tighter">Artifacts / 添付ファイル</p>
                    <div className="mt-2 space-y-2">
                      {event.file_urls.map((fileUrl, index) => (
                        <a key={index} href={fileUrl} target="_blank" rel="noopener noreferrer" 
                          className="flex items-center justify-between p-3 bg-white border-2 border-[#d4c4a8] hover:border-[#8b6914] transition-colors group">
                          <span className="text-sm font-bold text-[#3d2914]">調査資料 {index + 1}</span>
                          <ExternalLink className="h-4 w-4 text-[#8b6914]" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* アクションボタン */}
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button onClick={() => event.url ? window.open(event.url, '_blank') : window.open(`https://www.google.com/maps/search/?api=1&query=${event.store_name}`, '_blank')}
                className="bg-[#8b6914] text-[#ffecd2] hover:bg-[#3d2914] h-16 rounded-none border-t-2 border-l-2 border-[#ffecd2]/30 border-b-4 border-r-4 border-black text-lg font-black shadow-lg">
                <Search className="mr-2 h-6 w-6" />
                {event.url ? '詳細情報を確認' : '地図で確認'}
              </Button>
              <Button onClick={handleBack} variant="outline"
                className="border-4 border-double border-[#8b6914] text-[#8b6914] h-16 rounded-none bg-transparent text-lg font-black hover:bg-[#8b6914]/10">
                戻る
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}