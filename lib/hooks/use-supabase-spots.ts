"use client";

import { useState, useCallback, useRef } from 'react';
import type { FacilityLayerType } from '@/types/facility-report';

export interface SupabaseSpotResult {
  id: string;
  spot_id: string;
  name: string;
  lat: number;
  lng: number;
  municipality?: string;
  address?: string;
  description?: string;
  business_hours?: string;
  closed_days?: string;
  fee?: string;
  phone?: string;
  website?: string;
  parking?: string;
  access?: string;
  source_url?: string;
  distance?: number;
  // type-specific fields
  category?: string;
  sub_categories?: string;
  spring_quality?: string;
  facility_type?: string;
  cuisine_type?: string;
  price_range?: string;
  toilet_type?: string;
  barrier_free?: string;
}

// Types that use Supabase DB instead of Google Places
const SUPABASE_SPOT_TYPES: FacilityLayerType[] = [
  'tourism_spot',
  'hot_spring',
  'restaurant',
  'toilet',
];

export function isSupabaseSpotType(type: FacilityLayerType): boolean {
  return SUPABASE_SPOT_TYPES.includes(type);
}

interface CacheEntry {
  data: SupabaseSpotResult[];
  timestamp: number;
  key: string;
}

export function useSupabaseSpots() {
  const [spots, setSpots] = useState<Map<FacilityLayerType, SupabaseSpotResult[]>>(new Map());
  const [loading, setLoading] = useState<Set<FacilityLayerType>>(new Set());
  const cacheRef = useRef<Map<FacilityLayerType, CacheEntry>>(new Map());
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const fetchSpots = useCallback(async (
    type: FacilityLayerType,
    userLat?: number,
    userLng?: number,
    radiusKm: number = 10,
  ) => {
    if (!isSupabaseSpotType(type)) return;

    const cacheKey = `${userLat?.toFixed(2)},${userLng?.toFixed(2)}_${radiusKm}`;
    const cached = cacheRef.current.get(type);
    if (cached && cached.key === cacheKey && Date.now() - cached.timestamp < CACHE_TTL) {
      setSpots(prev => new Map(prev).set(type, cached.data));
      return;
    }

    setLoading(prev => new Set(prev).add(type));

    try {
      const params = new URLSearchParams({ type });
      if (userLat !== undefined && userLng !== undefined) {
        params.set('lat', String(userLat));
        params.set('lng', String(userLng));
        params.set('radius', String(radiusKm));
      }

      const res = await fetch(`/api/spots?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.spots) {
        const results: SupabaseSpotResult[] = data.spots;
        cacheRef.current.set(type, { data: results, timestamp: Date.now(), key: cacheKey });
        setSpots(prev => new Map(prev).set(type, results));
      }
    } catch (error) {
      console.error(`Failed to fetch ${type} spots:`, error);
    } finally {
      setLoading(prev => {
        const next = new Set(prev);
        next.delete(type);
        return next;
      });
    }
  }, []);

  const clearSpots = useCallback((type?: FacilityLayerType) => {
    if (type) {
      setSpots(prev => {
        const next = new Map(prev);
        next.delete(type);
        return next;
      });
    } else {
      setSpots(new Map());
    }
  }, []);

  return { spots, loading, fetchSpots, clearSpots, isSupabaseSpotType };
}
