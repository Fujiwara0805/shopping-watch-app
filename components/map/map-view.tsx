"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { useGoogleMapsApi } from '@/components/providers/GoogleMapsApiProvider';
import { Button } from '@/components/ui/button';
import { MapPin, AlertTriangle, RefreshCw, Calendar, BookOpen, User, MapPinIcon, X, Loader2, Home, Share2, Link2, Check, Compass, Search, ScrollText, Library, Shield, Route, ExternalLink, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/lib/hooks/use-toast';
import { isWithinRange, calculateDistance } from '@/lib/utils/distance';
import { Map as MapData, MapLocation } from '@/types/map';
import { generateSemanticEventUrl } from '@/lib/seo/url-helper';
import { designTokens } from '@/lib/constants';

declare global {
  interface Window { google: any; }
}

// 型定義
interface PostMarkerData {
  id: string;
  category: string | null;
  store_name: string;
  content: string;
  store_latitude: number;
  store_longitude: number;
  created_at: string;
  expires_at: string;
  image_urls: string[] | null;
  event_name: string | null;
  event_start_date?: string | null;
  event_end_date?: string | null;
  enable_checkin?: boolean | null;
  city?: string | null;
  prefecture?: string | null;
  /** 現在地からの距離（km）。APIでは返さず、クライアントで計算して付与する場合がある */
  distance?: number | null;
}

interface MapLocationMarkerData {
  id: string;
  map_id: string;
  map_title: string;
  store_name: string;
  content: string;
  store_latitude: number;
  store_longitude: number;
  image_urls: string[];
  url: string | null;
  order: number;
}

interface MapCreatorProfile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_path: string | null;
  url: string | null;
}

interface SpotMarkerData {
  id: string;
  store_name: string;
  description: string;
  store_latitude: number;
  store_longitude: number;
  image_urls: string[];
  url: string | null;
  city: string | null;
  prefecture: string;
  created_at: string;
  author_name: string;
  author_avatar_path: string | null;
}

type PostCategory = 'イベント情報';
type ViewMode = 'events' | 'myMaps' | 'spots';

// ヘルパー関数
const getAvatarPublicUrl = (avatarPath: string | null): string | null => {
  if (!avatarPath) return null;
  return supabase.storage.from('avatars').getPublicUrl(avatarPath).data.publicUrl;
};

const normalizeUrl = (url: string | null): string | null => {
  if (!url) return null;
  try {
    const parsed = JSON.parse(url);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    return url;
  } catch { return url; }
};

const getSocialIconUrl = (url: string): string => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('instagram.com') || lowerUrl.includes('instagr.am')) {
    return 'https://res.cloudinary.com/dz9trbwma/image/upload/v1759308496/icons8-%E3%82%A4%E3%83%B3%E3%82%B9%E3%82%BF%E3%82%AF%E3%82%99%E3%83%A9%E3%83%A0-100_idedfz.png';
  } else if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.com')) {
    return 'https://res.cloudinary.com/dz9trbwma/image/upload/v1759308615/icons8-facebook%E3%81%AE%E6%96%B0%E3%81%97%E3%81%84-100_2_pps86o.png';
  } else if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
    return 'https://res.cloudinary.com/dz9trbwma/image/upload/v1759308507/icons8-%E3%83%84%E3%82%A4%E3%83%83%E3%82%BF%E3%83%BCx-100_x18dc0.png';
  }
  return 'https://res.cloudinary.com/dz9trbwma/image/upload/v1759366399/icons8-%E3%82%A6%E3%82%A7%E3%83%95%E3%82%99-100_a6uwwq.png';
};

const getCategoryConfig = (category: PostCategory) => ({
  'イベント情報': { color: designTokens.colors.accent.lilacDark, icon: 'calendar' },
}[category] || { color: designTokens.colors.accent.lilacDark, icon: 'calendar' });

const createSimpleCategoryIcon = (category: PostCategory) => {
  const size = 40;
  const config = getCategoryConfig(category);
  const iconSvg = `<g transform="translate(${size/2 - 5}, ${size/2 - 5}) scale(0.75)"><rect x="2" y="4" width="12" height="10" rx="1" fill="none" stroke="white" stroke-width="1.5"/><line x1="2" y1="7" x2="14" y2="7" stroke="white" stroke-width="1.5"/><line x1="5" y1="2" x2="5" y2="5" stroke="white" stroke-width="1.5" stroke-linecap="round"/><line x1="11" y1="2" x2="11" y2="5" stroke="white" stroke-width="1.5" stroke-linecap="round"/></g>`;
  const svgIcon = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${config.color}" stroke="#ffffff" stroke-width="2"/>${iconSvg}</svg>`;
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgIcon),
    scaledSize: new window.google.maps.Size(size, size),
    anchor: new window.google.maps.Point(size / 2, size),
  };
};

const optimizeCloudinaryImageUrl = (url: string): string => {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    if (url.includes('q_auto') || url.includes('q_')) return url;
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex !== -1) {
      const beforeUpload = url.substring(0, uploadIndex + '/upload/'.length);
      const afterUpload = url.substring(uploadIndex + '/upload/'.length);
      return `${beforeUpload}q_auto:best,f_auto/${afterUpload}`;
    }
  }
  return url;
};

const wrapText = (text: string, maxWidth: number, ctx: CanvasRenderingContext2D): string[] => {
  const lines: string[] = [];
  let currentLine = '';
  for (let i = 0; i < text.length; i++) {
    const testLine = currentLine + text[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = text[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine.length > 0) lines.push(currentLine);
  if (lines.length > 3) {
    lines.length = 3;
    lines[2] = lines[2].slice(0, -1) + '…';
  }
  return lines;
};

const createCategoryPinIcon = async (imageUrls: string[] | null, title: string | null, category: PostCategory): Promise<google.maps.Icon> => {
  let parsedUrls = imageUrls;
  if (typeof imageUrls === 'string') {
    try { parsedUrls = JSON.parse(imageUrls); } catch { parsedUrls = null; }
  }
  const imageUrl = parsedUrls && Array.isArray(parsedUrls) && parsedUrls.length > 0 ? parsedUrls[0] : null;
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
    return createSimpleCategoryIcon(category);
  }
  const optimizedImageUrl = optimizeCloudinaryImageUrl(imageUrl);
  const imageSize = 45;
  const borderWidth = 2;
  const textPadding = 4;
  const maxTextWidth = 80;
  const lineHeight = 12;
  const displayTitle = title || '';
  
  return new Promise<google.maps.Icon>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) { resolve(createSimpleCategoryIcon(category)); return; }
      tempCtx.font = '600 10px "Hiragino Sans", "Noto Sans JP", sans-serif';
      const textLines = wrapText(displayTitle, maxTextWidth, tempCtx);
      const numLines = textLines.length;
      let maxLineWidth = 0;
      textLines.forEach(line => { const lineWidth = tempCtx.measureText(line).width; if (lineWidth > maxLineWidth) maxLineWidth = lineWidth; });
      const textHeight = numLines * lineHeight + 4;
      const canvasWidth = Math.max(imageSize, Math.ceil(maxLineWidth) + 12) + 4;
      const canvasHeight = imageSize + textPadding + textHeight;
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth * scale;
      canvas.height = canvasHeight * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(createSimpleCategoryIcon(category)); return; }
      ctx.scale(scale, scale);
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      const imageOffsetX = (canvasWidth - imageSize) / 2;
      ctx.save();
      ctx.translate(imageOffsetX, 0);
      ctx.beginPath();
      ctx.arc(imageSize / 2, imageSize / 2, imageSize / 2 - borderWidth, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      const imgAspect = img.width / img.height;
      let drawWidth = imageSize, drawHeight = imageSize, offsetX = 0, offsetY = 0;
      if (imgAspect > 1) { drawWidth = drawHeight * imgAspect; offsetX = -(drawWidth - imageSize) / 2; }
      else { drawHeight = drawWidth / imgAspect; offsetY = -(drawHeight - imageSize) / 2; }
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      ctx.restore();
      ctx.save();
      ctx.translate(imageOffsetX, 0);
      ctx.beginPath();
      ctx.arc(imageSize / 2, imageSize / 2, imageSize / 2 - borderWidth / 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = borderWidth;
      ctx.stroke();
      ctx.restore();
      if (textLines.length > 0) {
        ctx.font = '600 10px "Hiragino Sans", "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const textStartY = imageSize + textPadding;
        const textX = canvasWidth / 2;
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = designTokens.colors.text.primary;
        textLines.forEach((line, index) => {
          const lineY = textStartY + index * lineHeight;
          ctx.strokeText(line, textX, lineY);
          ctx.fillText(line, textX, lineY);
        });
      }
      resolve({ url: canvas.toDataURL('image/png'), scaledSize: new window.google.maps.Size(canvasWidth, canvasHeight), anchor: new window.google.maps.Point(canvasWidth / 2, imageSize) });
    };
    img.onerror = () => { resolve(createSimpleCategoryIcon(category)); };
    img.src = optimizedImageUrl;
  });
};

const createDirectionalLocationIcon = (heading: number | null): google.maps.Icon => {
  const size = 48;
  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = 20;
  const innerRadius = 10;
  const angle = heading !== null ? heading : 0;
  const angleRad = (angle - 90) * Math.PI / 180;
  const tipX = centerX + Math.cos(angleRad) * outerRadius;
  const tipY = centerY + Math.sin(angleRad) * outerRadius;
  const baseAngle1 = angleRad + Math.PI * 0.75;
  const baseAngle2 = angleRad - Math.PI * 0.75;
  const baseRadius = innerRadius + 4;
  const base1X = centerX + Math.cos(baseAngle1) * baseRadius;
  const base1Y = centerY + Math.sin(baseAngle1) * baseRadius;
  const base2X = centerX + Math.cos(baseAngle2) * baseRadius;
  const base2Y = centerY + Math.sin(baseAngle2) * baseRadius;
  
  const svgIcon = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.3"/></filter></defs>
    <polygon points="${tipX},${tipY} ${base1X},${base1Y} ${base2X},${base2Y}" fill="${designTokens.colors.accent.lilac}" fill-opacity="0.4" filter="url(#shadow)"/>
    <circle cx="${centerX}" cy="${centerY}" r="${innerRadius + 6}" fill="${designTokens.colors.accent.lilac}" fill-opacity="0.2"/>
    <circle cx="${centerX}" cy="${centerY}" r="${innerRadius}" fill="white" filter="url(#shadow)"/>
    <circle cx="${centerX}" cy="${centerY}" r="${innerRadius - 3}" fill="${designTokens.colors.accent.lilac}"/>
  </svg>`;
  
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgIcon),
    scaledSize: new window.google.maps.Size(size, size),
    anchor: new window.google.maps.Point(size / 2, size / 2),
  };
};

// カスタムモーダル
const CustomModal = ({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) => {
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 backdrop-blur-sm"
            style={{ background: `${designTokens.colors.primary.base}40` }}
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative rounded-3xl w-full max-w-sm overflow-hidden"
            style={{ 
              background: designTokens.colors.background.white,
              boxShadow: designTokens.elevation.dramatic,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{ background: designTokens.colors.background.cloud }}
            >
              <X className="w-4 h-4" style={{ color: designTokens.colors.text.secondary }} />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ROUTE_STYLES = {
  strokeColor: designTokens.colors.secondary.fern,
  strokeOpacity: 0.8,
  strokeWeight: 4,
};

// マップスタイル
const organicMapStyles: google.maps.MapTypeStyle[] = [
  { featureType: "all", elementType: "geometry", stylers: [{ saturation: -20 }, { lightness: 10 }] },
  { featureType: "landscape", elementType: "geometry.fill", stylers: [{ color: designTokens.colors.background.mist }] },
  { featureType: "landscape.natural", elementType: "geometry.fill", stylers: [{ color: "#E8F0E5" }] },
  { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#D0E3F0" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: designTokens.colors.primary.light }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: designTokens.colors.background.white }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: designTokens.colors.secondary.stoneLight }] },
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: designTokens.colors.secondary.stoneLight }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: designTokens.colors.secondary.stone }] },
  { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#D4E8D1" }] },
  { featureType: "poi", elementType: "geometry.fill", stylers: [{ color: designTokens.colors.background.cloud }] },
  { featureType: "all", elementType: "labels.text.fill", stylers: [{ color: designTokens.colors.text.secondary }] },
  { featureType: "all", elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }, { visibility: "on" }, { weight: 2 }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit.station", elementType: "labels", stylers: [{ visibility: "off" }] }
];

export function MapView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { toast } = useToast();
  const { isLoaded: googleMapsLoaded, loadError: googleMapsLoadError } = useGoogleMapsApi();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const initializationTriedRef = useRef<boolean>(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const { latitude, longitude, loading: locationLoading, error: locationError, permissionState, requestLocation, browserInfo } = useGeolocation();
  const [mapInitialized, setMapInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [userLocationMarker, setUserLocationMarker] = useState<google.maps.Marker | null>(null);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [posts, setPosts] = useState<PostMarkerData[]>([]);
  const [postMarkers, setPostMarkers] = useState<google.maps.Marker[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostMarkerData | null>(null);
  const [nearbyPosts, setNearbyPosts] = useState<PostMarkerData[]>([]);
  const [mapLocations, setMapLocations] = useState<MapLocationMarkerData[]>([]);
  const [mapMarkers, setMapMarkers] = useState<google.maps.Marker[]>([]);
  const [loadingMaps, setLoadingMaps] = useState(false);
  const [selectedMapLocation, setSelectedMapLocation] = useState<MapLocationMarkerData | null>(null);
  const [savedLocation, setSavedLocation] = useState<{lat: number, lng: number} | null>(null);
  const hasInitialLoadedRef = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const titleId = searchParams.get('title_id');
  const viewParam = searchParams.get('view');
  const [viewMode, setViewMode] = useState<ViewMode>(titleId ? 'myMaps' : viewParam === 'spots' ? 'spots' : 'events');
  const selectedCategory: PostCategory = 'イベント情報';
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [checkedInPosts, setCheckedInPosts] = useState<Set<string>>(new Set());
  const [navigatingToDetail, setNavigatingToDetail] = useState<string | null>(null);
  const [navigatingToMapDetail, setNavigatingToMapDetail] = useState<string | null>(null);
  const [mapCreatorProfile, setMapCreatorProfile] = useState<MapCreatorProfile | null>(null);
  const [currentMapTitle, setCurrentMapTitle] = useState<string>('');
  const [isMapPublic, setIsMapPublic] = useState<boolean>(true);
  const hasShownLocationModalRef = useRef<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLocationPermissionModalOpen, setIsLocationPermissionModalOpen] = useState(false);
  const [routePolylines, setRoutePolylines] = useState<google.maps.Polyline[]>([]);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);

  // Spots mode state
  const [spots, setSpots] = useState<SpotMarkerData[]>([]);
  const [spotMarkers, setSpotMarkers] = useState<google.maps.Marker[]>([]);
  const [loadingSpots, setLoadingSpots] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<SpotMarkerData | null>(null);

  // Event card swipe state
  const [eventCardIndex, setEventCardIndex] = useState(0);
  const eventCardTouchStartX = useRef<number>(0);
  const eventCardTouchDeltaX = useRef<number>(0);
  const selectedMarkerRef = useRef<google.maps.Marker | null>(null);

  // Effects
  useEffect(() => {
    if (viewMode === 'events') { setDeviceHeading(null); return; }
    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
      let heading: number | null = null;
      if ('webkitCompassHeading' in event && typeof (event as any).webkitCompassHeading === 'number') {
        heading = (event as any).webkitCompassHeading;
      } else if (event.alpha !== null) {
        heading = 360 - event.alpha;
      }
      if (heading !== null) setDeviceHeading(heading);
    };
    const requestOrientationPermission = async () => {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
          const permission = await (DeviceOrientationEvent as any).requestPermission();
          if (permission === 'granted') window.addEventListener('deviceorientation', handleDeviceOrientation, true);
        } catch (error) { console.error('DeviceOrientation permission denied:', error); }
      } else {
        window.addEventListener('deviceorientation', handleDeviceOrientation, true);
      }
    };
    requestOrientationPermission();
    return () => { window.removeEventListener('deviceorientation', handleDeviceOrientation, true); };
  }, [viewMode]);

  useEffect(() => {
    try {
      const savedData = localStorage.getItem('userLocation');
      if (savedData) {
        const locationData = JSON.parse(savedData);
        const now = Date.now();
        if (locationData.expiresAt && locationData.expiresAt > now) {
          setSavedLocation({ lat: locationData.latitude, lng: locationData.longitude });
        } else { localStorage.removeItem('userLocation'); }
      }
    } catch (error) { console.error('位置情報の読み込みに失敗:', error); }
  }, []);

  useEffect(() => {
    const fetchCheckedInPosts = async () => {
      if (!session?.user?.id) return;
      try {
        const { data, error } = await supabase.from('check_ins').select('post_id').eq('user_id', session.user.id);
        if (error) throw error;
        if (data) setCheckedInPosts(new Set(data.map(c => c.post_id)));
      } catch (error) { console.error('チェックイン取得エラー:', error); }
    };
    fetchCheckedInPosts();
  }, [session?.user?.id]);

  const handleCheckIn = async (post: PostMarkerData) => {
    const effectiveLatitude = savedLocation?.lat || latitude;
    const effectiveLongitude = savedLocation?.lng || longitude;
    if (!session?.user?.id || !effectiveLatitude || !effectiveLongitude) {
      toast({ title: 'エラー', description: 'ログインまたは位置情報が取得できません', variant: 'destructive' });
      return;
    }
    setCheckingIn(post.id);
    try {
      const { error } = await supabase.from('check_ins').insert({ user_id: session.user.id, post_id: post.id, event_name: post.event_name || post.content, latitude: effectiveLatitude, longitude: effectiveLongitude });
      if (error) {
        if (error.code === '23505') { toast({ title: '既にチェックイン済みです', description: 'このイベントには既にチェックインしています' }); }
        else { throw error; }
      } else {
        setCheckedInPosts(prev => new Set(prev).add(post.id));
        toast({ title: '🎉 チェックイン完了！', description: 'スタンプを獲得しました' });
      }
    } catch (error: any) { toast({ title: 'チェックインエラー', description: error?.message || 'データベースへの保存に失敗しました', variant: 'destructive' }); }
    finally { setCheckingIn(null); }
  };

  const updateContainerDimensions = useCallback(() => {
    if (!mapContainerRef.current) return false;
    const container = mapContainerRef.current;
    const parent = container.parentElement;
    if (!parent) return false;
    const parentRect = parent.getBoundingClientRect();
    setContainerDimensions({ width: parentRect.width, height: parentRect.height });
    container.style.width = `${parentRect.width}px`;
    container.style.height = `${parentRect.height}px`;
    container.style.position = 'relative';
    return parentRect.width > 0 && parentRect.height > 200;
  }, []);

  useEffect(() => {
    updateContainerDimensions();
    const timer = setTimeout(updateContainerDimensions, 300);
    const handleResize = () => { setTimeout(updateContainerDimensions, 100); };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => { clearTimeout(timer); window.removeEventListener('resize', handleResize); window.removeEventListener('orientationchange', handleResize); };
  }, [updateContainerDimensions]);

  const fetchMapCreatorProfile = useCallback(async (mapId: string) => {
    try {
      const { data: mapData, error: mapError } = await supabase.from('maps').select('app_profile_id, title, is_public').eq('id', mapId).single();
      if (mapError || !mapData) return;
      setCurrentMapTitle(mapData.title || '');
      setIsMapPublic(mapData.is_public ?? true);
      if (mapData.is_public === false && !hasShownLocationModalRef.current) {
        setIsLocationPermissionModalOpen(true);
        hasShownLocationModalRef.current = true;
      }
      const { data: profileData, error: profileError } = await supabase.from('app_profiles').select('id, user_id, display_name, avatar_url, url').eq('id', mapData.app_profile_id).single();
      if (profileError || !profileData) return;
      setMapCreatorProfile({
        id: profileData.id,
        user_id: profileData.user_id,
        display_name: profileData.display_name || '匿名ユーザー',
        avatar_path: profileData.avatar_url,
        url: profileData.url || null,
      });
    } catch (error) { console.error('プロフィール取得エラー:', error); }
  }, []);

  const fetchMapLocations = useCallback(async () => {
    const currentTitleId = searchParams.get('title_id');
    if (currentTitleId) {
      setLoadingMaps(true);
      await fetchMapCreatorProfile(currentTitleId);
      try {
        const { data: mapData, error: mapError } = await supabase.from('maps').select('id, title, locations').eq('id', currentTitleId).eq('is_deleted', false).single();
        if (mapError || !mapData) { setMapLocations([]); setLoadingMaps(false); return; }
        const allLocations: MapLocationMarkerData[] = [];
        if (mapData.locations && Array.isArray(mapData.locations)) {
          mapData.locations.forEach((location: MapLocation) => {
            if (location.store_latitude && location.store_longitude) {
              allLocations.push({ id: `${mapData.id}_${location.order}`, map_id: mapData.id, map_title: mapData.title, store_name: location.store_name, content: location.content, store_latitude: location.store_latitude, store_longitude: location.store_longitude, image_urls: location.image_urls, url: location.url || null, order: location.order });
            }
          });
        }
        setMapLocations(allLocations);
      } catch (error) { console.error('公開マップデータの取得中にエラー:', error); }
      finally { setLoadingMaps(false); }
      return;
    }
    if (!session?.user?.id) { setMapLocations([]); return; }
    setLoadingMaps(true);
    try {
      const { data: profile } = await supabase.from('app_profiles').select('id').eq('user_id', session.user.id).single();
      if (!profile) { setLoadingMaps(false); return; }
      const { data: maps } = await supabase.from('maps').select('id, title, locations').eq('app_profile_id', profile.id).eq('is_deleted', false);
      if (!maps || maps.length === 0) { setMapLocations([]); setLoadingMaps(false); return; }
      const allLocations: MapLocationMarkerData[] = [];
      maps.forEach((map: any) => {
        if (map.locations && Array.isArray(map.locations)) {
          map.locations.forEach((location: MapLocation) => {
            if (location.store_latitude && location.store_longitude) {
              allLocations.push({ id: `${map.id}_${location.order}`, map_id: map.id, map_title: map.title, store_name: location.store_name, content: location.content, store_latitude: location.store_latitude, store_longitude: location.store_longitude, image_urls: location.image_urls, url: location.url || null, order: location.order });
            }
          });
        }
      });
      setMapLocations(allLocations);
    } catch (error) { console.error('コースデータの取得中にエラー:', error); }
    finally { setLoadingMaps(false); }
  }, [session?.user?.id, searchParams, fetchMapCreatorProfile]);

  const fetchPosts = useCallback(async () => {
    const userLat = savedLocation?.lat || latitude;
    const userLng = savedLocation?.lng || longitude;
    if (!userLat || !userLng) return;
    setLoadingPosts(true);
    try {
      const now = new Date();
      const { data, error } = await supabase.from('posts').select('id, category, store_name, content, store_latitude, store_longitude, event_name, event_start_date, event_end_date, created_at, expires_at, image_urls, enable_checkin, city, prefecture').eq('is_deleted', false).eq('category', selectedCategory);
      if (error || !data) { setPosts([]); return; }
      const filteredData = data.filter((post) => {
        if (!post.event_start_date) return false;
        const startDate = new Date(post.event_start_date); startDate.setHours(0, 0, 0, 0);
        if (post.event_end_date) { const endDate = new Date(post.event_end_date); endDate.setHours(23, 59, 59, 999); return now >= startDate && now <= endDate; }
        const startDateEnd = new Date(post.event_start_date); startDateEnd.setHours(23, 59, 59, 999);
        return now >= startDate && now <= startDateEnd;
      });
      const postsWithDistance = filteredData.filter((post: any) => post.store_latitude != null && post.store_longitude != null && !isNaN(post.store_latitude) && !isNaN(post.store_longitude))
        .map((post: any) => {
          let imageUrls = post.image_urls;
          if (typeof imageUrls === 'string') { try { imageUrls = JSON.parse(imageUrls); } catch { imageUrls = null; } }
          const R = 6371;
          const dLat = (post.store_latitude - userLat) * Math.PI / 180;
          const dLng = (post.store_longitude - userLng) * Math.PI / 180;
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(userLat * Math.PI / 180) * Math.cos(post.store_latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
          const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return { ...post, image_urls: imageUrls, distance };
        });
      setPosts(postsWithDistance.sort((a, b) => a.distance - b.distance));
    } catch (error) { console.error('投稿データの取得中にエラー:', error); }
    finally { setLoadingPosts(false); }
  }, [latitude, longitude, savedLocation, selectedCategory]);

  const fetchSpots = useCallback(async () => {
    setLoadingSpots(true);
    try {
      const { data, error } = await supabase
        .from('spots')
        .select(`
          *,
          app_profiles (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error || !data) {
        setSpots([]);
        return;
      }

      const spotsData: SpotMarkerData[] = data.map((spot: any) => {
        const profile = spot.app_profiles as { id: string; display_name: string | null; avatar_url: string | null } | null;
        return {
          id: spot.id,
          store_name: spot.store_name,
          description: spot.description,
          store_latitude: spot.store_latitude,
          store_longitude: spot.store_longitude,
          image_urls: spot.image_urls || [],
          url: spot.url,
          city: spot.city,
          prefecture: spot.prefecture,
          created_at: spot.created_at,
          author_name: profile?.display_name || '匿名ユーザー',
          author_avatar_path: profile?.avatar_url || null,
        };
      });

      setSpots(spotsData);
    } catch (error) {
      console.error('スポットデータの取得中にエラー:', error);
    } finally {
      setLoadingSpots(false);
    }
  }, []);

  const groupPostsByLocation = (posts: any[]) => {
    const locationGroups: { [key: string]: any[] } = {};
    posts.forEach(post => {
      if (!post.store_latitude || !post.store_longitude) return;
      const lat = Math.round(post.store_latitude * 10000) / 10000;
      const lng = Math.round(post.store_longitude * 10000) / 10000;
      const locationKey = `${lat},${lng}`;
      if (!locationGroups[locationKey]) locationGroups[locationKey] = [];
      locationGroups[locationKey].push(post);
    });
    return locationGroups;
  };

  const getOffsetPosition = (baseLat: number, baseLng: number, index: number, total: number) => {
    if (total <= 1) return { lat: baseLat, lng: baseLng };
    const offsetDistance = 0.0003;
    const angle = (2 * Math.PI * index) / total;
    return { lat: baseLat + offsetDistance * Math.cos(angle), lng: baseLng + offsetDistance * Math.sin(angle) / Math.cos(baseLat * Math.PI / 180) };
  };

  const calculateAndDrawRoute = useCallback(async (locations: MapLocationMarkerData[]) => {
    if (!map || !window.google?.maps || locations.length < 2) {
      routePolylines.forEach(polyline => polyline.setMap(null));
      setRoutePolylines([]);
      return;
    }
    routePolylines.forEach(polyline => polyline.setMap(null));
    if (!directionsServiceRef.current) {
      directionsServiceRef.current = new window.google.maps.DirectionsService();
    }
    const sortedLocations = [...locations].sort((a, b) => a.order - b.order);
    const newPolylines: google.maps.Polyline[] = [];
    for (let i = 0; i < sortedLocations.length - 1; i++) {
      const origin = sortedLocations[i];
      const destination = sortedLocations[i + 1];
      try {
        const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
          directionsServiceRef.current!.route({
            origin: new window.google.maps.LatLng(origin.store_latitude, origin.store_longitude),
            destination: new window.google.maps.LatLng(destination.store_latitude, destination.store_longitude),
            travelMode: window.google.maps.TravelMode.WALKING,
          }, (response, status) => {
            if (status === window.google.maps.DirectionsStatus.OK && response) resolve(response);
            else reject(new Error(`Directions request failed: ${status}`));
          });
        });
        const route = result.routes[0];
        if (route && route.overview_path) {
          const polyline = new window.google.maps.Polyline({
            path: route.overview_path,
            strokeColor: ROUTE_STYLES.strokeColor,
            strokeOpacity: ROUTE_STYLES.strokeOpacity,
            strokeWeight: ROUTE_STYLES.strokeWeight,
            map: map,
            zIndex: 1,
          });
          newPolylines.push(polyline);
        }
      } catch (error) {
        const fallbackPolyline = new window.google.maps.Polyline({
          path: [
            new window.google.maps.LatLng(origin.store_latitude, origin.store_longitude),
            new window.google.maps.LatLng(destination.store_latitude, destination.store_longitude),
          ],
          strokeColor: ROUTE_STYLES.strokeColor,
          strokeOpacity: 0.5,
          strokeWeight: 2,
          map: map,
          zIndex: 1,
        });
        newPolylines.push(fallbackPolyline);
      }
    }
    setRoutePolylines(newPolylines);
  }, [map, routePolylines]);

  const createMapMarkers = useCallback(async () => {
    if (!map || !mapLocations.length || !window.google?.maps) return;
    mapMarkers.forEach(marker => { if (marker?.setMap) marker.setMap(null); });
    const newMarkers: google.maps.Marker[] = [];
    const locationGroups = groupPostsByLocation(mapLocations as any);
    const markerPromises = mapLocations.map(async (location) => {
      if (!location.store_latitude || !location.store_longitude) return;
      const lat = Math.round(location.store_latitude * 10000) / 10000;
      const lng = Math.round(location.store_longitude * 10000) / 10000;
      const locationKey = `${lat},${lng}`;
      const groupLocations = locationGroups[locationKey] || [location];
      const indexInGroup = groupLocations.findIndex((l: any) => l.id === location.id);
      const offsetPosition = getOffsetPosition(location.store_latitude, location.store_longitude, indexInGroup, groupLocations.length);
      const position = new window.google.maps.LatLng(offsetPosition.lat, offsetPosition.lng);
      const markerIcon = await createCategoryPinIcon(location.image_urls, location.store_name, 'イベント情報');
      const marker = new window.google.maps.Marker({ position, map, title: `${location.store_name} - ${location.map_title}`, icon: markerIcon, animation: window.google.maps.Animation.DROP, zIndex: indexInGroup + 10 });
      marker.addListener('click', () => { setSelectedMapLocation(location); });
      return marker;
    });
    const markers = await Promise.all(markerPromises);
    newMarkers.push(...markers.filter((m): m is google.maps.Marker => m != null));
    setMapMarkers(newMarkers);
    await calculateAndDrawRoute(mapLocations);
  }, [map, mapLocations, calculateAndDrawRoute]);

  const createPostMarkers = useCallback(async () => {
    if (!map || !posts.length || !window.google?.maps) return;
    postMarkers.forEach(marker => { if (marker?.setMap) marker.setMap(null); });
    const newMarkers: google.maps.Marker[] = [];
    const locationGroups = groupPostsByLocation(posts);
    let batchIndex = 0;
    const batchSize = 10;
    const processNextBatch = async () => {
      const batch = posts.slice(batchIndex, batchIndex + batchSize);
      if (batch.length === 0) { setPostMarkers(newMarkers); return; }
      const batchPromises = batch.map(async (post) => {
        if (!post.store_latitude || !post.store_longitude) return;
        const lat = Math.round(post.store_latitude * 10000) / 10000;
        const lng = Math.round(post.store_longitude * 10000) / 10000;
        const locationKey = `${lat},${lng}`;
        const groupPosts = locationGroups[locationKey] || [post];
        const indexInGroup = groupPosts.findIndex(p => p.id === post.id);
        const offsetPosition = getOffsetPosition(post.store_latitude, post.store_longitude, indexInGroup, groupPosts.length);
        const position = new window.google.maps.LatLng(offsetPosition.lat, offsetPosition.lng);
        const title = post.category === 'イベント情報' ? (post.event_name || post.content) : post.content;
        const markerIcon = await createCategoryPinIcon(post.image_urls, title, (post.category as PostCategory) || 'イベント情報');
        const marker = new window.google.maps.Marker({ position, map, title: `${post.store_name} - ${post.category || '投稿'}`, icon: markerIcon, animation: window.google.maps.Animation.DROP, zIndex: indexInGroup + 1 });
        marker.addListener('click', () => {
          // Stop previous marker bounce
          if (selectedMarkerRef.current) { selectedMarkerRef.current.setAnimation(null); }
          // Set bounce animation on selected marker (stop after ~2 bounces)
          marker.setAnimation(window.google.maps.Animation.BOUNCE);
          setTimeout(() => { if (marker.getAnimation() !== null) marker.setAnimation(null); }, 1400);
          selectedMarkerRef.current = marker;
          // Find this post's index in the distance-sorted list
          const sortedIndex = posts.findIndex(p => p.id === post.id);
          setEventCardIndex(sortedIndex >= 0 ? sortedIndex : 0);
          setSelectedPost(post);
          setNearbyPosts(posts);
        });
        return marker;
      });
      const batchMarkers = await Promise.all(batchPromises);
      newMarkers.push(...batchMarkers.filter((m): m is google.maps.Marker => m != null));
      batchIndex += batchSize;
      setTimeout(processNextBatch, 100);
    };
    processNextBatch();
  }, [map, posts]);

  const createSpotMarkers = useCallback(async () => {
    if (!map || !spots.length || !window.google?.maps) return;
    spotMarkers.forEach(marker => { if (marker?.setMap) marker.setMap(null); });
    const newMarkers: google.maps.Marker[] = [];
    const locationGroups = groupPostsByLocation(spots as any);

    const markerPromises = spots.map(async (spot) => {
      if (!spot.store_latitude || !spot.store_longitude) return;
      const lat = Math.round(spot.store_latitude * 10000) / 10000;
      const lng = Math.round(spot.store_longitude * 10000) / 10000;
      const locationKey = `${lat},${lng}`;
      const groupSpots = locationGroups[locationKey] || [spot];
      const indexInGroup = groupSpots.findIndex((s: any) => s.id === spot.id);
      const offsetPosition = getOffsetPosition(spot.store_latitude, spot.store_longitude, indexInGroup, groupSpots.length);
      const position = new window.google.maps.LatLng(offsetPosition.lat, offsetPosition.lng);
      const markerIcon = await createCategoryPinIcon(spot.image_urls, spot.store_name, 'イベント情報');
      const marker = new window.google.maps.Marker({
        position,
        map,
        title: spot.store_name,
        icon: markerIcon,
        animation: window.google.maps.Animation.DROP,
        zIndex: indexInGroup + 10,
      });
      marker.addListener('click', () => { setSelectedSpot(spot); });
      return marker;
    });

    const markers = await Promise.all(markerPromises);
    newMarkers.push(...markers.filter((m): m is google.maps.Marker => m != null));
    setSpotMarkers(newMarkers);

    // Fit bounds to show all spots
    if (newMarkers.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      spots.forEach(spot => {
        if (spot.store_latitude && spot.store_longitude) {
          bounds.extend(new window.google.maps.LatLng(spot.store_latitude, spot.store_longitude));
        }
      });
      // Also include user location if available
      const userLat = savedLocation?.lat || latitude;
      const userLng = savedLocation?.lng || longitude;
      if (userLat && userLng) {
        bounds.extend(new window.google.maps.LatLng(userLat, userLng));
      }
      map.fitBounds(bounds, 60);
    }
  }, [map, spots, latitude, longitude, savedLocation]);

  const initializeMap = useCallback(() => {
    if (!mapContainerRef.current || mapInstanceRef.current || !googleMapsLoaded || containerDimensions.height < 200 || initializationTriedRef.current) return false;
    if (!window.google?.maps?.Map) { setInitializationError("Google Maps APIが利用できません。"); return false; }
    initializationTriedRef.current = true;
    try {
      const container = mapContainerRef.current;
      container.innerHTML = '';
      const center = savedLocation ? savedLocation : (latitude && longitude) ? { lat: latitude, lng: longitude } : { lat: 35.6812, lng: 139.7671 };
      const mapOptions: google.maps.MapOptions = { center, zoom: (savedLocation || (latitude && longitude)) ? 8 : 7, disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy', mapTypeId: window.google.maps.MapTypeId.ROADMAP, styles: organicMapStyles };
      const newMap = new window.google.maps.Map(container, mapOptions);
      mapInstanceRef.current = newMap;
      window.google.maps.event.addListenerOnce(newMap, 'idle', () => { setMap(newMap); setMapInitialized(true); setInitializationError(null); });
    } catch (error) { setInitializationError(`地図の初期化に失敗しました`); initializationTriedRef.current = false; return false; }
  }, [googleMapsLoaded, latitude, longitude, savedLocation, containerDimensions]);

  useEffect(() => {
    if (googleMapsLoaded && containerDimensions.height >= 200 && !mapInitialized && !initializationTriedRef.current) {
      const timer = setTimeout(() => { initializeMap(); }, 100);
      return () => clearTimeout(timer);
    }
  }, [googleMapsLoaded, containerDimensions, mapInitialized, initializeMap]);

  useEffect(() => {
    if (mapInitialized && !hasInitialLoadedRef.current) {
      const userLat = savedLocation?.lat || latitude;
      const userLng = savedLocation?.lng || longitude;
      if (viewMode === 'events') { if (userLat && userLng) { hasInitialLoadedRef.current = true; fetchPosts(); } }
      else if (viewMode === 'spots') { hasInitialLoadedRef.current = true; fetchSpots(); }
      else { hasInitialLoadedRef.current = true; fetchMapLocations(); }
    }
  }, [latitude, longitude, savedLocation, mapInitialized, viewMode, fetchPosts, fetchMapLocations, fetchSpots]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    if ('geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => { navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }); });
        localStorage.setItem('userLocation', JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude, timestamp: Date.now(), expiresAt: Date.now() + 3600000 }));
        setSavedLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        if (map) map.panTo(new window.google.maps.LatLng(position.coords.latitude, position.coords.longitude));
      } catch (error) { console.error('位置情報の取得に失敗:', error); }
    }
    if (viewMode === 'events') await fetchPosts();
    else if (viewMode === 'spots') await fetchSpots();
    else await fetchMapLocations();
    setTimeout(() => { setIsRefreshing(false); }, 500);
  };

  useEffect(() => {
    const newTitleId = searchParams.get('title_id');
    const newViewParam = searchParams.get('view');
    if (newTitleId) setViewMode('myMaps');
    else if (newViewParam === 'spots') setViewMode('spots');
    else setViewMode('events');
  }, [searchParams]);

  useEffect(() => {
    if (viewMode === 'events' && posts.length > 0 && map && window.google?.maps) createPostMarkers();
    else if (viewMode === 'events' && posts.length === 0 && map && window.google?.maps) { postMarkers.forEach(marker => { if (marker?.setMap) marker.setMap(null); }); setPostMarkers([]); }
  }, [posts, map, viewMode]);

  useEffect(() => {
    if (viewMode === 'myMaps' && mapLocations.length > 0 && map && window.google?.maps) createMapMarkers();
    else if (viewMode === 'myMaps' && mapLocations.length === 0 && map && window.google?.maps) { 
      mapMarkers.forEach(marker => { if (marker?.setMap) marker.setMap(null); }); 
      setMapMarkers([]); 
      routePolylines.forEach(polyline => polyline.setMap(null));
      setRoutePolylines([]);
    }
  }, [mapLocations, map, viewMode]);

  // Spots mode: create/clear markers
  useEffect(() => {
    if (viewMode === 'spots' && spots.length > 0 && map && window.google?.maps) createSpotMarkers();
    else if (viewMode === 'spots' && spots.length === 0 && map && window.google?.maps) {
      spotMarkers.forEach(marker => { if (marker?.setMap) marker.setMap(null); });
      setSpotMarkers([]);
    }
  }, [spots, map, viewMode]);

  useEffect(() => {
    if (viewMode === 'events') {
      routePolylines.forEach(polyline => polyline.setMap(null));
      setRoutePolylines([]);
    }
    // Clear spot markers when leaving spots mode
    if (viewMode !== 'spots') {
      spotMarkers.forEach(marker => { if (marker?.setMap) marker.setMap(null); });
      setSpotMarkers([]);
      setSelectedSpot(null);
    }
  }, [viewMode]);

  useEffect(() => {
    const userLat = savedLocation?.lat || latitude;
    const userLng = savedLocation?.lng || longitude;
    if (map && userLat && userLng && mapInitialized && window.google?.maps) {
      const userPosition = new window.google.maps.LatLng(userLat, userLng);
      const headingForIcon = viewMode === 'myMaps' ? deviceHeading : null;
      const directionalIcon = createDirectionalLocationIcon(headingForIcon);
      if (userLocationMarker) { userLocationMarker.setPosition(userPosition); userLocationMarker.setIcon(directionalIcon); userLocationMarker.setMap(map); userLocationMarker.setZIndex(9999); }
      else {
        try {
          const marker = new window.google.maps.Marker({ position: userPosition, map, title: "あなたの現在地", icon: directionalIcon, zIndex: 9999 });
          setUserLocationMarker(marker);
        } catch (error) { console.error('Failed to create user location marker:', error); }
      }
      if (viewMode === 'events') { map.panTo(userPosition); const currentZoom = map.getZoom(); if (currentZoom !== undefined && currentZoom < 11) map.setZoom(11); }
    }
  }, [map, latitude, longitude, savedLocation, mapInitialized, userLocationMarker, viewMode, deviceHeading]);

  const handleRetry = () => {
    setInitializationError(null); setMapInitialized(false); initializationTriedRef.current = false; mapInstanceRef.current = null; setMap(null);
    if (userLocationMarker) { userLocationMarker.setMap(null); setUserLocationMarker(null); }
    postMarkers.forEach(marker => { if (marker?.setMap) marker.setMap(null); });
    setPostMarkers([]); setPosts([]);
    routePolylines.forEach(polyline => polyline.setMap(null));
    setRoutePolylines([]);
    if (mapContainerRef.current) mapContainerRef.current.innerHTML = '';
    setTimeout(() => { updateContainerDimensions(); if (!latitude || !longitude) requestLocation(); }, 100);
  };

  const handleCopyUrl = async () => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    try {
      await navigator.clipboard.writeText(currentUrl);
      setIsCopied(true);
      toast({ title: '✅ コピー完了！', description: 'URLをクリップボードにコピーしました' });
      setTimeout(() => setIsCopied(false), 1000);
    } catch (error) {
      toast({ title: '⚠️ エラー', description: 'URLのコピーに失敗しました', variant: 'destructive' });
    }
  };

  const MessageCard = ({ icon: Icon, title, message, children, variant = 'default' }: { icon?: React.ElementType; title: string; message: string | React.ReactNode; children?: React.ReactNode; variant?: 'default' | 'destructive' | 'warning'; }) => {
    const iconColor = variant === 'destructive' ? designTokens.colors.functional.error : variant === 'warning' ? designTokens.colors.functional.warning : designTokens.colors.primary.base;
    return (
      <div className="w-full h-full flex items-center justify-center p-4" style={{ background: designTokens.colors.background.mist }}>
        <div className="p-8 rounded-3xl w-full max-w-md text-center" style={{ background: designTokens.colors.background.white, boxShadow: designTokens.elevation.high }}>
          {Icon && <Icon className="h-16 w-16 mb-6 mx-auto" style={{ color: iconColor }} />}
          <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: designTokens.typography.display, color: variant === 'destructive' ? designTokens.colors.functional.error : designTokens.colors.text.primary }}>{title}</h2>
          <div className="text-base mb-6 leading-relaxed" style={{ color: designTokens.colors.text.secondary }}>{message}</div>
          {children}
        </div>
      </div>
    );
  };

  if (googleMapsLoadError) return <MessageCard title="Google Maps APIエラー" message="Google Maps APIの読み込みに失敗しました。" variant="destructive" icon={AlertTriangle}><Button onClick={handleRetry} className="mt-4" style={{ background: designTokens.colors.accent.lilac, color: designTokens.colors.text.inverse }}><RefreshCw className="mr-2 h-4 w-4" />再試行</Button></MessageCard>;
  if (initializationError) return <MessageCard title="地図初期化エラー" message={initializationError} variant="destructive" icon={AlertTriangle}><Button onClick={handleRetry} className="mt-4" style={{ background: designTokens.colors.accent.lilac, color: designTokens.colors.text.inverse }}><RefreshCw className="mr-2 h-4 w-4" />再試行</Button></MessageCard>;

  if (!googleMapsLoaded || !mapInitialized) {
    if (locationError && permissionState === 'denied') return <MessageCard title="位置情報の許可が必要です" message={locationError} variant="warning" icon={MapPin}><Button onClick={requestLocation} className="mt-4" style={{ background: designTokens.colors.accent.lilac, color: designTokens.colors.text.inverse }}><MapPin className="mr-2 h-4 w-4" />位置情報を許可する</Button></MessageCard>;
    return (
      <div className="w-full h-full relative" style={{ background: designTokens.colors.background.mist }}>
        <div ref={mapContainerRef} className="w-full h-full" style={{ background: designTokens.colors.background.mist }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm" style={{ background: `${designTokens.colors.background.white}E6` }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="mb-4">
            <Compass className="h-12 w-12" style={{ color: designTokens.colors.accent.gold }} />
          </motion.div>
          <p className="text-center px-4 font-medium" style={{ color: designTokens.colors.text.secondary }}>地図を準備中...</p>
          {(!latitude || !longitude) && permissionState !== 'denied' && <p className="text-sm text-center px-4 mt-2" style={{ color: designTokens.colors.text.muted }}>位置情報を取得中...</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative" style={{ background: designTokens.colors.background.mist }}>
      <div ref={mapContainerRef} className="w-full h-full" style={{ touchAction: 'manipulation', WebkitOverflowScrolling: 'touch', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }} />

      {/* コースモード: 作成者アバター */}
      {map && mapInitialized && viewMode === 'myMaps' && mapCreatorProfile && (
        <div className="absolute top-4 right-4 z-30">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={() => setIsProfileModalOpen(true)}
              size="icon"
              className="h-16 w-16 rounded-2xl p-0 overflow-hidden"
              style={{ 
                background: designTokens.colors.background.white,
                boxShadow: designTokens.elevation.high,
                border: `2px solid ${designTokens.colors.accent.gold}`,
              }}
            >
              <Avatar className="h-12 w-12">
                {mapCreatorProfile.avatar_path ? (
                  <AvatarImage src={getAvatarPublicUrl(mapCreatorProfile.avatar_path) || ''} alt={mapCreatorProfile.display_name} />
                ) : null}
                <AvatarFallback style={{ background: designTokens.colors.primary.base, color: designTokens.colors.text.inverse }}>
                  {mapCreatorProfile.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </motion.div>
        </div>
      )}

      {/* コースモード: 更新ボタン（右上・開発者アイコンの下） */}
      {map && mapInitialized && viewMode === 'myMaps' && (
        <div className="absolute top-24 right-4 z-30">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={handleManualRefresh}
              size="icon"
              disabled={isRefreshing || loadingMaps}
              className="h-12 w-12 rounded-full disabled:opacity-50"
              style={{ background: `${designTokens.colors.background.white}F0`, color: designTokens.colors.primary.base, boxShadow: designTokens.elevation.medium, border: `1px solid ${designTokens.colors.secondary.stone}40` }}
            >
              <RefreshCw className={`h-6 w-6 ${(isRefreshing || loadingMaps) ? 'animate-spin' : ''}`} />
            </Button>
          </motion.div>
        </div>
      )}

      {/* コースモード: ナビゲーションボタン（画面左下・アイコン下にテキスト） */}
      {map && mapInitialized && viewMode === 'myMaps' && isMapPublic && (
        <div className="absolute bottom-6 left-4 z-30 flex flex-col gap-2 w-max">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => {
                setViewMode('spots');
                setSelectedMapLocation(null);
                mapMarkers.forEach(marker => { if (marker?.setMap) marker.setMap(null); });
                setMapMarkers([]);
                routePolylines.forEach(polyline => polyline.setMap(null));
                setRoutePolylines([]);
                router.push('/map?view=spots');
                fetchSpots();
              }}
              className="min-w-[5rem] h-16 rounded-2xl flex flex-col items-center justify-center gap-1 font-semibold text-xs px-4 py-3"
              style={{ background: designTokens.colors.secondary.fern, color: designTokens.colors.text.inverse, boxShadow: designTokens.elevation.high }}
            >
              <MapPin className="h-6 w-6 flex-shrink-0" />
              スポット
            </Button>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.98 }} transition={{ delay: 0.05 }}>
            <Button
              onClick={() => {
                setViewMode('events');
                setSelectedMapLocation(null);
                mapMarkers.forEach(marker => { if (marker?.setMap) marker.setMap(null); });
                setMapMarkers([]);
                routePolylines.forEach(polyline => polyline.setMap(null));
                setRoutePolylines([]);
                router.push('/map');
                const userLat = savedLocation?.lat || latitude;
                const userLng = savedLocation?.lng || longitude;
                if (userLat && userLng) setTimeout(() => fetchPosts(), 100);
              }}
              className="min-w-[5rem] h-16 rounded-2xl flex flex-col items-center justify-center gap-1 font-semibold text-xs px-4 py-3"
              style={{ background: designTokens.colors.accent.gold, color: designTokens.colors.text.primary, boxShadow: designTokens.elevation.high }}
            >
              <Compass className="h-6 w-6 flex-shrink-0" />
              イベント
            </Button>
          </motion.div>
        </div>
      )}

      {/* プロフィール&共有モーダル */}
      <CustomModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)}>
        <div className="p-6 pt-12">
          <div className="flex flex-col items-center mb-6">
            <Avatar className="w-20 h-20 mb-3" style={{ border: `3px solid ${designTokens.colors.accent.gold}` }}>
              {mapCreatorProfile?.avatar_path ? (
                <AvatarImage src={getAvatarPublicUrl(mapCreatorProfile.avatar_path) || ''} alt={mapCreatorProfile?.display_name} />
              ) : null}
              <AvatarFallback style={{ background: designTokens.colors.primary.base, color: designTokens.colors.text.inverse, fontSize: '1.5rem' }}>
                {mapCreatorProfile?.display_name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-semibold mb-1" style={{ fontFamily: designTokens.typography.display, color: designTokens.colors.text.primary }}>
              {mapCreatorProfile?.display_name || '匿名ユーザー'}
            </h3>
            <p className="text-xs font-medium tracking-wide" style={{ color: designTokens.colors.accent.goldDark }}>Map Creator</p>
            {mapCreatorProfile?.url && (() => {
              const normalizedUrl = normalizeUrl(mapCreatorProfile.url);
              if (!normalizedUrl) return null;
              return (
                <a href={normalizedUrl} target="_blank" rel="noopener noreferrer" className="mt-2 transition-transform hover:scale-110">
                  <img src={getSocialIconUrl(normalizedUrl)} alt="SNS" className="w-8 h-8 rounded-lg" style={{ border: `1px solid ${designTokens.colors.secondary.stone}` }} />
                </a>
              );
            })()}
          </div>
          <div className="p-4 rounded-xl mb-6" style={{ background: designTokens.colors.background.cloud }}>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-4 w-4" style={{ color: designTokens.colors.accent.goldDark }} />
              <span className="text-xs font-medium" style={{ color: designTokens.colors.text.muted }}>Current Map</span>
            </div>
            <p className="font-semibold" style={{ fontFamily: designTokens.typography.display, color: designTokens.colors.text.primary }}>{currentMapTitle}</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Share2 className="h-4 w-4" style={{ color: designTokens.colors.text.muted }} />
              <span className="text-xs font-medium tracking-wide" style={{ color: designTokens.colors.text.muted }}>SHARE</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCopyUrl}
              className="flex items-center justify-center gap-3 w-full py-4 rounded-xl font-semibold transition-all"
              style={{ 
                background: isCopied ? designTokens.colors.functional.success : designTokens.colors.accent.lilac,
                color: designTokens.colors.text.inverse,
              }}
            >
              {isCopied ? (<><Check className="h-5 w-5" />コピー完了！</>) : (<><Link2 className="h-5 w-5" />URLをコピー</>)}
            </motion.button>
          </div>
        </div>
      </CustomModal>

      {/* 位置情報許可モーダル */}
      <AnimatePresence>
        {isLocationPermissionModalOpen && !isMapPublic && viewMode === 'myMaps' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 backdrop-blur-sm" style={{ background: `${designTokens.colors.primary.base}60` }} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="relative rounded-3xl w-full max-w-sm overflow-hidden" style={{ background: designTokens.colors.background.white, boxShadow: designTokens.elevation.dramatic }}>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-center mb-3" style={{ fontFamily: designTokens.typography.display, color: designTokens.colors.text.primary }}>位置情報を許可してください</h3>
                <p className="text-sm text-center mb-6 leading-relaxed" style={{ color: designTokens.colors.text.secondary }}>
                  このコースを表示するには、位置情報の許可が必要です。左下の「更新」ボタンを押して、位置情報を許可してください。
                </p>
                <Button onClick={() => setIsLocationPermissionModalOpen(false)} className="w-full py-3 rounded-xl font-medium" style={{ background: designTokens.colors.accent.lilac, color: designTokens.colors.text.inverse }}>閉じる</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* イベントモード: ナビゲーション（2つのテキストボタン + 更新） */}
      {map && mapInitialized && viewMode === 'events' && (
        <>
          {/* 更新ボタン（右上） */}
          <div className="absolute top-20 right-4 z-30">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={handleManualRefresh} size="icon" disabled={isRefreshing || loadingPosts} className="h-12 w-12 rounded-full disabled:opacity-50" style={{ background: `${designTokens.colors.background.white}F0`, color: designTokens.colors.primary.base, boxShadow: designTokens.elevation.medium, border: `1px solid ${designTokens.colors.secondary.stone}40` }}>
                <RefreshCw className={`h-6 w-6 ${(isRefreshing || loadingPosts) ? 'animate-spin' : ''}`} />
              </Button>
            </motion.div>
          </div>
          {/* 2つのメインボタン（画面左下・アイコン下にテキスト） */}
          <div className="absolute bottom-6 left-4 z-30 flex flex-col gap-2 w-max">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => router.push('/courses')}
                className="min-w-[5rem] h-16 rounded-2xl flex flex-col items-center justify-center gap-1 font-semibold text-xs px-4 py-3"
                style={{ background: '#999da8', color: designTokens.colors.text.inverse, boxShadow: designTokens.elevation.high }}
              >
                <Route className="h-6 w-6 flex-shrink-0" />
                コース
              </Button>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.98 }} transition={{ delay: 0.05 }}>
              <Button
                onClick={() => {
                  setViewMode('spots');
                  setSelectedPost(null);
                  setNearbyPosts([]);
                  postMarkers.forEach(marker => { if (marker?.setMap) marker.setMap(null); });
                  setPostMarkers([]);
                  fetchSpots();
                }}
                className="min-w-[5rem] h-16 rounded-2xl flex flex-col items-center justify-center gap-1 font-semibold text-xs px-4 py-3"
                style={{ background: designTokens.colors.secondary.fern, color: designTokens.colors.text.inverse, boxShadow: designTokens.elevation.high }}
              >
                <MapPin className="h-6 w-6 flex-shrink-0" />
                スポット
              </Button>
            </motion.div>
          </div>
        </>
      )}

      {/* スポットモード: ナビゲーション（下中央に作成ボタンのみ・アイコン下にテキスト） */}
      {map && mapInitialized && viewMode === 'spots' && (
        <>
          {/* 更新ボタン（右上） */}
          <div className="absolute top-20 right-4 z-30">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={() => fetchSpots()} size="icon" disabled={loadingSpots} className="h-12 w-12 rounded-full disabled:opacity-50" style={{ background: `${designTokens.colors.background.white}F0`, color: designTokens.colors.primary.base, boxShadow: designTokens.elevation.medium, border: `1px solid ${designTokens.colors.secondary.stone}40` }}>
                <RefreshCw className={`h-6 w-6 ${loadingSpots ? 'animate-spin' : ''}`} />
              </Button>
            </motion.div>
          </div>
          {/* 画面下中央: 作成ボタン（カメラアイコンの下にテキスト） */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => router.push('/create-spot')}
                className="min-w-[5.5rem] h-16 rounded-2xl flex flex-col items-center justify-center gap-1 font-semibold text-xs px-4 py-3"
                style={{ background: designTokens.colors.functional.info, color: designTokens.colors.text.inverse, boxShadow: designTokens.elevation.high }}
              >
                <Camera className="h-6 w-6 flex-shrink-0" />
                作成
              </Button>
            </motion.div>
          </div>
        </>
      )}

      {/* 更新中表示 */}
      <AnimatePresence>
        {(isRefreshing || loadingPosts || loadingMaps || loadingSpots) && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute top-20 left-1/2 transform -translate-x-1/2 z-40 backdrop-blur-sm px-6 py-3 rounded-full" style={{ background: `${designTokens.colors.background.white}F5`, boxShadow: designTokens.elevation.medium }}>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" style={{ color: designTokens.colors.accent.gold }} />
              <span className="text-sm font-medium" style={{ color: designTokens.colors.text.primary }}>更新中...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* イベント詳細カード（イベントモード時・スワイプ対応・現在地近い順） */}
      <AnimatePresence>
        {viewMode === 'events' && selectedPost && posts.length > 0 && (() => {
          const currentIdx = Math.min(eventCardIndex, posts.length - 1);
          const post = posts[currentIdx];
          if (!post) return null;
          const displayTitle = post.category === 'イベント情報' ? (post.event_name || post.content) : post.content;
          const effectiveLatitude = savedLocation?.lat || latitude;
          const effectiveLongitude = savedLocation?.lng || longitude;
          let isWithinRangeResult = false;
          if (effectiveLatitude && effectiveLongitude && post.store_latitude && post.store_longitude) {
            isWithinRangeResult = isWithinRange(effectiveLatitude, effectiveLongitude, post.store_latitude, post.store_longitude, 1000);
          }
          const canCheckIn = !!session?.user?.id && post.enable_checkin === true && !!effectiveLatitude && !!effectiveLongitude && !!post.store_latitude && !!post.store_longitude && isWithinRangeResult;
          const isCheckedIn = checkedInPosts.has(post.id);
          const distanceText = post.distance != null ? (post.distance < 1 ? `${Math.round(post.distance * 1000)}m` : `${post.distance.toFixed(1)}km`) : null;

          const handleSwipe = (direction: 'left' | 'right') => {
            if (selectedMarkerRef.current) { selectedMarkerRef.current.setAnimation(null); }
            let newIdx: number;
            if (direction === 'left') { newIdx = currentIdx < posts.length - 1 ? currentIdx + 1 : 0; }
            else { newIdx = currentIdx > 0 ? currentIdx - 1 : posts.length - 1; }
            setEventCardIndex(newIdx);
            const nextPost = posts[newIdx];
            setSelectedPost(nextPost);
            // Bounce the new marker (stop after ~2 bounces)
            const matchingMarker = postMarkers.find(m => m?.getTitle()?.includes(nextPost.store_name));
            if (matchingMarker) { matchingMarker.setAnimation(window.google.maps.Animation.BOUNCE); setTimeout(() => { if (matchingMarker.getAnimation() !== null) matchingMarker.setAnimation(null); }, 1400); selectedMarkerRef.current = matchingMarker; }
            // Pan map to new post
            if (map && nextPost.store_latitude && nextPost.store_longitude) {
              map.panTo(new window.google.maps.LatLng(nextPost.store_latitude, nextPost.store_longitude));
            }
          };

          return (
            <motion.div
              key={post.id}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: 0.4, type: "spring", damping: 20 }}
              className="absolute bottom-4 left-4 right-4 z-40"
              onTouchStart={(e) => { eventCardTouchStartX.current = e.touches[0].clientX; eventCardTouchDeltaX.current = 0; }}
              onTouchMove={(e) => { eventCardTouchDeltaX.current = e.touches[0].clientX - eventCardTouchStartX.current; }}
              onTouchEnd={() => {
                if (Math.abs(eventCardTouchDeltaX.current) > 50) {
                  handleSwipe(eventCardTouchDeltaX.current < 0 ? 'left' : 'right');
                }
              }}
            >
              <div className="relative rounded-2xl overflow-hidden" style={{ background: designTokens.colors.background.white, boxShadow: designTokens.elevation.high }}>
                {/* Card index indicator */}
                {posts.length > 1 && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                    {posts.map((_, i) => (
                      <div
                        key={i}
                        className="rounded-full transition-all"
                        style={{
                          width: i === currentIdx ? 16 : 6,
                          height: 6,
                          background: i === currentIdx ? designTokens.colors.accent.lilac : `${designTokens.colors.secondary.stone}60`,
                        }}
                      />
                    ))}
                  </div>
                )}
                {canCheckIn && (
                  <div onClick={(e) => { e.stopPropagation(); if (!isCheckedIn && checkingIn !== post.id) handleCheckIn(post); }} className={`absolute -top-3 left-4 z-30 cursor-pointer transition-all ${isCheckedIn || checkingIn === post.id ? 'cursor-default' : 'hover:scale-105'}`}>
                    <div className="px-4 py-2 rounded-full font-semibold text-sm" style={{ background: isCheckedIn ? designTokens.colors.functional.success : designTokens.colors.accent.lilac, color: designTokens.colors.text.inverse, boxShadow: designTokens.elevation.medium }}>
                      {checkingIn === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : isCheckedIn ? '✓ 完了' : 'Check In'}
                    </div>
                  </div>
                )}
                <div className="absolute top-4 right-4 z-10">
                  <Button onClick={() => { if (selectedMarkerRef.current) { selectedMarkerRef.current.setAnimation(null); selectedMarkerRef.current = null; } setSelectedPost(null); setNearbyPosts([]); }} size="icon" className="h-8 w-8 rounded-full" style={{ background: designTokens.colors.background.cloud, color: designTokens.colors.text.secondary }}><X className="h-4 w-4" /></Button>
                </div>
                <div className="p-5 pt-8">
                  <div className="flex gap-4 mb-3">
                    <div className="flex-shrink-0 relative w-20 h-20 rounded-xl overflow-hidden" style={{ background: designTokens.colors.background.cloud }}>
                      {post.image_urls && post.image_urls.length > 0 ? (
                        <img src={optimizeCloudinaryImageUrl(post.image_urls[0])} alt={post.store_name} className="w-full h-full object-cover" loading="eager" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Calendar className="h-8 w-8" style={{ color: designTokens.colors.text.muted }} /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold leading-tight line-clamp-2 mb-1.5" style={{ fontFamily: designTokens.typography.display, color: designTokens.colors.primary.dark }}>{displayTitle}</h3>
                      <div className="flex items-center gap-2 text-sm mb-1" style={{ color: designTokens.colors.text.secondary }}>
                        <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: designTokens.colors.functional.error }} />
                        <span className="line-clamp-1">{post.store_name}</span>
                      </div>
                      {post.category === 'イベント情報' && post.event_start_date && (
                        <div className="flex items-center gap-2 text-xs" style={{ color: designTokens.colors.text.secondary }}>
                          <Calendar className="h-3.5 w-3.5 flex-shrink-0" style={{ color: designTokens.colors.functional.info }} />
                          <span className="line-clamp-1">
                            {new Date(post.event_start_date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}
                            {post.event_end_date && post.event_end_date !== post.event_start_date && <> 〜 {new Date(post.event_end_date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}</>}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <motion.div whileHover={{ scale: navigatingToDetail === post.id ? 1 : 1.02 }} whileTap={{ scale: navigatingToDetail === post.id ? 1 : 0.98 }}>
                    <Button
                      onClick={() => {
                        if (navigatingToDetail) return;
                        setNavigatingToDetail(post.id);
                        const eventUrl = generateSemanticEventUrl({ eventId: post.id, eventName: post.event_name || post.content, city: post.city || undefined, prefecture: post.prefecture || '大分県' });
                        router.push(eventUrl);
                      }}
                      disabled={navigatingToDetail === post.id}
                      className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-80"
                      style={{ background: designTokens.colors.accent.lilac, color: designTokens.colors.text.inverse }}
                    >
                      {navigatingToDetail === post.id ? (<><Loader2 className="h-4 w-4 animate-spin" />読み込み中...</>) : (<><Search className="h-4 w-4" />詳細を見る</>)}
                    </Button>
                  </motion.div>
                  {posts.length > 1 && (
                    <p className="text-center text-[10px] mt-2 font-medium" style={{ color: designTokens.colors.text.muted }}>
                      ＜ーースワイプーー＞（{currentIdx + 1}/{posts.length}）
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* コースロケーション詳細カード */}
      <AnimatePresence>
        {selectedMapLocation && viewMode === 'myMaps' && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} transition={{ duration: 0.4, type: "spring", damping: 20 }} className="absolute bottom-4 left-4 right-4 z-40">
            <div className="relative rounded-2xl overflow-hidden" style={{ background: designTokens.colors.background.white, boxShadow: designTokens.elevation.high }}>
              <div className="absolute top-4 right-4 z-10">
                <Button onClick={() => setSelectedMapLocation(null)} size="icon" className="h-8 w-8 rounded-full" style={{ background: designTokens.colors.background.cloud, color: designTokens.colors.text.secondary }}><X className="h-4 w-4" /></Button>
              </div>
              <div className="p-5">
                <div className="flex gap-4 mb-4">
                  <div className="flex-shrink-0 relative w-24 h-24 rounded-xl overflow-hidden" style={{ background: designTokens.colors.background.cloud }}>
                    {selectedMapLocation.image_urls && selectedMapLocation.image_urls.length > 0 ? (
                      <img src={optimizeCloudinaryImageUrl(selectedMapLocation.image_urls[0])} alt={selectedMapLocation.store_name} className="w-full h-full object-cover" loading="eager" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><MapPin className="h-12 w-12" style={{ color: designTokens.colors.text.muted }} /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="h-4 w-4 flex-shrink-0" style={{ color: designTokens.colors.accent.goldDark }} />
                      <span className="text-xs font-medium line-clamp-1" style={{ color: designTokens.colors.text.muted }}>{selectedMapLocation.map_title}</span>
                    </div>
                    <h3 className="text-lg font-semibold leading-tight line-clamp-2 mb-2" style={{ fontFamily: designTokens.typography.display, color: designTokens.colors.text.primary }}>{selectedMapLocation.store_name}</h3>
                    {selectedMapLocation.url && (
                      <div className="flex items-center gap-1.5">
                        <img src={getSocialIconUrl(normalizeUrl(selectedMapLocation.url) || '')} alt="link" className="w-4 h-4 grayscale opacity-70" />
                        <span className="text-xs font-medium" style={{ color: designTokens.colors.text.muted }}>Link available</span>
                      </div>
                    )}
                  </div>
                </div>
                <motion.div whileHover={{ scale: navigatingToMapDetail === selectedMapLocation.id ? 1 : 1.02 }} whileTap={{ scale: navigatingToMapDetail === selectedMapLocation.id ? 1 : 0.98 }}>
                  <Button 
                    onClick={() => {
                      if (navigatingToMapDetail) return;
                      setNavigatingToMapDetail(selectedMapLocation.id);
                      router.push(`/map/spot/${selectedMapLocation.id}`);
                    }}
                    disabled={navigatingToMapDetail === selectedMapLocation.id}
                    className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-80"
                    style={{ background: designTokens.colors.accent.lilac, color: designTokens.colors.text.inverse }}
                  >
                    {navigatingToMapDetail === selectedMapLocation.id ? (<><Loader2 className="h-4 w-4 animate-spin" />読み込み中...</>) : (<><Search className="h-4 w-4" />詳細を見る</>)}
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* スポット詳細カード */}
      <AnimatePresence>
        {selectedSpot && viewMode === 'spots' && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} transition={{ duration: 0.4, type: "spring", damping: 20 }} className="absolute bottom-4 left-4 right-4 z-40">
            <div className="relative rounded-2xl overflow-hidden" style={{ background: designTokens.colors.background.white, boxShadow: designTokens.elevation.high }}>
              <div className="absolute top-4 right-4 z-10">
                <Button onClick={() => setSelectedSpot(null)} size="icon" className="h-8 w-8 rounded-full" style={{ background: designTokens.colors.background.cloud, color: designTokens.colors.text.secondary }}><X className="h-4 w-4" /></Button>
              </div>
              <div className="p-5">
                <div className="flex gap-4 mb-3">
                  <div className="flex-shrink-0 relative w-24 h-24 rounded-xl overflow-hidden" style={{ background: designTokens.colors.background.cloud }}>
                    {selectedSpot.image_urls && selectedSpot.image_urls.length > 0 ? (
                      <img src={optimizeCloudinaryImageUrl(selectedSpot.image_urls[0])} alt={selectedSpot.store_name} className="w-full h-full object-cover" loading="eager" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><MapPin className="h-12 w-12" style={{ color: designTokens.colors.text.muted }} /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold leading-tight line-clamp-2 mb-1.5" style={{ fontFamily: designTokens.typography.display, color: designTokens.colors.text.primary }}>{selectedSpot.store_name}</h3>
                    {selectedSpot.city && (
                      <div className="flex items-center gap-1.5 text-sm mb-1" style={{ color: designTokens.colors.text.secondary }}>
                        <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: designTokens.colors.functional.error }} />
                        <span>{selectedSpot.city}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: designTokens.colors.text.muted }}>
                      <User className="h-3 w-3 flex-shrink-0" />
                      <span>{selectedSpot.author_name}</span>
                    </div>
                  </div>
                </div>
                {selectedSpot.description && (
                  <p className="text-sm line-clamp-2 mb-3 leading-relaxed" style={{ color: designTokens.colors.text.secondary }}>{selectedSpot.description}</p>
                )}
                <div className="flex gap-2">
                  {selectedSpot.url && (
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                      <Button
                        onClick={() => { if (selectedSpot.url) window.open(selectedSpot.url, '_blank'); }}
                        className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                        style={{ background: designTokens.colors.secondary.fern, color: designTokens.colors.text.inverse }}
                      >
                        <ExternalLink className="h-4 w-4" />
                        リンクを開く
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=IBM+Plex+Sans+JP:wght@400;500;600&family=Noto+Sans+JP:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
}
