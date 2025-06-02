"use client";

import React, { useEffect, useRef, useState, useImperativeHandle } from 'react';
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
  value?: { id?: string | null; name?: string | null };
  onChange: (value: { id: string; name: string } | null) => void;
  placeholder?: string;
  disabled?: boolean;
  // name?: string; // react-hook-formのControllerから渡されるnameプロパティ (オプション)
}

const FavoriteStoreInput = React.forwardRef<HTMLInputElement, FavoriteStoreInputProps>(
  ({ value, onChange, placeholder = "店舗名で検索", disabled }, ref) => {
    const { isLoaded: isMapsApiLoaded, loadError: mapsApiLoadError } = useGoogleMapsApi();
    const localInputRef = useRef<HTMLInputElement>(null); // ローカルのref
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const [inputValue, setInputValue] = useState(value?.name || '');
    const [userLocation, setUserLocation] = useState<google.maps.LatLng | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    // forwardRefで渡されたrefとローカルのrefをマージ
    useImperativeHandle(ref, () => localInputRef.current as HTMLInputElement);

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

    useEffect(() => {
      // isMapsApiLoadedがfalse、localInputRef.currentがnull、またはmapsApiLoadErrorがある場合、
      // 既存のAutocompleteリスナーをクリアして早期リターン
      if (!isMapsApiLoaded || !localInputRef.current || mapsApiLoadError) {
        // google.maps.event と clearInstanceListeners メソッドが利用可能か確認
        if (autocompleteRef.current && window.google?.maps?.event?.clearInstanceListeners) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
          autocompleteRef.current = null; // 参照もクリア
        }
        return;
      }

      // Autocompleteがすでに初期化されている場合、既存のリスナーをクリア
      // （再初期化前に古いリスナーを確実に解除するため）
      if (autocompleteRef.current) {
        // google.maps.event と clearInstanceListeners メソッドが利用可能か確認
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


      const listener = autocompleteRef.current!.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        console.log('FavoriteStoreInput place_changed - place:', place);

        if (place && place.place_id && place.name) {
          setInputValue(place.name); // 表示名を更新
          const storeValue = { id: place.place_id, name: place.name };
          console.log('FavoriteStoreInput place_changed - calling onChange with:', storeValue);
          onChange(storeValue); // react-hook-form に値を渡す
        } else {
          const currentInputValue = localInputRef.current?.value || '';
          console.log('FavoriteStoreInput place_changed - no valid place selected or place cleared. Input value:', currentInputValue);
          // ユーザーが手入力で候補にない値を入力した場合や、選択後にクリアした場合など
          // onChange(null); // または、入力値に基づいて onChange({id: '', name: currentInputValue}) を呼ぶか選択
          if (currentInputValue && currentInputValue !== (value?.name || '')) {
             // 手入力されたが、Googleの候補にない場合。IDなしで名前だけを渡すか、nullにするか検討。
             // 今回は、候補から選ばなかった場合はクリアする挙動に近づけるため null にする
             // onChange({ id: '', name: currentInputValue });
             onChange(null);
          } else if (!currentInputValue) {
             onChange(null); //完全にクリアされた場合
          }
        }
      });

      return () => {
        // コンポーネントのアンマウント時、または依存配列が変更されエフェクトが再実行される際のクリーンアップ
        // google.maps.event と clearInstanceListeners メソッドが利用可能か確認
        if (autocompleteRef.current && window.google?.maps?.event?.clearInstanceListeners) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
      };
    }, [isMapsApiLoaded, mapsApiLoadError, userLocation, onChange, value]); // valueも依存配列に追加

    useEffect(() => {
      // 外部からvalueプロパティが変更された場合（例:フォームリセット時など）にinputValueを更新
      setInputValue(value?.name || '');
    }, [value]); // valueオブジェクト全体を監視

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(event.target.value);
      // ユーザーが手入力している最中は、まだGoogle Placesからの確定情報ではないので、
      // ここでonChangeを呼ぶと不完全な情報でフォームが更新される。
      // Autocompleteの'place_changed'で処理するのが基本。
      // もし手入力のみで確定させたい場合は、別途確定ロジックが必要。
      // 今回は、'place_changed'に任せる。もし入力値がクリアされたら、それはonChange(null)でハンドルされるべき。
      if (!event.target.value) {
          console.log('FavoriteStoreInput handleInputChange - input cleared, calling onChange(null)');
          onChange(null);
      }
    };

    const handleClear = () => {
      setInputValue('');
      if (localInputRef.current) {
        localInputRef.current.value = ''; // DOM要素の値をクリア
      }
      console.log('FavoriteStoreInput handleClear - calling onChange(null)');
      onChange(null);
    };
    
    if (mapsApiLoadError) {
      return <p className="text-xs text-destructive">地図機能の読み込みに失敗しました: {mapsApiLoadError.message}</p>;
    }

    return (
      <div className="space-y-1">
        <div className="relative">
          <Input
            ref={localInputRef} // ローカルのrefをInputに渡す
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="pr-10"
            disabled={disabled || !isMapsApiLoaded}
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
      </div>
    );
  }
);

FavoriteStoreInput.displayName = 'FavoriteStoreInput';

export default FavoriteStoreInput;
