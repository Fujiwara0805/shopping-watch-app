"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { 
  Upload, X, MapPin, Plus, Trash2, 
  Loader2, Image as ImageIcon, Link as LinkIcon, Tag, ClockIcon,
  MapIcon, CheckCircle, ChevronUp, ChevronDown, ArrowLeft,
  Navigation, Crosshair, Crop, Move, ZoomIn, ZoomOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { useSession } from "next-auth/react";
import { supabase } from '@/lib/supabaseClient';
import { calculateExpiresAt } from '@/lib/expires-at-date';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from "@/hooks/use-toast";
import { useLoading } from '@/contexts/loading-context';
import { useGoogleMapsApi } from '@/components/providers/GoogleMapsApiProvider';
import { useGeolocation } from '@/lib/hooks/use-geolocation';

// 場所のデータ型
interface LocationData {
  id: string;
  storeName: string;
  storeId: string;
  store_latitude?: number;
  store_longitude?: number;
  content: string;
  imageFiles: File[];
  imagePreviewUrls: string[];
  existingImageUrls: string[]; // 既存の画像URL
  url: string;
  order: number;
}

// フォームスキーマ
const editMapSchema = z.object({
  title: z.string().min(1, { message: 'タイトルは必須です' }).max(100, { message: '100文字以内で入力してください' }),
  expiryOption: z.enum(['30days', '90days', 'unlimited']),
});

type MapFormValues = z.infer<typeof editMapSchema>;

// 丸数字変換関数
const toCircledNumber = (num: number): string => {
  const circled = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', 
                   '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'];
  return circled[num - 1] || `${num}`;
};

// 画像クロップモーダルコンポーネント
interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (croppedFile: File, previewUrl: string) => void;
  imageFile: File | null;
  imageUrl?: string | null; // 既存画像のURL用
}

function ImageCropModal({
  isOpen,
  onClose,
  onSave,
  imageFile,
  imageUrl,
}: ImageCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // アスペクト比 16:10
  const aspectRatio = 16 / 10;
  const cropWidth = 320;
  const cropHeight = cropWidth / aspectRatio;
  
  // 画像読み込み
  useEffect(() => {
    if (!isOpen) return;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      
      // 画像がクロップ領域に収まるように初期スケールを設定
      const scaleX = cropWidth / img.width;
      const scaleY = cropHeight / img.height;
      const initialScale = Math.max(scaleX, scaleY) * 1.2;
      setScale(initialScale);
      setPosition({ x: 0, y: 0 });
    };
    
    if (imageFile) {
      img.src = URL.createObjectURL(imageFile);
    } else if (imageUrl) {
      img.src = imageUrl;
    }
    
    return () => {
      if (imageFile && img.src) URL.revokeObjectURL(img.src);
    };
  }, [isOpen, imageFile, imageUrl]);
  
  // ドラッグ開始
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };
  
  // ドラッグ中
  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  };
  
  // ドラッグ終了
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // ズーム
  const handleZoom = (delta: number) => {
    setScale(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };
  
  // 保存処理
  const handleSave = () => {
    if (!canvasRef.current || !imageRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 出力サイズ（16:10）
    const outputWidth = 800;
    const outputHeight = 500;
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    
    const img = imageRef.current;
    const imgWidth = img.width * scale;
    const imgHeight = img.height * scale;
    
    // クロップ領域の中心からの相対位置を計算
    const cropCenterX = cropWidth / 2;
    const cropCenterY = cropHeight / 2;
    
    const imgCenterX = cropCenterX + position.x;
    const imgCenterY = cropCenterY + position.y;
    
    // 描画位置を計算
    const drawX = (outputWidth / 2) - (imgCenterX / cropWidth * outputWidth);
    const drawY = (outputHeight / 2) - (imgCenterY / cropHeight * outputHeight);
    const drawWidth = imgWidth / cropWidth * outputWidth;
    const drawHeight = imgHeight / cropHeight * outputHeight;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outputWidth, outputHeight);
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      const fileName = imageFile?.name || 'cropped.jpg';
      const croppedFile = new File([blob], fileName, { type: 'image/jpeg' });
      const previewUrl = canvas.toDataURL('image/jpeg', 0.9);
      onSave(croppedFile, previewUrl);
      onClose();
    }, 'image/jpeg', 0.9);
  };
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
        >
          {/* ヘッダー */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crop className="h-5 w-5 text-violet-600" />
              <h3 className="text-base font-bold text-gray-800">画像を調整</h3>
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">16:10</span>
          </div>
          
          {/* クロップエリア */}
          <div 
            ref={containerRef}
            className="relative bg-gray-900 overflow-hidden"
            style={{ height: '250px' }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          >
            {/* 画像表示エリア */}
            <div 
              className="absolute inset-0 flex items-center justify-center cursor-move"
              onMouseDown={handleMouseDown}
              onTouchStart={handleMouseDown}
            >
              {imageLoaded && imageRef.current && (
                <img
                  src={imageRef.current.src}
                  alt="Preview"
                  className="pointer-events-none select-none"
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    maxWidth: 'none',
                  }}
                  draggable={false}
                />
              )}
            </div>
            
            {/* クロップオーバーレイ */}
            <div className="absolute inset-0 pointer-events-none">
              {/* 上部暗幕 */}
              <div className="absolute top-0 left-0 right-0 bg-black/50" style={{ height: `calc(50% - ${cropHeight/2}px)` }} />
              {/* 下部暗幕 */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50" style={{ height: `calc(50% - ${cropHeight/2}px)` }} />
              {/* 左部暗幕 */}
              <div className="absolute bg-black/50" style={{ 
                top: `calc(50% - ${cropHeight/2}px)`, 
                left: 0, 
                width: `calc(50% - ${cropWidth/2}px)`,
                height: `${cropHeight}px`
              }} />
              {/* 右部暗幕 */}
              <div className="absolute bg-black/50" style={{ 
                top: `calc(50% - ${cropHeight/2}px)`, 
                right: 0, 
                width: `calc(50% - ${cropWidth/2}px)`,
                height: `${cropHeight}px`
              }} />
              {/* クロップ枠 */}
              <div 
                className="absolute border-2 border-white rounded-lg"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: `${cropWidth}px`,
                  height: `${cropHeight}px`,
                }}
              >
                {/* グリッドライン */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="border border-white/30" />
                  ))}
                </div>
              </div>
            </div>
            
            {/* 操作ヒント */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
              <Move className="h-3 w-3" />
              ドラッグで位置調整
            </div>
          </div>
          
          {/* ズームコントロール */}
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleZoom(-0.1)}
              className="h-10 w-10 rounded-full"
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <div className="flex-1 max-w-[150px]">
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-500"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleZoom(0.1)}
              className="h-10 w-10 rounded-full"
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
          </div>
          
          {/* フッター */}
          <div className="px-4 py-4 border-t border-gray-200 flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 text-base font-bold rounded-full"
            >
              キャンセル
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="flex-1 h-12 text-base font-bold rounded-full bg-violet-500 hover:bg-violet-600 text-white"
            >
              適用
            </Button>
          </div>
          
          {/* 隠しキャンバス */}
          <canvas ref={canvasRef} className="hidden" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// マーカー位置選択モーダルコンポーネント
interface MarkerLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lat: number, lng: number, spotName: string) => void;
  initialLat?: number;
  initialLng?: number;
  initialSpotName?: string;
  isLoaded: boolean;
}

function MarkerLocationModal({
  isOpen,
  onClose,
  onSave,
  initialLat,
  initialLng,
  initialSpotName,
  isLoaded,
}: MarkerLocationModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  
  const [spotName, setSpotName] = useState<string>(initialSpotName || '');
  const [currentLat, setCurrentLat] = useState<number>(initialLat || 35.6762);
  const [currentLng, setCurrentLng] = useState<number>(initialLng || 139.6503);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  // モーダルが開いたときにスポット名をリセット
  useEffect(() => {
    if (isOpen) {
      setSpotName(initialSpotName || '');
    }
  }, [isOpen, initialSpotName]);
  
  // 現在地を取得
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('お使いのブラウザは位置情報をサポートしていません');
      return;
    }
    
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        setCurrentLat(lat);
        setCurrentLng(lng);
        
        if (mapRef.current && markerRef.current) {
          const newPosition = new google.maps.LatLng(lat, lng);
          mapRef.current.panTo(newPosition);
          markerRef.current.setPosition(newPosition);
        }
        
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('位置情報の取得に失敗:', error);
        setIsGettingLocation(false);
        alert('位置情報の取得に失敗しました');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, []);
  
  // マップの初期化
  useEffect(() => {
    if (!isOpen || !isLoaded || !mapContainerRef.current) return;
    
    // 初期位置の設定
    const initialPosition = {
      lat: initialLat || 35.6762,
      lng: initialLng || 139.6503
    };
    
    // マップの作成（店舗名・施設名を表示）
    const map = new google.maps.Map(mapContainerRef.current, {
      center: initialPosition,
      zoom: 17,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      zoomControl: true,
    });
    
    mapRef.current = map;
    
    // ドラッグ可能なマーカーの作成（小さいサイズ）
    const marker = new google.maps.Marker({
      position: initialPosition,
      map: map,
      draggable: true,
      animation: google.maps.Animation.DROP,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#8B5CF6',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
      }
    });
    
    markerRef.current = marker;
    setCurrentLat(initialPosition.lat);
    setCurrentLng(initialPosition.lng);
    
    // マーカーのドラッグ終了時のイベント
    marker.addListener('dragend', () => {
      const position = marker.getPosition();
      if (position) {
        setCurrentLat(position.lat());
        setCurrentLng(position.lng());
      }
    });
    
    // マップクリック時にマーカーを移動
    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        marker.setPosition(e.latLng);
        setCurrentLat(e.latLng.lat());
        setCurrentLng(e.latLng.lng());
      }
    });
    
    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
    };
  }, [isOpen, isLoaded, initialLat, initialLng]);
  
  // 保存処理
  const handleSave = () => {
    if (!spotName.trim()) {
      alert('スポット名を入力してください');
      return;
    }
    onSave(currentLat, currentLng, spotName.trim());
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        // 背景クリックで閉じないようにonClickを削除
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ヘッダー */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
            <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-bold rounded">ピン設定</span>
            <h3 className="text-base font-bold text-gray-800">マーカー(ピン)の位置調整</h3>
          </div>
          
          {/* マップエリア */}
          <div className="relative">
            <div
              ref={mapContainerRef}
              className="w-full h-[280px] sm:h-[320px] bg-gray-100"
            />
            
            {/* 現在地へ移動ボタン（左下に配置） */}
            <div className="absolute bottom-3 left-3">
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-bold rounded-lg shadow-lg border border-gray-200 transition-colors disabled:opacity-50"
              >
                {isGettingLocation ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crosshair className="h-4 w-4" />
                )}
                現在地へ移動
              </button>
            </div>
          </div>
          
          {/* スポット名入力エリア */}
          <div className="px-4 py-4 border-t border-gray-200 space-y-3">
            <div>
              <Label className="text-sm font-semibold mb-2 block text-gray-700">
                スポット名<span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                placeholder="例: 秘密の絶景ポイント、お気に入りのカフェ"
                className="h-12 text-base rounded-xl"
                value={spotName}
                onChange={(e) => setSpotName(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-1">
                ※地図上の店舗名を参考に、わかりやすい名前を入力してください
              </p>
            </div>
          </div>
          
          {/* フッター */}
          <div className="px-4 py-4 border-t border-gray-200 flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 text-base font-bold rounded-full border-2 border-gray-300"
            >
              キャンセル
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!spotName.trim()}
              className="flex-1 h-12 text-base font-bold rounded-full bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              保存
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function EditMapPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const mapId = params.id as string;
  const { toast } = useToast();
  const { showLoading, hideLoading } = useLoading();
  const { isLoaded, loadError } = useGoogleMapsApi();
  const { latitude, longitude } = useGeolocation();
  
  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const [mapNotFound, setMapNotFound] = useState(false);
  
  // フォーム管理
  const form = useForm<MapFormValues>({
    resolver: zodResolver(editMapSchema),
    defaultValues: {
      title: '',
      expiryOption: '30days',
    },
  });
  
  // ハッシュタグ管理
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const prevHashtagsLengthRef = useRef(0);
  
  // 複数場所の管理
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // 必須項目の入力チェック
  const isFormValid = () => {
    // タイトルが入力されているか
    const hasTitle = form.watch('title').trim().length > 0;
    
    // 少なくとも1つのスポットが完全に入力されているか
    // 🔥 storeIdがなくても緯度経度があればOK
    const hasValidLocation = locations.some(location => 
      location.storeName && 
      (location.storeId || (location.store_latitude && location.store_longitude)) && 
      location.content && 
      location.content.length >= 5 && 
      (location.existingImageUrls.length > 0 || location.imageFiles.length > 0)
    );
    
    return hasTitle && hasValidLocation;
  };
  
  // ログインチェック
  useEffect(() => {
    if (status !== "loading" && !session) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [session, status, router]);
  
  // 既存のマップデータを取得
  useEffect(() => {
    if (session?.user?.id && mapId) {
      fetchMapData();
    }
  }, [session, mapId]);
  
  const fetchMapData = async () => {
    try {
      setIsLoadingMap(true);
      
      // ユーザーのプロフィールIDを取得
      const { data: profile, error: profileError } = await supabase
        .from('app_profiles')
        .select('id')
        .eq('user_id', session?.user?.id)
        .single();
      
      if (profileError || !profile) {
        throw new Error("プロフィール情報が見つかりません");
      }
      
      // マップデータを取得
      const { data: mapData, error: mapError } = await supabase
        .from('maps')
        .select('*')
        .eq('id', mapId)
        .eq('app_profile_id', profile.id)
        .eq('is_deleted', false)
        .single();
      
      if (mapError || !mapData) {
        setMapNotFound(true);
        return;
      }
      
      // フォームに値をセット
      form.reset({
        title: mapData.title,
        expiryOption: mapData.expiry_option === '30d' ? '30days' : mapData.expiry_option === '90d' ? '90days' : 'unlimited',
      });
      
      // ハッシュタグを配列形式で設定
      if (mapData.hashtags && Array.isArray(mapData.hashtags)) {
        setHashtags(mapData.hashtags);
      }
      
      // locations配列をLocationData形式に変換
      const locationsArray = mapData.locations || [];
      const convertedLocations: LocationData[] = locationsArray.map((loc: any, index: number) => ({
        id: crypto.randomUUID(),
        storeName: loc.store_name || '',
        storeId: loc.store_id || '',
        store_latitude: loc.store_latitude,
        store_longitude: loc.store_longitude,
        content: loc.content || '',
        imageFiles: [],
        imagePreviewUrls: [],
        existingImageUrls: loc.image_urls || [],
        url: loc.url || '',
        order: loc.order !== undefined ? loc.order : index,
      }));
      
      setLocations(convertedLocations.length > 0 ? convertedLocations : [{
        id: crypto.randomUUID(),
        storeName: '',
        storeId: '',
        store_latitude: undefined,
        store_longitude: undefined,
        content: '',
        imageFiles: [],
        imagePreviewUrls: [],
        existingImageUrls: [],
        url: '',
        order: 0,
      }]);
      
    } catch (error: any) {
      console.error("マップデータ取得エラー:", error);
      toast({
        title: "⚠️ エラー",
        description: error.message || "マップデータの取得に失敗しました",
        duration: 3000,
      });
      setMapNotFound(true);
    } finally {
      setIsLoadingMap(false);
    }
  };
  
  // ハッシュタグ追加
  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, '');
    if (tag && !hashtags.includes(tag) && hashtags.length < 10) {
      setHashtags([...hashtags, tag]);
      setHashtagInput('');
    }
  };
  
  // ハッシュタグ削除
  const removeHashtag = (tagToRemove: string) => {
    setHashtags(hashtags.filter(tag => tag !== tagToRemove));
  };

  // ハッシュタグが追加されたら入力フォームをリセット
  useEffect(() => {
    if (hashtags.length > prevHashtagsLengthRef.current) {
      setHashtagInput('');
    }
    prevHashtagsLengthRef.current = hashtags.length;
  }, [hashtags.length]);
  
  // 場所を追加
  const addLocation = () => {
    setLocations([...locations, {
      id: crypto.randomUUID(),
      storeName: '',
      storeId: '',
      store_latitude: undefined,
      store_longitude: undefined,
      content: '',
      imageFiles: [],
      imagePreviewUrls: [],
      existingImageUrls: [],
      url: '',
      order: locations.length,
    }]);
    setCurrentLocationIndex(locations.length);
  };
  
  // 場所を削除
  const removeLocation = (index: number) => {
    if (locations.length === 1) {
      toast({
        title: "⚠️ 削除できません",
        description: "最低1つのスポットが必要です",
        duration: 2000,
      });
      return;
    }
    
    const newLocations = locations.filter((_, i) => i !== index);
    setLocations(newLocations);
    
    if (currentLocationIndex >= newLocations.length) {
      setCurrentLocationIndex(newLocations.length - 1);
    }
  };

  // 場所の順番を入れ替え
  const moveLocation = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === locations.length - 1) return;
    
    const newLocations = [...locations];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // 配列の要素を入れ替え
    [newLocations[index], newLocations[targetIndex]] = [newLocations[targetIndex], newLocations[index]];
    
    setLocations(newLocations);
    
    // 現在選択中のインデックスも更新
    if (currentLocationIndex === index) {
      setCurrentLocationIndex(targetIndex);
    } else if (currentLocationIndex === targetIndex) {
      setCurrentLocationIndex(index);
    }
  };
  
  // 場所の情報を更新
  const updateLocation = (index: number, field: keyof LocationData, value: any) => {
    const newLocations = [...locations];
    (newLocations[index][field] as any) = value;
    setLocations(newLocations);
  };
  
  // 既存の画像を削除
  const removeExistingImage = (locationIndex: number, imageIndex: number) => {
    const location = locations[locationIndex];
    const newExistingImages = location.existingImageUrls.filter((_, i) => i !== imageIndex);
    updateLocation(locationIndex, 'existingImageUrls', newExistingImages);
  };
  
  // 画像アップロード処理
  const handleImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const location = locations[index];
    const totalImages = location.existingImageUrls.length + location.imageFiles.length + files.length;
    
    if (totalImages > 3) {
      toast({
        title: "⚠️ 画像枚数の上限を超えています",
        description: "各スポットに最大3枚まで画像を追加できます",
        duration: 3000,
      });
      return;
    }
    
    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    for (const file of files) {
      if (file.size > maxSize) {
        toast({
          title: "⚠️ ファイルサイズが大きすぎます",
          description: "各画像は5MB以下にしてください",
          duration: 3000,
        });
        return;
      }
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "⚠️ サポートされていないファイル形式です",
          description: "JPG、PNG、またはWEBP形式の画像を選択してください",
          duration: 3000,
        });
        return;
      }
    }
    
    // プレビューURL生成
    const newPreviewUrls: string[] = [];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviewUrls.push(reader.result as string);
        if (newPreviewUrls.length === files.length) {
          updateLocation(index, 'imageFiles', [...location.imageFiles, ...files]);
          updateLocation(index, 'imagePreviewUrls', [...location.imagePreviewUrls, ...newPreviewUrls]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    toast({
      title: "✅ 画像を追加しました",
      description: `${files.length}枚の画像が追加されました`,
      duration: 1000,
    });
  };
  
  // 新規画像削除
  const removeImage = (locationIndex: number, imageIndex: number) => {
    const location = locations[locationIndex];
    const newImageFiles = location.imageFiles.filter((_, i) => i !== imageIndex);
    const newPreviewUrls = location.imagePreviewUrls.filter((_, i) => i !== imageIndex);
    
    if (location.imagePreviewUrls[imageIndex].startsWith('blob:')) {
      URL.revokeObjectURL(location.imagePreviewUrls[imageIndex]);
    }
    
    updateLocation(locationIndex, 'imageFiles', newImageFiles);
    updateLocation(locationIndex, 'imagePreviewUrls', newPreviewUrls);
  };
  
  // 更新処理
  const handleSubmit = async (values: MapFormValues) => {
    if (!session?.user?.id) return;
    
    // バリデーション
    for (let i = 0; i < locations.length; i++) {
      const location = locations[i];
      
      // 🔥 storeIdがなくても緯度経度があればOK
      if (!location.storeName || (!location.storeId && (!location.store_latitude || !location.store_longitude))) {
        setSubmitError(`スポット${toCircledNumber(i + 1)}: スポットを選択または位置を指定してください`);
        setCurrentLocationIndex(i);
        return;
      }
      
      if (!location.content || location.content.length < 5) {
        setSubmitError(`スポット${toCircledNumber(i + 1)}: 説明を5文字以上入力してください`);
        setCurrentLocationIndex(i);
        return;
      }
      
      if (location.existingImageUrls.length + location.imageFiles.length === 0) {
        setSubmitError(`スポット${toCircledNumber(i + 1)}: 画像を最低1枚アップロードしてください`);
        setCurrentLocationIndex(i);
        return;
      }
    }
    
    setSubmitError(null);
    showLoading();
    setIsSubmitting(true);
    
    try {
      // プロフィールID取得
      const { data: userProfile, error: profileError } = await supabase
        .from('app_profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single();
      
      if (profileError || !userProfile) {
        throw new Error("投稿者のプロフィール情報が見つかりません");
      }
      
      // 掲載期限を計算
      const expiresAt = values.expiryOption === '30days' 
        ? calculateExpiresAt('days', undefined, 30)
        : values.expiryOption === '90days'
        ? calculateExpiresAt('90d')
        : (() => {
            const farFuture = new Date();
            farFuture.setFullYear(2099, 11, 31);
            return farFuture;
          })();
      
      const hashtagsToSave = hashtags.length > 0 ? hashtags : null;
      
      // 各場所の画像をアップロードして、locations配列を構築
      const locationsData = [];
      
      for (let i = 0; i < locations.length; i++) {
        const location = locations[i];
        
        // 既存の画像URLを保持
        const imageUrls: string[] = [...location.existingImageUrls];
        
        // 新規画像をアップロード
        for (let j = 0; j < location.imageFiles.length; j++) {
          const file = location.imageFiles[j];
          const fileExt = file.name.split('.').pop();
          const userFolder = session.user.id;
          const uniqueFileName = `${uuidv4()}_${j}.${fileExt}`;
          const objectPath = `${userFolder}/${uniqueFileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(objectPath, file, {
              cacheControl: '3600',
              upsert: true,
            });
          
          if (uploadError) {
            throw new Error(`画像のアップロードに失敗しました: ${uploadError.message}`);
          }
          
          const { data: publicUrlData } = supabase.storage
            .from('images')
            .getPublicUrl(objectPath);
          
          if (publicUrlData?.publicUrl) {
            imageUrls.push(publicUrlData.publicUrl);
          }
        }
        
        // 場所データを配列に追加
        locationsData.push({
          order: i,
          store_id: location.storeId || null, // 🔥 storeIdがない場合はnull
          store_name: location.storeName,
          store_latitude: location.store_latitude,
          store_longitude: location.store_longitude,
          content: location.content,
          image_urls: imageUrls,
          url: location.url && location.url.trim() !== '' ? location.url : null,
        });
      }
      
      // mapsテーブルを更新
      const { error: mapError } = await supabase
        .from('maps')
        .update({
          title: values.title,
          locations: locationsData,
          hashtags: hashtagsToSave,
          expires_at: expiresAt.toISOString(),
          expiry_option: values.expiryOption === '30days' ? '30d' : values.expiryOption === '90days' ? '90d' : 'unlimited',
          updated_at: new Date().toISOString(),
        })
        .eq('id', mapId);
      
      if (mapError) {
        throw new Error(`マップの更新に失敗しました: ${mapError.message}`);
      }
      
      toast({
        title: "✅ 更新完了！",
        description: `「${values.title}」を更新しました`,
        duration: 3000,
      });
      
      router.push('/my-maps');
      
    } catch (error: any) {
      console.error("マップ更新エラー:", error);
      setSubmitError(error.message || "マップ更新中にエラーが発生しました");
    } finally {
      setIsSubmitting(false);
      hideLoading();
    }
  };
  
  if (status === "loading" || isLoadingMap) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!session || mapNotFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">マップが見つかりません</h2>
        <Button onClick={() => router.push('/my-maps')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          マイマップに戻る
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto max-w-3xl px-4 py-4 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* 基本情報 */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4 shadow-sm">
              {/* タイトル */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">
                      Mapのタイトル<span className="text-destructive ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="例: 温泉巡りマップ"
                        className="text-base h-12"
                        maxLength={100}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* ハッシュタグ */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center">
                  <Tag className="mr-2 h-4 w-4" />
                  ハッシュタグ
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="タグを入力"
                    className="flex-1 h-12 text-base"
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addHashtag();
                      }
                    }}
                    maxLength={30}
                  />
                  <Button
                    type="button"
                    onClick={addHashtag}
                    className="h-12 w-12 p-0 bg-[#73370c] hover:bg-[#8b4513]"
                    disabled={!hashtagInput.trim()}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                {hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {hashtags.map((tag, index) => (
                      <motion.span
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#fef3e8] text-[#73370c] rounded-full text-sm font-medium"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => removeHashtag(tag)}
                          className="ml-1 hover:bg-[#73370c]/10 rounded-full p-0.5"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </motion.span>
                    ))}
                  </div>
                )}
              </div>
              
              {/* 掲載期間 */}
              <FormField
                control={form.control}
                name="expiryOption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold flex items-center">
                      <ClockIcon className="mr-2 h-4 w-4" />
                      掲載期間<span className="text-destructive ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-12 text-base">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30days">30日間</SelectItem>
                          <SelectItem value="90days">90日間</SelectItem>
                          <SelectItem value="unlimited">無期限</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* スポットリスト */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#73370c] flex items-center">
                  <MapIcon className="mr-2 h-5 w-5" />
                  スポットの追加
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLocation}
                  className="flex items-center gap-1.5 h-9 text-sm border-[#73370c] text-[#73370c] hover:bg-[#fef3e8]"
                >
                  <Plus className="h-4 w-4" />
                  追加
                </Button>
              </div>
              
              {/* 現在選択されているスポットのフォーム */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentLocationIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-xl border border-gray-200 p-4 space-y-4 shadow-sm"
                >
                  <LocationForm
                    location={locations[currentLocationIndex]}
                    locationIndex={currentLocationIndex}
                    updateLocation={updateLocation}
                    handleImageUpload={handleImageUpload}
                    removeImage={removeImage}
                    removeExistingImage={removeExistingImage}
                    isLoaded={isLoaded}
                    loadError={loadError}
                    userLatitude={latitude}
                    userLongitude={longitude}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
            
            {/* エラーメッセージ */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800">{submitError}</p>
              </div>
            )}

            {/* スポット一覧（ライトカラー） */}
            {locations.some(loc => loc.storeName) && (
              <div className="bg-[#fef3e8] rounded-xl border border-[#e8d5c4] p-4 shadow-sm">
                <h3 className="text-base font-bold mb-3 flex items-center text-[#73370c]">
                  <MapPin className="mr-2 h-5 w-5" />
                  スポット一覧
                </h3>
                <div className="space-y-2">
                  {locations.map((location, index) => (
                    <motion.div
                      key={location.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 rounded-lg bg-white border border-[#e8d5c4] hover:border-[#73370c] transition-colors cursor-pointer"
                      onClick={() => setCurrentLocationIndex(index)}
                    >
                      {/* 順番表示 */}
                      <span className="text-base font-bold min-w-[32px] text-[#73370c]">
                        {toCircledNumber(index + 1)}
                      </span>
                      
                      {/* スポット名（フルネーム） */}
                      <span className="flex-1 text-base font-medium text-gray-700">
                        {location.storeName || `スポット${index + 1}`}
                      </span>
                      
                      {/* 順番入れ替えと削除ボタン */}
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {/* 順番入れ替えボタン */}
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 hover:bg-[#fef3e8]"
                            onClick={() => moveLocation(index, 'up')}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-4 w-4 text-[#73370c]" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 hover:bg-[#fef3e8]"
                            onClick={() => moveLocation(index, 'down')}
                            disabled={index === locations.length - 1}
                          >
                            <ChevronDown className="h-4 w-4 text-[#73370c]" />
                          </Button>
                        </div>
                        
                        {/* 削除ボタン */}
                        {locations.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-0 hover:bg-red-50"
                            onClick={() => removeLocation(index)}
                          >
                            <Trash2 className="h-5 w-5 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 更新ボタン */}
            <div className="space-y-2">
              <Button
                type="submit"
                disabled={isSubmitting || !isFormValid()}
                className="w-full h-14 text-lg font-bold rounded-xl shadow-lg bg-[#73370c] hover:bg-[#8b4513] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    更新中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    マップを更新する
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                <span className="text-red-600">※は必須項目です</span>
              </p>
              
              {/* 戻るボタン */}
              <Button
                type="button"
                onClick={() => router.push('/my-maps')}
                className="w-full h-12 text-base font-semibold rounded-xl shadow-md bg-gray-200 hover:bg-gray-300 text-gray-700"
              >
                戻る
              </Button>
            </div>
          </form>
        </Form>
      </motion.div>
    </div>
  );
}

// スポット入力フォームコンポーネント
interface LocationFormProps {
  location: LocationData;
  locationIndex: number;
  updateLocation: (index: number, field: keyof LocationData, value: any) => void;
  handleImageUpload: (index: number, e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  removeImage: (locationIndex: number, imageIndex: number) => void;
  removeExistingImage: (locationIndex: number, imageIndex: number) => void;
  isLoaded: boolean;
  loadError: Error | null;
  userLatitude?: number | null;
  userLongitude?: number | null;
}

function LocationForm({
  location,
  locationIndex,
  updateLocation,
  handleImageUpload,
  removeImage,
  removeExistingImage,
  isLoaded,
  loadError,
  userLatitude,
  userLongitude,
}: LocationFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [locationStatus, setLocationStatus] = useState<'none' | 'getting' | 'success' | 'error'>('none');
  const [isMarkerModalOpen, setIsMarkerModalOpen] = useState(false);
  
  // 画像クロップ関連
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropImageFile, setCropImageFile] = useState<File | null>(null);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [pendingImageIndex, setPendingImageIndex] = useState<number | null>(null);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  
  useEffect(() => {
    if (!isLoaded || !inputRef.current || loadError) return;
    
    const options: google.maps.places.AutocompleteOptions = {
      componentRestrictions: { country: 'jp' },
      fields: ['place_id', 'name', 'geometry'],
      types: ['establishment']
    };
    
    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, options);
    
    if (userLatitude && userLongitude) {
      const bounds = new window.google.maps.LatLngBounds();
      const offset = 0.45;
      bounds.extend(new window.google.maps.LatLng(userLatitude + offset, userLongitude + offset));
      bounds.extend(new window.google.maps.LatLng(userLatitude - offset, userLongitude - offset));
      autocomplete.setBounds(bounds);
    }
    
    const listener = autocomplete.addListener('place_changed', () => {
      setLocationStatus('getting');
      const place = autocomplete.getPlace();
      
      if (!place || !place.geometry || !place.geometry.location) {
        setLocationStatus('error');
        return;
      }
      
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const placeName = place.name || '';
      
      updateLocation(locationIndex, 'storeId', place.place_id || '');
      updateLocation(locationIndex, 'storeName', placeName);
      updateLocation(locationIndex, 'store_latitude', lat);
      updateLocation(locationIndex, 'store_longitude', lng);
      
      setLocationStatus('success');
    });
    
    return () => {
      if (listener) {
        window.google.maps.event.removeListener(listener);
      }
    };
  }, [isLoaded, loadError, locationIndex, updateLocation, userLatitude, userLongitude]);
  
  // マーカーで位置を保存
  const handleMarkerSave = (lat: number, lng: number, spotName: string) => {
    updateLocation(locationIndex, 'store_latitude', lat);
    updateLocation(locationIndex, 'store_longitude', lng);
    updateLocation(locationIndex, 'storeName', spotName);
    setLocationStatus('success');
  };
  
  // 画像選択時にクロップモーダルを開く
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const totalImages = location.existingImageUrls.length + location.imageFiles.length;
    if (totalImages >= 3) {
      alert('各スポットに最大3枚まで画像を追加できます');
      return;
    }
    
    const file = files[0];
    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    if (file.size > maxSize) {
      alert('各画像は5MB以下にしてください');
      return;
    }
    
    if (!allowedTypes.includes(file.type)) {
      alert('JPG、PNG、またはWEBP形式の画像を選択してください');
      return;
    }
    
    setCropImageFile(file);
    setCropImageUrl(null);
    setIsEditingExisting(false);
    setIsCropModalOpen(true);
    
    // ファイル入力をリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // クロップ後の画像を保存（新規）
  const handleCropSave = (croppedFile: File, previewUrl: string) => {
    if (isEditingExisting && pendingImageIndex !== null) {
      // 既存画像の編集 → 既存画像を削除して新規として追加
      const newExistingImages = location.existingImageUrls.filter((_, i) => i !== pendingImageIndex);
      updateLocation(locationIndex, 'existingImageUrls', newExistingImages);
      updateLocation(locationIndex, 'imageFiles', [...location.imageFiles, croppedFile]);
      updateLocation(locationIndex, 'imagePreviewUrls', [...location.imagePreviewUrls, previewUrl]);
    } else if (pendingImageIndex !== null) {
      // 新規画像の編集
      const newFiles = [...location.imageFiles];
      const newUrls = [...location.imagePreviewUrls];
      newFiles[pendingImageIndex] = croppedFile;
      newUrls[pendingImageIndex] = previewUrl;
      updateLocation(locationIndex, 'imageFiles', newFiles);
      updateLocation(locationIndex, 'imagePreviewUrls', newUrls);
    } else {
      // 新規画像の追加
      updateLocation(locationIndex, 'imageFiles', [...location.imageFiles, croppedFile]);
      updateLocation(locationIndex, 'imagePreviewUrls', [...location.imagePreviewUrls, previewUrl]);
    }
    
    setCropImageFile(null);
    setCropImageUrl(null);
    setPendingImageIndex(null);
    setIsEditingExisting(false);
  };
  
  // 既存画像の編集
  const handleEditExistingImage = (imageIndex: number) => {
    const url = location.existingImageUrls[imageIndex];
    setPendingImageIndex(imageIndex);
    setCropImageUrl(url);
    setCropImageFile(null);
    setIsEditingExisting(true);
    setIsCropModalOpen(true);
  };
  
  // 新規画像の編集
  const handleEditNewImage = (imageIndex: number) => {
    const file = location.imageFiles[imageIndex];
    if (file) {
      setPendingImageIndex(imageIndex);
      setCropImageFile(file);
      setCropImageUrl(null);
      setIsEditingExisting(false);
      setIsCropModalOpen(true);
    }
  };
  
  return (
    <div className="space-y-4">
      {/* スポット検索 */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">
          <MapPin className="inline-block mr-1.5 h-4 w-4" />
          スポットを検索<span className="text-destructive ml-1">*</span>
        </Label>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="店舗名や施設名で検索..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#73370c] focus:border-transparent text-base"
            defaultValue={location.storeName}
          />
          <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        </div>
        {locationStatus === 'success' && (
          <div className="mt-1.5 flex items-center text-xs text-green-600">
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            位置情報を取得しました
          </div>
        )}
        
        {/* 🔥 マーカーで位置を指定するボタン */}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setIsMarkerModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded-xl transition-colors"
          >
            <Navigation className="h-5 w-5" />
            <span className="font-semibold">マーカー(ピン)で位置を指定する</span>
          </button>
          <p className="text-xs text-gray-500 mt-1.5 text-center">
            ※マップ上で直接位置を指定できます
          </p>
        </div>
      </div>
      
      {/* スポット説明 */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">
          スポット説明<span className="text-destructive ml-1">*</span>
        </Label>
        <Textarea
          placeholder="このスポットについて説明してください（5文字以上）"
          className="resize-none text-base rounded-xl min-h-[180px]"
          maxLength={800}
          value={location.content}
          onChange={(e) => updateLocation(locationIndex, 'content', e.target.value)}
        />
        <div className="text-xs text-right text-gray-400 mt-1">
          {location.content.length}/800
        </div>
      </div>
      
      {/* 画像アップロード */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">
          <ImageIcon className="inline-block mr-1.5 h-4 w-4" />
          画像（最大3枚）<span className="text-destructive ml-1">*</span>
        </Label>
        <p className="text-xs text-gray-500 mb-2">
          ※画像は16:10の比率で表示されます。アップロード後に調整できます。
        </p>
        
        {/* 既存の画像 */}
        {location.existingImageUrls.length > 0 && (
          <div className="mb-3 grid grid-cols-3 gap-2">
            {location.existingImageUrls.map((url, imgIndex) => (
              <div key={`existing-${imgIndex}`} className="relative group" style={{ aspectRatio: '16/10' }}>
                <img
                  src={url}
                  alt={`Existing ${imgIndex + 1}`}
                  className="w-full h-full object-cover rounded-lg border border-gray-200"
                />
                {/* 編集ボタン */}
                <button
                  type="button"
                  onClick={() => handleEditExistingImage(imgIndex)}
                  className="absolute bottom-1 left-1 bg-white/90 hover:bg-white text-gray-700 rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Crop className="h-3.5 w-3.5" />
                </button>
                {/* 削除ボタン */}
                <button
                  type="button"
                  onClick={() => removeExistingImage(locationIndex, imgIndex)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 shadow-md"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* 新規画像のプレビュー */}
        {location.imagePreviewUrls.length > 0 && (
          <div className="mb-3 grid grid-cols-3 gap-2">
            {location.imagePreviewUrls.map((url, imgIndex) => (
              <div key={`new-${imgIndex}`} className="relative group" style={{ aspectRatio: '16/10' }}>
                <img
                  src={url}
                  alt={`Preview ${imgIndex + 1}`}
                  className="w-full h-full object-cover rounded-lg border border-gray-200"
                />
                {/* 編集ボタン */}
                <button
                  type="button"
                  onClick={() => handleEditNewImage(imgIndex)}
                  className="absolute bottom-1 left-1 bg-white/90 hover:bg-white text-gray-700 rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Crop className="h-3.5 w-3.5" />
                </button>
                {/* 削除ボタン */}
                <button
                  type="button"
                  onClick={() => removeImage(locationIndex, imgIndex)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 shadow-md"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* アップロードボタン */}
        {(location.existingImageUrls.length + location.imageFiles.length) < 3 && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              id={`image-upload-${locationIndex}`}
            />
            <label
              htmlFor={`image-upload-${locationIndex}`}
              className="cursor-pointer flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#73370c] hover:bg-[#fef3e8]/50 transition-colors"
            >
              <div className="text-center">
                <Upload className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">タップして画像を選択</p>
                <p className="text-xs text-gray-400">JPG, PNG, WEBP（各5MB以下）</p>
              </div>
            </label>
          </>
        )}
      </div>
      
      {/* リンク */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">
          <LinkIcon className="inline-block mr-1.5 h-4 w-4" />
          リンク（任意）
        </Label>
        <Input
          placeholder="https://example.com"
          className="h-12 text-base rounded-xl"
          value={location.url}
          onChange={(e) => updateLocation(locationIndex, 'url', e.target.value)}
        />
      </div>
      
      {/* 🔥 マーカー位置選択モーダル */}
      <MarkerLocationModal
        isOpen={isMarkerModalOpen}
        onClose={() => setIsMarkerModalOpen(false)}
        onSave={handleMarkerSave}
        initialLat={location.store_latitude || userLatitude || undefined}
        initialLng={location.store_longitude || userLongitude || undefined}
        initialSpotName={location.storeName}
        isLoaded={isLoaded}
      />
      
      {/* 🔥 画像クロップモーダル */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        onClose={() => {
          setIsCropModalOpen(false);
          setCropImageFile(null);
          setCropImageUrl(null);
          setPendingImageIndex(null);
          setIsEditingExisting(false);
        }}
        onSave={handleCropSave}
        imageFile={cropImageFile}
        imageUrl={cropImageUrl}
      />
    </div>
  );
}