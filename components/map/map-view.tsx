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
    if (permissionState === 'prompt' || 
        (permissionState === 'denied' && 
         !locationError?.includes("ブロックされて") && 
         !locationError?.includes("利用できません") &&
         !locationError?.includes("User denied Geolocation")
        )) {
      console.log("MapView: setShowCustomPermissionDialog to true due to permissionState:", permissionState, "locationError:", locationError);
      setShowCustomPermissionDialog(true);
    } else {
      setShowCustomPermissionDialog(false);
    }
  }, [permissionState, locationError]);

  const handleAllowLocation = (option: 'once' | 'while-using') => {
    setShowCustomPermissionDialog(false);
    if (permissionState !== 'granted') {
        console.log("MapView: requestLocation called from handleAllowLocation");
        requestLocation();
    }
  };

  const handleDenyLocation = () => {
    setShowCustomPermissionDialog(false);
    console.log("MapView: Location denied via custom dialog.");
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
      console.log("MapView: Requesting location as permission is granted but no coordinates yet (useEffect 1).");
      requestLocation();
    }
  }, [permissionState, latitude, longitude, locationLoading, map, initializationError, requestLocation]);

  useEffect(() => {
    if (googleMapsLoaded && mapContainerRef.current && !map && !googleMapsLoadError && latitude && longitude) {
      console.log("MapView: Initializing map (all conditions met: googleMapsLoaded, mapContainerRef, no map, no loadError, location available).");
      setInitializationError(null);

      const initialCenter = { lat: latitude, lng: longitude };

      try {
        const mapOptions: google.maps.MapOptions = {
          center: initialCenter,
          zoom: 15,
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
    } else if (googleMapsLoaded && !mapContainerRef.current && !map && !mapInitialized) {
      console.warn("MapView: Google Maps loaded, but mapContainerRef.current is STILL not available (and map not initialized).");
    } else if (googleMapsLoaded && mapContainerRef.current && !map && !googleMapsLoadError && !(latitude && longitude) && (permissionState === 'denied' || (locationError && permissionState !== 'prompt'))) {
      console.warn("MapView: Cannot initialize map. Location permission denied or error, and not in prompt state. Location:", latitude, longitude, "Error:", locationError, "Permission:", permissionState);
       if (!initializationError) {
           setInitializationError("位置情報が利用できないため地図を表示できません。設定を確認し、再度お試しください。");
       }
    }
  }, [googleMapsLoaded, map, latitude, longitude, permissionState, locationLoading, googleMapsLoadError, mapInitialized]);

  useEffect(() => {
    if (map && latitude && longitude) {
      const userPosition = new window.google.maps.LatLng(latitude, longitude);
      if (userLocationMarker) {
        userLocationMarker.setPosition(userPosition);
      } else {
        // 星形のSVGパス (簡易的なもの)
        // viewBox="0 0 24 24" を想定したパス
        const starPath = "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";

        const newUserLocationMarker = new window.google.maps.Marker({
          position: userPosition,
          map: map,
          title: "あなたの現在地",
          icon: {
            path: starPath,
            fillColor: '#FFD700', // 金色に近い黄色
            fillOpacity: 1,
            strokeColor: '#B8860B', // 暗めの金色 (枠線)
            strokeWeight: 1,
            scale: 1.5, // アイコンのサイズ調整
            anchor: new window.google.maps.Point(12, 12), // SVGの中心点をアンカーに (viewBoxの中心)
          },
          // animation: window.google.maps.Animation.DROP, // 星アイコンの場合はDROPアニメーションは合わないかも
        });
        setUserLocationMarker(newUserLocationMarker);
      }

      console.log("MapView: User location updated, recentering map and setting/updating user marker.");
      map.panTo(userPosition);
      const currentZoom = map.getZoom();
      if (currentZoom !== undefined && currentZoom < 15) {
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

  console.log("MapView: Component rendering or re-rendering END - Before return statement. Current state:", {permissionState, latitude, longitude, mapInitialized, initializationError, mapContainerRefExists: !!mapContainerRef.current, googleMapsLoaded, locationLoading});

  if (googleMapsLoadError) {
    return <MessageCard title="エラー" message={`地図の読み込みに失敗しました: ${googleMapsLoadError.message}`} variant="destructive" icon={AlertTriangle} />;
  }

  if (initializationError && !mapInitialized) {
     return <MessageCard title="エラー" message={initializationError} variant="destructive" icon={AlertTriangle} />;
  }

  if (!googleMapsLoaded) {
    return (
      <div className="relative h-full w-full">
        <div ref={mapContainerRef} id="map-canvas-placeholder" className="h-full w-full bg-muted opacity-0 pointer-events-none" />
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="ml-2 text-muted-foreground">地図サービスを準備中...</p>
        </div>
      </div>
    );
  }

  if (locationLoading && !showCustomPermissionDialog && !mapInitialized && !initializationError) {
    return (
      <div className="relative h-full w-full">
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
        <div className="relative h-full w-full">
            <div ref={mapContainerRef} id="map-canvas" className="h-full w-full bg-muted" />
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="ml-2 text-muted-foreground">地図を準備中...</p>
            </div>
        </div>
    );
  }
  
  return (
    <div className="relative h-full w-full overflow-hidden">
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
      
      <LocationPermissionDialog
        isOpen={showCustomPermissionDialog}
        onAllow={handleAllowLocation}
        onDeny={handleDenyLocation}
        appName="お惣菜ウォッチャー" 
      />
      
      {permissionState === 'denied' && !showCustomPermissionDialog && locationError && (
         <MessageCard 
            title="位置情報を取得できません" 
            message={locationError}
            variant="warning" 
            icon={MapPin}
          >
            <Button onClick={() => { console.log("MapView: Retry permission clicked."); requestLocation(); }}>再度許可を求める</Button>
         </MessageCard>
      )}

      {initializationError && mapInitialized && (
          <MessageCard title="エラー" message={initializationError} variant="destructive" icon={AlertTriangle} />
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