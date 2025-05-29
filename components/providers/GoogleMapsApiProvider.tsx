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
let currentApiKey: string | null = null; // 読み込みに使用したAPIキーを記憶

export const GoogleMapsApiProvider: React.FC<GoogleMapsApiProviderProps> = ({ children, apiKey }) => {
  const [isLoaded, setIsLoaded] = useState(googleMapsApiLoaded);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    console.log("GoogleMapsApiProvider: useEffect triggered.");
    console.log("Current flags - scriptLoadInitiated:", scriptLoadInitiated, "googleMapsApiLoaded:", googleMapsApiLoaded, "currentApiKey:", currentApiKey, "props.apiKey:", apiKey);

    // 既にAPIがロード済みで、使用したAPIキーも同じであれば何もしない
    if (googleMapsApiLoaded && currentApiKey === apiKey) {
      console.log("GoogleMapsApiProvider: API already loaded with the same key.");
      setIsLoaded(true);
      return;
    }

    // 既に別のAPIキーでロード試行/完了している場合はエラーまたは警告
    if (scriptLoadInitiated && currentApiKey !== null && currentApiKey !== apiKey) {
        console.error("GoogleMapsApiProvider: Attempting to load API with a new key after initial load. This is not supported by the current script loading logic.");
        setLoadError(new Error("Google Maps API cannot be reloaded with a new API key."));
        // setIsLoaded(false); // 既にロードされているかもしれないので、falseにするかは要検討
        return;
    }
    
    // スクリプトロード処理を開始するのは scriptLoadInitiated が false の場合のみ
    if (scriptLoadInitiated) {
        console.log("GoogleMapsApiProvider: Script load already initiated. Waiting for it to complete if not already.");
        // ロード完了を待つポーリング (既にAPIがロードされている可能性もあるため)
        if (!googleMapsApiLoaded) {
            const pollInterval = setInterval(() => {
                if (window.google && window.google.maps) {
                    console.log("GoogleMapsApiProvider: API loaded (polling).");
                    setIsLoaded(true);
                    googleMapsApiLoaded = true;
                    // currentApiKey は最初のロード時に設定される
                    clearInterval(pollInterval);
                }
            }, 100);
            const timeoutId = setTimeout(() => {
                clearInterval(pollInterval);
                if (!googleMapsApiLoaded) console.warn("GoogleMapsApiProvider: Polling for API load timed out.");
            }, 5000);
            return () => { clearInterval(pollInterval); clearTimeout(timeoutId); };
        } else {
             setIsLoaded(true); // 既にロードされている
        }
        return;
    }

    console.log("GoogleMapsApiProvider: Initiating script load.");
    scriptLoadInitiated = true;
    currentApiKey = apiKey; // このAPIキーでロードすることを記録

    (window as any)[CALLBACK_NAME] = () => {
      console.log("GoogleMapsApiProvider: Global callback executed.");
      googleMapsApiLoaded = true;
      setIsLoaded(true);
      setLoadError(null);
    };

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    // loading=async を追加してみる
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=${CALLBACK_NAME}`;
    script.async = true; // defer より async の方が callback との組み合わせでは一般的
    // script.defer = true; // async と defer の両方指定は意味がないので defer は削除
    script.onerror = (event: Event | string) => {
      console.error("GoogleMapsApiProvider: Failed to load Google Maps API script.", event);
      setLoadError(new Error('Google Maps API script could not be loaded.'));
      setIsLoaded(false);
      googleMapsApiLoaded = false;
      scriptLoadInitiated = false; // 再試行の余地を残す
      currentApiKey = null;       // 使用したAPIキーもリセット

      const problematicScript = document.getElementById(SCRIPT_ID);
      if (problematicScript) problematicScript.remove();
      delete (window as any)[CALLBACK_NAME];
    };

    document.head.appendChild(script);
    console.log("GoogleMapsApiProvider: Script appended to head.");

    // useEffect の依存配列を空にすることで、このeffectは初回マウント時のみ実行される
    // (またはアンマウント後の再マウント時)
    // apiKeyが変更された場合の再ロードは現在のロジックでは対応していないことに注意
  }, []); // 依存配列を空にする！ (apiKey を削除)

  return (
    <GoogleMapsApiContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsApiContext.Provider>
  );
}; 