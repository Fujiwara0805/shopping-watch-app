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

    // 🔥 固定ナビゲーション対応のビューポート高さ計算
    const getActualViewportHeight = useCallback(() => {
      // CSS変数から実際のビューポート高さを取得
      const vhValue = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vh')) || 1;
      const actualVh = vhValue * 100;
      
      // 🔥 固定ナビゲーションの高さを考慮（64px + セーフエリア）
      const navHeight = 64 + (window.innerHeight - actualVh);
      return actualVh - navHeight;
    }, []);

    // 🔥 キーボード表示検出（固定ナビ対応強化）
    const detectKeyboardHeight = useCallback(() => {
      const isMobile = window.innerWidth <= 768;
      if (!isMobile) return 0;

      const actualVh = window.innerHeight;
      const visualVh = window.visualViewport?.height || actualVh;
      const heightDiff = actualVh - visualVh;
      
      // キーボードが表示されている場合（高さの差が100px以上）
      return heightDiff > 100 ? heightDiff : 0;
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

    // 🔥 Google Places ドロップダウンの位置調整（固定ナビ対応版）
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
            // 🔥 固定ナビゲーションより低いz-indexに設定
            dropdown.style.zIndex = '9998'; // main-nav の 9999 より低く
            dropdown.style.position = 'fixed';
            
            // 🔥 利用可能な高さを計算（キーボード + 固定ナビを考慮）
            const windowHeight = window.innerHeight;
            const navHeight = 64; // 固定ナビゲーションの高さ
            const availableHeight = windowHeight - currentKeyboardHeight - navHeight;
            const dropdownMaxHeight = Math.min(120, availableHeight * 0.25); // 最大25%の高さ
            
            // ドロップダウンを入力フィールドの下に配置
            let top = inputRect.bottom;
            
            // 🔥 固定ナビゲーションとの衝突を回避
            const maxTop = windowHeight - navHeight - dropdownMaxHeight - 10; // 10pxのマージン
            if (top + dropdownMaxHeight > maxTop) {
              // 上に表示
              top = Math.max(10, inputRect.top - dropdownMaxHeight);
            }
            
            // 🔥 位置設定（固定ナビとの干渉防止）
            dropdown.style.top = `${Math.max(10, Math.min(top, maxTop))}px`;
            dropdown.style.left = `${inputRect.left}px`;
            dropdown.style.width = `${inputRect.width}px`;
            dropdown.style.maxHeight = `${dropdownMaxHeight}px`;
            dropdown.style.overflowY = 'auto';
            dropdown.style.borderRadius = '0.5rem';
            dropdown.style.marginTop = '4px';
            dropdown.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
            
            // 🔥 画面ずれ防止：スクロールを無効化
            const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent);
            if (isChrome && currentKeyboardHeight > 0) {
              // スクロールせずに位置調整のみ
              dropdown.style.transform = 'translateZ(0)';
              dropdown.style.backfaceVisibility = 'hidden';
            }
          } else {
            // デスクトップでの標準位置設定
            dropdown.style.position = 'absolute';
            dropdown.style.zIndex = '9998';
            dropdown.style.maxHeight = '200px';
          }
        }
      });
    }, [detectKeyboardHeight]);

    // 🔥 Google Places ドロップダウンの監視（固定ナビ対応版）
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
                // 🔥 画面ずれ防止：スクロール位置を固定
                const currentScrollY = window.scrollY;
                adjustDropdownPosition();
                // スクロール位置が変わった場合は元に戻す
                if (window.scrollY !== currentScrollY) {
                  window.scrollTo(0, currentScrollY);
                }
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

    // 🔥 入力フィールドフォーカス時の処理（ズームアップ防止版）
    const handleInputFocus = useCallback(() => {
      const isMobile = window.innerWidth <= 768;
      
      if (isMobile) {
        // 🔥 現在のスクロール位置を保存
        const currentScrollY = window.scrollY;
        
        // 🔥 ズームアップを防止するため、viewport meta tagを一時的に変更
        const viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
        const originalContent = viewportMeta?.content || '';
        
        if (viewportMeta) {
          viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        }
        
        // キーボード高さを更新
        setTimeout(() => {
          const newKeyboardHeight = detectKeyboardHeight();
          setKeyboardHeight(newKeyboardHeight);
          
          if (localInputRef.current) {
            const inputRect = localInputRef.current.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            const navHeight = 64; // 固定ナビゲーションの高さ
            const availableHeight = windowHeight - newKeyboardHeight - navHeight;
            
            // 🔥 入力フィールドが見える範囲にあるかチェック
            const inputBottom = inputRect.bottom;
            const visibleAreaTop = 60; // ヘッダー分
            const visibleAreaBottom = availableHeight;
            
            // 必要最小限のスクロールのみ実行
            if (inputBottom > visibleAreaBottom || inputRect.top < visibleAreaTop) {
              const targetScrollPosition = window.pageYOffset + inputRect.top - (availableHeight * 0.3);
              
              window.scrollTo({
                top: Math.max(0, targetScrollPosition),
                behavior: 'smooth'
              });
            } else {
              // スクロール位置を元に戻す
              window.scrollTo(0, currentScrollY);
            }
          }
          
          // 🔥 一定時間後にviewport meta tagを元に戻す
          setTimeout(() => {
            if (viewportMeta && originalContent) {
              viewportMeta.content = originalContent;
            }
          }, 1000);
        }, 300); // キーボード表示の遅延を考慮
      }
    }, [detectKeyboardHeight]);

    // 🔥 入力フィールドのblur時の処理（ズームアップ防止用）
    const handleInputBlur = useCallback(() => {
      // 🔥 フォーカスが外れた時にviewport meta tagを確実に元に戻す
      const viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
      if (viewportMeta) {
        viewportMeta.content = 'width=device-width, initial-scale=1.0';
      }
    }, []);

    // 🔥 ビューポート変更の監視（画面ずれ防止版）
    useEffect(() => {
      const handleViewportChange = () => {
        const newKeyboardHeight = detectKeyboardHeight();
        setKeyboardHeight(newKeyboardHeight);
        
        if (isDropdownOpen) {
          // 🔥 スクロール位置を保持しながら位置調整
          const currentScrollY = window.scrollY;
          adjustDropdownPosition();
          // 不要なスクロールを防止
          setTimeout(() => {
            if (Math.abs(window.scrollY - currentScrollY) > 10) {
              window.scrollTo(0, currentScrollY);
            }
          }, 50);
        }
      };

      // リサイズとスクロールイベントの監視
      window.addEventListener('resize', handleViewportChange);
      window.addEventListener('scroll', adjustDropdownPosition, { passive: true });
      
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

      // 🔥 入力フィールドにフォーカス・ブラーイベントリスナーを追加
      if (localInputRef.current) {
        localInputRef.current.addEventListener('focus', handleInputFocus);
        localInputRef.current.addEventListener('blur', handleInputBlur);
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
          localInputRef.current.removeEventListener('blur', handleInputBlur);
        }
      };
    }, [isMapsApiLoaded, mapsApiLoadError, userLocation, onChange, value, observeDropdown, handleInputFocus, handleInputBlur]);

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
              // 🔥 ズームアップ防止：16px以上のフォントサイズを強制
              fontSize: '16px !important',
              // 🔥 追加のズームアップ防止設定
              WebkitTextSizeAdjust: '100%',
              textSizeAdjust: '100%',
              ...style,
              // 🔥 Chrome/Safari統一のフォーカススタイル
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
            キーボード高さ: {keyboardHeight}px | 利用可能高さ: {getActualViewportHeight()}px
          </p>
        )}
      </div>
    );
  }
);

FavoriteStoreInput.displayName = 'FavoriteStoreInput';

export default FavoriteStoreInput;

