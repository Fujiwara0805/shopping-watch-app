"use client";

import { useState, useCallback, useRef } from 'react';
import type { GtfsBusStop } from '@/types/gtfs';

interface UseGtfsStopsOptions {
  debounceMs?: number;
  cacheTtlMs?: number;
  minZoom?: number;
}

export function useGtfsStops(options: UseGtfsStopsOptions = {}) {
  const { debounceMs = 500, cacheTtlMs = 300000, minZoom = 12 } = options;
  const [stops, setStops] = useState<GtfsBusStop[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataEmpty, setDataEmpty] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, { data: GtfsBusStop[]; timestamp: number }>>(new Map());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstFetchRef = useRef(true);
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const emptyFetchCountRef = useRef(0);

  const fetchStopsInBounds = useCallback((map: google.maps.Map) => {
    const bounds = map.getBounds();
    if (!bounds) return;

    // Skip fetch if zoom is too low (too wide area)
    const zoom = map.getZoom();
    if (zoom !== undefined && zoom < minZoom) {
      // If zoomed out too far, clear stops to avoid stale data
      setStops([]);
      return;
    }

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const cacheKey = `${sw.lat().toFixed(3)},${sw.lng().toFixed(3)}_${ne.lat().toFixed(3)},${ne.lng().toFixed(3)}`;

    // Check cache
    const cached = cacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheTtlMs) {
      setStops(cached.data);
      return;
    }

    // Debounce (shorter for first fetch)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const delay = isFirstFetchRef.current ? 100 : debounceMs;

    debounceTimerRef.current = setTimeout(async () => {
      isFirstFetchRef.current = false;
      setLoading(true);
      setFetchError(null);
      try {
        const res = await fetch(
          `/api/gtfs/stops?swLat=${sw.lat()}&swLng=${sw.lng()}&neLat=${ne.lat()}&neLng=${ne.lng()}`
        );
        if (res.ok) {
          const data = await res.json();
          let stopsData = data.stops as GtfsBusStop[];

          // データが空かどうかを追跡（連続で空なら「データ未投入」と判断）
          if (stopsData.length === 0) {
            emptyFetchCountRef.current++;
            if (emptyFetchCountRef.current >= 2) {
              setDataEmpty(true);
            }
          } else {
            emptyFetchCountRef.current = 0;
            setDataEmpty(false);
          }

          // Sort by distance from user location if available (5km priority)
          const userLoc = userLocationRef.current;
          if (userLoc) {
            stopsData = stopsData.sort((a, b) => {
              const dA = Math.pow(a.stop_lat - userLoc.lat, 2) + Math.pow(a.stop_lon - userLoc.lng, 2);
              const dB = Math.pow(b.stop_lat - userLoc.lat, 2) + Math.pow(b.stop_lon - userLoc.lng, 2);
              return dA - dB;
            });
          }
          cacheRef.current.set(cacheKey, { data: stopsData, timestamp: Date.now() });
          setStops(stopsData);
        } else {
          setFetchError('バス停データの取得に失敗しました');
        }
      } catch (err) {
        console.error('GTFSバス停データの取得に失敗:', err);
        setFetchError('通信エラーが発生しました');
      } finally {
        setLoading(false);
      }
    }, delay);
  }, [debounceMs, cacheTtlMs, minZoom]);

  const clearStops = useCallback(() => {
    setStops([]);
    setDataEmpty(false);
    setFetchError(null);
    emptyFetchCountRef.current = 0;
    isFirstFetchRef.current = true;
  }, []);

  const setUserLocation = useCallback((lat: number, lng: number) => {
    userLocationRef.current = { lat, lng };
  }, []);

  return { stops, loading, dataEmpty, fetchError, fetchStopsInBounds, clearStops, setUserLocation };
}
