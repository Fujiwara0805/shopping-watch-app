"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Calendar, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { RelatedEvent } from '@/lib/seo/types';
import { generateSemanticEventUrl } from '@/lib/seo/url-helper';
import { designTokens } from '@/lib/constants';

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
        const cityFilter =
          city != null && String(city).trim() !== ''
            ? String(city).trim()
            : null;
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
          .limit(Math.max(maxItems * 3, 50));

        if (cityFilter != null) {
          query = query.eq('city', cityFilter);
        }

        const { data: queryData, error } = await query;
        if (error) {
          setEvents([]);
          return;
        }

        let data = queryData || [];

        if (cityFilter != null && data.length === 0) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('posts')
            .select('id, event_name, store_name, city, event_start_date, event_end_date, image_urls')
            .eq('is_deleted', false)
            .eq('category', 'イベント情報')
            .eq('prefecture', prefecture)
            .neq('id', currentEventId)
            .order('event_start_date', { ascending: true })
            .limit(100);
          if (!fallbackError && fallbackData) {
            data = fallbackData.filter(
              (e: { city?: string | null }) => e.city != null && String(e.city).trim() === cityFilter
            );
          }
        }

        const overlappingEvents = data.filter((event: { event_start_date?: string | null; event_end_date?: string | null }) => {
          if (!event.event_start_date) return false;
          const eStart = new Date(event.event_start_date).toISOString().slice(0, 10);
          const eEnd = event.event_end_date
            ? new Date(event.event_end_date).toISOString().slice(0, 10)
            : eStart;
          const endDate = new Date(eEnd);
          endDate.setHours(23, 59, 59, 999);
          if (now > endDate) return false;
          return currentStart <= eEnd && eStart <= currentEnd;
        });

        setEvents(overlappingEvents.slice(0, maxItems) as RelatedEvent[]);
      } catch {
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
          <div className="h-6 rounded w-32 mb-4" style={{ background: designTokens.colors.background.cloud }} />
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-shrink-0 w-[calc(50%-6px)] rounded-xl h-36" style={{ background: designTokens.colors.background.cloud }} />
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
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: designTokens.colors.text.primary }}>
        <MapPin className="h-5 w-5" style={{ color: designTokens.colors.primary.base }} />
        {city ? `${city}の周辺イベント` : '周辺イベント'}
      </h2>

      {/* スライド形式: モバイルで2枚表示、横スライドで閲覧 */}
      <div
        className="flex gap-3 overflow-x-auto overflow-y-hidden pb-2 snap-x snap-mandatory scroll-smooth scrollbar-hide -mx-4 px-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {events.map((event, index) => {
          const imageUrl = getImageUrl(event.image_urls);
          const eventName = event.event_name || '無題のイベント';
          const eventUrl = generateSemanticEventUrl({
            eventId: event.id,
            eventName,
            city: event.city || undefined,
            prefecture,
          });
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="flex-shrink-0 snap-center w-[calc(50%-6px)] min-w-[140px] sm:w-[calc(33.333%-8px)] sm:min-w-[160px]"
            >
              <Link
                href={eventUrl}
                className="block rounded-xl overflow-hidden transition-all h-full"
                style={{
                  background: designTokens.colors.background.white,
                  boxShadow: designTokens.elevation.low,
                  border: `1px solid ${designTokens.colors.secondary.stone}30`,
                }}
              >
                <div className="relative h-24" style={{ background: designTokens.colors.background.cloud }}>
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={eventName}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Calendar className="h-8 w-8" style={{ color: designTokens.colors.text.muted }} />
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <h3 className="text-sm font-bold line-clamp-2 mb-1" style={{ color: designTokens.colors.text.primary }}>
                    {eventName}
                  </h3>
                  <div className="flex items-center gap-1 text-xs" style={{ color: designTokens.colors.text.secondary }}>
                    <MapPin className="h-3 w-3 flex-shrink-0" style={{ color: designTokens.colors.functional.error }} />
                    <span className="truncate">{event.city || prefecture}</span>
                  </div>
                  {event.event_start_date && (
                    <div className="flex items-center gap-1 text-xs mt-1" style={{ color: designTokens.colors.text.muted }}>
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

      {city && (
        <Link
          href={`/area/${encodeURIComponent(prefecture)}/${encodeURIComponent(city)}`}
          className="mt-4 flex items-center justify-center gap-1 text-sm transition-colors"
          style={{ color: designTokens.colors.primary.base }}
        >
          <span>{city}のイベントをもっと見る</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </motion.section>
  );
}

export default RelatedEvents;

