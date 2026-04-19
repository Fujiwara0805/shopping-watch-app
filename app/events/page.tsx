"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, BookOpen, Trash2, Loader2, ScrollText, Map as MapIcon } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/lib/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, parseISO, getDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import Image from 'next/image';
import { Ad } from '@/types/ad';
import { generateSemanticEventUrl } from '@/lib/seo/url-helper';
import { isHolidayOrSubstitute } from '@/lib/constants';
import { Breadcrumb } from '@/components/seo/breadcrumb';
import { optimizeThumbnail } from '@/lib/utils/image';
import { designTokens } from '@/lib/constants';
import { trackEvent } from '@/lib/services/analytics';

// イベントデータの型定義
interface EventPost {
  id: string;
  app_profile_id: string;
  event_name?: string | null;
  store_name: string;
  event_start_date?: string | null;
  event_end_date?: string | null;
  city?: string | null;
  prefecture?: string | null;
  content: string;
  store_latitude?: number;
  store_longitude?: number;
  image_urls?: string[] | string | null;
  author_user_id?: string | null;
}

interface CalendarEvent {
  id: string;
  name: string;
  cityInitial: string;
  startDate: Date;
  endDate: Date;
  fullData: EventPost & { distance?: number };
}

interface AdCardProps {
  ad: Ad;
  onView?: () => void;
  onClick?: () => void;
}

// 広告カードコンポーネント
const AdCard = ({ ad, onView, onClick }: AdCardProps) => {
  useEffect(() => {
    if (onView) onView();
  }, [onView]);

  const handleClick = () => {
    if (onClick) onClick();
    if (ad.link_url || ad.affiliate_url) {
      if (ad.ad_type === 'affiliate' && ad.affiliate_url) {
        window.open(ad.affiliate_url, '_blank', 'noopener,noreferrer');
      } else if (ad.link_url) {
        window.open(ad.link_url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative w-full rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-all flex justify-center"
      onClick={handleClick}
      style={{ boxShadow: designTokens.elevation.low }}
    >
      {ad.image_url ? (
        <div className="relative" style={{ width: '320px', height: '50px' }}>
          <Image
            src={ad.image_url}
            alt="広告"
            fill
            className="object-cover"
            sizes="320px"
            unoptimized={ad.image_url.includes('a8.net')}
          />
          <div className="absolute top-1 left-1">
            <span 
              className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
              style={{ 
                background: `${designTokens.colors.background.white}E6`,
                color: designTokens.colors.text.secondary,
              }}
            >
              広告
            </span>
          </div>
        </div>
      ) : (
        <div 
          className="relative flex items-center justify-center" 
          style={{ 
            width: '320px', 
            height: '50px',
            background: designTokens.colors.background.cloud,
          }}
        >
          <BookOpen className="h-6 w-6" style={{ color: designTokens.colors.text.muted }} />
          <div className="absolute top-1 left-1">
            <span 
              className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
              style={{ 
                background: `${designTokens.colors.background.white}E6`,
                color: designTokens.colors.text.secondary,
              }}
            >
              広告
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// エレベーションカード
const ElevationCard = ({ 
  children, 
  className = '', 
  elevation = 'medium',
  hover = true,
}: { 
  children: React.ReactNode; 
  className?: string;
  elevation?: 'subtle' | 'low' | 'medium' | 'high';
  hover?: boolean;
}) => (
  <motion.div
    whileHover={hover ? { y: -4, boxShadow: designTokens.elevation.high } : {}}
    transition={{ duration: 0.3, ease: 'easeOut' }}
    className={`relative rounded-2xl overflow-hidden ${className}`}
    style={{
      background: designTokens.colors.background.white,
      boxShadow: designTokens.elevation[elevation],
      border: `1px solid ${designTokens.colors.secondary.stone}30`,
    }}
  >
    {children}
  </motion.div>
);

export default function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const urlCity = searchParams.get('city');
  const urlStartDate = searchParams.get('start_date');
  const urlEndDate = searchParams.get('end_date');
  const urlTarget = searchParams.get('target');
  const hasSearchParams = Boolean(urlStartDate && urlEndDate);

  const getInitialCity = () => {
    if (urlCity !== null && urlCity !== undefined) return urlCity === '' ? 'all' : urlCity;
    const savedCity = sessionStorage.getItem('eventFilterCity');
    return savedCity || 'all';
  };

  const [sortBy] = useState<'date' | 'distance'>('date');
  const [selectedPrefecture] = useState('大分県');
  const [selectedCity, setSelectedCity] = useState(getInitialCity);
  const [selectedEnableCheckin] = useState<'all' | 'true' | 'false'>('all');
  const [cityList, setCityList] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [loadingEventId, setLoadingEventId] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const dateStripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sessionStorage.setItem('eventFilterCity', selectedCity);
  }, [selectedCity]);

  // LP からの検索時: URL の city を優先し、searchParams 変更時にフィルターを同期
  useEffect(() => {
    const cityParam = searchParams.get('city');
    if (cityParam !== null && cityParam !== undefined) {
      setSelectedCity(cityParam === '' ? 'all' : cityParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (hasSearchParams && urlStartDate) {
      const start = parseISO(urlStartDate);
      if (!isNaN(start.getTime())) {
        setCurrentDate(start);
      }
    }
  }, [hasSearchParams, urlStartDate]);

  useEffect(() => {
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      try {
        const locationData = JSON.parse(savedLocation);
        if (locationData.expiresAt && Date.now() < locationData.expiresAt) {
          setUserLocation({
            latitude: locationData.latitude,
            longitude: locationData.longitude
          });
        }
      } catch (error) {
        console.error('位置情報の取得に失敗:', error);
      }
    }
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('city')
          .eq('category', 'イベント情報')
          .eq('prefecture', '大分県')
          .not('city', 'is', null);

        if (error) throw error;
        const cities = Array.from(new Set(data.map(d => d.city).filter(Boolean))).sort();
        setCityList(cities as string[]);
      } catch (error) {
        console.error('市町村情報の取得に失敗:', error);
      }
    };
    fetchLocations();
  }, []);

  const fetchAds = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .eq('placement', 'events_list')
        .eq('is_active', true)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        setAds([]);
      } else {
        setAds(data || []);
      }
    } catch (error) {
      setAds([]);
    }
  }, []);

  const trackAdView = useCallback(async (adId: string) => {
    try {
      await fetch('/api/ads/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId, action: 'view' }),
      });
    } catch (error) {
      console.error('広告視聴記録エラー:', error);
    }
  }, []);

  const trackAdClick = useCallback(async (adId: string) => {
    try {
      await fetch('/api/ads/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId, action: 'click' }),
      });
    } catch (error) {
      console.error('広告クリック記録エラー:', error);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      // Server-side date filtering to reduce data transfer
      const today = format(now, 'yyyy-MM-dd');

      let query = supabase
        .from('posts')
        .select(`
          id, app_profile_id, event_name, store_name, event_start_date, event_end_date,
          city, prefecture, content, store_latitude, store_longitude, image_urls, enable_checkin, target_tags,
          author:app_profiles!posts_app_profile_id_fkey (user_id)
        `)
        .eq('is_deleted', false)
        .eq('category', 'イベント情報')
        .eq('prefecture', selectedPrefecture)
        .or(`event_end_date.gte.${today},event_start_date.gte.${today}`);

      if (selectedCity !== 'all') {
        query = query.eq('city', selectedCity);
      }

      const { data, error } = await query;
      if (error) throw error;

      let processedPosts = (data || []).map((post: any) => {
        const authorData = Array.isArray(post.author) ? post.author[0] : post.author;
        const authorUserId = authorData?.user_id || null;
        let distance: number | undefined = undefined;
        if (userLocation && post.store_latitude && post.store_longitude) {
          distance = calculateDistance(
            userLocation.latitude, userLocation.longitude,
            post.store_latitude, post.store_longitude
          );
        }
        return { ...post, author_user_id: authorUserId, distance };
      });

      processedPosts = processedPosts.filter((post: any) => {
        if (post.event_end_date) {
          const endDate = new Date(post.event_end_date);
          endDate.setHours(23, 59, 59, 999);
          return now <= endDate;
        }
        if (post.event_start_date) {
          const startDate = new Date(post.event_start_date);
          startDate.setHours(23, 59, 59, 999);
          return now <= startDate;
        }
        return false;
      });

      processedPosts = processedPosts.filter((post: any) => {
        return post.store_latitude !== null && post.store_latitude !== undefined &&
               post.store_longitude !== null && post.store_longitude !== undefined &&
               !isNaN(post.store_latitude) && !isNaN(post.store_longitude);
      });

      const uniqueEventNames = new Set<string>();
      processedPosts = processedPosts.filter((post: any) => {
        if (!post.event_name) return true;
        if (uniqueEventNames.has(post.event_name)) return false;
        uniqueEventNames.add(post.event_name);
        return true;
      });

      if (selectedEnableCheckin !== 'all') {
        processedPosts = processedPosts.filter((post: any) => {
          const enableCheckin = post.enable_checkin === true;
          return selectedEnableCheckin === 'true' ? enableCheckin : !enableCheckin;
        });
      }

      if (urlTarget && urlTarget.trim() !== '') {
        processedPosts = processedPosts.filter((post: any) => {
          // target_tags カラム（JSON文字列）にタグIDが含まれるかチェック
          let tags: string[] = [];
          if (post.target_tags) {
            try {
              tags = typeof post.target_tags === 'string' ? JSON.parse(post.target_tags) : post.target_tags;
            } catch { tags = []; }
          }
          if (tags.length > 0 && tags.includes(urlTarget)) {
            return true;
          }
          // フォールバック: コンテンツ内テキスト検索
          const content = post.content || '';
          const eventName = post.event_name || '';
          return content.includes(urlTarget) || eventName.includes(urlTarget);
        });
      }

      let calendarEvents: CalendarEvent[] = processedPosts
        .filter((post: any) => post.event_start_date)
        .map((post: any) => ({
          id: post.id,
          name: post.event_name || post.content || '無題のイベント',
          cityInitial: post.city ? post.city.charAt(0) : '?',
          startDate: parseISO(post.event_start_date!),
          endDate: post.event_end_date ? parseISO(post.event_end_date) : parseISO(post.event_start_date!),
          fullData: post
        }))
        .filter(event => {
          if (hasSearchParams && urlStartDate && urlEndDate) {
            const rangeStart = parseISO(urlStartDate);
            const rangeEnd = parseISO(urlEndDate);
            rangeEnd.setHours(23, 59, 59, 999);
            if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime())) return true;
            return event.startDate <= rangeEnd && event.endDate >= rangeStart;
          }
          const eventStartMonth = event.startDate.getMonth();
          const eventStartYear = event.startDate.getFullYear();
          const eventEndMonth = event.endDate.getMonth();
          const eventEndYear = event.endDate.getFullYear();
          const currentMonth = currentDate.getMonth();
          const currentYear = currentDate.getFullYear();
          return (
            (eventStartYear === currentYear && eventStartMonth === currentMonth) ||
            (eventEndYear === currentYear && eventEndMonth === currentMonth) ||
            (event.startDate <= monthEnd && event.endDate >= monthStart)
          );
        });

      if (sortBy === 'date') {
        calendarEvents = calendarEvents.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      } else if (sortBy === 'distance' && userLocation) {
        calendarEvents = calendarEvents
          .filter((event: any) => event.fullData.distance !== undefined)
          .sort((a: any, b: any) => (a.fullData.distance || 0) - (b.fullData.distance || 0));
      }

      setEvents(calendarEvents);
    } catch (error) {
      console.error('イベント取得エラー:', error);
    } finally {
      setLoading(false);
      setIsInitialized(true);
    }
  }, [currentDate, selectedPrefecture, selectedCity, selectedEnableCheckin, sortBy, userLocation, hasSearchParams, urlStartDate, urlEndDate, urlTarget]);

  useEffect(() => { fetchAds(); }, [fetchAds]);
  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => {
    if (isInitialized) {
      trackEvent('event_list_view', {
        filter_city: selectedCity !== 'all' ? selectedCity : undefined,
        filter_target: urlTarget ?? undefined,
      });
    }
  }, [isInitialized, selectedCity, urlTarget]);
  useEffect(() => {
    setLoading(true);
    setLoadingEventId(null);
    return () => { setLoading(true); setIsInitialized(false); };
  }, []);

  const shortTermEvents = useMemo(() => {
    return events.filter(event => isSameMonth(event.startDate, event.endDate));
  }, [events]);

  const getEventsForDay = useCallback((day: Date): CalendarEvent[] => {
    return shortTermEvents.filter(event => day >= event.startDate && day <= event.endDate);
  }, [shortTermEvents]);

  const daysWithEvents = useMemo(() => {
    const daysSet = new Set<string>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (hasSearchParams && urlStartDate && urlEndDate) {
      const rangeStart = parseISO(urlStartDate);
      const rangeEnd = parseISO(urlEndDate);
      if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime())) return [];
      shortTermEvents.forEach(event => {
        const start = event.startDate;
        const end = event.endDate;
        if (end < rangeStart || start > rangeEnd) return;
        const effectiveStart = start > rangeStart ? start : rangeStart;
        const effectiveEnd = end < rangeEnd ? end : rangeEnd;
        const days = eachDayOfInterval({ start: effectiveStart, end: effectiveEnd });
        days.forEach(day => daysSet.add(format(day, 'yyyy-MM-dd')));
      });
    } else {
      shortTermEvents.forEach(event => {
        const start = event.startDate;
        const end = event.endDate;
        const currentMonthStart = startOfMonth(currentDate);
        const currentMonthEnd = endOfMonth(currentDate);
        const effectiveStart = start > currentMonthStart ? start : currentMonthStart;
        const effectiveEnd = end < currentMonthEnd ? end : currentMonthEnd;
        if (effectiveEnd >= today) {
          const days = eachDayOfInterval({ start: effectiveStart, end: effectiveEnd });
          days.forEach(day => {
            if (day >= today) daysSet.add(format(day, 'yyyy-MM-dd'));
          });
        }
      });
    }
    return Array.from(daysSet).sort().map(dateStr => parseISO(dateStr));
  }, [shortTermEvents, currentDate, hasSearchParams, urlStartDate, urlEndDate]);

  const selectedDay: Date | null = daysWithEvents.length > 0
    ? daysWithEvents[Math.min(selectedDayIndex, daysWithEvents.length - 1)]
    : null;

  useEffect(() => {
    if (daysWithEvents.length === 0) { setSelectedDayIndex(0); return; }

    // sessionStorageから保存された日付を復元
    const savedDate = sessionStorage.getItem('events_selected_date');
    if (savedDate) {
      const targetIndex = daysWithEvents.findIndex(day => format(day, 'yyyy-MM-dd') === savedDate);
      if (targetIndex >= 0) {
        setSelectedDayIndex(targetIndex);
        sessionStorage.removeItem('events_selected_date');
        return;
      }
    }

    if (selectedDayIndex >= daysWithEvents.length) setSelectedDayIndex(daysWithEvents.length - 1);
  }, [currentDate, daysWithEvents, selectedDayIndex]);

  useEffect(() => {
    if (daysWithEvents.length === 0 || !dateStripRef.current) return;
    const strip = dateStripRef.current;
    const target = strip.querySelector(`[data-day-index="${selectedDayIndex}"]`);
    if (target) (target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedDayIndex, daysWithEvents.length]);

  const eventsForSelectedDayWithAds = useMemo(() => {
    if (!selectedDay) return [];
    const dayEvents = getEventsForDay(selectedDay);
    const result: Array<{ type: 'event' | 'ad'; event?: CalendarEvent; ad?: Ad }> = [];
    dayEvents.forEach((event, i) => {
      if (i > 0 && i % 3 === 0 && ads.length > 0) {
        const adIndex = Math.floor((i / 3 - 1) % ads.length);
        result.push({ type: 'ad', ad: ads[adIndex] });
      }
      result.push({ type: 'event', event });
    });
    return result;
  }, [selectedDay, getEventsForDay, ads]);

  const handleEventClick = (event: CalendarEvent) => {
    if (selectedDay) {
      sessionStorage.setItem('events_selected_date', format(selectedDay, 'yyyy-MM-dd'));
    }
    setLoadingEventId(event.id);
    const semanticUrl = generateSemanticEventUrl({
      eventId: event.id,
      eventName: event.name,
      city: event.fullData.city || undefined,
      prefecture: event.fullData.prefecture || '大分県',
    });
    router.push(semanticUrl);
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getDayOfWeek = (day: Date): string => {
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    return weekDays[getDay(day)];
  };

  const getDayColor = (day: Date): string => {
    const dayOfWeek = getDay(day);
    if (dayOfWeek === 0 || isHolidayOrSubstitute(day)) return designTokens.colors.functional.error;
    if (dayOfWeek === 6) return designTokens.colors.functional.info;
    return designTokens.colors.text.primary;
  };

  const getImageUrl = (event: CalendarEvent): string | null => {
    const imageUrls = event.fullData.image_urls;
    if (!imageUrls) return null;
    let url: string | null = null;
    if (typeof imageUrls === 'string') {
      try {
        const parsed = JSON.parse(imageUrls);
        url = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
      } catch { return null; }
    } else {
      url = Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls[0] : null;
    }
    // サムネイル（80×80px）用にCloudinary最適化
    return url ? optimizeThumbnail(url, 80) : null;
  };

  const handleDeleteEvent = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('この投稿を削除してもよろしいですか？\nこの操作は取り消せません。')) return;
    setDeletingEventId(eventId);
    try {
      const { error } = await supabase.from('posts').delete().eq('id', eventId);
      if (error) throw error;
      await fetchEvents();
      toast({ title: "✅ 削除完了", description: "投稿を削除しました", duration: 2000 });
    } catch (error: any) {
      toast({ title: 'エラー', description: error?.message || '投稿の削除に失敗しました', variant: 'destructive' });
    } finally {
      setDeletingEventId(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: designTokens.colors.background.mist }}>
      {/* ローディング画面 */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: designTokens.colors.background.mist }}
          >
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin" style={{ color: designTokens.colors.accent.gold }} />
              <p className="text-sm font-medium" style={{ color: designTokens.colors.text.secondary }}>
                イベント情報を読み込み中...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && (
        <>
          {/* 固定ヘッダー (パンくず + タイトル + 月ナビ + 市町村フィルター) */}
          <div
            className="sticky top-0 z-40"
            style={{
              background: `${designTokens.colors.primary.base}F5`,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderBottom: `1px solid ${designTokens.colors.primary.dark}30`,
            }}
          >
            <div className="max-w-4xl mx-auto px-4 pt-3 pb-4">
              {/* パンくず (ヘッダーがダーク背景のためテキストを白系にオーバーライド) */}
              <div
                className="mb-2 [&_nav]:!py-1 [&_nav]:!px-0 [&_a]:!text-white/80 [&_a_span]:!text-white/80 [&_[aria-current='page']]:!text-white [&_[aria-current='page']_span]:!text-white [&_.text-muted-foreground]:!text-white/60 [&_.text-primary]:!text-white [&_.text-foreground]:!text-white"
              >
                <Breadcrumb />
              </div>

              {/* タイトル (左右にアイコン、中央寄せ) */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <ScrollText className="h-5 w-5 flex-shrink-0" style={{ color: designTokens.colors.accent.gold }} />
                <h1
                  className="text-lg sm:text-xl font-semibold tracking-wide truncate"
                  style={{
                    fontFamily: designTokens.typography.display,
                    color: designTokens.colors.text.inverse,
                  }}
                >
                  {selectedCity === 'all' ? '大分県内のイベント' : `${selectedCity}内のイベント`}
                </h1>
                <ScrollText className="h-5 w-5 flex-shrink-0" style={{ color: designTokens.colors.accent.gold }} />
              </div>

              {/* 市町村フィルター : 月切り替え : マップボタン — モバイル 1:1:1 / PC 1:2:1 */}
              <div className="flex items-center gap-2">
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger
                    className="flex-1 min-w-0 h-9 rounded-full border-0 text-xs sm:text-sm font-medium"
                    style={{
                      background: `${designTokens.colors.background.white}20`,
                      color: designTokens.colors.text.inverse,
                    }}
                  >
                    <SelectValue placeholder="市町村を選択" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">全ての市町村</SelectItem>
                    {cityList.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex-1 sm:flex-[2] min-w-0 flex items-center justify-between gap-0.5 sm:gap-1">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handlePreviousMonth}
                    className="flex-shrink-0 p-1.5 rounded-full transition-colors"
                    style={{
                      background: `${designTokens.colors.background.white}25`,
                      color: designTokens.colors.text.inverse,
                    }}
                    aria-label="前の月"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </motion.button>
                  <div
                    className="flex-1 min-w-0 text-center px-1 sm:px-2 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap overflow-hidden text-ellipsis"
                    style={{
                      background: designTokens.colors.background.white,
                      color: designTokens.colors.primary.base,
                    }}
                  >
                    <span className="sm:hidden">{format(currentDate, 'M月', { locale: ja })}</span>
                    <span className="hidden sm:inline">{format(currentDate, 'yyyy年 M月', { locale: ja })}</span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleNextMonth}
                    className="flex-shrink-0 p-1.5 rounded-full transition-colors"
                    style={{
                      background: `${designTokens.colors.background.white}25`,
                      color: designTokens.colors.text.inverse,
                    }}
                    aria-label="次の月"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </motion.button>
                </div>

                <button
                  onClick={() => router.push('/map')}
                  className="flex-1 min-w-0 inline-flex items-center justify-center gap-1 px-2 h-9 rounded-full text-xs sm:text-sm font-semibold transition-transform active:scale-95"
                  style={{
                    background: designTokens.colors.accent.gold,
                    color: designTokens.colors.text.primary,
                    boxShadow: designTokens.elevation.low,
                  }}
                  aria-label="マップを開く"
                >
                  <MapIcon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Mapを開く</span>
                </button>
              </div>
            </div>
          </div>

          {/* コンテンツエリア */}
          <div className="container mx-auto px-4 pt-4 pb-10 max-w-4xl">

            {/* 日付タブ */}
            {daysWithEvents.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-6"
              >
                <div
                  ref={dateStripRef}
                  className="flex gap-1.5 overflow-x-auto overflow-y-hidden pb-2 snap-x snap-mandatory scroll-smooth scrollbar-hide"
                >
                  {daysWithEvents.map((day, index) => {
                    const isSelected = index === selectedDayIndex;
                    const isToday = isSameDay(day, new Date());
                    const dayColor = getDayColor(day);
                    const dayKey = format(day, 'yyyy-MM-dd');

                    return (
                      <motion.button
                        key={dayKey}
                        data-day-index={index}
                        onClick={() => setSelectedDayIndex(index)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="flex-shrink-0 snap-center rounded-xl px-3 py-2 transition-all text-center"
                        data-date-tab
                        style={{
                          background: isSelected ? designTokens.colors.accent.lilac : designTokens.colors.background.white,
                          boxShadow: isSelected ? designTokens.elevation.medium : designTokens.elevation.subtle,
                          border: `1px solid ${isSelected ? designTokens.colors.accent.lilac : designTokens.colors.secondary.stone}30`,
                        }}
                      >
                        <span
                          className="block text-base font-bold leading-tight"
                          style={{ color: isSelected ? designTokens.colors.text.inverse : designTokens.colors.text.primary }}
                        >
                          {format(day, 'd')}
                        </span>
                        <span
                          className="block text-xs font-medium leading-tight"
                          style={{ color: isSelected ? `${designTokens.colors.text.inverse}CC` : dayColor }}
                        >
                          {getDayOfWeek(day)}
                        </span>
                        {isToday && (
                          <span
                            className="block text-[10px] font-bold leading-tight mt-0.5"
                            style={{ color: isSelected ? designTokens.colors.accent.gold : designTokens.colors.functional.warning }}
                          >
                            今日
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* イベント2列グリッド */}
            {daysWithEvents.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ElevationCard elevation="medium" hover={false} className="p-8 text-center">
                  <CalendarIcon className="h-16 w-16 mx-auto mb-4" style={{ color: designTokens.colors.text.muted }} />
                  <p style={{ color: designTokens.colors.text.secondary }}>この月にイベントはありません</p>
                </ElevationCard>
              </motion.div>
            ) : selectedDay ? (
              <motion.div
                key={format(selectedDay, 'yyyy-MM-dd')}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-2 gap-3 sm:gap-4"
              >
                {eventsForSelectedDayWithAds.map((item, index) => {
                  if (item.type === 'ad' && item.ad) {
                    return (
                      <div key={`ad-${index}`} className="col-span-2">
                        <AdCard
                          ad={item.ad}
                          onView={() => trackAdView(item.ad!.id)}
                          onClick={() => trackAdClick(item.ad!.id)}
                        />
                      </div>
                    );
                  }
                  if (item.type === 'event' && item.event) {
                    const event = item.event;
                    const imageUrl = getImageUrl(event);
                    const isAuthor = event.fullData.author_user_id === currentUserId;
                    const isToday = isSameDay(selectedDay, new Date());

                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleEventClick(event)}
                        className="relative rounded-2xl overflow-hidden cursor-pointer"
                        style={{
                          background: designTokens.colors.background.white,
                          boxShadow: designTokens.elevation.low,
                          border: `1px solid ${isToday ? designTokens.colors.accent.gold : `${designTokens.colors.secondary.stone}30`}`,
                        }}
                      >
                        {loadingEventId === event.id && (
                          <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: `${designTokens.colors.background.white}CC` }}>
                            <Loader2 className="h-6 w-6 animate-spin" style={{ color: designTokens.colors.accent.gold }} />
                          </div>
                        )}

                        {/* サムネイル */}
                        <div
                          className="relative w-full"
                          style={{ aspectRatio: '1 / 1', background: designTokens.colors.background.cloud }}
                        >
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={event.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 50vw, 200px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <CalendarIcon className="h-10 w-10" style={{ color: designTokens.colors.text.muted }} />
                            </div>
                          )}
                          {isToday && (
                            <span
                              className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{
                                background: designTokens.colors.accent.gold,
                                color: designTokens.colors.text.primary,
                              }}
                            >
                              今日
                            </span>
                          )}
                          {isAuthor && (
                            <Badge
                              className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5"
                              style={{
                                background: designTokens.colors.functional.info,
                                color: designTokens.colors.text.inverse,
                              }}
                            >
                              自分
                            </Badge>
                          )}
                        </div>

                        {/* 本文 */}
                        <div className="p-3">
                          <div
                            className="font-semibold text-sm leading-snug line-clamp-2 mb-1.5"
                            style={{
                              fontFamily: designTokens.typography.display,
                              color: designTokens.colors.primary.dark,
                              minHeight: '2.5em',
                            }}
                          >
                            {event.name}
                          </div>
                          <div
                            className="flex items-center gap-1 text-xs"
                            style={{ color: designTokens.colors.text.secondary }}
                          >
                            <MapPin className="h-3 w-3 flex-shrink-0" style={{ color: designTokens.colors.functional.error }} />
                            <span className="truncate">{event.fullData.store_name}</span>
                          </div>
                        </div>

                        {isAuthor && (
                          <Button
                            onClick={(e) => handleDeleteEvent(event.id, e)}
                            disabled={deletingEventId === event.id}
                            size="icon"
                            className="absolute bottom-2 right-2 h-7 w-7 rounded-full z-10"
                            style={{
                              background: designTokens.colors.functional.error,
                              color: designTokens.colors.text.inverse,
                            }}
                          >
                            {deletingEventId === event.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </motion.div>
                    );
                  }
                  return null;
                })}
              </motion.div>
            ) : null}
          </div>
        </>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=IBM+Plex+Sans+JP:wght@400;500;600&family=Noto+Sans+JP:wght@400;500;600;700&display=swap');
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        [data-date-tab] {
          min-width: calc((100vw - 32px - 18px) / 4);
          max-width: calc((100vw - 32px - 18px) / 4);
        }
        @media (min-width: 640px) {
          [data-date-tab] {
            min-width: 64px;
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
}
