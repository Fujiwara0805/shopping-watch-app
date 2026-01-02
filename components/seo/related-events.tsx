"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Calendar, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { RelatedEvent } from '@/lib/seo/types';
import { generateSemanticEventUrl } from '@/lib/seo/url-helper';

// 隣接市町村のマッピング（内部リンク強化用）
const ADJACENT_CITIES: Record<string, string[]> = {
  '大分市': ['別府市', '由布市', '臼杵市', '豊後大野市'],
  '別府市': ['大分市', '由布市', '杵築市', '日出町'],
  '中津市': ['宇佐市', '豊後高田市'],
  '日田市': ['玖珠町', '九重町'],
  '佐伯市': ['臼杵市', '津久見市', '豊後大野市'],
  '臼杵市': ['大分市', '佐伯市', '津久見市'],
  '津久見市': ['臼杵市', '佐伯市'],
  '竹田市': ['豊後大野市', '由布市', '九重町'],
  '豊後高田市': ['宇佐市', '国東市', '杵築市'],
  '杵築市': ['別府市', '日出町', '国東市', '豊後高田市'],
  '宇佐市': ['中津市', '豊後高田市'],
  '豊後大野市': ['大分市', '竹田市', '佐伯市'],
  '由布市': ['大分市', '別府市', '竹田市', '九重町'],
  '国東市': ['豊後高田市', '杵築市', '姫島村'],
  '姫島村': ['国東市'],
  '日出町': ['別府市', '杵築市'],
  '九重町': ['由布市', '竹田市', '玖珠町', '日田市'],
  '玖珠町': ['日田市', '九重町'],
};

interface RelatedEventsProps {
  currentEventId: string;
  city?: string;
  prefecture: string;
  maxItems?: number;
}

export function RelatedEvents({ 
  currentEventId, 
  city, 
  prefecture,
  maxItems = 6 
}: RelatedEventsProps) {
  const [events, setEvents] = useState<RelatedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelatedEvents = async () => {
      setLoading(true);
      
      try {
        const now = new Date();
        
        // 同じ市町村と隣接市町村のイベントを取得
        const targetCities = city ? [city, ...(ADJACENT_CITIES[city] || [])] : [];
        
        let query = supabase
          .from('posts')
          .select('id, event_name, store_name, city, event_start_date, image_urls')
          .eq('is_deleted', false)
          .eq('category', 'イベント情報')
          .eq('prefecture', prefecture)
          .neq('id', currentEventId)
          .order('event_start_date', { ascending: true })
          .limit(maxItems * 2); // 多めに取得してフィルタリング
        
        // 市町村でフィルタリング
        if (targetCities.length > 0) {
          query = query.in('city', targetCities);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('関連イベント取得エラー:', error);
          setEvents([]);
          return;
        }
        
        // 終了していないイベントのみフィルタリング
        const activeEvents = (data || []).filter((event) => {
          if (event.event_start_date) {
            const startDate = new Date(event.event_start_date);
            startDate.setHours(23, 59, 59, 999);
            return now <= startDate;
          }
          return true;
        });
        
        // 同じ市町村のイベントを優先
        const sortedEvents = activeEvents.sort((a, b) => {
          if (a.city === city && b.city !== city) return -1;
          if (a.city !== city && b.city === city) return 1;
          return 0;
        });
        
        setEvents(sortedEvents.slice(0, maxItems) as RelatedEvent[]);
      } catch (error) {
        console.error('関連イベント取得エラー:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRelatedEvents();
  }, [currentEventId, city, prefecture, maxItems]);

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
        <MapPin className="h-5 w-5 text-[#8b6914]" />
        {city ? `${city}周辺のイベント` : '関連イベント'}
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
                      <Calendar className="h-8 w-8 text-[#8b6914]/30" />
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
                      <span>{formatDate(event.event_start_date)}</span>
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
          className="mt-4 flex items-center justify-center gap-1 text-sm text-[#8b6914] hover:text-[#3d2914] transition-colors"
        >
          <span>{city}のイベントをもっと見る</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </motion.section>
  );
}

export default RelatedEvents;

