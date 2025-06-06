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
  showPermissionModal: boolean;
  setShowPermissionModal: (show: boolean) => void;
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
  autoShowModal?: boolean; // 自動表示の制御オプション
}

export function LocationPermissionProvider({ 
  children, 
  autoShowModal = false // デフォルトで自動表示を無効化
}: LocationPermissionProviderProps) {
  const { latitude, longitude, loading, error, permissionState, requestLocation } = useGeolocation();
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [modalDismissedThisSession, setModalDismissedThisSession] = useState(false);

  useEffect(() => {
    console.log("LocationPermissionProvider useEffect: permissionState =", permissionState, "autoShowModal =", autoShowModal);

    // 自動表示が無効の場合は何もしない
    if (!autoShowModal) {
      setShowPermissionModal(false);
      return;
    }

    if (permissionState === 'granted' || permissionState === 'unavailable' || permissionState === 'pending' || modalDismissedThisSession) {
      setShowPermissionModal(false);
      return;
    }

    if (permissionState === 'prompt' || permissionState === 'denied') {
      setShowPermissionModal(true);
    } 
  }, [permissionState, modalDismissedThisSession, autoShowModal]);

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
    <LocationPermissionContext.Provider value={{ 
      latitude, 
      longitude, 
      loading, 
      error, 
      permissionState, 
      requestLocation,
      showPermissionModal,
      setShowPermissionModal
    }}>
      {children}
      {autoShowModal && (
        <LocationPermissionDialog
          isOpen={showPermissionModal}
          onAllow={handleAllowLocation}
          onDeny={handleDenyLocation}
          appName="トクドク"
          permissionState={permissionState}
        />
      )}
    </LocationPermissionContext.Provider>
  );
}