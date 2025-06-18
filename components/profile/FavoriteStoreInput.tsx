"use client";

import React, { useEffect, useRef, useState, useImperativeHandle, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, MapPin } from 'lucide-react';
import { useGoogleMapsApi } from '@/components/providers/GoogleMapsApiProvider';

interface PlaceSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface FavoriteStoreInputProps {
  placeholder?: string;
  value?: { id?: string; name?: string };
  onChange: (value: { id: string; name: string } | null) => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const FavoriteStoreInput = React.forwardRef<HTMLInputElement, FavoriteStoreInputProps>(
  ({ value, onChange, placeholder = "店舗名で検索", disabled, className, style }, ref) => {
    const { isLoaded: isMapsApiLoaded, loadError: mapsApiLoadError } = useGoogleMapsApi();
    const localInputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const dropdownObserverRef = useRef<MutationObserver | null>(null);
    const [inputValue, setInputValue] = useState(value?.name || '');
    const [userLocation, setUserLocation] = useState<google.maps.LatLng | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // forwardRefで渡されたrefとローカルのrefをマージ
    useImperativeHandle(ref, () => localInputRef.current as HTMLInputElement);

    // 🔥 ビューポート高さの動的計算（Chrome/Safari統一）
    const getActualViewportHeight = useCallback(() => {
      // CSS変数から実際のビューポート高さを取得
      const vhValue = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vh')) || 1;
      return vhValue * 100;
    }, []);

    // 🔥 キーボード表示検出（モバイル対応強化）
    const detectKeyboardHeight = useCallback(() => {
      const isMobile = window.innerWidth <= 768;
      if (!isMobile) return 0;

      const actualVh = getActualViewportHeight();
      const currentVh = window.innerHeight;
      const heightDiff = actualVh - currentVh;
      
      // キーボードが表示されている場合（高さの差が100px以上）
      return heightDiff > 100 ? heightDiff : 0;
    }, [getActualViewportHeight]);

    const getCurrentLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (window.google && window.google.maps) {
              setUserLocation(
                new google.maps.LatLng(
                  position.coords.latitude,
                  position.coords.longitude
                )
              );
              setLocationError(null);
            } else {
              setLocationError("Google Maps APIがまだ準備できていません。");
            }
          },
          (error) => {
            console.warn("Error getting user location:", error);
            setLocationError("位置情報の取得に失敗しました。");
            setUserLocation(null);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        setLocationError("お使いのブラウザは位置情報取得に対応していません。");
      }
    };

    // 🔥 Google Places ドロップダウンの位置調整（Chrome/Safari統一版）
    const adjustDropdownPosition = useCallback(() => {
      if (!localInputRef.current) return;

      const pacContainers = document.querySelectorAll('.pac-container');
      
      pacContainers.forEach((container) => {
        const dropdown = container as HTMLElement;
        
        if (dropdown && dropdown.style.display !== 'none') {
          const isMobile = window.innerWidth <= 768;
          const inputRect = localInputRef.current!.getBoundingClientRect();
          const actualVh = getActualViewportHeight();
          const currentKeyboardHeight = detectKeyboardHeight();
          
          if (isMobile) {
            // 🔥 Chrome/Safari統一のz-index設定
            dropdown.style.zIndex = '99999';
            dropdown.style.position = 'fixed';
            
            // 🔥 ビューポートとキーボードを考慮した位置計算
            const availableHeight = actualVh - currentKeyboardHeight;
            const dropdownMaxHeight = Math.min(120, availableHeight * 0.3); // 最大30%の高さ
            
            // ドロップダウンを入力フィールドの下に配置
            let top = inputRect.bottom;
            
            // 🔥 キーボード表示時の調整
            if (currentKeyboardHeight > 0) {
              const spaceBelow = availableHeight - inputRect.bottom;
              if (spaceBelow < dropdownMaxHeight) {
                // 上に表示
                top = inputRect.top - dropdownMaxHeight;
              }
            }
            
            // 🔥 Chrome/Safari統一の位置設定
            dropdown.style.top = `${Math.max(0, top)}px`;
            dropdown.style.left = `${inputRect.left}px`;
            dropdown.style.width = `${inputRect.width}px`;
            dropdown.style.maxHeight = `${dropdownMaxHeight}px`;
            dropdown.style.overflowY = 'auto';
            dropdown.style.borderRadius = '0.5rem';
            dropdown.style.marginTop = '4px';
            
            // 🔥 Chrome専用のスクロール調整
            const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent);
            if (isChrome && currentKeyboardHeight > 0) {
              setTimeout(() => {
                const scrollTarget = Math.max(0, inputRect.top - 100);
                window.scrollTo({
                  top: scrollTarget,
                  behavior: 'smooth'
                });
              }, 100);
            }
          } else {
            // デスクトップでの標準位置設定
            dropdown.style.position = 'absolute';
            dropdown.style.zIndex = '9999';
            dropdown.style.maxHeight = '200px';
          }
        }
      });
    }, [getActualViewportHeight, detectKeyboardHeight]);

    // 🔥 Google Places ドロップダウンの監視（強化版）
    const observeDropdown = useCallback(() => {
      // 既存のオブザーバーがあれば切断
      if (dropdownObserverRef.current) {
        dropdownObserverRef.current.disconnect();
      }

      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            const pacContainers = document.querySelectorAll('.pac-container');
            
            pacContainers.forEach((container) => {
              const dropdown = container as HTMLElement;
              
              if (dropdown && dropdown.style.display !== 'none') {
                setIsDropdownOpen(true);
                adjustDropdownPosition();
              } else {
                setIsDropdownOpen(false);
              }
            });
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      dropdownObserverRef.current = observer;
    }, [adjustDropdownPosition]);

    // 🔥 入力フィールドフォーカス時の処理（Chrome/Safari統一）
    const handleInputFocus = useCallback(() => {
      const isMobile = window.innerWidth <= 768;
      
      if (isMobile) {
        // キーボード高さを更新
        setTimeout(() => {
          const newKeyboardHeight = detectKeyboardHeight();
          setKeyboardHeight(newKeyboardHeight);
          
          if (localInputRef.current) {
            const inputRect = localInputRef.current.getBoundingClientRect();
            const actualVh = getActualViewportHeight();
            const availableHeight = actualVh - newKeyboardHeight;
            
            // 🔥 Chrome/Safari統一のスクロール処理
            if (inputRect.bottom > availableHeight * 0.6) {
              const targetScrollPosition = window.pageYOffset + inputRect.top - (availableHeight * 0.3);
              
              window.scrollTo({
                top: Math.max(0, targetScrollPosition),
                behavior: 'smooth'
              });
            }
          }
        }, 300); // キーボード表示の遅延を考慮
      }
    }, [detectKeyboardHeight, getActualViewportHeight]);

    // 🔥 ビューポート変更の監視（Chrome/Safari統一）
    useEffect(() => {
      const handleViewportChange = () => {
        const newKeyboardHeight = detectKeyboardHeight();
        setKeyboardHeight(newKeyboardHeight);
        
        if (isDropdownOpen) {
          adjustDropdownPosition();
        }
      };

      // リサイズとスクロールイベントの監視
      window.addEventListener('resize', handleViewportChange);
      window.addEventListener('scroll', adjustDropdownPosition);
      
      // 🔥 iOS Safari専用のビューポート変更検出
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        window.addEventListener('orientationchange', handleViewportChange);
        // visualViewport API対応
        if (window.visualViewport) {
          window.visualViewport.addEventListener('resize', handleViewportChange);
        }
      }

      return () => {
        window.removeEventListener('resize', handleViewportChange);
        window.removeEventListener('scroll', adjustDropdownPosition);
        if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
          window.removeEventListener('orientationchange', handleViewportChange);
          if (window.visualViewport) {
            window.visualViewport.removeEventListener('resize', handleViewportChange);
          }
        }
      };
    }, [isDropdownOpen, adjustDropdownPosition, detectKeyboardHeight]);

    useEffect(() => {
      if (!isMapsApiLoaded || !localInputRef.current || mapsApiLoadError) {
        if (autocompleteRef.current && window.google?.maps?.event?.clearInstanceListeners) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
          autocompleteRef.current = null;
        }
        return;
      }

      if (autocompleteRef.current) {
        if (window.google?.maps?.event?.clearInstanceListeners) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
      }

      const options: google.maps.places.AutocompleteOptions = {
        types: ['establishment'],
        componentRestrictions: { country: 'jp' },
        fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types', 'business_status']
      };

      if (userLocation) {
        const circle = new window.google.maps.Circle({
          center: userLocation,
          radius: 500,
        });
        const bounds = circle.getBounds();
        if (bounds) {
          options.bounds = bounds;
        }
      }

      autocompleteRef.current = new window.google.maps.places.Autocomplete(localInputRef.current, options);
      console.log('FavoriteStoreInput: Autocomplete initialized with input element:', localInputRef.current);

      // ドロップダウン監視を開始
      observeDropdown();

      // 入力フィールドにフォーカスイベントリスナーを追加
      if (localInputRef.current) {
        localInputRef.current.addEventListener('focus', handleInputFocus);
      }

      const listener = autocompleteRef.current!.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        console.log('FavoriteStoreInput place_changed - place:', place);

        if (place && place.place_id && place.name) {
          setInputValue(place.name);
          const storeValue = { id: place.place_id, name: place.name };
          console.log('FavoriteStoreInput place_changed - calling onChange with:', storeValue);
          onChange(storeValue);
        } else {
          const currentInputValue = localInputRef.current?.value || '';
          console.log('FavoriteStoreInput place_changed - no valid place selected or place cleared. Input value:', currentInputValue);
          
          if (currentInputValue && currentInputValue !== (value?.name || '')) {
            onChange(null);
          } else if (!currentInputValue) {
            onChange(null);
          }
        }
        
        setIsDropdownOpen(false);
      });

      return () => {
        // クリーンアップ
        if (autocompleteRef.current && window.google?.maps?.event?.clearInstanceListeners) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
        
        if (dropdownObserverRef.current) {
          dropdownObserverRef.current.disconnect();
        }
        
        if (localInputRef.current) {
          localInputRef.current.removeEventListener('focus', handleInputFocus);
        }
      };
    }, [isMapsApiLoaded, mapsApiLoadError, userLocation, onChange, value, observeDropdown, handleInputFocus]);

    useEffect(() => {
      setInputValue(value?.name || '');
    }, [value]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(event.target.value);
      
      if (!event.target.value) {
        console.log('FavoriteStoreInput handleInputChange - input cleared, calling onChange(null)');
        onChange(null);
        setIsDropdownOpen(false);
      }
    };

    const handleClear = () => {
      setInputValue('');
      if (localInputRef.current) {
        localInputRef.current.value = '';
      }
      console.log('FavoriteStoreInput handleClear - calling onChange(null)');
      onChange(null);
      setIsDropdownOpen(false);
    };
    
    if (mapsApiLoadError) {
      return <p className="text-xs text-destructive">地図機能の読み込みに失敗しました: {mapsApiLoadError.message}</p>;
    }

    return (
      <div className="space-y-1">
        <div className="relative">
          <Input
            ref={localInputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            className={`pr-10 ${className || ''}`}
            style={{ 
              fontSize: '16px', 
              ...style,
              // 🔥 Chrome/Safari統一のフォーカススタイル
              outline: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
            disabled={disabled || !isMapsApiLoaded}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          {inputValue && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {!isMapsApiLoaded && !mapsApiLoadError && <p className="text-xs text-muted-foreground">店舗検索を読み込み中...</p>}
        {isMapsApiLoaded && (
          <div className="flex items-center justify-between mt-1">
              {locationError && <p className="text-xs text-destructive flex-grow">{locationError}</p>}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={getCurrentLocation}
                disabled={disabled || !isMapsApiLoaded}
                className="text-xs py-1 px-2 h-auto"
              >
                <MapPin className="h-3 w-3 mr-1" />
                {userLocation ? "現在地で再検索" : "現在地から検索精度を上げる"}
              </Button>
          </div>
        )}
        {userLocation && isMapsApiLoaded && <p className="text-xs text-muted-foreground mt-1">現在地情報で検索中</p>}
        
        {/* 🔥 デバッグ情報（開発時のみ表示） */}
        {process.env.NODE_ENV === 'development' && keyboardHeight > 0 && (
          <p className="text-xs text-muted-foreground">
            キーボード高さ: {keyboardHeight}px | ビューポート: {getActualViewportHeight()}px
          </p>
        )}
      </div>
    );
  }
);

FavoriteStoreInput.displayName = 'FavoriteStoreInput';

export default FavoriteStoreInput;