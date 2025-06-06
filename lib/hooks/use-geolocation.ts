'use client';

import { useState, useEffect, useCallback } from 'react';
import { LocationPermissionManager } from '@/lib/hooks/LocationPermissionManager';

interface BrowserInfo {
  name: 'chrome' | 'firefox' | 'edge' | 'safari' | 'opera' | 'unknown';
  isPrivateMode: boolean;
  supportsPermissionsAPI: boolean;
}

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  permissionState: 'prompt' | 'granted' | 'denied' | 'unavailable' | 'pending';
  browserInfo: BrowserInfo;
  isPermissionGranted: boolean;
  permissionRemainingMinutes: number;
}

const detectBrowser = (): BrowserInfo => {
  if (typeof window === 'undefined') {
    return { name: 'unknown', isPrivateMode: false, supportsPermissionsAPI: false };
  }

  const userAgent = navigator.userAgent;
  let name: BrowserInfo['name'] = 'unknown';
  let isPrivateMode = false;
  const supportsPermissionsAPI = 'permissions' in navigator && typeof navigator.permissions.query === 'function';

  if (/Chrome/.test(userAgent) && !/Edge/.test(userAgent) && !/CriOS/.test(userAgent)) {
    name = 'chrome';
  } else if (/Firefox/.test(userAgent)) {
    name = 'firefox';
  } else if (/Edge/.test(userAgent)) {
    name = 'edge';
  } else if ((/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) || /iPad|iPhone|iPod/.test(userAgent)) {
    name = 'safari';
    // Safari/iOS private mode detection
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
    } catch (e) {
      isPrivateMode = true;
    }
  } else if (/Opera|OPR\//.test(userAgent)) {
    name = 'opera';
  }

  // General private mode detection (less reliable for all browsers)
  if (name !== 'safari') {
    try {
      localStorage.setItem('test_private', 'test');
      localStorage.removeItem('test_private');
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.name === 'SecurityError') {
          isPrivateMode = true;
      }
    }
  }

  return { name, isPrivateMode, supportsPermissionsAPI };
};

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>(() => ({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
    permissionState: 'pending',
    browserInfo: detectBrowser(),
    isPermissionGranted: false,
    permissionRemainingMinutes: 0,
  }));

  // 保存された許可状態をチェック
  const checkStoredPermission = useCallback(() => {
    const permissionInfo = LocationPermissionManager.checkPermission();
    const remainingMinutes = LocationPermissionManager.getRemainingMinutes();
    
    setState(prev => ({
      ...prev,
      isPermissionGranted: permissionInfo.isGranted,
      permissionRemainingMinutes: remainingMinutes
    }));
    
    console.log('useGeolocation: Stored permission check', permissionInfo);
    
    return permissionInfo;
  }, []);

  // 位置情報取得の実行
  const getCurrentPosition = useCallback((isAutoRequest = false) => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'お使いのブラウザでは位置情報を利用できません。',
        loading: false,
        permissionState: 'unavailable',
      }));
      return;
    }

    // プライベートモードのチェック
    if (state.browserInfo.isPrivateMode) {
      setState(prev => ({
        ...prev,
        error: 'プライベートブラウジングモードでは位置情報を取得できません。通常モードでアクセスしてください。',
        loading: false,
        permissionState: 'denied',
      }));
      return;
    }

    console.log(`useGeolocation: Starting location request for ${state.browserInfo.name}`, { isAutoRequest });

    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null, 
      latitude: null, 
      longitude: null,
    }));

    const options = {
      enableHighAccuracy: true,
      timeout: state.browserInfo.name === 'safari' ? 30000 : 20000,
      maximumAge: state.browserInfo.name === 'safari' ? 60000 : 0,
    };

    const successCallback = (position: GeolocationPosition) => {
      console.log(`useGeolocation: getCurrentPosition success for ${state.browserInfo.name}:`, position);
      
      const accuracy = position.coords.accuracy;
      console.log(`${state.browserInfo.name} location accuracy:`, accuracy);
      
      setState(prev => ({
        ...prev,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        error: null,
        loading: false,
        permissionState: 'granted',
        isPermissionGranted: true,
        permissionRemainingMinutes: 60
      }));

      // 成功時に許可状態を保存（手動要求の場合のみ）
      if (!isAutoRequest) {
        LocationPermissionManager.savePermission();
        console.log('useGeolocation: Permission saved after successful location request');
      }
    };

    const errorCallback = (geoError: GeolocationPositionError) => {
      console.error(`useGeolocation: getCurrentPosition error for ${state.browserInfo.name}:`, geoError);

      let permissionErrorType: GeolocationState['permissionState'] = 'denied';
      let errorMessage = '';
      
      switch(geoError.code) {
        case geoError.PERMISSION_DENIED:
          if (state.browserInfo.name === 'safari') {
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
          // 許可が拒否された場合は保存された状態をクリア
          LocationPermissionManager.clearPermission();
          break;
          
        case geoError.POSITION_UNAVAILABLE:
          if (state.browserInfo.name === 'safari') {
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
          if (state.browserInfo.name === 'safari') {
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
        isPermissionGranted: permissionErrorType === 'granted',
        permissionRemainingMinutes: permissionErrorType === 'granted' ? prev.permissionRemainingMinutes : 0
      }));
    };

    let timeoutId: NodeJS.Timeout | null = null;
    if (state.browserInfo.name === 'safari') {
      timeoutId = setTimeout(() => {
        errorCallback({
          code: 3,
          message: 'Safari timeout',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3
        } as GeolocationPositionError);
      }, options.timeout + 1000);
    }

    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (timeoutId) clearTimeout(timeoutId);
          successCallback(position);
        },
        (error) => {
          if (timeoutId) clearTimeout(timeoutId);
          errorCallback(error);
        },
        options
      );
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      console.error(`${state.browserInfo.name} geolocation request failed:`, error);
      setState(prev => ({
        ...prev,
        error: '位置情報の取得でエラーが発生しました。ページを再読み込みして再度お試しください。',
        loading: false,
        permissionState: 'unavailable',
      }));
    }
  }, [state.permissionState, state.browserInfo]);

  const requestLocation = useCallback(() => {
    console.log(`useGeolocation: requestLocation called for ${state.browserInfo.name}`);
    getCurrentPosition(false); // 手動要求
  }, [getCurrentPosition, state.browserInfo.name]);

  // 初期化時の許可状態チェックと自動位置取得
  useEffect(() => {
    const permissionInfo = checkStoredPermission();
    
    // 既に許可されている場合は自動的に位置情報を取得
    if (permissionInfo.isGranted && !permissionInfo.isExpired) {
      console.log('useGeolocation: Auto-requesting location (permission already granted)');
      getCurrentPosition(true); // 自動要求
    }
  }, [checkStoredPermission, getCurrentPosition]);

  // Permissions API による許可状態の監視
  useEffect(() => {
    if (state.permissionState === 'pending') {
      console.log(`useGeolocation: Checking permissions for ${state.browserInfo.name}`);
      
      if (state.browserInfo.supportsPermissionsAPI) {
        navigator.permissions.query({ name: 'geolocation' })
          .then((permissionStatus) => {
            console.log(`${state.browserInfo.name} Permission API status:`, permissionStatus.state);
            setState(prev => ({ 
              ...prev, 
              permissionState: permissionStatus.state as GeolocationState['permissionState'] 
            }));
            
            permissionStatus.onchange = () => {
              const newState = permissionStatus.state as GeolocationState['permissionState'];
              setState(prev => ({ 
                ...prev, 
                permissionState: newState, 
                loading: false 
              }));
              
              // 許可が拒否された場合は保存された状態をクリア
              if (newState === 'denied') {
                LocationPermissionManager.clearPermission();
                setState(prev => ({
                  ...prev,
                  isPermissionGranted: false,
                  permissionRemainingMinutes: 0
                }));
              }
            };
          })
          .catch(err => {
            console.warn(`${state.browserInfo.name} permissions query failed:`, err);
            setState(prev => ({ ...prev, permissionState: 'prompt', loading: false }));
          });
      } else {
        console.log(`${state.browserInfo.name}: navigator.permissions not available, setting to prompt.`);
        setState(prev => ({ ...prev, permissionState: 'prompt', loading: false }));
      }
    }
  }, [state.permissionState, state.browserInfo.name, state.browserInfo.supportsPermissionsAPI]);

  // 定期的な許可状態の更新（5分ごと）
  useEffect(() => {
    const interval = setInterval(() => {
      const permissionInfo = checkStoredPermission();
      
      // 許可が期限切れの場合は位置情報をクリア
      if (permissionInfo.isExpired && (state.latitude || state.longitude)) {
        setState(prev => ({
          ...prev,
          latitude: null,
          longitude: null,
          isPermissionGranted: false,
          permissionRemainingMinutes: 0
        }));
        console.log('useGeolocation: Permission expired, clearing location data');
      }
    }, 5 * 60 * 1000); // 5分ごと

    return () => clearInterval(interval);
  }, [checkStoredPermission, state.latitude, state.longitude]);

  console.log(`useGeolocation ${state.browserInfo.name}: Current state:`, {
    ...state,
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
    storedPermissionInfo: LocationPermissionManager.getPermissionInfo()
  });
  
  return { ...state, requestLocation };
}