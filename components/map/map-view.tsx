"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { useGoogleMapsApi } from '@/components/providers/GoogleMapsApiProvider';
import { Button } from '@/components/ui/button';
import { MapPin, AlertTriangle, RefreshCw, Calendar, User, MapPinIcon, X, Loader2, Compass, Search, Trash2, Bus, TrainFront, Coffee } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/lib/hooks/use-toast';
import { isWithinRange } from '@/lib/utils/distance';
import { generateSemanticEventUrl } from '@/lib/seo/url-helper';
import { designTokens } from '@/lib/constants';
import { FacilityLayerToggles } from '@/components/map/facility-layer-toggles';
import { FacilityReportForm } from '@/components/map/facility-report-form';
import { usePlacesSearch, PlaceResult } from '@/lib/hooks/use-places-search';
import type { FacilityLayerType, FacilityReportWithAuthor } from '@/types/facility-report';

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
  distance?: number | null;
}

type PostCategory = 'イベント情報';

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

// 施設マーカーアイコン生成
const FACILITY_ICON_CONFIGS: Record<FacilityLayerType, { color: string; svgPath: string }> = {
  trash_can: {
    color: '#6B7280',
    svgPath: '<path d="M5 6h14M9 6V4h6v2M7 6l1 12h8l1-12" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  bus_stop: {
    color: '#3B82F6',
    svgPath: '<path d="M6 6h12a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1V7a1 1 0 011-1zM7 16v2M17 16v2M8 12h2M14 12h2M5 10h14" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  train_station: {
    color: '#EF4444',
    svgPath: '<path d="M7 5h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2zM9 17l-2 2M15 17l2 2M9 13h0M15 13h0M5 10h14" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  rest_spot: {
    color: '#10B981',
    svgPath: '<path d="M8 18h8M10 18V8h0a4 4 0 014 0M18 8a3 3 0 01-3 3h-1" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  },
};

const createFacilityMarkerIcon = (type: FacilityLayerType): google.maps.Icon => {
  const size = 36;
  const config = FACILITY_ICON_CONFIGS[type];
  const svgIcon = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${config.color}" stroke="#ffffff" stroke-width="2"/>
    <g transform="translate(${size/2 - 12}, ${size/2 - 12})">${config.svgPath}</g>
  </svg>`;
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgIcon),
    scaledSize: new window.google.maps.Size(size, size),
    anchor: new window.google.maps.Point(size / 2, size / 2),
  };
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

// Places API type mapping
const FACILITY_PLACES_TYPE: Record<string, string> = {
  bus_stop: 'bus_station',
  train_station: 'train_station',
  rest_spot: 'shopping_mall',
};

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
  const [posts, setPosts] = useState<PostMarkerData[]>([]);
  const [postMarkers, setPostMarkers] = useState<google.maps.Marker[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostMarkerData | null>(null);
  const [nearbyPosts, setNearbyPosts] = useState<PostMarkerData[]>([]);
  const [savedLocation, setSavedLocation] = useState<{lat: number, lng: number} | null>(null);
  const hasInitialLoadedRef = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const selectedCategory: PostCategory = 'イベント情報';
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [checkedInPosts, setCheckedInPosts] = useState<Set<string>>(new Set());
  const [navigatingToDetail, setNavigatingToDetail] = useState<string | null>(null);

  // Event card swipe state
  const [eventCardIndex, setEventCardIndex] = useState(0);
  const eventCardTouchStartX = useRef<number>(0);
  const eventCardTouchDeltaX = useRef<number>(0);
  const selectedMarkerRef = useRef<google.maps.Marker | null>(null);

  // Facility layer state
  const [activeFacilityLayers, setActiveFacilityLayers] = useState<Set<FacilityLayerType>>(new Set());
  const [facilityMarkers, setFacilityMarkers] = useState<Map<string, google.maps.Marker[]>>(new Map());
  const [trashCanReports, setTrashCanReports] = useState<FacilityReportWithAuthor[]>([]);
  const [loadingFacility, setLoadingFacility] = useState<Set<string>>(new Set());
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<{ type: FacilityLayerType; data: PlaceResult | FacilityReportWithAuthor } | null>(null);

  const { results: placesResults, loading: placesLoading, searchNearby, clearResults } = usePlacesSearch();

  // Effects
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
          if (selectedMarkerRef.current) { selectedMarkerRef.current.setAnimation(null); }
          marker.setAnimation(window.google.maps.Animation.BOUNCE);
          setTimeout(() => { if (marker.getAnimation() !== null) marker.setAnimation(null); }, 1400);
          selectedMarkerRef.current = marker;
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

  // Facility data fetch
  const fetchTrashCanReports = useCallback(async () => {
    setLoadingFacility(prev => new Set(prev).add('trash_can'));
    try {
      const res = await fetch('/api/facility-reports?type=trash_can');
      const data = await res.json();
      if (res.ok && data.reports) {
        setTrashCanReports(data.reports);
      }
    } catch (error) {
      console.error('ゴミ箱データの取得中にエラー:', error);
    } finally {
      setLoadingFacility(prev => {
        const next = new Set(prev);
        next.delete('trash_can');
        return next;
      });
    }
  }, []);

  // Create facility markers for a given type
  const createFacilityMarkersForType = useCallback((type: FacilityLayerType, items: Array<{ lat: number; lng: number; name: string; id: string; data: PlaceResult | FacilityReportWithAuthor }>) => {
    if (!map || !window.google?.maps) return;

    // Clear existing markers for this type
    const existing = facilityMarkers.get(type);
    if (existing) {
      existing.forEach(m => m.setMap(null));
    }

    const icon = createFacilityMarkerIcon(type);
    const newMarkers: google.maps.Marker[] = [];

    items.forEach(item => {
      const marker = new window.google.maps.Marker({
        position: new window.google.maps.LatLng(item.lat, item.lng),
        map,
        title: item.name,
        icon,
        zIndex: 5,
      });
      marker.addListener('click', () => {
        setSelectedFacility({ type, data: item.data });
        setSelectedPost(null);
      });
      newMarkers.push(marker);
    });

    setFacilityMarkers(prev => new Map(prev).set(type, newMarkers));
  }, [map, facilityMarkers]);

  // Handle facility layer toggle
  const handleFacilityToggle = useCallback((type: FacilityLayerType) => {
    setActiveFacilityLayers(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        // Turn off
        next.delete(type);
        const existing = facilityMarkers.get(type);
        if (existing) {
          existing.forEach(m => m.setMap(null));
          setFacilityMarkers(prev => {
            const next = new Map(prev);
            next.delete(type);
            return next;
          });
        }
        if (type !== 'trash_can') {
          clearResults(FACILITY_PLACES_TYPE[type]);
        }
        if (selectedFacility?.type === type) {
          setSelectedFacility(null);
        }
      } else {
        // Turn on
        next.add(type);
        if (type === 'trash_can') {
          fetchTrashCanReports();
        } else if (map) {
          const center = map.getCenter();
          if (center) {
            searchNearby(map, center, FACILITY_PLACES_TYPE[type], 5000);
          }
        }
      }
      return next;
    });
  }, [map, facilityMarkers, fetchTrashCanReports, searchNearby, clearResults, selectedFacility]);

  // Effect: create trash can markers when reports change
  useEffect(() => {
    if (!activeFacilityLayers.has('trash_can') || !map) return;
    const items = trashCanReports.map(r => ({
      lat: r.store_latitude,
      lng: r.store_longitude,
      name: r.store_name,
      id: r.id,
      data: r as FacilityReportWithAuthor,
    }));
    createFacilityMarkersForType('trash_can', items);
  }, [trashCanReports, activeFacilityLayers, map]);

  // Effect: create Places API markers when results change
  useEffect(() => {
    if (!map) return;
    const placesTypeMap: Record<string, FacilityLayerType> = {
      bus_station: 'bus_stop',
      train_station: 'train_station',
      shopping_mall: 'rest_spot',
    };
    placesResults.forEach((results, placeType) => {
      const facilityType = placesTypeMap[placeType];
      if (!facilityType || !activeFacilityLayers.has(facilityType)) return;
      const items = results.map(r => ({
        lat: r.lat,
        lng: r.lng,
        name: r.name,
        id: r.id,
        data: r as PlaceResult,
      }));
      createFacilityMarkersForType(facilityType, items);
    });
  }, [placesResults, activeFacilityLayers, map]);

  // Effect: re-search Places on map idle
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('idle', () => {
      const center = map.getCenter();
      if (!center) return;
      activeFacilityLayers.forEach(type => {
        if (type !== 'trash_can') {
          const placeType = FACILITY_PLACES_TYPE[type];
          if (placeType) {
            searchNearby(map, center, placeType, 5000);
          }
        }
      });
    });
    return () => { window.google?.maps?.event?.removeListener(listener); };
  }, [map, activeFacilityLayers, searchNearby]);

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
      if (userLat && userLng) {
        hasInitialLoadedRef.current = true;
        fetchPosts();
      }
    }
  }, [latitude, longitude, savedLocation, mapInitialized, fetchPosts]);

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
    await fetchPosts();
    // Also refresh trash can reports if layer is active
    if (activeFacilityLayers.has('trash_can')) {
      await fetchTrashCanReports();
    }
    setTimeout(() => { setIsRefreshing(false); }, 500);
  };

  useEffect(() => {
    if (posts.length > 0 && map && window.google?.maps) createPostMarkers();
    else if (posts.length === 0 && map && window.google?.maps) { postMarkers.forEach(marker => { if (marker?.setMap) marker.setMap(null); }); setPostMarkers([]); }
  }, [posts, map]);

  useEffect(() => {
    const userLat = savedLocation?.lat || latitude;
    const userLng = savedLocation?.lng || longitude;
    if (map && userLat && userLng && mapInitialized && window.google?.maps) {
      const userPosition = new window.google.maps.LatLng(userLat, userLng);
      const directionalIcon = createDirectionalLocationIcon(null);
      if (userLocationMarker) { userLocationMarker.setPosition(userPosition); userLocationMarker.setIcon(directionalIcon); userLocationMarker.setMap(map); userLocationMarker.setZIndex(9999); }
      else {
        try {
          const marker = new window.google.maps.Marker({ position: userPosition, map, title: "あなたの現在地", icon: directionalIcon, zIndex: 9999 });
          setUserLocationMarker(marker);
        } catch (error) { console.error('Failed to create user location marker:', error); }
      }
      map.panTo(userPosition);
      const currentZoom = map.getZoom();
      if (currentZoom !== undefined && currentZoom < 11) map.setZoom(11);
    }
  }, [map, latitude, longitude, savedLocation, mapInitialized, userLocationMarker]);

  const handleRetry = () => {
    setInitializationError(null); setMapInitialized(false); initializationTriedRef.current = false; mapInstanceRef.current = null; setMap(null);
    if (userLocationMarker) { userLocationMarker.setMap(null); setUserLocationMarker(null); }
    postMarkers.forEach(marker => { if (marker?.setMap) marker.setMap(null); });
    setPostMarkers([]); setPosts([]);
    // Clear facility markers
    facilityMarkers.forEach(markers => markers.forEach(m => m.setMap(null)));
    setFacilityMarkers(new Map());
    if (mapContainerRef.current) mapContainerRef.current.innerHTML = '';
    setTimeout(() => { updateContainerDimensions(); if (!latitude || !longitude) requestLocation(); }, 100);
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

  // Helper to get facility type label
  const getFacilityTypeLabel = (type: FacilityLayerType): string => {
    const labels: Record<FacilityLayerType, string> = {
      trash_can: 'ゴミ箱',
      bus_stop: 'バス停',
      train_station: '駅',
      rest_spot: '休憩スポット',
    };
    return labels[type];
  };

  const getFacilityTypeIcon = (type: FacilityLayerType) => {
    const icons: Record<FacilityLayerType, React.ElementType> = {
      trash_can: Trash2,
      bus_stop: Bus,
      train_station: TrainFront,
      rest_spot: Coffee,
    };
    return icons[type];
  };

  const getFacilityTypeColor = (type: FacilityLayerType): string => {
    const colors: Record<FacilityLayerType, string> = {
      trash_can: '#6B7280',
      bus_stop: '#3B82F6',
      train_station: '#EF4444',
      rest_spot: '#10B981',
    };
    return colors[type];
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

      {/* 更新ボタン（右上） */}
      {map && mapInitialized && (
        <div className="absolute top-20 right-4 z-30">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={handleManualRefresh} size="icon" disabled={isRefreshing || loadingPosts} className="h-12 w-12 rounded-full disabled:opacity-50" style={{ background: `${designTokens.colors.background.white}F0`, color: designTokens.colors.primary.base, boxShadow: designTokens.elevation.medium, border: `1px solid ${designTokens.colors.secondary.stone}40` }}>
              <RefreshCw className={`h-6 w-6 ${(isRefreshing || loadingPosts) ? 'animate-spin' : ''}`} />
            </Button>
          </motion.div>
        </div>
      )}

      {/* 施設レイヤートグル（左上） */}
      {map && mapInitialized && (
        <div className="absolute top-20 left-4 z-30">
          <FacilityLayerToggles
            activeLayers={activeFacilityLayers}
            onToggle={handleFacilityToggle}
            loadingLayers={loadingFacility}
          />
        </div>
      )}

      {/* ゴミ箱報告ボタン（下部中央）- ゴミ箱レイヤーがONの時のみ */}
      {map && mapInitialized && activeFacilityLayers.has('trash_can') && !selectedPost && !selectedFacility && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => setShowReportForm(true)}
              className="h-14 rounded-xl flex items-center justify-center gap-2 px-6 font-semibold text-sm shadow-lg"
              style={{ background: '#6B7280', color: designTokens.colors.text.inverse, boxShadow: designTokens.elevation.high }}
            >
              <Trash2 className="h-5 w-5 flex-shrink-0" />
              ゴミ箱を報告
            </Button>
          </motion.div>
        </div>
      )}

      {/* 更新中表示 */}
      <AnimatePresence>
        {(isRefreshing || loadingPosts) && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute top-20 left-1/2 transform -translate-x-1/2 z-40 backdrop-blur-sm px-6 py-3 rounded-full" style={{ background: `${designTokens.colors.background.white}F5`, boxShadow: designTokens.elevation.medium }}>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" style={{ color: designTokens.colors.accent.gold }} />
              <span className="text-sm font-medium" style={{ color: designTokens.colors.text.primary }}>更新中...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* イベント詳細カード（スワイプ対応・現在地近い順） */}
      <AnimatePresence>
        {selectedPost && posts.length > 0 && (() => {
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

          const handleSwipe = (direction: 'left' | 'right') => {
            if (selectedMarkerRef.current) { selectedMarkerRef.current.setAnimation(null); }
            let newIdx: number;
            if (direction === 'left') { newIdx = currentIdx < posts.length - 1 ? currentIdx + 1 : 0; }
            else { newIdx = currentIdx > 0 ? currentIdx - 1 : posts.length - 1; }
            setEventCardIndex(newIdx);
            const nextPost = posts[newIdx];
            setSelectedPost(nextPost);
            const matchingMarker = postMarkers.find(m => m?.getTitle()?.includes(nextPost.store_name));
            if (matchingMarker) { matchingMarker.setAnimation(window.google.maps.Animation.BOUNCE); setTimeout(() => { if (matchingMarker.getAnimation() !== null) matchingMarker.setAnimation(null); }, 1400); selectedMarkerRef.current = matchingMarker; }
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
                {posts.length > 1 && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
                    <p className="text-[10px] font-medium whitespace-nowrap" style={{ color: designTokens.colors.text.muted }}>
                      ＜ーースワイプーー＞
                    </p>
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
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* 施設詳細カード */}
      <AnimatePresence>
        {selectedFacility && (() => {
          const FacilityIcon = getFacilityTypeIcon(selectedFacility.type);
          const facilityColor = getFacilityTypeColor(selectedFacility.type);
          const isTrashCan = selectedFacility.type === 'trash_can';
          const data = selectedFacility.data;
          const name = isTrashCan ? (data as FacilityReportWithAuthor).store_name : (data as PlaceResult).name;
          const subtitle = isTrashCan
            ? (data as FacilityReportWithAuthor).description || ''
            : (data as PlaceResult).vicinity || '';
          const authorName = isTrashCan ? ((data as FacilityReportWithAuthor).author_name || (data as FacilityReportWithAuthor).reporter_nickname || '匿名') : null;
          const createdAt = isTrashCan ? (data as FacilityReportWithAuthor).created_at : null;
          const facilityLat = isTrashCan ? (data as FacilityReportWithAuthor).store_latitude : (data as PlaceResult).lat;
          const facilityLng = isTrashCan ? (data as FacilityReportWithAuthor).store_longitude : (data as PlaceResult).lng;

          return (
            <motion.div
              key={`facility-${name}`}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: 0.4, type: "spring", damping: 20 }}
              className="absolute bottom-4 left-4 right-4 z-40"
            >
              <div className="relative rounded-2xl overflow-hidden" style={{ background: designTokens.colors.background.white, boxShadow: designTokens.elevation.high }}>
                <div className="absolute top-4 right-4 z-10">
                  <Button onClick={() => setSelectedFacility(null)} size="icon" className="h-8 w-8 rounded-full" style={{ background: designTokens.colors.background.cloud, color: designTokens.colors.text.secondary }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-5">
                  <div className="flex gap-4 mb-3">
                    <div
                      className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center"
                      style={{ background: `${facilityColor}15` }}
                    >
                      <FacilityIcon className="h-7 w-7" style={{ color: facilityColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: facilityColor, color: '#fff' }}>
                          {getFacilityTypeLabel(selectedFacility.type)}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold leading-tight line-clamp-2 mb-1" style={{ fontFamily: designTokens.typography.display, color: designTokens.colors.text.primary }}>
                        {name}
                      </h3>
                      {subtitle && (
                        <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: designTokens.colors.text.secondary }}>
                          {subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Author info for trash cans */}
                  {isTrashCan && (
                    <div className="flex items-center gap-3 text-xs mb-3" style={{ color: designTokens.colors.text.muted }}>
                      {authorName && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 flex-shrink-0" />
                          <span>{authorName}</span>
                        </div>
                      )}
                      {createdAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span>{new Date(createdAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Google Maps direction link */}
                  {!isTrashCan && (
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        onClick={() => {
                          window.open(`https://www.google.com/maps/dir/?api=1&destination=${facilityLat},${facilityLng}`, '_blank');
                        }}
                        className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                        style={{ background: facilityColor, color: '#fff' }}
                      >
                        <MapPin className="h-4 w-4" />
                        ここへのルート
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ゴミ箱報告フォーム */}
      <AnimatePresence>
        {showReportForm && map && (() => {
          const center = map.getCenter();
          const lat = center?.lat() || savedLocation?.lat || latitude || 35.6812;
          const lng = center?.lng() || savedLocation?.lng || longitude || 139.7671;
          return (
            <FacilityReportForm
              latitude={lat}
              longitude={lng}
              onClose={() => setShowReportForm(false)}
              onSuccess={() => {
                fetchTrashCanReports();
                toast({ title: '📍 報告完了！', description: 'ゴミ箱の場所を報告しました。ありがとうございます！' });
              }}
            />
          );
        })()}
      </AnimatePresence>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=IBM+Plex+Sans+JP:wght@400;500;600&family=Noto+Sans+JP:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
}
