"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Trash2, Camera, Navigation, Loader2, Map as MapIcon, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabaseClient';
import { designTokens } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';
import { useGoogleMapsApi } from '@/components/providers/GoogleMapsApiProvider';

interface FacilityReportFormProps {
  latitude: number;
  longitude: number;
  map: google.maps.Map;
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

type LocationMode = 'initial' | 'current_location' | 'map_marker';

export function FacilityReportForm({ latitude, longitude, map: _parentMap, onClose, onSuccess }: FacilityReportFormProps) {
  const { data: session } = useSession();
  const { isLoaded: googleMapsLoaded } = useGoogleMapsApi();
  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markerPosition, setMarkerPosition] = useState({ lat: latitude, lng: longitude });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationMode, setLocationMode] = useState<LocationMode>('initial');
  const [locationSet, setLocationSet] = useState(false);
  const miniMapContainerRef = useRef<HTMLDivElement | null>(null);
  const miniMapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const miniMapInitializedRef = useRef(false);

  // Initialize mini-map when switching to map_marker mode
  useEffect(() => {
    if (locationMode !== 'map_marker') return;
    if (!miniMapContainerRef.current || !googleMapsLoaded || !window.google?.maps?.Map) return;
    if (miniMapInitializedRef.current) return;
    miniMapInitializedRef.current = true;

    const miniMap = new window.google.maps.Map(miniMapContainerRef.current, {
      center: { lat: markerPosition.lat, lng: markerPosition.lng },
      zoom: 17,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy',
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
    });

    const marker = new window.google.maps.Marker({
      position: { lat: markerPosition.lat, lng: markerPosition.lng },
      map: miniMap,
      draggable: true,
      title: 'ゴミ箱の位置をドラッグで調整',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="#6B7280" stroke="#ffffff" stroke-width="3"/>
          <path d="M14 16h12M17 16V14h6v2M15 16l1 10h8l1-10" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" transform="translate(2,2)"/>
        </svg>`),
        scaledSize: new window.google.maps.Size(40, 40),
        anchor: new window.google.maps.Point(20, 20),
      },
      zIndex: 10000,
      animation: window.google.maps.Animation.DROP,
    });

    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      if (pos) {
        setMarkerPosition({ lat: pos.lat(), lng: pos.lng() });
        setLocationSet(true);
      }
    });

    miniMapRef.current = miniMap;
    markerRef.current = marker;

    return () => {
      marker.setMap(null);
      markerRef.current = null;
      miniMapRef.current = null;
      miniMapInitializedRef.current = false;
    };
  }, [locationMode, googleMapsLoaded]);

  // Update marker position on mini-map
  const updateMarkerOnMap = useCallback((lat: number, lng: number) => {
    const pos = new window.google.maps.LatLng(lat, lng);
    if (markerRef.current) {
      markerRef.current.setPosition(pos);
    }
    if (miniMapRef.current) {
      miniMapRef.current.panTo(pos);
      miniMapRef.current.setZoom(17);
    }
  }, []);

  const handleUseCurrentLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('お使いのブラウザは位置情報に対応していません。');
      return;
    }

    setGettingLocation(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMarkerPosition({ lat, lng });
        setLocationSet(true);
        setLocationMode('current_location');
        setGettingLocation(false);
      },
      () => {
        setError('現在地の取得に失敗しました。位置情報の許可を確認してください。');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const handleSwitchToMapMarker = useCallback(() => {
    setLocationMode('map_marker');
    setLocationSet(true);
  }, []);

  // When switching to map mode and already have current location, update marker
  useEffect(() => {
    if (locationMode === 'map_marker' && miniMapRef.current && markerRef.current) {
      updateMarkerOnMap(markerPosition.lat, markerPosition.lng);
    }
  }, [locationMode, markerPosition.lat, markerPosition.lng, updateMarkerOnMap]);

  // Clean up image preview URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError('画像は10MB以下にしてください。');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください。');
      return;
    }

    setError(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImageToStorage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const uniqueFileName = `facility_${uuidv4()}.${fileExt}`;
    const objectPath = `facility-reports/${uniqueFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(objectPath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      throw new Error('画像のアップロードに失敗しました: ' + uploadError.message);
    }

    const { data: publicUrlData } = supabase.storage
      .from('images')
      .getPublicUrl(objectPath);

    if (!publicUrlData?.publicUrl) {
      throw new Error('画像URLの取得に失敗しました');
    }

    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      setError('名前を入力してください。');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let imageUrls: string[] | undefined;

      if (imageFile) {
        setUploading(true);
        try {
          const url = await uploadImageToStorage(imageFile);
          imageUrls = [url];
        } catch (uploadErr: any) {
          setError(uploadErr.message || '画像のアップロードに失敗しました。');
          setSubmitting(false);
          setUploading(false);
          return;
        }
        setUploading(false);
      }

      const res = await fetch('/api/facility-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityType: 'trash_can',
          storeName: storeName.trim(),
          description: description.trim() || undefined,
          storeLatitude: markerPosition.lat,
          storeLongitude: markerPosition.lng,
          imageUrls,
          userId: session?.user?.id || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '投稿に失敗しました。');
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError('通信エラーが発生しました。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[85vh] overflow-y-auto"
        style={{
          background: designTokens.colors.background.white,
          boxShadow: designTokens.elevation.high,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5 border-b"
          style={{ borderColor: `${designTokens.colors.secondary.stone}30` }}
        >
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" style={{ color: '#6B7280' }} />
            <h3
              className="text-lg font-semibold"
              style={{ fontFamily: designTokens.typography.display, color: designTokens.colors.text.primary }}
            >
              ゴミ箱を報告
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5" style={{ color: designTokens.colors.text.muted }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Location section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 flex-shrink-0" style={{ color: designTokens.colors.functional.error }} />
              <span className="text-sm font-medium" style={{ color: designTokens.colors.text.secondary }}>位置情報</span>
            </div>

            {/* Current location set confirmation */}
            <AnimatePresence mode="wait">
              {locationMode === 'current_location' && locationSet && (
                <motion.div
                  key="location-set"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 p-3 rounded-xl mb-3"
                  style={{ background: '#10B98115', border: '1px solid #10B98140' }}
                >
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: '#10B981' }} />
                  <span className="text-sm font-medium" style={{ color: '#10B981' }}>
                    現在地が設定されました
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* "現在地を指定" button - always visible and prominent */}
            <Button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={gettingLocation}
              className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mb-2"
              style={{
                background: locationMode === 'current_location' ? `${designTokens.colors.accent.lilac}15` : designTokens.colors.accent.lilac,
                color: locationMode === 'current_location' ? designTokens.colors.accent.lilac : designTokens.colors.text.inverse,
                border: locationMode === 'current_location' ? `1px solid ${designTokens.colors.accent.lilac}40` : 'none',
              }}
            >
              {gettingLocation ? (
                <><Loader2 className="h-4 w-4 animate-spin" />現在地を取得中...</>
              ) : locationMode === 'current_location' ? (
                <><Navigation className="h-4 w-4" />現在地を再取得</>
              ) : (
                <><Navigation className="h-4 w-4" />現在地を指定</>
              )}
            </Button>

            {/* "別の方法で設定" button */}
            {locationMode !== 'map_marker' && (
              <button
                type="button"
                onClick={handleSwitchToMapMarker}
                className="w-full text-center py-2 text-xs font-medium transition-colors hover:underline"
                style={{ color: designTokens.colors.text.muted }}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <MapIcon className="h-3.5 w-3.5" />
                  別の方法で設定（マップ上で指定）
                </span>
              </button>
            )}

            {/* Mini-map for marker positioning (shown when "別の方法で設定" is clicked) */}
            <AnimatePresence>
              {locationMode === 'map_marker' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div
                    className="rounded-xl overflow-hidden border mt-2"
                    style={{ borderColor: `${designTokens.colors.secondary.stone}40` }}
                  >
                    <div
                      ref={miniMapContainerRef}
                      className="w-full"
                      style={{ height: '180px' }}
                    />
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: designTokens.colors.text.muted }}>
                    マーカーをドラッグして正確な位置を指定できます
                  </p>

                  {/* "現在地を指定" button inside map mode */}
                  <Button
                    type="button"
                    onClick={() => {
                      handleUseCurrentLocation();
                    }}
                    disabled={gettingLocation}
                    className="w-full h-9 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 mt-2"
                    style={{
                      background: `${designTokens.colors.accent.lilac}15`,
                      color: designTokens.colors.accent.lilac,
                      border: `1px solid ${designTokens.colors.accent.lilac}40`,
                    }}
                  >
                    {gettingLocation ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" />取得中...</>
                    ) : (
                      <><Navigation className="h-3.5 w-3.5" />現在地をマーカーに反映</>
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Location coordinates display */}
            {locationSet && (
              <p className="text-xs mt-1" style={{ color: designTokens.colors.text.muted }}>
                緯度: {markerPosition.lat.toFixed(6)}, 経度: {markerPosition.lng.toFixed(6)}
              </p>
            )}
          </div>

          {/* Name */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: designTokens.colors.text.secondary }}
            >
              名前・場所の説明 <span style={{ color: designTokens.colors.functional.error }}>*</span>
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              maxLength={100}
              placeholder="例: コンビニ前のゴミ箱、公園入口"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2"
              style={{
                background: designTokens.colors.background.mist,
                border: `1px solid ${designTokens.colors.secondary.stone}40`,
                color: designTokens.colors.text.primary,
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: designTokens.colors.text.secondary }}
            >
              詳細（任意）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="分別の種類やゴミ箱の特徴など"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2 resize-none"
              style={{
                background: designTokens.colors.background.mist,
                border: `1px solid ${designTokens.colors.secondary.stone}40`,
                color: designTokens.colors.text.primary,
              }}
            />
          </div>

          {/* Photo upload */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: designTokens.colors.text.secondary }}
            >
              写真（任意・10MBまで）
            </label>
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden" style={{ maxHeight: '200px' }}>
                <img
                  src={imagePreview}
                  alt="プレビュー"
                  className="w-full object-cover rounded-xl"
                  style={{ maxHeight: '200px' }}
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-sm"
                  style={{ background: 'rgba(0,0,0,0.5)' }}
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-6 rounded-xl border-2 border-dashed flex flex-col items-center gap-2 transition-colors hover:bg-gray-50"
                style={{
                  borderColor: `${designTokens.colors.secondary.stone}40`,
                  color: designTokens.colors.text.muted,
                }}
              >
                <Camera className="h-8 w-8" />
                <span className="text-sm">タップして写真を選択</span>
                <span className="text-xs">JPG, PNG（10MBまで）</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {error && (
            <p className="text-sm font-medium" style={{ color: designTokens.colors.functional.error }}>
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting || !storeName.trim()}
            className="w-full h-12 rounded-xl font-semibold"
            style={{
              background: storeName.trim() ? '#6B7280' : designTokens.colors.secondary.stone,
              color: designTokens.colors.text.inverse,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {uploading ? '画像をアップロード中...' : submitting ? '送信中...' : 'ゴミ箱の場所を報告する'}
          </Button>

          <p className="text-xs text-center" style={{ color: designTokens.colors.text.muted }}>
            ログイン不要で報告できます
          </p>
        </form>
      </motion.div>
    </motion.div>
  );
}
