"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { StoreInfoCard } from '@/components/map/store-info-card';
import { mockStores } from '@/lib/mock-data';
import { Store } from '@/types/store';
import { Button } from '@/components/ui/button';
import { Compass, MapPin, AlertTriangle, List } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

declare global {
  interface Window {
    google: any;
  }
}

export function MapView() {
  console.log("MapView: Component rendering or re-rendering START");

  const [mapNode, setMapNode] = useState<HTMLDivElement | null>(null);
  
  const mapRefCallback = useCallback((node: HTMLDivElement | null) => {
    console.log(`MapView: mapRefCallback invoked. Node is ${node ? 'NOT null' : 'null'}. Current mapNode state: ${mapNode ? 'NOT null' : 'null'}`);
    if (node) {
      if (mapNode !== node) {
        console.log("MapView: mapRefCallback - Setting mapNode with new DOM element.");
        setMapNode(node);
      } else {
        console.log("MapView: mapRefCallback - Received same node, not re-setting state.");
      }
    } else {
      console.log("MapView: mapRefCallback - Received null node (element unmounted?).");
    }
  }, [mapNode]);

  const [map, setMap] = useState<any | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const { 
    latitude, 
    longitude, 
    loading: locationLoading, 
    error: locationError, 
    permissionState, 
    requestLocation 
  } = useGeolocation();

  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [favoritePlaceIds, setFavoritePlaceIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const savedFavorites = localStorage.getItem('favoritePlaceIds');
      return savedFavorites ? JSON.parse(savedFavorites) : [];
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('favoritePlaceIds', JSON.stringify(favoritePlaceIds));
    }
  }, [favoritePlaceIds]);

  const toggleFavoritePlace = (placeId: string) => {
    setFavoritePlaceIds(prevIds => {
      if (prevIds.includes(placeId)) {
        console.log(`MapView: Removing place ${placeId} from favorites.`);
        return prevIds.filter(id => id !== placeId);
      } else {
        console.log(`MapView: Adding place ${placeId} to favorites.`);
        return [...prevIds, placeId];
      }
    });
  };

  useEffect(() => {
    const checkGoogleMapsLoaded = () => {
      if (
        typeof window.google !== 'undefined' &&
        typeof window.google.maps !== 'undefined' &&
        typeof window.google.maps.Map === 'function' &&
        typeof window.google.maps.Marker === 'function' &&
        typeof window.google.maps.SymbolPath !== 'undefined' &&
        typeof window.google.maps.Animation !== 'undefined'
      ) {
        setGoogleMapsLoaded(true);
      } else {
        setTimeout(checkGoogleMapsLoaded, 200);
      }
    };

    if (typeof window !== 'undefined') {
      checkGoogleMapsLoaded();
    }
  }, []);

  useEffect(() => {
    if (googleMapsLoaded && (permissionState === 'prompt' || (permissionState === 'pending' && !locationLoading))) {
      console.log("MapView: Showing permission dialog because state is:", permissionState);
      setShowPermissionDialog(true);
    } else {
      setShowPermissionDialog(false);
    }
  }, [permissionState, googleMapsLoaded, locationLoading]);
  
  const fetchPlaceDetails = useCallback(async (placeId: string, currentMap: any) => {
    if (!currentMap || !window.google || !window.google.maps || !window.google.maps.places) {
      console.error("MapView: PlacesService or map not available for fetching details.");
      setInitializationError("場所情報サービスの準備ができていません。");
      return;
    }

    const placesService = new window.google.maps.places.PlacesService(currentMap);
    const request = {
      placeId: placeId,
      fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types', 'icon_background_color', 'icon_mask_base_uri'],
    };

    console.log("MapView: Fetching details for Place ID:", placeId);
    setInitializationError(null);

    placesService.getDetails(request, (
      place: google.maps.places.PlaceResult | null,
      status: google.maps.places.PlacesServiceStatus
    ) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
        console.log("MapView: Place details received:", place);
        
        if (place.types && (place.types.includes('supermarket') || place.types.includes('store') || place.types.includes('grocery_or_supermarket') || place.types.includes('department_store') || place.types.includes('convenience_store') || place.types.includes('shopping_mall'))) {
          console.log("MapView: Clicked POI is a relevant store type. Proceeding.");
          const storeData: Partial<Store> = {
            id: place.place_id || '',
            name: place.name || '名称不明',
            address: place.formatted_address || '住所不明',
            latitude: place.geometry?.location?.lat() || 0,
            longitude: place.geometry?.location?.lng() || 0,
            hasDiscount: false, 
            openStatus: undefined,
            distance: 0,
            posts: 0,
          };
          setSelectedStore(storeData as Store);
        } else {
          console.log("MapView: Clicked POI is NOT a relevant store type. Types:", place.types);
          setSelectedStore(null);
        }
      } else {
        console.error("MapView: PlacesService getDetails failed. Status:", status);
        setInitializationError(`場所情報の取得に失敗しました: ${status}`);
        setSelectedStore(null);
      }
    });
  }, []);

  useEffect(() => {
    console.log("MapView Init Effect: TOP LEVEL TRIGGER. Deps:", { latitude, longitude, googleMapsLoaded, permissionState, mapInitialized, mapNodeExists: !!mapNode });

    if (!mapNode || !googleMapsLoaded || permissionState !== 'granted' || !latitude || !longitude) {
      // 各スキップ条件のログは個別に出力されるのでここでは省略
      return;
    }
    
    console.log("MapView Init Effect: All basic conditions met. Checking dimensions and API.");

    if (typeof window.google === 'undefined' || typeof window.google.maps === 'undefined' || typeof window.google.maps.Map !== 'function') {
      console.error("MapView Init Effect: Google Maps API not available!");
      setInitializationError("Google Maps APIの関数が利用できません。");
      return;
    }

    if (mapNode.offsetParent === null || mapNode.clientHeight === 0) {
        console.warn("MapView Init Effect: Map container not visible or has zero height.");
        setInitializationError("マップコンテナが非表示、または高さが0のためマップを表示できません。");
        return;
    }

    setInitializationError(null);
    console.log("MapView Init Effect: Dimensions OK. Creating map.");

    try {
      const mapOptions = {
        center: { lat: latitude, lng: longitude },
        zoom: 15,
        // styles: [{ featureType: "poi.business", stylers: [{ visibility: "off" }] }], // ← この行をコメントアウトまたは削除
        disableDefaultUI: true,
        zoomControl: true,
        mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID,
      };
      
      const newMap = new window.google.maps.Map(mapNode, mapOptions);
      setMap(newMap); // ★★★ newMapインスタンス作成直後にsetMapを呼ぶ
      console.log("MapView Init Effect: new google.maps.Map() created and set to state.");

      newMap.addListener('click', async (event: any) => {
        if (event.placeId) {
          console.log('MapView: POI clicked! Place ID:', event.placeId);
          fetchPlaceDetails(event.placeId, newMap); // fetchPlaceDetailsを呼び出し
          event.stop(); 
        } else {
          console.log('MapView: Map clicked at non-POI location.');
          setSelectedStore(null); 
        }
      });
      console.log("MapView Init Effect: Click listener added to map.");

      const tilesLoadedListener = newMap.addListener('tilesloaded', () => {
          console.log("MapView Init Effect: 'tilesloaded' event fired.");
          setMapInitialized(true);
          console.log("MapView Init Effect: Map fully initialized (tiles loaded).");
          
          // ▼▼▼ 現在地マーカーの作成処理を復活・修正 ▼▼▼
          if (latitude && longitude) { // 緯度経度がある場合のみマーカー作成
            // 星形のSVGパスデータ (M = moveto, L = lineto, Z = closepath)
            // 簡単な5角星のパス（調整が必要な場合があります）
            const starPath = 'M 12,2 L 14.47,8.53 L 21.84,8.53 L 15.69,13.47 L 18.16,20 L 12,15.47 L 5.84,20 L 8.31,13.47 L 2.16,8.53 L 9.53,8.53 L 12,2 Z';

            new window.google.maps.Marker({
              position: { lat: latitude, lng: longitude },
              map: newMap,
              title: "あなたの現在地",
              icon: {
                path: starPath,
                fillColor: '#FFC107', // 星の色 (黄色系)
                fillOpacity: 1,
                strokeColor: '#B38600', // 星の輪郭色
                strokeWeight: 1,
                scale: 1.5, // 星の大きさ
                anchor: new window.google.maps.Point(12, 12), // SVGの中心に依存 (上記パスは24x24 viewBoxを想定)
              },
              zIndex: 1000 // 他のPOIより手前に表示
            });
            console.log("MapView: Current location marker (star) added.");
          }
          // ▲▲▲ 現在地マーカーここまで ▲▲▲
          
          if (tilesLoadedListener) tilesLoadedListener.remove();
      });

      const initTimeout = setTimeout(() => {
        if (!mapInitialized) {
          console.error("MapView Init Effect: Map initialization timed out.");
          setInitializationError("マップタイルの読み込みがタイムアウトしました。");
          setMapInitialized(false); // タイムアウト時も初期化状態を更新
          if (tilesLoadedListener) tilesLoadedListener.remove();
        }
      }, 15000);
    
      return () => {
        console.log("MapView Init Effect: CLEANUP. mapInitialized:", mapInitialized);
        clearTimeout(initTimeout);
        if (tilesLoadedListener) tilesLoadedListener.remove();
        // newMap のイベントリスナーもここでクリーンアップすることが推奨されるが、
        // Google Maps APIのリスナー削除は newMap.google.maps.event.clearInstanceListeners(newMap) のように行う。
        // ただし、コンポーネントがアンマウントされるときにマップインスタンス自体が破棄されるなら不要な場合も。
      };

    } catch (e: any) {
      console.error("MapView Init Effect: Error during map setup:", e);
      setInitializationError(`マップ初期化エラー: ${e.message || String(e)}`);
      setMapInitialized(false);
    }
    
  }, [
    latitude, 
    longitude, 
    googleMapsLoaded, 
    permissionState, 
    mapInitialized, // mapInitializedの変更で再実行されるのは意図通りか確認 (通常は初期化は一度だけ)
    mapNode,
    fetchPlaceDetails // fetchPlaceDetailsを依存配列に追加
    // setMap はステートセッターなので依存配列に不要
  ]);
  
  const handleCurrentLocation = () => {
    if (!map || !latitude || !longitude || typeof window.google === 'undefined' || typeof window.google.maps === 'undefined') return;
    map.panTo({ lat: latitude, lng: longitude });
    map.setZoom(15);
  };

  const handleAllowLocation = () => {
    console.log("MapView: User clicked 'Allow' location.");
    requestLocation();
    setShowPermissionDialog(false);
  };

  const handleDenyLocation = () => {
    console.log("MapView: User clicked 'Deny' location.");
    setShowPermissionDialog(false);
  };

  // 汎用的なメッセージ表示コンポーネント (カード形式)
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

  useEffect(() => {
    // permissionState が 'granted' で、かつ緯度経度がまだなく、ローディング中でもない場合
    if (permissionState === 'granted' && !latitude && !longitude && !locationLoading && !initializationError) {
      console.log("MapView: Permission is granted, but no location yet. Requesting location automatically.");
      requestLocation();
    }
  }, [permissionState, latitude, longitude, locationLoading, requestLocation, initializationError]);

  // --- UIレンダリング ---
  console.log("MapView: Component rendering or re-rendering END - Before return statement. Current state:", {permissionState, latitude, longitude, mapInitialized, initializationError, mapNodeExists: !!mapNode, favoritePlaceIds});
  return (
    <div className="h-full w-full relative"> {/* 親コンテナ */}
      {/* マップコンテナは常にレンダリングしておく */}
      <div 
        id="map-container-for-ref" 
        ref={mapRefCallback} 
        className="w-full h-full bg-slate-100" // 初期はただの背景
      />

      {/* ローディング、エラー、許可待ちなどのメッセージをオーバーレイ表示 */}
      {(() => {
        if (!googleMapsLoaded) {
          return <MessageCard title="マップ準備中..." message="APIをロードしています..." />;
        }
        if (showPermissionDialog && (permissionState === 'prompt' || permissionState === 'pending')) {
          return (
            <AlertDialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
              <AlertDialogContent className="max-w-sm">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-lg font-semibold text-center">
                    <MapPin className="inline-block h-6 w-6 mr-2 mb-1 text-primary" />
                    位置情報の利用許可
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-center pt-2">
                    より正確なサービス提供のため、現在地の位置情報の利用を許可していただけますか？
                    <br />
                    <span className="text-xs text-muted-foreground mt-1 block">
                      許可しない場合でも、一部機能をご利用いただけます。
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
                  <AlertDialogCancel onClick={handleDenyLocation} className="w-full sm:w-auto">許可しない</AlertDialogCancel>
                  <AlertDialogAction onClick={handleAllowLocation} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">許可する</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          );
        }
        if (locationLoading && permissionState !== 'granted' && permissionState !== 'denied' && permissionState !== 'unavailable') {
          return <MessageCard icon={Compass} title="位置情報取得中..." message="現在地を特定しています..." />;
        }
        if (permissionState === 'unavailable' || permissionState === 'denied' || (locationError && !locationLoading) || (permissionState === 'granted' && (!latitude || !longitude) && !locationLoading && !initializationError) ) {
          
          // ▼▼▼ getErrorMessage 関数をここで定義 ▼▼▼
          const getErrorMessage = (): string => {
            if (locationError) return locationError;
            if (permissionState === 'denied') return "位置情報の利用がブロックされています。ブラウザまたは端末のアプリ設定をご確認ください。";
            if (permissionState === 'unavailable') return "お使いの環境では位置情報を取得できません。";
            if (permissionState === 'granted' && (!latitude || !longitude)) return "位置情報の利用は許可されましたが、座標を取得できませんでした。GPSの受信状況やネットワーク接続を確認し、再度お試しください。";
            return "マップ情報を表示できませんでした。問題が解決しない場合は、しばらくしてから再読み込みしてください。";
          };
          // ▲▲▲ getErrorMessage 関数定義ここまで ▲▲▲

          return <MessageCard icon={AlertTriangle} title="マップ情報を表示できません" message={getErrorMessage()} variant="destructive">
            {/* 再試行ボタン等のchildrenはここに追加 */}
            {(permissionState !== 'unavailable' && permissionState !== 'denied') && (
                <Button onClick={requestLocation} size="lg" className="mt-6 w-full sm:w-auto">
                    <Compass className="h-5 w-5 mr-2" />
                    位置情報を再取得
                </Button>
            )}
            <p className="text-xs text-muted-foreground mt-6">
                デバッグ情報: Perm: {permissionState}, Lat: {latitude ? 'OK' : 'NG'}, Lng: {longitude ? 'OK' : 'NG'}, API: {googleMapsLoaded ? 'OK' : 'NG'}, Init: {mapInitialized ? 'OK' : 'NG'}, Err: {locationError || 'なし'}
            </p>
          </MessageCard>;
        }
        if (permissionState === 'granted' && latitude && longitude && googleMapsLoaded) {
          if (initializationError) {
            return <MessageCard icon={AlertTriangle} title="マップ初期化エラー" message={initializationError} variant="destructive"> {/* ... 再読み込みボタン ... */} </MessageCard>;
          }
          if (!mapInitialized) {
            return <MessageCard icon={MapPin} title="マップを初期化中..." message="地図データを読み込んでいます..." />;
          }
          // mapInitialized が true なら、マップは map-container-for-ref の中に描画されているはずなので、
          // このブロックでは何も表示しないか、マップ上のUI (selectedStoreなど) を表示する
          return null; 
        }
        // フォールバック (予期せぬ状態)
        return <MessageCard icon={AlertTriangle} title="問題が発生しました" message="現在マップを表示できません。ページを再読み込みしてください。" variant="warning"> {/* ... 再読み込みボタン ... */} </MessageCard>;
      })()}

      {/* 新しいDialogベースのStoreInfoCard表示 */}
      {selectedStore && !initializationError && (
        <Dialog open={!!selectedStore} onOpenChange={(isOpen) => { if (!isOpen) setSelectedStore(null); }}>
          <DialogContent
            className="w-[90vw] max-w-[500px] rounded-lg 
                       fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                       flex flex-col  /* flex-colを追加 */
                       max-h-[85vh]    /* DialogContent自体に最大高さを設定 (例: 85vh) */
                       overflow-hidden /* DialogContent自体がはみ出さないように */
                       p-0            /* パディングは内部で管理 */
                      "
            aria-describedby={selectedStore.address ? "store-address-description" : undefined}
          >
            <DialogHeader className="p-4 pb-0 shrink-0"> {/* ヘッダーは縮まない */}
              <DialogTitle>{selectedStore.name}</DialogTitle>
              {selectedStore.address && (
                <DialogDescription id="store-address-description">
                  {selectedStore.address}
                </DialogDescription>
              )}
            </DialogHeader>
            {/* このdivがコンテンツエリアで、ここがスクロールする */}
            <div className="p-4 overflow-y-auto grow"> {/* growで残りの高さを取る */}
              <StoreInfoCard
                store={selectedStore}
                isFavorite={favoritePlaceIds.includes(selectedStore.id)}
                onToggleFavorite={() => toggleFavoritePlace(selectedStore.id)}
                onClose={() => setSelectedStore(null)}
              />
            </div>
            <DialogFooter className="p-4 pt-0 shrink-0"> {/* フッターは縮まない */}
              <Button variant="outline" onClick={() => setSelectedStore(null)}>閉じる</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* マップが初期化された後に表示するUI (selectedStoreカードや現在地ボタンなど) */}
      {mapInitialized && map && ( 
        <>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className={`absolute right-4 top-4 z-10 ${permissionState !== 'granted' ? 'cursor-not-allowed' : ''}`}>
                  <Button
                    variant="default"
                    size="icon"
                    className="bg-background/80 backdrop-blur-sm rounded-full"
                    onClick={handleCurrentLocation}
                    disabled={locationLoading || permissionState !== 'granted'}
                    aria-label="現在地に戻る"
                  >
                    <Compass className="h-5 w-5" />
                  </Button>
                </span>
              </TooltipTrigger>
              {/* Tooltipを表示する条件: ローディング中、または許可がない、または許可はあるが座標がない場合 */}
              {(locationLoading || permissionState !== 'granted' || (permissionState === 'granted' && (!latitude || !longitude))) && (
                <TooltipContent side="bottom" className="max-w-xs">
                  {/* 各状態に応じたメッセージ出し分け */}
                  {locationLoading && <p>位置情報を読み込み中です...</p>}
                  {!locationLoading && permissionState === 'denied' && <p>位置情報の利用が拒否されています。ブラウザまたは端末の設定で許可してください。</p>}
                  {!locationLoading && permissionState === 'prompt' && <p>位置情報の利用がまだ許可されていません。許可ダイアログで「許可」を選択してください。</p>}
                  {!locationLoading && permissionState === 'pending' && <p>位置情報の許可を確認中です。</p>}
                  {!locationLoading && permissionState === 'unavailable' && <p>お使いの環境では位置情報を取得できません。</p>}
                  {!locationLoading && permissionState === 'granted' && (!latitude || !longitude) && <p>現在地を特定中です。しばらくお待ちください。</p>}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </>
      )}
    </div>
  );
}