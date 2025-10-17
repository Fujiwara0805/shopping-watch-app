"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGeolocation } from '@/lib/hooks/use-geolocation'; // Enhanced version
import { useGoogleMapsApi } from '@/components/providers/GoogleMapsApiProvider';
import { Button } from '@/components/ui/button';
import { MapPin, AlertTriangle, Navigation, RefreshCw, Smartphone, Monitor, Globe, Clock, Eye, EyeOff, ArrowLeft, Utensils, ShoppingBag, Calendar, Heart, Package, MessageSquareText, Layers, Store, ExternalLink, Info, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { MapSearchControl } from './MapSearchControl';
import { CrossBrowserLocationGuide } from './CrossBrowserLocationGuide'; // Enhanced version
import { LocationPermissionManager } from '@/lib/hooks/LocationPermissionManager';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { CustomModal } from '@/components/ui/custom-modal';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

declare global {
  interface Window {
    google: any;
  }
}

// 🔥 投稿データの型定義を修正（remaining_slotsを追加）
interface PostMarkerData {
  id: string;
  category: string | null;
  store_name: string;
  content: string;
  store_latitude: number;
  store_longitude: number;
  created_at: string;
  expires_at: string;
  remaining_slots: number | null; // �� 残数情報を追加
}

// 🔥 カテゴリーカラーを取得する関数を復活（カテゴリー未入力対応）
const getCategoryColor = (category: string | null) => {
  if (!category) return '#6b7280'; // カテゴリーが未入力の場合はグレー
  
  switch(category) {
    case '空席情報':
      return '#ea580c'; // orange-600
    case '在庫情報':
      return '#2563eb'; // blue-600
    case 'イベント情報':
      return '#9333ea'; // purple-600
    case '助け合い':
      return '#dc2626'; // red-600
    case '口コミ':
      return '#4b5563'; // gray-600
    default:
      return '#6b7280'; // gray-500
  }
};

// 🔥 残数の単位を取得する関数を追加
const getRemainingUnit = (category: string | null) => {
  switch(category) {
    case '空席情報':
      return '席';
    case '在庫情報':
      return '個';
    case 'イベント情報':
      return '枠';
    default:
      return '枠';
  }
};

// 🔥 吹き出しアイコンのSVGを作成する関数（カテゴリ色対応、テキストサイズ拡大）
const getSpeechBubbleSvg = (remainingSlots: number, unit: string, categoryColor: string) => {
  const text = `残り${remainingSlots}${unit}`;
  const textWidth = text.length * 10 + 20; // 文字幅を拡大（8→10、16→20）
  const bubbleWidth = Math.max(90, textWidth); // 最小幅も拡大（80→90）
  const bubbleHeight = 35; // 高さも拡大（30→35）
  
  return `
    <svg width="${bubbleWidth + 10}" height="55" viewBox="0 0 ${bubbleWidth + 10} 55" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- 吹き出し本体 -->
      <rect x="5" y="5" width="${bubbleWidth}" height="${bubbleHeight}" rx="17" ry="17" fill="${categoryColor}" stroke="#ffffff" stroke-width="2"/>
      <!-- 吹き出しの尻尾 -->
      <path d="M${bubbleWidth/2 + 5} ${bubbleHeight + 5} L${bubbleWidth/2 + 10} ${bubbleHeight + 15} L${bubbleWidth/2} ${bubbleHeight + 15} Z" fill="${categoryColor}" stroke="#ffffff" stroke-width="1"/>
      <!-- テキスト -->
      <text x="${bubbleWidth/2 + 5}" y="${bubbleHeight/2 + 10}" text-anchor="middle" fill="white" font-size="14" font-weight="bold" font-family="Arial, sans-serif">${text}</text>
    </svg>
  `;
};

// 🔥 SVGをData URLに変換する関数
const createDataUrl = (svgString: string) => {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgString)}`;
};

// 🔥 イベント情報用のピンアイコンを作成する関数
const createEventPinIcon = () => {
  const iconUrl = "https://res.cloudinary.com/dz9trbwma/image/upload/v1760666722/%E3%81%B2%E3%82%99%E3%81%A3%E3%81%8F%E3%82%8A%E3%83%9E%E3%83%BC%E3%82%AF_kvzxcp.png";
  return {
    url: iconUrl,
    scaledSize: new window.google.maps.Size(32, 32), // 32x32のサイズに調整
    anchor: new window.google.maps.Point(16, 32), // アイコンの下端中央をアンカーに設定
  };
};

export function MapView() {
  console.log("MapView: Component rendering START");
  
  const { isLoaded: googleMapsLoaded, loadError: googleMapsLoadError, isLoading: googleMapsLoading } = useGoogleMapsApi();
  const searchParams = useSearchParams();
  
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
  
  // 🔥 1km圏内の範囲表示・非表示の状態管理（デフォルト：表示）
  const [showRangeCircle, setShowRangeCircle] = useState(true);

  // 🔥 投稿データとマーカー関連の状態を追加
  const [posts, setPosts] = useState<PostMarkerData[]>([]);
  const [postMarkers, setPostMarkers] = useState<google.maps.Marker[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const router = useRouter();

  // 🔥 地図の見方モーダルの状態を追加
  const [showMapGuideModal, setShowMapGuideModal] = useState(false);

  // URLパラメータから初期検索値を取得
  const initialSearchValue = searchParams.get('search') || '';

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

    // 基本的なPRリスナー
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });
    
    // ブラウザ別特有のPR
    if (browserInfo.name === 'safari') {
      window.addEventListener('pageshow', handleResize, { passive: true });
      window.addEventListener('focus', handleResize, { passive: true });
    } else if (browserInfo.name === 'firefox') {
      // Firefox用の追加PR
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

  // 🔥 投稿データを取得する関数を修正（イベント情報は残数なしでも取得）
  const fetchPosts = useCallback(async () => {
    if (!latitude || !longitude) {
      console.log('MapView: 位置情報がないため投稿データの取得をスキップ');
      return;
    }

    setLoadingPosts(true);
    try {
      console.log('MapView: 投稿データを取得中...');
      
      const now = new Date().toISOString();
      
      // 🔥 イベント情報は残数なしでも取得、他は残数ありのみ取得
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
          remaining_slots
        `)
        .eq('is_deleted', false)
        .gt('expires_at', now)
        .not('store_latitude', 'is', null)
        .not('store_longitude', 'is', null)
        .not('store_name', 'is', null)
        .or('category.eq.イベント情報,remaining_slots.not.is.null'); // 🔥 イベント情報または残数ありのもの

      if (error) {
        console.error('MapView: 投稿データの取得に失敗:', error);
        return;
      }

      if (!data) {
        console.log('MapView: 投稿データがありません');
        setPosts([]);
        return;
      }

      // 1km圏内でフィルタリング
      const filteredPosts = data.filter((post: any) => {
        if (!post.store_latitude || !post.store_longitude) return false;
        // 🔥 イベント情報は残数なしでもOK、他は残数必須
        if (post.category !== 'イベント情報' && post.remaining_slots == null) return false;
        
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
        
        return distance <= 1; // 1km以内
      });

      console.log(`MapView: ${filteredPosts.length}件の投稿を取得しました`);
      setPosts(filteredPosts);
      
    } catch (error) {
      console.error('MapView: 投稿データの取得中にエラー:', error);
    } finally {
      setLoadingPosts(false);
    }
  }, [latitude, longitude]);

  // 🔥 クラスターアイコンを作成する関数
  const createClusterIcon = (count: number) => {
    const size = count > 99 ? 60 : count > 9 ? 50 : 40;
    const fontSize = count > 99 ? 14 : count > 9 ? 16 : 18;
    
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="#dc2626" stroke="#ffffff" stroke-width="3"/>
        <text x="${size/2}" y="${size/2 + fontSize/3}" text-anchor="middle" fill="white" font-size="${fontSize}" font-weight="bold" font-family="Arial, sans-serif">${count}</text>
      </svg>
    `;
    
    return {
      url: createDataUrl(svg),
      scaledSize: new window.google.maps.Size(size, size),
      anchor: new window.google.maps.Point(size/2, size/2),
    };
  };

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

  // 🔥 投稿マーカーを作成する関数を修正（クラスター対応）
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

    // 🔥 同じ場所の投稿をグループ化
    const locationGroups = groupPostsByLocation(posts);

    Object.entries(locationGroups).forEach(([locationKey, groupPosts]) => {
      const [lat, lng] = locationKey.split(',').map(Number);
      const position = new window.google.maps.LatLng(lat, lng);
      
      if (groupPosts.length === 1) {
        // 🔥 単一の投稿の場合は従来通りの表示
        const post = groupPosts[0];
        let markerIcon;
        let markerTitle = post.store_name;

        // イベント情報の場合は専用アイコンを使用
        if (post.category === 'イベント情報') {
          markerIcon = createEventPinIcon();
          markerTitle = `${post.store_name} - イベント情報`;
        } else {
          // 他のカテゴリは従来通り吹き出しアイコン（残数情報必須）
          if (post.remaining_slots == null) return; // 残数なしはスキップ
          
          const unit = getRemainingUnit(post.category);
          const categoryColor = getCategoryColor(post.category);
          const speechBubbleSvg = getSpeechBubbleSvg(post.remaining_slots, unit, categoryColor);
          const iconUrl = createDataUrl(speechBubbleSvg);
          const textWidth = `残り${post.remaining_slots}${unit}`.length * 10 + 20;
          const bubbleWidth = Math.max(90, textWidth);

          markerIcon = {
            url: iconUrl,
            scaledSize: new window.google.maps.Size(bubbleWidth + 10, 55),
            anchor: new window.google.maps.Point((bubbleWidth + 10) / 2, 50),
          };
          markerTitle = `${post.store_name} - 残り${post.remaining_slots}${unit}`;
        }

        const marker = new window.google.maps.Marker({
          position,
          map,
          title: markerTitle,
          icon: markerIcon,
          animation: window.google.maps.Animation.DROP,
        });

        // マーカークリック時の処理
        marker.addListener('click', () => {
          console.log(`MapView: 投稿マーカーがクリックされました - ID: ${post.id}`);
          // タイムラインページに遷移（該当投稿をハイライト）
          router.push(`/timeline?highlightPostId=${post.id}`);
        });

        newMarkers.push(marker);
      } else {
        // 🔥 複数の投稿がある場合はクラスターアイコンを表示
        const clusterIcon = createClusterIcon(groupPosts.length);
        const storeName = groupPosts[0].store_name;
        
        const marker = new window.google.maps.Marker({
          position,
          map,
          title: `${storeName} - ${groupPosts.length}件の投稿`,
          icon: clusterIcon,
          animation: window.google.maps.Animation.DROP,
        });

        // クラスタークリック時の処理
        marker.addListener('click', () => {
          console.log(`MapView: クラスターマーカーがクリックされました - ${groupPosts.length}件の投稿`);
          console.log('MapView: 店舗名:', storeName);
          console.log('MapView: グループ投稿:', groupPosts.map(p => ({ id: p.id, store_name: p.store_name, category: p.category })));
          
          // 🔥 タイムラインページに遷移し、場所で検索
          const searchQuery = encodeURIComponent(storeName);
          console.log('MapView: 検索クエリ:', searchQuery);
          console.log('MapView: 遷移URL:', `/timeline?search=${searchQuery}`);
          
          router.push(`/timeline?search=${searchQuery}`);
        });

        newMarkers.push(marker);
      }
    });

    setPostMarkers(newMarkers);
    console.log(`MapView: ${newMarkers.length}個のマーカーを作成しました`);
  }, [map, posts, router]);

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
          // 🔥 「この地域の詳細画像は表示できません」メッセージを回避するため、明示的にROADMAPを設定
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          restriction: {
            latLngBounds: {
              north: 45.557,
              south: 24.217,
              east: 145.817,
              west: 122.933
            }
          },
          // 🔥 タッチイベント問題を修正 - cooperativeに統一
          gestureHandling: 'cooperative',
          scrollwheel: true,
          disableDoubleClickZoom: false,
          // 🔥 追加のタッチ最適化オプション
          draggable: true,
          keyboardShortcuts: false
        };

        switch (browserInfo.name) {
          case 'safari':
            return {
              ...baseOptions,
              zoom: 14,
              gestureHandling: 'cooperative'
            };
          
          case 'firefox':
            return {
              ...baseOptions,
              zoom: 14,
              gestureHandling: 'cooperative', // 🔥 'greedy'から'cooperative'に変更
              // Firefox では追加の最適化
              draggableCursor: 'default'
            };
          
          case 'chrome':
          case 'edge':
            return {
              ...baseOptions,
              zoom: 14,
              gestureHandling: 'cooperative' // 🔥 'greedy'から'cooperative'に変更
            };
          
          default:
            return {
              ...baseOptions,
              zoom: 14,  
              gestureHandling: 'cooperative' // 🔥 'greedy'から'cooperative'に変更
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
              newMap.setZoom(14);
            } else if (browserInfo.name === 'firefox') {
              newMap.setZoom(14);
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

      // 🔥 1km圏内の円を表示・非表示の制御
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
              radius: 1000, // 1km = 1000m
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
      if (currentZoom !== undefined && currentZoom < 14) {
        map.setZoom(14);
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
                      {`${posts.length}件の残数情報を表示中`}
                      <br />
                      <span className="text-xs">💬 = 残数情報付き投稿</span>
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
                    1km圏内を表示
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* 🔥 地図の見方ボタンを追加 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Button
              onClick={() => setShowMapGuideModal(true)}
              variant="outline"
              size="sm"
              className="shadow-lg bg-white hover:bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-300"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              地図の見方
            </Button>
          </motion.div>
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
            initialValue={initialSearchValue} // 初期検索値を渡す
          />
        </div>
      )}

      {/* 選択された場所の情報表示 */}
      {selectedPlace && selectedPlace.geometry && map && mapInitialized && (
        <motion.div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] sm:w-auto sm:max-w-md z-10 bg-background rounded-lg shadow-xl cursor-pointer hover:shadow-2xl transition-all duration-200"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => openGoogleMapsNavigation(selectedPlace)}
        >
          <div className="p-3 flex items-center justify-between">
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
              {/* クリックでGoogleマップに遷移することを示すテキスト */}
              <p className="text-xs text-blue-600 font-medium mt-1 flex items-center">
                <ExternalLink className="h-3 w-3 mr-1" />
                タップしてGoogleマップで開く
              </p>
            </div>
            <div className="flex-shrink-0 text-blue-600">
              <ExternalLink className="h-5 w-5" />
            </div>
          </div>
        </motion.div>
      )}

      {/* 🔥 地図の見方モーダル（修正版：カテゴリ色対応の吹き出しアイコンの説明に変更） */}
      <CustomModal
        isOpen={showMapGuideModal}
        onClose={() => setShowMapGuideModal(false)}
        title="地図の見方"
        description="残数情報付き投稿の表示と操作方法について"
        className="max-w-lg"
      >
        <Carousel className="w-full">
          <CarouselContent>
            {/* 1ページ目: 吹き出しマーカーの説明 */}
            <CarouselItem>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <MessageSquareText className="h-5 w-5 mr-2 text-blue-600" />
                    残数情報付き投稿の表示
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    地図上には、場所と残数情報が入力された投稿のみが吹き出しアイコンで表示されます。カテゴリごとに色分けされています：<br />
                    <span className="font-medium text-blue-700">マーカーをタップすると掲示板へ遷移し、該当する投稿の詳細を確認できます。</span>
                  </p>
                  <div className="space-y-4">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div 
                            className="flex items-center justify-center"
                            dangerouslySetInnerHTML={{
                              __html: getSpeechBubbleSvg(5, '席', '#ea580c')
                            }}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-orange-800 mb-1">
                            空席情報の例
                          </p>
                          <p className="text-xs text-orange-600">
                            オレンジ色で「残り5席」のように表示されます
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div 
                            className="flex items-center justify-center"
                            dangerouslySetInnerHTML={{
                              __html: getSpeechBubbleSvg(3, '個', '#2563eb')
                            }}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-800 mb-1">
                            在庫情報の例
                          </p>
                          <p className="text-xs text-blue-600">
                            青色で「残り3個」のように表示されます
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <img 
src="https://res.cloudinary.com/dz9trbwma/image/upload/v1760666722/%E3%81%B2%E3%82%99%E3%81%A3%E3%81%8F%E3%82%8A%E3%83%9E%E3%83%BC%E3%82%AF_kvzxcp.png" 
                            alt="イベント情報" 
                            className="h-8 w-8" 
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-purple-800 mb-1">
                            イベント情報の例
                          </p>
                          <p className="text-xs text-purple-600">
                            ピンアイコンで表示されます（残数情報なしでも表示）
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div 
                            className="flex items-center justify-center"
                            dangerouslySetInnerHTML={{
                              __html: `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="20" cy="20" r="18" fill="#dc2626" stroke="#ffffff" stroke-width="3"/>
                                <text x="20" y="26" text-anchor="middle" fill="white" font-size="18" font-weight="bold" font-family="Arial, sans-serif">3</text>
                              </svg>`
                            }}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-red-800 mb-1">
                            クラスター表示の例
                          </p>
                          <p className="text-xs text-red-600">
                            同じ場所に複数の投稿がある場合、赤い円に数字で表示されます
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ページインジケーター */}
                <div className="flex justify-center items-center space-x-2 pt-4 border-t">
                  <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                  <span className="text-xs text-gray-500 ml-2">1 / 2</span>
                </div>
              </div>
            </CarouselItem>

            {/* 2ページ目: 地図の操作方法 */}
            <CarouselItem>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Info className="h-5 w-5 mr-2 text-green-600" />
                    地図の操作方法
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div 
                            className="flex items-center justify-center scale-75"
                            dangerouslySetInnerHTML={{
                              __html: getSpeechBubbleSvg(5, '席', '#ea580c')
                            }}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-orange-800 mb-1">
                            吹き出しマーカーをタップ
                          </p>
                          <p className="text-xs text-orange-600">
                            掲示板へ遷移し、該当する投稿の詳細を確認できます
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div 
                            className="flex items-center justify-center scale-75"
                            dangerouslySetInnerHTML={{
                              __html: `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="20" cy="20" r="18" fill="#dc2626" stroke="#ffffff" stroke-width="3"/>
                                <text x="20" y="26" text-anchor="middle" fill="white" font-size="18" font-weight="bold" font-family="Arial, sans-serif">3</text>
                              </svg>`
                            }}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-red-800 mb-1">
                            クラスターマーカーをタップ
                          </p>
                          <p className="text-xs text-red-600">
                            掲示板へ遷移し、その場所の投稿一覧を検索結果として表示します
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <img 
                            src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749098791/%E9%B3%A9_azif4f.png" 
                            alt="現在地" 
                            className="h-8 w-8" 
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-amber-800 mb-1">
                            鳩マーカー（現在地）
                          </p>
                          <p className="text-xs text-amber-700">
                            あなたの現在位置を示しています。この位置を中心に1km圏内の投稿が表示されます
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 border-2 border-emerald-500 rounded-full bg-emerald-100 opacity-70"></div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-emerald-800 mb-1">
                            緑色の円（範囲表示）
                          </p>
                          <p className="text-xs text-emerald-600">
                            投稿を閲覧できる1km圏内の範囲を表示。残数情報付き投稿がある場合は自動的に非表示になります
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ページインジケーター */}
                <div className="flex justify-center items-center space-x-2 pt-4 border-t">
                  <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                  <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  <span className="text-xs text-gray-500 ml-2">2 / 2</span>
                </div>

                {/* 閉じるボタン */}
                <div className="pt-2">
                  <Button 
                    onClick={() => setShowMapGuideModal(false)}
                    className="w-full"
                  >
                    理解しました
                  </Button>
                </div>
              </div>
            </CarouselItem>
          </CarouselContent>

          {/* カルーセルナビゲーション */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <CarouselPrevious className="relative left-0 translate-y-0" />
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <CarouselNext className="relative right-0 translate-y-0" />
          </div>
        </Carousel>
      </CustomModal>

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
