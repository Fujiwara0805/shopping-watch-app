'use client';

import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  permissionState: 'prompt' | 'granted' | 'denied' | 'unavailable' | 'pending';
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
    permissionState: 'pending',
  });

  const requestLocation = useCallback(() => {
    console.log("useGeolocation: requestLocation called.");
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

    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null, 
      latitude: null, 
      longitude: null,
    }));
    console.log("useGeolocation: State set to loading.");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("useGeolocation: getCurrentPosition success:", position);
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
          permissionState: 'granted',
        });
      },
      (geoError) => {
        console.error("useGeolocation: getCurrentPosition error:", geoError);
        console.error(`useGeolocation: Error Code: ${geoError.code}, Message: ${geoError.message}`);

        let permissionErrorType: GeolocationState['permissionState'] = 'denied';
        let errorMessage = `位置情報の取得に失敗しました (コード: ${geoError.code})。`;
        
        switch(geoError.code) {
          case geoError.PERMISSION_DENIED:
            errorMessage = '位置情報の利用がブロックされています。ブラウザまたは端末のOS設定で、このサイトへの位置情報アクセス許可を確認してください。';
            permissionErrorType = 'denied';
            break;
          case geoError.POSITION_UNAVAILABLE:
            errorMessage = '現在位置を特定できませんでした。GPSの受信状態が悪いか、ネットワーク接続に問題がある可能性があります。場所を変えるか、しばらくしてから再度お試しください。';
            permissionErrorType = state.permissionState === 'granted' ? 'granted' : 'unavailable';
            break;
          case geoError.TIMEOUT:
            errorMessage = '位置情報の取得がタイムアウトしました。ネットワーク環境の良い場所で再度お試しください。';
            permissionErrorType = state.permissionState === 'granted' ? 'granted' : 'denied';
            break;
          default:
            errorMessage = `不明なエラーが発生し位置情報を取得できませんでした (コード: ${geoError.code})。`;
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
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  }, [state.permissionState]);

  useEffect(() => {
    if (state.permissionState === 'pending') {
      console.log("useGeolocation: permissionState is pending, querying permissions.");
      if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        navigator.permissions.query({ name: 'geolocation' }).then((permissionStatus) => {
          console.log("useGeolocation: Permission API status:", permissionStatus.state);
          setState(prev => ({ ...prev, permissionState: permissionStatus.state as GeolocationState['permissionState'] }));
          
          permissionStatus.onchange = () => {
            setState(prev => ({ ...prev, permissionState: permissionStatus.state as GeolocationState['permissionState'], loading: false }));
          };
        }).catch(err => {
          console.warn("useGeolocation: navigator.permissions.query failed:", err);
          setState(prev => ({ ...prev, permissionState: 'prompt', loading: false }));
        });
      } else {
        console.log("useGeolocation: navigator.permissions not available, setting to prompt.");
        setState(prev => ({ ...prev, permissionState: 'prompt', loading: false }));
      }
    }
  }, [state.permissionState]);

  console.log("useGeolocation: Current state:", state);
  return { ...state, requestLocation };
}