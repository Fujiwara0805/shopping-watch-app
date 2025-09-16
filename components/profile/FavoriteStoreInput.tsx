"use client";

import React, { useEffect, useRef, useState, useImperativeHandle } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
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
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // forwardRefで渡されたrefとローカルのrefをマージ
    useImperativeHandle(ref, () => localInputRef.current as HTMLInputElement);

    // 🔥 ローカルストレージから保存された位置情報を取得
    const loadSavedLocation = () => {
      try {
        const savedLocationStr = localStorage.getItem('userLocation');
        if (savedLocationStr) {
          const savedLocation = JSON.parse(savedLocationStr);
          
          // 有効期限をチェック
          if (savedLocation.expiresAt && Date.now() < savedLocation.expiresAt) {
            console.log('FavoriteStoreInput: 保存された位置情報を使用します:', savedLocation);
            if (window.google && window.google.maps) {
              setUserLocation(
                new google.maps.LatLng(
                  savedLocation.latitude,
                  savedLocation.longitude
                )
              );
            }
            return true;
          } else {
            console.log('FavoriteStoreInput: 保存された位置情報の有効期限が切れています');
            localStorage.removeItem('userLocation');
          }
        }
      } catch (error) {
        console.warn('FavoriteStoreInput: 保存された位置情報の読み込みに失敗しました:', error);
        localStorage.removeItem('userLocation');
      }
      return false;
    };

    // Google Places ドロップダウンの監視と位置調整
    const observeDropdown = () => {
      // 既存のオブザーバーがあれば切断
      if (dropdownObserverRef.current) {
        dropdownObserverRef.current.disconnect();
      }

      // Google Places ドロップダウンを監視
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            // Google Places のドロップダウン要素を検索
            const pacContainers = document.querySelectorAll('.pac-container');
            
            pacContainers.forEach((container) => {
              const dropdown = container as HTMLElement;
              
              if (dropdown && dropdown.style.display !== 'none') {
                setIsDropdownOpen(true);
                
                // モバイルでの位置調整
                const isMobile = window.innerWidth <= 768;
                if (isMobile) {
                  // 高いz-indexを設定
                  dropdown.style.zIndex = '99999';
                  dropdown.style.position = 'fixed';
                  
                  // 入力フィールドの位置を取得
                  if (localInputRef.current) {
                    const inputRect = localInputRef.current.getBoundingClientRect();
                    const viewportHeight = window.innerHeight;
                    const dropdownHeight = Math.min(dropdown.offsetHeight || 32, 32);
                    
                    // ドロップダウンを入力フィールドの下に配置
                    let top = inputRect.bottom + window.scrollY;
                    
                    // 画面下部に収まらない場合は上に表示
                    if (inputRect.bottom + dropdownHeight > viewportHeight) {
                      top = inputRect.top + window.scrollY - dropdownHeight;
                    }
                    
                    dropdown.style.top = `${top}px`;
                    dropdown.style.left = `${inputRect.left + window.scrollX}px`;
                    dropdown.style.width = `${inputRect.width}px`;
                    dropdown.style.maxHeight = '32px';
                    dropdown.style.overflowY = 'auto';
                    
                    // 自動スクロール処理
                    setTimeout(() => {
                      if (inputRect.bottom + dropdownHeight > viewportHeight) {
                        const scrollAmount = (inputRect.bottom + dropdownHeight) - viewportHeight + 20;
                        window.scrollBy({
                          top: scrollAmount,
                          behavior: 'smooth'
                        });
                      }
                    }, 100);
                  }
                }
              } else {
                setIsDropdownOpen(false);
              }
            });
          }
        });
      });

      // bodyの変更を監視
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      dropdownObserverRef.current = observer;
    };

    // 入力フィールドフォーカス時の処理
    const handleInputFocus = () => {
      const isMobile = window.innerWidth <= 768;
      
      if (isMobile) {
        // モバイルでのフォーカス時に入力フィールドを適切な位置にスクロール
        setTimeout(() => {
          if (localInputRef.current) {
            const inputRect = localInputRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            
            // 入力フィールドが画面の下半分にある場合、上部1/3の位置にスクロール
            if (inputRect.top > viewportHeight / 2) {
              const targetScrollPosition = window.pageYOffset + inputRect.top - (viewportHeight / 3);
              
              window.scrollTo({
                top: targetScrollPosition,
                behavior: 'smooth'
              });
            }
          }
        }, 300); // キーボード表示の遅延を考慮
      }
    };

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

      // 🔥 自動的に保存された位置情報を使用
      if (!userLocation) {
        loadSavedLocation();
      }

      // 🔥 位置情報が利用可能な場合は検索範囲を制限
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
    }, [isMapsApiLoaded, mapsApiLoadError, userLocation, onChange, value]);

    useEffect(() => {
      setInputValue(value?.name || '');
    }, [value]);

    // ページのスクロールやリサイズ時にドロップダウン位置を再調整
    useEffect(() => {
      const handleScrollOrResize = () => {
        if (isDropdownOpen) {
          const pacContainers = document.querySelectorAll('.pac-container');
          pacContainers.forEach((container) => {
            const dropdown = container as HTMLElement;
            if (dropdown && dropdown.style.display !== 'none' && localInputRef.current) {
              const inputRect = localInputRef.current.getBoundingClientRect();
              dropdown.style.top = `${inputRect.bottom + window.scrollY}px`;
              dropdown.style.left = `${inputRect.left + window.scrollX}px`;
              dropdown.style.width = `${inputRect.width}px`;
            }
          });
        }
      };

      window.addEventListener('scroll', handleScrollOrResize);
      window.addEventListener('resize', handleScrollOrResize);

      return () => {
        window.removeEventListener('scroll', handleScrollOrResize);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }, [isDropdownOpen]);

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
            style={{ fontSize: '16px', ...style }}
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
        {/* 🔥 位置情報関連のボタンとメッセージを削除 */}
      </div>
    );
  }
);

FavoriteStoreInput.displayName = 'FavoriteStoreInput';

export default FavoriteStoreInput;