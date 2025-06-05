'use client';

import { useState, useEffect } from 'react';
import { Store } from '@/types/store';

interface UseStoreSearchProps {
  stores: Store[];
  searchRadius?: number;
  currentLocation: {
    latitude: number | null;
    longitude: number | null;
  };
}

export function useStoreSearch({
  stores,
  searchRadius = 5,
  currentLocation,
}: UseStoreSearchProps) {
  const [nearbyStores, setNearbyStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentLocation.latitude === null || currentLocation.longitude === null) {
      setLoading(false);
      setNearbyStores([]);
      return;
    }

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    const filtered = stores.filter(store => {
      const distance = calculateDistance(
        currentLocation.latitude!,
        currentLocation.longitude!,
        store.latitude,
        store.longitude
      );
      return distance <= searchRadius;
    });

    setNearbyStores(filtered);
    setLoading(false);
  }, [stores, searchRadius, currentLocation]);

  return {
    nearbyStores,
    loading,
  };
}