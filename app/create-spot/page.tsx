"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Upload, X, MapPin, Loader2, Image as ImageIcon,
  Link as LinkIcon, CheckCircle, Navigation, Users,
  Sparkles, UserPlus, Award, ChevronDown, ChevronUp
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
import { registerReporter, getReporterByDeviceToken } from '@/app/_actions/reporters';
import { MarkerLocationModal } from '@/components/map/marker-location-modal';
import { Breadcrumb } from '@/components/seo/breadcrumb';
import { designTokens, TARGET_TAGS, TAG_ACTIVITIES } from '@/lib/constants';
import type { Reporter } from '@/types/reporter';
import type { TargetTagId } from '@/lib/constants/target-tags';

const createSpotSchema = z.object({
  storeName: z.string().min(1, { message: 'タイトルは必須です' }).max(100, { message: '100文字以内で入力してください' }),
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
  const [selectedTagActivities, setSelectedTagActivities] = useState<Record<string, string[]>>({});
  const [expandedTags, setExpandedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [showAlternativeLocation, setShowAlternativeLocation] = useState(false);

  // リポーターシステム
  const [reporter, setReporter] = useState<Reporter | null>(null);
  const [showReporterModal, setShowReporterModal] = useState(false);
  const [reporterNickname, setReporterNickname] = useState('');
  const [isRegisteringReporter, setIsRegisteringReporter] = useState(false);
  const [reporterRegistered, setReporterRegistered] = useState(false);

  // リポーター情報の読み込み
  useEffect(() => {
    if (status === 'loading') return;
    if (session?.user?.id) return; // ログイン済みはリポーター不要

    const checkReporter = async () => {
      const deviceToken = localStorage.getItem('reporter_device_token');
      if (deviceToken) {
        const { reporter: existing } = await getReporterByDeviceToken(deviceToken);
        if (existing) {
          setReporter(existing);
          return;
        }
      }
      // 未登録 → モーダル表示
      setShowReporterModal(true);
    };
    checkReporter();
  }, [session, status]);

  // リポーター登録処理
  const handleRegisterReporter = async () => {
    if (!reporterNickname.trim()) return;
    setIsRegisteringReporter(true);

    try {
      const deviceToken = uuidv4();
      const { reporter: newReporter, error } = await registerReporter(reporterNickname.trim(), deviceToken);

      if (error || !newReporter) {
        toast({ title: 'エラー', description: error || '登録に失敗しました', duration: 3000 });
        return;
      }

      localStorage.setItem('reporter_device_token', deviceToken);
      localStorage.setItem('reporter_id', newReporter.id);
      setReporter(newReporter);
      setReporterRegistered(true);

      // 登録完了を表示してからモーダルを閉じる
      setTimeout(() => {
        setShowReporterModal(false);
        setReporterRegistered(false);
      }, 3000);
    } catch (err: any) {
      toast({ title: 'エラー', description: err.message, duration: 3000 });
    } finally {
      setIsRegisteringReporter(false);
    }
  };

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

  // 画像アップロード（Supabase Storage）。未ログイン時は 'guest' フォルダを使用
  const uploadImageToStorage = async (file: File, userIdOrGuest: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExt}`;
    const objectPath = `${userIdOrGuest}/${uniqueFileName}`;

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

  // 写真カテゴリベースのタグ定義（スポット登録用）
  const SPOT_PHOTO_TAGS = [
    { id: 'nature', label: '自然・風景' },
    { id: 'gourmet', label: 'グルメ・カフェ' },
    { id: 'temple', label: '神社・お寺' },
    { id: 'onsen', label: '温泉・スパ' },
    { id: 'art', label: 'アート・建築' },
    { id: 'park', label: '公園・広場' },
    { id: 'night', label: '夜景・イルミ' },
    { id: 'animal', label: '動物・ふれあい' },
    { id: 'shopping', label: 'ショップ・市場' },
    { id: 'history', label: '歴史・文化' },
    { id: 'flower', label: '花・季節' },
    { id: 'sports', label: 'アウトドア・体験' },
  ] as const;

  // カスタムタグの追加
  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim();
    if (!trimmed) return;
    if (customTags.includes(trimmed)) return;
    setCustomTags(prev => [...prev, trimmed]);
    setCustomTagInput('');
  };

  // カスタムタグの削除
  const handleRemoveCustomTag = (tag: string) => {
    setCustomTags(prev => prev.filter(t => t !== tag));
  };

  // 現在地を指定
  const handleSetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: 'エラー', description: 'お使いのブラウザは位置情報をサポートしていません', duration: 3000 });
      return;
    }
    setLocationStatus('getting');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setStoreLat(lat);
        setStoreLng(lng);
        setLocationStatus('success');
        toast({ title: '位置情報を取得しました', description: '現在地を設定しました', duration: 2000 });
      },
      (error) => {
        console.error('位置情報の取得に失敗:', error);
        setLocationStatus('error');
        toast({ title: 'エラー', description: '位置情報の取得に失敗しました', duration: 3000 });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // タグ選択時にアクティビティ展開を制御
  const handleTagToggle = (tagId: string, checked: boolean) => {
    if (checked) {
      setSelectedTags(prev => [...prev, tagId]);
      setExpandedTags(prev => [...prev, tagId]);
    } else {
      setSelectedTags(prev => prev.filter(t => t !== tagId));
      setExpandedTags(prev => prev.filter(t => t !== tagId));
      setSelectedTagActivities(prev => {
        const next = { ...prev };
        delete next[tagId];
        return next;
      });
    }
  };

  // アクティビティ選択
  const handleActivityToggle = (tagId: string, activityId: string, checked: boolean) => {
    setSelectedTagActivities(prev => {
      const current = prev[tagId] || [];
      if (checked) {
        return { ...prev, [tagId]: [...current, activityId] };
      } else {
        const filtered = current.filter(a => a !== activityId);
        if (filtered.length === 0) {
          const next = { ...prev };
          delete next[tagId];
          return next;
        }
        return { ...prev, [tagId]: filtered };
      }
    });
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
      const userIdOrGuest = session?.user?.id ?? 'guest';

      // 画像アップロード
      const imageUrls: string[] = [];
      for (const file of imageFiles) {
        const url = await uploadImageToStorage(file, userIdOrGuest);
        imageUrls.push(url);
      }

      const spotInput: CreateSpotInput = {
        userId: session?.user?.id ?? undefined,
        reporterId: reporter?.id ?? undefined,
        storeName: values.storeName,
        description: values.description,
        storeLatitude: storeLat!,
        storeLongitude: storeLng!,
        storeId: storeId,
        imageUrls,
        url: values.url && values.url.trim() !== '' ? values.url : null,
        city: null,
        prefecture: '大分県',
        targetTags: [...selectedTags, ...customTags].length > 0 ? [...selectedTags, ...customTags] : undefined,
        tagActivities: Object.keys(selectedTagActivities).length > 0 ? selectedTagActivities : undefined,
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
          {/* リポーター情報バッジ */}
          {reporter && !session?.user?.id && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
              style={{
                background: `${designTokens.colors.accent.lilac}15`,
                color: designTokens.colors.accent.lilacDark,
                border: `1px solid ${designTokens.colors.accent.lilac}30`,
              }}
            >
              <Award className="h-4 w-4" />
              <span>{reporter.nickname}</span>
              <span className="text-xs opacity-70">({reporter.reporter_no})</span>
            </motion.div>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* 位置情報 */}
            <div className="bg-white rounded-xl border-2 border-border p-4 space-y-4 shadow-sm">
              <div>
                <Label className="text-sm font-semibold mb-2 block">
                  <MapPin className="inline-block mr-1.5 h-4 w-4" />
                  場所<span className="text-destructive ml-1">*</span>
                </Label>

                {locationStatus === 'success' && (
                  <div className="mb-3 flex items-center text-xs text-green-600">
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    位置情報を取得しました
                  </div>
                )}
                {locationStatus === 'getting' && (
                  <div className="mb-3 flex items-center text-xs text-gray-500">
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    位置情報を取得中...
                  </div>
                )}

                {/* 現在地を指定ボタン */}
                <button
                  type="button"
                  onClick={handleSetCurrentLocation}
                  disabled={locationStatus === 'getting'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-semibold transition-colors disabled:opacity-50"
                  style={{
                    background: designTokens.colors.accent.lilac,
                    color: designTokens.colors.text.inverse,
                  }}
                >
                  <Navigation className="h-5 w-5" />
                  <span>現在地を指定</span>
                </button>

                {/* 別の方法で指定 */}
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShowAlternativeLocation(prev => !prev)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    style={{
                      background: designTokens.colors.background.cloud,
                      color: designTokens.colors.text.secondary,
                    }}
                  >
                    {showAlternativeLocation ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <span>別の方法で指定</span>
                  </button>

                  <AnimatePresence>
                    {showAlternativeLocation && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 space-y-3">
                          {/* 場所の指定（旧：スポットを検索） */}
                          <div>
                            <Label className="text-xs font-semibold mb-1.5 block text-gray-600">
                              場所の指定
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
                          </div>

                          {/* マーカーピンで位置を指定 */}
                          <button
                            type="button"
                            onClick={() => setIsMarkerModalOpen(true)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded-xl transition-colors"
                          >
                            <Navigation className="h-5 w-5" />
                            <span className="font-semibold">マーカーピンで位置を指定</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* タイトル */}
              <FormField
                control={form.control}
                name="storeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">
                      タイトル<span className="text-destructive ml-1">*</span>
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

              {/* タグ選択（写真カテゴリベース） */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">
                  <Users className="inline-block mr-1.5 h-4 w-4" />
                  タグ（任意）
                </Label>
                <p className="text-xs text-gray-500 mb-3">
                  写真に合ったカテゴリを選んでください（複数選択可）
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {SPOT_PHOTO_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTags(prev => prev.filter(t => t !== tag.id));
                          } else {
                            setSelectedTags(prev => [...prev, tag.id]);
                          }
                        }}
                        className={`px-3 py-2 rounded-full text-sm transition-all border ${
                          isSelected
                            ? 'font-medium'
                            : 'hover:bg-gray-100'
                        }`}
                        style={isSelected ? {
                          background: `${designTokens.colors.accent.lilac}20`,
                          color: designTokens.colors.accent.lilacDark,
                          borderColor: designTokens.colors.accent.lilac,
                        } : {
                          background: designTokens.colors.background.cloud,
                          color: designTokens.colors.text.secondary,
                          borderColor: 'transparent',
                        }}
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>

                {/* カスタムタグ入力 */}
                <div className="flex gap-2">
                  <Input
                    placeholder="自由にタグを入力..."
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTag();
                      }
                    }}
                    className="h-10 text-sm rounded-xl flex-1"
                    maxLength={20}
                  />
                  <Button
                    type="button"
                    onClick={handleAddCustomTag}
                    disabled={!customTagInput.trim()}
                    className="h-10 px-4 rounded-xl text-sm font-semibold"
                    style={{
                      background: customTagInput.trim() ? designTokens.colors.accent.lilac : undefined,
                      color: customTagInput.trim() ? designTokens.colors.text.inverse : undefined,
                    }}
                  >
                    追加
                  </Button>
                </div>
                {customTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {customTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium"
                        style={{
                          background: `${designTokens.colors.secondary.fern}15`,
                          color: designTokens.colors.secondary.fernDark,
                          border: `1px solid ${designTokens.colors.secondary.fern}30`,
                        }}
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomTag(tag)}
                          className="ml-0.5 hover:opacity-70"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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

      {/* リポーター登録モーダル */}
      <AnimatePresence>
        {showReporterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
            >
              {!reporterRegistered ? (
                <>
                  {/* モーダルヘッダー */}
                  <div
                    className="p-6 text-center"
                    style={{
                      background: `linear-gradient(135deg, ${designTokens.colors.accent.lilac}20, ${designTokens.colors.accent.gold}15)`,
                    }}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.2 }}
                      className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${designTokens.colors.accent.lilac}, ${designTokens.colors.accent.lilacDark})`,
                      }}
                    >
                      <UserPlus className="h-8 w-8 text-white" />
                    </motion.div>
                    <h2 className="text-xl font-bold" style={{ color: designTokens.colors.text.primary }}>
                      リポーター登録
                    </h2>
                    <p className="text-sm mt-2" style={{ color: designTokens.colors.text.secondary }}>
                      ニックネームを登録して、<br />あなただけのリポーターNo.を取得しましょう
                    </p>
                  </div>

                  {/* モーダルボディ */}
                  <div className="p-6 space-y-4">
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">
                        ニックネーム<span className="text-destructive ml-1">*</span>
                      </Label>
                      <Input
                        placeholder="例: 大分太郎"
                        value={reporterNickname}
                        onChange={(e) => setReporterNickname(e.target.value)}
                        className="h-12 text-base rounded-xl"
                        maxLength={20}
                      />
                      <p className="text-xs text-gray-400 mt-1">20文字以内</p>
                    </div>

                    <Button
                      onClick={handleRegisterReporter}
                      disabled={!reporterNickname.trim() || isRegisteringReporter}
                      className="w-full h-12 text-base font-bold rounded-xl"
                      style={{
                        background: reporterNickname.trim()
                          ? `linear-gradient(135deg, ${designTokens.colors.accent.lilac}, ${designTokens.colors.accent.lilacDark})`
                          : undefined,
                      }}
                    >
                      {isRegisteringReporter ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <Award className="mr-2 h-5 w-5" />
                      )}
                      登録してリポーターNo.を取得
                    </Button>
                  </div>
                </>
              ) : (
                /* 登録完了画面 */
                <div className="p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${designTokens.colors.functional.success}, ${designTokens.colors.secondary.fern})`,
                    }}
                  >
                    <CheckCircle className="h-10 w-10 text-white" />
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-xl font-bold mb-2"
                    style={{ color: designTokens.colors.text.primary }}
                  >
                    登録完了!
                  </motion.h2>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-3"
                  >
                    <p className="text-sm" style={{ color: designTokens.colors.text.secondary }}>
                      あなたのリポーターNo.
                    </p>
                    <div
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-lg font-bold"
                      style={{
                        background: `${designTokens.colors.accent.gold}20`,
                        color: designTokens.colors.accent.goldDark,
                        border: `2px solid ${designTokens.colors.accent.gold}50`,
                      }}
                    >
                      <Award className="h-5 w-5" />
                      {reporter?.reporter_no}
                    </div>
                    <p className="text-xs" style={{ color: designTokens.colors.text.muted }}>
                      {reporter?.nickname} さん、ようこそ!
                    </p>
                  </motion.div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
