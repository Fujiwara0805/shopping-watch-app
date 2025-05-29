"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { StoreInfoCard } from '@/components/map/store-info-card';
import { Store } from '@/types/store';
import { Button } from '@/components/ui/button';
import { MapPin, AlertTriangle, List, X, Heart } from 'lucide-react';
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

declare global {
  interface Window {
    google: any;
  }
}

export function MapView() {
  console.log("MapView: Component rendering or re-rendering START");
  const { isLoaded: googleMapsLoaded, loadError: googleMapsLoadError } = useGoogleMapsApi();

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

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [favoriteMarkers, setFavoriteMarkers] = useState<any[]>([]);
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
    if (googleMapsLoaded && (permissionState === 'prompt' || (permissionState === 'pending' && !locationLoading))) {
      console.log("MapView: Showing permission dialog because state is:", permissionState);
      setShowPermissionDialog(true);
    } else {
      setShowPermissionDialog(false);
    }
  }, [permissionState, googleMapsLoaded, locationLoading]);
  
  const fetchPlaceDetails = useCallback(async (placeId: string, currentMap: google.maps.Map) => {
    if (!googleMapsLoaded || !currentMap || !window.google.maps.places) {
      console.error("MapView: PlacesService or map not available for fetching details. googleMapsLoaded:", googleMapsLoaded);
      setInitializationError("場所情報サービスの準備ができていません。");
      return;
    }

    const placesService = new window.google.maps.places.PlacesService(currentMap);
    const request: google.maps.places.PlaceDetailsRequest = {
      placeId: placeId,
      fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types', 'website', 'formatted_phone_number', 'photos', 'rating', 'user_ratings_total', 'icon'],
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
          
          const storeData: Store = {
            id: place.place_id || `temp-id-${Math.random()}`,
            name: place.name || '名称不明',
            address: place.formatted_address || '住所不明',
            latitude: place.geometry?.location?.lat() || 0,
            longitude: place.geometry?.location?.lng() || 0,
            types: place.types || [],
            hasDiscount: false, 
            phone: place.formatted_phone_number || '',
            posts: 0,
          };
          setSelectedStore(storeData);
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
  }, [googleMapsLoaded]);

  useEffect(() => {
    console.log("MapView Init Effect: TOP LEVEL TRIGGER. Deps:", { latitude, longitude, googleMapsLoaded, permissionState, mapInitialized, mapNodeExists: !!mapNode, googleMapsLoadError });

    if (googleMapsLoadError) {
        console.error("MapView Init Effect: Google Maps API failed to load.", googleMapsLoadError);
        setInitializationError(`Google Maps APIの読み込みに失敗しました: ${googleMapsLoadError.message}`);
        if (map) setMap(null);
        setMapInitialized(false);
        return;
    }

    if (!mapNode || !googleMapsLoaded || permissionState !== 'granted' || !latitude || !longitude) {
      if (!googleMapsLoaded) console.log("MapView Init Effect: SKIPPING - Google Maps API not loaded yet.");
      return;
    }
    
    if (mapNode.offsetParent === null || mapNode.clientHeight === 0) {
        console.warn("MapView Init Effect: Map container not visible or has zero height.");
        setInitializationError("マップコンテナが非表示、または高さが0のためマップを表示できません。");
        return;
    }

    if (!map && !mapInitialized) {
        console.log("MapView Init Effect: All conditions met. Creating map.");
        setInitializationError(null);
        try {
          const mapOptions: google.maps.MapOptions = {
            center: { lat: latitude, lng: longitude },
            zoom: 15,
            disableDefaultUI: true,
            zoomControl: true,
            mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID,
          };
          
          const newMap = new window.google.maps.Map(mapNode, mapOptions);
          setMap(newMap);
          console.log("MapView Init Effect: new google.maps.Map() created and set to state.");

          newMap.addListener('click', async (event: google.maps.MapMouseEvent | google.maps.IconMouseEvent) => {
            // Check if it's an IconMouseEvent which has placeId
            const iconEvent = event as google.maps.IconMouseEvent;
            if (iconEvent.placeId) {
              console.log('MapView: POI clicked! Place ID:', iconEvent.placeId);
              fetchPlaceDetails(iconEvent.placeId, newMap);
              if (iconEvent.stop) {
                iconEvent.stop();
              }
            } else {
              console.log('MapView: Map clicked at non-POI location.');
              setSelectedStore(null); 
            }
          });
          console.log("MapView Init Effect: Click listener added to map.");

          const tilesLoadedListener = newMap.addListener('tilesloaded', () => {
              console.log("MapView Init Effect: 'tilesloaded' event fired.");
              if (!mapInitialized) {
                setMapInitialized(true);
                console.log("MapView Init Effect: Map fully initialized (tiles loaded).");
              }
              if (latitude && longitude && newMap.getProjection()) {
                const starPath = 'M 12,2 L 14.47,8.53 L 21.84,8.53 L 15.69,13.47 L 18.16,20 L 12,15.47 L 5.84,20 L 8.31,13.47 L 2.16,8.53 L 9.53,8.53 L 12,2 Z';
                new window.google.maps.Marker({
                  position: { lat: latitude, lng: longitude },
                  map: newMap,
                  title: "あなたの現在地",
                  icon: {
                    path: starPath,
                    fillColor: '#FFC107',
                    fillOpacity: 1,
                    strokeColor: '#B38600',
                    strokeWeight: 1,
                    scale: 1.5,
                    anchor: new window.google.maps.Point(12, 12),
                  },
                });
              }
          });
        } catch (error: any) {
          console.error("MapView Init Effect: Error creating map:", error);
          setInitializationError(`マップの作成中にエラーが発生しました: ${error.message}`);
          if (map) setMap(null);
          setMapInitialized(false);
        }
    } else if (map && latitude && longitude) {
        console.log("MapView Init Effect: Map exists. Updating center.");
        map.setCenter({ lat: latitude, lng: longitude });
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mapNode, 
    googleMapsLoaded, 
    googleMapsLoadError,
    permissionState, 
    latitude, 
    longitude, 
    fetchPlaceDetails 
  ]);
  
  const handleAllowLocation = () => {
    console.log("MapView: User clicked 'Allow' location.");
    requestLocation();
    setShowPermissionDialog(false);
  };

  const handleDenyLocation = () => {
    console.log("MapView: User clicked 'Deny' location.");
    setShowPermissionDialog(false);
  };

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
    if (permissionState === 'granted' && !latitude && !longitude && !locationLoading && !initializationError) {
      console.log("MapView: Permission is granted, but no location yet. Requesting location automatically.");
      requestLocation();
    }
  }, [permissionState, latitude, longitude, locationLoading, requestLocation, initializationError]);

  useEffect(() => {
    if (!map || !googleMapsLoaded || !window.google || !window.google.maps) {
      return;
    }

    favoriteMarkers.forEach(marker => marker.setMap(null));
    setFavoriteMarkers([]);

    const newFavoriteMarkers: any[] = [];

    favoritePlaceIds.forEach(placeId => {
      const placesService = new window.google.maps.places.PlacesService(map);
      const request = {
        placeId: placeId,
        fields: ['name', 'geometry', 'place_id', 'types', /*その他必要なフィールド*/], 
      };

      placesService.getDetails(request, (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place && place.geometry && place.geometry.location) {
          const heartIcon = {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: 'red',
            fillOpacity: 0.8,
            strokeWeight: 0,
            rotation: 0,
            scale: 10,
            anchor: new window.google.maps.Point(0, 0),
          };
          
          const heartSvgPath = "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

          const marker = new window.google.maps.Marker({
            position: place.geometry.location,
            map: map,
            title: place.name || 'お気に入り店舗',
            icon: {
              path: heartSvgPath,
              fillColor: '#FF0000',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 0.5,
              scale: 1.2,
              anchor: new window.google.maps.Point(12, 12)
            },
            zIndex: 999
          });

          marker.addListener('click', () => {
            const storeData: Partial<Store> = {
              id: place.place_id || '',
              name: place.name || '名称不明',
              address: place.formatted_address || '住所不明',
              latitude: place.geometry?.location?.lat() || 0,
              longitude: place.geometry?.location?.lng() || 0,
            };
            fetchPlaceDetails(place.place_id!, map);
          });
          newFavoriteMarkers.push(marker);
        } else {
          console.error(`Failed to get details for favorite place ${placeId}. Status: ${status}`);
        }
      });
    });
    setFavoriteMarkers(newFavoriteMarkers);

  }, [map, googleMapsLoaded, favoritePlaceIds, fetchPlaceDetails]);

  console.log("MapView: Component rendering or re-rendering END - Before return statement. Current state:", {permissionState, latitude, longitude, mapInitialized, initializationError, mapNodeExists: !!mapNode, favoritePlaceIds});
  return (
    <div className="h-full w-full relative">
      <div 
        id="map-container-for-ref" 
        ref={mapRefCallback} 
        className="w-full h-full bg-slate-100"
      />

      {(() => {
        if (!googleMapsLoaded && !googleMapsLoadError) {
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
          return <MessageCard icon={MapPin} title="位置情報取得中..." message="現在地を特定しています..." />;
        }
        if (permissionState === 'unavailable' || permissionState === 'denied' || (locationError && !locationLoading) || (permissionState === 'granted' && (!latitude || !longitude) && !locationLoading && !initializationError) ) {
          
          const getErrorMessage = (): string => {
            if (locationError) return locationError;
            if (permissionState === 'denied') return "位置情報の利用がブロックされています。ブラウザまたは端末のアプリ設定をご確認ください。";
            if (permissionState === 'unavailable') return "お使いの環境では位置情報を取得できません。";
            if (permissionState === 'granted' && (!latitude || !longitude)) return "位置情報の利用は許可されましたが、座標を取得できませんでした。GPSの受信状況やネットワーク接続を確認し、再度お試しください。";
            return "マップ情報を表示できませんでした。問題が解決しない場合は、しばらくしてから再読み込みしてください。";
          };

          return <MessageCard icon={AlertTriangle} title="マップ情報を表示できません" message={getErrorMessage()} variant="destructive">
            {(permissionState !== 'unavailable' && permissionState !== 'denied') && (
                <Button onClick={requestLocation} size="lg" className="mt-6 w-full sm:w-auto">
                    <MapPin className="h-5 w-5 mr-2" />
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
            return <MessageCard icon={AlertTriangle} title="マップ初期化エラー" message={initializationError} variant="destructive"> </MessageCard>;
          }
          if (!mapInitialized) {
            return <MessageCard icon={MapPin} title="マップを初期化中..." message="地図データを読み込んでいます..." />;
          }
          return null; 
        }
        return <MessageCard icon={AlertTriangle} title="問題が発生しました" message="現在マップを表示できません。ページを再読み込みしてください。" variant="warning"> </MessageCard>;
      })()}

      {selectedStore && !initializationError && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm z-40">
          <div className="bg-card p-0 sm:p-0 rounded-xl shadow-2xl w-full max-w-md border relative flex flex-col max-h-[90vh] overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 rounded-full"
              onClick={() => setSelectedStore(null)}
              aria-label="閉じる"
            >
              <X className="h-5 w-5" />
            </Button>
            
            <div className="overflow-y-auto grow p-4 pt-8">
              <StoreInfoCard
                store={selectedStore}
                isFavorite={favoritePlaceIds.includes(selectedStore.id)}
                onToggleFavorite={() => toggleFavoritePlace(selectedStore.id)}
                onClose={() => setSelectedStore(null)} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}