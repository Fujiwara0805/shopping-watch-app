"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { useGoogleMapsApi } from '@/components/providers/GoogleMapsApiProvider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MapPin, AlertTriangle, RefreshCw,  Calendar, Newspaper, User, MapPinIcon, X, ShoppingBag, Loader2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { isWithinRange, calculateDistance } from '@/lib/utils/distance';

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
  image_urls: string[] | null; // 画像URLの配列に変更
  event_name: string | null;
  event_start_date?: string | null; // 🔥 追加
  event_end_date?: string | null;   // 🔥 追加
  enable_checkin?: boolean | null;  // 🔥 チェックイン対象フラグ
}

// カテゴリの型定義
type PostCategory = 'イベント情報' | '聖地巡礼' | '観光スポット' | '温泉' | 'グルメ';

// 🔥 カテゴリごとの色とアイコンを定義
const getCategoryConfig = (category: PostCategory) => {
  const configs = {
    'イベント情報': { color: '#73370c', icon: 'calendar' },
    '聖地巡礼': { color: '#3ecf8e', icon: 'shrine' },
    '観光スポット': { color: '#0066CC', icon: 'camera' },
    '温泉': { color: '#FF6B6B', icon: 'hotspring' },
    'グルメ': { color: '#FF8C00', icon: 'food' },
  };
  return configs[category] || configs['イベント情報'];
};

// 🔥 簡易的なアイコンを作成（カテゴリ別、サイズを40x40に縮小 - mapzineスタイル）
const createSimpleCategoryIcon = (category: PostCategory) => {
  const size = 40;
  const config = getCategoryConfig(category);
  
  let iconSvg = '';
  const iconScale = 0.75;
  switch (config.icon) {
    case 'calendar':
      iconSvg = `
        <g transform="translate(${size/2 - 5}, ${size/2 - 5}) scale(${iconScale})">
          <rect x="2" y="4" width="12" height="10" rx="1" fill="none" stroke="white" stroke-width="1.5"/>
          <line x1="2" y1="7" x2="14" y2="7" stroke="white" stroke-width="1.5"/>
          <line x1="5" y1="2" x2="5" y2="5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="11" y1="2" x2="11" y2="5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        </g>
      `;
      break;
    case 'shrine':
      iconSvg = `
        <g transform="translate(${size/2 - 5}, ${size/2 - 4}) scale(${iconScale})">
          <path d="M 8 2 L 4 6 L 4 10 L 12 10 L 12 6 Z" fill="none" stroke="white" stroke-width="1.5"/>
          <line x1="8" y1="2" x2="8" y2="10" stroke="white" stroke-width="1.5"/>
          <circle cx="8" cy="12" r="2" fill="none" stroke="white" stroke-width="1.5"/>
        </g>
      `;
      break;
    case 'camera':
      iconSvg = `
        <g transform="translate(${size/2 - 5}, ${size/2 - 4}) scale(${iconScale})">
          <rect x="3" y="4" width="10" height="8" rx="1" fill="none" stroke="white" stroke-width="1.5"/>
          <circle cx="8" cy="8" r="2.5" fill="none" stroke="white" stroke-width="1.5"/>
          <circle cx="8" cy="8" r="1" fill="white"/>
        </g>
      `;
      break;
    case 'hotspring':
      iconSvg = `
        <g transform="translate(${size/2 - 5}, ${size/2 - 4}) scale(${iconScale})">
          <circle cx="6" cy="8" r="2" fill="none" stroke="white" stroke-width="1.5"/>
          <circle cx="10" cy="8" r="2" fill="none" stroke="white" stroke-width="1.5"/>
          <path d="M 4 10 Q 8 12 12 10" fill="none" stroke="white" stroke-width="1.5"/>
        </g>
      `;
      break;
    case 'food':
      iconSvg = `
        <g transform="translate(${size/2 - 5}, ${size/2 - 4}) scale(${iconScale})">
          <circle cx="8" cy="8" r="4" fill="none" stroke="white" stroke-width="1.5"/>
          <path d="M 6 6 L 10 10 M 10 6 L 6 10" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        </g>
      `;
      break;
  }
  
  const svgIcon = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${config.color}" stroke="#ffffff" stroke-width="2"/>
      ${iconSvg}
    </svg>
  `;
  
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgIcon),
    scaledSize: new window.google.maps.Size(size, size),
    anchor: new window.google.maps.Point(size / 2, size),
  };
};

// 🔥 CloudinaryのURLを高品質化する関数
const optimizeCloudinaryImageUrl = (url: string): string => {
  if (!url || typeof url !== 'string') return url;
  
  // CloudinaryのURLの場合、品質パラメータを追加
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    // 既に品質パラメータが含まれているかチェック
    if (url.includes('q_auto') || url.includes('q_')) {
      // 既に品質パラメータがある場合はそのまま返す
      return url;
    }
    
    // /upload/の後に品質パラメータを追加
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex !== -1) {
      const beforeUpload = url.substring(0, uploadIndex + '/upload/'.length);
      const afterUpload = url.substring(uploadIndex + '/upload/'.length);
      
      // 高品質パラメータを追加（q_auto:best, f_auto）
      const qualityParams = 'q_auto:best,f_auto';
      return `${beforeUpload}${qualityParams}/${afterUpload}`;
    }
  }
  
  return url;
};

// 🔥 テキストを適切な幅で改行する関数
const wrapText = (text: string, maxWidth: number, ctx: CanvasRenderingContext2D): string[] => {
  const lines: string[] = [];
  let currentLine = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  
  // 最大3行まで
  if (lines.length > 3) {
    lines.length = 3;
    lines[2] = lines[2].slice(0, -1) + '…';
  }
  
  return lines;
};

// 🔥 画像付きカテゴリ用のアイコンを作成（mapzineスタイル - 40x40円形 + 鮮明テキスト）
const createCategoryPinIcon = async (
  imageUrls: string[] | null, 
  title: string | null, 
  category: PostCategory
): Promise<google.maps.Icon> => {
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
    return createSimpleCategoryIcon(category);
  }
  
  // 🔥 高品質な画像URLに変換
  const optimizedImageUrl = optimizeCloudinaryImageUrl(imageUrl);

  // 🔥 mapzineスタイル: 40x40サイズに縮小 + 鮮明なテキスト
  const imageSize = 40;
  const borderWidth = 2;
  const textPadding = 4;
  const maxTextWidth = 80; // テキストの最大幅
  const lineHeight = 12; // 行の高さ
  
  // タイトルは制限なし（全て表示）
  const displayTitle = title || '';
  
  return new Promise<google.maps.Icon>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // 一時的なCanvasでテキストの幅を測定
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        resolve(createSimpleCategoryIcon(category));
        return;
      }
      
      // 🔥 テキスト幅を測定（フォントサイズを10pxに）
      tempCtx.font = '600 10px "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif';
      
      // テキストを改行処理
      const textLines = wrapText(displayTitle, maxTextWidth, tempCtx);
      const numLines = textLines.length;
      
      // 各行の最大幅を計算
      let maxLineWidth = 0;
      textLines.forEach(line => {
        const lineWidth = tempCtx.measureText(line).width;
        if (lineWidth > maxLineWidth) {
          maxLineWidth = lineWidth;
        }
      });
      
      const textHeight = numLines * lineHeight + 4;
      
      // Canvasサイズを決定
      const canvasWidth = Math.max(imageSize, Math.ceil(maxLineWidth) + 12) + 4;
      const canvasHeight = imageSize + textPadding + textHeight;
      
      // 🔥 高解像度Canvas（Retina対応）
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth * scale;
      canvas.height = canvasHeight * scale;
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(createSimpleCategoryIcon(category));
        return;
      }

      // 高解像度スケール
      ctx.scale(scale, scale);
      
      // 背景を透明に
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      // 円形画像を中央に描画するためのオフセット
      const imageOffsetX = (canvasWidth - imageSize) / 2;
      
      // 円形のクリッピングパスを作成
      ctx.save();
      ctx.translate(imageOffsetX, 0);
      ctx.beginPath();
      ctx.arc(imageSize / 2, imageSize / 2, imageSize / 2 - borderWidth, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      
      // 画像を円形に描画（中央に配置してトリミング）
      const imgAspect = img.width / img.height;
      let drawWidth = imageSize;
      let drawHeight = imageSize;
      let offsetX = 0;
      let offsetY = 0;
      
      if (imgAspect > 1) {
        drawWidth = drawHeight * imgAspect;
        offsetX = -(drawWidth - imageSize) / 2;
      } else {
        drawHeight = drawWidth / imgAspect;
        offsetY = -(drawHeight - imageSize) / 2;
      }
      
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      
      // クリップを解除
      ctx.restore();
      
      // 🔥 白い縁を描画（mapzineスタイル）
      ctx.save();
      ctx.translate(imageOffsetX, 0);
      ctx.beginPath();
      ctx.arc(imageSize / 2, imageSize / 2, imageSize / 2 - borderWidth / 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = borderWidth;
      ctx.stroke();
      ctx.restore();
      
      // 🔥 テキストを描画（複数行対応・白縁付き）
      if (textLines.length > 0) {
        ctx.font = '600 10px "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        const textStartY = imageSize + textPadding;
        const textX = canvasWidth / 2;
        
        // 🔥 各行のテキストを描画（白縁 + 黒文字）
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = '#333333';
        
        textLines.forEach((line, index) => {
          const lineY = textStartY + index * lineHeight;
          // 白い縁を先に描画
          ctx.strokeText(line, textX, lineY);
          // テキスト本体を描画
          ctx.fillText(line, textX, lineY);
        });
      }
      
      // CanvasをData URLに変換
      const dataUrl = canvas.toDataURL('image/png');
      
      resolve({
        url: dataUrl,
        scaledSize: new window.google.maps.Size(canvasWidth, canvasHeight),
        anchor: new window.google.maps.Point(canvasWidth / 2, imageSize),
      });
    };
    
    img.onerror = () => {
      // 画像読み込みエラー時は簡易アイコンを返す
      console.error('createCategoryPinIcon: 画像の読み込みに失敗:', optimizedImageUrl);
      resolve(createSimpleCategoryIcon(category));
    };
    
    img.src = optimizedImageUrl;
  });
};

export function MapView() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  
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
  const [nearbyPosts, setNearbyPosts] = useState<PostMarkerData[]>([]); // タップした投稿

  // 🔥 保存された位置情報を読み込む
  const [savedLocation, setSavedLocation] = useState<{lat: number, lng: number} | null>(null);

  // 🔥 初回ロードフラグを追加（785行目付近）
  const hasInitialLoadedRef = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 🔥 カテゴリフィルターの状態管理（単一選択）
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>('イベント情報');

  // チェックイン関連の状態
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [checkedInPosts, setCheckedInPosts] = useState<Set<string>>(new Set());

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

  // チェックイン済みイベントを取得
  useEffect(() => {
    const fetchCheckedInPosts = async () => {
      if (!session?.user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('check_ins')
          .select('post_id')
          .eq('user_id', session.user.id);
        
        if (error) throw error;
        
        if (data) {
          setCheckedInPosts(new Set(data.map(c => c.post_id)));
        }
      } catch (error) {
        console.error('チェックイン取得エラー:', error);
      }
    };
    
    fetchCheckedInPosts();
  }, [session?.user?.id]);

  // チェックイン処理
  const handleCheckIn = async (post: PostMarkerData) => {
    // savedLocationを優先的に使用（チェックイン判定と同じロジック）
    const effectiveLatitude = savedLocation?.lat || latitude;
    const effectiveLongitude = savedLocation?.lng || longitude;
    
    if (!session?.user?.id || !effectiveLatitude || !effectiveLongitude) {
      toast({
        title: 'エラー',
        description: 'ログインまたは位置情報が取得できません',
        variant: 'destructive',
      });
      return;
    }
    
    setCheckingIn(post.id);
    
    try {
      const { error } = await supabase
        .from('check_ins')
        .insert({
          user_id: session.user.id,
          post_id: post.id,
          event_name: post.event_name || post.content,
          latitude: effectiveLatitude,
          longitude: effectiveLongitude,
        });
      
      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: '既にチェックイン済みです',
            description: 'このイベントには既にチェックインしています',
          });
        } else {
          throw error;
        }
      } else {
        setCheckedInPosts(prev => new Set(prev).add(post.id));
        toast({
          title: '🎉 チェックイン完了！',
          description: 'スタンプを獲得しました',
        });
      }
    } catch (error: any) {
      toast({
        title: 'チェックインエラー',
        description: error?.message || 'データベースへの保存に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setCheckingIn(null);
    }
  };

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
      
      // 🔥 選択されたカテゴリの投稿を取得（距離制限なし）
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
          image_urls,
          enable_checkin
        `)
        .eq('is_deleted', false)
        .eq('category', selectedCategory);

      if (error) {
        console.error('MapView: 投稿データの取得に失敗:', error);
        return;
      }

      if (!data) {
        console.log('MapView: 投稿データがありません');
        setPosts([]);
        return;
      }

      // 🔥 開催中のイベントのみを抽出
      const filteredData = data.filter((post) => {
        // event_start_dateがない場合は除外
        if (!post.event_start_date) {
          return false;
        }

        const startDate = new Date(post.event_start_date);
        startDate.setHours(0, 0, 0, 0); // 開始日の0時0分

        // event_end_dateがある場合
        if (post.event_end_date) {
          const endDate = new Date(post.event_end_date);
          endDate.setHours(23, 59, 59, 999); // 終了日の23時59分
          
          // 現在時刻が開始日以降かつ終了日以前 → 開催中
          return now >= startDate && now <= endDate;
        }
        
        // event_end_dateがない場合は、event_start_dateの当日のみ開催中とみなす
        const startDateEnd = new Date(post.event_start_date);
        startDateEnd.setHours(23, 59, 59, 999);
        
        return now >= startDate && now <= startDateEnd;
      });

      console.log(`2. ${selectedCategory}フィルタリング後:`, filteredData.length, '件');

      // 🔥 カテゴリごとにフィルタリング
      let finalFilteredData = filteredData.filter((post) => {
        // イベント情報の場合は開催中のみ
        if (post.category === 'イベント情報') {
          // 既に開催中のフィルタリング済みなのでそのまま
          return true;
        } else {
          // その他のカテゴリは有効期限内のみ
          if (!post.expires_at) return true; // expires_atがない場合は有効とみなす
          const expiresAt = new Date(post.expires_at);
          return now <= expiresAt;
        }
      });

      // 🔥 現在地からの距離を計算して近い順にソート
      const postsWithDistance = finalFilteredData
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
  }, [latitude, longitude, savedLocation, selectedCategory]);

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

  // 🔥 投稿マーカーを作成する関数（段階的に表示）
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
        const markerTitle = `${post.store_name} - ${post.category || '投稿'}`;
        
        // タイトルを決定（イベント情報の場合はevent_name、その他はcontent）
        const title = post.category === 'イベント情報' 
          ? (post.event_name || post.content)
          : post.content;

        // 🔥 画像アイコンを作成（カテゴリとタイトルを渡す）
        const markerIcon = await createCategoryPinIcon(
          post.image_urls, 
          title, 
          (post.category as PostCategory) || 'イベント情報'
        );

        const marker = new window.google.maps.Marker({
          position,
          map,
          title: markerTitle,
          icon: markerIcon,
          animation: window.google.maps.Animation.DROP,
        });

        marker.addListener('click', () => {
          console.log(`MapView: ${post.category}マーカーがクリックされました - ID: ${post.id}`);
          setSelectedPost(post);
          
          // 🔥 タップした投稿のみを表示
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
        zoom: (savedLocation || (latitude && longitude)) ? 15 : 13,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
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

  // 🔥 カテゴリ変更時にマーカーをクリアして投稿データを再取得
  useEffect(() => {
    if (map && window.google?.maps) {
      // 既存のマーカーを削除
      const markersToClean = [...postMarkers];
      markersToClean.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
      setPostMarkers([]);
      setSelectedPost(null);
      setNearbyPosts([]);
      
      // カテゴリ変更時に投稿データを再取得
      const userLat = savedLocation?.lat || latitude;
      const userLng = savedLocation?.lng || longitude;
      if (userLat && userLng) {
        fetchPosts();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]); // カテゴリ変更時に実行

  //  投稿データが更新されたらマーカーを作成（修正版）
  useEffect(() => {
    if (posts.length > 0 && map && window.google?.maps) {
      createPostMarkers();
    } else if (posts.length === 0 && map && window.google?.maps) {
      // 投稿が0件の場合は既存のマーカーをクリア
      const markersToClean = [...postMarkers];
      markersToClean.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
      setPostMarkers([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, map]); // createPostMarkers を依存配列から削除


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
          // 🔥 修正箇所: Google Mapsの現在地風の青い丸アイコンを設定
          const marker = new window.google.maps.Marker({
            position: userPosition,
            map: map,
            title: "あなたの現在地",
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8, // 丸のサイズ
              fillColor: "#4285F4", // Google Mapsの現在地カラー（青）
              fillOpacity: 1,
              strokeColor: "#ffffff", // 白い縁取り
              strokeWeight: 2,
            },
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
              className="h-12 w-12 rounded-lg shadow-lg bg-[#73370c] hover:bg-[#5c2a0a] border-2 border-white"
            >
              <Newspaper className="h-6 w-6 text-white" />
            </Button>
            <span className="text-sm font-bold text-gray-700 ">イベント一覧</span>
          </motion.div>

          {/* プロフィールアイコン（マイページ画面へ） */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="flex flex-col items-center"
          >
            <Button
              onClick={() => router.push('/profile')}
              size="icon"
              className="h-12 w-12 rounded-lg shadow-lg bg-[#73370c] hover:bg-[#5c2a0a] border-2 border-white"
            >
              <User className="h-6 w-6 text-white" />
            </Button>
            <span className="text-sm font-bold text-gray-700 ">マイページ</span>
          </motion.div>

          {/* 更新アイコン */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <Button
              onClick={handleManualRefresh}
              size="icon"
              disabled={isRefreshing || loadingPosts}
              className="h-12 w-12 rounded-lg shadow-lg bg-[#73370c] hover:bg-[#5c2a0a] border-2 border-white disabled:opacity-50"
            >
              <RefreshCw className={`h-6 w-6 text-white ${(isRefreshing || loadingPosts) ? 'animate-spin' : ''}`} />
            </Button>
            <span className="text-sm font-bold text-gray-700">更新</span>
          </motion.div>

          {/* 🔥 メモアイコン */}
           <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="flex flex-col items-center"
          >
            <Button
              onClick={() => router.push('/memo')}
              size="icon"
              className="h-12 w-12 rounded-lg shadow-lg bg-[#73370c] hover:bg-[#5c2a0a] border-2 border-white"
            >
              <ShoppingBag className="h-6 w-6 text-white" />
            </Button>
            <span className="text-sm font-bold text-gray-700 ">メモ</span>
          </motion.div>
        </div>
      )}

      {/* 🔥 更新中の表示を追加（745行目付近、右上ボタンの前） */}
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
          {/* カテゴリ選択ボタン */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg px-4 py-2 text-sm font-semibold shadow-lg hover:bg-white transition-colors flex items-center gap-2"
                  style={{ 
                    color: getCategoryConfig(selectedCategory).color,
                    borderColor: getCategoryConfig(selectedCategory).color + '40' // 透明度40%のボーダー
                  }}
                >
                  <span style={{ color: getCategoryConfig(selectedCategory).color }}>{selectedCategory}</span>
                  <ChevronDown className="h-4 w-4" style={{ color: getCategoryConfig(selectedCategory).color }} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedCategory('イベント情報');
                    setSelectedPost(null);
                    setNearbyPosts([]);
                  }}
                  className={selectedCategory === 'イベント情報' ? 'bg-accent' : ''}
                >
                  イベント情報
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedCategory('聖地巡礼');
                    setSelectedPost(null);
                    setNearbyPosts([]);
                  }}
                  className={selectedCategory === '聖地巡礼' ? 'bg-accent' : ''}
                >
                  聖地巡礼
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedCategory('観光スポット');
                    setSelectedPost(null);
                    setNearbyPosts([]);
                  }}
                  className={selectedCategory === '観光スポット' ? 'bg-accent' : ''}
                >
                  観光スポット
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedCategory('温泉');
                    setSelectedPost(null);
                    setNearbyPosts([]);
                  }}
                  className={selectedCategory === '温泉' ? 'bg-accent' : ''}
                >
                  温泉
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedCategory('グルメ');
                    setSelectedPost(null);
                    setNearbyPosts([]);
                  }}
                  className={selectedCategory === 'グルメ' ? 'bg-accent' : ''}
                >
                  グルメ
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>

          {/* 現在地の説明テキスト */}
          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 shadow-lg max-w-xs">
            <div className="space-y-1">
              <div className="flex items-center">
                {/* 青色マーカーと同じスタイルのアイコン */}
                <div 
                  className="h-4 w-4 mr-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: '#4285F4',
                    border: '2px solid #ffffff',
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
                  }}
                />
                <span className="text-xs font-medium">現在地</span>
              </div>
              <div className="text-xs">
                {posts.length > 0 ? (
                  <>
                    <span style={{ color: getCategoryConfig(selectedCategory).color, fontWeight: 'bold' }}>
                      {selectedCategory}
                    </span>
                    <span className="text-gray-600">:{posts.length}件</span>
                  </>
                ) : (
                  <>
                    <span style={{ color: getCategoryConfig(selectedCategory).color, fontWeight: 'bold' }}>
                      {selectedCategory}
                    </span>
                    <span className="text-gray-600">を検索中...</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 投稿詳細カード（下部に表示） */}
      <AnimatePresence>
        {selectedPost && nearbyPosts.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute bottom-4 left-4 right-4 z-40"
          >
            {nearbyPosts.map((post) => {
              // タイトルを決定（イベント情報の場合はevent_name、その他はcontent）
              const displayTitle = post.category === 'イベント情報' 
                ? (post.event_name || post.content)
                : post.content;
              // チェックイン可能かどうかを判定
              // savedLocationを優先的に使用（fetchPostsと同じロジック）
              const effectiveLatitude = savedLocation?.lat || latitude;
              const effectiveLongitude = savedLocation?.lng || longitude;
              
              const hasSession = !!session?.user?.id;
              const hasEnableCheckin = post.enable_checkin === true;
              const hasLatitude = !!effectiveLatitude;
              const hasLongitude = !!effectiveLongitude;
              const hasStoreLat = !!post.store_latitude;
              const hasStoreLng = !!post.store_longitude;
              
              // 距離計算（デバッグ用）
              let distance: number | null = null;
              let isWithinRangeResult = false;
              if (hasLatitude && hasLongitude && hasStoreLat && hasStoreLng) {
                distance = calculateDistance(
                  effectiveLatitude!,
                  effectiveLongitude!,
                  post.store_latitude!,
                  post.store_longitude!
                );
                isWithinRangeResult = isWithinRange(
                  effectiveLatitude!,
                  effectiveLongitude!,
                  post.store_latitude!,
                  post.store_longitude!,
                  1000 // 1000m以内
                );
              }
              
              const canCheckIn = 
                hasSession && 
                hasEnableCheckin &&
                hasLatitude && 
                hasLongitude && 
                hasStoreLat && 
                hasStoreLng &&
                isWithinRangeResult;
              
              const isCheckedIn = checkedInPosts.has(post.id);
              
              return (
                <div key={post.id} className="relative">
                  {/* しおり型チェックインボタン（カード外側左上） */}
                  {canCheckIn && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isCheckedIn && checkingIn !== post.id) {
                          handleCheckIn(post);
                        }
                      }}
                      className={`absolute -top-3 left-2 z-30 cursor-pointer transition-all duration-300 ${
                        isCheckedIn || checkingIn === post.id ? 'cursor-default' : 'hover:scale-105'
                      }`}
                    >
                      {/* しおり本体 */}
                      <div className={`relative ${
                        isCheckedIn 
                          ? 'bg-green-600' 
                          : 'bg-[#73370c]'
                      } text-white px-3 py-1.5 rounded-t-md shadow-xl`}>
                        <div className="flex items-center gap-1 text-xs font-bold whitespace-nowrap">
                          {checkingIn === post.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : isCheckedIn ? (
                            <>完了☑️</>
                          ) : (
                            'Check In'
                          )}
                        </div>
                        {/* しおりの三角形の切り込み（下部） */}
                        <div className={`absolute -bottom-1.5 left-0 w-full h-1.5 ${
                          isCheckedIn 
                            ? 'bg-green-600' 
                            : 'bg-[#73370c]'
                        }`}>
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-t-[8px] border-t-white"></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* イベントカード */}
                  <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-gray-200 mt-3">
                    {/* カードヘッダー（閉じるボタンのみ） */}
                    <div className="relative">
                      <div className="absolute top-2 right-2 z-10">
                        {/* 閉じるボタン */}
                        <Button
                          onClick={() => {
                            setSelectedPost(null);
                            setNearbyPosts([]);
                          }}
                          size="icon"
                          className="h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-lg"
                        >
                          <X className="h-4 w-4 text-gray-700" />
                        </Button>
                      </div>
                    </div>

                    {/* カード内容（横並びレイアウト） */}
                    <div className="p-4">
                      <div className="flex gap-3 mb-3">
                        {/* 投稿画像 */}
                        {post.image_urls && post.image_urls.length > 0 ? (
                          <div className="flex-shrink-0 relative w-24 h-24 overflow-hidden rounded-lg bg-gray-100">
                            <img
                              src={optimizeCloudinaryImageUrl(post.image_urls[0])}
                              alt={post.store_name}
                              className="w-full h-full object-cover"
                              loading="eager"
                              decoding="async"
                              fetchPriority="high"
                            />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-24 h-24 bg-[#fef3e8] rounded-lg flex items-center justify-center">
                            <Calendar className="h-12 w-12 text-[#73370c] opacity-30" />
                          </div>
                        )}

                        {/* 投稿情報 */}
                        <div className="flex-1 min-w-0">
                          {/* タイトル */}
                          <h3 className="text-base font-bold line-clamp-2 mb-2" style={{ color: getCategoryConfig((post.category as PostCategory) || 'イベント情報').color }}>
                            {displayTitle}
                          </h3>

                          {/* 開催場所 */}
                          <div className="flex items-start gap-2 text-sm text-gray-600 mb-1">
                            <MapPinIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-500" />
                            <span className="line-clamp-1">{post.store_name}</span>
                          </div>

                          {/* 開催期間（イベント情報の場合のみ） */}
                          {post.category === 'イベント情報' && post.event_start_date && (
                            <div className="flex items-start gap-2 text-sm text-gray-600">
                              <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
                              <span className="line-clamp-1">
                                {new Date(post.event_start_date).toLocaleDateString('ja-JP', {
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
                        </div>
                      </div>

                      {/* 詳細を見るボタン */}
                      <Button
                        onClick={() => router.push(`/map/event/${post.id}`)}
                        className="w-full bg-[#73370c] hover:bg-[#5c2a0a] text-white shadow-lg"
                      >
                        詳細を見る
                      </Button>
                    </div>
                  </div>
                </div>
            );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}