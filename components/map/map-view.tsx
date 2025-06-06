"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { Store } from '@/types/store';
import { Button } from '@/components/ui/button';
import { MapPin, AlertTriangle, List, X, Heart, Navigation } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { X as CloseIcon } from 'lucide-react';
import { useGoogleMapsApi } from '@/components/providers/GoogleMapsApiProvider';
import { MapSearchControl } from './MapSearchControl';
import { motion } from 'framer-motion';

declare global {
  interface Window {
    google: any;
  }
}

export function MapView() {
  console.log("MapView: Component rendering START");
  const { isLoaded: googleMapsLoaded, loadError: googleMapsLoadError } = useGoogleMapsApi();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const initAttemptedRef = useRef<boolean>(false);

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const { 
    latitude, 
    longitude, 
    loading: locationLoading, 
    error: locationError, 
    permissionState, 
    requestLocation 
  } = useGeolocation();

  const [mapInitialized, setMapInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [googleApiReady, setGoogleApiReady] = useState(false);

  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [selectedPlaceMarker, setSelectedPlaceMarker] = useState<google.maps.Marker | null>(null);
  const [distanceToSelectedPlace, setDistanceToSelectedPlace] = useState<string | null>(null);
  const [userLocationMarker, setUserLocationMarker] = useState<google.maps.Marker | null>(null);

  // Google Maps API の読み込み状況をより確実に検出
  useEffect(() => {
    const checkGoogleMapsApi = () => {
      const isGoogleReady = !!(window.google && window.google.maps && window.google.maps.Map);
      setGoogleApiReady(isGoogleReady);
      
      if (isGoogleReady) {
        console.log("MapView: Google Maps API confirmed ready");
      }
      
      return isGoogleReady;
    };

    // 初回チェック
    if (checkGoogleMapsApi()) {
      return;
    }

    // カスタムイベントリスナー（layout.tsxから送信）
    const handleApiLoaded = () => {
      console.log("MapView: Received Google Maps API loaded event");
      setTimeout(checkGoogleMapsApi, 100);
    };

    // 定期的なチェック（フォールバック）
    const interval = setInterval(() => {
      if (checkGoogleMapsApi()) {
        clearInterval(interval);
      }
    }, 500);

    window.addEventListener('google-maps-api-loaded', handleApiLoaded);

    return () => {
      clearInterval(interval);
      window.removeEventListener('google-maps-api-loaded', handleApiLoaded);
    };
  }, []);

  // スマートフォン検出とより確実な高さ計算
  const calculateOptimalHeight = useCallback((): number => {
    if (typeof window === 'undefined') return 400;
    
    const isMobile = window.innerWidth <= 768;
    const windowHeight = window.innerHeight;
    
    if (isMobile) {
      // スマートフォンの場合：保守的で確実なアプローチ
      const visualViewportHeight = window.visualViewport?.height || windowHeight;
      const usableHeight = Math.min(windowHeight, visualViewportHeight);
      
      // ヘッダー56px + ナビゲーション64px + 安全マージン20px = 140px
      const calculatedHeight = Math.max(300, usableHeight - 140);
      
      console.log('MapView: Height calculation:', {
        windowHeight,
        visualViewportHeight, 
        usableHeight,
        calculatedHeight,
        isMobile: true
      });
      
      return calculatedHeight;
    } else {
      // デスクトップの場合：従来通り
      return Math.max(400, windowHeight - 120);
    }
  }, []);

  // 高さ設定の初期化とリサイズ対応
  useEffect(() => {
    const updateHeight = () => {
      const newHeight = calculateOptimalHeight();
      setContainerHeight(newHeight);
    };

    // 即座に初期化
    updateHeight();

    // 遅延初期化（スマートフォンの安定性向上）
    const initialTimeouts = [
      setTimeout(updateHeight, 100),
      setTimeout(updateHeight, 300),
      setTimeout(updateHeight, 1000),
    ];

    // リサイズイベント
    const handleResize = () => {
      setTimeout(updateHeight, 100);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize, { passive: true });
    }

    return () => {
      initialTimeouts.forEach(clearTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, [calculateOptimalHeight]);

  // エラー・警告用のメッセージカード
  const MessageCard = ({ icon: Icon, title, message, children, variant = 'default' }: {
    icon?: React.ElementType;
    title: string;
    message: string | React.ReactNode;
    children?: React.ReactNode;
    variant?: 'default' | 'destructive' | 'warning';
  }) => {
    let iconColorClass = "text-primary";
    if (variant === 'destructive') iconColorClass = "text-destructive";
    if (variant === 'warning') iconColorClass = "text-amber-500";

    const cardHeight = containerHeight > 0 ? containerHeight : 400;

    return (
      <div 
        className="relative w-full flex items-center justify-center p-4 bg-background"
        style={{ height: cardHeight }}
      >
        <div className="bg-card p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md text-center border">
          {Icon && <Icon className={`h-16 w-16 ${iconColorClass} mb-6 mx-auto`} />}
          <h2 className={`text-xl sm:text-2xl font-semibold mb-3 ${variant === 'destructive' ? 'text-destructive' : 'text-foreground'}`}>
            {title}
          </h2>
          <div className="text-sm sm:text-base text-muted-foreground mb-6 leading-relaxed">
            {message}
          </div>
          {children}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
              Debug: Height={containerHeight}px, GoogleAPI={googleApiReady ? 'Ready' : 'Loading'}, Provider={googleMapsLoaded ? 'OK' : 'Loading'}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 位置情報の要求
  useEffect(() => {
    if (permissionState === 'granted' && !latitude && !longitude && !locationLoading) {
      console.log("MapView: Requesting location");
      requestLocation();
    }
  }, [permissionState, latitude, longitude, locationLoading, requestLocation]);

  // Google Maps の初期化（より堅牢なロジック）
  useEffect(() => {
    if (
      googleMapsLoaded && 
      googleApiReady &&
      mapContainerRef.current && 
      !mapInstanceRef.current && 
      !googleMapsLoadError && 
      latitude && 
      longitude && 
      containerHeight >= 300 && 
      !initAttemptedRef.current
    ) {
      console.log("MapView: Attempting map initialization", {
        containerHeight,
        location: [latitude, longitude],
        googleApiReady,
        windowGoogle: !!window.google?.maps
      });

      initAttemptedRef.current = true;
      setInitializationError(null);

      // Google Maps API の可用性を再度チェック
      if (!window.google?.maps?.Map) {
        console.error("MapView: Google Maps API not fully available");
        setInitializationError("地図APIの準備ができていません。ページを再読み込みしてください。");
        initAttemptedRef.current = false;
        return;
      }

      try {
        const container = mapContainerRef.current;
        
        // コンテナの明示的スタイル設定
        container.style.width = '100%';
        container.style.height = `${containerHeight}px`;
        container.style.position = 'relative';
        container.style.backgroundColor = '#f5f5f5';

        const center = { lat: latitude, lng: longitude };

        const mapOptions: google.maps.MapOptions = {
          center,
          zoom: 15,
          clickableIcons: true,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          backgroundColor: '#f5f5f5',
        };

        console.log("MapView: Creating Google Map with options:", mapOptions);
        const newMap = new window.google.maps.Map(container, mapOptions);
        mapInstanceRef.current = newMap;

        // 初期化完了の待機
        const initTimeout = setTimeout(() => {
          console.error("MapView: Map initialization timeout");
          setInitializationError("地図の初期化がタイムアウトしました。ページを再読み込みしてください。");
          initAttemptedRef.current = false;
        }, 20000); // 20秒に延長

        // マップ読み込み完了イベント
        window.google.maps.event.addListenerOnce(newMap, 'idle', () => {
          clearTimeout(initTimeout);
          console.log("MapView: Map successfully initialized");
          setMap(newMap);
          setMapInitialized(true);
          
          // 強制的にマップサイズを調整
          setTimeout(() => {
            window.google.maps.event.trigger(newMap, 'resize');
            newMap.setCenter(center);
          }, 300);
        });

        // エラーハンドリング
        window.google.maps.event.addListener(newMap, 'error', (error: any) => {
          console.error("MapView: Map error:", error);
          clearTimeout(initTimeout);
          setInitializationError("地図の表示中にエラーが発生しました。");
          initAttemptedRef.current = false;
        });

      } catch (error) {
        console.error("MapView: Initialization failed:", error);
        setInitializationError(`地図の初期化エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
        initAttemptedRef.current = false;
      }
    }
  }, [googleMapsLoaded, googleApiReady, latitude, longitude, containerHeight, googleMapsLoadError]);

  // ユーザー位置マーカーの設置
  useEffect(() => {
    if (map && latitude && longitude && mapInitialized) {
      const userPosition = new window.google.maps.LatLng(latitude, longitude);
      
      if (userLocationMarker) {
        userLocationMarker.setPosition(userPosition);
      } else {
        const marker = new window.google.maps.Marker({
          position: userPosition,
          map: map,
          title: "あなたの現在地",
          icon: {
            url: "https://res.cloudinary.com/dz9trbwma/image/upload/v1749098791/%E9%B3%A9_azif4f.png",
            scaledSize: new window.google.maps.Size(50, 50),
            anchor: new window.google.maps.Point(25, 25),
          },
          animation: window.google.maps.Animation.DROP, 
        });
        setUserLocationMarker(marker);
      }

      map.panTo(userPosition);
      const currentZoom = map.getZoom();
      if (currentZoom !== undefined && currentZoom < 15) {
        map.setZoom(15);
      }
    }
  }, [map, latitude, longitude, mapInitialized, userLocationMarker]);

  const handlePlaceSelected = (place: google.maps.places.PlaceResult, distance: string | null) => {
    setSelectedPlace(place);
    setDistanceToSelectedPlace(distance);

    if (selectedPlaceMarker) {
      selectedPlaceMarker.setMap(null);
    }

    if (map && place.geometry?.location) {
      map.panTo(place.geometry.location);
      map.setZoom(16);

      const marker = new window.google.maps.Marker({
        position: place.geometry.location,
        map: map,
        title: place.name,
        animation: window.google.maps.Animation.DROP,
      });
      setSelectedPlaceMarker(marker);
    }
  };

  const handleSearchError = (error: string) => {
    console.warn("MapView: Search error:", error);
  };

  const openGoogleMapsNavigation = (place: google.maps.places.PlaceResult | null) => {
    if (!place?.geometry?.location) return;
    
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${place.place_id}`;
    window.open(url, '_blank');
  };

  // エラー状態の処理
  if (googleMapsLoadError) {
    return (
      <MessageCard 
        title="エラー" 
        message={`地図の読み込みに失敗しました: ${googleMapsLoadError.message}`} 
        variant="destructive" 
        icon={AlertTriangle} 
      />
    );
  }

  if (initializationError) {
    return (
      <MessageCard 
        title="エラー" 
        message={initializationError} 
        variant="destructive" 
        icon={AlertTriangle}
      >
        <Button 
          onClick={() => {
            setInitializationError(null);
            initAttemptedRef.current = false;
            setMapInitialized(false);
            mapInstanceRef.current = null;
            setMap(null);
            window.location.reload(); // 強制リロード
          }}
          className="mt-4"
        >
          ページを再読み込み
        </Button>
      </MessageCard>
    );
  }

  // 位置情報エラー
  if (permissionState === 'denied' || locationError) {
    return (
      <MessageCard 
        title="位置情報が必要です" 
        message={locationError || "地図を表示するために位置情報の許可が必要です"}
        variant="warning" 
        icon={MapPin}
      >
        <Button onClick={requestLocation} className="mt-4">
          位置情報を許可する
        </Button>
      </MessageCard>
    );
  }

  // ローディング状態
  if (!googleMapsLoaded || !googleApiReady || containerHeight === 0 || locationLoading || !mapInitialized) {
    const loadingHeight = containerHeight > 0 ? containerHeight : 400;
    
    return (
      <div 
        className="relative w-full bg-gray-50"
        style={{ height: loadingHeight }}
      >
        <div 
          ref={mapContainerRef} 
          className="h-full w-full bg-gray-50"
          style={{ height: loadingHeight }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600 text-center px-4">
            {!googleMapsLoaded && "地図ライブラリを読み込み中..."}
            {googleMapsLoaded && !googleApiReady && "Google Maps APIを初期化中..."}
            {googleMapsLoaded && googleApiReady && locationLoading && "現在位置を取得中..."}
            {googleMapsLoaded && googleApiReady && !locationLoading && !mapInitialized && "地図を作成中..."}
          </p>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 text-xs text-gray-500">
              Provider: {googleMapsLoaded ? '✓' : '✗'} | API: {googleApiReady ? '✓' : '✗'} | Location: {latitude && longitude ? '✓' : '✗'}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // メインのマップ表示
  return (
    <div 
      className="relative w-full bg-gray-50"
      style={{ height: containerHeight }}
    >
      <div 
        ref={mapContainerRef} 
        className="h-full w-full"
        style={{ height: containerHeight }}
      />

      {map && googleMapsLoaded && mapInitialized && (
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-2rem)] max-w-md sm:max-w-lg"
          style={{ 
            paddingTop: `calc(env(safe-area-inset-top, 0px) + 0.5rem)`
          }}
        >
          <MapSearchControl
            map={map}
            userLocation={latitude && longitude ? new google.maps.LatLng(latitude, longitude) : null}
            onPlaceSelected={handlePlaceSelected}
            onSearchError={handleSearchError}
          />
        </div>
      )}

      {selectedPlace && selectedPlace.geometry && map && mapInitialized && (
        <motion.div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] sm:w-auto sm:max-w-md z-10 p-3 bg-background rounded-lg shadow-xl flex items-center justify-between"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="overflow-hidden mr-2">
            <h3 className="font-semibold text-sm sm:text-base truncate">{selectedPlace.name}</h3>
            {distanceToSelectedPlace && (
              <p className="text-xs sm:text-sm text-muted-foreground">
                現在地からの距離: {distanceToSelectedPlace}
              </p>
            )}
            <p className="text-xs text-muted-foreground truncate max-w-[160px] xs:max-w-[180px] sm:max-w-xs">
                {selectedPlace.formatted_address}
            </p>
          </div>
          <Button
            size="sm" 
            onClick={() => openGoogleMapsNavigation(selectedPlace)}
            className="flex-shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground px-2 py-1 sm:px-3 sm:py-2"
            aria-label="Googleマップで経路を表示"
          >
            <Navigation className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-1" />
            <span className="hidden sm:inline">経路</span>
          </Button>
        </motion.div>
      )}
    </div>
  );
}