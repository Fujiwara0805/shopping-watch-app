"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { useGoogleMapsApi } from '@/components/providers/GoogleMapsApiProvider';
import { Button } from '@/components/ui/button';
import { MapPin, AlertTriangle, Navigation, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { MapSearchControl } from './MapSearchControl';

declare global {
  interface Window {
    google: any;
  }
}

export function MapView() {
  console.log("MapView: Component rendering START");
  
  // GoogleMapsApiProviderから正しい状態を取得
  const { isLoaded: googleMapsLoaded, loadError: googleMapsLoadError, isLoading: googleMapsLoading } = useGoogleMapsApi();
  
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const initializationTriedRef = useRef<boolean>(false);

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
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0
  });

  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [selectedPlaceMarker, setSelectedPlaceMarker] = useState<google.maps.Marker | null>(null);
  const [distanceToSelectedPlace, setDistanceToSelectedPlace] = useState<string | null>(null);
  const [userLocationMarker, setUserLocationMarker] = useState<google.maps.Marker | null>(null);

  // デバッグ用現在状態ログ
  console.log("MapView: Current state:", {
    googleMapsLoaded,
    googleMapsLoading,
    googleMapsLoadError: !!googleMapsLoadError,
    latitude,
    longitude,
    locationLoading,
    permissionState,
    containerDimensions,
    mapInitialized
  });

  // コンテナ寸法の取得
  const updateContainerDimensions = useCallback(() => {
    if (!mapContainerRef.current) return false;
    
    const container = mapContainerRef.current;
    const parent = container.parentElement;
    
    if (!parent) return false;
    
    const parentRect = parent.getBoundingClientRect();
    const width = parentRect.width;
    const height = parentRect.height;
    
    console.log('MapView: Container dimensions updated:', { width, height });
    
    setContainerDimensions({ width, height });
    
    // コンテナスタイルの明示的設定
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    container.style.position = 'relative';
    container.style.backgroundColor = '#f5f5f5';
    
    return width > 0 && height > 200;
  }, []);

  // コンテナ寸法の監視
  useEffect(() => {
    updateContainerDimensions();
    
    const timeouts = [
      setTimeout(updateContainerDimensions, 100),
      setTimeout(updateContainerDimensions, 300),
      setTimeout(updateContainerDimensions, 500)
    ];

    const handleResize = () => {
      setTimeout(updateContainerDimensions, 50);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    return () => {
      timeouts.forEach(clearTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [updateContainerDimensions]);

  // 位置情報の自動取得
  useEffect(() => {
    if (permissionState === 'granted' && !latitude && !longitude && !locationLoading) {
      console.log("MapView: Auto-requesting location");
      requestLocation();
    }
  }, [permissionState, latitude, longitude, locationLoading, requestLocation]);

  // 地図初期化のメイン処理
  const initializeMap = useCallback(() => {
    console.log("MapView: initializeMap called with conditions:", {
      container: !!mapContainerRef.current,
      mapInstance: !!mapInstanceRef.current,
      googleMapsLoaded,
      location: !!(latitude && longitude),
      dimensions: containerDimensions,
      alreadyTried: initializationTriedRef.current
    });

    if (!mapContainerRef.current || 
        mapInstanceRef.current || 
        !googleMapsLoaded || 
        !latitude || 
        !longitude || 
        containerDimensions.height < 200 ||
        initializationTriedRef.current) {
      console.log("MapView: Initialization conditions not met");
      return false;
    }

    // Google Maps APIの可用性を再確認
    if (!window.google?.maps?.Map) {
      console.error("MapView: Google Maps API not available despite isLoaded=true");
      setInitializationError("Google Maps APIが利用できません。ページを再読み込みしてください。");
      return false;
    }

    console.log("MapView: Starting map initialization");
    initializationTriedRef.current = true;

    try {
      const container = mapContainerRef.current;
      container.innerHTML = ''; // 既存内容をクリア

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
        restriction: {
          latLngBounds: {
            north: 45.557,
            south: 24.217,
            east: 145.817,
            west: 122.933
          }
        }
      };

      console.log("MapView: Creating Google Map instance");
      const newMap = new window.google.maps.Map(container, mapOptions);
      mapInstanceRef.current = newMap;

      // 地図読み込み完了を待機
      const idleListener = window.google.maps.event.addListenerOnce(newMap, 'idle', () => {
        console.log("MapView: Map idle event - initialization complete");
        setMap(newMap);
        setMapInitialized(true);
        setInitializationError(null);
        
        // 地図のリサイズトリガー
        setTimeout(() => {
          if (newMap && window.google?.maps?.event) {
            window.google.maps.event.trigger(newMap, 'resize');
            newMap.setCenter(center);
          }
        }, 100);
      });

      // エラーハンドリング
      const errorListener = window.google.maps.event.addListener(newMap, 'error', (error: any) => {
        console.error("MapView: Map error:", error);
        setInitializationError("地図の表示中にエラーが発生しました。");
        initializationTriedRef.current = false;
        
        window.google.maps.event.removeListener(idleListener);
        window.google.maps.event.removeListener(errorListener);
      });

      // 初期化タイムアウト
      const timeout = setTimeout(() => {
        if (!mapInitialized) {
          console.error("MapView: Map initialization timeout");
          setInitializationError("地図の初期化がタイムアウトしました。再試行してください。");
          initializationTriedRef.current = false;
        }
      }, 15000);

      // クリーンアップを返す
      return () => {
        clearTimeout(timeout);
        if (idleListener) window.google.maps.event.removeListener(idleListener);
        if (errorListener) window.google.maps.event.removeListener(errorListener);
      };

    } catch (error) {
      console.error("MapView: Map initialization failed:", error);
      setInitializationError(`地図の初期化に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
      initializationTriedRef.current = false;
      return false;
    }
  }, [googleMapsLoaded, latitude, longitude, containerDimensions, mapInitialized]);

  // 地図初期化の実行タイミング制御
  useEffect(() => {
    if (googleMapsLoaded && 
        latitude && 
        longitude && 
        containerDimensions.height >= 200 && 
        !mapInitialized &&
        !initializationTriedRef.current) {
      
      console.log("MapView: Conditions met for initialization, starting...");
      
      // 少し遅延させて確実に初期化
      const timer = setTimeout(() => {
        initializeMap();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [googleMapsLoaded, latitude, longitude, containerDimensions, mapInitialized, initializeMap]);

  // ユーザー位置マーカーの設置
  useEffect(() => {
    if (map && latitude && longitude && mapInitialized && window.google?.maps) {
      console.log("MapView: Setting user location marker");
      const userPosition = new window.google.maps.LatLng(latitude, longitude);
      
      if (userLocationMarker) {
        userLocationMarker.setPosition(userPosition);
      } else {
        try {
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
          console.log("MapView: User location marker created successfully");
        } catch (error) {
          console.error("MapView: Failed to create user location marker:", error);
        }
      }

      map.panTo(userPosition);
      const currentZoom = map.getZoom();
      if (currentZoom !== undefined && currentZoom < 15) {
        map.setZoom(15);
      }
    }
  }, [map, latitude, longitude, mapInitialized, userLocationMarker]);

  // 再試行機能
  const handleRetry = () => {
    console.log("MapView: Retrying initialization");
    setInitializationError(null);
    setMapInitialized(false);
    initializationTriedRef.current = false;
    mapInstanceRef.current = null;
    setMap(null);
    
    // コンテナのリセット
    if (mapContainerRef.current) {
      mapContainerRef.current.innerHTML = '';
    }
    
    // 寸法の再計算
    setTimeout(() => {
      updateContainerDimensions();
    }, 100);
  };

  // メッセージカードコンポーネント
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
      <div className="w-full h-full flex items-center justify-center p-4 bg-background">
        <div className="bg-card p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md text-center border">
          {Icon && <Icon className={`h-16 w-16 ${iconColorClass} mb-6 mx-auto`} />}
          <h2 className={`text-xl sm:text-2xl font-semibold mb-3 ${variant === 'destructive' ? 'text-destructive' : 'text-foreground'}`}>
            {title}
          </h2>
          <div className="text-sm sm:text-base text-muted-foreground mb-6 leading-relaxed">
            {message}
          </div>
          {children}
          
          {/* デバッグ情報（すべての環境で表示） */}
          <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600 border">
            <div className="font-semibold mb-2">診断情報:</div>
            <div>Size: {containerDimensions.width} x {containerDimensions.height}px</div>
            <div>
              API: {googleMapsLoaded ? '✓ロード済み' : googleMapsLoading ? '⏳読み込み中' : '✗未ロード'} | 
              Location: {latitude && longitude ? '✓取得済み' : '✗未取得'}
            </div>
            <div>Permission: {permissionState}</div>
            {googleMapsLoadError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700">
                <div className="font-semibold">エラー:</div>
                <div className="text-xs break-words">{googleMapsLoadError.message}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 場所選択ハンドラー
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
        title="Google Maps APIエラー" 
        message={`Google Maps APIの読み込みに失敗しました。`}
        variant="destructive" 
        icon={AlertTriangle}
      >
        <Button onClick={handleRetry} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          再試行
        </Button>
      </MessageCard>
    );
  }

  if (initializationError) {
    return (
      <MessageCard 
        title="地図初期化エラー" 
        message={initializationError} 
        variant="destructive" 
        icon={AlertTriangle}
      >
        <Button onClick={handleRetry} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          再試行
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
  if (googleMapsLoading || 
      !googleMapsLoaded || 
      containerDimensions.height === 0 || 
      locationLoading || 
      (!latitude || !longitude) ||
      !mapInitialized) {
    
    let loadingMessage = "地図を準備中...";
    if (googleMapsLoading) loadingMessage = "Google Maps APIを読み込み中...";
    else if (!googleMapsLoaded) loadingMessage = "Google Maps APIを待機中...";
    else if (containerDimensions.height === 0) loadingMessage = "画面サイズを調整中...";
    else if (locationLoading) loadingMessage = "現在位置を取得中...";
    else if (!latitude || !longitude) loadingMessage = "位置情報を待機中...";
    else if (!mapInitialized) loadingMessage = "地図を作成中...";
    
    return (
      <div className="w-full h-full bg-gray-50 relative">
        <div 
          ref={mapContainerRef} 
          className="w-full h-full bg-gray-50"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600 text-center px-4 font-medium mb-4">
            {loadingMessage}
          </p>
          
          {/* ローディング中の詳細情報 */}
          <div className="bg-white p-3 rounded-lg shadow border max-w-sm mx-4">
            <div className="text-xs text-gray-600 space-y-1">
              <div>Size: {containerDimensions.width} x {containerDimensions.height}px</div>
              <div>
                Loaded: {googleMapsLoaded ? '✓' : '✗'} | 
                Loading: {googleMapsLoading ? '✓' : '✗'} | 
                Location: {latitude && longitude ? '✓' : '✗'}
              </div>
              <div>Permission: {permissionState}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // メインのマップ表示
  return (
    <div className="w-full h-full bg-gray-50 relative">
      <div 
        ref={mapContainerRef} 
        className="w-full h-full"
      />

      {map && mapInitialized && (
        <div 
          className="absolute top-2 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-1rem)] max-w-md sm:max-w-lg"
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