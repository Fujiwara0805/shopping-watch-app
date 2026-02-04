"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  MapPin, 
  Calendar, 
  ChevronLeft, 
  Compass, 
  ArrowUpFromLine,
  Filter,
  Search,
  ScrollText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SEOEventData } from '@/lib/seo/types';
import { generateSemanticEventUrl } from '@/lib/seo/url-helper';

import { COLORS } from '@/lib/constants/colors';

interface AreaEventListClientProps {
  prefecture: string;
  city: string;
  initialEvents: SEOEventData[];
}

export function AreaEventListClient({ 
  prefecture, 
  city, 
  initialEvents 
}: AreaEventListClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const locationName = `${prefecture}${city}`;

  // 検索フィルタリング
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return initialEvents;
    
    const query = searchQuery.toLowerCase();
    return initialEvents.filter((event) => {
      const eventName = (event.event_name || event.content || '').toLowerCase();
      const storeName = (event.store_name || '').toLowerCase();
      return eventName.includes(query) || storeName.includes(query);
    });
  }, [initialEvents, searchQuery]);

  // 画像URLを取得
  const getImageUrl = (imageUrls: string | string[] | null): string | null => {
    if (!imageUrls) return null;
    
    if (typeof imageUrls === 'string') {
      try {
        const parsed = JSON.parse(imageUrls);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
      } catch {
        return null;
      }
    }
    
    return Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls[0] : null;
  };

  // 日付をフォーマット
  const formatDate = (startDate: string | null, endDate: string | null): string => {
    if (!startDate) return '';
    
    const start = new Date(startDate);
    const startStr = start.toLocaleDateString('ja-JP', {
      month: 'long',
      day: 'numeric',
    });
    
    if (endDate && startDate !== endDate) {
      const end = new Date(endDate);
      const endStr = end.toLocaleDateString('ja-JP', {
        month: 'long',
        day: 'numeric',
      });
      return `${startStr} 〜 ${endStr}`;
    }
    
    return startStr;
  };

  // 先頭に戻る
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.background }}>
      {/* ヘッダー */}
      <header 
        className="sticky top-0 z-50 border-b-4 border-double shadow-lg" 
        style={{ backgroundColor: COLORS.secondary, borderColor: COLORS.primary }}
      >
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* パンくずリスト */}
          <nav className="flex items-center gap-2 text-sm text-[#ffecd2]/80 mb-3">
            <Link href="/" className="hover:text-[#ffecd2]">トップ</Link>
            <span>/</span>
            <Link href="/events" className="hover:text-[#ffecd2]">イベント</Link>
            <span>/</span>
            <Link 
              href={`/area/${encodeURIComponent(prefecture)}`} 
              className="hover:text-[#ffecd2]"
            >
              {prefecture}
            </Link>
            <span>/</span>
            <span className="text-[#ffecd2]">{city}</span>
          </nav>
          
          {/* タイトル */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <ScrollText className="h-6 w-6 text-[#ffecd2]" />
            <h1 
              className="text-xl font-black text-[#ffecd2] tracking-widest" 
              style={{ fontFamily: "'Noto Serif JP', serif" }}
            >
              {city}のイベント
            </h1>
          </div>
          
          {/* 検索 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="イベント名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/90 border-[#d4c4a8]"
            />
          </div>
        </div>
      </header>

      {/* コンテンツ */}
      <main className="container mx-auto px-4 py-6 max-w-4xl pb-24">
        {/* イベント数 */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredEvents.length}件のイベントが見つかりました
          </p>
          <Badge variant="outline" className="border-primary text-primary">
            {locationName}
          </Badge>
        </div>

        {/* イベント一覧 */}
        {filteredEvents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl shadow-xl p-8 text-center border-2"
            style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}
          >
            <Calendar className="h-16 w-16 mx-auto mb-4" style={{ color: `${COLORS.primary}50` }} />
            <p className="text-lg" style={{ color: COLORS.secondary }}>
              {searchQuery 
                ? '検索条件に一致するイベントが見つかりません' 
                : `${city}で開催予定のイベントはありません`}
            </p>
            <Link href="/events">
              <Button 
                className="mt-4"
                style={{ backgroundColor: COLORS.primary }}
              >
                すべてのイベントを見る
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredEvents.map((event, index) => {
                const imageUrl = getImageUrl(event.image_urls);
                const eventName = event.event_name || event.content || '無題のイベント';
                const dateStr = formatDate(event.event_start_date, event.event_end_date);
                
                // セマンティックURLを生成
                const eventUrl = generateSemanticEventUrl({
                  eventId: event.id,
                  eventName,
                  city: event.city || undefined,
                  prefecture: event.prefecture || prefecture,
                });
                
                return (
                  <motion.article
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    layout
                  >
                    <Link
                      href={eventUrl}
                      className="block bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all border-2"
                      style={{ borderColor: COLORS.border }}
                    >
                      <div className="flex">
                        {/* 画像 */}
                        <div className="relative w-32 h-32 flex-shrink-0" style={{ backgroundColor: COLORS.cream }}>
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={eventName}
                              fill
                              className="object-cover"
                              sizes="128px"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Calendar className="h-12 w-12" style={{ color: `${COLORS.primary}30` }} />
                            </div>
                          )}
                        </div>
                        
                        {/* 情報 */}
                        <div className="flex-1 p-4">
                          <h2 
                            className="font-bold text-lg mb-2 line-clamp-2"
                            style={{ color: COLORS.textPrimary }}
                          >
                            {eventName}
                          </h2>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="h-4 w-4 text-red-500 flex-shrink-0" />
                              <span className="truncate">{event.store_name}</span>
                            </div>
                            
                            {dateStr && (
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Calendar className="h-4 w-4 flex-shrink-0" style={{ color: COLORS.primary }} />
                                <span>{dateStr}</span>
                              </div>
                            )}
                            
                            {event.event_price && (
                              <div className="text-sm font-medium" style={{ color: COLORS.primary }}>
                                {event.event_price}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* 関連リンク */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 p-4 rounded-xl border-2"
          style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}
        >
          <h2 className="font-bold text-lg mb-3" style={{ color: COLORS.textPrimary }}>
            {prefecture}の他の地域
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              '大分市', '別府市', '中津市', '日田市', '佐伯市',
              '臼杵市', '竹田市', '由布市', '国東市', '宇佐市'
            ].filter(c => c !== city).map((otherCity) => (
              <Link
                key={otherCity}
                href={`/area/${encodeURIComponent(prefecture)}/${encodeURIComponent(otherCity)}`}
                className="px-3 py-1 rounded-full text-sm transition-colors"
                style={{ 
                  backgroundColor: COLORS.cream,
                  color: COLORS.textPrimary,
                }}
              >
                {otherCity}
              </Link>
            ))}
          </div>
        </motion.section>
      </main>

      {/* ナビゲーションボタン */}
      <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-2">
        {/* 先頭に戻る */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={scrollToTop}
            size="icon"
            className="h-14 w-14 rounded-xl shadow-lg flex flex-col items-center justify-center gap-1"
            style={{ backgroundColor: COLORS.textPrimary }}
          >
            <ArrowUpFromLine className="h-5 w-5" style={{ color: COLORS.cream }} />
            <span className="text-[10px]" style={{ color: COLORS.cream }}>TOP</span>
          </Button>
        </motion.div>

        {/* マップへ */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ delay: 0.1 }}
        >
          <Button
            onClick={() => router.push('/map')}
            size="icon"
            className="h-14 w-14 rounded-xl shadow-lg flex flex-col items-center justify-center gap-1"
            style={{ backgroundColor: COLORS.primary }}
          >
            <Compass className="h-5 w-5" style={{ color: COLORS.cream }} />
            <span className="text-[10px]" style={{ color: COLORS.cream }}>Map</span>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

export default AreaEventListClient;

