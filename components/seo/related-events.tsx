"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Calendar, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { RelatedEvent } from '@/lib/seo/types';
import { generateSemanticEventUrl } from '@/lib/seo/url-helper';

interface RelatedEventsProps {
  currentEventId: string;
  city?: string;
  prefecture: string;
  currentEventStartDate?: string | null;
  currentEventEndDate?: string | null;
  maxItems?: number;
}

export function RelatedEvents({
  currentEventId,
  city,
  prefecture,
  currentEventStartDate,
  currentEventEndDate,
  maxItems = 6
}: RelatedEventsProps) {
  const [events, setEvents] = useState<RelatedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelatedEvents = async () => {
      setLoading(true);

      try {
        const now = new Date();

        // 現在のイベントの開催期間を取得（日付文字列 YYYY-MM-DD）
        const currentStart = currentEventStartDate
          ? new Date(currentEventStartDate).toISOString().slice(0, 10)
          : now.toISOString().slice(0, 10);
        const currentEnd = currentEventEndDate
          ? new Date(currentEventEndDate).toISOString().slice(0, 10)
          : currentStart;

        let query = supabase
          .from('posts')
          .select('id, event_name, store_name, city, event_start_date, event_end_date, image_urls')
          .eq('is_deleted', false)
          .eq('category', 'イベント情報')
          .eq('prefecture', prefecture)
          .neq('id', currentEventId)
          .order('event_start_date', { ascending: true })
          .limit(maxItems * 3); // 多めに取得してフィルタリング

        // 同じ市町村でフィルタリング
        if (city) {
          query = query.eq('city', city);
        }

        const { data, error } = await query;

        if (error) {
          console.error('関連イベント取得エラー:', error);
          setEvents([]);
          return;
        }

        // 開催期間が重なるイベントのみフィルタリング
        // 例: 現在のイベントが2/8開催 → 1/1〜3/31のイベントも含む
        // 例: 現在のイベントが1/1〜3/31 → 2/8のイベントも含む
        const overlappingEvents = (data || []).filter((event) => {
          if (!event.event_start_date) return false;

          const eStart = new Date(event.event_start_date).toISOString().slice(0, 10);
          const eEnd = event.event_end_date
            ? new Date(event.event_end_date).toISOString().slice(0, 10)
            : eStart;

          // 終了済みイベントを除外
          const endDate = new Date(eEnd);
          endDate.setHours(23, 59, 59, 999);
          if (now > endDate) return false;

          // 開催期間の重なり判定: currentStart <= eEnd && eStart <= currentEnd
          return currentStart <= eEnd && eStart <= currentEnd;
        });

        setEvents(overlappingEvents.slice(0, maxItems) as RelatedEvent[]);
      } catch (error) {
        console.error('関連イベント取得エラー:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedEvents();
  }, [currentEventId, city, prefecture, currentEventStartDate, currentEventEndDate, maxItems]);

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
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="mt-8 px-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-100 rounded-lg h-40"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="mt-8 px-4 pb-8"
    >
      <h2 className="text-lg font-bold text-[#3d2914] mb-4 flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        {city ? `${city}の周辺イベント` : '周辺イベント'}
      </h2>
      
      <div className="grid grid-cols-2 gap-3">
        {events.map((event, index) => {
          const imageUrl = getImageUrl(event.image_urls);
          const eventName = event.event_name || '無題のイベント';
          
          // セマンティックURLを生成
          const eventUrl = generateSemanticEventUrl({
            eventId: event.id,
            eventName,
            city: event.city || undefined,
            prefecture: prefecture,
          });
          
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Link
                href={eventUrl}
                className="block bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow border border-[#d4c4a8]"
              >
                {/* 画像 */}
                <div className="relative h-24 bg-[#ffecd2]">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={eventName}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Calendar className="h-8 w-8 text-primary/30" />
                    </div>
                  )}
                </div>
                
                {/* 情報 */}
                <div className="p-2">
                  <h3 className="text-sm font-bold text-[#3d2914] line-clamp-2 mb-1">
                    {eventName}
                  </h3>
                  
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <MapPin className="h-3 w-3 text-red-500 flex-shrink-0" />
                    <span className="truncate">{event.city || prefecture}</span>
                  </div>
                  
                  {event.event_start_date && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span>
                        {formatDate(event.event_start_date)}
                        {event.event_end_date && event.event_end_date !== event.event_start_date && (
                          <>〜{formatDate(event.event_end_date)}</>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
      
      {/* もっと見るリンク */}
      {city && (
        <Link
          href={`/area/${encodeURIComponent(prefecture)}/${encodeURIComponent(city)}`}
          className="mt-4 flex items-center justify-center gap-1 text-sm text-primary hover:text-foreground transition-colors"
        >
          <span>{city}のイベントをもっと見る</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </motion.section>
  );
}

export default RelatedEvents;

