"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bus, Clock, ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { designTokens } from '@/lib/constants';
import type { GtfsBusStop } from '@/types/gtfs';

interface TimetableRoute {
  route_id: string;
  route_short_name: string | null;
  route_long_name: string | null;
  route_color: string | null;
  departures: Array<{
    departure_time: string;
    trip_headsign: string | null;
  }>;
}

interface TimetableData {
  stop: GtfsBusStop;
  routes: TimetableRoute[];
  metadata: {
    last_updated_at: string;
    data_source: string;
    notes: string | null;
  } | null;
}

interface BusStopTimetableCardProps {
  stop: GtfsBusStop;
  onClose: () => void;
}

function formatTime(time: string): string {
  // GTFS times can be > 24:00 (e.g., "25:30:00" means 1:30 AM next day)
  const parts = time.split(':');
  let hours = parseInt(parts[0]);
  const minutes = parts[1];
  if (hours >= 24) hours -= 24;
  return `${hours}:${minutes}`;
}

function isUpcoming(time: string): boolean {
  const now = new Date();
  const parts = time.split(':');
  let hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const timeMinutes = hours * 60 + minutes;
  return timeMinutes >= nowMinutes;
}

export function BusStopTimetableCard({ stop, onClose }: BusStopTimetableCardProps) {
  const [timetableData, setTimetableData] = useState<TimetableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimetable = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/gtfs/stop-timetable?stop_id=${stop.stop_id}`);
        if (res.ok) {
          const data = await res.json();
          setTimetableData(data);
        } else {
          setError('時刻表の取得に失敗しました。');
        }
      } catch {
        setError('通信エラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };
    fetchTimetable();
  }, [stop.stop_id]);

  const selectedRoute = selectedRouteId
    ? timetableData?.routes.find(r => r.route_id === selectedRouteId)
    : null;

  // Group departures by headsign for the selected route
  const groupedDepartures = selectedRoute
    ? selectedRoute.departures.reduce((acc, dep) => {
        const key = dep.trip_headsign || '方向不明';
        if (!acc[key]) acc[key] = [];
        acc[key].push(dep.departure_time);
        return acc;
      }, {} as Record<string, string[]>)
    : {};

  return (
    <motion.div
      key={`bus-stop-${stop.stop_id}`}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ duration: 0.4, type: "spring", damping: 20 }}
      className="absolute bottom-4 left-4 right-4 z-40"
    >
      <div
        className="relative rounded-2xl overflow-hidden max-h-[60vh] overflow-y-auto"
        style={{ background: designTokens.colors.background.white, boxShadow: designTokens.elevation.high }}
      >
        {/* Close button */}
        <div className="absolute top-4 right-4 z-10">
          <Button onClick={onClose} size="icon" className="h-8 w-8 rounded-full" style={{ background: designTokens.colors.background.cloud, color: designTokens.colors.text.secondary }}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-5">
          {/* Header */}
          <div className="flex gap-4 mb-4">
            <div
              className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: '#3B82F615' }}
            >
              <Bus className="h-7 w-7" style={{ color: '#3B82F6' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: '#3B82F6', color: '#fff' }}>
                  バス停
                </span>
              </div>
              <h3 className="text-lg font-semibold leading-tight line-clamp-2" style={{ fontFamily: designTokens.typography.display, color: designTokens.colors.text.primary }}>
                {stop.stop_name}
              </h3>
            </div>
          </div>

          {/* Back button for route detail */}
          {selectedRouteId && (
            <button
              onClick={() => setSelectedRouteId(null)}
              className="flex items-center gap-1 text-sm font-medium mb-3 transition-colors hover:opacity-80"
              style={{ color: '#3B82F6' }}
            >
              <ChevronLeft className="h-4 w-4" />
              路線一覧に戻る
            </button>
          )}

          {/* Content */}
          {loading ? (
            <div className="text-center py-6">
              <Clock className="h-8 w-8 mx-auto mb-2 animate-pulse" style={{ color: '#3B82F6' }} />
              <p className="text-sm" style={{ color: designTokens.colors.text.muted }}>時刻表を読み込み中...</p>
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" style={{ color: designTokens.colors.functional.warning }} />
              <p className="text-sm" style={{ color: designTokens.colors.text.secondary }}>{error}</p>
            </div>
          ) : !selectedRouteId ? (
            /* Route list */
            <div>
              {timetableData && timetableData.routes.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium mb-2" style={{ color: designTokens.colors.text.muted }}>
                    <Clock className="h-3 w-3 inline mr-1" />
                    本日の運行路線（{timetableData.routes.length}路線）
                  </p>
                  {timetableData.routes.map(route => {
                    const upcomingCount = route.departures.filter(d => isUpcoming(d.departure_time)).length;
                    const nextDeparture = route.departures.find(d => isUpcoming(d.departure_time));
                    return (
                      <motion.button
                        key={route.route_id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedRouteId(route.route_id)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                        style={{
                          background: designTokens.colors.background.cloud,
                          border: `1px solid ${designTokens.colors.secondary.stone}20`,
                        }}
                      >
                        <div
                          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold"
                          style={{
                            background: route.route_color ? `#${route.route_color}` : '#3B82F6',
                            color: '#fff',
                          }}
                        >
                          {route.route_short_name || 'Bus'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold line-clamp-1" style={{ color: designTokens.colors.text.primary }}>
                            {route.route_long_name || route.route_short_name || '路線名不明'}
                          </p>
                          <p className="text-xs" style={{ color: designTokens.colors.text.muted }}>
                            {nextDeparture
                              ? `次の発車: ${formatTime(nextDeparture.departure_time)}`
                              : '本日の運行は終了'}
                            {upcomingCount > 0 && ` (残り${upcomingCount}本)`}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: designTokens.colors.text.muted }} />
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Bus className="h-8 w-8 mx-auto mb-2" style={{ color: designTokens.colors.text.muted }} />
                  <p className="text-sm" style={{ color: designTokens.colors.text.secondary }}>
                    本日の運行情報はありません
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Timetable detail for selected route */
            <div>
              {selectedRoute && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{
                        background: selectedRoute.route_color ? `#${selectedRoute.route_color}` : '#3B82F6',
                        color: '#fff',
                      }}
                    >
                      {selectedRoute.route_short_name || 'Bus'}
                    </div>
                    <h4 className="text-sm font-semibold" style={{ color: designTokens.colors.text.primary }}>
                      {selectedRoute.route_long_name || selectedRoute.route_short_name}
                    </h4>
                  </div>

                  {Object.entries(groupedDepartures).map(([headsign, times]) => (
                    <div key={headsign} className="mb-4">
                      <p className="text-xs font-medium mb-2 px-2" style={{ color: designTokens.colors.text.muted }}>
                        {headsign} 方面
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {times.map((time, idx) => {
                          const upcoming = isUpcoming(time);
                          return (
                            <span
                              key={idx}
                              className="px-2 py-1 rounded-md text-xs font-mono"
                              style={{
                                background: upcoming ? '#3B82F615' : designTokens.colors.background.cloud,
                                color: upcoming ? '#3B82F6' : designTokens.colors.text.muted,
                                fontWeight: upcoming ? 600 : 400,
                                border: upcoming ? '1px solid #3B82F640' : 'none',
                              }}
                            >
                              {formatTime(time)}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Metadata footer */}
          {timetableData?.metadata && (
            <div className="mt-4 pt-3" style={{ borderTop: `1px dashed ${designTokens.colors.secondary.stone}30` }}>
              <p className="text-[10px] leading-relaxed" style={{ color: designTokens.colors.text.muted }}>
                データ提供: {timetableData.metadata.data_source} |
                更新日: {new Date(timetableData.metadata.last_updated_at).toLocaleDateString('ja-JP')}
              </p>
              <p className="text-[10px] leading-relaxed" style={{ color: designTokens.colors.text.muted }}>
                ※データは不定期更新のため、最新の時刻表と異なる場合があります
              </p>
            </div>
          )}

          {/* Google Maps direction link */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-3">
            <Button
              onClick={() => {
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${stop.stop_lat},${stop.stop_lon}`, '_blank');
              }}
              className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              style={{ background: '#3B82F6', color: '#fff' }}
            >
              <Bus className="h-4 w-4" />
              ここへのルート
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
