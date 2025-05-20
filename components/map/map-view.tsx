"use client";

import { useRef, useEffect, useState } from 'react';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { StoreInfoCard } from '@/components/map/store-info-card';
import { mockStores } from '@/lib/mock-data';
import { Store } from '@/types/store';
import { Button } from '@/components/ui/button';
import { Compass } from 'lucide-react';

export function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const { latitude, longitude, loading: locationLoading } = useGeolocation();
  
  useEffect(() => {
    if (!mapRef.current || !latitude || !longitude) return;
    
    const mapOptions: google.maps.MapOptions = {
      center: { lat: latitude, lng: longitude },
      zoom: 14,
      styles: [
        {
          featureType: "poi.business",
          stylers: [{ visibility: "off" }],
        },
      ],
      disableDefaultUI: true,
      zoomControl: true,
    };
    
    const newMap = new google.maps.Map(mapRef.current, mapOptions);
    setMap(newMap);
    
    // Add current location marker
    new google.maps.Marker({
      position: { lat: latitude, lng: longitude },
      map: newMap,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#FF6B35",
        fillOpacity: 1,
        strokeColor: "#FFFFFF",
        strokeWeight: 2,
      },
    });
    
    // Add store markers
    const newMarkers = mockStores.map(store => {
      const marker = new google.maps.Marker({
        position: { lat: store.latitude, lng: store.longitude },
        map: newMap,
        title: store.name,
        animation: google.maps.Animation.DROP,
        icon: {
          url: store.hasDiscount 
            ? "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
            : "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        },
      });
      
      marker.addListener("click", () => {
        setSelectedStore(store);
      });
      
      return marker;
    });
    
    setMarkers(newMarkers);
    
    return () => {
      newMarkers.forEach(marker => marker.setMap(null));
    };
  }, [latitude, longitude]);
  
  const handleCurrentLocation = () => {
    if (!map || !latitude || !longitude) return;
    
    map.panTo({ lat: latitude, lng: longitude });
    map.setZoom(15);
  };

  return (
    <div className="h-full relative">
      <div ref={mapRef} className="w-full h-full" />
      
      <Button
        variant="default"
        size="sm"
        className="absolute right-4 top-4 z-10 bg-background/80 backdrop-blur-sm"
        onClick={handleCurrentLocation}
      >
        <Compass className="h-4 w-4 mr-2" />
        現在地
      </Button>
      
      {selectedStore && (
        <div className="absolute bottom-4 left-4 right-4">
          <StoreInfoCard 
            store={selectedStore} 
            onClose={() => setSelectedStore(null)} 
          />
        </div>
      )}
    </div>
  );
}