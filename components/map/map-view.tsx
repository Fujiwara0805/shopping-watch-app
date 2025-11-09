"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { useGoogleMapsApi } from '@/components/providers/GoogleMapsApiProvider';
import { Button } from '@/components/ui/button';
import { MapPin, AlertTriangle, RefreshCw,  Calendar, Newspaper, User, MapPinIcon, X, ShoppingBag } from 'lucide-react';
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
  event_name: string | null;
  event_start_date?: string | null; // 🔥 追加
  event_end_date?: string | null;   // 🔥 追加
}

// 🔥 簡易的なイベントアイコンを作成（サイズを40x40に統一）
const createSimpleEventIcon = () => {
  const size = 40;
  const svgIcon = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 3}" fill="#73370c" stroke="#ffffff" stroke-width="3"/>
      <g transform="translate(${size/2 - 8}, ${size/2 - 8})">
        <rect x="2" y="4" width="12" height="10" rx="1" fill="none" stroke="white" stroke-width="1.5"/>
        <line x1="2" y1="7" x2="14" y2="7" stroke="white" stroke-width="1.5"/>
        <line x1="5" y1="2" x2="5" y2="5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="11" y1="2" x2="11" y2="5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
      </g>
    </svg>
  `;
  
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgIcon),
    scaledSize: new window.google.maps.Size(size, size),
    anchor: new window.google.maps.Point(size / 2, size),
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
  const [nearbyPosts, setNearbyPosts] = useState<PostMarkerData[]>([]); // タップしたイベント情報
  const router = useRouter();

  // 🔥 保存された位置情報を読み込む
  const [savedLocation, setSavedLocation] = useState<{lat: number, lng: number} | null>(null);

  // 🔥 初回ロードフラグを追加（785行目付近）
  const hasInitialLoadedRef = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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


  // 🔥 投稿データを取得する関数を修正（現在地の近い順にソート）
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
      
      const now = new Date();
      
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
          event_name,
          event_start_date,
          event_end_date,
          created_at,
          expires_at,
          remaining_slots,
          image_urls
        `)
        .eq('is_deleted', false)
        .eq('category', 'イベント情報');

      if (error) {
        console.error('MapView: 投稿データの取得に失敗:', error);
        return;
      }

      if (!data) {
        console.log('MapView: 投稿データがありません');
        setPosts([]);
        return;
      }

      // 🔥 終了したイベントを除外 - event_end_dateの23:59:59またはevent_start_dateの23:59:59で判定
      const filteredData = data.filter((post) => {
        // event_end_dateがある場合はその日の23:59:59まで表示
        if (post.event_end_date) {
          const endDate = new Date(post.event_end_date);
          endDate.setHours(23, 59, 59, 999);
          return now <= endDate;
        }
        // event_end_dateがない場合は、event_start_dateの23:59:59まで表示
        if (post.event_start_date) {
          const startDate = new Date(post.event_start_date);
          startDate.setHours(23, 59, 59, 999);
          return now <= startDate;
        }
        // どちらもない場合はexpires_atで判定
        return now <= new Date(post.expires_at);
      });

      console.log('2. 終了判定フィルタリング後:', filteredData.length, '件');

      // 🔥 現在地からの距離を計算して近い順にソート
      const postsWithDistance = filteredData
        .filter((post: any) => {
          // 🔥 座標が有効なイベントのみを対象にする
          const hasValidCoordinates = 
            post.store_latitude !== null && 
            post.store_latitude !== undefined &&
            post.store_longitude !== null && 
            post.store_longitude !== undefined &&
            !isNaN(post.store_latitude) &&
            !isNaN(post.store_longitude);
          
          if (!hasValidCoordinates) {
            console.warn('⚠️ 無効な座標のイベント:', post.id, post.event_name, {
              lat: post.store_latitude,
              lng: post.store_longitude
            });
          }
          
          return hasValidCoordinates;
        })
        .map((post: any) => {
          let imageUrls = post.image_urls;
          if (typeof imageUrls === 'string') {
            try {
              imageUrls = JSON.parse(imageUrls);
            } catch (e) {
              console.error('画像URLのパースに失敗:', e);
              imageUrls = null;
            }
          }
          
          // 距離計算（Haversine formula）
          const R = 6371; // 地球の半径（km）
          const dLat = (post.store_latitude - userLat) * Math.PI / 180;
          const dLng = (post.store_longitude - userLng) * Math.PI / 180;
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(userLat * Math.PI / 180) * Math.cos(post.store_latitude * Math.PI / 180) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c; // km単位
          
          return {
            ...post,
            image_urls: imageUrls,
            distance: distance
          };
        });

      console.log('3. 座標フィルタリング後:', postsWithDistance.length, '件');

      // 距離が近い順にソート
      const sortedPosts = postsWithDistance.sort((a, b) => a.distance - b.distance);
      setPosts(sortedPosts);
      
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

  // �� 投稿マーカーを作成する関数（段階的に表示）
  const createPostMarkers = useCallback(async () => {
    if (!map || !posts.length || !window.google?.maps) {
      console.log('MapView: マーカー作成の条件が揃っていません');
      return;
    }

    console.log(`MapView: ${posts.length}件のイベント情報マーカーを作成中...`);

    // 🔥 既存のマーカーを削除
    const markersToClean = [...postMarkers];
    markersToClean.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    
    const newMarkers: google.maps.Marker[] = [];

    // 近い順に処理（既に距離順にソートされている）
    let batchIndex = 0;
    const batchSize = 10; // 一度に10個ずつ処理
    
    const processNextBatch = async () => {
      // 🔥 全投稿を個別に処理（グループ化しない）
      const batch = posts.slice(batchIndex, batchIndex + batchSize);
      
      if (batch.length === 0) {
        setPostMarkers(newMarkers);
        return;
      }
      
      // バッチ内のマーカーを並列処理
      const batchPromises = batch.map(async (post) => {
        if (!post.store_latitude || !post.store_longitude) return;
        
        const position = new window.google.maps.LatLng(post.store_latitude, post.store_longitude);
        const markerTitle = `${post.store_name} - イベント情報`;

        // 🔥 画像アイコンを作成
        const markerIcon = await createEventPinIcon(post.image_urls);

        const marker = new window.google.maps.Marker({
          position,
          map,
          title: markerTitle,
          icon: markerIcon,
          animation: window.google.maps.Animation.DROP,
        });

        marker.addListener('click', () => {
          console.log(`MapView: イベント情報マーカーがクリックされました - ID: ${post.id}`);
          setSelectedPost(post);
          
          // 🔥 タップしたイベントのみを表示（従来の方法に戻す）
          setNearbyPosts([post]);
        });

        return marker;
      });
      
      const batchMarkers = await Promise.all(batchPromises);
      // 🔥 nullを除外してマーカーを追加
      newMarkers.push(...batchMarkers.filter((m): m is google.maps.Marker => m !== null && m !== undefined));
      
      batchIndex += batchSize;
      
      // 次のバッチを少し遅延させて処理
      setTimeout(processNextBatch, 100);
    };
    
    processNextBatch();
  }, [map, posts, router]);

  // 地図初期化（ズームレベルを調整）
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

      const center = savedLocation 
        ? savedLocation
        : (latitude && longitude) 
          ? { lat: latitude, lng: longitude }
          : { lat: 35.6812, lng: 139.7671 };

      console.log('MapView: 地図の中心座標:', center);

      const mapOptions: google.maps.MapOptions = {
        center,
        zoom: (savedLocation || (latitude && longitude)) ? 15 : 13, // 🔥 14→15, 12→13にズームアップ
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy', // 🔥 'cooperative' → 'greedy' に変更（1本指で地図操作可能に）
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        
        // アプリのテーマカラー（茶色）に合わせたカスタムスタイル
        styles: [
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#e3f2fd" }] // 爽やかな水色
          },
          {
            featureType: "landscape",
            elementType: "geometry",
            stylers: [{ color: "#fff9f0" }] // 暖かみのあるクリーム色
          },
          {
            featureType: "road.highway",
            elementType: "geometry",
            stylers: [{ color: "#ffd89b" }] // 優しいオレンジベージュ
          },
          {
            featureType: "road.highway",
            elementType: "geometry.stroke",
            stylers: [{ color: "#f5c26b" }]
          },
          {
            featureType: "road.arterial",
            elementType: "geometry",
            stylers: [{ color: "#ffffff" }] // 白い道路
          },
          {
            featureType: "road.local",
            elementType: "geometry",
            stylers: [{ color: "#ffffff" }]
          },
          {
            featureType: "road",
            elementType: "labels.text.fill",
            stylers: [{ color: "#73370c" }] // アプリのテーマカラー（茶色）
          },
          {
            featureType: "road",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#ffffff" }, { weight: 2 }]
          },
          {
            featureType: "poi",
            elementType: "geometry",
            stylers: [{ color: "#fef3e8" }] // 薄いベージュ
          },
          {
            featureType: "poi.park",
            elementType: "geometry",
            stylers: [{ color: "#e8f5e9" }] // 薄い緑（公園）
          },
          {
            featureType: "poi",
            elementType: "labels.text.fill",
            stylers: [{ color: "#8b6332" }] // 茶色系
          },
          {
            featureType: "poi",
            elementType: "labels.icon",
            stylers: [{ visibility: "simplified" }] // POIアイコンを簡略化
          },
          {
            featureType: "transit",
            elementType: "geometry",
            stylers: [{ color: "#e5e5e5" }]
          },
          {
            featureType: "transit.station",
            elementType: "labels.text.fill",
            stylers: [{ color: "#73370c" }]
          },
          {
            featureType: "administrative",
            elementType: "geometry.stroke",
            stylers: [{ color: "#c9b2a6" }] // 境界線を薄茶色
          },
          {
            featureType: "administrative.land_parcel",
            elementType: "labels.text.fill",
            stylers: [{ color: "#ae9e90" }]
          }
        ]
      };

      const newMap = new window.google.maps.Map(container, mapOptions);
      mapInstanceRef.current = newMap;

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

  // 🔥 初回ロード時に自動更新（fetchPostsの後に追加）
  useEffect(() => {
    const userLat = savedLocation?.lat || latitude;
    const userLng = savedLocation?.lng || longitude;
    
    if (userLat && userLng && mapInitialized && !hasInitialLoadedRef.current) {
      hasInitialLoadedRef.current = true;
      fetchPosts();
    }
  }, [latitude, longitude, savedLocation, mapInitialized, fetchPosts]);

  // 🔥 手動更新の処理（位置情報取得を含む）
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    
    // 位置情報を再取得
    if ('geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });

        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: Date.now(),
          expiresAt: Date.now() + (60 * 60 * 1000)
        };
        localStorage.setItem('userLocation', JSON.stringify(locationData));
        
        setSavedLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });

        // 地図の中心を更新
        if (map) {
          const newCenter = new window.google.maps.LatLng(
            position.coords.latitude,
            position.coords.longitude
          );
          map.panTo(newCenter);
          
          // ユーザーマーカーも更新
          if (userLocationMarker) {
            userLocationMarker.setPosition(newCenter);
          }
        }
      } catch (error) {
        console.error('位置情報の取得に失敗:', error);
      }
    }
    
    // イベント情報を更新
    await fetchPosts();
    
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  //  投稿データが更新されたらマーカーを作成（修正版）
  useEffect(() => {
    if (posts.length > 0 && map && window.google?.maps) {
      createPostMarkers();
    }
  }, [posts, map]); // �� createPostMarkers を依存配列から削除


  // ユーザー位置マーカーの設置（ズームレベルを調整）
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

      map.panTo(userPosition);
      const currentZoom = map.getZoom();
      if (currentZoom !== undefined && currentZoom < 15) { // 🔥 14→15に変更
        map.setZoom(15);
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
            className="flex flex-col items-center"
          >
            <Button
              onClick={() => router.push('/events')}
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg bg-[#73370c] hover:bg-[#5c2a0a] border-2 border-white"
            >
              <Newspaper className="h-6 w-6 text-white" />
            </Button>
            <span className="text-sm font-bold text-gray-700 ">一覧</span>
          </motion.div>

          {/* カレンダー画面 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="flex flex-col items-center"
          >
            <Button
              onClick={() => router.push('/calendar')}
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg bg-[#73370c] hover:bg-[#5c2a0a] border-2 border-white"
            >
              <Calendar className="h-6 w-6 text-white" />
            </Button>
            <span className="text-sm font-bold text-gray-700 ">カレンダー</span>
          </motion.div>

          {/* プロフィールアイコン（マイページ画面へ） */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <Button
              onClick={() => router.push('/profile')}
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg bg-[#73370c] hover:bg-[#5c2a0a] border-2 border-white"
            >
              <User className="h-6 w-6 text-white" />
            </Button>
            <span className="text-sm font-bold text-gray-700 ">マイページ</span>
          </motion.div>

          {/* 更新アイコン */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            className="flex flex-col items-center"
          >
            <Button
              onClick={handleManualRefresh}
              size="icon"
              disabled={isRefreshing || loadingPosts}
              className="h-12 w-12 rounded-full shadow-lg bg-[#73370c] hover:bg-[#5c2a0a] border-2 border-white disabled:opacity-50"
            >
              <RefreshCw className={`h-6 w-6 text-white ${(isRefreshing || loadingPosts) ? 'animate-spin' : ''}`} />
            </Button>
            <span className="text-sm font-bold text-gray-700">更新</span>
          </motion.div>

          {/* 🔥 メモアイコン（新規追加） */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="flex flex-col items-center"
          >
            <Button
              onClick={() => router.push('/memo')}
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg bg-[#73370c] hover:bg-[#5c2a0a] border-2 border-white"
            >
              <ShoppingBag className="h-6 w-6 text-white" />
            </Button>
            <span className="text-sm font-bold text-gray-700 ">メモ</span>
          </motion.div>
        </div>
      )}

      {/* �� 更新中の表示を追加（745行目付近、右上ボタンの前） */}
      <AnimatePresence>
        {(isRefreshing || loadingPosts) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-1/2 transform -translate-x-1/2 z-40 bg-white/95 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border border-gray-200"
          >
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-[#73370c] animate-spin" />
              <span className="text-sm font-bold text-[#73370c]">更新中...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
        {selectedPost && nearbyPosts.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute bottom-4 left-4 right-4 z-40"
          >
            {nearbyPosts.map((post) => (
              <div key={post.id} className="bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-gray-200">
                {/* カードヘッダー */}
                <div className="relative">
                  {/* 画像表示 - 🔥 品質向上 */}
                  {post.image_urls && post.image_urls.length > 0 ? (
                    <div className="relative h-48 w-full overflow-hidden bg-gray-100">
                      <img
                        src={post.image_urls[0]}
                        alt={post.store_name}
                        className="w-full h-full object-cover"
                        loading="eager"
                        decoding="async"
                        fetchPriority="high"
                      />
                    </div>
                  ) : (
                    <div className="relative h-48 w-full bg-[#fef3e8] flex items-center justify-center">
                      <Calendar className="h-20 w-20 text-[#73370c] opacity-30" />
                    </div>
                  )}
                  
                  {/* 閉じるボタン */}
                  <Button
                    onClick={() => {
                      setSelectedPost(null);
                      setNearbyPosts([]);
                    }}
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-lg"
                  >
                    <X className="h-4 w-4 text-gray-700" />
                  </Button>
                </div>

                {/* カード内容 */}
                <div className="p-4 space-y-3">
                  {/* イベント名 - 🔥 15文字制限、テキストカラー変更 */}
                  <h3 className="text-lg font-bold line-clamp-2" style={{ color: '#73370c' }}>
                    {(post.event_name || post.content).length > 15 
                      ? `${(post.event_name || post.content).substring(0, 15)}...` 
                      : (post.event_name || post.content)}
                  </h3>

                  {/* 開催場所 */}
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPinIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-500" />
                    <span className="line-clamp-1">{post.store_name}</span>
                  </div>

                  {/* 開催期日 */}
                  {post.expires_at && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
                      <span>
                      {post.event_start_date && new Date(post.event_start_date).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                        {post.event_end_date && post.event_end_date !== post.event_start_date && (
                          <> 〜 {new Date(post.event_end_date).toLocaleDateString('ja-JP', {
                            month: 'long',
                            day: 'numeric'
                          })}</>
                        )}
                      </span>
                    </div>
                  )}

                  {/* 詳細を見るボタン */}
                  <Button
                    onClick={() => router.push(`/map/event/${post.id}`)}
                    className="w-full mt-2 bg-[#73370c] hover:bg-[#5c2a0a] text-white shadow-lg"
                  >
                    詳細を見る
                  </Button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
