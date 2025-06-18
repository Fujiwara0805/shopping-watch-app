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
    const originalViewportRef = useRef<string>('');

    // forwardRefで渡されたrefとローカルのrefをマージ
    useImperativeHandle(ref, () => localInputRef.current as HTMLInputElement);

    // 🔥 ズームアップ完全防止：viewport meta tagの動的制御
    const preventZoom = useCallback(() => {
      const viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
      if (viewport) {
        originalViewportRef.current = viewport.content;
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
      }
    }, []);

    const restoreZoom = useCallback(() => {
      const viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
      if (viewport && originalViewportRef.current) {
        viewport.content = originalViewportRef.current;
      }
    }, []);

    // 🔥 キーボード表示検出の改善
    const detectKeyboardHeight = useCallback(() => {
      const isMobile = window.innerWidth <= 768;
      if (!isMobile) return 0;

      const actualVh = window.innerHeight;
      const visualVh = window.visualViewport?.height || actualVh;
      const heightDiff = actualVh - visualVh;
      
      // キーボードが表示されている場合（高さの差が150px以上に変更）
      return heightDiff > 150 ? heightDiff : 0;
    }, []);

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

    // 🔥 Google Places ドロップダウンの位置調整（完全修正版）
    const adjustDropdownPosition = useCallback(() => {
      if (!localInputRef.current) return;

      const pacContainers = document.querySelectorAll('.pac-container');
      
      pacContainers.forEach((container) => {
        const dropdown = container as HTMLElement;
        
        if (dropdown && dropdown.style.display !== 'none') {
          const isMobile = window.innerWidth <= 768;
          const inputRect = localInputRef.current!.getBoundingClientRect();
          const currentKeyboardHeight = detectKeyboardHeight();
          
          if (isMobile) {
            // 🔥 ドロップダウンのz-indexを固定ナビより低く設定
            dropdown.style.zIndex = '9998';
            dropdown.style.position = 'fixed';
            
            // 🔥 利用可能な高さを正確に計算
            const windowHeight = window.innerHeight;
            const navHeight = 64; // 固定ナビゲーションの高さ
            const headerHeight = 56; // ヘッダーの高さ
            const availableHeight = windowHeight - currentKeyboardHeight - navHeight - headerHeight;
            
            // 🔥 ドロップダウンの最適なサイズを計算
            const maxDropdownHeight = Math.min(160, Math.max(80, availableHeight * 0.3));
            
            // 🔥 入力フィールドの下に配置、必要に応じて上に配置
            let top = inputRect.bottom + 4;
            const spaceBelow = windowHeight - currentKeyboardHeight - navHeight - inputRect.bottom;
            const spaceAbove = inputRect.top - headerHeight;
            
            // 下に十分なスペースがない場合は上に配置
            if (spaceBelow < maxDropdownHeight && spaceAbove > maxDropdownHeight) {
              top = inputRect.top - maxDropdownHeight - 4;
            }
            
            // 🔥 画面境界内に収める
            top = Math.max(headerHeight + 4, Math.min(top, windowHeight - navHeight - maxDropdownHeight - 4));
            
            // 🔥 位置とサイズを設定
            dropdown.style.top = `${top}px`;
            dropdown.style.left = `${Math.max(8, inputRect.left)}px`;
            dropdown.style.width = `${Math.min(inputRect.width, window.innerWidth - 16)}px`;
            dropdown.style.maxHeight = `${maxDropdownHeight}px`;
            dropdown.style.overflowY = 'auto';
            dropdown.style.borderRadius = '0.5rem';
            dropdown.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            dropdown.style.border = '1px solid #e5e7eb';
            dropdown.style.backgroundColor = '#ffffff';
            
            // 🔥 スクロール防止のための追加設定
            dropdown.style.transform = 'translateZ(0)';
            dropdown.style.backfaceVisibility = 'hidden';
            dropdown.style.willChange = 'transform';
            
          } else {
            // デスクトップでの標準位置設定
            dropdown.style.position = 'absolute';
            dropdown.style.zIndex = '9998';
            dropdown.style.maxHeight = '200px';
          }
        }
      });
    }, [detectKeyboardHeight]);

    // 🔥 Google Places ドロップダウンの監視（改善版）
    const observeDropdown = useCallback(() => {
      if (dropdownObserverRef.current) {
        dropdownObserverRef.current.disconnect();
      }

      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            const pacContainers = document.querySelectorAll('.pac-container');
            let hasVisibleDropdown = false;
            
            pacContainers.forEach((container) => {
              const dropdown = container as HTMLElement;
              
              if (dropdown && dropdown.style.display !== 'none' && dropdown.children.length > 0) {
                hasVisibleDropdown = true;
                // 🔥 現在のスクロール位置を保持
                const currentScrollY = window.scrollY;
                adjustDropdownPosition();
                // 不要なスクロールを防止
                if (Math.abs(window.scrollY - currentScrollY) > 5) {
                  window.scrollTo({ top: currentScrollY, behavior: 'instant' });
                }
              }
            });
            
            setIsDropdownOpen(hasVisibleDropdown);
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style']
      });

      dropdownObserverRef.current = observer;
    }, [adjustDropdownPosition]);

    // 🔥 入力フィールドフォーカス時の処理（完全ズームアップ防止版）
    const handleInputFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      const isMobile = window.innerWidth <= 768;
      
      if (isMobile) {
        // 🔥 ズームアップを完全に防止
        preventZoom();
        
        // 🔥 現在のスクロール位置を保存
        const currentScrollY = window.scrollY;
        
        // 🔥 入力フィールドが見える位置にスクロール（最小限）
        setTimeout(() => {
          const newKeyboardHeight = detectKeyboardHeight();
          setKeyboardHeight(newKeyboardHeight);
          
          if (localInputRef.current) {
            const inputRect = localInputRef.current.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            const navHeight = 64;
            const headerHeight = 56;
            const availableHeight = windowHeight - newKeyboardHeight - navHeight - headerHeight;
            
            // 入力フィールドが見える範囲にあるかチェック
            const inputTop = inputRect.top;
            const inputBottom = inputRect.bottom;
            const visibleAreaTop = headerHeight + 8;
            const visibleAreaBottom = availableHeight - 8;
            
            // 必要最小限のスクロールのみ実行
            if (inputBottom > visibleAreaBottom || inputTop < visibleAreaTop) {
              const targetScrollPosition = currentScrollY + inputTop - (availableHeight * 0.25);
              
              window.scrollTo({
                top: Math.max(0, targetScrollPosition),
                behavior: 'smooth'
              });
            }
          }
        }, 100); // キーボード表示の遅延を短縮
      }
    }, [preventZoom, detectKeyboardHeight]);

    // 🔥 入力フィールドのblur時の処理（ズームアップ防止解除）
    const handleInputBlur = useCallback(() => {
      // 🔥 少し遅延してからズーム制御を解除（ドロップダウン選択を考慮）
      setTimeout(() => {
        restoreZoom();
      }, 300);
    }, [restoreZoom]);

    // 🔥 ビューポート変更の監視（改善版）
    useEffect(() => {
      const handleViewportChange = () => {
        const newKeyboardHeight = detectKeyboardHeight();
        setKeyboardHeight(newKeyboardHeight);
        
        if (isDropdownOpen) {
          // 🔥 スクロール位置を保持しながら位置調整
          const currentScrollY = window.scrollY;
          requestAnimationFrame(() => {
            adjustDropdownPosition();
            // 不要なスクロールを防止
            if (Math.abs(window.scrollY - currentScrollY) > 10) {
              window.scrollTo({ top: currentScrollY, behavior: 'instant' });
            }
          });
        }
      };

      // イベントリスナーを追加
      window.addEventListener('resize', handleViewportChange, { passive: true });
      window.addEventListener('scroll', adjustDropdownPosition, { passive: true });
      
      // iOS Safari専用のビューポート変更検出
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        window.addEventListener('orientationchange', handleViewportChange);
        if (window.visualViewport) {
          window.visualViewport.addEventListener('resize', handleViewportChange, { passive: true });
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

      // ドロップダウン監視を開始
      observeDropdown();

      const listener = autocompleteRef.current!.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();

        if (place && place.place_id && place.name) {
          setInputValue(place.name);
          const storeValue = { id: place.place_id, name: place.name };
          onChange(storeValue);
        } else {
          const currentInputValue = localInputRef.current?.value || '';
          
          if (currentInputValue && currentInputValue !== (value?.name || '')) {
            onChange(null);
          } else if (!currentInputValue) {
            onChange(null);
          }
        }
        
        setIsDropdownOpen(false);
        // 🔥 選択後にズーム制御を解除
        restoreZoom();
      });

      return () => {
        if (autocompleteRef.current && window.google?.maps?.event?.clearInstanceListeners) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
        
        if (dropdownObserverRef.current) {
          dropdownObserverRef.current.disconnect();
        }
        
        // 🔥 クリーンアップ時にズーム制御を解除
        restoreZoom();
      };
    }, [isMapsApiLoaded, mapsApiLoadError, userLocation, onChange, value, observeDropdown, restoreZoom]);

    useEffect(() => {
      setInputValue(value?.name || '');
    }, [value]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(event.target.value);
      
      if (!event.target.value) {
        onChange(null);
        setIsDropdownOpen(false);
      }
    };

    const handleClear = () => {
      setInputValue('');
      if (localInputRef.current) {
        localInputRef.current.value = '';
      }
      onChange(null);
      setIsDropdownOpen(false);
      // 🔥 クリア時にズーム制御を解除
      restoreZoom();
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
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            className={`pr-10 ${className || ''}`}
            style={{ 
              // 🔥 ズームアップ防止：16px以上のフォントサイズを強制
              fontSize: '16px !important',
              lineHeight: '1.5',
              // 🔥 追加のズームアップ防止設定
              WebkitTextSizeAdjust: '100%',
              textSizeAdjust: '100%',
              WebkitUserSelect: 'text',
              userSelect: 'text',
              ...style,
              // 🔥 フォーカススタイルの統一
              outline: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
            disabled={disabled || !isMapsApiLoaded}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            // 🔥 ズームアップ防止のための追加属性
            inputMode="text"
            data-testid="favorite-store-input"
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
            キーボード高さ: {keyboardHeight}px | ドロップダウン表示: {isDropdownOpen ? 'あり' : 'なし'}
          </p>
        )}
      </div>
    );
  }
);

FavoriteStoreInput.displayName = 'FavoriteStoreInput';

export default FavoriteStoreInput;
