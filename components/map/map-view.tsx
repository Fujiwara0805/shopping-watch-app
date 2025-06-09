"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { useGeolocation } from '@/lib/hooks/use-geolocation'; // Enhanced version
import { useGoogleMapsApi } from '@/components/providers/GoogleMapsApiProvider';
import { Button } from '@/components/ui/button';
import { MapPin, AlertTriangle, Navigation, RefreshCw, Smartphone, Monitor, Globe, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { MapSearchControl } from './MapSearchControl';
import { CrossBrowserLocationGuide } from './CrossBrowserLocationGuide'; // Enhanced version
import { LocationPermissionManager } from '@/lib/hooks/LocationPermissionManager';

declare global {
  interface Window {
    google: any;
  }
}

export function MapView() {
  console.log("MapView: Component rendering START");
  
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
    requestLocation,
    browserInfo,
    // 新しく追加されたプロパティ
    isPermissionGranted,
    permissionRemainingMinutes
  } = useGeolocation(); // Enhanced hook

  const [mapInitialized, setMapInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [showLocationGuide, setShowLocationGuide] = useState(false);
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0
  });

  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [selectedPlaceMarker, setSelectedPlaceMarker] = useState<google.maps.Marker | null>(null);
  const [distanceToSelectedPlace, setDistanceToSelectedPlace] = useState<string | null>(null);
  const [userLocationMarker, setUserLocationMarker] = useState<google.maps.Marker | null>(null);

  // 改良されたガイド表示制御（許可状態を考慮）
  useEffect(() => {
    // 既に許可されている場合はガイドを表示しない
    if (isPermissionGranted && permissionRemainingMinutes > 0) {
      setShowLocationGuide(false);
      return;
    }

    const shouldShowGuide = (
      (permissionState === 'prompt' || permissionState === 'denied') && 
      !latitude && 
      !longitude &&
      browserInfo.name !== 'unknown' &&
      !isPermissionGranted
    );

    if (shouldShowGuide) {
      // ブラウザ別の表示タイミング調整
      const delay = browserInfo.name === 'safari' ? 2000 : 1500;
      const timer = setTimeout(() => {
        setShowLocationGuide(true);
      }, delay);
      
      return () => clearTimeout(timer);
    } else {
      setShowLocationGuide(false);
    }
  }, [browserInfo.name, permissionState, latitude, longitude, isPermissionGranted, permissionRemainingMinutes]);

  // デバッグ情報の出力（許可状態情報も含む）
  console.log("MapView Enhanced: Current state:", {
    googleMapsLoaded,
    googleMapsLoading,
    googleMapsLoadError: !!googleMapsLoadError,
    latitude,
    longitude,
    locationLoading,
    permissionState,
    browserInfo,
    containerDimensions,
    mapInitialized,
    showLocationGuide,
    isPermissionGranted,
    permissionRemainingMinutes,
    storedPermissionInfo: LocationPermissionManager.getPermissionInfo()
  });

  // コンテナ寸法の取得（変更なし）
  const updateContainerDimensions = useCallback(() => {
    if (!mapContainerRef.current) return false;
    
    const container = mapContainerRef.current;
    const parent = container.parentElement;
    
    if (!parent) return false;
    
    const parentRect = parent.getBoundingClientRect();
    const width = parentRect.width;
    const height = parentRect.height;
    
    console.log(`MapView ${browserInfo.name}: Container dimensions updated:`, { width, height });
    
    setContainerDimensions({ width, height });
    
    // コンテナスタイルの明示的設定（ブラウザ別調整）
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    container.style.position = 'relative';
    container.style.backgroundColor = '#f5f5f5';
    
    // Firefox 特有の調整
    if (browserInfo.name === 'firefox') {
      container.style.overflow = 'hidden';
    }
    
    return width > 0 && height > 200;
  }, [browserInfo.name]);

  // コンテナ寸法の監視（変更なし）
  useEffect(() => {
    updateContainerDimensions();
    
    const timeouts = [
      setTimeout(updateContainerDimensions, 100),
      setTimeout(updateContainerDimensions, 300),
      setTimeout(updateContainerDimensions, 500)
    ];

    const handleResize = () => {
      setTimeout(updateContainerDimensions, browserInfo.name === 'safari' ? 50 : 30);
    };

    // 基本的なイベントリスナー
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });
    
    // ブラウザ別特有のイベント
    if (browserInfo.name === 'safari') {
      window.addEventListener('pageshow', handleResize, { passive: true });
      window.addEventListener('focus', handleResize, { passive: true });
    } else if (browserInfo.name === 'firefox') {
      // Firefox用の追加イベント
      window.addEventListener('load', handleResize, { passive: true });
    }

    return () => {
      timeouts.forEach(clearTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      
      if (browserInfo.name === 'safari') {
        window.removeEventListener('pageshow', handleResize);
        window.removeEventListener('focus', handleResize);
      } else if (browserInfo.name === 'firefox') {
        window.removeEventListener('load', handleResize);
      }
    };
  }, [updateContainerDimensions, browserInfo.name]);

  // 改良された位置情報要求ハンドラー
  const handleLocationRequest = () => {
    console.log(`MapView: ${browserInfo.name} location request triggered`);
    setShowLocationGuide(false);
    requestLocation(); // Enhanced hook will handle permission saving
  };

  // 地図初期化のメイン処理（変更なし）
  const initializeMap = useCallback(() => {
    console.log(`MapView ${browserInfo.name}: initializeMap called with conditions:`, {
      container: !!mapContainerRef.current,
      mapInstance: !!mapInstanceRef.current,
      googleMapsLoaded,
      location: !!(latitude && longitude),
      dimensions: containerDimensions,
      alreadyTried: initializationTriedRef.current,
      browserName: browserInfo.name
    });

    if (!mapContainerRef.current || 
        mapInstanceRef.current || 
        !googleMapsLoaded || 
        !latitude || 
        !longitude || 
        containerDimensions.height < 200 ||
        initializationTriedRef.current) {
      console.log(`MapView ${browserInfo.name}: Initialization conditions not met`);
      return false;
    }

    if (!window.google?.maps?.Map) {
      console.error(`MapView ${browserInfo.name}: Google Maps API not available despite isLoaded=true`);
      setInitializationError("Google Maps APIが利用できません。ページを再読み込みしてください。");
      return false;
    }

    console.log(`MapView ${browserInfo.name}: Starting map initialization`);
    initializationTriedRef.current = true;

    try {
      const container = mapContainerRef.current;
      container.innerHTML = '';

      const center = { lat: latitude, lng: longitude };

      // ブラウザ別の地図オプション
      const getMapOptions = (): google.maps.MapOptions => {
        const baseOptions: google.maps.MapOptions = {
          center,
          clickableIcons: true,
          disableDefaultUI: true,
          zoomControl: true,
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

        switch (browserInfo.name) {
          case 'safari':
            return {
              ...baseOptions,
              zoom: 14,
              gestureHandling: 'cooperative'
            };
          
          case 'firefox':
            return {
              ...baseOptions,
              zoom: 15,
              gestureHandling: 'greedy',
              // Firefox では追加の最適化
              draggableCursor: 'default'
            };
          
          case 'chrome':
          case 'edge':
            return {
              ...baseOptions,
              zoom: 15,
              gestureHandling: 'greedy'
            };
          
          default:
            return {
              ...baseOptions,
              zoom: 15,
              gestureHandling: 'greedy'
            };
        }
      };

      console.log(`MapView ${browserInfo.name}: Creating Google Map instance`);
      const newMap = new window.google.maps.Map(container, getMapOptions());
      mapInstanceRef.current = newMap;

      // ブラウザ別の地図読み込み完了処理
      const idleListener = window.google.maps.event.addListenerOnce(newMap, 'idle', () => {
        console.log(`MapView ${browserInfo.name}: Map idle event - initialization complete`);
        setMap(newMap);
        setMapInitialized(true);
        setInitializationError(null);
        
        // ブラウザ別の地図リサイズ処理
        const resizeDelay = browserInfo.name === 'safari' ? 300 : 
                          browserInfo.name === 'firefox' ? 200 : 100;
                          
        setTimeout(() => {
          if (newMap && window.google?.maps?.event) {
            window.google.maps.event.trigger(newMap, 'resize');
            newMap.setCenter(center);
            
            // ブラウザ別のズーム調整
            if (browserInfo.name === 'safari') {
              newMap.setZoom(15);
            } else if (browserInfo.name === 'firefox') {
              newMap.setZoom(15);
            }
          }
        }, resizeDelay);
      });

      // エラーハンドリング
      const errorListener = window.google.maps.event.addListener(newMap, 'error', (error: any) => {
        console.error(`MapView ${browserInfo.name}: Map error:`, error);
        setInitializationError("地図の表示中にエラーが発生しました。");
        initializationTriedRef.current = false;
        
        window.google.maps.event.removeListener(idleListener);
        window.google.maps.event.removeListener(errorListener);
      });

      // タイムアウト設定（120秒に統一）
      const timeout = setTimeout(() => {
        if (!mapInitialized) {
          console.error(`MapView ${browserInfo.name}: Map initialization timeout`);
          setInitializationError("タイムアウトしました。再度ロードしてください。");
          initializationTriedRef.current = false;
        }
      }, 120000); // 120秒に統一

      return () => {
        clearTimeout(timeout);
        if (idleListener) window.google.maps.event.removeListener(idleListener);
        if (errorListener) window.google.maps.event.removeListener(errorListener);
      };

    } catch (error) {
      console.error(`MapView ${browserInfo.name}: Map initialization failed:`, error);
      setInitializationError(`地図の初期化に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
      initializationTriedRef.current = false;
      return false;
    }
  }, [googleMapsLoaded, latitude, longitude, containerDimensions, mapInitialized, browserInfo.name]);

  // 地図初期化の実行タイミング制御（変更なし）
  useEffect(() => {
    if (googleMapsLoaded && 
        latitude && 
        longitude && 
        containerDimensions.height >= 200 && 
        !mapInitialized &&
        !initializationTriedRef.current) {
      
      console.log(`MapView ${browserInfo.name}: Conditions met for initialization, starting...`);
      
      // ブラウザ別の初期化遅延
      const initDelay = browserInfo.name === 'safari' ? 200 : 
                       browserInfo.name === 'firefox' ? 150 : 100;
      
      const timer = setTimeout(() => {
        initializeMap();
      }, initDelay);

      return () => clearTimeout(timer);
    }
  }, [googleMapsLoaded, latitude, longitude, containerDimensions, mapInitialized, initializeMap, browserInfo.name]);

  // ユーザー位置マーカーの設置（変更なし）
  useEffect(() => {
    if (map && latitude && longitude && mapInitialized && window.google?.maps) {
      console.log(`MapView ${browserInfo.name}: Setting user location marker`);
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
          console.log(`MapView ${browserInfo.name}: User location marker created successfully`);
        } catch (error) {
          console.error(`MapView ${browserInfo.name}: Failed to create user location marker:`, error);
        }
      }

      map.panTo(userPosition);
      const currentZoom = map.getZoom();
      if (currentZoom !== undefined && currentZoom < 15) {
        map.setZoom(15);
      }
    }
  }, [map, latitude, longitude, mapInitialized, userLocationMarker, browserInfo.name]);

  // 改良された再試行機能
  const handleRetry = () => {
    console.log(`MapView ${browserInfo.name}: Retrying initialization`);
    setInitializationError(null);
    setMapInitialized(false);
    initializationTriedRef.current = false;
    mapInstanceRef.current = null;
    setMap(null);
    setShowLocationGuide(false);
    
    if (mapContainerRef.current) {
      mapContainerRef.current.innerHTML = '';
    }
    
    // 許可状態を確認してから再試行
    const permissionInfo = LocationPermissionManager.checkPermission();
    
    setTimeout(() => {
      updateContainerDimensions();
      if (!latitude || !longitude || !permissionInfo.isGranted) {
        requestLocation();
      }
    }, 100);
  };

  // ブラウザアイコンの取得（変更なし）
  const getBrowserIcon = (browserName: string) => {
    switch (browserName) {
      case 'safari': return Smartphone;
      case 'firefox': return Globe;
      case 'chrome': return Monitor; // Chromeアイコンが存在しないためMonitorを使用
      case 'edge': return Monitor;
      default: return MapPin;
    }
  };

  // メッセージカードコンポーネント（変更なし）
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
        </div>
      </div>
    );
  };

  // 場所選択ハンドラー（変更なし）
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
    console.warn(`MapView ${browserInfo.name}: Search error:`, error);
  };

  const openGoogleMapsNavigation = (place: google.maps.places.PlaceResult | null) => {
    if (!place?.geometry?.location) return;
    
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${place.place_id}`;
    window.open(url, '_blank');
  };

  // 改良されたクロスブラウザ位置情報ガイドの表示判定
  if (showLocationGuide && !isPermissionGranted) {
    const BrowserIcon = getBrowserIcon(browserInfo.name);
    
    return (
      <>
        <div className="w-full h-full bg-gray-50 relative">
          <div ref={mapContainerRef} className="w-full h-full bg-gray-50" />
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
            <div className="text-center">
              <BrowserIcon className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">位置情報を待機中...</h2>
              <p className="text-gray-600 text-sm mb-6">
                位置情報の許可をお待ちしています
              </p>
              <Button onClick={handleLocationRequest} className="mb-4">
                <MapPin className="h-4 w-4 mr-2" />
                位置情報を許可する
              </Button>
            </div>
          </div>
        </div>
        
        <CrossBrowserLocationGuide
          isVisible={showLocationGuide}
          browserInfo={browserInfo}
          permissionState={permissionState}
          onRequestLocation={handleLocationRequest}
          onClose={() => setShowLocationGuide(false)}
          isPermissionGranted={isPermissionGranted}
          permissionRemainingMinutes={permissionRemainingMinutes}
        />
      </>
    );
  }

  // エラー状態の処理（変更なし）
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

  // 改良された位置情報エラー処理
  if ((permissionState === 'denied' || locationError) && !isPermissionGranted) {
    const getBrowserLocationMessage = () => {
      if (locationError) return locationError;
      
      switch (browserInfo.name) {
        case 'safari':
          return "Safari で位置情報の許可が必要です。アドレスバーの🔒アイコンから設定を変更してください。";
        case 'chrome':
          return "Chrome で位置情報の許可が必要です。アドレスバー左の🔒アイコンから設定を変更してください。";
        case 'firefox':
          return "Firefox で位置情報の許可が必要です。アドレスバー左の🔒アイコンから設定を変更してください。";
        case 'edge':
          return "Edge で位置情報の許可が必要です。アドレスバー左の🔒アイコンから設定を変更してください。";
        default:
          return "地図を表示するために位置情報の許可が必要です。";
      }
    };

    const BrowserIcon = getBrowserIcon(browserInfo.name);

    return (
      <MessageCard 
        title="位置情報が必要です" 
        message={getBrowserLocationMessage()}
        variant="warning" 
        icon={BrowserIcon}
      >
        <div className="space-y-3">
          <Button onClick={handleLocationRequest} className="w-full">
            位置情報を許可する
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowLocationGuide(true)}
            className="w-full"
          >
            設定方法を見る
          </Button>
        </div>
      </MessageCard>
    );
  }

  // 改良されたローディング状態（許可状態を考慮）
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
    else if (locationLoading) {
      if (isPermissionGranted) {
        loadingMessage = "保存された設定で位置情報を取得中...";
      } else {
        loadingMessage = "現在位置を取得中...";
      }
    }
    else if (!latitude || !longitude) {
      loadingMessage = "位置情報を待機中...";
    }
    else if (!mapInitialized) loadingMessage = "地図を作成中...";
    
    const BrowserIcon = getBrowserIcon(browserInfo.name);
    
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
          
          {/* 許可状態の表示 */}
          {isPermissionGranted && permissionRemainingMinutes > 0 && (
            <div className="flex items-center text-green-600 text-sm mb-4">
              <Clock className="h-4 w-4 mr-2" />
              位置情報許可中（残り約{permissionRemainingMinutes}分）
            </div>
          )}
          
          {/* ブラウザ別の位置情報ヘルプボタン */}
          {(permissionState === 'prompt' || (!latitude && !isPermissionGranted)) && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowLocationGuide(true)}
              className="mb-4"
            >
              <BrowserIcon className="h-4 w-4 mr-2" />
              ブラウザで位置情報を許可
            </Button>
          )}
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

      {/* 許可状態インジケーター（左下に配置） */}
      {isPermissionGranted && permissionRemainingMinutes > 0 && map && mapInitialized && (
        <div className="absolute bottom-20 left-2 z-30 bg-green-100 border border-green-300 rounded-lg px-3 py-2 text-sm text-green-800 shadow-lg">
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            位置情報有効（残り{permissionRemainingMinutes}分）
          </div>
        </div>
      )}

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

      {/* クロスブラウザ位置情報ガイド */}
      <CrossBrowserLocationGuide
        isVisible={showLocationGuide}
        browserInfo={browserInfo}
        permissionState={permissionState}
        onRequestLocation={handleLocationRequest}
        onClose={() => setShowLocationGuide(false)}
        isPermissionGranted={isPermissionGranted}
        permissionRemainingMinutes={permissionRemainingMinutes}
      />
    </div>
  );
}