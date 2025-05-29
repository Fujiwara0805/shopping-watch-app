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
import { LocationPermissionDialog } from '@/components/common/LocationPermissionDialog';
import { MapSearchControl } from './MapSearchControl';
import { motion } from 'framer-motion';

declare global {
  interface Window {
    google: any;
  }
}

export function MapView() {
  console.log("MapView: Component rendering or re-rendering START");
  const { isLoaded: googleMapsLoaded, loadError: googleMapsLoadError } = useGoogleMapsApi();

  const mapContainerRef = useRef<HTMLDivElement | null>(null); 

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const { 
    latitude, 
    longitude, 
    loading: locationLoading, 
    error: locationError, 
    permissionState, 
    requestLocation 
  } = useGeolocation();

  const [showCustomPermissionDialog, setShowCustomPermissionDialog] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [selectedPlaceMarker, setSelectedPlaceMarker] = useState<google.maps.Marker | null>(null);
  const [distanceToSelectedPlace, setDistanceToSelectedPlace] = useState<string | null>(null);
  const [userLocationMarker, setUserLocationMarker] = useState<google.maps.Marker | null>(null);

  useEffect(() => {
    if (permissionState === 'prompt' || (permissionState === 'denied' && !locationError?.includes("ブロックされて") && !locationError?.includes("利用できません"))) {
      setShowCustomPermissionDialog(true);
    } else {
      setShowCustomPermissionDialog(false);
    }
  }, [permissionState, locationError]);

  const handleAllowLocation = (option: 'once' | 'while-using') => {
    setShowCustomPermissionDialog(false);
    if (permissionState !== 'granted') {
        requestLocation();
    }
  };

  const handleDenyLocation = () => {
    setShowCustomPermissionDialog(false);
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
    if (permissionState === 'granted' && !latitude && !longitude && !locationLoading && !map && !initializationError) {
      console.log("MapView: Requesting location as permission is granted but no coordinates yet.");
      requestLocation();
    }
  }, [permissionState, latitude, longitude, locationLoading, map, initializationError, requestLocation]);

  useEffect(() => {
    if (googleMapsLoaded && mapContainerRef.current && !map && !googleMapsLoadError) { 
      console.log("MapView: Initializing map (mapContainerRef.current is available).");
      setInitializationError(null); 

      let initialCenter: google.maps.LatLngLiteral = { lat: 35.6809591, lng: 139.7673068 }; // デフォルトを東京駅に戻す
      if (latitude && longitude) {
        initialCenter = { lat: latitude, lng: longitude };
      } else if (permissionState === 'granted' && !locationLoading) {
        console.log("MapView: Permission granted, but location not yet available for initial center. Map will center on default, may re-center later.");
      } else if (permissionState !== 'granted' && permissionState !== 'pending') {
         console.log("MapView: Location permission not granted. Centering on default for initial center.");
      }

      try {
        const mapOptions: google.maps.MapOptions = {
          center: initialCenter,
          zoom: (latitude && longitude) ? 15 : 10, // 初期ズームも元に戻す
          clickableIcons: true,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
        };
        
        const newMapInstance = new window.google.maps.Map(mapContainerRef.current, mapOptions);
        setMap(newMapInstance);
        setMapInitialized(true);
        console.log("MapView: Map initialized successfully.");

      } catch (error) {
        console.error("MapView: Error initializing map:", error);
        setInitializationError(`地図の初期化に失敗しました。${error instanceof Error ? error.message : String(error)}`);
        setMapInitialized(false);
      }
    } else if (googleMapsLoadError) {
        console.error("MapView: Google Maps API load error:", googleMapsLoadError.message);
        setInitializationError(`地図APIの読み込みに失敗しました: ${googleMapsLoadError.message}`);
    } else if (googleMapsLoaded && !mapContainerRef.current && !map) { // mapInitialized条件を削除
        console.warn("MapView: Google Maps loaded, but mapContainerRef.current is STILL not available.");
    }
  }, [googleMapsLoaded, map, latitude, longitude, permissionState, locationLoading, googleMapsLoadError]); // 依存配列からmapInitializedを削除

  useEffect(() => {
    if (map && latitude && longitude) {
      // このuseEffectは空のままでしたが、念のため残します。
    }
  }, [map, latitude, longitude]);

  useEffect(() => {
    if (map && latitude && longitude) {
      if (userLocationMarker) {
        userLocationMarker.setPosition(new window.google.maps.LatLng(latitude, longitude));
      } else {
        const newUserLocationMarker = new window.google.maps.Marker({
          position: { lat: latitude, lng: longitude },
          map: map,
          title: "あなたの現在地",
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#4285F4",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "white",
          }
        });
        setUserLocationMarker(newUserLocationMarker);
      }
      
      console.log("MapView: User location updated, recentering map and setting/updating user marker.");
      map.panTo(new window.google.maps.LatLng(latitude, longitude));
      const currentZoom = map.getZoom(); // undefinedチェックを元に戻します
      if (currentZoom !== undefined && currentZoom < 15) { // undefinedチェックは残した方が安全ですが、元に戻す指示なので厳密には前の状態に
        map.setZoom(15);
      }
    } else if (userLocationMarker) {
      userLocationMarker.setMap(null);
      setUserLocationMarker(null);
    }
  }, [map, latitude, longitude, userLocationMarker]);

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

  console.log("MapView: Component rendering or re-rendering END - Before return statement. Current state:", {permissionState, latitude, longitude, mapInitialized, initializationError, mapContainerRefExists: !!mapContainerRef.current, googleMapsLoaded});

  if (googleMapsLoadError) {
    return <MessageCard title="エラー" message={`地図の読み込みに失敗しました: ${googleMapsLoadError.message}`} variant="destructive" icon={AlertTriangle} />;
  }
  
  // ローディング表示のロジックを元に戻す
  if (!mapInitialized && !initializationError) {
    if (!googleMapsLoaded) {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="ml-2 text-muted-foreground">地図サービスを準備中...</p>
            </div>
        );
    }
    // mapContainerRef.current のチェックを元に戻す
    if (!mapContainerRef.current && googleMapsLoaded) {
         return (
            <div className="relative h-full w-full">
                <div ref={mapContainerRef} id="map-canvas" className="h-full w-full bg-muted" />
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20">
                    <p className="text-muted-foreground">地図表示エリアを準備中...</p>
                </div>
            </div>
         );
    }
    if (locationLoading && permissionState === 'granted') {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="ml-2 text-muted-foreground">現在位置を取得中...</p>
            </div>
        );
    }
     return (
        <div className="relative h-full w-full">
            <div ref={mapContainerRef} id="map-canvas" className="h-full w-full bg-muted" />
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="ml-2 text-muted-foreground">地図を準備中...</p>
            </div>
        </div>
    );
  }
  
  if (initializationError) {
     return <MessageCard title="初期化エラー" message={initializationError} variant="destructive" icon={AlertTriangle} />;
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainerRef} id="map-canvas" className="h-full w-full bg-muted" />

      {/* MapSearchControl の位置を元に戻す */}
      {map && googleMapsLoaded && (
        <MapSearchControl
          map={map}
          userLocation={latitude && longitude ? new google.maps.LatLng(latitude, longitude) : null}
          onPlaceSelected={handlePlaceSelected}
          onSearchError={handleSearchError}
        />
      )}
      
      <LocationPermissionDialog
        isOpen={showCustomPermissionDialog}
        onAllow={handleAllowLocation}
        onDeny={handleDenyLocation}
        appName="お惣菜ウォッチャー" 
      />
      
      {permissionState === 'denied' && !showCustomPermissionDialog && locationError && ( // !initializationError 条件を削除
         <MessageCard 
            title="位置情報を取得できません" 
            message={locationError} 
            variant="warning" 
            icon={MapPin}
          >
            <Button onClick={requestLocation}>再度許可を求める</Button>
         </MessageCard>
      )}

      {selectedPlace && selectedPlace.geometry && map && (
        <motion.div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-10 p-4 bg-background rounded-xl shadow-xl flex items-center justify-between"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div>
            <h3 className="font-semibold text-lg">{selectedPlace.name}</h3>
            {distanceToSelectedPlace && (
              <p className="text-sm text-muted-foreground">
                現在地からの距離: {distanceToSelectedPlace}
              </p>
            )}
            <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-xs">
                {selectedPlace.formatted_address}
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => openGoogleMapsNavigation(selectedPlace)}
            className="flex-shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground ml-2"
            aria-label="Googleマップで経路を表示"
          >
            <Navigation className="h-5 w-5 mr-2" />
            経路
          </Button>
        </motion.div>
      )}
    </div>
  );
}