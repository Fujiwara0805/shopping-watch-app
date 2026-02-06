"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Compass, BookOpen, ChevronDown, ChevronUp, RefreshCw, Trash2, Loader2, ExternalLink, ScrollText, SlidersHorizontal, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/lib/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, parseISO, getDay, getYear, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import Image from 'next/image';
import { Ad } from '@/types/ad';
import { generateSemanticEventUrl } from '@/lib/seo/url-helper';
import { isHolidayOrSubstitute } from '@/lib/constants';
import { Breadcrumb } from '@/components/seo/breadcrumb';
import { designTokens } from '@/lib/constants';

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
  const [isLongTermEventsOpen, setIsLongTermEventsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [cityList, setCityList] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
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

      let query = supabase
        .from('posts')
        .select(`
          id, app_profile_id, event_name, store_name, event_start_date, event_end_date,
          city, prefecture, content, store_latitude, store_longitude, image_urls, enable_checkin,
          author:app_profiles!posts_app_profile_id_fkey (user_id)
        `)
        .eq('is_deleted', false)
        .eq('category', 'イベント情報')
        .eq('prefecture', selectedPrefecture);

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
      await new Promise(resolve => setTimeout(resolve, 300));
      setLoading(false);
      setIsInitialized(true);
    }
  }, [currentDate, selectedPrefecture, selectedCity, selectedEnableCheckin, sortBy, userLocation, hasSearchParams, urlStartDate, urlEndDate, urlTarget]);

  useEffect(() => { fetchAds(); }, [fetchAds]);
  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => {
    setLoading(true);
    return () => { setLoading(true); setIsInitialized(false); };
  }, []);

  const longTermEvents = useMemo(() => {
    return events.filter(event => !isSameMonth(event.startDate, event.endDate));
  }, [events]);

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
    if (selectedDayIndex >= daysWithEvents.length) setSelectedDayIndex(daysWithEvents.length - 1);
  }, [currentDate, daysWithEvents.length, selectedDayIndex]);

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
    if (typeof imageUrls === 'string') {
      try {
        const parsed = JSON.parse(imageUrls);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
      } catch { return null; }
    }
    return Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls[0] : null;
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
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Compass className="h-12 w-12" style={{ color: designTokens.colors.accent.gold }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && (
        <>
          {/* パンくずリスト */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 pt-3"
          >
            <Breadcrumb />
          </motion.div>
          
          {/* ヘッダー */}
          <motion.header 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="sticky top-0 z-40"
            style={{ 
              background: `${designTokens.colors.primary.base}F5`,
              backdropFilter: 'blur(20px)',
              borderBottom: `1px solid ${designTokens.colors.primary.dark}30`,
            }}
          >
            <div className="max-w-4xl mx-auto px-4 py-4">
              <div className="flex items-center justify-center gap-3 mb-3">
                <ScrollText className="h-5 w-5" style={{ color: designTokens.colors.accent.gold }} />
                <h1 
                  className="text-xl font-semibold tracking-wide"
                  style={{ 
                    fontFamily: designTokens.typography.display,
                    color: designTokens.colors.text.inverse,
                  }}
                >
                  {selectedCity === 'all' ? '大分県内のイベント' : `${selectedCity}内のイベント`}
                </h1>
                <ScrollText className="h-5 w-5" style={{ color: designTokens.colors.accent.gold }} />
              </div>

              {/* 月切り替え */}
              <div className="flex items-center justify-center gap-4">
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handlePreviousMonth} 
                  className="p-2 rounded-full transition-colors"
                  style={{ 
                    background: `${designTokens.colors.background.white}20`,
                    color: designTokens.colors.text.inverse,
                  }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </motion.button>
                <div 
                  className="px-6 py-2 rounded-full font-semibold"
                  style={{ 
                    background: designTokens.colors.background.white,
                    color: designTokens.colors.primary.base,
                    boxShadow: designTokens.elevation.low,
                  }}
                >
                  {format(currentDate, 'yyyy年 M月', { locale: ja })}
                </div>
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleNextMonth} 
                  className="p-2 rounded-full transition-colors"
                  style={{ 
                    background: `${designTokens.colors.background.white}20`,
                    color: designTokens.colors.text.inverse,
                  }}
                >
                  <ChevronRight className="h-5 w-5" />
                </motion.button>
              </div>
            </div>
          </motion.header>

          {/* コンテンツエリア */}
          <div className="container mx-auto px-4 py-6 max-w-4xl pb-28">

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
                  className="flex gap-3 overflow-x-auto overflow-y-hidden pb-2 snap-x snap-mandatory scroll-smooth scrollbar-hide"
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
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-shrink-0 snap-center rounded-2xl px-5 py-3 min-w-[100px] transition-all"
                        style={{
                          background: isSelected ? designTokens.colors.accent.lilac : designTokens.colors.background.white,
                          boxShadow: isSelected ? designTokens.elevation.medium : designTokens.elevation.subtle,
                          border: `1px solid ${isSelected ? designTokens.colors.accent.lilac : designTokens.colors.secondary.stone}40`,
                        }}
                      >
                        <span 
                          className="block text-lg font-bold"
                          style={{ color: isSelected ? designTokens.colors.text.inverse : designTokens.colors.text.primary }}
                        >
                          {format(day, 'd')}日
                        </span>
                        <span 
                          className="block text-sm font-medium"
                          style={{ color: isSelected ? `${designTokens.colors.text.inverse}CC` : dayColor }}
                        >
                          （{getDayOfWeek(day)}）
                        </span>
                        {isToday && (
                          <span 
                            className="block text-xs font-bold mt-0.5"
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

            {/* イベント一覧 */}
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
              >
                <ElevationCard elevation="medium" hover={false} className="overflow-hidden">
                  <div className="divide-y" style={{ borderColor: `${designTokens.colors.secondary.stone}30` }}>
                    {eventsForSelectedDayWithAds.map((item, index) => {
                      if (item.type === 'ad' && item.ad) {
                        return (
                          <div key={`ad-${index}`} className="p-4">
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
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-4"
                          >
                            {isAuthor && (
                              <div className="flex items-center justify-between mb-2">
                                <Badge 
                                  className="text-xs"
                                  style={{ 
                                    background: designTokens.colors.functional.info,
                                    color: designTokens.colors.text.inverse,
                                  }}
                                >
                                  自分の投稿
                                </Badge>
                                <Button
                                  onClick={(e) => handleDeleteEvent(event.id, e)}
                                  disabled={deletingEventId === event.id}
                                  size="icon"
                                  className="h-8 w-8 rounded-full"
                                  style={{ 
                                    background: designTokens.colors.functional.error,
                                    color: designTokens.colors.text.inverse,
                                  }}
                                >
                                  {deletingEventId === event.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            )}
                            
                            <motion.div
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              className="flex gap-4 cursor-pointer rounded-xl p-3 transition-colors"
                              style={{ 
                                background: isToday ? `${designTokens.colors.accent.gold}10` : 'transparent',
                              }}
                              onClick={() => handleEventClick(event)}
                            >
                              {imageUrl ? (
                                <div className="flex-shrink-0 relative w-20 h-20 rounded-xl overflow-hidden">
                                  <Image
                                    src={imageUrl}
                                    alt={event.name}
                                    fill
                                    className="object-cover"
                                    sizes="80px"
                                  />
                                </div>
                              ) : (
                                <div 
                                  className="flex-shrink-0 w-20 h-20 rounded-xl flex items-center justify-center"
                                  style={{ background: designTokens.colors.background.cloud }}
                                >
                                  <CalendarIcon className="h-8 w-8" style={{ color: designTokens.colors.text.muted }} />
                                </div>
                              )}
                              
                              <div className="flex-1 min-w-0">
                                <div 
                                  className="font-semibold text-base mb-1.5 line-clamp-2"
                                  style={{ 
                                    fontFamily: designTokens.typography.display,
                                    color: designTokens.colors.primary.dark,
                                  }}
                                >
                                  {event.name}
                                </div>
                                <div 
                                  className="flex items-center gap-2 text-sm"
                                  style={{ color: designTokens.colors.text.secondary }}
                                >
                                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" style={{ color: designTokens.colors.functional.error }} />
                                  <span className="truncate">{event.fullData.store_name}</span>
                                </div>
                              </div>
                              
                              <ChevronRight className="h-5 w-5 flex-shrink-0 self-center" style={{ color: designTokens.colors.text.muted }} />
                            </motion.div>
                          </motion.div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </ElevationCard>
                {/* 開催中のイベントを見る（一番下のイベントカードの下に配置） */}
                <div className="flex justify-center pt-4 pb-4 px-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push('/map')}
                    className="px-6 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                    style={{
                      background: designTokens.colors.accent.gold,
                      color: designTokens.colors.text.primary,
                      boxShadow: designTokens.elevation.high,
                    }}
                  >
                    <Compass className="h-4 w-4" />
                    開催中のイベントを見る
                  </motion.button>
                </div>
              </motion.div>
            ) : null}
          </div>

          {/* フローティングナビゲーション（絞込のみ） */}
          <div className="fixed bottom-6 right-4 z-30 flex flex-col gap-3">
            <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <SheetTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="icon"
                    className="h-16 w-16 rounded-2xl flex flex-col items-center justify-center gap-1"
                    style={{ 
                      background: designTokens.colors.secondary.fern,
                      color: designTokens.colors.text.inverse,
                      boxShadow: designTokens.elevation.high,
                    }}
                  >
                    <SlidersHorizontal className="h-6 w-6" />
                    <span className="text-xs font-medium">絞込</span>
                  </Button>
                </motion.div>
              </SheetTrigger>
              <SheetContent 
                side="bottom" 
                className="rounded-t-3xl"
                style={{ 
                  background: designTokens.colors.background.white,
                  borderTop: `1px solid ${designTokens.colors.secondary.stone}30`,
                }}
              >
                <SheetHeader>
                  <SheetTitle 
                    className="text-lg font-semibold"
                    style={{ color: designTokens.colors.primary.base }}
                  >
                    市町村で絞り込む
                  </SheetTitle>
                </SheetHeader>
                <div className="pt-6 pb-8">
                  <Select value={selectedCity} onValueChange={(v) => { setSelectedCity(v); setFilterSheetOpen(false); }}>
                    <SelectTrigger 
                      className="w-full h-12 rounded-xl"
                      style={{ 
                        background: designTokens.colors.background.mist,
                        borderColor: `${designTokens.colors.secondary.stone}50`,
                        color: designTokens.colors.text.primary,
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
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=IBM+Plex+Sans+JP:wght@400;500;600&family=Noto+Sans+JP:wght@400;500;600;700&display=swap');
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
