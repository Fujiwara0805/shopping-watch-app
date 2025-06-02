"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { LocationPermissionDialog } from '@/components/common/LocationPermissionDialog';

interface LocationPermissionContextType {
  permissionState: 'prompt' | 'granted' | 'denied' | 'unavailable' | 'pending';
  requestLocation: () => void;
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
}

const LocationPermissionContext = createContext<LocationPermissionContextType | undefined>(undefined);

export const useLocationPermission = (): LocationPermissionContextType => {
  const context = useContext(LocationPermissionContext);
  if (!context) {
    throw new Error('useLocationPermission must be used within a LocationPermissionProvider');
  }
  return context;
};

interface LocationPermissionProviderProps {
  children: ReactNode;
}

export function LocationPermissionProvider({ children }: LocationPermissionProviderProps) {
  const { latitude, longitude, loading, error, permissionState, requestLocation } = useGeolocation();
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [modalDismissedThisSession, setModalDismissedThisSession] = useState(false);

  useEffect(() => {
    console.log("LocationPermissionProvider useEffect: permissionState =", permissionState, "modalDismissedThisSession =", modalDismissedThisSession);

    if (permissionState === 'granted' || permissionState === 'unavailable' || permissionState === 'pending' || modalDismissedThisSession) {
      setShowPermissionModal(false);
      return;
    }

    if (permissionState === 'prompt' || permissionState === 'denied') {
      setShowPermissionModal(true);
    } 
  }, [permissionState, modalDismissedThisSession]);

  const handleAllowLocation = () => {
    setShowPermissionModal(false);
    setModalDismissedThisSession(true);
    requestLocation();
  };

  const handleDenyLocation = () => {
    setShowPermissionModal(false);
    setModalDismissedThisSession(true);
    console.log("Location access denied by user via modal.");
  };

  return (
    <LocationPermissionContext.Provider value={{ latitude, longitude, loading, error, permissionState, requestLocation }}>
      {children}
      <LocationPermissionDialog
        isOpen={showPermissionModal}
        onAllow={handleAllowLocation}
        onDeny={handleDenyLocation}
        appName="お惣菜ウォッチャー"
        permissionState={permissionState}
      />
    </LocationPermissionContext.Provider>
  );
}
