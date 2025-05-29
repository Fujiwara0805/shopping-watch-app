"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, MapPin as PinIcon, Navigation } from 'lucide-react'; // MapPin だと競合するので PinIcon
import { useGoogleMapsApi } from '@/components/providers/GoogleMapsApiProvider';

interface MapSearchControlProps {
  map: google.maps.Map | null;
  userLocation: google.maps.LatLng | null;
  onPlaceSelected: (
    place: google.maps.places.PlaceResult,
    distance: string | null
  ) => void;
  onSearchError?: (error: string) => void;
  className?: string;
}

export function MapSearchControl({
  map,
  userLocation,
  onPlaceSelected,
  onSearchError,
  className,
}: MapSearchControlProps) {
  const { isLoaded: isMapsApiLoaded, loadError } = useGoogleMapsApi();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (!isMapsApiLoaded || !inputRef.current || !map || loadError) {
      if (autocompleteRef.current && typeof google !== 'undefined' && google.maps && google.maps.event) {
         google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
      return;
    }
    
    if (autocompleteRef.current && typeof google !== 'undefined' && google.maps && google.maps.event) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
    }

    const autocompleteOptions: google.maps.places.AutocompleteOptions = {
      types: ['establishment', 'geocode'],
      componentRestrictions: { country: 'jp' },
      fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types', 'photos'],
    };

    if (map.getBounds()) {
      autocompleteOptions.bounds = map.getBounds() as google.maps.LatLngBounds;
      autocompleteOptions.strictBounds = false;
    }
    
    if (userLocation) {
        const circle = new google.maps.Circle({
            center: userLocation,
            radius: 50000, 
        });
        autocompleteOptions.bounds = circle.getBounds() as google.maps.LatLngBounds;
    }

    if (inputRef.current) {
        const newAutocomplete = new window.google.maps.places.Autocomplete(
          inputRef.current,
          autocompleteOptions
        );

        newAutocomplete.addListener('place_changed', () => {
          const place = newAutocomplete.getPlace();
          if (place && place.geometry && place.name) {
            setInputValue(place.name);
            let distanceText: string | null = null;
            if (userLocation && place.geometry.location) {
              const distance = google.maps.geometry.spherical.computeDistanceBetween(
                userLocation,
                place.geometry.location
              );
              distanceText = (distance / 1000).toFixed(1) + ' km';
            }
            onPlaceSelected(place, distanceText);
            inputRef.current?.blur();
          } else {
            if (onSearchError) {
              onSearchError("有効な場所が選択されませんでした。");
            }
          }
        });
        
        autocompleteRef.current = newAutocomplete;
    }
    
    return () => {
        if (autocompleteRef.current && typeof google !== 'undefined' && google.maps && google.maps.event) {
            google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
    };
  }, [isMapsApiLoaded, map, userLocation, onPlaceSelected, onSearchError, loadError]);

  const handleClearInput = () => {
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
    if (autocompleteRef.current) {
    }
  };
  
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  if (loadError) {
    return (
        <div className={`p-2 text-center text-xs text-destructive ${className}`}>
            検索機能の読み込みに失敗しました。
        </div>
    );
  }

  if (!isMapsApiLoaded) {
     return (
        <div className={`p-2 text-center text-xs text-muted-foreground ${className}`}>
            検索機能を読み込み中...
        </div>
    );
  }

  return (
    <motion.div
      className={`relative w-full ${className || ''}`}
      initial={{ y: 0, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative flex items-center bg-background rounded-full shadow-lg p-1.5">
        <Search className="h-5 w-5 text-muted-foreground ml-2.5 flex-shrink-0" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="お店やキーワードを検索"
          value={inputValue}
          onChange={handleInputChange}
          className="flex-grow bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base pl-2 pr-8 py-2 h-auto"
          disabled={!isMapsApiLoaded || !map}
        />
        {inputValue && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 p-0 rounded-full"
            onClick={handleClearInput}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}
