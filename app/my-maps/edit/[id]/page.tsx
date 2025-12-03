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
  MapIcon, CheckCircle, ChevronUp, ChevronDown, ArrowLeft
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
    const hasValidLocation = locations.some(location => 
      location.storeName && 
      location.storeId && 
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
      
      if (!location.storeName || !location.storeId) {
        setSubmitError(`スポット${toCircledNumber(i + 1)}: スポットを選択してください`);
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

            {/* スポットリスト */}
            {locations.some(loc => loc.storeName) && (
              <div style={{ backgroundColor: '#99623b' }} className="rounded-xl border border-amber-800 p-4 shadow-sm">
                <h3 className="text-base font-bold mb-3 flex items-center" style={{ color: '#fef3e7' }}>
                  <MapPin className="mr-2 h-5 w-5" />
                  スポット一覧
                </h3>
                <div className="space-y-2">
                  {locations.map((location, index) => (
                    <motion.div
                      key={location.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ backgroundColor: '#72370d' }}
                      className="flex items-center gap-2 p-3 rounded-lg border border-amber-800 hover:bg-amber-900 transition-colors cursor-pointer"
                      onClick={() => setCurrentLocationIndex(index)}
                    >
                      {/* 順番表示 */}
                      <span className="text-base font-bold min-w-[32px]" style={{ color: '#fef3e7' }}>
                        {toCircledNumber(index + 1)}
                      </span>
                      
                      {/* スポット名（フルネーム） */}
                      <span className="flex-1 text-base font-medium" style={{ color: '#fef3e7' }}>
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
                            className="h-6 w-6 p-0 hover:bg-amber-900"
                            onClick={() => moveLocation(index, 'up')}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-4 w-4" style={{ color: '#fef3e7' }} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 hover:bg-amber-900"
                            onClick={() => moveLocation(index, 'down')}
                            disabled={index === locations.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" style={{ color: '#fef3e7' }} />
                          </Button>
                        </div>
                        
                        {/* 削除ボタン */}
                        {locations.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-0 hover:bg-red-500 text-red-200"
                            onClick={() => removeLocation(index)}
                          >
                            <Trash2 className="h-5 w-5 text-red-200" />
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
        
        {/* 既存の画像 */}
        {location.existingImageUrls.length > 0 && (
          <div className="mb-3 grid grid-cols-3 gap-2">
            {location.existingImageUrls.map((url, imgIndex) => (
              <div key={`existing-${imgIndex}`} className="relative aspect-square group">
                <img
                  src={url}
                  alt={`Existing ${imgIndex + 1}`}
                  className="w-full h-full object-cover rounded-lg border border-gray-200"
                />
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
              <div key={`new-${imgIndex}`} className="relative aspect-square group">
                <img
                  src={url}
                  alt={`Preview ${imgIndex + 1}`}
                  className="w-full h-full object-cover rounded-lg border border-gray-200"
                />
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
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleImageUpload(locationIndex, e)}
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
    </div>
  );
}
