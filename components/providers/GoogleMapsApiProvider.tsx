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

const SCRIPT_ID = "google-maps-api-script";
const CALLBACK_NAME = "initGoogleMapsApiGlobal";

// グローバルな状態フラグ
let scriptLoadInitiated = false;
let googleMapsApiLoaded = false;
let currentApiKey: string | null = null;

export const GoogleMapsApiProvider: React.FC<GoogleMapsApiProviderProps> = ({ children, apiKey }) => {
  const [isLoaded, setIsLoaded] = useState(googleMapsApiLoaded);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    console.log("GoogleMapsApiProvider: useEffect triggered with apiKey:", apiKey);
    console.log("Current flags - scriptLoadInitiated:", scriptLoadInitiated, "googleMapsApiLoaded:", googleMapsApiLoaded, "currentApiKey:", currentApiKey);

    // 既にAPIがロード済みで、使用したAPIキーも同じであれば何もしない
    if (googleMapsApiLoaded && currentApiKey === apiKey && window.google?.maps) {
      console.log("GoogleMapsApiProvider: API already loaded with the same key.");
      setIsLoaded(true);
      return;
    }

    // 既に別のAPIキーでロード試行/完了している場合はエラー
    if (scriptLoadInitiated && currentApiKey !== null && currentApiKey !== apiKey) {
        console.error("GoogleMapsApiProvider: Attempting to load API with a new key after initial load.");
        setLoadError(new Error("Google Maps API cannot be reloaded with a new API key."));
        return;
    }
    
    // 既にスクリプトロードが開始されている場合
    if (scriptLoadInitiated && currentApiKey === apiKey) {
        console.log("GoogleMapsApiProvider: Script load already initiated for this API key. Waiting...");
        
        // APIが既にロードされているかチェック
        if (window.google?.maps) {
            console.log("GoogleMapsApiProvider: API already available");
            setIsLoaded(true);
            googleMapsApiLoaded = true;
            return;
        }

        // ロード完了を待つポーリング
        const pollInterval = setInterval(() => {
            if (window.google?.maps) {
                console.log("GoogleMapsApiProvider: API loaded (polling).");
                setIsLoaded(true);
                googleMapsApiLoaded = true;
                clearInterval(pollInterval);
            }
        }, 100);
        
        const timeoutId = setTimeout(() => {
            clearInterval(pollInterval);
            if (!googleMapsApiLoaded) {
                console.warn("GoogleMapsApiProvider: Polling for API load timed out.");
                setLoadError(new Error("Google Maps API load timeout"));
            }
        }, 10000); // 10秒タイムアウト
        
        return () => { 
            clearInterval(pollInterval); 
            clearTimeout(timeoutId); 
        };
    }

    console.log("GoogleMapsApiProvider: Initiating script load for apiKey:", apiKey);
    scriptLoadInitiated = true;
    currentApiKey = apiKey;

    // 既存のスクリプトがあれば削除
    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) {
        existingScript.remove();
    }

    // グローバルコールバック関数を設定
    (window as any)[CALLBACK_NAME] = () => {
      console.log("GoogleMapsApiProvider: Global callback executed.");
      googleMapsApiLoaded = true;
      setIsLoaded(true);
      setLoadError(null);
      
      // カスタムイベントを発火（layout.tsxで監視）
      window.dispatchEvent(new CustomEvent('google-maps-api-loaded'));
    };

    // スクリプトを作成・追加
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&loading=async&callback=${CALLBACK_NAME}`;
    script.async = true;
    
    script.onerror = (event: Event | string) => {
      console.error("GoogleMapsApiProvider: Failed to load Google Maps API script.", event);
      setLoadError(new Error('Google Maps API script could not be loaded.'));
      setIsLoaded(false);
      googleMapsApiLoaded = false;
      scriptLoadInitiated = false;
      currentApiKey = null;

      // 失敗したスクリプトを削除
      const problematicScript = document.getElementById(SCRIPT_ID);
      if (problematicScript) problematicScript.remove();
      
      // グローバルコールバックを削除
      delete (window as any)[CALLBACK_NAME];
    };

    document.head.appendChild(script);
    console.log("GoogleMapsApiProvider: Script appended to head with src:", script.src);

  }, [apiKey]); // apiKeyを依存配列に含める

  return (
    <GoogleMapsApiContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsApiContext.Provider>
  );
};