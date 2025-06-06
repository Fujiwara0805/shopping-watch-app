"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, MapPin as PinIcon, Navigation } from 'lucide-react';
import { useGoogleMapsApi } from '@/components/providers/GoogleMapsApiProvider';

interface MapSearchControlProps {
  map: google.maps.Map | null;
  userLocation: google.maps.LatLng | null;
  onPlaceSelected: (
    place: google.maps.places.PlaceResult,
    distance: string | null
  ) => void;
  onSearchError?: (error: string) => void;
  className?: string;
}

export function MapSearchControl({
  map,
  userLocation,
  onPlaceSelected,
  onSearchError,
  className,
}: MapSearchControlProps) {
  const { isLoaded: isMapsApiLoaded, loadError } = useGoogleMapsApi();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    // API読み込みエラーまたは地図が未初期化の場合はスキップ
    if (!isMapsApiLoaded || !inputRef.current || !map || loadError) {
      console.log("MapSearchControl: Skipping autocomplete setup", {
        isMapsApiLoaded,
        hasInput: !!inputRef.current,
        hasMap: !!map,
        loadError: !!loadError
      });
      
      // 既存のオートコンプリートをクリーンアップ
      if (autocompleteRef.current && typeof google !== 'undefined' && google.maps && google.maps.event) {
         google.maps.event.clearInstanceListeners(autocompleteRef.current);
         autocompleteRef.current = null;
      }
      return;
    }
    
    console.log("MapSearchControl: Setting up autocomplete");
    
    // 既存のイベントリスナーをクリーンアップ
    if (autocompleteRef.current && typeof google !== 'undefined' && google.maps && google.maps.event) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
    }

    const autocompleteOptions: google.maps.places.AutocompleteOptions = {
      types: ['establishment', 'geocode'],
      componentRestrictions: { country: 'jp' },
      fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types', 'photos'],
    };

    // 地図の境界を設定
    if (map.getBounds()) {
      autocompleteOptions.bounds = map.getBounds() as google.maps.LatLngBounds;
      autocompleteOptions.strictBounds = false;
    }
    
    // ユーザー位置を中心とした境界を設定
    if (userLocation) {
        const circle = new google.maps.Circle({
            center: userLocation,
            radius: 50000, // 50km
        });
        autocompleteOptions.bounds = circle.getBounds() as google.maps.LatLngBounds;
    }

    try {
      if (inputRef.current) {
          const newAutocomplete = new window.google.maps.places.Autocomplete(
            inputRef.current,
            autocompleteOptions
          );

          newAutocomplete.addListener('place_changed', () => {
            const place = newAutocomplete.getPlace();
            console.log("MapSearchControl: Place selected:", place);
            
            if (place && place.geometry && place.name) {
              setInputValue(place.name);
              let distanceText: string | null = null;
              
              // 距離計算
              if (userLocation && place.geometry.location) {
                const distance = google.maps.geometry.spherical.computeDistanceBetween(
                  userLocation,
                  place.geometry.location
                );
                distanceText = (distance / 1000).toFixed(1) + ' km';
              }
              
              onPlaceSelected(place, distanceText);
              inputRef.current?.blur();
            } else {
              console.warn("MapSearchControl: Invalid place selected:", place);
              if (onSearchError) {
                onSearchError("有効な場所が選択されませんでした。");
              }
            }
          });
          
          autocompleteRef.current = newAutocomplete;
          console.log("MapSearchControl: Autocomplete setup completed");
      }
    } catch (error) {
      console.error("MapSearchControl: Error setting up autocomplete:", error);
      if (onSearchError) {
        onSearchError("検索機能の初期化に失敗しました。");
      }
    }
    
    return () => {
        if (autocompleteRef.current && typeof google !== 'undefined' && google.maps && google.maps.event) {
            google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
    };
  }, [isMapsApiLoaded, map, userLocation, onPlaceSelected, onSearchError, loadError]);

  const handleClearInput = () => {
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
  };
  
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  if (loadError) {
    console.error("MapSearchControl: Google Maps API load error:", loadError);
    return (
        <div className={`p-4 text-center text-sm text-red-400 ${className}`}>
            <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                検索機能の読み込みに失敗しました
            </div>
        </div>
    );
  }

  if (!isMapsApiLoaded) {
     return (
        <div className={`p-4 text-center text-sm ${className}`}>
            <div 
                className="flex items-center justify-center gap-2"
                style={{ color: '#73370c' }}
            >
                <div 
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: '#73370c' }}
                ></div>
                検索機能を読み込み中...
            </div>
        </div>
    );
  }

  return (
    <motion.div
      className={`relative w-full ${className || ''}`}
      initial={{ y: -20, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <motion.div 
        className="relative overflow-hidden rounded-2xl shadow-2xl"
        style={{
          background: `linear-gradient(135deg, #73370c 0%, #8b4513 50%, #73370c 100%)`,
          boxShadow: isFocused 
            ? '0 20px 40px rgba(115, 55, 12, 0.3), 0 0 0 2px rgba(115, 55, 12, 0.2)' 
            : '0 10px 30px rgba(115, 55, 12, 0.2)'
        }}
        animate={{
          scale: isFocused ? 1.02 : 1,
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        {/* グラデーションオーバーレイ */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)'
          }}
        />
        
        <div className="relative flex items-center p-3">
          {/* 検索アイコン */}
          <motion.div
            animate={{
              rotate: isFocused ? 360 : 0,
              scale: isFocused ? 1.1 : 1
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex-shrink-0 ml-2"
          >
            <Search 
              className="h-6 w-6" 
              style={{ color: 'rgba(255, 255, 255, 0.9)' }}
            />
          </motion.div>

          {/* 入力フィールド */}
          <Input
            ref={inputRef}
            type="text"
            placeholder="お店やキーワードを検索"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className="flex-grow bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-white placeholder:text-white/70 text-base font-medium pl-4 pr-12 py-3 h-auto"
            style={{
              caretColor: 'white',
              textShadow: '0 1px 2px rgba(0,0,0,0.2)',
              fontSize: '16px' // モバイルでのズーム無効化
            }}
            disabled={!isMapsApiLoaded || !map}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />

          {/* クリアボタン */}
          {inputValue && (
            <motion.div
              initial={{ opacity: 0, scale: 0, x: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0, x: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 p-0 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200 backdrop-blur-sm"
                onClick={handleClearInput}
              >
                <X className="h-4 w-4 text-white" />
              </Button>
            </motion.div>
          )}
        </div>

        {/* 下部のアクセントライン */}
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent"
          animate={{
            width: isFocused ? '100%' : '0%',
            opacity: isFocused ? 1 : 0
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        />
      </motion.div>

      {/* フォーカス時のリング効果 */}
      {isFocused && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: `linear-gradient(135deg, transparent 0%, rgba(115, 55, 12, 0.1) 50%, transparent 100%)`,
            boxShadow: '0 0 0 3px rgba(115, 55, 12, 0.15)'
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </motion.div>
  );
}