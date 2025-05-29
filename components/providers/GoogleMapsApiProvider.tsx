"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface GoogleMapsApiContextType {
  isLoaded: boolean;
  loadError: Error | null;
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

const SCRIPT_ID = "google-maps-api-script"; // グローバルなスクリプトID

export const GoogleMapsApiProvider: React.FC<GoogleMapsApiProviderProps> = ({ children, apiKey }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return; // サーバーサイドでは実行しない

    // グローバルなコールバック関数名
    const CALLBACK_NAME = "initGoogleMapsApi";

    // 既にスクリプトが存在し、APIがロード済みか確認
    if (document.getElementById(SCRIPT_ID) && window.google && window.google.maps) {
      console.log("Google Maps API already loaded (Provider).");
      setIsLoaded(true);
      return;
    }
    
    // 既にロード試行中のスクリプトがあるか確認 (コールバックが設定されているかなど)
    if ((window as any)[CALLBACK_NAME] && document.getElementById(SCRIPT_ID)) {
        console.log("Google Maps API load already in progress (Provider).");
        // ロード完了を待つためにコールバックに再度フックする (より高度な制御が必要な場合)
        // もしくは、現状のままでコールバックが発火するのを待つ
        return;
    }


    (window as any)[CALLBACK_NAME] = () => {
      console.log("Google Maps API script loaded successfully (Provider callback).");
      setIsLoaded(true);
      setLoadError(null);
      delete (window as any)[CALLBACK_NAME]; // コールバックをクリーンアップ
    };

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${CALLBACK_NAME}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error("Failed to load Google Maps API script (Provider).");
      setLoadError(new Error('Google Maps API script could not be loaded.'));
      setIsLoaded(false); // ロード失敗
      delete (window as any)[CALLBACK_NAME]; // コールバックをクリーンアップ
    };

    document.head.appendChild(script);

    // クリーンアップ関数は、コンポーネントのアンマウント時ではなく、
    // 基本的には不要（スクリプトは一度ロードされたら残り続けるため）。
    // ただし、エラー時やHMR時などの挙動によっては調整が必要な場合もある。

  }, [apiKey]);

  return (
    <GoogleMapsApiContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsApiContext.Provider>
  );
}; 