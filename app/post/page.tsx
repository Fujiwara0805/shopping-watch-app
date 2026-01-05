"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Upload, X, Store as StoreIcon, ClipboardList, Image as ImageIcon, ClockIcon, Tag, MapPin, CheckCircle, ChevronDown, ChevronUp, Settings, Link as LinkIcon, FileText, Phone, CalendarDays, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { supabase } from '@/lib/supabaseClient';
import { calculateExpiresAt } from '@/lib/expires-at-date';
import { v4 as uuidv4 } from 'uuid';
import { CustomModal } from '@/components/ui/custom-modal';
import { useToast } from "@/hooks/use-toast";
import { useLoading } from '@/contexts/loading-context';
import { useGoogleMapsApi } from '@/components/providers/GoogleMapsApiProvider';
import { createPost, type CreatePostInput, type PostCategory as ServerPostCategory } from '@/app/_actions/posts';
import { Breadcrumb } from '@/components/seo/breadcrumb';

declare global {
  interface Window {
    google: any;
  }
}

// カテゴリーの型定義
export type PostCategory = 'イベント情報' | '聖地巡礼' | '観光スポット' | '温泉' | 'グルメ';

// カテゴリーごとのバリデーションスキーマ
const createPostSchema = (category: PostCategory) => {
  const baseSchema = {
    // z.enum()に変更して、すべてのカテゴリを許可（カテゴリ変更時のバリデーションエラーを防ぐ）
    category: z.enum(['イベント情報', '聖地巡礼', '観光スポット', '温泉', 'グルメ'], {
      required_error: 'カテゴリを選択してください',
    }),
    storeId: z.string().min(1, { message: '場所の選択は必須です' }),
    storeName: z.string().min(1, { message: '場所の選択は必須です' }),
    content: z.string().min(5, { message: '5文字以上入力してください' }).max(800, { message: '800文字以内で入力してください' }),
    url: z.string().url({ message: '有効なURLを入力してください' }).optional().or(z.literal('')),
    store_latitude: z.number().optional(),
    store_longitude: z.number().optional(),
    phoneNumber: z.string().max(15).optional(),
    prefecture: z.string().max(20).optional(),
    city: z.string().max(50).optional(),
    enableCheckin: z.boolean().default(false),
    collaboration: z.string().max(200).optional(),
  };

  // イベント情報の場合
  if (category === 'イベント情報') {
    return z.object({
      ...baseSchema,
      customExpiryDays: z.number().min(1, { message: '1日以上を設定してください' }).max(90, { message: '90日以下を設定してください' }),
      eventName: z.string().min(1, { message: 'イベント名の入力は必須です' }).max(100),
      eventStartDate: z.string().min(1, { message: '開催開始日の入力は必須です' }),
      eventEndDate: z.string().optional(),
      eventPrice: z.string().max(50).optional(),
      expiryOption: z.enum(['90days', 'unlimited']).optional(),
    }).refine((data) => {
      if (data.eventEndDate && data.eventEndDate.trim() !== '' && data.eventStartDate && data.eventStartDate.trim() !== '') {
        const startDate = new Date(data.eventStartDate);
        const endDate = new Date(data.eventEndDate);
        return endDate >= startDate;
      }
      return true;
    }, {
      message: '開催終了日は開始日以降の日付を選択してください',
      path: ['eventEndDate'],
    });
  }

  // その他のカテゴリー（聖地巡礼、観光スポット、温泉、グルメ）
  return z.object({
    ...baseSchema,
    expiryOption: z.enum(['90days', 'unlimited'], { required_error: '掲載期間を選択してください' }),
  });
};

// フォームの型定義（カテゴリーごとに異なるためanyを使用）
type PostFormValues = any;

// 🔥 イベント情報専用定型文データ
const templateTexts = [
    '【イベント開催】\n楽しいイベントを開催します！\n・内容: \n・対象: \n・持ち物: ',
    '【ワークショップ開催】\nワークショップを開催します。\n・テーマ: \n・定員: \n・申込方法: ',
    '【セール開催】\n特別セールを開催中！\n・対象商品: \n・割引内容: \n・期間限定: ',
    '【体験会実施】\n体験会を実施します。\n・体験内容: \n・所要時間: \n・参加費: ',
    '【地域イベント】\n地域のみなさまにお楽しみいただけるイベントです。\n・日時: \n・場所: \n・参加方法: ',
    '【フェスティバル】\n年に一度の特別なフェスティバルを開催！\n・見どころ: \n・出店: \n・アクセス: ',
];

// 🔥 イベント情報の掲載期間を自動計算する関数
const calculateEventExpiryDays = (startDate: string, endDate?: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDateStr = endDate && endDate.trim() !== '' ? endDate : startDate;
  const targetDate = new Date(targetDateStr);
  targetDate.setHours(23, 59, 59, 999);
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(1, Math.min(90, diffDays));
};

// カテゴリーごとの表示項目
const getCategoryFields = (category: PostCategory): string[] => {
  if (category === 'イベント情報') {
    return ['location', 'eventName', 'eventDate', 'eventPrice', 'eventArea', 'url', 'image', 'phoneNumber', 'file', 'enableCheckin'];
  }
  // 聖地巡礼、観光スポット、温泉、グルメ
  return ['location', 'eventArea', 'url', 'image', 'phoneNumber', 'enableCheckin', 'collaboration'];
};

// フィールドの表示名とアイコン
const getFieldDisplayInfo = (field: string) => {
  const fieldMap = {
    location: { label: '場所', icon: StoreIcon },
    url: { label: 'リンク', icon: LinkIcon },
    image: { label: '画像', icon: ImageIcon },
    phoneNumber: { label: '電話番号', icon: Phone },
    file: { label: 'ファイル', icon: FileText },
    eventName: { label: 'イベント名', icon: CalendarDays },
    eventDate: { label: '開催期日', icon: CalendarDays },
    eventPrice: { label: '料金', icon: Tag },
    eventArea: { label: 'エリア情報', icon: MapPin },
    enableCheckin: { label: 'GPSチェックイン', icon: MapPin },
    collaboration: { label: 'コラボ', icon: Users },
  };
  
  return fieldMap[field as keyof typeof fieldMap] || { label: field, icon: StoreIcon };
};

export default function PostPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  // 🔥 カテゴリー選択状態
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>('イベント情報');
  
  // 🔥 複数画像対応
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [formDataToSubmit, setFormDataToSubmit] = useState<any | null>(null);
  
  // 🔥 複数ファイル対応を追加
  const [fileFiles, setFileFiles] = useState<File[]>([]);

  const {
    latitude,
    longitude,
    loading: locationLoading,
    error: locationError,
    permissionState,
    requestLocation
  } = useGeolocation();

  const { showLoading, hideLoading } = useLoading();
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  
  // 位置情報取得状況の表示用
  const [locationStatus, setLocationStatus] = useState<'none' | 'getting' | 'success' | 'error'>('none');

  const { isLoaded, loadError } = useGoogleMapsApi();

  // カテゴリーごとのフォーム設定
  // resolverをuseMemoでラップして、selectedCategoryが変更されたときに再計算されるようにする
  const resolver = useMemo(() => zodResolver(createPostSchema(selectedCategory)), [selectedCategory]);
  
  const form = useForm<any>({
    resolver: resolver,
    defaultValues: {
      category: selectedCategory,
      storeId: '',
      storeName: '',
      content: '',
      url: '',
      customExpiryDays: 7,
      expiryOption: '90days' as '90days' | 'unlimited',
      store_latitude: undefined,
      store_longitude: undefined,
      phoneNumber: '',
      eventName: '',
      eventStartDate: '',
      eventEndDate: '',
      eventPrice: '',
      prefecture: '',
      city: '',
      enableCheckin: false,
      collaboration: '',
    },
    mode: 'onChange',
  });

  // カテゴリー変更時のフォーム再初期化とresolver更新
  useEffect(() => {
    // resolverを更新
    const newSchema = createPostSchema(selectedCategory);
    form.clearErrors();
    
    const resetValues: any = {
      category: selectedCategory,
      storeId: '',
      storeName: '',
      content: '',
      url: '',
      expiryOption: '90days' as '90days' | 'unlimited',
      store_latitude: undefined,
      store_longitude: undefined,
      phoneNumber: '',
      prefecture: '',
      city: '',
      enableCheckin: false,
      collaboration: '',
    };

    if (selectedCategory === 'イベント情報') {
      resetValues.customExpiryDays = 7;
      resetValues.eventName = '';
      resetValues.eventStartDate = '';
      resetValues.eventEndDate = '';
      resetValues.eventPrice = '';
    }

    form.reset(resetValues);
    setImageFiles([]);
    setImagePreviewUrls([]);
    setFileFiles([]);
    setSelectedPlace(null);
    setLocationStatus('none');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);
  
  const { formState: { isValid, isSubmitting } } = form;
  
  // 🔥 イベント日付の監視
  const eventStartDate = form.watch('eventStartDate');
  const eventEndDate = form.watch('eventEndDate');

  // 🔥 定型文選択モーダルの状態
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // 🔥 複数画像のクリーンアップ
  useEffect(() => {
    return () => {
      imagePreviewUrls.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [imagePreviewUrls]);

  // 🔥 複数画像のプレビュー処理
  useEffect(() => {
    if (imageFiles.length > 0) {
      const newPreviewUrls: string[] = [];
      imageFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviewUrls.push(reader.result as string);
          if (newPreviewUrls.length === imageFiles.length) {
            setImagePreviewUrls(newPreviewUrls);
          }
        };
        reader.readAsDataURL(file);
      });
    } else {
      setImagePreviewUrls([]);
    }
  }, [imageFiles]);

  // カテゴリーごとの必須フィールドを自動展開
  useEffect(() => {
    setShowOptionalFields(true);
    const fields = getCategoryFields(selectedCategory);
    const expanded: Record<string, boolean> = {};
    fields.forEach(field => {
      expanded[field] = true;
    });
    setOptionalFieldsExpanded(expanded);
  }, [selectedCategory]);
  
  // 画像アップロード処理（クライアントサイド - Supabase Storage直接アップロード）
  const uploadFileToStorage = async (
    file: File, 
    userId: string, 
    bucket: 'images' | 'files',
    index: number
  ): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const uniqueFileName = `${uuidv4()}_${index}.${fileExt}`;
    const objectPath = `${userId}/${uniqueFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(objectPath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`${bucket === 'images' ? '画像' : 'ファイル'}のアップロードに失敗しました: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(objectPath);

    if (!publicUrlData?.publicUrl) {
      throw new Error('URLの取得に失敗しました');
    }

    return publicUrlData.publicUrl;
  };

  // 投稿処理
  const handleActualSubmit = async (values: any) => {
    if (!session?.user?.id) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    // 必須フィールドの検証
    if (!values.content || values.content.length < 5) {
      setSubmitError("投稿内容を5文字以上入力してください。");
      return;
    }

    // イベント情報の場合の追加検証
    if (selectedCategory === 'イベント情報') {
      if (values.customExpiryDays && (values.customExpiryDays < 1 || values.customExpiryDays > 90)) {
        setSubmitError("掲載期間は1日〜90日の範囲で設定してください。");
        return;
      }
      if (!values.eventName) {
        setSubmitError("イベント名を入力してください。");
        return;
      }
      if (!values.eventStartDate) {
        setSubmitError("開催開始日を入力してください。");
        return;
      }
    } else {
      // その他のカテゴリーの場合、掲載期間の選択を確認
      if (!values.expiryOption) {
        setSubmitError("掲載期間を選択してください。");
        return;
      }
    }

    form.clearErrors("root.serverError");
    showLoading();
    setIsUploading(true);
    setSubmitError(null);
    setShowConfirmModal(false);

    try {
      const userId = session.user.id;

      // 🔥 複数画像のアップロード処理（クライアントサイド）
      const imageUrls: string[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const url = await uploadFileToStorage(imageFiles[i], userId, 'images', i);
        imageUrls.push(url);
      }

      // 🔥 複数ファイルのアップロード処理（クライアントサイド）
      const fileUrls: string[] = [];
      for (let i = 0; i < fileFiles.length; i++) {
        const url = await uploadFileToStorage(fileFiles[i], userId, 'files', i);
        fileUrls.push(url);
      }

      // 掲載期間の計算
      let expiryOption = '';
      let customExpiryMinutes: number | null = null;
      let expiresAt = '';

      if (selectedCategory === 'イベント情報') {
        if (values.customExpiryDays) {
          expiryOption = 'days';
          customExpiryMinutes = values.customExpiryDays * 24 * 60;
          expiresAt = calculateExpiresAt('days', undefined, values.customExpiryDays).toISOString();
        } else {
          const calculatedDays = calculateEventExpiryDays(values.eventStartDate, values.eventEndDate);
          expiryOption = 'days';
          customExpiryMinutes = calculatedDays * 24 * 60;
          expiresAt = calculateExpiresAt('days', undefined, calculatedDays).toISOString();
        }
      } else {
        if (values.expiryOption === '90days') {
          expiryOption = '90d';
          customExpiryMinutes = 90 * 24 * 60;
          expiresAt = calculateExpiresAt('90d').toISOString();
        } else if (values.expiryOption === 'unlimited') {
          expiryOption = 'days';
          customExpiryMinutes = null;
          const farFuture = new Date();
          farFuture.setFullYear(2099, 11, 31);
          farFuture.setHours(23, 59, 59, 999);
          expiresAt = farFuture.toISOString();
        }
      }

      // 🔥 店舗の位置情報を取得
      const storeLatitude = form.getValues("store_latitude") as number | undefined;
      const storeLongitude = form.getValues("store_longitude") as number | undefined;

      // 🔥 Server Actionを使用して投稿を作成
      const postInput: CreatePostInput = {
        userId,
        storeId: values.storeId || null,
        storeName: values.storeName || selectedCategory,
        category: selectedCategory as ServerPostCategory,
        content: values.content,
        imageUrls,
        fileUrls,
        url: values.url && values.url.trim() !== '' ? values.url : null,
        phoneNumber: values.phoneNumber && values.phoneNumber.trim() !== '' ? values.phoneNumber : null,
        prefecture: values.prefecture && values.prefecture.trim() !== '' ? values.prefecture : null,
        city: values.city && values.city.trim() !== '' ? values.city : null,
        authorRole: session?.user?.role === 'admin' ? 'admin' : 'user',
        enableCheckin: values.enableCheckin || false,
        collaboration: selectedCategory !== 'イベント情報' && values.collaboration ? values.collaboration.trim() : null,
        storeLatitude: storeLatitude !== undefined && !isNaN(storeLatitude) ? Number(storeLatitude) : undefined,
        storeLongitude: storeLongitude !== undefined && !isNaN(storeLongitude) ? Number(storeLongitude) : undefined,
        userLatitude: latitude ? Number(latitude) : undefined,
        userLongitude: longitude ? Number(longitude) : undefined,
        eventName: selectedCategory === 'イベント情報' ? values.eventName : undefined,
        eventStartDate: selectedCategory === 'イベント情報' ? values.eventStartDate : undefined,
        eventEndDate: selectedCategory === 'イベント情報' && values.eventEndDate?.trim() !== '' ? values.eventEndDate : null,
        eventPrice: selectedCategory === 'イベント情報' && values.eventPrice?.trim() !== '' ? values.eventPrice : null,
        expiryOption,
        customExpiryMinutes,
        expiresAt,
      };

      const { postId, error: createError } = await createPost(postInput);

      if (createError || !postId) {
        throw new Error(createError || '投稿の保存に失敗しました');
      }

      // フォームリセット
      const resetValues: any = {
        category: selectedCategory,
        storeId: '',
        storeName: '',
        content: '',
        url: '',
        expiryOption: '90days' as '90days' | 'unlimited',
        phoneNumber: '',
        prefecture: '',
        city: '',
        enableCheckin: false,
        collaboration: '',
      };

      if (selectedCategory === 'イベント情報') {
        resetValues.customExpiryDays = 7;
        resetValues.eventName = '';
        resetValues.eventStartDate = '';
        resetValues.eventEndDate = '';
        resetValues.eventPrice = '';
      }

      form.reset(resetValues);
      
      setImageFiles([]);
      setImagePreviewUrls([]);
      setFileFiles([]);
      setSelectedPlace(null);
      setLocationStatus('none');
      router.push('/post/complete');

    } catch (error: any) {
      console.error("PostPage: onSubmit error:", error);
      setSubmitError(error.message || "投稿処理中にエラーが発生しました。");
    } finally {
      setIsUploading(false);
      hideLoading();
    }
  };

  const triggerConfirmationModal = (values: any) => {
    setFormDataToSubmit(values);
    setShowConfirmModal(true);
  };
  
  const handleConfirmSubmit = () => {
    if (formDataToSubmit) {
      handleActualSubmit(formDataToSubmit);
    }
  };

  // 🔥 複数画像アップロード処理
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (imageFiles.length + files.length > 5) {
      toast({
        title: "⚠️ 画像枚数の上限を超えています",
        description: "画像は最大5枚まで投稿できます。",
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
          description: "各画像は5MB以下にしてください。",
          duration: 3000,
        });
        return;
      }
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "⚠️ サポートされていないファイル形式です",
          description: "JPG、PNG、またはWEBP形式の画像を選択してください。",
          duration: 3000,
        });
        return;
      }
    }

    setSubmitError(null);
    setImageFiles(prev => [...prev, ...files]);
    
    toast({
      title: "✅ 画像をアップロードしました",
      description: `${files.length}枚の画像が追加されました`,
      duration: 1000,
    });
  };
  
  // 🔥 個別画像削除処理
  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => {
      const newUrls = prev.filter((_, i) => i !== index);
      if (prev[index] && prev[index].startsWith('blob:')) {
        URL.revokeObjectURL(prev[index]);
      }
      return newUrls;
    });
  };

  // 🔥 複数ファイルアップロード処理
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (fileFiles.length + files.length > 3) {
      toast({
        title: "⚠️ ファイル数の上限を超えています",
        description: "ファイルは最大3つまで投稿できます。",
        duration: 3000,
      });
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    
    for (const file of files) {
      if (file.size > maxSize) {
        toast({
          title: "⚠️ ファイルサイズが大きすぎます",
          description: "各ファイルは10MB以下にしてください。",
          duration: 3000,
        });
        return;
      }
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "⚠️ サポートされていないファイル形式です",
          description: "PDF、Word、Excelファイルのみ対応しています。",
          duration: 3000,
        });
        return;
      }
    }

    setSubmitError(null);
    setFileFiles(prev => [...prev, ...files]);
    
    toast({
      title: "✅ ファイルをアップロードしました",
      description: `${files.length}個のファイルが追加されました`,
      duration: 1000,
    });
  };

  // 🔥 個別ファイル削除処理
  const removeFile = (index: number) => {
    setFileFiles(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (status !== "loading" && !session) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [session, status, router]);

  // 🔥 位置情報取得
  useEffect(() => {
    if (!latitude && !longitude && !locationLoading && !locationError) {
      requestLocation();
    }
  }, [latitude, longitude, locationLoading, locationError, requestLocation]);

  // 位置情報状況表示コンポーネント
  const LocationStatusIndicator = () => {
    const lat = form.watch('store_latitude') as number | undefined;
    const lng = form.watch('store_longitude') as number | undefined;
    
    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      return (
        <div className="flex items-center space-x-2 p-2 bg-green-50 border border-green-200 rounded-md">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-sm text-green-800">
            位置情報取得完了 (緯度: {lat.toFixed(6)}, 経度: {lng.toFixed(6)})
          </span>
        </div>
      );
    } else if (locationStatus === 'getting') {
      return (
        <div className="flex items-center space-x-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
          <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
          <span className="text-sm text-blue-800">位置情報を取得中...</span>
        </div>
      );
    } else if (locationStatus === 'error') {
      return (
        <div className="flex items-center space-x-2 p-2 bg-red-50 border border-red-200 rounded-md">
          <X className="h-5 w-5 text-red-600" />
          <span className="text-sm text-red-800">位置情報の取得に失敗しました</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center space-x-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
        <MapPin className="h-5 w-5 text-blue-600" />
        <span className="text-sm text-blue-800">店舗を選択すると位置情報が自動取得されます</span>
      </div>
    );
  };

  // オプション項目の表示状態管理
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [optionalFieldsExpanded, setOptionalFieldsExpanded] = useState<Record<string, boolean>>({
    image: false,
    location: false,
    url: false,
    phoneNumber: false,
    file: false,
    eventName: false,
    eventDate: false,
    eventPrice: false,
    eventArea: false,
    enableCheckin: false,
    collaboration: false,
  });

  // オプションフィールドの切り替え
  const toggleOptionalField = (field: keyof typeof optionalFieldsExpanded) => {
    setOptionalFieldsExpanded(prev => {
      const newState = {
        ...prev,
        [field]: !prev[field]
      };

      if (!newState[field]) {
        switch (field) {
          case 'image':
            setImageFiles([]);
            setImagePreviewUrls([]);
            break;
          case 'location':
            form.setValue('storeId', '', { shouldValidate: true });
            form.setValue('storeName', '', { shouldValidate: true });
            form.setValue('store_latitude', undefined, { shouldValidate: true });
            form.setValue('store_longitude', undefined, { shouldValidate: true });
            setLocationStatus('none');
            setSelectedPlace(null);
            break;
          case 'url':
            form.setValue('url', '', { shouldValidate: true });
            break;
          case 'phoneNumber':
            form.setValue('phoneNumber', '', { shouldValidate: true });
            break;
          case 'file':
            setFileFiles([]);
            break;
          case 'eventName':
            form.setValue('eventName', '', { shouldValidate: true });
            break;
          case 'eventDate':
            form.setValue('eventStartDate', '', { shouldValidate: true });
            form.setValue('eventEndDate', '', { shouldValidate: true });
            break;
          case 'eventPrice':
            form.setValue('eventPrice', '', { shouldValidate: true });
            break;
          case 'eventArea':
            form.setValue('prefecture', '', { shouldValidate: true });
            form.setValue('city', '', { shouldValidate: true });
            break;
          case 'enableCheckin':
            form.setValue('enableCheckin', false, { shouldValidate: true });
            break;
          case 'collaboration':
            form.setValue('collaboration', '', { shouldValidate: true });
            break;
          default:
            break;
        }
      }
      return newState;
    });
  };

  // 🔥 定型文を投稿内容に転記する関数
  const applyTemplate = (templateText: string) => {
    form.setValue('content', templateText, { shouldValidate: true });
    setShowTemplateModal(false);
    
    toast({
      title: "✅ 定型文を適用しました",
      description: "投稿内容を確認して、必要に応じて編集してください。",
      duration: 2000,
    });
  };

  // オプション項目の値が入力されているかチェック
  const hasOptionalValues = () => {
    const values = form.getValues();
    return !!(imageFiles.length > 0 || values.storeId || values.url || values.phoneNumber || fileFiles.length > 0);
  };

  // カスタム日数モーダル状態
  const [showCustomDaysModal, setShowCustomDaysModal] = useState(false);
  const [customDays, setCustomDays] = useState(7);

  // 日数設定の処理
  const handleCustomDaysSet = () => {
    if (customDays > 0 && customDays <= 90) {
      form.setValue('customExpiryDays', customDays);
      setShowCustomDaysModal(false);
    }
  };

  // 🔥 イベント日付変更時の掲載期間自動更新
  useEffect(() => {
    if (eventStartDate && eventStartDate.trim() !== '') {
      const calculatedDays = calculateEventExpiryDays(eventStartDate, eventEndDate);
      form.setValue('customExpiryDays', calculatedDays, { shouldValidate: true });
    }
  }, [eventStartDate, eventEndDate, form]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (session) {
    return (
      <div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="container mx-auto max-w-lg p-4 md:p-8"
        >
          {/* パンくずリスト */}
          <div className="mb-4">
            <Breadcrumb />
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(triggerConfirmationModal)} className="space-y-6 pb-20">
              {/* カテゴリー選択 */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xl flex font-semibold items-center">
                      <Tag className="mr-2 h-6 w-6" /> カテゴリー<span className="text-destructive ml-1">※</span>
                    </FormLabel>
                    <FormControl>
                      <Select
                        value={selectedCategory}
                        onValueChange={(value: PostCategory) => {
                          setSelectedCategory(value);
                          field.onChange(value);
                        }}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="イベント情報">イベント情報</SelectItem>
                          <SelectItem value="聖地巡礼">聖地巡礼</SelectItem>
                          <SelectItem value="観光スポット">観光スポット</SelectItem>
                          <SelectItem value="温泉">温泉</SelectItem>
                          <SelectItem value="グルメ">グルメ</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 投稿内容（必須） */}
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xl flex font-semibold items-center justify-between">
                      <div className="flex items-center">
                        <ClipboardList className="mr-2 h-6 w-6" /> 投稿内容<span className="text-destructive ml-1">※</span>
                      </div>
                      {selectedCategory === 'イベント情報' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowTemplateModal(true)}
                          className="text-[#73370c] hover:text-[#5c2b0a] hover:bg-[#fef3e8] text-sm font-normal"
                        >
                          定型文
                        </Button>
                      )}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Textarea
                          placeholder={`${selectedCategory}を投稿してみよう。（800文字以内）`}
                          className="resize-none"
                          style={{ fontSize: '16px', minHeight: '140px' }}
                          rows={7}
                          maxLength={800}
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck="false"
                          {...field}
                        />
                        <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white px-1 rounded">
                          {field.value?.length || 0}/800
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 掲載期間 */}
              {selectedCategory === 'イベント情報' ? (
                <FormField
                  control={form.control}
                  name="customExpiryDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xl flex font-semibold items-center">
                        <ClockIcon className="mr-2 h-6 w-6" /> 掲載期間<span className="text-destructive ml-1">※</span>
                      </FormLabel>
                      {form.getValues('customExpiryDays') ? (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <span className="text-sm text-blue-800">
                                設定期間: {form.getValues('customExpiryDays')}日間
                              </span>
                              {eventStartDate && (
                                <div className="text-xs text-blue-600 mt-1">
                                  📅 開催日に基づいて自動計算されました
                                  {eventEndDate ? 
                                    ` (本日〜${eventEndDate})` : 
                                    ` (本日〜${eventStartDate})`
                                  }
                                </div>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowCustomDaysModal(true)}
                              disabled={Boolean(eventStartDate)}
                            >
                              {eventStartDate ? '自動計算' : '変更'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <ClockIcon className="h-4 w-4 text-amber-600" />
                            <span className="text-sm text-amber-800">
                              開催期日を入力すると掲載期間が自動計算されます
                            </span>
                          </div>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="expiryOption"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xl flex font-semibold items-center">
                        <ClockIcon className="mr-2 h-6 w-6" /> 掲載期間<span className="text-destructive ml-1">※</span>
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="掲載期間を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="90days">90日間</SelectItem>
                            <SelectItem value="unlimited">期間を設けない（手動削除まで表示）</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* 詳細情報セクション */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between p-3 bg-[#73370c] text-white rounded-lg shadow-md">
                  <div className="flex items-center">
                    <Settings className="mr-2 h-6 w-6 text-white" />
                    <h3 className="text-lg font-semibold">詳細情報</h3>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOptionalFields(!showOptionalFields)}
                    className="text-white hover:text-white hover:bg-[#5c2b0a]"
                  >
                    {showOptionalFields ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </Button>
                </div>

                {showOptionalFields && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    className="space-y-3"
                      >
                        {getCategoryFields(selectedCategory).map((field) => {
                      const fieldInfo = getFieldDisplayInfo(field);
                      const Icon = fieldInfo.icon;
                          const isExpanded = optionalFieldsExpanded[field] || false;
                      const isRequired = (selectedCategory === 'イベント情報' && (field === 'eventName' || field === 'eventDate' || field === 'location')) || 
                                        (selectedCategory !== 'イベント情報' && field === 'location');
                          
                          return (
                        <motion.div
                          key={field}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                          className={cn(
                            "border rounded-lg overflow-hidden transition-all",
                            isExpanded ? "border-[#73370c] shadow-md" : "border-gray-200"
                          )}
                        >
                          <div
                            className={cn(
                              "flex items-center justify-between p-3 cursor-pointer transition-colors",
                              isExpanded ? "bg-[#fef3e8]" : "bg-gray-50 hover:bg-gray-100"
                            )}
                            onClick={() => toggleOptionalField(field as keyof typeof optionalFieldsExpanded)}
                          >
                            <div className="flex items-center">
                              <Icon className={cn("mr-2 h-5 w-5", isExpanded ? "text-[#73370c]" : "text-gray-600")} />
                              <span className={cn("font-bold", isExpanded ? "text-[#73370c]" : "text-gray-700")}>
                                {fieldInfo.label}
                                {isRequired && <span className="text-destructive ml-1">※</span>}
                              </span>
                            </div>
                            {isExpanded ? <ChevronUp className="h-5 w-5 text-[#73370c]" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                          </div>

                          {isExpanded && (
                        <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="p-4 bg-white border-t"
                            >
                              {/* 場所フィールド */}
                              {field === 'location' && (
                                <PlaceAutocompleteField
                                  form={form}
                                  isLoaded={isLoaded}
                                  loadError={loadError}
                                  selectedPlace={selectedPlace}
                                  setSelectedPlace={setSelectedPlace}
                                  locationStatus={locationStatus}
                                  setLocationStatus={setLocationStatus}
                                  LocationStatusIndicator={LocationStatusIndicator}
                                />
                              )}

                              {/* イベント名フィールド（イベント情報のみ） */}
                              {field === 'eventName' && selectedCategory === 'イベント情報' && (
                          <FormField
                            control={form.control}
                            name="eventName"
                            render={({ field }) => (
                              <FormItem>
                                      <FormLabel>イベント名<span className="text-destructive ml-1">※</span></FormLabel>
                                <FormControl>
                                        <Textarea
                                          placeholder="例: 春の桜まつり"
                                          className="resize-none"
                                    style={{ fontSize: '16px' }}
                                          rows={2}
                                          maxLength={100}
                                          {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                              )}

                              {/* 開催期日フィールド（イベント情報のみ） */}
                              {field === 'eventDate' && selectedCategory === 'イベント情報' && (
                                <div className="space-y-4">
                                  <FormField
                                    control={form.control}
                                    name="eventStartDate"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>開催開始日<span className="text-destructive ml-1">※</span></FormLabel>
                                        <FormControl>
                                          <input
                                            type="date"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#73370c]"
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="eventEndDate"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>開催終了日（任意）</FormLabel>
                                        <FormControl>
                                          <input
                                            type="date"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#73370c]"
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              )}

                              {/* 料金フィールド（イベント情報のみ） */}
                              {field === 'eventPrice' && selectedCategory === 'イベント情報' && (
                          <FormField
                            control={form.control}
                            name="eventPrice"
                            render={({ field }) => (
                              <FormItem>
                                      <FormLabel>料金</FormLabel>
                                <FormControl>
                                        <Textarea
                                          placeholder="例: 無料、大人1,000円、子供500円"
                                          className="resize-none"
                                    style={{ fontSize: '16px' }}
                                          rows={2}
                                          maxLength={50}
                                          {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                              )}

                              {/* エリア情報フィールド */}
                              {field === 'eventArea' && (
                          <div className="space-y-4">
                              <FormField
                                control={form.control}
                                name="prefecture"
                                render={({ field }) => (
                                  <FormItem>
                                        <FormLabel>都道府県</FormLabel>
                                    <FormControl>
                                          <Textarea
                                            placeholder="例: 東京都"
                                            className="resize-none"
                                        style={{ fontSize: '16px' }}
                                            rows={1}
                                            maxLength={20}
                                            {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="city"
                                render={({ field }) => (
                                  <FormItem>
                                        <FormLabel>市区町村</FormLabel>
                                    <FormControl>
                                          <Textarea
                                            placeholder="例: 渋谷区"
                                            className="resize-none"
                                        style={{ fontSize: '16px' }}
                                            rows={1}
                                            maxLength={50}
                                            {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                              )}

                              {/* リンクフィールド */}
                              {field === 'url' && (
                          <FormField
                            control={form.control}
                            name="url"
                            render={({ field }) => (
                              <FormItem>
                                      <FormLabel>リンク</FormLabel>
                                  <FormControl>
                                        <Textarea
                                    placeholder="https://example.com"
                                          className="resize-none"
                                    style={{ fontSize: '16px' }}
                                          rows={2}
                                          {...field}
                                  />
                                  </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                              )}

                              {/* 画像フィールド */}
                              {field === 'image' && (
                              <div className="space-y-4">
                                  <div>
                                    <Label className="text-sm font-medium mb-2 block">画像をアップロード（最大5枚）</Label>
                                    <input
                                    type="file"
                                      accept="image/*"
                                    multiple
                                    onChange={handleImageUpload}
                                    className="hidden"
                                      id="image-upload"
                                    />
                                    <label
                                      htmlFor="image-upload"
                                      className="cursor-pointer flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#73370c] hover:bg-[#fef3e8] transition-colors"
                                    >
                                      <div className="text-center">
                                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                        <p className="mt-2 text-sm text-gray-600">クリックして画像を選択</p>
                                        <p className="text-xs text-gray-500">JPG, PNG, WEBP（各5MB以下）</p>
                                      </div>
                                    </label>
                                  </div>

                                  {imagePreviewUrls.length > 0 && (
                                    <div className="grid grid-cols-2 gap-3">
                                        {imagePreviewUrls.map((url, index) => (
                                          <div key={index} className="relative group">
                                              <img 
                                                src={url} 
                                            alt={`Preview ${index + 1}`}
                                            className="w-full h-32 object-cover rounded-lg border border-gray-200"
                                              />
                                          <button
                                              type="button"
                                              onClick={() => removeImage(index)}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                            <X className="h-4 w-4" />
                                          </button>
                                          </div>
                                        ))}
                                      </div>
                                      )}
                                    </div>
                              )}

                              {/* 電話番号フィールド */}
                              {field === 'phoneNumber' && (
                          <FormField
                            control={form.control}
                            name="phoneNumber"
                            render={({ field }) => (
                              <FormItem>
                                      <FormLabel>電話番号</FormLabel>
                                <FormControl>
                                        <Textarea
                                          placeholder="例: 03-1234-5678"
                                          className="resize-none"
                                    style={{ fontSize: '16px' }}
                                          rows={1}
                                          maxLength={15}
                                          {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                              )}

                              {/* ファイルフィールド（イベント情報のみ） */}
                              {field === 'file' && selectedCategory === 'イベント情報' && (
                              <div className="space-y-4">
                                  <div>
                                    <Label className="text-sm font-medium mb-2 block">ファイルをアップロード（最大3つ）</Label>
                                    <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                                    multiple
                                    onChange={handleFileUpload}
                                    className="hidden"
                                      id="file-upload"
                                    />
                                    <label
                                      htmlFor="file-upload"
                                      className="cursor-pointer flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#73370c] hover:bg-[#fef3e8] transition-colors"
                                    >
                                      <div className="text-center">
                                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                        <p className="mt-2 text-sm text-gray-600">クリックしてファイルを選択</p>
                                        <p className="text-xs text-gray-500">PDF, Word, Excel（各10MB以下）</p>
                                      </div>
                                    </label>
                                  </div>

                                  {fileFiles.length > 0 && (
                                    <div className="space-y-2">
                                        {fileFiles.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                                            <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                                            <span className="text-sm text-gray-700 truncate">{file.name}</span>
                                            </div>
                                          <button
                                              type="button"
                                              onClick={() => removeFile(index)}
                                            className="ml-2 text-red-500 hover:text-red-700 flex-shrink-0"
                                            >
                                            <X className="h-5 w-5" />
                                          </button>
                                          </div>
                                        ))}
                                      </div>
                                      )}
                                    </div>
                              )}

                              {/* チェックイン対象フラグ */}
                              {field === 'enableCheckin' && (
                                <FormField
                                  control={form.control}
                                  name="enableCheckin"
                                  render={({ field }) => (
                                    <FormItem>
                                      <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border-2 border-[#73370c]/20">
                                        <div className="flex items-start space-x-3">
                                          <input
                                            type="checkbox"
                                            id="enable-checkin"
                                            checked={field.value}
                                            onChange={(e) => field.onChange(e.target.checked)}
                                            className="mt-1 h-5 w-5 rounded border-gray-300 text-[#73370c] focus:ring-[#73370c]"
                                          />
                                          <div className="flex-1">
                                            <Label htmlFor="enable-checkin" className="cursor-pointer text-base font-semibold text-[#73370c]">
                                              📍 GPSチェックイン対象にする
                                            </Label>
                                            <p className="text-sm text-gray-600 mt-1">
                                              有効にすると、ユーザーが現地でGPSチェックインできるようになります。（500m以内）
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}

                              {/* コラボフィールド（新規カテゴリーのみ） */}
                              {field === 'collaboration' && selectedCategory !== 'イベント情報' && (
                                <FormField
                                  control={form.control}
                                  name="collaboration"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>コラボ</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="コラボ情報を入力してください"
                                          className="resize-none"
                                          style={{ fontSize: '16px' }}
                                          rows={3}
                                          maxLength={200}
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}
                        </motion.div>
                      )}
                        </motion.div>
                                    );
                                  })}
                            </motion.div>
                          )}
                        </motion.div>
              
              {submitError && (
                <p className="text-sm text-destructive text-center bg-destructive/10 p-3 rounded-md">{submitError}</p>
              )}

              <motion.div whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  disabled={!isValid || isSubmitting || isUploading}
                  className={cn(
                    "w-full text-xl py-3",
                    (!isValid || isSubmitting || isUploading) && "bg-gray-400 cursor-not-allowed hover:bg-gray-400"
                  )}
                >
                  {(isSubmitting || isUploading) ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      投稿する
                    </>
                  ) : (
                    "投稿する"
                  )}
                </Button>
                <p className="text-sm text-destructive text-center mt-2">※は 必須入力です</p>
              </motion.div>
            </form>
          </Form>

          {/* モーダル類 */}
          <CustomModal
            isOpen={showConfirmModal}
            onClose={() => {
              setShowConfirmModal(false);
              setFormDataToSubmit(null);
            }}
            title="投稿内容の確認"
          >
            <div className="pt-2">
              <p className="text-sm text-destructive mb-4">
                投稿した記事は後から編集を行うことはできません。
                内容をよくご確認の上、本当に投稿しますか？
              </p>
              <div className="mt-6 flex justify-end space-x-3">
                <Button variant="outline" onClick={() => {
                  setShowConfirmModal(false);
                  setFormDataToSubmit(null);
                }} disabled={isUploading}>
                  キャンセル
                </Button>
                <Button onClick={handleConfirmSubmit} disabled={isUploading}>
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "OK"}
                </Button>
              </div>
            </div>
          </CustomModal>

          <CustomModal
            isOpen={showCustomDaysModal}
            onClose={() => setShowCustomDaysModal(false)}
            title="イベント掲載期間の設定"
          >
            <div className="pt-2 space-y-4">
              <p className="text-sm text-gray-600">
                イベントの掲載期間を設定してください（1-90日）
              </p>
              
              <div>
                <Label className="text-sm font-medium">日数</Label>
                <Select 
                  value={String(customDays)} 
                  onValueChange={(value) => setCustomDays(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {Array.from({ length: 90 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={String(day)}>
                        {day}日間
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCustomDaysModal(false)}
                >
                  キャンセル
                </Button>
                <Button 
                  onClick={handleCustomDaysSet}
                  disabled={customDays < 1 || customDays > 90}
                >
                  設定
                </Button>
              </div>
            </div>
          </CustomModal>

          <CustomModal
            isOpen={showTemplateModal}
            onClose={() => setShowTemplateModal(false)}
            title="定型文を選択"
          >
            <div className="pt-2 space-y-4">
              <p className="text-sm text-gray-600">
                以下から定型文を選択して投稿内容に適用できます。適用後に編集も可能です。
              </p>
              
                <div className="space-y-3 max-h-96 overflow-y-auto">
                {templateTexts.map((template, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="border border-gray-200 rounded-lg p-4 hover:border-[#73370c] hover:bg-[#fef3e8] transition-all cursor-pointer"
                      onClick={() => applyTemplate(template)}
                    >
                      <div className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">
                        {template}
                      </div>
                      <div className="mt-2 flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-xs"
                        >
                          この定型文を使用
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowTemplateModal(false)}
                >
                  キャンセル
                </Button>
              </div>
            </div>
          </CustomModal>
        </motion.div>
      </div>
    );
  }

  return null;
}

// 🔥 場所検索コンポーネント
interface PlaceAutocompleteFieldProps {
  form: any;
  isLoaded: boolean;
  loadError: Error | null;
  selectedPlace: google.maps.places.PlaceResult | null;
  setSelectedPlace: (place: google.maps.places.PlaceResult | null) => void;
  locationStatus: 'none' | 'getting' | 'success' | 'error';
  setLocationStatus: (status: 'none' | 'getting' | 'success' | 'error') => void;
  LocationStatusIndicator: React.FC;
}

function PlaceAutocompleteField({
  form,
  isLoaded,
  loadError,
  selectedPlace,
  setSelectedPlace,
  locationStatus,
  setLocationStatus,
  LocationStatusIndicator
}: PlaceAutocompleteFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  
  // 🔥 現在地の緯度経度を取得
  const { latitude, longitude } = useGeolocation();

  useEffect(() => {
    if (!isLoaded || !inputRef.current || loadError) return;

    const options: google.maps.places.AutocompleteOptions = {
      componentRestrictions: { country: 'jp' },
      fields: ['place_id', 'name', 'geometry'],
      types: ['establishment']
    };

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, options);
    autocompleteRef.current = autocomplete;
    
    // 🔥 現在地がある場合、その周辺を優先的に検索
    if (latitude && longitude) {
      const bounds = new window.google.maps.LatLngBounds();
      const center = new window.google.maps.LatLng(latitude, longitude);
      
      // 約50km四方の範囲を作成
      const offset = 0.45; // 約50km
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
      
      // 場所名のみを使用（住所は含めない）
      const placeName = place.name || '';

      form.setValue('storeId', place.place_id || '', { shouldValidate: true });
      form.setValue('storeName', placeName, { shouldValidate: true });
      form.setValue('store_latitude', lat, { shouldValidate: true });
      form.setValue('store_longitude', lng, { shouldValidate: true });

      setSelectedPlace(place);
      setLocationStatus('success');
    });

    return () => {
      if (listener) {
        window.google.maps.event.removeListener(listener);
      }
    };
  }, [isLoaded, loadError, form, setSelectedPlace, setLocationStatus, latitude, longitude]);

  if (loadError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm text-red-800">Google Maps APIの読み込みに失敗しました</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center space-x-2 p-4">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        <span className="text-sm text-gray-600">Google Maps APIを読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <FormField
        control={form.control}
        name="storeName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>場所を検索<span className="text-destructive ml-1">※</span></FormLabel>
            <FormControl>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="店舗名や施設名で検索..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#73370c]"
                  style={{ fontSize: '16px' }}
                  defaultValue={field.value}
                />
                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#73370c] pointer-events-none" />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <LocationStatusIndicator />
    </div>
  );
}