"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';

interface GoogleMapsApiContextType {
  isLoaded: boolean;
  loadError: Error | null;
  isLoading: boolean;
}

const GoogleMapsApiContext = createContext<GoogleMapsApiContextType | undefined>(undefined);

export const useGoogleMapsApi = (): GoogleMapsApiContextType => {
  const context = useContext(GoogleMapsApiContext);
  if (!context) {
    throw new Error('useGoogleMapsApi must be used within a GoogleMapsApiProvider');
  }
  return context;
};

interface GoogleMapsApiProviderProps {
  children: ReactNode;
  apiKey: string;
}

const SCRIPT_ID = "google-maps-api-script";
const CALLBACK_NAME = "initGoogleMapsApiGlobal";

export const GoogleMapsApiProvider: React.FC<GoogleMapsApiProviderProps> = ({ children, apiKey }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // 初期化状態を追跡するRef
  const initStateRef = useRef({
    scriptLoaded: false,
    initAttempted: false,
    currentApiKey: null as string | null
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!apiKey || apiKey.trim() === '') {
      setLoadError(new Error("Google Maps API key is missing."));
      setIsLoading(false);
      return;
    }

    // Already loaded
    if (window.google?.maps?.Map && initStateRef.current.currentApiKey === apiKey) {
      setIsLoaded(true);
      setIsLoading(false);
      return;
    }

    if (initStateRef.current.initAttempted && initStateRef.current.currentApiKey !== apiKey) {
      setLoadError(new Error("Cannot reload Google Maps API with different API key"));
      setIsLoading(false);
      return;
    }

    // Already initializing — wait via event listener (no polling)
    if (initStateRef.current.initAttempted && initStateRef.current.currentApiKey === apiKey) {
      setIsLoading(true);
      const onLoaded = () => { setIsLoaded(true); setIsLoading(false); };
      window.addEventListener('google-maps-api-loaded', onLoaded, { once: true });
      const timeout = setTimeout(() => {
        window.removeEventListener('google-maps-api-loaded', onLoaded);
        if (!isLoaded) {
          setLoadError(new Error("Google Maps API load timeout"));
          setIsLoading(false);
          initStateRef.current.initAttempted = false;
          initStateRef.current.currentApiKey = null;
        }
      }, 15000);
      return () => { clearTimeout(timeout); window.removeEventListener('google-maps-api-loaded', onLoaded); };
    }

    // New initialization
    initStateRef.current.initAttempted = true;
    initStateRef.current.currentApiKey = apiKey;
    setIsLoading(true);
    setLoadError(null);
    setIsLoaded(false);

    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) existingScript.remove();
    if ((window as any)[CALLBACK_NAME]) delete (window as any)[CALLBACK_NAME];

    (window as any)[CALLBACK_NAME] = () => {
      if (window.google?.maps?.Map) {
        initStateRef.current.scriptLoaded = true;
        setIsLoaded(true);
        setIsLoading(false);
        setLoadError(null);
        window.dispatchEvent(new CustomEvent('google-maps-api-loaded'));
      } else {
        setLoadError(new Error("Google Maps API loaded but not fully available"));
        setIsLoading(false);
        initStateRef.current.initAttempted = false;
        initStateRef.current.currentApiKey = null;
      }
    };

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    const params = new URLSearchParams({
      key: apiKey, libraries: 'places,geometry', loading: 'async', callback: CALLBACK_NAME, v: 'weekly'
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;

    script.onerror = () => {
      setLoadError(new Error('Failed to load Google Maps API. Check API key, domain authorization, and billing.'));
      setIsLoading(false);
      initStateRef.current.initAttempted = false;
      initStateRef.current.currentApiKey = null;
      const failedScript = document.getElementById(SCRIPT_ID);
      if (failedScript) failedScript.remove();
      delete (window as any)[CALLBACK_NAME];
    };

    document.head.appendChild(script);

    const loadTimeout = setTimeout(() => {
      if (!initStateRef.current.scriptLoaded && !loadError) {
        setLoadError(new Error("Google Maps API load timeout."));
        setIsLoading(false);
        initStateRef.current.initAttempted = false;
        initStateRef.current.currentApiKey = null;
      }
    }, 20000);

    return () => clearTimeout(loadTimeout);
  }, [apiKey]);

  const contextValue = { isLoaded, loadError, isLoading };

  return (
    <GoogleMapsApiContext.Provider value={contextValue}>
      {children}
    </GoogleMapsApiContext.Provider>
  );
};