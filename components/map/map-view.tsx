"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { useGoogleMapsApi } from '@/components/providers/GoogleMapsApiProvider';
import { Button } from '@/components/ui/button';
import { MapPin, AlertTriangle, RefreshCw, Clock, Eye, EyeOff, Calendar, Newspaper, User, MapPinIcon, CalendarDays, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

declare global {
  interface Window {
    google: any;
  }
}

// 投稿データの型定義を修正（image_urlsは配列型）
interface PostMarkerData {
  id: string;
  category: string | null;
  store_name: string;
  content: string;
  store_latitude: number;
  store_longitude: number;
  created_at: string;
  expires_at: string;
  remaining_slots: number | null;
  image_urls: string[] | null; // 画像URLの配列に変更
}

// 🔥 簡易的なイベントアイコンを作成（SVG形式）
const createSimpleEventIcon = () => {
  const svgIcon = `
    <svg width="32" height="40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#8B5CF6" stroke="white" stroke-width="2"/>
      <text x="16" y="21" text-anchor="middle" font-size="18" fill="white">📅</text>
    </svg>
  `;
  
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgIcon),
    scaledSize: new window.google.maps.Size(32, 40),
    anchor: new window.google.maps.Point(16, 40),
  };
};

// 🔥 画像付きイベント情報用のアイコンを作成（円形・白縁・40x40）
const createEventPinIcon = async (imageUrls: string[] | null): Promise<google.maps.Icon> => {
  // 🔥 image_urlsが文字列の場合はパースを試みる
  let parsedUrls = imageUrls;
  if (typeof imageUrls === 'string') {
    try {
      parsedUrls = JSON.parse(imageUrls);
    } catch (e) {
      console.error('createEventPinIcon: 画像URLのパースに失敗:', e);
      parsedUrls = null;
    }
  }
  
  const imageUrl = parsedUrls && Array.isArray(parsedUrls) && parsedUrls.length > 0 ? parsedUrls[0] : null;
  
  // 画像がない、またはURLが不正な場合は簡易的なアイコンを返す
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
    return createSimpleEventIcon();
  }

  // 🔥 画像を円形・白縁で40x40サイズに
  const size = 40;
  const borderWidth = 3; // 白い縁の幅
  
  return new Promise<google.maps.Icon>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Canvasで円形画像を作成
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        // Canvas が使えない場合は簡易アイコン
        resolve(createSimpleEventIcon());
        return;
      }

      // 背景を透明に
      ctx.clearRect(0, 0, size, size);
      
      // 円形のクリッピングパスを作成
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - borderWidth, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      
      // 画像を円形に描画（中央に配置してトリミング）
      // 画像のアスペクト比を保ちながら円形にフィット
      const imgAspect = img.width / img.height;
      let drawWidth = size;
      let drawHeight = size;
      let offsetX = 0;
      let offsetY = 0;
      
      if (imgAspect > 1) {
        // 横長の画像
        drawWidth = drawHeight * imgAspect;
        offsetX = -(drawWidth - size) / 2;
      } else {
        // 縦長の画像
        drawHeight = drawWidth / imgAspect;
        offsetY = -(drawHeight - size) / 2;
      }
      
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      
      // クリップを解除
      ctx.restore();
      
      // 白い縁を描画
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - borderWidth / 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#73370c';
      ctx.lineWidth = borderWidth;
      ctx.stroke();
      
      // CanvasをData URLに変換
      const dataUrl = canvas.toDataURL('image/png');
      
      resolve({
        url: dataUrl,
        scaledSize: new window.google.maps.Size(size, size),
        anchor: new window.google.maps.Point(size / 2, size),
      });
    };
    
    img.onerror = () => {
      // 画像読み込みエラー時は簡易アイコンを返す
      console.error('createEventPinIcon: 画像の読み込みに失敗:', imageUrl);
      resolve(createSimpleEventIcon());
    };
    
    img.src = imageUrl;
  });
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
    isPermissionGranted,
    permissionRemainingMinutes
  } = useGeolocation();

  const [mapInitialized, setMapInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0
  });

  const [userLocationMarker, setUserLocationMarker] = useState<google.maps.Marker | null>(null);
  
  // 🔥 投稿データとマーカー関連の状態を追加
  const [posts, setPosts] = useState<PostMarkerData[]>([]);
  const [postMarkers, setPostMarkers] = useState<google.maps.Marker[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostMarkerData | null>(null);
  const router = useRouter();

  // 🔥 保存された位置情報を読み込む
  const [savedLocation, setSavedLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    // localStorageから位置情報を読み込む
    try {
      const savedData = localStorage.getItem('userLocation');
      if (savedData) {
        const locationData = JSON.parse(savedData);
        const now = Date.now();
        
        // 有効期限内かチェック
        if (locationData.expiresAt && locationData.expiresAt > now) {
          console.log('MapView: 保存された位置情報を使用', locationData);
          setSavedLocation({
            lat: locationData.latitude,
            lng: locationData.longitude
          });
        } else {
          console.log('MapView: 保存された位置情報の有効期限切れ');
          localStorage.removeItem('userLocation');
        }
      }
    } catch (error) {
      console.error('MapView: 位置情報の読み込みに失敗:', error);
    }
  }, []);

  // コンテナ寸法の取得（シンプル化）
  const updateContainerDimensions = useCallback(() => {
    if (!mapContainerRef.current) return false;
    
    const container = mapContainerRef.current;
    const parent = container.parentElement;
    
    if (!parent) return false;
    
    const parentRect = parent.getBoundingClientRect();
    const width = parentRect.width;
    const height = parentRect.height;
    
    setContainerDimensions({ width, height });
    
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    container.style.position = 'relative';
    
    return width > 0 && height > 200;
  }, []);

  // コンテナ寸法の監視（シンプル化）
  useEffect(() => {
    updateContainerDimensions();
    
    const timer = setTimeout(updateContainerDimensions, 300);

    const handleResize = () => {
      setTimeout(updateContainerDimensions, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [updateContainerDimensions]);


  // 🔥 投稿データを取得する関数を修正（範囲制限を削除）
  const fetchPosts = useCallback(async () => {
    const userLat = savedLocation?.lat || latitude;
    const userLng = savedLocation?.lng || longitude;
    
    if (!userLat || !userLng) {
      console.log('MapView: 位置情報がないため投稿データの取得をスキップ');
      return;
    }

    setLoadingPosts(true);
    try {
      console.log('MapView: イベント情報を取得中...', { lat: userLat, lng: userLng });
      
      const now = new Date().toISOString();
      
      // 🔥 イベント情報のみを取得（距離制限なし）
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
          expires_at,
          remaining_slots,
          image_urls
        `)
        .eq('is_deleted', false)
        .eq('category', 'イベント情報')
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

      // 🔥 image_urlsの正規化のみ実行（距離フィルタリング削除）
      const normalizedPosts = data.map((post: any) => {
        let imageUrls = post.image_urls;
        if (typeof imageUrls === 'string') {
          try {
            imageUrls = JSON.parse(imageUrls);
          } catch (e) {
            console.error('画像URLのパースに失敗:', e);
            imageUrls = null;
          }
        }
        
        return {
          ...post,
          image_urls: imageUrls
        };
      });

      console.log(`MapView: ${normalizedPosts.length}件のイベント情報を取得しました`);
      setPosts(normalizedPosts);
      
    } catch (error) {
      console.error('MapView: 投稿データの取得中にエラー:', error);
    } finally {
      setLoadingPosts(false);
    }
  }, [latitude, longitude, savedLocation]);

  // �� クラスター機能は不要なので削除

  // 🔥 同じ場所の投稿をグループ化する関数
  const groupPostsByLocation = (posts: PostMarkerData[]) => {
    const locationGroups: { [key: string]: PostMarkerData[] } = {};
    
    posts.forEach(post => {
      if (!post.store_latitude || !post.store_longitude) return;
      
      // 座標を小数点第4位で丸めて同じ場所として扱う（約10m程度の精度）
      const lat = Math.round(post.store_latitude * 10000) / 10000;
      const lng = Math.round(post.store_longitude * 10000) / 10000;
      const locationKey = `${lat},${lng}`;
      
      if (!locationGroups[locationKey]) {
        locationGroups[locationKey] = [];
      }
      locationGroups[locationKey].push(post);
    });
    
    return locationGroups;
  };

  // �� 投稿マーカーを作成する関数（軽量化版）- 依存配列から postMarkers を削除
  const createPostMarkers = useCallback(async () => {
    if (!map || !posts.length || !window.google?.maps) {
      console.log('MapView: マーカー作成の条件が揃っていません');
      return;
    }

    console.log(`MapView: ${posts.length}件のイベント情報マーカーを作成中...`);

    // �� 既存のマーカーを削除（クロージャー内の変数を使用）
    const markersToClean = [...postMarkers];
    markersToClean.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    
    const newMarkers: google.maps.Marker[] = [];

    // 🔥 同じ場所の投稿をグループ化
    const locationGroups = groupPostsByLocation(posts);

    // 🔥 非同期処理を順次実行
    for (const [locationKey, groupPosts] of Object.entries(locationGroups)) {
      const [lat, lng] = locationKey.split(',').map(Number);
      const position = new window.google.maps.LatLng(lat, lng);
      
      const post = groupPosts[0];
      const markerTitle = `${post.store_name} - イベント情報`;

      // 🔥 画像アイコンを作成（非同期処理）
      const markerIcon = await createEventPinIcon(post.image_urls);

      const marker = new window.google.maps.Marker({
        position,
        map,
        title: markerTitle,
        icon: markerIcon,
        animation: window.google.maps.Animation.DROP,
      });

      // マーカークリック時の処理（カードを表示）
      marker.addListener('click', () => {
        console.log(`MapView: イベント情報マーカーがクリックされました - ID: ${post.id}`);
        setSelectedPost(post);
      });

      newMarkers.push(marker);
    }

    setPostMarkers(newMarkers);
  }, [map, posts, router]); 

  // 地図初期化（シンプル化 - 位置情報なしでも初期化可能に）
  const initializeMap = useCallback(() => {
    if (!mapContainerRef.current || 
        mapInstanceRef.current || 
        !googleMapsLoaded || 
        containerDimensions.height < 200 ||
        initializationTriedRef.current) {
      return false;
    }

    if (!window.google?.maps?.Map) {
      setInitializationError("Google Maps APIが利用できません。");
      return false;
    }

    initializationTriedRef.current = true;

    try {
      const container = mapContainerRef.current;
      container.innerHTML = '';

      // 🔥 保存された位置情報を最優先、次にuseGeolocationの値、最後にデフォルト（東京）
      const center = savedLocation 
        ? savedLocation
        : (latitude && longitude) 
          ? { lat: latitude, lng: longitude }
          : { lat: 35.6812, lng: 139.7671 }; // 東京駅

      console.log('MapView: 地図の中心座標:', center);

      // シンプルな地図オプション
      const mapOptions: google.maps.MapOptions = {
        center,
        zoom: (savedLocation || (latitude && longitude)) ? 14 : 12, // 位置情報がある場合はズーム
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'cooperative',
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      };

      const newMap = new window.google.maps.Map(container, mapOptions);
      mapInstanceRef.current = newMap;

      // 地図読み込み完了
      window.google.maps.event.addListenerOnce(newMap, 'idle', () => {
        setMap(newMap);
        setMapInitialized(true);
        setInitializationError(null);
      });

    } catch (error) {
      console.error('Map initialization failed:', error);
      setInitializationError(`地図の初期化に失敗しました`);
      initializationTriedRef.current = false;
      return false;
    }
  }, [googleMapsLoaded, latitude, longitude, savedLocation, containerDimensions]);

  // 地図初期化の実行タイミング制御（位置情報を待たずに実行）
  useEffect(() => {
    if (googleMapsLoaded && 
        containerDimensions.height >= 200 && 
        !mapInitialized &&
        !initializationTriedRef.current) {
      
      const timer = setTimeout(() => {
        initializeMap();
      }, 100); // 200ms → 100ms に短縮

      return () => clearTimeout(timer);
    }
  }, [googleMapsLoaded, containerDimensions, mapInitialized, initializeMap]);

  // 🔥 位置情報が取得できたら投稿データを取得（保存された位置情報も考慮）
  useEffect(() => {
    const userLat = savedLocation?.lat || latitude;
    const userLng = savedLocation?.lng || longitude;
    
    if (userLat && userLng && mapInitialized) {
      fetchPosts();
    }
  }, [latitude, longitude, savedLocation, mapInitialized, fetchPosts]);

  //  投稿データが更新されたらマーカーを作成（修正版）
  useEffect(() => {
    if (posts.length > 0 && map && window.google?.maps) {
      createPostMarkers();
    }
  }, [posts, map]); // �� createPostMarkers を依存配列から削除

  // �� 投稿がある場合は範囲円を非表示にするuseEffectを削除
  // useEffect(() => {
  //   if (posts.length > 0) {
  //     setShowRangeCircle(false);
  //   } else {
  //     setShowRangeCircle(true);
  //   }
  // }, [posts.length]);

  // ユーザー位置マーカーの設置（保存された位置情報も考慮）
  useEffect(() => {
    const userLat = savedLocation?.lat || latitude;
    const userLng = savedLocation?.lng || longitude;
    
    if (map && userLat && userLng && mapInitialized && window.google?.maps) {
      console.log(`MapView ${browserInfo.name}: Setting user location marker`, { lat: userLat, lng: userLng });
      const userPosition = new window.google.maps.LatLng(userLat, userLng);
      
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

      // 位置情報が取得できたら地図の中心を移動
      map.panTo(userPosition);
      const currentZoom = map.getZoom();
      if (currentZoom !== undefined && currentZoom < 14) {
        map.setZoom(14);
      }
    }
  }, [map, latitude, longitude, savedLocation, mapInitialized, userLocationMarker, browserInfo.name]);


  // 再試行機能（円のクリーンアップを削除）
  const handleRetry = () => {
    console.log(`MapView ${browserInfo.name}: Retrying initialization`);
    setInitializationError(null);
    setMapInitialized(false);
    initializationTriedRef.current = false;
    mapInstanceRef.current = null;
    setMap(null);
    
    // 既存のマーカーをクリーンアップ
    if (userLocationMarker) {
      userLocationMarker.setMap(null);
      setUserLocationMarker(null);
    }    
    // 投稿マーカーもクリーンアップ
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
    
    setTimeout(() => {
      updateContainerDimensions();
      if (!latitude || !longitude) {
        requestLocation();
      }
    }, 100);
  };

  
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


  // 統一されたローディング状態（シンプル化） - 612行目あたり
  if (!googleMapsLoaded || !mapInitialized) {
    // 位置情報エラーがある場合は許可ダイアログを表示
    if (locationError && permissionState === 'denied') {
      return (
        <MessageCard 
          title="位置情報の許可が必要です" 
          message={locationError}
          variant="warning" 
          icon={MapPin}
        >
          <Button onClick={requestLocation} className="mt-4">
            <MapPin className="mr-2 h-4 w-4" />
            位置情報を許可する
          </Button>
        </MessageCard>
      );
    }
    
    return (
      <div className="w-full h-full bg-gray-50 relative">
        <div 
          ref={mapContainerRef} 
          className="w-full h-full bg-gray-50"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73370c] mb-4"></div>
          <p className="text-gray-600 text-center px-4 font-medium">
            地図を準備中...
          </p>
          {(!latitude || !longitude) && permissionState !== 'denied' && (
            <p className="text-gray-500 text-sm text-center px-4 mt-2">
              位置情報を取得中...
            </p>
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
        style={{
          // 🔥 タッチイベント最適化 - manipulationを追加してスクロール干渉を防ぐ
          touchAction: 'manipulation',
          WebkitOverflowScrolling: 'touch',
          // 🔥 追加のブラウザ最適化
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none'
        }}
      />

      {/* 右上のナビゲーションボタン（縦並び） */}
      {map && mapInitialized && (
        <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
          {/* イベントリスト画面 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Button
              onClick={() => router.push('/events')}
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg bg-white hover:bg-gray-100 border-2 border-gray-200"
              style={{ backgroundColor: 'white' }}
            >
              <Newspaper className="h-6 w-6 text-gray-700" />
            </Button>
          </motion.div>

          {/* プロフィールアイコン（マイページ画面へ） */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Button
              onClick={() => router.push('/profile')}
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg bg-white hover:bg-gray-100 border-2 border-gray-200"
              style={{ backgroundColor: 'white' }}
            >
              <User className="h-6 w-6 text-gray-700" />
            </Button>
          </motion.div>
        </div>
      )}

      {map && mapInitialized && (
        <div className="absolute bottom-8 left-2 z-30 space-y-2">
          {/* 現在地の説明テキスト */}
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
                  ? `${posts.length}件のイベント情報有`
                  : "イベント情報を検索中..."
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* イベント詳細カード（下部に表示） */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute bottom-4 left-4 right-4 z-40"
          >
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-gray-200">
              {/* カードヘッダー */}
              <div className="relative">
                {/* 画像表示 */}
                {selectedPost.image_urls && selectedPost.image_urls.length > 0 ? (
                  <div className="relative h-48 w-full overflow-hidden bg-gray-100">
                    <img
                      src={selectedPost.image_urls[0]}
                      alt={selectedPost.store_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="relative h-48 w-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                    <Calendar className="h-20 w-20 text-white opacity-50" />
                  </div>
                )}
                
                {/* 閉じるボタン */}
                <Button
                  onClick={() => setSelectedPost(null)}
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-lg"
                >
                  <X className="h-4 w-4 text-gray-700" />
                </Button>
              </div>

              {/* カード内容 */}
              <div className="p-4 space-y-3">
                {/* イベント名 */}
                <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
                  {selectedPost.content}
                </h3>

                {/* 場所 */}
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPinIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-500" />
                  <span className="line-clamp-1">{selectedPost.store_name}</span>
                </div>

                {/* 開催期日 */}
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <CalendarDays className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
                  <span>
                    {new Date(selectedPost.expires_at).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}まで
                  </span>
                </div>

                {/* 詳細を見るボタン */}
                <Button
                  onClick={() => router.push(`/map/event/${selectedPost.id}`)}
                  className="w-full mt-2 bg-[#73370c] text-white shadow-lg"
                >
                  詳細を見る
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
