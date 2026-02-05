"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LocationData {
  id: string;
  storeName: string;
  store_latitude?: number;
  store_longitude?: number;
}

export interface MarkerLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lat: number, lng: number, spotName: string) => void;
  initialLat?: number;
  initialLng?: number;
  initialSpotName?: string;
  isLoaded: boolean;
  existingLocations?: LocationData[];
  currentLocationId?: string;
}

export function MarkerLocationModal({
  isOpen,
  onClose,
  onSave,
  initialLat,
  initialLng,
  initialSpotName,
  isLoaded,
  existingLocations = [],
  currentLocationId,
}: MarkerLocationModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const existingMarkersRef = useRef<google.maps.Marker[]>([]);

  const [spotName, setSpotName] = useState<string>(initialSpotName || '');
  const [currentLat, setCurrentLat] = useState<number>(initialLat || 35.6762);
  const [currentLng, setCurrentLng] = useState<number>(initialLng || 139.6503);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSpotName(initialSpotName || '');
    }
  }, [isOpen, initialSpotName]);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('お使いのブラウザは位置情報をサポートしていません');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setCurrentLat(lat);
        setCurrentLng(lng);

        if (mapRef.current && markerRef.current) {
          const newPosition = new google.maps.LatLng(lat, lng);
          mapRef.current.panTo(newPosition);
          markerRef.current.setPosition(newPosition);
        }

        setIsGettingLocation(false);
      },
      (error) => {
        console.error('位置情報の取得に失敗:', error);
        setIsGettingLocation(false);
        alert('位置情報の取得に失敗しました');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, []);

  useEffect(() => {
    if (!isOpen || !isLoaded || !mapContainerRef.current) return;

    const initialPosition = {
      lat: initialLat || 35.6762,
      lng: initialLng || 139.6503
    };

    const map = new google.maps.Map(mapContainerRef.current, {
      center: initialPosition,
      zoom: 17,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      zoomControl: true,
      gestureHandling: 'greedy',
    });

    mapRef.current = map;

    const marker = new google.maps.Marker({
      position: initialPosition,
      map: map,
      draggable: true,
      animation: google.maps.Animation.DROP,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#8B5CF6',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
      }
    });

    markerRef.current = marker;
    setCurrentLat(initialPosition.lat);
    setCurrentLng(initialPosition.lng);

    marker.addListener('dragend', () => {
      const position = marker.getPosition();
      if (position) {
        setCurrentLat(position.lat());
        setCurrentLng(position.lng());
      }
    });

    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        marker.setPosition(e.latLng);
        setCurrentLat(e.latLng.lat());
        setCurrentLng(e.latLng.lng());
      }
    });

    existingLocations.forEach((location) => {
      if (location && location.store_latitude && location.store_longitude && location.id !== currentLocationId) {
        const existingMarker = new google.maps.Marker({
          position: { lat: location.store_latitude, lng: location.store_longitude },
          map: map,
          title: location.storeName || 'スポット',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: '#f59e0b',
            fillOpacity: 0.8,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          }
        });
        existingMarkersRef.current.push(existingMarker);
      }
    });

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
      existingMarkersRef.current.forEach(m => m.setMap(null));
      existingMarkersRef.current = [];
    };
  }, [isOpen, isLoaded, initialLat, initialLng, existingLocations, currentLocationId]);

  const handleSave = () => {
    if (!spotName.trim()) {
      alert('スポット名を入力してください');
      return;
    }
    onSave(currentLat, currentLng, spotName.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
            <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-bold rounded">ピン設定</span>
            <h3 className="text-base font-bold text-gray-800">マーカーピンの位置調整</h3>
          </div>

          <div className="relative">
            <div
              ref={mapContainerRef}
              className="w-full h-[280px] sm:h-[320px] bg-gray-100"
            />

            <div className="absolute bottom-3 left-3">
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-bold rounded-lg shadow-lg border border-gray-200 transition-colors disabled:opacity-50"
              >
                {isGettingLocation ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crosshair className="h-4 w-4" />
                )}
                現在地へ移動
              </button>
            </div>
          </div>

          <div className="px-4 py-4 border-t border-gray-200 space-y-3">
            <div>
              <Label className="text-sm font-semibold mb-2 block text-gray-700">
                スポット名<span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                placeholder="例: お気に入りのカフェ"
                className="h-12 text-base rounded-xl"
                value={spotName}
                onChange={(e) => setSpotName(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-1">
                ※店舗名など、わかりやすい名前を入力してください
              </p>
            </div>
          </div>

          <div className="px-4 py-4 border-t border-gray-200 flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 text-base font-bold rounded-full border-2 border-input"
            >
              キャンセル
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!spotName.trim()}
              className="flex-1 h-12 text-base font-bold rounded-full bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              保存
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
