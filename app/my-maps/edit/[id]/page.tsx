"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { 
  Upload, X, MapPin, Plus, Trash2, 
  Loader2, Image as ImageIcon, Link as LinkIcon, Tag, ClockIcon,
  FileText, CheckCircle, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  hashtags: z.string().max(200).optional(),
  expiryOption: z.enum(['30days', '90days', 'unlimited']),
});

type MapFormValues = z.infer<typeof editMapSchema>;

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
      hashtags: '',
      expiryOption: '30days',
    },
  });
  
  // 複数場所の管理
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
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
        hashtags: mapData.hashtags ? mapData.hashtags.join(', ') : '',
        expiryOption: mapData.expiry_option === '30d' ? '30days' : mapData.expiry_option === '90d' ? '90days' : 'unlimited',
      });
      
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
        description: "最低1つの場所が必要です",
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
        description: "各場所に最大3枚まで画像を追加できます",
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
      
      if (!location.storeName || !location.storeId) {
        setSubmitError(`場所${i + 1}: 場所を選択してください`);
        setCurrentLocationIndex(i);
        return;
      }
      
      if (!location.content || location.content.length < 5) {
        setSubmitError(`場所${i + 1}: 説明を5文字以上入力してください`);
        setCurrentLocationIndex(i);
        return;
      }
      
      if (location.existingImageUrls.length + location.imageFiles.length === 0) {
        setSubmitError(`場所${i + 1}: 画像を最低1枚アップロードしてください`);
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
        ? calculateExpiresAt('30d')
        : values.expiryOption === '90days'
        ? calculateExpiresAt('90d')
        : (() => {
            const farFuture = new Date();
            farFuture.setFullYear(2099, 11, 31);
            return farFuture;
          })();
      
      const hashtags = values.hashtags 
        ? values.hashtags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : null;
      
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
          store_id: location.storeId,
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
          hashtags: hashtags,
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
    <div className="container mx-auto max-w-3xl p-4 md:p-8 pb-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* ヘッダー */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/my-maps')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            マイマップに戻る
          </Button>
          <h1 className="text-3xl font-bold text-[#73370c] mb-2">📝 マップを編集</h1>
          <p className="text-gray-600">マップの情報を更新できます</p>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            {/* タイトルとメタ情報 */}
            <div className="bg-white rounded-lg border-2 border-[#73370c]/20 p-6 space-y-6">
              <h2 className="text-xl font-bold text-[#73370c] flex items-center">
                <FileText className="mr-2 h-6 w-6" />
                基本情報
              </h2>
              
              {/* タイトル */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-semibold">
                      マップのタイトル<span className="text-destructive ml-1">※</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="例: 2025年冬の温泉巡り"
                        className="resize-none text-lg"
                        rows={2}
                        maxLength={100}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* ハッシュタグ */}
              <FormField
                control={form.control}
                name="hashtags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-semibold flex items-center">
                      <Tag className="mr-2 h-5 w-5" />
                      ハッシュタグ
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="カンマ区切りで入力（例: 温泉, 冬旅行, 癒し）"
                        className="resize-none"
                        rows={2}
                        maxLength={200}
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500">
                      💡 複数のハッシュタグを入力する場合は、カンマ（,）で区切ってください
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* 掲載期間 */}
              <FormField
                control={form.control}
                name="expiryOption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-semibold flex items-center">
                      <ClockIcon className="mr-2 h-5 w-5" />
                      掲載期間<span className="text-destructive ml-1">※</span>
                    </FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
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
            
            {/* 場所リスト */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#73370c] flex items-center">
                  <MapPin className="mr-2 h-6 w-6" />
                  場所 ({locations.length}箇所)
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addLocation}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  場所を追加
                </Button>
              </div>
              
              {/* 場所のタブ */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {locations.map((location, index) => (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => setCurrentLocationIndex(index)}
                    className={cn(
                      "flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-all",
                      currentLocationIndex === index
                        ? "bg-[#73370c] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    場所 {index + 1}
                    {location.storeName && (
                      <span className="ml-2 text-xs opacity-80">
                        ({location.storeName.slice(0, 10)}{location.storeName.length > 10 ? '...' : ''})
                      </span>
                    )}
                  </button>
                ))}
              </div>
              
              {/* 現在選択されている場所のフォーム */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentLocationIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-lg border-2 border-[#73370c]/20 p-6 space-y-6"
                >
                  {/* 場所の削除ボタン */}
                  {locations.length > 1 && (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLocation(currentLocationIndex)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        この場所を削除
                      </Button>
                    </div>
                  )}
                  
                  <LocationForm
                    location={locations[currentLocationIndex]}
                    locationIndex={currentLocationIndex}
                    updateLocation={updateLocation}
                    handleImageUpload={handleImageUpload}
                    removeImage={removeImage}
                    removeExistingImage={removeExistingImage}
                    isLoaded={isLoaded}
                    loadError={loadError}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
            
            {/* エラーメッセージ */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{submitError}</p>
              </div>
            )}
            
            {/* 更新ボタン */}
            <div className="sticky bottom-4 z-10">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full text-xl py-6 shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    更新中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-6 w-6" />
                    マップを更新する
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </motion.div>
    </div>
  );
}

// 場所入力フォームコンポーネント
interface LocationFormProps {
  location: LocationData;
  locationIndex: number;
  updateLocation: (index: number, field: keyof LocationData, value: any) => void;
  handleImageUpload: (index: number, e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  removeImage: (locationIndex: number, imageIndex: number) => void;
  removeExistingImage: (locationIndex: number, imageIndex: number) => void;
  isLoaded: boolean;
  loadError: Error | null;
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
}: LocationFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [locationStatus, setLocationStatus] = useState<'none' | 'getting' | 'success' | 'error'>('none');
  const { latitude, longitude } = useGeolocation();
  
  useEffect(() => {
    if (!isLoaded || !inputRef.current || loadError) return;
    
    const options: google.maps.places.AutocompleteOptions = {
      componentRestrictions: { country: 'jp' },
      fields: ['place_id', 'name', 'geometry'],
      types: ['establishment']
    };
    
    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, options);
    
    if (latitude && longitude) {
      const bounds = new window.google.maps.LatLngBounds();
      const offset = 0.45;
      bounds.extend(new window.google.maps.LatLng(latitude + offset, longitude + offset));
      bounds.extend(new window.google.maps.LatLng(latitude - offset, longitude - offset));
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
  }, [isLoaded, loadError, locationIndex, updateLocation, latitude, longitude]);
  
  return (
    <div className="space-y-6">
      {/* 場所検索 */}
      <div>
        <Label className="text-lg font-semibold mb-2 block">
          <MapPin className="inline-block mr-2 h-5 w-5" />
          場所を検索<span className="text-destructive ml-1">※</span>
        </Label>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="店舗名や施設名で検索..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#73370c] text-lg"
            defaultValue={location.storeName}
          />
          <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#73370c] pointer-events-none" />
        </div>
        {locationStatus === 'success' && (
          <div className="mt-2 flex items-center text-sm text-green-600">
            <CheckCircle className="h-4 w-4 mr-1" />
            位置情報を取得しました
          </div>
        )}
      </div>
      
      {/* 説明 */}
      <div>
        <Label className="text-lg font-semibold mb-2 block">
          説明<span className="text-destructive ml-1">※</span>
        </Label>
        <Textarea
          placeholder="この場所について説明してください（5文字以上）"
          className="resize-none text-lg"
          rows={4}
          maxLength={800}
          value={location.content}
          onChange={(e) => updateLocation(locationIndex, 'content', e.target.value)}
        />
        <div className="text-xs text-right text-gray-500 mt-1">
          {location.content.length}/800
        </div>
      </div>
      
      {/* 画像アップロード */}
      <div>
        <Label className="text-lg font-semibold mb-2 block">
          <ImageIcon className="inline-block mr-2 h-5 w-5" />
          画像（最大3枚）<span className="text-destructive ml-1">※</span>
        </Label>
        
        {/* 既存の画像 */}
        {location.existingImageUrls.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">既存の画像</p>
            <div className="grid grid-cols-3 gap-3">
              {location.existingImageUrls.map((url, imgIndex) => (
                <div key={`existing-${imgIndex}`} className="relative group">
                  <img
                    src={url}
                    alt={`Existing ${imgIndex + 1}`}
                    className="w-full h-32 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(locationIndex, imgIndex)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 新規画像のプレビュー */}
        {location.imagePreviewUrls.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">新しく追加する画像</p>
            <div className="grid grid-cols-3 gap-3">
              {location.imagePreviewUrls.map((url, imgIndex) => (
                <div key={`new-${imgIndex}`} className="relative group">
                  <img
                    src={url}
                    alt={`Preview ${imgIndex + 1}`}
                    className="w-full h-32 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(locationIndex, imgIndex)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* アップロードボタン */}
        {(location.existingImageUrls.length + location.imageFiles.length) < 3 && (
          <>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleImageUpload(locationIndex, e)}
              className="hidden"
              id={`image-upload-${locationIndex}`}
            />
            <label
              htmlFor={`image-upload-${locationIndex}`}
              className="cursor-pointer flex items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#73370c] hover:bg-[#fef3e8] transition-colors"
            >
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">クリックして画像を選択</p>
                <p className="text-xs text-gray-500">JPG, PNG, WEBP（各5MB以下）</p>
              </div>
            </label>
          </>
        )}
      </div>
      
      {/* リンク */}
      <div>
        <Label className="text-lg font-semibold mb-2 block">
          <LinkIcon className="inline-block mr-2 h-5 w-5" />
          リンク（任意）
        </Label>
        <Textarea
          placeholder="https://example.com"
          className="resize-none"
          rows={2}
          value={location.url}
          onChange={(e) => updateLocation(locationIndex, 'url', e.target.value)}
        />
      </div>
    </div>
  );
}

