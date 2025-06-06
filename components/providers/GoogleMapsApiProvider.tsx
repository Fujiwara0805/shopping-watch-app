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

    console.log("GoogleMapsApiProvider: Initializing with apiKey:", apiKey ? "provided" : "missing");

    // APIキーの検証
    if (!apiKey || apiKey.trim() === '') {
      console.error("GoogleMapsApiProvider: API key is missing");
      setLoadError(new Error("Google Maps API key is missing. Please check your environment variables."));
      setIsLoading(false);
      return;
    }

    // 既にロード済みかチェック
    if (window.google?.maps?.Map && initStateRef.current.currentApiKey === apiKey) {
      console.log("GoogleMapsApiProvider: API already loaded");
      setIsLoaded(true);
      setIsLoading(false);
      return;
    }

    // 異なるAPIキーでの再ロード防止
    if (initStateRef.current.initAttempted && initStateRef.current.currentApiKey !== apiKey) {
      console.error("GoogleMapsApiProvider: Cannot reload with different API key");
      setLoadError(new Error("Cannot reload Google Maps API with different API key"));
      setIsLoading(false);
      return;
    }

    // 既に初期化中の場合は待機
    if (initStateRef.current.initAttempted && initStateRef.current.currentApiKey === apiKey) {
      console.log("GoogleMapsApiProvider: Initialization already in progress");
      setIsLoading(true);
      
      // ポーリングでAPIの可用性をチェック
      const checkApi = () => {
        if (window.google?.maps?.Map) {
          console.log("GoogleMapsApiProvider: API became available");
          setIsLoaded(true);
          setIsLoading(false);
        } else {
          setTimeout(checkApi, 200);
        }
      };
      
      setTimeout(checkApi, 100);
      
      // タイムアウト設定
      const timeout = setTimeout(() => {
        if (!isLoaded) {
          console.error("GoogleMapsApiProvider: Polling timeout");
          setLoadError(new Error("Google Maps API load timeout"));
          setIsLoading(false);
          // リセットして再試行可能にする
          initStateRef.current.initAttempted = false;
          initStateRef.current.currentApiKey = null;
        }
      }, 15000);

      return () => clearTimeout(timeout);
    }

    // 新しい初期化開始
    console.log("GoogleMapsApiProvider: Starting new initialization");
    initStateRef.current.initAttempted = true;
    initStateRef.current.currentApiKey = apiKey;
    setIsLoading(true);
    setLoadError(null);
    setIsLoaded(false);

    // 既存スクリプトの削除
    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) {
      console.log("GoogleMapsApiProvider: Removing existing script");
      existingScript.remove();
    }

    // 既存コールバックの削除
    if ((window as any)[CALLBACK_NAME]) {
      delete (window as any)[CALLBACK_NAME];
    }

    // グローバルコールバック設定
    (window as any)[CALLBACK_NAME] = () => {
      console.log("GoogleMapsApiProvider: Callback executed");
      
      // API可用性の確認
      if (window.google?.maps?.Map) {
        console.log("GoogleMapsApiProvider: API fully available");
        initStateRef.current.scriptLoaded = true;
        setIsLoaded(true);
        setIsLoading(false);
        setLoadError(null);
        
        // カスタムイベント発火
        window.dispatchEvent(new CustomEvent('google-maps-api-loaded'));
      } else {
        console.error("GoogleMapsApiProvider: Callback executed but API not available");
        setLoadError(new Error("Google Maps API loaded but not fully available"));
        setIsLoading(false);
        initStateRef.current.initAttempted = false;
        initStateRef.current.currentApiKey = null;
      }
    };

    // スクリプト作成
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    
    // 本番・テスト環境対応のURL構築
    const baseUrl = 'https://maps.googleapis.com/maps/api/js';
    const params = new URLSearchParams({
      key: apiKey,
      libraries: 'places,geometry',
      loading: 'async',
      callback: CALLBACK_NAME,
      v: 'weekly'
    });
    
    script.src = `${baseUrl}?${params.toString()}`;
    
    console.log("GoogleMapsApiProvider: Loading script:", script.src);

    // エラーハンドリング
    script.onerror = (event) => {
      console.error("GoogleMapsApiProvider: Script load failed", event);
      
      let errorMessage = 'Failed to load Google Maps API. ';
      
      // 一般的な問題の案内
      errorMessage += 'Please check: ';
      errorMessage += '1) API key is valid, ';
      errorMessage += '2) Domain is authorized, ';
      errorMessage += '3) APIs are enabled (Maps JavaScript API, Places API), ';
      errorMessage += '4) Billing account is set up.';
      
      setLoadError(new Error(errorMessage));
      setIsLoading(false);
      
      // リセット
      initStateRef.current.initAttempted = false;
      initStateRef.current.currentApiKey = null;
      
      // 失敗したスクリプトとコールバックの削除
      const failedScript = document.getElementById(SCRIPT_ID);
      if (failedScript) failedScript.remove();
      delete (window as any)[CALLBACK_NAME];
    };

    // スクリプト追加
    document.head.appendChild(script);

    // 追加のタイムアウト保護
    const loadTimeout = setTimeout(() => {
      if (!initStateRef.current.scriptLoaded && !loadError) {
        console.error("GoogleMapsApiProvider: Load timeout");
        setLoadError(new Error("Google Maps API load timeout. Please check your network connection."));
        setIsLoading(false);
        initStateRef.current.initAttempted = false;
        initStateRef.current.currentApiKey = null;
      }
    }, 20000);

    return () => {
      clearTimeout(loadTimeout);
    };

  }, [apiKey, isLoaded]); // isLoadedを依存配列に追加

  const contextValue = {
    isLoaded,
    loadError,
    isLoading
  };

  console.log("GoogleMapsApiProvider: Context value:", contextValue);

  return (
    <GoogleMapsApiContext.Provider value={contextValue}>
      {children}
    </GoogleMapsApiContext.Provider>
  );
};