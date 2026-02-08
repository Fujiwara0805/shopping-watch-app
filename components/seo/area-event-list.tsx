"use client";

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Calendar, ArrowUpFromLine, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SEOEventData } from '@/lib/seo/types';
import { generateSemanticEventUrl } from '@/lib/seo/url-helper';
import { designTokens } from '@/lib/constants';
import { Breadcrumb } from '@/components/seo/breadcrumb';

interface AreaEventListClientProps {
  prefecture: string;
  city: string;
  initialEvents: SEOEventData[];
}

export function AreaEventListClient({
  prefecture,
  city,
  initialEvents,
}: AreaEventListClientProps) {
  const locationName = `${prefecture}${city}`;

  // 日付順（event_start_date 昇順）で表示
  const sortedEvents = useMemo(() => {
    return [...initialEvents].sort((a, b) => {
      const aDate = a.event_start_date ? new Date(a.event_start_date).getTime() : 0;
      const bDate = b.event_start_date ? new Date(b.event_start_date).getTime() : 0;
      return aDate - bDate;
    });
  }, [initialEvents]);

  const breadcrumbItems = [
    { label: 'ホーム', href: '/' },
    { label: 'エリア', href: '/area' },
    { label: prefecture, href: `/area/${encodeURIComponent(prefecture)}` },
    { label: city, href: `/area/${encodeURIComponent(prefecture)}/${encodeURIComponent(city)}`, isCurrent: true },
  ];

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
    <div className="min-h-screen" style={{ background: designTokens.colors.background.mist }}>
      {/* パンくず（都道府県名・市町村名を表示） */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-4 pt-3">
        <Breadcrumb items={breadcrumbItems} />
      </motion.div>

      {/* ヘッダー（イベント一覧と同じトーン） */}
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
          <div className="flex items-center justify-center gap-3">
            <ScrollText className="h-5 w-5" style={{ color: designTokens.colors.accent.gold }} />
            <h1
              className="text-xl font-semibold tracking-wide"
              style={{
                fontFamily: designTokens.typography.display,
                color: designTokens.colors.text.inverse,
              }}
            >
              {city}のイベント
            </h1>
            <ScrollText className="h-5 w-5" style={{ color: designTokens.colors.accent.gold }} />
          </div>
        </div>
      </motion.header>

      <main className="container mx-auto px-4 py-6 max-w-4xl pb-28">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm" style={{ color: designTokens.colors.text.secondary }}>
            {sortedEvents.length}件のイベント
          </p>
          <Badge
            variant="outline"
            style={{
              borderColor: designTokens.colors.primary.base,
              color: designTokens.colors.primary.base,
            }}
          >
            {locationName}
          </Badge>
        </div>

        {sortedEvents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-8 text-center"
            style={{
              background: designTokens.colors.background.white,
              boxShadow: designTokens.elevation.medium,
              border: `1px solid ${designTokens.colors.secondary.stone}30`,
            }}
          >
            <Calendar className="h-16 w-16 mx-auto mb-4" style={{ color: designTokens.colors.text.muted }} />
            <p className="text-lg" style={{ color: designTokens.colors.text.secondary }}>
              {city}で開催予定のイベントはありません
            </p>
            <Link href="/events">
              <Button className="mt-4" style={{ background: designTokens.colors.primary.base, color: designTokens.colors.text.inverse }}>
                すべてのイベントを見る
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {sortedEvents.map((event, index) => {
                const imageUrl = getImageUrl(event.image_urls);
                const eventName = event.event_name || event.content || '無題のイベント';
                const dateStr = formatDate(event.event_start_date, event.event_end_date);
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
                      className="block rounded-xl overflow-hidden transition-all"
                      style={{
                        background: designTokens.colors.background.white,
                        boxShadow: designTokens.elevation.low,
                        border: `1px solid ${designTokens.colors.secondary.stone}30`,
                      }}
                    >
                      <div className="flex">
                        <div
                          className="relative w-32 h-32 flex-shrink-0"
                          style={{ background: designTokens.colors.background.cloud }}
                        >
                          {imageUrl ? (
                            <Image src={imageUrl} alt={eventName} fill className="object-cover" sizes="128px" />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Calendar className="h-12 w-12" style={{ color: designTokens.colors.text.muted }} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 p-4 min-w-0">
                          <h2
                            className="font-semibold text-base mb-2 line-clamp-2"
                            style={{ fontFamily: designTokens.typography.display, color: designTokens.colors.primary.dark }}
                          >
                            {eventName}
                          </h2>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm" style={{ color: designTokens.colors.text.secondary }}>
                              <MapPin className="h-4 w-4 flex-shrink-0" style={{ color: designTokens.colors.functional.error }} />
                              <span className="truncate">{event.store_name}</span>
                            </div>
                            {dateStr && (
                              <div className="flex items-center gap-2 text-sm" style={{ color: designTokens.colors.text.muted }}>
                                <Calendar className="h-4 w-4 flex-shrink-0" style={{ color: designTokens.colors.primary.base }} />
                                <span>{dateStr}</span>
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

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 p-4 rounded-xl"
          style={{
            background: designTokens.colors.background.white,
            border: `1px solid ${designTokens.colors.secondary.stone}30`,
            boxShadow: designTokens.elevation.subtle,
          }}
        >
          <h2 className="font-bold text-lg mb-3" style={{ color: designTokens.colors.text.primary }}>
            {prefecture}の他の地域
          </h2>
          <div className="flex flex-wrap gap-2">
            {['大分市', '別府市', '中津市', '日田市', '佐伯市', '臼杵市', '竹田市', '由布市', '国東市', '宇佐市']
              .filter((c) => c !== city)
              .map((otherCity) => (
                <Link
                  key={otherCity}
                  href={`/area/${encodeURIComponent(prefecture)}/${encodeURIComponent(otherCity)}`}
                  className="px-3 py-1.5 rounded-full text-sm transition-colors"
                  style={{
                    background: `${designTokens.colors.accent.gold}20`,
                    color: designTokens.colors.text.primary,
                  }}
                >
                  {otherCity}
                </Link>
              ))}
          </div>
        </motion.section>
      </main>

      <div className="fixed bottom-4 right-4 z-30">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={scrollToTop}
            size="icon"
            className="h-14 w-14 rounded-xl shadow-lg flex flex-col items-center justify-center gap-1"
            style={{ background: designTokens.colors.text.primary, color: designTokens.colors.text.inverse }}
          >
            <ArrowUpFromLine className="h-5 w-5" />
            <span className="text-[10px]">TOP</span>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

export default AreaEventListClient;

