"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Compass, BookOpen, ChevronDown, ChevronUp, RefreshCw, ArrowUpFromLine, Trash2, Loader2, ExternalLink, ScrollText } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, parseISO, getDay, getYear, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import Image from 'next/image';
import { Ad } from '@/types/ad';
import { generateSemanticEventUrl } from '@/lib/seo/url-helper';
import { getHolidaysRecord, getRokuyo, isHolidayOrSubstitute, COLORS } from '@/lib/constants';

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

// カレンダー上のイベント表示用
interface CalendarEvent {
  id: string;
  name: string;
  cityInitial: string;
  startDate: Date;
  endDate: Date;
  fullData: EventPost & { distance?: number };
}

// 広告カードコンポーネント
interface AdCardProps {
  ad: Ad;
  onView?: () => void;
  onClick?: () => void;
}

const AdCard = ({ ad, onView, onClick }: AdCardProps) => {
  useEffect(() => {
    // 広告が表示されたら視聴を記録
    if (onView) {
      onView();
    }
  }, [onView]);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    
    // リンクに遷移
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
      className="relative w-full rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity flex justify-center"
      onClick={handleClick}
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
          {/* 広告ラベル */}
          <div className="absolute top-1 left-1">
            <span className="bg-white/90 text-[#73370c] text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
              広告
            </span>
          </div>
        </div>
      ) : (
        <div className="relative bg-gray-100 flex items-center justify-center" style={{ width: '320px', height: '50px' }}>
          <BookOpen className="h-6 w-6 text-[#73370c] opacity-30" />
          {/* 広告ラベル */}
          <div className="absolute top-1 left-1">
            <span className="bg-white/90 text-[#73370c] text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
              広告
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

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
  
  // フィルター・ソート関連（初期値をURLパラメータまたはsessionStorageから取得）
  const getInitialCity = () => {
    const cityParam = searchParams.get('city');
    if (cityParam) return cityParam;
    
    const savedCity = sessionStorage.getItem('eventFilterCity');
    return savedCity || 'all';
  };
  
  const getInitialSort = () => {
    const sortParam = searchParams.get('sort');
    if (sortParam && (sortParam === 'date' || sortParam === 'distance')) return sortParam;
    
    const savedSort = sessionStorage.getItem('eventFilterSort');
    return (savedSort === 'date' || savedSort === 'distance') ? savedSort as 'date' | 'distance' : 'date';
  };
  
  const getInitialEnableCheckin = () => {
    const enableCheckinParam = searchParams.get('enable_checkin');
    if (enableCheckinParam && ['all', 'true', 'false'].includes(enableCheckinParam)) {
      return enableCheckinParam as 'all' | 'true' | 'false';
    }
    
    const savedEnableCheckin = sessionStorage.getItem('eventFilterEnableCheckin');
    return (savedEnableCheckin && ['all', 'true', 'false'].includes(savedEnableCheckin)) 
      ? savedEnableCheckin as 'all' | 'true' | 'false'
      : 'all';
  };
  
  const [sortBy, setSortBy] = useState<'date' | 'distance'>(getInitialSort);
  const [selectedPrefecture] = useState('大分県'); // 大分県固定
  const [selectedCity, setSelectedCity] = useState(getInitialCity);
  const [selectedEnableCheckin, setSelectedEnableCheckin] = useState<'all' | 'true' | 'false'>(getInitialEnableCheckin);
  
  // 市町村リスト
  const [cityList, setCityList] = useState<string[]>([]);
  
  // 位置情報
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  
  // 削除中のイベントIDを管理
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  // フィルター変更時にsessionStorageに保存
  useEffect(() => {
    sessionStorage.setItem('eventFilterCity', selectedCity);
    sessionStorage.setItem('eventFilterSort', sortBy);
    sessionStorage.setItem('eventFilterEnableCheckin', selectedEnableCheckin);
  }, [selectedCity, sortBy, selectedEnableCheckin]);

  // 位置情報取得
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

  // 距離計算（Haversine formula）
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // 地球の半径（メートル）
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // メートル単位
  };

  // 市町村リスト取得（大分県のみ）
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

  // 広告データの取得
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
        console.error('広告取得エラー:', error);
        setAds([]);
      } else {
        setAds(data || []);
      }
    } catch (error) {
      console.error('広告取得エラー:', error);
      setAds([]);
    }
  }, []);

  // 広告の視聴を記録
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

  // 広告のクリックを記録
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

  // イベントデータの取得
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      // 🔥 イベント一覧画面と同じクエリ（画像URLも取得 + author情報）
      let query = supabase
        .from('posts')
        .select(`
          id,
          app_profile_id,
          event_name,
          store_name,
          event_start_date,
          event_end_date,
          city,
          prefecture,
          content,
          store_latitude,
          store_longitude,
          image_urls,
          enable_checkin,
          author:app_profiles!posts_app_profile_id_fkey (
            user_id
          )
        `)
        .eq('is_deleted', false)
        .eq('category', 'イベント情報');

      // 都道府県フィルター（大分県固定）
      query = query.eq('prefecture', selectedPrefecture);

      // 市町村フィルター
      if (selectedCity !== 'all') {
        query = query.eq('city', selectedCity);
      }

      const { data, error } = await query;

      if (error) throw error;

      // 🔥 イベント一覧画面と同じフィルタリング処理
      let processedPosts = (data || []).map((post: any) => {
        const authorData = Array.isArray(post.author) ? post.author[0] : post.author;
        const authorUserId = authorData?.user_id || null;
        
        let distance: number | undefined = undefined;
        if (userLocation && post.store_latitude && post.store_longitude) {
          distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            post.store_latitude,
            post.store_longitude
          );
        }
        return {
          ...post,
          author_user_id: authorUserId,
          distance
        };
      });

      // 🔥 1. 終了したイベントを除外
      processedPosts = processedPosts.filter((post: any) => {
        // event_end_dateがある場合はその日の23:59:59まで表示
        if (post.event_end_date) {
          const endDate = new Date(post.event_end_date);
          endDate.setHours(23, 59, 59, 999);
          return now <= endDate;
        }
        // event_end_dateがない場合は、event_start_dateの23:59:59まで表示
        if (post.event_start_date) {
          const startDate = new Date(post.event_start_date);
          startDate.setHours(23, 59, 59, 999);
          return now <= startDate;
        }
        return false;
      });

      // 🔥 2. 座標が有効なイベントのみを対象にする
      processedPosts = processedPosts.filter((post: any) => {
        const hasValidCoordinates = 
          post.store_latitude !== null && 
          post.store_latitude !== undefined &&
          post.store_longitude !== null && 
          post.store_longitude !== undefined &&
          !isNaN(post.store_latitude) &&
          !isNaN(post.store_longitude);
        
        return hasValidCoordinates;
      });

      // 🔥 3. event_nameで重複排除（同じイベント名の投稿は1件のみ表示）
      const uniqueEventNames = new Set<string>();
      processedPosts = processedPosts.filter((post: any) => {
        if (!post.event_name) return true;
        
        if (uniqueEventNames.has(post.event_name)) {
          return false;
        }
        
        uniqueEventNames.add(post.event_name);
        return true;
      });

      // 🔥 4. enable_checkinフィルター
      if (selectedEnableCheckin !== 'all') {
        processedPosts = processedPosts.filter((post: any) => {
          const enableCheckin = post.enable_checkin === true;
          if (selectedEnableCheckin === 'true') {
            return enableCheckin;
          } else if (selectedEnableCheckin === 'false') {
            return !enableCheckin;
          }
          return true;
        });
      }

      // データを変換
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
          // 表示月と重なるイベントのみ
          const eventStartMonth = event.startDate.getMonth();
          const eventStartYear = event.startDate.getFullYear();
          const eventEndMonth = event.endDate.getMonth();
          const eventEndYear = event.endDate.getFullYear();
          const currentMonth = currentDate.getMonth();
          const currentYear = currentDate.getFullYear();

          // イベントが現在の月に何らかの形で関連している
          return (
            (eventStartYear === currentYear && eventStartMonth === currentMonth) ||
            (eventEndYear === currentYear && eventEndMonth === currentMonth) ||
            (event.startDate <= monthEnd && event.endDate >= monthStart)
          );
        });

      // 🔥 5. ソート処理
      if (sortBy === 'date') {
        // 開催日順（event_start_dateでソート）
        calendarEvents = calendarEvents.sort((a, b) => {
          return a.startDate.getTime() - b.startDate.getTime();
        });
      } else if (sortBy === 'distance' && userLocation) {
        // 距離順
        calendarEvents = calendarEvents
          .filter((event: any) => event.fullData.distance !== undefined)
          .sort((a: any, b: any) => (a.fullData.distance || 0) - (b.fullData.distance || 0));
      }

      setEvents(calendarEvents);
    } catch (error) {
      console.error('イベント取得エラー:', error);
    } finally {
      // 最低限の表示時間を確保してローディング画面を表示
      await new Promise(resolve => setTimeout(resolve, 300));
      setLoading(false);
      setIsInitialized(true);
    }
  }, [currentDate, selectedPrefecture, selectedCity, selectedEnableCheckin, sortBy, userLocation]);

  // 広告データの取得
  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  // イベントデータの取得
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ページがマウントされた時に確実にローディング状態にする
  useEffect(() => {
    setLoading(true);
    return () => {
      // アンマウント時にリセット
      setLoading(true);
      setIsInitialized(false);
    };
  }, []);

  // 長期間イベント（月を跨ぐイベント）を抽出
  const longTermEvents = useMemo(() => {
    return events.filter(event => {
      // 開始月と終了月が異なる場合は長期間イベント
      return !isSameMonth(event.startDate, event.endDate);
    });
  }, [events]);

  // 短期間イベント（同じ月内のイベント）を抽出
  const shortTermEvents = useMemo(() => {
    return events.filter(event => {
      // 開始月と終了月が同じ場合は短期間イベント
      return isSameMonth(event.startDate, event.endDate);
    });
  }, [events]);

  // 特定の日のイベントを取得（月内のイベントのみ）
  const getEventsForDay = useCallback((day: Date): CalendarEvent[] => {
    return shortTermEvents.filter(event => {
      // その日がイベント期間内かチェック
      return day >= event.startDate && day <= event.endDate;
    });
  }, [shortTermEvents]);

  // イベントがある日付のみを取得（本日から）
  const daysWithEvents = useMemo(() => {
    const daysSet = new Set<string>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    shortTermEvents.forEach(event => {
      const start = event.startDate;
      const end = event.endDate;
      const currentMonthStart = startOfMonth(currentDate);
      const currentMonthEnd = endOfMonth(currentDate);
      
      // 本日以降の日付のみ追加
      const effectiveStart = start > currentMonthStart ? start : currentMonthStart;
      const effectiveEnd = end < currentMonthEnd ? end : currentMonthEnd;
      
      // 本日より前の日付は除外
      if (effectiveEnd >= today) {
        const days = eachDayOfInterval({ start: effectiveStart, end: effectiveEnd });
        days.forEach(day => {
          if (day >= today) {
            daysSet.add(format(day, 'yyyy-MM-dd'));
          }
        });
      }
    });
    
    // 日付順にソート
    const sortedDays = Array.from(daysSet).sort().map(dateStr => parseISO(dateStr));
    return sortedDays;
  }, [shortTermEvents, currentDate]);

  // 月全体のイベントリスト（広告を含む）を生成
  const eventsWithAds = useMemo(() => {
    // 日付ごとにグループ化されたイベントをフラットなリストに変換
    const flatEvents: Array<{ type: 'event'; event: CalendarEvent; day: Date }> = [];
    
    daysWithEvents.forEach(day => {
      const dayEvents = getEventsForDay(day);
      dayEvents.forEach(event => {
        flatEvents.push({ type: 'event', event, day });
      });
    });

    // 月全体で通しカウントで7件ごとに広告を挿入
    const result: Array<{ type: 'event' | 'ad'; event?: CalendarEvent; ad?: Ad; day?: Date }> = [];
    let eventCount = 0;

    flatEvents.forEach((item) => {
      // 7件ごとに広告を挿入（7件目、14件目、21件目...の後に）
      if (eventCount > 0 && eventCount % 7 === 0 && ads.length > 0) {
        // 利用可能な広告を循環的に選択
        const adIndex = Math.floor((eventCount / 7 - 1) % ads.length);
        const ad = ads[adIndex];
        if (ad) {
          result.push({ type: 'ad', ad, day: item.day });
        }
      }
      
      result.push(item);
      eventCount++;
    });

    return result;
  }, [daysWithEvents, ads, getEventsForDay]);

  // イベントクリック時の処理（フィルター状態を保存してから遷移）
  const handleEventClick = (event: CalendarEvent) => {
    // 現在のフィルター状態をクエリパラメータとして渡す
    const params = new URLSearchParams();
    if (selectedCity !== 'all') params.set('city', selectedCity);
    if (sortBy !== 'date') params.set('sort', sortBy);
    if (selectedEnableCheckin !== 'all') params.set('enable_checkin', selectedEnableCheckin);
    params.set('from', 'events');
    
    // セマンティックURLを生成
    const semanticUrl = generateSemanticEventUrl({
      eventId: event.id,
      eventName: event.name,
      city: event.fullData.city || undefined,
      prefecture: event.fullData.prefecture || '大分県',
    });
    
    const queryString = params.toString();
    const url = queryString ? `${semanticUrl}?${queryString}` : semanticUrl;
    router.push(url);
  };

  // 月の切り替え
  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  // 曜日を取得
  const getDayOfWeek = (day: Date): string => {
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    return weekDays[getDay(day)];
  };

  // 曜日の色を取得（祝日・振替休日も日曜日と同じ赤色）
  const getDayColor = (day: Date): string => {
    const dayOfWeek = getDay(day);
    if (dayOfWeek === 0 || isHolidayOrSubstitute(day)) return 'text-red-600'; // 日曜日、祝日、または振替休日
    if (dayOfWeek === 6) return 'text-blue-600'; // 土曜日
    return 'text-gray-700';
  };

  // 背景色を取得
  const getDayBgColor = (day: Date): string => {
    const dayOfWeek = getDay(day);
    if (dayOfWeek === 0 || isHolidayOrSubstitute(day)) return '#f7e2e3'; // 日曜日、祝日
    if (dayOfWeek === 6) return '#e9f6ff'; // 土曜日
    return 'white';
  };

  // 画像URLを取得する関数
  const getImageUrl = (event: CalendarEvent): string | null => {
    const imageUrls = event.fullData.image_urls;
    if (!imageUrls) return null;
    
    // 文字列の場合はパース
    if (typeof imageUrls === 'string') {
      try {
        const parsed = JSON.parse(imageUrls);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
      } catch {
        return null;
      }
    }
    
    // 配列の場合は最初の要素を返す
    return Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls[0] : null;
  };

  // カレンダーグリッドの日付を生成
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDay = getDay(monthStart);
    
    // 前月の日付を追加（最初の週を埋めるため）
    const days: Date[] = [];
    for (let i = startDay - 1; i >= 0; i--) {
      days.push(addDays(monthStart, -i - 1));
    }
    
    // 当月の日付を追加
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    days.push(...monthDays);
    
    return days;
  }, [currentDate]);

  // 日付がイベントリストのどこにあるかを取得するID
  const getDayId = (day: Date): string => {
    return `day-${format(day, 'yyyy-MM-dd')}`;
  };

  // 特定の日付にスクロール
  const scrollToDay = (day: Date) => {
    const dayId = getDayId(day);
    const element = document.getElementById(dayId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // 日付が過去かどうか判定
  const isPastDate = (day: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDay = new Date(day);
    compareDay.setHours(0, 0, 0, 0);
    return compareDay < today;
  };

  // 先頭に戻る
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // イベント削除処理
  const handleDeleteEvent = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('この投稿を削除してもよろしいですか？\nこの操作は取り消せません。')) {
      return;
    }
    
    setDeletingEventId(eventId);
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', eventId);
      
      if (error) throw error;
      
      // データベースから再取得して最新の状態を反映
      await fetchEvents();
      
      toast({
        title: "✅ 削除完了",
        description: "投稿を削除しました",
        duration: 2000,
      });
    } catch (error: any) {
      console.error('削除エラー:', error);
      toast({
        title: 'エラー',
        description: error?.message || '投稿の削除に失敗しました',
        variant: 'destructive'
      });
    } finally {
      setDeletingEventId(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.background }}>
      {/* ローディング画面 */}
      {loading ? (
        <>
          <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: COLORS.background }}>
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Compass className="h-12 w-12" style={{ color: COLORS.primary }} />
            </motion.div>
          </div>
        </>
      ) : (
        <>
          {/* ヘッダー - コンパクトなデザイン */}
          <header className="sticky top-0 z-50 border-b-4 border-double shadow-lg" style={{ backgroundColor: COLORS.secondary, borderColor: COLORS.primary }}>
            <div className="max-w-4xl mx-auto px-4 py-3">
              <div className="flex items-center justify-center gap-3 mb-2">
                <ScrollText className="h-6 w-6 text-[#ffecd2]" />
                <h1 className="text-2xl font-black text-[#ffecd2] tracking-widest" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                  旅の予定表
                </h1>
              </div>

              {/* 月切り替えコマンド */}
              <div className="flex items-center justify-center gap-6">
                <button onClick={() => setCurrentDate(addDays(currentDate, -30))} className="p-1 bg-[#3d2914] border border-[#ffecd2]/30 rounded hover:bg-[#8b6914] text-white">
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <div className="bg-[#fdf5e6] px-6 py-1 border-2 border-[#8b6914] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                  <span className="text-lg font-black text-[#3d2914]">
                    {format(currentDate, 'yyyy年 M月', { locale: ja })}
                  </span>
                </div>
                <button onClick={() => setCurrentDate(addDays(currentDate, 30))} className="p-1 bg-[#3d2914] border border-[#ffecd2]/30 rounded hover:bg-[#8b6914] text-white">
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>

              {/* フィルターボタン */}
              <div className="flex items-center justify-center gap-2 mt-2">
                {/* 並び順ボタン */}
                <Select value={sortBy} onValueChange={(value: 'date' | 'distance') => setSortBy(value)}>
                  <SelectTrigger className="w-[130px] font-semibold" style={{ backgroundColor: COLORS.surface, color: COLORS.secondary, borderColor: COLORS.border }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">開催日順</SelectItem>
                    <SelectItem value="distance">距離順</SelectItem>
                  </SelectContent>
                </Select>

                {/* enable_checkinフィルター */}
                <Select value={selectedEnableCheckin} onValueChange={(value: 'all' | 'true' | 'false') => setSelectedEnableCheckin(value)}>
                  <SelectTrigger className="w-[130px] font-semibold" style={{ backgroundColor: COLORS.surface, color: COLORS.secondary, borderColor: COLORS.border }}>
                    <SelectValue placeholder="チェックイン" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全てのイベント</SelectItem>
                    <SelectItem value="true">Check In可</SelectItem>
                    <SelectItem value="false">Check In不可</SelectItem>
                  </SelectContent>
                </Select>

                {/* 市町村ボタン */}
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger className="w-[130px] font-semibold" style={{ backgroundColor: COLORS.surface, color: COLORS.secondary, borderColor: COLORS.border }}>
                    <SelectValue placeholder="市町村" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全ての市町村</SelectItem>
                    {cityList.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </header>

          {/* コンテンツエリア */}
          <div className="container mx-auto px-4 py-6 max-w-4xl pb-24">

            {/* カレンダーグリッド */}
            <div className="rounded-2xl shadow-xl overflow-hidden mb-6 border-2" style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}>
              {/* 曜日ヘッダー */}
              <div className="grid grid-cols-7 border-b-2 bg-gray-50">
                {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
                  <div
                    key={day}
                    className={`text-center py-1.5 text-sm font-bold ${
                      index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* カレンダーグリッド */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isToday = isSameDay(day, new Date());
                  const dayEvents = getEventsForDay(day);
                  const hasEvents = dayEvents.length > 0;
                  const isPast = isPastDate(day);
                  const dayOfWeek = getDay(day);
                  const dayColor = getDayColor(day);
                  const bgColor = getDayBgColor(day);

                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[60px] p-1.5 border-b border-r ${
                        index % 7 === 0 ? 'border-l' : ''
                      } ${
                        isToday ? 'ring-2 ring-[#fa8238] ring-inset' : ''
                      } ${
                        !isCurrentMonth ? 'opacity-30' : ''
                      } ${
                        hasEvents && isCurrentMonth ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
                      }`}
                      style={{ backgroundColor: isCurrentMonth ? bgColor : 'white' }}
                      onClick={() => {
                        if (hasEvents && isCurrentMonth) {
                          scrollToDay(day);
                        }
                      }}
                    >
                      {/* 日付 */}
                      <div className="flex flex-col items-center">
                        <div className={`text-sm font-bold ${dayColor}`}>
                          {format(day, 'd')}
                        </div>
                        {/* イベントがある日付にはハイパーリンク風の下線を表示 */}
                        {hasEvents && isCurrentMonth && !isPast && (
                          <div className="w-6 h-0.5 bg-blue-500 mt-0.5"></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* イベント詳細リスト */}
            {daysWithEvents.length === 0 ? (
              <div className="rounded-2xl shadow-xl p-8 text-center border-2" style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}>
                <CalendarIcon className="h-16 w-16 mx-auto mb-4" style={{ color: `${COLORS.primary}50` }} />
                <p className="text-lg" style={{ color: COLORS.secondary }}>この月にイベントはありません</p>
              </div>
            ) : (
              <div className="rounded-2xl shadow-xl overflow-hidden border-2" style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}>
                {/* イベントと広告を日付ごとにグループ化して表示 */}
                <div className="divide-y divide-gray-200">
                  {(() => {
                    // 日付ごとにグループ化
                    type EventOrAd = { type: 'event' | 'ad'; event?: CalendarEvent; ad?: Ad; day?: Date };
                    const groupedByDay: Record<string, EventOrAd[]> = {};
                    
                    eventsWithAds.forEach(item => {
                      const dayKey = item.day ? format(item.day, 'yyyy-MM-dd') : 'no-date';
                      if (!groupedByDay[dayKey]) {
                        groupedByDay[dayKey] = [];
                      }
                      groupedByDay[dayKey].push(item);
                    });

                    // 日付順にソート
                    const sortedDays = Object.keys(groupedByDay).sort();

                    return sortedDays.map((dayKey: string) => {
                      const dayItems = groupedByDay[dayKey];
                      const firstItem = dayItems[0];
                      let day: Date | null = null;
                      if (firstItem?.day) {
                        try {
                          day = parseISO(dayKey);
                        } catch {
                          day = null;
                        }
                      }
                      
                      if (!day) return null;

                      const isToday = isSameDay(day, new Date());
                      const dayOfWeek = getDayOfWeek(day);
                      const dayColor = getDayColor(day);
                      const bgColor = getDayBgColor(day);
                      const rokuyo = getRokuyo(day);

                      return (
                        <div
                          key={dayKey}
                          id={getDayId(day)}
                          className={`p-4 scroll-mt-20 ${isToday ? 'border-l-4 border-[#fa8238]' : ''}`}
                          style={{ backgroundColor: bgColor }}
                        >
                          {/* 日付と曜日と六曜 - 左詰め、小さめのテキスト */}
                          <div className="mb-3">
                            <div className={`text-sm font-bold ${dayColor}`}>
                              {format(day, 'M月d日', { locale: ja })}（{dayOfWeek}）{rokuyo}
                            </div>
                          </div>

                          {/* イベントと広告の一覧 */}
                          <div className="space-y-2">
                            {dayItems.map((item: { type: 'event' | 'ad'; event?: CalendarEvent; ad?: Ad; day?: Date }, index: number) => {
                              if (item.type === 'ad' && item.ad) {
                                return (
                                  <AdCard
                                    key={`ad-${dayKey}-${index}`}
                                    ad={item.ad}
                                    onView={() => trackAdView(item.ad!.id)}
                                    onClick={() => trackAdClick(item.ad!.id)}
                                  />
                                );
                              }

                              if (item.type === 'event' && item.event) {
                                const event = item.event;
                                const imageUrl = getImageUrl(event);
                                const isAuthor = event.fullData.author_user_id === currentUserId;

                                return (
                                  <div
                                    key={event.id}
                                    className={`rounded-lg border-2 hover:shadow-md transition-all ${
                                      isToday ? '' : ''
                                    }`}
                                    style={{ 
                                      backgroundColor: COLORS.surface,
                                      borderColor: isToday ? COLORS.primary : COLORS.border
                                    }}
                                  >
                                    {/* ヘッダー部分（バッジと削除ボタン） */}
                                    {isAuthor && (
                                      <div className="flex items-center justify-between p-2 border-b border-gray-100">
                                        <Badge variant="default" className="text-xs bg-blue-600">自分の投稿</Badge>
                                        <Button
                                          onClick={(e) => handleDeleteEvent(event.id, e)}
                                          disabled={deletingEventId === event.id}
                                          size="icon"
                                          variant="destructive"
                                          className="h-8 w-8 rounded-full shadow-lg"
                                        >
                                          {deletingEventId === event.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Trash2 className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </div>
                                    )}
                                    
                                    {/* コンテンツ部分（クリッカブル） */}
                                    <div
                                      className="flex gap-3 p-3 cursor-pointer"
                                      onClick={() => handleEventClick(event)}
                                    >
                                      {/* イベント画像 */}
                                      {imageUrl ? (
                                        <div className="flex-shrink-0 relative w-16 h-16">
                                          <Image
                                            src={imageUrl}
                                            alt={event.name}
                                            fill
                                            className="object-cover rounded-md"
                                            sizes="64px"
                                          />
                                        </div>
                                      ) : (
                                        <div className="flex-shrink-0 w-16 h-16 rounded-md flex items-center justify-center" style={{ backgroundColor: COLORS.cream }}>
                                          <CalendarIcon className="h-8 w-8" style={{ color: `${COLORS.primary}50` }} />
                                        </div>
                                      )}

                                      {/* イベント情報 */}
                                      <div className="flex-1 min-w-0">
                                        <div className="font-bold text-base mb-1" style={{ color: COLORS.primaryDark }}>
                                          {event.name}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                          <MapPin className="h-3 w-3 text-red-500 flex-shrink-0" />
                                          <span className="truncate">{event.fullData.store_name}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              return null;
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* 右下のナビゲーションボタン */}
          <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-2">

          {/* 先頭に戻るアイコン（ホーム/出発点に戻る） */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(61, 41, 20, 0.3)" }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex flex-col items-center"
          >
            <Button
              onClick={scrollToTop}
              size="icon"
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl shadow-lg flex flex-col items-center justify-center gap-1"
              style={{ backgroundColor: COLORS.primaryDark }}
            >
              <ArrowUpFromLine className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: COLORS.cream }} />
              <span className="text-xs font-medium" style={{ color: COLORS.cream }}>TOP</span>
            </Button>
          </motion.div>

          {/* マップアイコン（羅針盤） */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(139, 105, 20, 0.3)" }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <Button
              onClick={() => router.push('/map')}
              size="icon"
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl shadow-lg flex flex-col items-center justify-center gap-1"
              style={{ backgroundColor: COLORS.primary }}
            >
              <Compass className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: COLORS.cream }} />
              <span className="text-xs font-medium" style={{ color: COLORS.cream }}>Map</span>
            </Button>
          </motion.div>
        </div>
        </>
      )}
    </div>
  );
}
