"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { useGeolocation } from '@/lib/hooks/use-geolocation'; // Enhanced version
import { useGoogleMapsApi } from '@/components/providers/GoogleMapsApiProvider';
import { Button } from '@/components/ui/button';
import { MapPin, AlertTriangle, Navigation, RefreshCw, Smartphone, Monitor, Globe, Clock, Eye, EyeOff, ArrowLeft, Utensils, ShoppingBag, Calendar, Heart, Package, MessageSquareText, Layers, Store } from 'lucide-react';
import { motion } from 'framer-motion';
import { MapSearchControl } from './MapSearchControl';
import { CrossBrowserLocationGuide } from './CrossBrowserLocationGuide'; // Enhanced version
import { LocationPermissionManager } from '@/lib/hooks/LocationPermissionManager';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

declare global {
  interface Window {
    google: any;
  }
}

// 🔥 投稿データの型定義を修正（store_latitude, store_longitudeを使用）
interface PostMarkerData {
  id: string;
  category: string | null;
  store_name: string;
  content: string;
  store_latitude: number;
  store_longitude: number;
  created_at: string;
  expires_at: string;
}


// 🔥 カテゴリーカラーを取得する関数を追加（カテゴリー未入力対応）
const getCategoryColor = (category: string | null) => {
  if (!category) return '#6b7280'; // カテゴリーが未入力の場合はグレー
  
  switch(category) {
    case '飲食店':
      return '#ea580c'; // orange-600
    case '小売店':
      return '#2563eb'; // blue-600
    case 'イベント集客':
      return '#9333ea'; // purple-600
    case '応援':
      return '#dc2626'; // red-600
    case '受け渡し':
      return '#16a34a'; // green-600
    case '雑談':
      return '#4b5563'; // gray-600
    default:
      return '#6b7280'; // gray-500
  }
};

// 🔥 手紙アイコンのSVGパスを使用（大きめサイズ）
const getLetterIconSvg = (color: string) => {
  return `
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- 手紙アイコン -->
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="${color}"/>
      <polyline points="22,6 12,13 2,6" stroke="white" stroke-width="2" fill="none"/>
    </svg>
  `;
};

// 🔥 SVGをData URLに変換する関数
const createDataUrl = (svgString: string) => {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgString)}`;
};

export function MapView() {
  console.log("MapView: Component rendering START");
  
  const { isLoaded: googleMapsLoaded, loadError: googleMapsLoadError, isLoading: googleMapsLoading } = useGoogleMapsApi();
  
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const initializationTriedRef = useRef<boolean>(false);

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const { 
    latitude, 
    longitude, 
    loading: locationLoading, 
    error: locationError, 
    permissionState, 
    requestLocation,
    browserInfo,
    // 新しく追加されたプロパティ
    isPermissionGranted,
    permissionRemainingMinutes
  } = useGeolocation(); // Enhanced hook

  const [mapInitialized, setMapInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [showLocationGuide, setShowLocationGuide] = useState(false);
  // 🔥 設定方法表示用の状態を追加
  const [showSettingsGuide, setShowSettingsGuide] = useState(false);
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0
  });

  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [selectedPlaceMarker, setSelectedPlaceMarker] = useState<google.maps.Marker | null>(null);
  const [distanceToSelectedPlace, setDistanceToSelectedPlace] = useState<string | null>(null);
  const [userLocationMarker, setUserLocationMarker] = useState<google.maps.Marker | null>(null);
  const [userLocationCircle, setUserLocationCircle] = useState<google.maps.Circle | null>(null);
  
  // 🔥 5km圏内の範囲表示・非表示の状態管理（デフォルト：表示）
  const [showRangeCircle, setShowRangeCircle] = useState(true);

  // 🔥 投稿データとマーカー関連の状態を追加
  const [posts, setPosts] = useState<PostMarkerData[]>([]);
  const [postMarkers, setPostMarkers] = useState<google.maps.Marker[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const router = useRouter();

  // 改良されたガイド表示制御（許可状態を考慮）
  useEffect(() => {
    // 既に許可されている場合はガイドを表示しない
    if (isPermissionGranted && permissionRemainingMinutes > 0) {
      setShowLocationGuide(false);
      return;
    }

    // 🔥 常にfalseに設定して自動表示を防ぐ
    setShowLocationGuide(false);
  }, [browserInfo.name, permissionState, latitude, longitude, isPermissionGranted, permissionRemainingMinutes]);

  // デバッグ情報の出力（許可状態情報も含む）
  console.log("MapView Enhanced: Current state:", {
    googleMapsLoaded,
    googleMapsLoading,
    googleMapsLoadError: !!googleMapsLoadError,
    latitude,
    longitude,
    locationLoading,
    permissionState,
    browserInfo,
    containerDimensions,
    mapInitialized,
    showLocationGuide,
    isPermissionGranted,
    permissionRemainingMinutes,
    storedPermissionInfo: LocationPermissionManager.getPermissionInfo()
  });

  // コンテナ寸法の取得（変更なし）
  const updateContainerDimensions = useCallback(() => {
    if (!mapContainerRef.current) return false;
    
    const container = mapContainerRef.current;
    const parent = container.parentElement;
    
    if (!parent) return false;
    
    const parentRect = parent.getBoundingClientRect();
    const width = parentRect.width;
    const height = parentRect.height;
    
    console.log(`MapView ${browserInfo.name}: Container dimensions updated:`, { width, height });
    
    setContainerDimensions({ width, height });
    
    // コンテナスタイルの明示的設定（ブラウザ別調整）
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    container.style.position = 'relative';
    container.style.backgroundColor = '#f5f5f5';
    
    // Firefox 特有の調整
    if (browserInfo.name === 'firefox') {
      container.style.overflow = 'hidden';
    }
    
    return width > 0 && height > 200;
  }, [browserInfo.name]);

  // コンテナ寸法の監視（変更なし）
  useEffect(() => {
    updateContainerDimensions();
    
    const timeouts = [
      setTimeout(updateContainerDimensions, 100),
      setTimeout(updateContainerDimensions, 300),
      setTimeout(updateContainerDimensions, 500)
    ];

    const handleResize = () => {
      setTimeout(updateContainerDimensions, browserInfo.name === 'safari' ? 50 : 30);
    };

    // 基本的なイベントリスナー
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });
    
    // ブラウザ別特有のイベント
    if (browserInfo.name === 'safari') {
      window.addEventListener('pageshow', handleResize, { passive: true });
      window.addEventListener('focus', handleResize, { passive: true });
    } else if (browserInfo.name === 'firefox') {
      // Firefox用の追加イベント
      window.addEventListener('load', handleResize, { passive: true });
    }

    return () => {
      timeouts.forEach(clearTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      
      if (browserInfo.name === 'safari') {
        window.removeEventListener('pageshow', handleResize);
        window.removeEventListener('focus', handleResize);
      } else if (browserInfo.name === 'firefox') {
        window.removeEventListener('load', handleResize);
      }
    };
  }, [updateContainerDimensions, browserInfo.name]);

  // 改良された位置情報要求ハンドラー
  const handleLocationRequest = () => {
    setShowLocationGuide(false);
    requestLocation(); // Enhanced hook will handle permission saving
  };

  // 🔥 投稿データを取得する関数を修正（store_latitude, store_longitudeを使用）
  const fetchPosts = useCallback(async () => {
    if (!latitude || !longitude) {
      console.log('MapView: 位置情報がないため投稿データの取得をスキップ');
      return;
    }

    setLoadingPosts(true);
    try {
      console.log('MapView: 投稿データを取得中...');
      
      const now = new Date().toISOString();
      
      // 🔥 store_latitude, store_longitudeを使用して投稿を取得
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          category,
          store_name,
          content,
          store_latitude,
          store_longitude,
          created_at,
          expires_at
        `)
        .eq('is_deleted', false)
        .gt('expires_at', now)
        .not('store_latitude', 'is', null)
        .not('store_longitude', 'is', null)
        .not('store_name', 'is', null);

      if (error) {
        console.error('MapView: 投稿データの取得に失敗:', error);
        return;
      }

      if (!data) {
        console.log('MapView: 投稿データがありません');
        setPosts([]);
        return;
      }

      // 5km圏内でフィルタリング
      const filteredPosts = data.filter((post: any) => {
        if (!post.store_latitude || !post.store_longitude) return false;
        
        // 距離計算（ハバーサイン公式）
        const R = 6371; // 地球の半径（km）
        const dLat = (post.store_latitude - latitude) * Math.PI / 180;
        const dLon = (post.store_longitude - longitude) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(latitude * Math.PI / 180) * Math.cos(post.store_latitude * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return distance <= 5; // 5km以内
      });

      console.log(`MapView: ${filteredPosts.length}件の投稿を取得しました`);
      setPosts(filteredPosts);
      
    } catch (error) {
      console.error('MapView: 投稿データの取得中にエラー:', error);
    } finally {
      setLoadingPosts(false);
    }
  }, [latitude, longitude]);

  // 🔥 投稿マーカーを作成する関数を修正（手紙アイコンを使用）
  const createPostMarkers = useCallback(() => {
    if (!map || !posts.length || !window.google?.maps) {
      console.log('MapView: マーカー作成の条件が揃っていません');
      return;
    }

    console.log(`MapView: ${posts.length}件の投稿マーカーを作成中...`);

    // 既存のマーカーを削除
    postMarkers.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    
    const newMarkers: google.maps.Marker[] = [];

    posts.forEach((post) => {
      if (!post.store_latitude || !post.store_longitude) return;

      const position = new window.google.maps.LatLng(post.store_latitude, post.store_longitude);
      const categoryColor = getCategoryColor(post.category);

      // カテゴリー表示用のテキスト
      const categoryText = post.category || '店舗';

      // 🔥 手紙アイコンを使用（カテゴリごとに色分け）
      const letterIconSvg = getLetterIconSvg(categoryColor);
      const iconUrl = createDataUrl(letterIconSvg);

      const marker = new window.google.maps.Marker({
        position,
        map,
        title: `${post.store_name} - ${categoryText}`,
        icon: {
          url: iconUrl,
          scaledSize: new window.google.maps.Size(32, 32), // 現在地アイコンより少し小さく
          anchor: new window.google.maps.Point(16, 16),
        },
        animation: window.google.maps.Animation.DROP,
      });

      // マーカークリック時の処理
      marker.addListener('click', () => {
        console.log(`MapView: 投稿マーカーがクリックされました - ID: ${post.id}`);
        // タイムラインページに遷移（該当投稿をハイライト）
        router.push(`/timeline?highlightPostId=${post.id}`);
      });

      newMarkers.push(marker);
    });

    setPostMarkers(newMarkers);
    console.log(`MapView: ${newMarkers.length}個のマーカーを作成しました`);
  }, [map, posts, router]); // 🔥 postMarkersを依存配列から除去

  // 地図初期化のメイン処理（変更なし）
  const initializeMap = useCallback(() => {
    console.log(`MapView ${browserInfo.name}: initializeMap called with conditions:`, {
      container: !!mapContainerRef.current,
      mapInstance: !!mapInstanceRef.current,
      googleMapsLoaded,
      location: !!(latitude && longitude),
      dimensions: containerDimensions,
      alreadyTried: initializationTriedRef.current,
      browserName: browserInfo.name
    });

    if (!mapContainerRef.current || 
        mapInstanceRef.current || 
        !googleMapsLoaded || 
        !latitude || 
        !longitude || 
        containerDimensions.height < 200 ||
        initializationTriedRef.current) {
      console.log(`MapView ${browserInfo.name}: Initialization conditions not met`);
      return false;
    }

    if (!window.google?.maps?.Map) {
      console.error(`MapView ${browserInfo.name}: Google Maps API not available despite isLoaded=true`);
      setInitializationError("Google Maps APIが利用できません。ページを再読み込みしてください。");
      return false;
    }

    console.log(`MapView ${browserInfo.name}: Starting map initialization`);
    initializationTriedRef.current = true;

    try {
      const container = mapContainerRef.current;
      container.innerHTML = '';

      const center = { lat: latitude, lng: longitude };

      // ブラウザ別の地図オプション
      const getMapOptions = (): google.maps.MapOptions => {
        const baseOptions: google.maps.MapOptions = {
          center,
          clickableIcons: true,
          disableDefaultUI: true,
          zoomControl: true,
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          backgroundColor: '#f5f5f5',
          restriction: {
            latLngBounds: {
              north: 45.557,
              south: 24.217,
              east: 145.817,
              west: 122.933
            }
          }
        };

        switch (browserInfo.name) {
          case 'safari':
            return {
              ...baseOptions,
              zoom: 13,
              gestureHandling: 'cooperative'
            };
          
          case 'firefox':
            return {
              ...baseOptions,
              zoom: 13,
              gestureHandling: 'greedy',
              // Firefox では追加の最適化
              draggableCursor: 'default'
            };
          
          case 'chrome':
          case 'edge':
            return {
              ...baseOptions,
              zoom: 13,
              gestureHandling: 'greedy'
            };
          
          default:
            return {
              ...baseOptions,
              zoom: 13,
              gestureHandling: 'greedy'
            };
        }
      };

      console.log(`MapView ${browserInfo.name}: Creating Google Map instance`);
      const newMap = new window.google.maps.Map(container, getMapOptions());
      mapInstanceRef.current = newMap;

      // ブラウザ別の地図読み込み完了処理
      const idleListener = window.google.maps.event.addListenerOnce(newMap, 'idle', () => {
        console.log(`MapView ${browserInfo.name}: Map idle event - initialization complete`);
        setMap(newMap);
        setMapInitialized(true);
        setInitializationError(null);
        
        // ブラウザ別の地図リサイズ処理
        const resizeDelay = browserInfo.name === 'safari' ? 300 : 
                          browserInfo.name === 'firefox' ? 200 : 100;
                          
        setTimeout(() => {
          if (newMap && window.google?.maps?.event) {
            window.google.maps.event.trigger(newMap, 'resize');
            newMap.setCenter(center);
            
            // ブラウザ別のズーム調整
            if (browserInfo.name === 'safari') {
              newMap.setZoom(12);
            } else if (browserInfo.name === 'firefox') {
              newMap.setZoom(12);
            }
          }
        }, resizeDelay);
      });

      // エラーハンドリング
      const errorListener = window.google.maps.event.addListener(newMap, 'error', (error: any) => {
        console.error(`MapView ${browserInfo.name}: Map error:`, error);
        setInitializationError("地図の表示中にエラーが発生しました。");
        initializationTriedRef.current = false;
        
        window.google.maps.event.removeListener(idleListener);
        window.google.maps.event.removeListener(errorListener);
      });

      // タイムアウト設定（120秒に統一）
      const timeout = setTimeout(() => {
        if (!mapInitialized) {
          console.error(`MapView ${browserInfo.name}: Map initialization timeout`);
          setInitializationError("タイムアウトしました。再度ロードしてください。");
          initializationTriedRef.current = false;
        }
      }, 120000); // 120秒に統一

      return () => {
        clearTimeout(timeout);
        if (idleListener) window.google.maps.event.removeListener(idleListener);
        if (errorListener) window.google.maps.event.removeListener(errorListener);
      };

    } catch (error) {
      console.error(`MapView ${browserInfo.name}: Map initialization failed:`, error);
      setInitializationError(`地図の初期化に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
      initializationTriedRef.current = false;
      return false;
    }
  }, [googleMapsLoaded, latitude, longitude, containerDimensions, mapInitialized, browserInfo.name]);

  // 地図初期化の実行タイミング制御（変更なし）
  useEffect(() => {
    if (googleMapsLoaded && 
        latitude && 
        longitude && 
        containerDimensions.height >= 200 && 
        !mapInitialized &&
        !initializationTriedRef.current) {
      
      console.log(`MapView ${browserInfo.name}: Conditions met for initialization, starting...`);
      
      // ブラウザ別の初期化遅延
      const initDelay = browserInfo.name === 'safari' ? 200 : 
                       browserInfo.name === 'firefox' ? 150 : 100;
      
      const timer = setTimeout(() => {
        initializeMap();
      }, initDelay);

      return () => clearTimeout(timer);
    }
  }, [googleMapsLoaded, latitude, longitude, containerDimensions, mapInitialized, initializeMap, browserInfo.name]);

  // 🔥 位置情報が取得できたら投稿データを取得
  useEffect(() => {
    if (latitude && longitude && mapInitialized) {
      fetchPosts();
    }
  }, [latitude, longitude, mapInitialized, fetchPosts]);

  // 🔥 投稿データが更新されたらマーカーを作成（修正版）
  useEffect(() => {
    if (posts.length > 0 && map && window.google?.maps) {
      createPostMarkers();
    }
  }, [posts, map, createPostMarkers]);

  // 🔥 投稿がある場合は範囲円を非表示にする
  useEffect(() => {
    if (posts.length > 0) {
      setShowRangeCircle(false);
    } else {
      setShowRangeCircle(true);
    }
  }, [posts.length]);

  // ユーザー位置マーカーの設置（修正版）
  useEffect(() => {
    if (map && latitude && longitude && mapInitialized && window.google?.maps) {
      console.log(`MapView ${browserInfo.name}: Setting user location marker`);
      const userPosition = new window.google.maps.LatLng(latitude, longitude);
      
      if (userLocationMarker) {
        userLocationMarker.setPosition(userPosition);
      } else {
        try {
          const marker = new window.google.maps.Marker({
            position: userPosition,
            map: map,
            title: "あなたの現在地",
            icon: {
              url: "https://res.cloudinary.com/dz9trbwma/image/upload/v1749098791/%E9%B3%A9_azif4f.png",
              scaledSize: new window.google.maps.Size(50, 50),
              anchor: new window.google.maps.Point(25, 25),
            },
            animation: window.google.maps.Animation.DROP,
          });
          setUserLocationMarker(marker);
          console.log(`MapView ${browserInfo.name}: User location marker created successfully`);
        } catch (error) {
          console.error(`MapView ${browserInfo.name}: Failed to create user location marker:`, error);
        }
      }

      // 🔥 5km圏内の円を表示・非表示の制御
      if (showRangeCircle) {
        if (userLocationCircle) {
          userLocationCircle.setCenter(userPosition);
          userLocationCircle.setMap(map);
        } else {
          try {
            const circle = new window.google.maps.Circle({
              strokeColor: '#10b981', // 緑色のボーダー
              strokeOpacity: 0.8,
              strokeWeight: 2,
              fillColor: '#effdf4', // 指定された緑色
              fillOpacity: 0.35,
              map: map,
              center: userPosition,
              radius: 5000, // 5km = 5000m
            });
            setUserLocationCircle(circle);
            console.log(`MapView ${browserInfo.name}: User location circle created successfully`);
          } catch (error) {
            console.error(`MapView ${browserInfo.name}: Failed to create user location circle:`, error);
          }
        }
      } else {
        // 範囲非表示の場合は円を地図から削除
        if (userLocationCircle) {
          userLocationCircle.setMap(null);
        }
      }

      map.panTo(userPosition);
      const currentZoom = map.getZoom();
      if (currentZoom !== undefined && currentZoom < 13) {
        map.setZoom(13);
      }
    }
  }, [map, latitude, longitude, mapInitialized, userLocationMarker, userLocationCircle, browserInfo.name, showRangeCircle]);

  // 🔥 範囲表示切り替えハンドラー
  const toggleRangeCircle = () => {
    setShowRangeCircle(!showRangeCircle);
  };

  // 改良された再試行機能
  const handleRetry = () => {
    console.log(`MapView ${browserInfo.name}: Retrying initialization`);
    setInitializationError(null);
    setMapInitialized(false);
    initializationTriedRef.current = false;
    mapInstanceRef.current = null;
    setMap(null);
    setShowLocationGuide(false);
    
    // 既存のマーカーと円をクリーンアップ
    if (userLocationMarker) {
      userLocationMarker.setMap(null);
      setUserLocationMarker(null);
    }
    if (userLocationCircle) {
      userLocationCircle.setMap(null);
      setUserLocationCircle(null);
    }
    if (selectedPlaceMarker) {
      selectedPlaceMarker.setMap(null);
      setSelectedPlaceMarker(null);
    }
    
    // 🔥 投稿マーカーもクリーンアップ
    postMarkers.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    setPostMarkers([]);
    setPosts([]);
    
    if (mapContainerRef.current) {
      mapContainerRef.current.innerHTML = '';
    }
    
    // 許可状態を確認してから再試行
    const permissionInfo = LocationPermissionManager.checkPermission();
    
    setTimeout(() => {
      updateContainerDimensions();
      if (!latitude || !longitude || !permissionInfo.isGranted) {
        requestLocation();
      }
    }, 100);
  };

  // ブラウザアイコンを統一（MapPinに統一）
  const getBrowserIcon = () => MapPin;

  // メッセージカードコンポーネント（変更なし）
  const MessageCard = ({ icon: Icon, title, message, children, variant = 'default' }: {
    icon?: React.ElementType;
    title: string;
    message: string | React.ReactNode;
    children?: React.ReactNode;
    variant?: 'default' | 'destructive' | 'warning';
  }) => {
    let iconColorClass = "text-primary";
    if (variant === 'destructive') iconColorClass = "text-destructive";
    if (variant === 'warning') iconColorClass = "text-amber-500";

    return (
      <div className="w-full h-full flex items-center justify-center p-4 bg-background">
        <div className="bg-card p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md text-center border">
          {Icon && <Icon className={`h-16 w-16 ${iconColorClass} mb-6 mx-auto`} />}
          <h2 className={`text-xl sm:text-2xl font-semibold mb-3 ${variant === 'destructive' ? 'text-destructive' : 'text-foreground'}`}>
            {title}
          </h2>
          <div className="text-sm sm:text-base text-muted-foreground mb-6 leading-relaxed">
            {message}
          </div>
          {children}
        </div>
      </div>
    );
  };

  // 場所選択ハンドラー（変更なし）
  const handlePlaceSelected = (place: google.maps.places.PlaceResult, distance: string | null) => {
    setSelectedPlace(place);
    setDistanceToSelectedPlace(distance);

    if (selectedPlaceMarker) {
      selectedPlaceMarker.setMap(null);
    }

    if (map && place.geometry?.location) {
      map.panTo(place.geometry.location);
      map.setZoom(16);

      const marker = new window.google.maps.Marker({
        position: place.geometry.location,
        map: map,
        title: place.name,
        animation: window.google.maps.Animation.DROP,
      });
      setSelectedPlaceMarker(marker);
    }
  };

  const handleSearchError = (error: string) => {
    console.warn(`MapView ${browserInfo.name}: Search error:`, error);
  };

  const openGoogleMapsNavigation = (place: google.maps.places.PlaceResult | null) => {
    if (!place?.geometry?.location) return;
    
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${place.place_id}`;
    window.open(url, '_blank');
  };

  // 改良されたクロスブラウザ位置情報ガイドの表示判定
  if (showLocationGuide && !isPermissionGranted) {
    const BrowserIcon = getBrowserIcon();
    
    return (
      <>
        <div className="w-full h-full bg-gray-50 relative">
          <div ref={mapContainerRef} className="w-full h-full bg-gray-50" />
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
            <div className="text-center">
              <BrowserIcon className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">位置情報を待機中...</h2>
              <p className="text-gray-600 text-sm mb-6">
                位置情報の許可をお待ちしています
              </p>
              <Button onClick={handleLocationRequest} className="mb-4">
                <MapPin className="h-4 w-4 mr-2" />
                位置情報を許可する
              </Button>
            </div>
          </div>
        </div>
        
        <CrossBrowserLocationGuide
          isVisible={showLocationGuide}
          browserInfo={browserInfo}
          permissionState={permissionState}
          onRequestLocation={handleLocationRequest}
          onClose={() => setShowLocationGuide(false)}
          isPermissionGranted={isPermissionGranted}
          permissionRemainingMinutes={permissionRemainingMinutes}
        />
      </>
    );
  }

  // エラー状態の処理（変更なし）
  if (googleMapsLoadError) {
    return (
      <MessageCard 
        title="Google Maps APIエラー" 
        message={`Google Maps APIの読み込みに失敗しました。`}
        variant="destructive" 
        icon={AlertTriangle}
      >
        <Button onClick={handleRetry} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          再試行
        </Button>
      </MessageCard>
    );
  }

  if (initializationError) {
    return (
      <MessageCard 
        title="地図初期化エラー" 
        message={initializationError} 
        variant="destructive" 
        icon={AlertTriangle}
      >
        <Button onClick={handleRetry} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          再試行
        </Button>
      </MessageCard>
    );
  }

  // 統一された位置情報エラー処理
  if ((permissionState === 'denied' || locationError) && !isPermissionGranted) {
    const getLocationMessage = () => {
      if (locationError) return locationError;
      return "地図を表示するために位置情報の許可が必要です。アドレスバーの🔒アイコンから設定を変更してください。";
    };

    return (
      <>
        <MessageCard 
          title="位置情報が必要です" 
          message={getLocationMessage()}
          variant="warning" 
          icon={MapPin}
        >
          <div className="space-y-3">
            {/* オレンジボタン：「なぜ、位置情報が必要なのか？」 */}
            <Button 
              onClick={() => setShowLocationGuide(true)}
              className="w-full"
            >
              なぜ、位置情報が必要なのか？
            </Button>
            {/* 白ボタン：設定方法の説明を表示 */}
            <Button 
              variant="outline"
              onClick={() => setShowSettingsGuide(true)}
              className="w-full"
            >
              設定方法を見る
            </Button>
          </div>
        </MessageCard>

        {/* 設定方法表示用のモーダル */}
        {showSettingsGuide && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-6 text-center">
                <div className="space-y-4 mb-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-semibold text-red-800 mb-3">
                      <AlertTriangle className="h-4 w-4 inline mr-2" />
                      位置情報の利用が許可が必要です
                    </h3>
                    
                    <div className="bg-white rounded p-3 border">
                      <h4 className="font-semibold text-gray-500 mb-2">【設定方法】</h4>
                      <div className="text-sm text-gray-500 space-y-1">
                        <p><strong>1.</strong> 各種(iphone等)端末の設定 → プライバシーとセキュリティ → 位置情報サービス→各種ブラウザ(chrome,safari等)の設定を「使用中のみ」に設定を変更してください</p>
                        <p><strong>2.</strong> 各種ブラウザ(chrome,safari等)における設定 → プライバシーとセキュリティから位置情報を許可orアドレスバーの🔒アイコンから設定を変更してください</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button 
                    onClick={() => setShowSettingsGuide(false)}
                    variant="outline"
                    className="w-full"
                  >
                    戻る
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // 統一されたローディング状態
  if (googleMapsLoading || 
      !googleMapsLoaded || 
      containerDimensions.height === 0 || 
      locationLoading || 
      (!latitude || !longitude) ||
      !mapInitialized) {
    
    let loadingMessage = "地図を準備中...";
    if (googleMapsLoading) loadingMessage = "Google Maps APIを読み込み中...";
    else if (!googleMapsLoaded) loadingMessage = "Google Maps APIを待機中...";
    else if (containerDimensions.height === 0) loadingMessage = "画面サイズを調整中...";
    else if (locationLoading) {
      loadingMessage = isPermissionGranted ? "保存された設定で位置情報を取得中..." : "現在位置を取得中...";
    }
    else if (!latitude || !longitude) loadingMessage = "位置情報を待機中...";
    else if (!mapInitialized) loadingMessage = "地図を作成中...";
    
    return (
      <div className="w-full h-full bg-gray-50 relative">
        <div 
          ref={mapContainerRef} 
          className="w-full h-full bg-gray-50"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600 text-center px-4 font-medium mb-4">
            {loadingMessage}
          </p>
          
          {/* 許可状態の表示 */}
          {isPermissionGranted && permissionRemainingMinutes > 0 && (
            <div className="flex items-center text-green-600 text-sm mb-4">
              <Clock className="h-4 w-4 mr-2" />
              位置情報許可中（残り約{permissionRemainingMinutes}分）
            </div>
          )}
          
          {/* 位置情報ヘルプボタン */}
          {(permissionState === 'prompt' || (!latitude && !isPermissionGranted)) && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                // 🔥 モーダルを表示せず、直接位置情報を要求
                requestLocation();
              }}
              className="mb-4"
            >
              <MapPin className="h-4 w-4 mr-2" />
              位置情報を許可する
            </Button>
          )}
        </div>
      </div>
    );
  }
  
  // メインのマップ表示
  return (
    <div className="w-full h-full bg-gray-50 relative">
      <div 
        ref={mapContainerRef} 
        className="w-full h-full"
      />

      {/* 説明テキストと範囲表示切り替えボタン（左下に配置） */}
      {map && mapInitialized && (
        <div className="absolute bottom-8 left-2 z-30 space-y-2">
          {/* 現在地と範囲の説明テキスト */}
          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 shadow-lg max-w-xs">
            <div className="space-y-1">
              <div className="flex items-center">
                <img 
                  src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749098791/%E9%B3%A9_azif4f.png" 
                  alt="現在地" 
                  className="h-4 w-4 mr-2" 
                />
                <span className="text-xs font-medium">現在地</span>
              </div>
              <div className="text-xs text-gray-600">
                {posts.length > 0 
                  ? (
                    <>
                      {`${posts.length}件の投稿を表示中`}
                      <br />
                      <span className="text-xs">📧 = カテゴリ別色分け</span>
                    </>
                  )
                  : "緑色のエリア＝投稿閲覧範囲"
                }
              </div>
            </div>
          </div>
          
          {/* 🔥 範囲表示切り替えボタン（投稿がある場合のみ表示） */}
          {posts.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Button
                onClick={toggleRangeCircle}
                variant={showRangeCircle ? "default" : "outline"}
                size="sm"
                className={`shadow-lg ${
                  showRangeCircle 
                    ? 'bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700' 
                    : 'bg-white hover:bg-gray-400 text-gray-800 border-gray-800 hover:border-gray-400'
                }`}
              >
                {showRangeCircle ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    範囲を非表示
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    5km圏内を表示
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </div>
      )}

      {/* 検索コントロール */}
      {map && mapInitialized && (
        <div 
          className="absolute top-2 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-1rem)] max-w-md sm:max-w-lg"
        >
          <MapSearchControl
            map={map}
            userLocation={latitude && longitude ? new google.maps.LatLng(latitude, longitude) : null}
            onPlaceSelected={handlePlaceSelected}
            onSearchError={handleSearchError}
          />
        </div>
      )}

      {/* 選択された場所の情報表示 */}
      {selectedPlace && selectedPlace.geometry && map && mapInitialized && (
        <motion.div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] sm:w-auto sm:max-w-md z-10 p-3 bg-background rounded-lg shadow-xl flex items-center justify-between"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="overflow-hidden mr-2">
            <h3 className="font-semibold text-sm sm:text-base truncate">{selectedPlace.name}</h3>
            {distanceToSelectedPlace && (
              <p className="text-xs sm:text-sm text-muted-foreground">
                現在地からの距離: {distanceToSelectedPlace}
              </p>
            )}
            <p className="text-xs text-muted-foreground truncate max-w-[160px] xs:max-w-[180px] sm:max-w-xs">
              {selectedPlace.formatted_address}
            </p>
          </div>
          <Button
            size="sm" 
            onClick={() => openGoogleMapsNavigation(selectedPlace)}
            className="flex-shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground px-2 py-1 sm:px-3 sm:py-2"
            aria-label="Googleマップで経路を表示"
          >
            <Navigation className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-1" />
            <span className="hidden sm:inline">経路</span>
          </Button>
        </motion.div>
      )}

      {/* クロスブラウザ位置情報ガイド */}
      <CrossBrowserLocationGuide
        isVisible={showLocationGuide}
        browserInfo={browserInfo}
        permissionState={permissionState}
        onRequestLocation={handleLocationRequest}
        onClose={() => setShowLocationGuide(false)}
        isPermissionGranted={isPermissionGranted}
        permissionRemainingMinutes={permissionRemainingMinutes}
      />
    </div>
  );
}
