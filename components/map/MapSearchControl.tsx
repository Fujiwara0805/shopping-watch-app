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
  initialValue?: string;
}

export function MapSearchControl({
  map,
  userLocation,
  onPlaceSelected,
  onSearchError,
  className,
  initialValue = '',
}: MapSearchControlProps) {
  const { isLoaded: isMapsApiLoaded, loadError } = useGoogleMapsApi();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  // 🔥 修正1: 初期検索の実行を追跡するフラグを追加
  const initialSearchExecutedRef = useRef(false);

  // 初期値が変更された時に入力値を更新
  useEffect(() => {
    setInputValue(initialValue);
    if (inputRef.current) {
      inputRef.current.value = initialValue;
    }
    // 🔥 修正2: 初期値が変更されたら検索フラグをリセット
    initialSearchExecutedRef.current = false;
  }, [initialValue]);

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

          // 🔥 検索候補のカスタム表示フォーマット
          const formatSearchResults = () => {
            setTimeout(() => {
              const pacContainer = document.querySelector('.pac-container') as HTMLElement;
              if (pacContainer) {
                const pacItems = pacContainer.querySelectorAll('.pac-item');
                
                pacItems.forEach((item) => {
                  const pacItemQuery = item.querySelector('.pac-item-query');
                  if (pacItemQuery) {
                    // 店舗名と住所を分離
                    const fullText = pacItemQuery.textContent || '';
                    const parts = fullText.split(',');
                    
                    if (parts.length >= 2) {
                      const storeName = parts[0].trim();
                      const address = parts.slice(1).join(',').trim();
                      
                      // HTMLを再構築
                      pacItemQuery.innerHTML = `
                        <div style="font-weight: 600; font-size: 16px; color: #1f2937; margin-bottom: 4px; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                          ${storeName}
                        </div>
                        <div style="font-size: 13px; color: #6b7280; font-weight: 400; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                          ${address}
                        </div>
                      `;
                    }
                  }
                });
                
                // ドロップダウンがクリックされた時にフォーカスを維持
                pacContainer.addEventListener('mousedown', (e) => {
                  e.preventDefault(); // デフォルトのブラー動作を防ぐ
                });
              }
            }, 100);
          };

          // 入力イベントでフォーマットを適用
          if (inputRef.current) {
            inputRef.current.addEventListener('input', formatSearchResults);
          }

          newAutocomplete.addListener('place_changed', () => {
            const place = newAutocomplete.getPlace();
            console.log("MapSearchControl: Place selected:", place);
            
            if (place && place.geometry && (place.name || place.formatted_address)) {
              // 表示名を決定（nameが優先、なければformatted_address）
              const displayName = place.name || place.formatted_address || '';
              
              // Reactの状態を更新
              setInputValue(displayName);
              
              // 入力フィールドの値も直接更新（Google Maps APIとの同期のため）
              if (inputRef.current) {
                inputRef.current.value = displayName;
              }
              
              let distanceText: string | null = null;
              
              // 距離計算
              if (userLocation && place.geometry.location) {
                const distance = google.maps.geometry.spherical.computeDistanceBetween(
                  userLocation,
                  place.geometry.location
                );
                distanceText = (distance / 1000).toFixed(1) + ' km';
              }
              
              // 少し遅延を入れてから処理を実行（UIの更新を確実にするため）
              setTimeout(() => {
                onPlaceSelected(place, distanceText);
                // フォーカス状態をリセット
                setIsFocused(false);
                inputRef.current?.blur();
              }, 100);
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
  }, [isMapsApiLoaded, map, userLocation, onPlaceSelected, onSearchError, loadError]); // 🔥 修正3: initialValueを依存配列から削除

  // 🔥 修正4: 初期検索を別のuseEffectに分離
  useEffect(() => {
    // 初期値がある場合、自動検索を実行（一度だけ）
    if (initialValue && 
        initialValue.trim() && 
        !initialSearchExecutedRef.current && 
        isMapsApiLoaded && 
        map && 
        !loadError) {
      
      console.log("MapSearchControl: Triggering initial search for:", initialValue);
      initialSearchExecutedRef.current = true; // 実行済みフラグを設定
      
      // Places APIのTextSearchを使用して初期検索を実行
      const service = new google.maps.places.PlacesService(map);
      const request = {
        query: initialValue,
        location: userLocation || undefined,
        radius: userLocation ? 50000 : undefined,
        type: 'establishment'
      };
      
      service.textSearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
          const place = results[0];
          console.log("MapSearchControl: Initial search result:", place);
          
          let distanceText: string | null = null;
          if (userLocation && place.geometry?.location) {
            const distance = google.maps.geometry.spherical.computeDistanceBetween(
              userLocation,
              place.geometry.location
            );
            distanceText = (distance / 1000).toFixed(1) + ' km';
          }
          
          onPlaceSelected(place, distanceText);
        } else {
          console.log("MapSearchControl: Initial search failed or no results");
        }
      });
    }
  }, [initialValue, isMapsApiLoaded, map, loadError, userLocation, onPlaceSelected]);

  const handleClearInput = () => {
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
  };
  
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputValue(newValue);
    
    // Google Maps APIの入力フィールドとも同期
    if (inputRef.current && inputRef.current.value !== newValue) {
      inputRef.current.value = newValue;
    }
  };

  // 🔥 修正5: タッチイベントの問題を解決するためにpassive optionを追加
  const handleFocus = () => setIsFocused(true);
  
  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    // Google Places ドロップダウン内の要素にフォーカスが移った場合は無視
    const relatedTarget = event.relatedTarget as HTMLElement;
    if (relatedTarget && relatedTarget.closest('.pac-container')) {
      return;
    }
    
    // ブラー時に遅延を入れる（オートコンプリートの選択を妨げないため）
    setTimeout(() => {
      // ドロップダウンが表示されている場合は、フォーカス状態を維持
      const pacContainers = document.querySelectorAll('.pac-container');
      const hasVisibleDropdown = Array.from(pacContainers).some(
        container => (container as HTMLElement).style.display !== 'none'
      );
      
      if (!hasVisibleDropdown) {
        setIsFocused(false);
      }
    }, 200); // 遅延を200msに増加
  };

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
              fontSize: '18px' // モバイルでのズーム無効化
            }}
            disabled={!isMapsApiLoaded || !map}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            // 🔥 修正6: タッチイベントの問題を解決するための属性を追加
            onTouchStart={(e) => {
              // タッチイベントをpassiveにして、スクロールを妨げないようにする
              e.currentTarget.style.touchAction = 'manipulation';
            }}
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
                // 🔥 修正7: タッチイベントの問題を解決
                onTouchStart={(e) => {
                  e.currentTarget.style.touchAction = 'manipulation';
                }}
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