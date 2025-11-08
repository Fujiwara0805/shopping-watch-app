"use client";

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Map, Newspaper, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, parseISO, getDay } from 'date-fns';
import { ja } from 'date-fns/locale';

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

  // イベントデータの取得
  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      // 🔥 イベント一覧画面と同じクエリ
      const { data, error } = await supabase
        .from('posts')
        .select('id, event_name, store_name, event_start_date, event_end_date, city, prefecture, content, store_latitude, store_longitude')
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
      setLoading(false);
    }
  };

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

  // 曜日の色を取得
  const getDayColor = (day: Date): string => {
    const dayOfWeek = getDay(day);
    if (dayOfWeek === 0) return 'text-red-600'; // 日曜日
    if (dayOfWeek === 6) return 'text-blue-600'; // 土曜日
    return 'text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* ヘッダー - イベント一覧画面と同じデザイン */}
      <div className="sticky top-0 z-10 border-b bg-[#73370c]">
        <div className="p-4">
          <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-center">
            <h1 className="text-3xl font-bold text-white">イベントカレンダー</h1>
          </div>

          {/* 月の切り替え */}
          <div className="flex items-center justify-center gap-4 mt-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePreviousMonth}
              className="text-white hover:bg-white/20"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <h2 className="text-xl font-bold text-white min-w-[150px] text-center">
              {format(currentDate, 'yyyy年 M月', { locale: ja })}
            </h2>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="text-white hover:bg-white/20"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* コンテンツエリア */}
      <div className="container mx-auto px-4 py-6 max-w-4xl pb-24">

        {/* 長期間イベント情報セクション（トグル式） */}
        {longTermEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            <button
              onClick={() => setIsLongTermEventsOpen(!isLongTermEventsOpen)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: '#73370c' }}>
                📅 長期間イベント
                <Badge variant="secondary">{longTermEvents.length}件</Badge>
              </h3>
              {isLongTermEventsOpen ? (
                <ChevronUp className="h-5 w-5" style={{ color: '#73370c' }} />
              ) : (
                <ChevronDown className="h-5 w-5" style={{ color: '#73370c' }} />
              )}
            </button>

            <AnimatePresence>
              {isLongTermEventsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 space-y-2">
                    {longTermEvents.map((event, index) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-[#fef3e8] rounded-xl p-3 border-2 border-[#73370c]/10 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleEventClick(event.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h4 className="font-bold text-base mb-1" style={{ color: '#73370c' }}>
                              {event.name}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="h-3 w-3 text-red-500" />
                              <span>{event.fullData.city || '場所未設定'}</span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 whitespace-nowrap">
                            {format(event.startDate, 'M/d', { locale: ja })} 〜 {format(event.endDate, 'M/d', { locale: ja })}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* カレンダーグリッド */}
        {loading ? (
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73370c]"></div>
          </div>
        ) : daysWithEvents.length === 0 && longTermEvents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl p-8 text-center"
          >
            <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg text-gray-500">この月にイベントはありません</p>
          </motion.div>
        ) : (
          <>
            {daysWithEvents.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-xl overflow-hidden"
              >
                {/* イベントがある日付のみ表示 */}
                <div className="divide-y divide-gray-200">
                  {daysWithEvents.map((day, dayIndex) => {
                    const dayEvents = getEventsForDay(day);
                    const isToday = isSameDay(day, new Date());
                    const dayOfWeek = getDayOfWeek(day);
                    const dayColor = getDayColor(day);

                    return (
                      <motion.div
                        key={day.toISOString()}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: dayIndex * 0.05 }}
                        className={`p-4 bg-white ${isToday ? 'border-l-4 border-[#73370c]' : ''}`}
                      >
                        {/* 日付と曜日 - 中央揃え */}
                        <div className="mb-3 text-center">
                          <div className={`text-xl font-bold ${dayColor}`}>
                            {format(day, 'd')}日（{dayOfWeek}）
                          </div>
                        </div>

                        {/* イベント一覧 */}
                        <div className="space-y-2">
                          {dayEvents.map((event, eventIndex) => (
                            <motion.div
                              key={event.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: dayIndex * 0.05 + eventIndex * 0.03 }}
                              className="bg-[#fef3e8] rounded-lg px-4 py-3 border-l-4 border-[#73370c] hover:shadow-md transition-all cursor-pointer hover:translate-x-1"
                              onClick={() => handleEventClick(event.id)}
                            >
                              <div className="font-semibold text-base" style={{ color: '#73370c' }}>
                                {event.name}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* 右下のナビゲーションボタン */}
      <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-2">
          {/* マップアイコン */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
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
            transition={{ duration: 0.3, delay: 0.2 }}
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
    </div>
  );
}
