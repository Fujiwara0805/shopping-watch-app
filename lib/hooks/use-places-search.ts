"use client";

import { useState, useCallback, useRef } from 'react';

export interface PlaceResult {
  id: string;
  name: string;
  lat: number;
  lng: number;
  types: string[];
  vicinity: string;
}

interface UsePlacesSearchOptions {
  debounceMs?: number;
  cacheTtlMs?: number;
}

export function usePlacesSearch(options: UsePlacesSearchOptions = {}) {
  const { debounceMs = 500, cacheTtlMs = 300000 } = options;
  const [results, setResults] = useState<Map<string, PlaceResult[]>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const cacheRef = useRef<Map<string, { data: PlaceResult[]; timestamp: number }>>(new Map());
  const debounceTimerRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const isFirstSearchRef = useRef<Map<string, boolean>>(new Map());

  const searchNearby = useCallback((
    map: google.maps.Map,
    center: google.maps.LatLng,
    placeType: string,
    radius: number = 5000
  ) => {
    const cacheKey = `${center.lat().toFixed(3)},${center.lng().toFixed(3)}_${placeType}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheTtlMs) {
      setResults(prev => new Map(prev).set(placeType, cached.data));
      return;
    }

    // Clear existing timer for this type
    const existingTimer = debounceTimerRef.current.get(placeType);
    if (existingTimer) clearTimeout(existingTimer);

    // Shorter debounce for first search of each type
    const isFirst = !isFirstSearchRef.current.get(placeType);
    const delay = isFirst ? 100 : debounceMs;

    const timer = setTimeout(() => {
      if (!window.google?.maps?.places) return;

      isFirstSearchRef.current.set(placeType, true);
      const service = new window.google.maps.places.PlacesService(map);
      setLoading(prev => new Set(prev).add(placeType));

      service.nearbySearch(
        { location: center, radius, type: placeType as any },
        (placeResults: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
          setLoading(prev => {
            const next = new Set(prev);
            next.delete(placeType);
            return next;
          });

          if (status === window.google.maps.places.PlacesServiceStatus.OK && placeResults) {
            const mapped: PlaceResult[] = placeResults.map((r: google.maps.places.PlaceResult) => ({
              id: r.place_id || `${r.geometry?.location?.lat()}_${r.geometry?.location?.lng()}`,
              name: r.name || '',
              lat: r.geometry?.location?.lat() || 0,
              lng: r.geometry?.location?.lng() || 0,
              types: r.types || [],
              vicinity: r.vicinity || '',
            }));
            cacheRef.current.set(cacheKey, { data: mapped, timestamp: Date.now() });
            setResults(prev => new Map(prev).set(placeType, mapped));
          }
        }
      );
    }, delay);

    debounceTimerRef.current.set(placeType, timer);
  }, [debounceMs, cacheTtlMs]);

  const clearResults = useCallback((placeType?: string) => {
    if (placeType) {
      setResults(prev => {
        const next = new Map(prev);
        next.delete(placeType);
        return next;
      });
      isFirstSearchRef.current.delete(placeType);
    } else {
      setResults(new Map());
      isFirstSearchRef.current.clear();
    }
  }, []);

  return { results, loading, searchNearby, clearResults };
}
