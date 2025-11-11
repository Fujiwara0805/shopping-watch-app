"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Map, Newspaper, ChevronDown, ChevronUp, RefreshCw, ArrowUp } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, parseISO, getDay, getYear, getMonth, getDate, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import Image from 'next/image';

// 祝日データ（日本の祝日）
const getHolidays = (year: number): Record<string, string> => {
  const holidays: Record<string, string> = {
    [`${year}-01-01`]: '元日',
    [`${year}-01-08`]: '成人の日', // 第2月曜日（簡易実装）
    [`${year}-02-11`]: '建国記念の日',
    [`${year}-02-23`]: '天皇誕生日',
    [`${year}-03-20`]: '春分の日', // 概算
    [`${year}-04-29`]: '昭和の日',
    [`${year}-05-03`]: '憲法記念日',
    [`${year}-05-04`]: 'みどりの日',
    [`${year}-05-05`]: 'こどもの日',
    [`${year}-07-15`]: '海の日', // 第3月曜日（簡易実装）
    [`${year}-08-11`]: '山の日',
    [`${year}-09-16`]: '敬老の日', // 第3月曜日（簡易実装）
    [`${year}-09-23`]: '秋分の日', // 概算
    [`${year}-10-14`]: 'スポーツの日', // 第2月曜日（簡易実装）
    [`${year}-11-03`]: '文化の日',
    [`${year}-11-23`]: '勤労感謝の日',
  };
  return holidays;
};

// 六曜を計算する関数
const getRokuyo = (date: Date): string => {
  const year = getYear(date);
  const month = getMonth(date) + 1; // 0-11 → 1-12
  const day = getDate(date);
  
  // 旧暦の月日の合計を6で割った余りで六曜を決定（簡易計算）
  const rokuyoArray = ['大安', '赤口', '先勝', '友引', '先負', '仏滅'];
  const index = (month + day) % 6;
  
  return rokuyoArray[index];
};

// 祝日かどうかを判定する関数
const isHoliday = (date: Date): boolean => {
  const year = getYear(date);
  const holidays = getHolidays(year);
  const dateStr = format(date, 'yyyy-MM-dd');
  return dateStr in holidays;
};

// 振替休日かどうかを判定する関数
const isSubstituteHoliday = (date: Date): boolean => {
  // 月曜日でなければ振替休日ではない
  if (getDay(date) !== 1) return false;
  
  // 前日（日曜日）をチェック
  const previousDay = addDays(date, -1);
  
  // 前日が日曜日かつ祝日の場合、振替休日
  if (getDay(previousDay) === 0 && isHoliday(previousDay)) {
    return true;
  }
  
  return false;
};

// 祝日または振替休日かどうかを判定する関数
const isHolidayOrSubstitute = (date: Date): boolean => {
  return isHoliday(date) || isSubstituteHoliday(date);
};

// イベントデータの型定義
interface EventPost {
  id: string;
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
}

// カレンダー上のイベント表示用
interface CalendarEvent {
  id: string;
  name: string;
  cityInitial: string;
  startDate: Date;
  endDate: Date;
  fullData: EventPost;
}

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLongTermEventsOpen, setIsLongTermEventsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // イベントデータの取得
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      // 🔥 イベント一覧画面と同じクエリ（画像URLも取得）
      const { data, error } = await supabase
        .from('posts')
        .select('id, event_name, store_name, event_start_date, event_end_date, city, prefecture, content, store_latitude, store_longitude, image_urls')
        .eq('is_deleted', false)
        .eq('category', 'イベント情報');

      if (error) throw error;

      // 🔥 イベント一覧画面と同じフィルタリング処理
      let processedPosts = (data || []);

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

      // データを変換
      const calendarEvents: CalendarEvent[] = processedPosts
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

      setEvents(calendarEvents);
    } catch (error) {
      console.error('イベント取得エラー:', error);
    } finally {
      // 最低限の表示時間を確保してローディング画面を表示
      await new Promise(resolve => setTimeout(resolve, 300));
      setLoading(false);
      setIsInitialized(true);
    }
  }, [currentDate]);

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

  // 特定の日のイベントを取得（月内のイベントのみ）
  const getEventsForDay = (day: Date): CalendarEvent[] => {
    return shortTermEvents.filter(event => {
      // その日がイベント期間内かチェック
      return day >= event.startDate && day <= event.endDate;
    });
  };

  // イベントクリック時の処理
  const handleEventClick = (eventId: string) => {
    router.push(`/map/event/${eventId}`);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* ローディング画面 */}
      {loading ? (
        <>
          <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
            <div className="flex items-center justify-center pt-20">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin"></div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* ヘッダー - コンパクトなデザイン */}
          <div className="sticky top-0 z-10 border-b bg-[#73370c]">
            <div className="px-4 py-1">
              <div className="max-w-4xl mx-auto px-4 flex items-center justify-center">
                <h1 className="text-2xl font-bold text-white">イベントカレンダー</h1>
              </div>

              {/* 月の切り替え */}
              <div className="flex items-center justify-center gap-4 mt-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePreviousMonth}
                  className="text-white hover:bg-white/20 h-8 w-8"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                
                <h2 className="text-lg font-bold text-white min-w-[140px] text-center">
                  {format(currentDate, 'yyyy年 M月', { locale: ja })}
                </h2>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextMonth}
                  className="text-white hover:bg-white/20 h-8 w-8"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* コンテンツエリア */}
          <div className="container mx-auto px-4 py-6 max-w-4xl pb-24">

            {/* カレンダーグリッド */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
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
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg text-gray-500">この月にイベントはありません</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* イベントがある日付のみ表示 */}
                <div className="divide-y divide-gray-200">
                  {daysWithEvents.map((day) => {
                    const dayEvents = getEventsForDay(day);
                    const isToday = isSameDay(day, new Date());
                    const dayOfWeek = getDayOfWeek(day);
                    const dayColor = getDayColor(day);
                    const bgColor = getDayBgColor(day);
                    const rokuyo = getRokuyo(day);

                    return (
                      <div
                        key={day.toISOString()}
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

                        {/* イベント一覧 */}
                        <div className="space-y-2">
                          {dayEvents.map((event) => {
                            const imageUrl = getImageUrl(event);
                            return (
                              <div
                                key={event.id}
                                className={`bg-white rounded-lg p-3 border-2 hover:shadow-md transition-all cursor-pointer flex gap-3 ${
                                  isToday ? 'border-[#fa8238]' : 'border-[#73370c]/10'
                                }`}
                                onClick={() => handleEventClick(event.id)}
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
                                  <div className="flex-shrink-0 w-16 h-16 bg-[#fef3e8] rounded-md flex items-center justify-center">
                                    <CalendarIcon className="h-8 w-8 text-[#73370c] opacity-30" />
                                  </div>
                                )}

                                {/* イベント情報 */}
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-base mb-1" style={{ color: '#73370c' }}>
                                    {event.name}
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <MapPin className="h-3 w-3 text-red-500 flex-shrink-0" />
                                    <span className="truncate">{event.fullData.store_name}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 右下のナビゲーションボタン */}
          <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-2">

          {/* 先頭に戻るアイコン */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex flex-col items-center"
          >
            <Button
              onClick={scrollToTop}
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg bg-[#73370c] hover:bg-[#5c2a0a] border-2 border-white"
            >
              <ArrowUp className="h-7 w-7 text-white" />
            </Button>
            <span className="text-xs font-bold text-gray-700 mt-1">先頭</span>
          </motion.div>

          {/* マップアイコン */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <Button
              onClick={() => router.push('/map')}
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg bg-[#73370c] hover:bg-[#5c2a0a] border-2 border-white"
            >
              <Map className="h-7 w-7 text-white" />
            </Button>
            <span className="text-xs font-bold text-gray-700 mt-1">マップ</span>
          </motion.div>

          {/* イベント一覧アイコン */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="flex flex-col items-center"
          >
            <Button
              onClick={() => router.push('/events')}
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg bg-[#73370c] hover:bg-[#5c2a0a] border-2 border-white"
            >
              <Newspaper className="h-7 w-7 text-white" />
            </Button>
            <span className="text-xs font-bold text-gray-700 mt-1">一覧</span>
          </motion.div>
        </div>
        </>
      )}
    </div>
  );
}
