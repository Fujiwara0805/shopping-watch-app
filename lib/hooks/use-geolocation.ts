'use client';

import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  permissionState: 'prompt' | 'granted' | 'denied' | 'unavailable' | 'pending';
  isSafari: boolean;
  isPrivateMode: boolean;
}

// Safari・iPhone検出
const detectBrowser = () => {
  if (typeof window === 'undefined') return { isSafari: false, isPrivateMode: false };
  
  const userAgent = navigator.userAgent;
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  
  // プライベートモードの検出（Safari限定）
  let isPrivateMode = false;
  if (isSafari || isIOS) {
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
    } catch (e) {
      isPrivateMode = true;
    }
  }
  
  return { isSafari: isSafari || isIOS, isPrivateMode };
};

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
    permissionState: 'pending',
    isSafari: false,
    isPrivateMode: false,
  });

  // ブラウザ検出の初期化
  useEffect(() => {
    const { isSafari, isPrivateMode } = detectBrowser();
    setState(prev => ({ ...prev, isSafari, isPrivateMode }));
  }, []);

  const requestLocation = useCallback(() => {
    console.log("useGeolocation: requestLocation called for Safari");
    
    if (!navigator.geolocation) {
      console.error("useGeolocation: Geolocation API not available.");
      setState(prev => ({
        ...prev,
        error: 'お使いのブラウザでは位置情報を利用できません。',
        loading: false,
        permissionState: 'unavailable',
      }));
      return;
    }

    // プライベートモードのチェック（Safari）
    if (state.isPrivateMode) {
      setState(prev => ({
        ...prev,
        error: 'プライベートブラウジングモードでは位置情報を取得できません。通常モードでアクセスしてください。',
        loading: false,
        permissionState: 'denied',
      }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null, 
      latitude: null, 
      longitude: null,
    }));
    
    console.log("useGeolocation: Starting location request for Safari");

    // Safari用の設定オプション
    const safariOptions = {
      enableHighAccuracy: true,
      timeout: state.isSafari ? 30000 : 20000, // Safariは長めのタイムアウト
      maximumAge: state.isSafari ? 60000 : 0, // Safariはキャッシュを許可
    };

    // Safari用の成功コールバック
    const successCallback = (position: GeolocationPosition) => {
      console.log("useGeolocation: getCurrentPosition success for Safari:", position);
      
      // Safari では座標の精度をチェック
      const accuracy = position.coords.accuracy;
      console.log("Safari location accuracy:", accuracy);
      
      setState({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        error: null,
        loading: false,
        permissionState: 'granted',
        isSafari: state.isSafari,
        isPrivateMode: state.isPrivateMode,
      });
    };

    // Safari用のエラーコールバック
    const errorCallback = (geoError: GeolocationPositionError) => {
      console.error("useGeolocation: getCurrentPosition error for Safari:", geoError);
      console.error(`Safari Error Code: ${geoError.code}, Message: ${geoError.message}`);

      let permissionErrorType: GeolocationState['permissionState'] = 'denied';
      let errorMessage = '';
      
      switch(geoError.code) {
        case geoError.PERMISSION_DENIED:
          if (state.isSafari) {
            errorMessage = `位置情報の利用がブロックされています。

【Safari での設定方法】
1. Safari設定 → プライバシーとセキュリティ → 位置情報サービス
2. または、アドレスバー左の 🔒 アイコンをタップ
3. "位置情報" を "許可" に変更

【iPhoneの設定方法】
1. 設定 → プライバシーとセキュリティ → 位置情報サービス
2. Safari → このサイトの使用中のみ許可`;
          } else {
            errorMessage = '位置情報の利用がブロックされています。ブラウザの設定を確認してください。';
          }
          permissionErrorType = 'denied';
          break;
          
        case geoError.POSITION_UNAVAILABLE:
          if (state.isSafari) {
            errorMessage = `現在位置を特定できませんでした。

【確認事項】
• WiFiまたはモバイル通信の接続を確認
• 建物の外や窓の近くで試してください
• 機内モードがオフになっているか確認
• 位置情報サービスがオンになっているか確認`;
          } else {
            errorMessage = '現在位置を特定できませんでした。GPSの受信状態が悪いか、ネットワーク接続に問題がある可能性があります。';
          }
          permissionErrorType = state.permissionState === 'granted' ? 'granted' : 'unavailable';
          break;
          
        case geoError.TIMEOUT:
          if (state.isSafari) {
            errorMessage = `位置情報の取得がタイムアウトしました。

【対処方法】
• ネットワーク環境の良い場所で再試行
• ページを再読み込みして再度お試し
• WiFi環境での接続を推奨`;
          } else {
            errorMessage = '位置情報の取得がタイムアウトしました。ネットワーク環境の良い場所で再度お試しください。';
          }
          permissionErrorType = state.permissionState === 'granted' ? 'granted' : 'denied';
          break;
          
        default:
          errorMessage = `不明なエラーが発生しました (コード: ${geoError.code})。ページを再読み込みして再度お試しください。`;
          permissionErrorType = 'unavailable';
      }
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
        permissionState: permissionErrorType,
        latitude: null,
        longitude: null,
      }));
    };

    // Safari用のタイムアウト処理を追加
    let timeoutId: NodeJS.Timeout | null = null;
    if (state.isSafari) {
      timeoutId = setTimeout(() => {
        errorCallback({
          code: 3,
          message: 'Safari timeout',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3
        } as GeolocationPositionError);
      }, safariOptions.timeout + 1000);
    }

    // 位置情報取得の実行
    try {
      const watchId = navigator.geolocation.getCurrentPosition(
        (position) => {
          if (timeoutId) clearTimeout(timeoutId);
          successCallback(position);
        },
        (error) => {
          if (timeoutId) clearTimeout(timeoutId);
          errorCallback(error);
        },
        safariOptions
      );
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      console.error("Safari geolocation request failed:", error);
      setState(prev => ({
        ...prev,
        error: '位置情報の取得でエラーが発生しました。ページを再読み込みして再度お試しください。',
        loading: false,
        permissionState: 'unavailable',
      }));
    }

  }, [state.permissionState, state.isSafari, state.isPrivateMode]);

  // Safari用の権限チェック
  useEffect(() => {
    if (state.permissionState === 'pending') {
      console.log("useGeolocation: Checking permissions for Safari");
      
      // Safari では navigator.permissions.query が制限されている場合がある
      if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        navigator.permissions.query({ name: 'geolocation' })
          .then((permissionStatus) => {
            console.log("Safari Permission API status:", permissionStatus.state);
            setState(prev => ({ 
              ...prev, 
              permissionState: permissionStatus.state as GeolocationState['permissionState'] 
            }));
            
            permissionStatus.onchange = () => {
              setState(prev => ({ 
                ...prev, 
                permissionState: permissionStatus.state as GeolocationState['permissionState'], 
                loading: false 
              }));
            };
          })
          .catch(err => {
            console.warn("Safari permissions query failed:", err);
            // Safari では permissions API が利用できない場合があるため、プロンプト状態に設定
            setState(prev => ({ ...prev, permissionState: 'prompt', loading: false }));
          });
      } else {
        console.log("Safari: navigator.permissions not available, setting to prompt.");
        setState(prev => ({ ...prev, permissionState: 'prompt', loading: false }));
      }
    }
  }, [state.permissionState]);

  console.log("useGeolocation Safari: Current state:", {
    ...state,
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server'
  });
  
  return { ...state, requestLocation };
}