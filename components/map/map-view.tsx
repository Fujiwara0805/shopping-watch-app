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
  const initializationAttemptedRef = useRef<boolean>(false);

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
  const [debugInfo, setDebugInfo] = useState<string>('');

  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [selectedPlaceMarker, setSelectedPlaceMarker] = useState<google.maps.Marker | null>(null);
  const [distanceToSelectedPlace, setDistanceToSelectedPlace] = useState<string | null>(null);
  const [userLocationMarker, setUserLocationMarker] = useState<google.maps.Marker | null>(null);

  // スマートフォン環境を強力に検出
  const getIsMobile = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    
    // 複数の条件でモバイル判定
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isMobileWidth = window.innerWidth <= 768;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    return isMobileUserAgent || (isMobileWidth && isTouchDevice);
  }, []);

  // スマートフォン専用の堅牢な高さ計算
  const calculateContainerHeight = useCallback((): number => {
    if (typeof window === 'undefined') return 400;
    
    const isMobile = getIsMobile();
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    
    let calculatedHeight: number;
    
    if (isMobile) {
      // スマートフォンの場合の計算
      const visualViewportHeight = window.visualViewport?.height || windowHeight;
      
      // 固定値を使用（より確実）
      const headerHeight = 56; // AppHeaderの高さ
      const navHeight = 64;    // MainNavの高さ
      const safeAreaTop = 44;   // 一般的なノッチの高さ
      const safeAreaBottom = 34; // ホームインジケーターの高さ
      
      // 保守的な計算（最小限のマージンを確保）
      calculatedHeight = Math.max(
        300, // 最小高さ
        visualViewportHeight - headerHeight - navHeight - 20 // 20pxのマージン
      );
      
      // 極端に大きな値を制限
      if (calculatedHeight > windowHeight - 100) {
        calculatedHeight = windowHeight - 100;
      }
      
    } else {
      // デスクトップの場合
      calculatedHeight = Math.max(400, windowHeight - 120);
    }
    
    const debugMessage = `Height calc: mobile=${isMobile}, window=${windowHeight}x${windowWidth}, calculated=${calculatedHeight}`;
    setDebugInfo(debugMessage);
    console.log('MapView:', debugMessage);
    
    return calculatedHeight;
  }, [getIsMobile]);

  // 初期化時とリサイズ時の高さ設定
  useEffect(() => {
    const updateHeight = () => {
      const newHeight = calculateContainerHeight();
      setContainerHeight(newHeight);
    };

    // 即座に初期化
    updateHeight();

    // 複数のタイミングで再計算（スマートフォンの不安定性対策）
    const timeouts = [
      setTimeout(updateHeight, 100),
      setTimeout(updateHeight, 500),
      setTimeout(updateHeight, 1000),
    ];

    const handleResize = () => {
      setTimeout(updateHeight, 100);
    };

    const handleOrientationChange = () => {
      setTimeout(updateHeight, 300);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleOrientationChange, { passive: true });
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize, { passive: true });
    }

    return () => {
      timeouts.forEach(clearTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, [calculateContainerHeight]);

  // MessageCard コンポーネントの定義
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

    return (
      <div 
        className="relative w-full flex items-center justify-center p-4 bg-background force-map-dimensions smartphone-map-container"
        style={{ height: containerHeight || 400 }}
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
              Debug: {debugInfo}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 位置情報要求
  useEffect(() => {
    if (
      permissionState === 'granted' && 
      !latitude && 
      !longitude && 
      !locationLoading
    ) {
      console.log("MapView: Requesting location");
      requestLocation();
    }
  }, [permissionState, latitude, longitude, locationLoading, requestLocation]);

  // Google Maps 初期化（より堅牢なロジック）
  useEffect(() => {
    // 初期化条件をより厳格に
    if (
      googleMapsLoaded && 
      mapContainerRef.current && 
      !map && 
      !googleMapsLoadError && 
      latitude && 
      longitude && 
      containerHeight > 200 && // 最小高さチェック
      !initializationAttemptedRef.current
    ) {
      console.log("MapView: Starting map initialization", {
        googleMapsLoaded,
        containerExists: !!mapContainerRef.current,
        location: [latitude, longitude],
        containerHeight,
        windowGoogle: !!window.google
      });

      initializationAttemptedRef.current = true;
      setInitializationError(null);

      // Google Maps API の完全性チェック
      if (!window.google || !window.google.maps || !window.google.maps.Map) {
        console.error("MapView: Google Maps API is not fully loaded");
        setInitializationError("地図APIの読み込みが不完全です。ページを再読み込みしてください。");
        initializationAttemptedRef.current = false;
        return;
      }

      try {
        const container = mapContainerRef.current;
        
        // コンテナのスタイルを強制設定
        container.style.height = `${containerHeight}px`;
        container.style.width = '100%';
        container.style.position = 'relative';
        container.style.backgroundColor = '#f0f0f0';

        const initialCenter = { lat: latitude, lng: longitude };

        const mapOptions: google.maps.MapOptions = {
          center: initialCenter,
          zoom: 15,
          clickableIcons: true,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          // スマートフォン最適化
          backgroundColor: '#f0f0f0',
          draggable: true,
          scrollwheel: true,
        };

        console.log("MapView: Creating Google Map instance");
        const newMapInstance = new window.google.maps.Map(container, mapOptions);
        
        // マップの読み込み完了を待つ
        const loadTimeout = setTimeout(() => {
          console.error("MapView: Map loading timeout");
          setInitializationError("地図の読み込みがタイムアウトしました。ページを再読み込みしてください。");
          initializationAttemptedRef.current = false;
        }, 10000); // 10秒タイムアウト

        window.google.maps.event.addListenerOnce(newMapInstance, 'idle', () => {
          clearTimeout(loadTimeout);
          console.log("MapView: Map successfully initialized");
          setMap(newMapInstance);
          setMapInitialized(true);
          
          // マップサイズを強制調整
          setTimeout(() => {
            window.google.maps.event.trigger(newMapInstance, 'resize');
            newMapInstance.setCenter(initialCenter);
          }, 100);
        });

        // エラーハンドリング
        window.google.maps.event.addListener(newMapInstance, 'error', (error: any) => {
          console.error("MapView: Map error", error);
          clearTimeout(loadTimeout);
          setInitializationError("地図の表示中にエラーが発生しました。");
          initializationAttemptedRef.current = false;
        });

      } catch (error) {
        console.error("MapView: Map initialization error", error);
        setInitializationError(`地図の初期化に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
        initializationAttemptedRef.current = false;
      }
    }
  }, [googleMapsLoaded, latitude, longitude, containerHeight, googleMapsLoadError]);

  // ユーザー位置マーカー
  useEffect(() => {
    if (map && latitude && longitude && window.google?.maps && mapInitialized) {
      const userPosition = new window.google.maps.LatLng(latitude, longitude);
      
      if (userLocationMarker) {
        userLocationMarker.setPosition(userPosition);
      } else {
        const newUserLocationMarker = new window.google.maps.Marker({
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
        setUserLocationMarker(newUserLocationMarker);
      }

      map.panTo(userPosition);
      const currentZoom = map.getZoom();
      if (currentZoom !== undefined && currentZoom < 15) {
        map.setZoom(15);
      }
    }
  }, [map, latitude, longitude, mapInitialized]);

  const handlePlaceSelected = (
    place: google.maps.places.PlaceResult,
    distance: string | null
  ) => {
    setSelectedPlace(place);
    setDistanceToSelectedPlace(distance);

    if (selectedPlaceMarker) {
      selectedPlaceMarker.setMap(null);
    }

    if (map && place.geometry && place.geometry.location) {
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
    console.warn("Search Error:", error);
  };

  const openGoogleMapsNavigation = (place: google.maps.places.PlaceResult | null) => {
    if (!place || !place.geometry || !place.geometry.location) {
      console.error("Cannot open navigation, place data is incomplete.");
      return;
    }
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${place.place_id}`;
    window.open(googleMapsUrl, '_blank');
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
        <Button onClick={() => {
          setInitializationError(null);
          initializationAttemptedRef.current = false;
          setMapInitialized(false);
          setMap(null);
        }}>
          再試行
        </Button>
      </MessageCard>
    );
  }

  // 位置情報エラーの処理
  if (permissionState === 'denied' || locationError) {
    return (
      <MessageCard 
        title="位置情報を取得できません" 
        message={locationError || "位置情報の使用が拒否されました"}
        variant="warning" 
        icon={MapPin}
      >
        <Button onClick={requestLocation}>再度許可を求める</Button>
      </MessageCard>
    );
  }

  // ローディング状態の処理（高さを固定）
  if (!googleMapsLoaded || containerHeight === 0 || locationLoading || !mapInitialized) {
    const loadingHeight = containerHeight > 0 ? containerHeight : 400;
    
    return (
      <div 
        className="relative w-full bg-muted overflow-hidden force-map-dimensions smartphone-map-container"
        style={{ height: loadingHeight }}
      >
        <div ref={mapContainerRef} className="h-full w-full bg-muted force-map-dimensions" />
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 z-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground text-center px-4">
            {!googleMapsLoaded && "地図サービスを準備中..."}
            {googleMapsLoaded && locationLoading && "現在位置を取得中..."}
            {googleMapsLoaded && !locationLoading && !mapInitialized && "地図を初期化中..."}
          </p>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-2 bg-gray-800 text-white rounded text-xs text-center max-w-xs">
              Debug: {debugInfo}<br/>
              Height: {containerHeight}px<br/>
              Maps: {googleMapsLoaded ? 'OK' : 'Loading'}<br/>
              Location: {latitude && longitude ? 'OK' : 'Getting'}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // メインのマップ表示
  return (
    <div 
      className="relative w-full overflow-hidden force-map-dimensions smartphone-map-container"
      style={{ height: containerHeight }}
    >
      <div ref={mapContainerRef} className="h-full w-full bg-muted force-map-dimensions" />

      {map && googleMapsLoaded && mapInitialized && (
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-2rem)] max-w-md sm:max-w-lg"
          style={{ 
            paddingTop: `calc(56px + env(safe-area-inset-top, 0px) + 0.5rem)`
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