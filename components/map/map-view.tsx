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
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastHeightRef = useRef<number>(0);

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
  const [containerHeight, setContainerHeight] = useState<number>(400); // デフォルト値を設定

  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [selectedPlaceMarker, setSelectedPlaceMarker] = useState<google.maps.Marker | null>(null);
  const [distanceToSelectedPlace, setDistanceToSelectedPlace] = useState<string | null>(null);
  const [userLocationMarker, setUserLocationMarker] = useState<google.maps.Marker | null>(null);

  // スマートフォン専用の高さ計算関数（デバウンス付き）
  const updateContainerHeight = useCallback(() => {
    const isMobile = window.innerWidth <= 768;
    const currentWindowHeight = window.innerHeight;
    
    // 高さが大きく変わっていない場合は処理をスキップ（無限ループ防止）
    if (Math.abs(currentWindowHeight - lastHeightRef.current) < 10) {
      return;
    }
    
    lastHeightRef.current = currentWindowHeight;
    
    if (isMobile) {
      // スマートフォンの場合：動的に計算
      const windowHeight = window.innerHeight;
      const visualViewportHeight = window.visualViewport?.height || windowHeight;
      
      // ヘッダー高さ（56px）+ ナビゲーション高さ（64px）
      const headerHeight = 56;
      const navHeight = 64;
      
      const calculatedHeight = Math.max(300, visualViewportHeight - headerHeight - navHeight);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('MapView: Mobile height calculation:', {
          windowHeight,
          visualViewportHeight,
          calculatedHeight
        });
      }
      
      setContainerHeight(calculatedHeight);
    } else {
      // デスクトップの場合：フルハイト
      const calculatedHeight = Math.max(400, currentWindowHeight - 120);
      setContainerHeight(calculatedHeight);
    }
  }, []);

  // 初期化とリサイズ監視（デバウンス付き）
  useEffect(() => {
    // 初期設定（遅延実行）
    const initialTimeout = setTimeout(updateContainerHeight, 100);
    
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = setTimeout(updateContainerHeight, 200);
    };
    
    const handleOrientationChange = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      // オリエンテーション変更時は少し遅延させる
      resizeTimeoutRef.current = setTimeout(() => {
        updateContainerHeight();
        // マップがある場合はリサイズイベントを発火
        if (map && window.google?.maps) {
          window.google.maps.event.trigger(map, 'resize');
        }
      }, 300);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleOrientationChange, { passive: true });
    
    // Visual Viewport API がサポートされている場合
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize, { passive: true });
    }
    
    return () => {
      clearTimeout(initialTimeout);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []); // 依存配列を空にして1回だけ実行

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
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm z-50">
        <div className="bg-card p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md text-center border">
          {Icon && <Icon className={`h-16 w-16 ${iconColorClass} mb-6 mx-auto`} />}
          <h2 className={`text-xl sm:text-2xl font-semibold mb-3 ${variant === 'destructive' ? 'text-destructive' : 'text-foreground'}`}>
            {title}
          </h2>
          <div className="text-sm sm:text-base text-muted-foreground mb-6 leading-relaxed">
            {message}
          </div>
          {children}
        </div>
      </div>
    );
  };

  // 位置情報要求のuseEffect（条件を厳格化）
  useEffect(() => {
    if (
      permissionState === 'granted' && 
      !latitude && 
      !longitude && 
      !locationLoading && 
      !mapInitialized && 
      !initializationError
    ) {
      console.log("MapView: Requesting location (conditions met)");
      requestLocation();
    }
  }, [permissionState, requestLocation]); // 依存配列を最小限に

  // マップ初期化のuseEffect
  useEffect(() => {
    if (
      googleMapsLoaded && 
      mapContainerRef.current && 
      !map && 
      !googleMapsLoadError && 
      latitude && 
      longitude && 
      containerHeight > 0
    ) {
      console.log("MapView: Initializing map with height:", containerHeight);
      setInitializationError(null);

      const initialCenter = { lat: latitude, lng: longitude };

      try {
        // window.google が存在することを確認
        if (!window.google || !window.google.maps) {
          console.error("MapView: window.google.maps is not available yet.");
          setInitializationError("地図APIがまだ利用できません。再試行しています...");
          return;
        }

        // コンテナのサイズを明示的に設定
        if (mapContainerRef.current) {
          mapContainerRef.current.style.height = `${containerHeight}px`;
          mapContainerRef.current.style.width = '100%';
        }

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
        };

        const newMapInstance = new window.google.maps.Map(mapContainerRef.current, mapOptions);
        
        // マップが完全に読み込まれてから状態を更新
        window.google.maps.event.addListenerOnce(newMapInstance, 'idle', () => {
          setMap(newMapInstance);
          setMapInitialized(true);
          console.log("MapView: Map initialized successfully");
        });

      } catch (error) {
        console.error("MapView: Error initializing map:", error);
        setInitializationError(`地図の初期化に失敗しました。${error instanceof Error ? error.message : String(error)}`);
        setMapInitialized(false);
      }
    }
  }, [googleMapsLoaded, latitude, longitude, containerHeight]); // 依存配列を最小限に

  // ユーザー位置マーカーのuseEffect
  useEffect(() => {
    if (map && latitude && longitude && window.google?.maps) {
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
  }, [map, latitude, longitude]); // userLocationMarkerを依存配列から除外

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
    } else {
      console.error("Selected place does not have geometry information.");
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

  if (googleMapsLoadError) {
    return <MessageCard title="エラー" message={`地図の読み込みに失敗しました！再度リロードしてください。: ${googleMapsLoadError.message}`} variant="destructive" icon={AlertTriangle} />;
  }

  if (initializationError && !mapInitialized) {
     return <MessageCard title="エラー" message={initializationError} variant="destructive" icon={AlertTriangle} />;
  }

  if (!googleMapsLoaded || containerHeight === 0) {
    return (
      <div className="relative w-full" style={{ height: containerHeight || '400px' }}>
        <div ref={mapContainerRef} id="map-canvas-placeholder" className="h-full w-full bg-muted opacity-0 pointer-events-none" />
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="ml-2 text-muted-foreground">地図サービスを準備中...</p>
        </div>
      </div>
    );
  }

  if (locationLoading && !mapInitialized && !initializationError) {
    return (
      <div className="relative w-full" style={{ height: containerHeight }}>
        <div ref={mapContainerRef} id="map-canvas-placeholder" className="h-full w-full bg-muted opacity-0 pointer-events-none" />
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="ml-2 text-muted-foreground">現在位置を取得中...</p>
        </div>
      </div>
    );
  }
  
  if (!mapInitialized && !initializationError) {
     return (
        <div className="relative w-full" style={{ height: containerHeight }}>
            <div ref={mapContainerRef} id="map-canvas" className="h-full w-full bg-muted" />
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="ml-2 text-muted-foreground">地図を準備中...</p>
            </div>
        </div>
    );
  }
  
  return (
    <div className="relative w-full overflow-hidden" style={{ height: containerHeight }}>
      <div ref={mapContainerRef} id="map-canvas" className="h-full w-full bg-muted" />

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
      
      {permissionState === 'denied' && locationError && (
         <MessageCard 
            title="位置情報を取得できません" 
            message={locationError}
            variant="warning" 
            icon={MapPin}
          >
            <Button onClick={() => { console.log("MapView: Retry permission clicked."); requestLocation(); }}>再度許可を求める</Button>
         </MessageCard>
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