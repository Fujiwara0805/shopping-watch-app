"use client";

import { useState, useCallback, useRef } from 'react';
import type { GtfsBusStop } from '@/types/gtfs';

interface UseGtfsStopsOptions {
  debounceMs?: number;
  cacheTtlMs?: number;
}

export function useGtfsStops(options: UseGtfsStopsOptions = {}) {
  const { debounceMs = 500, cacheTtlMs = 300000 } = options;
  const [stops, setStops] = useState<GtfsBusStop[]>([]);
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef<Map<string, { data: GtfsBusStop[]; timestamp: number }>>(new Map());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStopsInBounds = useCallback((map: google.maps.Map) => {
    const bounds = map.getBounds();
    if (!bounds) return;

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const cacheKey = `${sw.lat().toFixed(3)},${sw.lng().toFixed(3)}_${ne.lat().toFixed(3)},${ne.lng().toFixed(3)}`;

    // Check cache
    const cached = cacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheTtlMs) {
      setStops(cached.data);
      return;
    }

    // Debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/gtfs/stops?swLat=${sw.lat()}&swLng=${sw.lng()}&neLat=${ne.lat()}&neLng=${ne.lng()}`
        );
        if (res.ok) {
          const data = await res.json();
          const stopsData = data.stops as GtfsBusStop[];
          cacheRef.current.set(cacheKey, { data: stopsData, timestamp: Date.now() });
          setStops(stopsData);
        }
      } catch (err) {
        console.error('GTFSバス停データの取得に失敗:', err);
      } finally {
        setLoading(false);
      }
    }, debounceMs);
  }, [debounceMs, cacheTtlMs]);

  const clearStops = useCallback(() => {
    setStops([]);
  }, []);

  return { stops, loading, fetchStopsInBounds, clearStops };
}
