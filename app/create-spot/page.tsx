"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Upload, X, MapPin, Loader2, Image as ImageIcon,
  Link as LinkIcon, CheckCircle, Navigation, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useSession } from "next-auth/react";
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/lib/hooks/use-toast';
import { useLoading } from '@/lib/contexts/loading-context';
import { useGoogleMapsApi } from '@/components/providers/GoogleMapsApiProvider';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { createSpot, type CreateSpotInput } from '@/app/_actions/spots';
import { MarkerLocationModal } from '@/components/map/marker-location-modal';
import { Breadcrumb } from '@/components/seo/breadcrumb';
import { designTokens, TARGET_TAGS } from '@/lib/constants';

const createSpotSchema = z.object({
  storeName: z.string().min(1, { message: 'スポット名は必須です' }).max(100, { message: '100文字以内で入力してください' }),
  description: z.string().min(5, { message: '説明は5文字以上入力してください' }).max(800, { message: '800文字以内で入力してください' }),
  url: z.string().url({ message: '有効なURLを入力してください' }).optional().or(z.literal('')),
});

type SpotFormValues = z.infer<typeof createSpotSchema>;

export default function CreateSpotPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const { showLoading, hideLoading } = useLoading();
  const { isLoaded, loadError } = useGoogleMapsApi();
  const { latitude, longitude } = useGeolocation();

  const form = useForm<SpotFormValues>({
    resolver: zodResolver(createSpotSchema),
    defaultValues: {
      storeName: '',
      description: '',
      url: '',
    },
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeLat, setStoreLat] = useState<number | undefined>(undefined);
  const [storeLng, setStoreLng] = useState<number | undefined>(undefined);
  const [locationStatus, setLocationStatus] = useState<'none' | 'getting' | 'success' | 'error'>('none');
  const [isMarkerModalOpen, setIsMarkerModalOpen] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // ログインチェック
  useEffect(() => {
    if (status !== "loading" && !session) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [session, status, router]);

  // Google Places Autocomplete
  useEffect(() => {
    if (!isLoaded || !inputRef.current || loadError) return;

    const options: google.maps.places.AutocompleteOptions = {
      componentRestrictions: { country: 'jp' },
      fields: ['place_id', 'name', 'geometry', 'address_components'],
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

      setStoreId(place.place_id || null);
      form.setValue('storeName', placeName);
      setStoreLat(lat);
      setStoreLng(lng);
      setLocationStatus('success');
    });

    return () => {
      if (listener) {
        window.google.maps.event.removeListener(listener);
      }
    };
  }, [isLoaded, loadError, latitude, longitude, form]);

  // マーカーで位置を保存
  const handleMarkerSave = (lat: number, lng: number, spotName: string) => {
    setStoreLat(lat);
    setStoreLng(lng);
    form.setValue('storeName', spotName);
    setLocationStatus('success');
  };

  // 画像アップロード処理
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (imageFiles.length + files.length > 3) {
      toast({
        title: "画像枚数の上限を超えています",
        description: "最大3枚まで画像を追加できます",
        duration: 3000,
      });
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    for (const file of files) {
      if (file.size > maxSize) {
        toast({
          title: "ファイルサイズが大きすぎます",
          description: "各画像は5MB以下にしてください",
          duration: 3000,
        });
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "サポートされていないファイル形式です",
          description: "JPG、PNG、またはWEBP形式の画像を選択してください",
          duration: 3000,
        });
        return;
      }
    }

    const readFilesAsDataURLs = async (): Promise<string[]> => {
      const promises = files.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      });
      return Promise.all(promises);
    };

    readFilesAsDataURLs().then(newPreviewUrls => {
      setImageFiles(prev => [...prev, ...files]);
      setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
    });
  }, [imageFiles.length, toast]);

  // 画像削除
  const removeImage = useCallback((imageIndex: number) => {
    const urlToRevoke = imagePreviewUrls[imageIndex];
    if (urlToRevoke && urlToRevoke.startsWith('blob:')) {
      URL.revokeObjectURL(urlToRevoke);
    }
    setImageFiles(prev => prev.filter((_, idx) => idx !== imageIndex));
    setImagePreviewUrls(prev => prev.filter((_, idx) => idx !== imageIndex));
  }, [imagePreviewUrls]);

  // 画像アップロード（Supabase Storage）
  const uploadImageToStorage = async (file: File, userId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExt}`;
    const objectPath = `${userId}/${uniqueFileName}`;

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

    if (!publicUrlData?.publicUrl) {
      throw new Error('画像URLの取得に失敗しました');
    }

    return publicUrlData.publicUrl;
  };

  // フォームバリデーション
  const isFormValid = () => {
    const storeName = form.watch('storeName');
    const description = form.watch('description');
    return (
      storeName.trim().length > 0 &&
      (storeId || (storeLat && storeLng)) &&
      description.length >= 5 &&
      imageFiles.length > 0
    );
  };

  // 投稿処理
  const handleSubmit = async (values: SpotFormValues) => {
    if (!session?.user?.id) return;

    if (!storeId && (!storeLat || !storeLng)) {
      setSubmitError('スポットを選択または位置を指定してください');
      return;
    }

    if (imageFiles.length === 0) {
      setSubmitError('画像を最低1枚アップロードしてください');
      return;
    }

    setSubmitError(null);
    showLoading();
    setIsSubmitting(true);

    try {
      const userId = session.user.id;

      // 画像アップロード
      const imageUrls: string[] = [];
      for (const file of imageFiles) {
        const url = await uploadImageToStorage(file, userId);
        imageUrls.push(url);
      }

      const spotInput: CreateSpotInput = {
        userId,
        storeName: values.storeName,
        description: values.description,
        storeLatitude: storeLat!,
        storeLongitude: storeLng!,
        storeId: storeId,
        imageUrls,
        url: values.url && values.url.trim() !== '' ? values.url : null,
        city: null,
        prefecture: '大分県',
        targetTags: selectedTags.length > 0 ? selectedTags : undefined,
      };

      const { spotId, error: createError } = await createSpot(spotInput);

      if (createError || !spotId) {
        throw new Error(createError || 'スポットの登録に失敗しました');
      }

      router.push('/create-spot/complete');
    } catch (error: any) {
      console.error("スポット登録エラー:", error);
      setSubmitError(error.message || "スポット登録中にエラーが発生しました");
    } finally {
      setIsSubmitting(false);
      hideLoading();
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-4 pb-8">
      <Breadcrumb className="mb-4" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: designTokens.colors.text.primary }}>
            スポットを登録する
          </h1>
          <p className="text-sm mt-2" style={{ color: designTokens.colors.text.secondary }}>
            あなたが見つけた大分の魅力的な場所を登録して、未来の名所を作りましょう。
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* スポット検索 */}
            <div className="bg-white rounded-xl border-2 border-border p-4 space-y-4 shadow-sm">
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
                    className="w-full px-4 py-3 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base"
                    defaultValue={form.watch('storeName')}
                  />
                  <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
                {locationStatus === 'success' && (
                  <div className="mt-1.5 flex items-center text-xs text-green-600">
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    位置情報を取得しました
                  </div>
                )}

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setIsMarkerModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded-xl transition-colors"
                  >
                    <Navigation className="h-5 w-5" />
                    <span className="font-semibold">マーカーピンで位置を指定する</span>
                  </button>
                  <p className="text-xs text-gray-500 mt-1.5 text-center">
                    ※マップ上で直接位置を指定できます
                  </p>
                </div>
              </div>

              {/* スポット名 */}
              <FormField
                control={form.control}
                name="storeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">
                      スポット名<span className="text-destructive ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="例: お気に入りのカフェ"
                        className="h-12 text-base rounded-xl"
                        maxLength={100}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* スポット説明 */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">
                      スポット説明<span className="text-destructive ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="このスポットの魅力を教えてください（5文字以上）"
                        className="resize-none text-base rounded-xl min-h-[180px]"
                        maxLength={800}
                        {...field}
                      />
                    </FormControl>
                    <div className="flex justify-between items-center">
                      <FormMessage />
                      <p className="text-xs text-gray-500">
                        {field.value?.length || 0}/800
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              {/* 画像アップロード */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">
                  <ImageIcon className="inline-block mr-1.5 h-4 w-4" />
                  画像（最大3枚）<span className="text-destructive ml-1">*</span>
                </Label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  id="spot-image-upload"
                />
                <label
                  htmlFor="spot-image-upload"
                  className="cursor-pointer flex items-center justify-center p-6 border-2 border-dashed border-input rounded-xl hover:border-primary hover:bg-background/80 transition-colors"
                >
                  <div className="text-center">
                    <Upload className="mx-auto h-10 w-10 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">タップして画像を選択</p>
                    <p className="text-xs text-gray-400">JPG, PNG, WEBP（各5MB以下）</p>
                  </div>
                </label>

                {imagePreviewUrls.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {imagePreviewUrls.map((url, imgIndex) => (
                      <div key={imgIndex} className="relative group" style={{ aspectRatio: '16/10' }}>
                        <img
                          src={url}
                          alt={`Preview ${imgIndex + 1}`}
                          className="w-full h-full object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(imgIndex)}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 shadow-md"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 対象者タグ */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">
                  <Users className="inline-block mr-1.5 h-4 w-4" />
                  対象者タグ（任意）
                </Label>
                <p className="text-xs text-gray-500 mb-3">
                  対象となるユーザー層を選択してください（複数選択可）
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TARGET_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag.id);
                    return (
                      <label
                        key={tag.id}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all border-2 text-sm ${
                          isSelected
                            ? 'border-primary bg-primary/10 font-medium'
                            : 'border-transparent bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTags(prev => [...prev, tag.id]);
                            } else {
                              setSelectedTags(prev => prev.filter(t => t !== tag.id));
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span style={{ fontSize: '16px' }}>{tag.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* リンク */}
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">
                      <LinkIcon className="inline-block mr-1.5 h-4 w-4" />
                      リンク（任意）
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com"
                        className="h-12 text-base rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* エラーメッセージ */}
            {submitError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-xl p-4"
              >
                <p className="text-sm text-red-800">{submitError}</p>
              </motion.div>
            )}

            {/* 投稿ボタン */}
            <div className="space-y-2">
              <Button
                type="submit"
                disabled={isSubmitting || !isFormValid()}
                className="w-full h-14 text-lg font-bold rounded-xl shadow-lg bg-primary hover:bg-primary/90 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    登録中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    スポットを登録する
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                <span className="text-red-600">※は必須項目です</span>
              </p>

              <Button
                type="button"
                onClick={() => router.back()}
                className="w-full h-12 text-base font-semibold rounded-xl shadow-md bg-gray-200 hover:bg-gray-300 text-gray-700"
              >
                戻る
              </Button>
            </div>
          </form>
        </Form>
      </motion.div>

      {/* マーカー位置選択モーダル */}
      <MarkerLocationModal
        isOpen={isMarkerModalOpen}
        onClose={() => setIsMarkerModalOpen(false)}
        onSave={handleMarkerSave}
        initialLat={storeLat || latitude || undefined}
        initialLng={storeLng || longitude || undefined}
        initialSpotName={form.watch('storeName')}
        isLoaded={isLoaded}
      />
    </div>
  );
}
