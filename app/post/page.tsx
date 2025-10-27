"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Camera, Upload, X, Store as StoreIcon, LayoutGrid, ClipboardList, Image as ImageIcon, ClockIcon, PackageIcon, Tag, HelpCircle, MapPin, CheckCircle, Layers, ChevronDown, ChevronUp, Settings, Link as LinkIcon, FileText, HandCoins, Users, Phone, BarChart3, Star as StarIcon, CalendarDays } from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { Store } from '@/types/store';
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { supabase } from '@/lib/supabaseClient';
import { calculateExpiresAt } from '@/lib/expires-at-date';
import { v4 as uuidv4 } from 'uuid';
import FavoriteStoreInput from '@/components/profile/FavoriteStoreInput';
import { CustomModal } from '@/components/ui/custom-modal';
import { useToast } from "@/hooks/use-toast";
import { useLoading } from '@/contexts/loading-context';
import { useGoogleMapsApi } from '@/components/providers/GoogleMapsApiProvider';
import { Heart, Plus } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

declare global {
  interface Window {
    google: any;
  }
}

// 🔥 イベント情報専用のバリデーションスキーマ
const postSchema = z.object({
  storeId: z.string().min(1, { message: '場所の選択は必須です' }),
  storeName: z.string().min(1, { message: '場所の選択は必須です' }),
  category: z.literal('イベント情報'),
  content: z.string().min(5, { message: '5文字以上入力してください' }).max(400, { message: '400文字以内で入力してください' }),
  url: z.string().url({ message: '有効なURLを入力してください' }).optional().or(z.literal('')),
  expiryOption: z.literal('days'),
  customExpiryDays: z.number().min(1, { message: '1日以上を設定してください' }).max(90, { message: '90日以下を設定してください' }),
  // 位置情報フィールド（必須）
  location_lat: z.number(),
  location_lng: z.number(),
  store_latitude: z.number(),
  store_longitude: z.number(),
  phoneNumber: z.string().max(15).optional(),
  // 🔥 イベント情報用フィールド（必須）
  eventName: z.string().min(1, { message: 'イベント名の入力は必須です' }).max(100),
  eventStartDate: z.string().min(1, { message: '開催開始日の入力は必須です' }),
  eventEndDate: z.string().optional(),
  eventPrice: z.string().max(50).optional(),
  // 🔥 エリア情報フィールド
  prefecture: z.string().max(20).optional(),
  city: z.string().max(50).optional(),
}).refine((data) => {
  // 開催終了日が入力されている場合は、開始日より後の日付であることをチェック
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

type PostFormValues = z.infer<typeof postSchema>;

type DisplayStore = Pick<Store, 'name'> & { id: string };

const libraries: ("places")[] = ["places"];

// イベント情報のみ対応

// 🔥 イベント情報専用定型文データ
const templateTexts = {
  'イベント情報': [
    '【イベント開催】\n楽しいイベントを開催します！\n・内容: \n・対象: \n・持ち物: ',
    '【ワークショップ開催】\nワークショップを開催します。\n・テーマ: \n・定員: \n・申込方法: ',
    '【セール開催】\n特別セールを開催中！\n・対象商品: \n・割引内容: \n・期間限定: ',
    '【体験会実施】\n体験会を実施します。\n・体験内容: \n・所要時間: \n・参加費: ',
    '【地域イベント】\n地域のみなさまにお楽しみいただけるイベントです。\n・日時: \n・場所: \n・参加方法: ',
    '【フェスティバル】\n年に一度の特別なフェスティバルを開催！\n・見どころ: \n・出店: \n・アクセス: ',
  ],
};

// 🔥 イベント情報の掲載期間を自動計算する関数
const calculateEventExpiryDays = (startDate: string, endDate?: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 時刻を00:00:00にリセット
  
  // 開催終了日がある場合はそれを使用、なければ開始日を使用
  const targetDateStr = endDate && endDate.trim() !== '' ? endDate : startDate;
  const targetDate = new Date(targetDateStr);
  targetDate.setHours(23, 59, 59, 999); // 対象日の23:59:59に設定
  
  // 本日から対象日までの日数を計算
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // 最小1日、最大90日に制限
  return Math.max(1, Math.min(90, diffDays));
};

// イベント情報の表示項目
const eventFields = ['location', 'eventName', 'eventDate', 'eventPrice', 'eventArea', 'url', 'image', 'phoneNumber', 'file'];

// イベント情報用フィールドの表示名とアイコン
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
  };
  
  return fieldMap[field as keyof typeof fieldMap] || { label: field, icon: HelpCircle };
};

export default function PostPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  // 🔥 複数画像対応
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [formDataToSubmit, setFormDataToSubmit] = useState<PostFormValues | null>(null);
  
  // 企業設定の状態管理
  const [userRole, setUserRole] = useState<string | null>(null);
  const [businessSettings, setBusinessSettings] = useState<{
    business_url?: string | null;
    business_store_id?: string | null;
    business_store_name?: string | null;
    business_default_content?: string | null;
    business_default_phone?: string | null;
    business_default_image_path?: string | null;
    business_default_coupon?: string | null;
  } | null>(null);
  
  // 企業設定のデフォルト画像URL用の状態
  const [businessDefaultImageUrls, setBusinessDefaultImageUrls] = useState<string[]>([]);
  
  // 🔥 複数ファイル対応を追加
  const [fileFiles, setFileFiles] = useState<File[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);

  const {
    latitude,
    longitude,
    loading: locationLoading,
    error: locationError,
    permissionState,
    requestLocation
  } = useGeolocation();

  const [loading, setLoading] = useState(false);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const storeInputRef = useRef<HTMLInputElement>(null);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [storeAddress, setStoreAddress] = useState<string>('');
  const { showLoading, hideLoading } = useLoading();
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  
  // 位置情報取得状況の表示用
  const [locationStatus, setLocationStatus] = useState<'none' | 'getting' | 'success' | 'error'>('none');

  // refを追加：内容フィールドへのフォーカス用
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const { isLoaded, loadError } = useGoogleMapsApi();

  // イベント情報専用フォーム設定
  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      storeId: '',
      storeName: '',
      category: 'イベント情報',
      content: '',
      url: '',
      expiryOption: 'days',
      customExpiryDays: 7,
      location_lat: undefined,
      location_lng: undefined,
      store_latitude: undefined,
      store_longitude: undefined,
      phoneNumber: '',
      eventName: '',
      eventStartDate: '',
      eventEndDate: '',
      eventPrice: '',
      prefecture: '',
      city: '',
    },
    mode: 'onChange',
  });
  
  const { formState: { isValid, isSubmitting } } = form;
  
  const selectedCategory = form.watch('category'); // ジャンルからカテゴリに変更
  const selectedExpiryOption = form.watch('expiryOption');
  const watchedFormValues = form.watch();
  
  // 🔥 イベント日付の監視
  const eventStartDate = form.watch('eventStartDate');
  const eventEndDate = form.watch('eventEndDate');

  // 🔥 Stripe設定状態を管理
  const [stripeSetupStatus, setStripeSetupStatus] = useState<{
    hasAccount: boolean;
    onboardingCompleted: boolean;
    loading: boolean;
  }>({
    hasAccount: false,
    onboardingCompleted: false,
    loading: false
  });

  // 🔥 Stripe設定確認モーダルの状態
  const [showStripeSetupModal, setShowStripeSetupModal] = useState(false);

  // 企業設定変更案内モーダルの状態
  const [showBusinessSettingsModal, setShowBusinessSettingsModal] = useState(false);

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

  // 🔥 複数ファイルのクリーンアップ
  useEffect(() => {
    return () => {
      filePreviewUrls.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [filePreviewUrls]);

  // 🔥 複数ファイルのプレビュー処理
  useEffect(() => {
    if (fileFiles.length > 0) {
      const newPreviewUrls: string[] = [];
      fileFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviewUrls.push(reader.result as string);
          if (newPreviewUrls.length === fileFiles.length) {
            setFilePreviewUrls(newPreviewUrls);
          }
        };
        reader.readAsDataURL(file);
      });
    } else {
      setFilePreviewUrls([]);
    }
  }, [fileFiles]);

  // 🔥 企業設定の店舗位置情報を取得する関数
  const fetchBusinessStoreLocation = useCallback(() => {
    if (!businessSettings?.business_store_id) return;
    
    const fetchLocation = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        try {
          const service = new window.google.maps.places.PlacesService(document.createElement('div'));
          const request = {
            placeId: businessSettings.business_store_id,
            fields: ['geometry']
          };
          
          service.getDetails(request, (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              form.setValue('store_latitude', lat);
              form.setValue('store_longitude', lng);
              form.setValue('location_lat', lat);
              form.setValue('location_lng', lng);
              console.log('企業設定: 店舗位置情報を設定しました', { lat, lng, storeId: businessSettings.business_store_id });
            } else {
              console.warn('企業設定: 店舗位置情報の取得に失敗しました', status);
            }
          });
        } catch (error) {
          console.error('企業設定: 店舗位置情報の取得エラー:', error);
        }
      } else {
        // Google Maps APIが読み込まれていない場合は少し待ってから再試行
        setTimeout(fetchLocation, 1000);
      }
    };
    
    // 少し遅延させてから実行（Google Maps APIの読み込み完了を待つ）
    setTimeout(fetchLocation, 500);
  }, [businessSettings?.business_store_id, form]);

  // イベント情報の必須フィールドを自動展開
  useEffect(() => {
    // 初期表示時に必須フィールドを展開
    setShowOptionalFields(true);
    setOptionalFieldsExpanded({
      image: false,
      location: true,
      url: false,
      phoneNumber: false,
      file: false,
      eventName: true,
      eventDate: true,
      eventPrice: false,
      eventArea: false,
    });
    
    // 企業設定の場合は位置情報を再取得
    if (businessSettings?.business_store_id) {
      fetchBusinessStoreLocation();
    }
  }, [businessSettings?.business_store_id, fetchBusinessStoreLocation]);
  
  // イベント情報投稿処理
  const handleActualSubmit = async (values: PostFormValues) => {
    if (!session?.user?.id) {
      console.log("PostPage: User not logged in, redirecting to login page.");
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    // 必須フィールドの検証
    if (!values.content || values.content.length < 5) {
      setSubmitError("投稿内容を5文字以上入力してください。");
      return;
    }

    if (!values.customExpiryDays || values.customExpiryDays < 1 || values.customExpiryDays > 90) {
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

    form.clearErrors("root.serverError");
    showLoading();
    setIsUploading(true);
    setSubmitError(null);
    setShowConfirmModal(false);

    let imageUrls: string[] = [];
    let fileUrls: string[] = [];
    let createdPostId: string | null = null;

    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('app_profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (profileError || !userProfile) {
        console.error("PostPage: Error fetching user profile or profile not found:", profileError);
        throw new Error("投稿者のプロフィール情報が見つかりません。");
      }
      const appProfileId = userProfile.id;

      // 🔥 複数画像のアップロード処理
      if (imageFiles.length > 0) {
        const uploadPromises = imageFiles.map(async (file, index) => {
          const fileExt = file.name.split('.').pop();
          const userFolder = session.user.id;
          const uniqueFileName = `${uuidv4()}_${index}.${fileExt}`;
          const objectPath = `${userFolder}/${uniqueFileName}`;

          const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(objectPath, file, {
              cacheControl: '3600',
              upsert: true,
            });

          if (uploadError) {
            console.error("PostPage: Error uploading image to Supabase Storage:", uploadError);
            throw new Error(`画像のアップロードに失敗しました: ${uploadError.message}`);
          }
          
          const { data: publicUrlData } = supabase.storage
            .from('images')
            .getPublicUrl(objectPath);
          
          return publicUrlData?.publicUrl || null;
        });

        const uploadedUrls = await Promise.all(uploadPromises);
        imageUrls = uploadedUrls.filter(url => url !== null) as string[];
        
        console.log("PostPage: Multiple images uploaded to Supabase Storage. Public URLs:", imageUrls);
      }

      // 企業設定のデフォルト画像URLがある場合は追加
      if (businessDefaultImageUrls.length > 0 && imageFiles.length === 0) {
        imageUrls = [...businessDefaultImageUrls];
        console.log("PostPage: Using business default image URLs:", imageUrls);
      }

      // 🔥 複数ファイルのアップロード処理
      if (fileFiles.length > 0) {
        const uploadPromises = fileFiles.map(async (file, index) => {
          const fileExt = file.name.split('.').pop();
          const userFolder = session.user.id;
          const uniqueFileName = `${uuidv4()}_${index}.${fileExt}`;
          const objectPath = `${userFolder}/${uniqueFileName}`;

          const { error: uploadError } = await supabase.storage
            .from('files')
            .upload(objectPath, file, {
              cacheControl: '3600',
              upsert: true,
            });

          if (uploadError) {
            console.error("PostPage: Error uploading file to Supabase Storage:", uploadError);
            throw new Error(`ファイルのアップロードに失敗しました: ${uploadError.message}`);
          }
          
          const { data: publicUrlData } = supabase.storage
            .from('files')
            .getPublicUrl(objectPath);
          
          return publicUrlData?.publicUrl || null;
        });

        const uploadedUrls = await Promise.all(uploadPromises);
        fileUrls = uploadedUrls.filter(url => url !== null) as string[];
        
        console.log("PostPage: Multiple files uploaded to Supabase Storage. Public URLs:", fileUrls);
      }

      // イベント情報投稿データを準備
      const postData: any = {
        app_profile_id: appProfileId,
        store_id: values.storeId || null,
        store_name: values.storeName || 'イベント情報',
        category: 'イベント情報',
        content: values.content,
        image_urls: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
        file_urls: fileUrls.length > 0 ? JSON.stringify(fileUrls) : null,
        url: values.url && values.url.trim() !== '' ? values.url : null,
        expiry_option: 'days',
        custom_expiry_minutes: (values.customExpiryDays || 7) * 24 * 60,
        expires_at: calculateExpiresAt('days', undefined, values.customExpiryDays).toISOString(),
        likes_count: 0,
        views_count: 0,
        comments_count: 0,
        is_deleted: false,
        phone_number: values.phoneNumber && values.phoneNumber.trim() !== '' ? values.phoneNumber : null,
        event_name: values.eventName,
        event_start_date: values.eventStartDate,
        event_end_date: values.eventEndDate && values.eventEndDate.trim() !== '' ? values.eventEndDate : null,
        event_price: values.eventPrice && values.eventPrice.trim() !== '' ? values.eventPrice : null,
        prefecture: values.prefecture && values.prefecture.trim() !== '' ? values.prefecture : null,
        city: values.city && values.city.trim() !== '' ? values.city : null,
        author_role: session?.user?.role === 'admin' ? 'admin' : 'user',
      };

      // 🔥 店舗の位置情報を設定（場所が選択された場合のみ）
      const storeLatitude = form.getValues("store_latitude");
      const storeLongitude = form.getValues("store_longitude");
      if (storeLatitude && storeLongitude) {
        postData.store_latitude = Number(storeLatitude);
        postData.store_longitude = Number(storeLongitude);
        postData.location_geom = `POINT(${storeLongitude} ${storeLatitude})`;
        
        console.log("PostPage: Setting store location data:", {
          store_latitude: postData.store_latitude,
          store_longitude: postData.store_longitude,
          location_geom: postData.location_geom
        });
      }

      // 🔥 端末の位置情報を設定
      if (latitude && longitude) {
        postData.user_latitude = Number(latitude);
        postData.user_longitude = Number(longitude);
        postData.user_location_geom = `POINT(${longitude} ${latitude})`;
      }

      const { data: insertedPost, error: insertError } = await supabase
        .from('posts')
        .insert(postData)
        .select('id, store_id, store_name, app_profile_id, store_latitude, store_longitude, user_latitude, user_longitude')
        .single();

      if (insertError || !insertedPost) {
        console.error("PostPage: Error inserting post:", insertError);
        throw new Error(`投稿の保存に失敗しました: ${insertError?.message || "Unknown error"}`);
      }
      
      createdPostId = insertedPost.id;
      console.log("PostPage: Post inserted successfully with ID:", createdPostId);

      // 通知処理（既存のコードを維持）
      if (createdPostId && insertedPost.store_id && insertedPost.store_name && insertedPost.app_profile_id) {
        try {
          const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-favorite-store-post`;
          const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              postId: createdPostId,
              storeId: insertedPost.store_id,
              storeName: insertedPost.store_name,
              postCreatorProfileId: insertedPost.app_profile_id,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('PostPage: Failed to call notify function:', response.status, errorData);
          } else {
            const result = await response.json();
            console.log('PostPage: Notify function called successfully:', result.message);
          }
        } catch (notifyError: any) {
          console.error('PostPage: Error calling notify function:', notifyError?.message || notifyError);
        }
      }

      // フォームリセット
      const resetValues = {
        storeId: businessSettings?.business_store_id || '',
        storeName: businessSettings?.business_store_name || '',
        category: 'イベント情報' as const,
        content: businessSettings?.business_default_content || '',
        url: businessSettings?.business_url || '',
        expiryOption: 'days' as const,
        customExpiryDays: 7,
        location_lat: undefined,
        location_lng: undefined,
        store_latitude: undefined,
        store_longitude: undefined,
        phoneNumber: businessSettings?.business_default_phone || '',
        eventName: '',
        eventStartDate: '',
        eventEndDate: '',
        eventPrice: '',
        prefecture: '',
        city: '',
      };
      
      form.reset(resetValues);
      setImageFiles([]);
      // 企業設定のデフォルト画像がある場合は保持
      if (businessDefaultImageUrls.length > 0) {
        setImagePreviewUrls([...businessDefaultImageUrls]);
      } else {
        setImagePreviewUrls([]);
      }
      setFileFiles([]);
      setFilePreviewUrls([]);
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

  const triggerConfirmationModal = (values: PostFormValues) => {
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

    // 既存の画像と新しい画像の合計が5枚を超えないかチェック
    if (imageFiles.length + files.length > 5) {
      toast({
        title: "⚠️ 画像枚数の上限を超えています",
        description: "画像は最大5枚まで投稿できます。",
        duration: 3000,
      });
      return;
    }

    // ファイルサイズと形式のチェック
    const maxSize = 5 * 1024 * 1024; // 5MB
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
      // 削除される画像のURLをクリーンアップ
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

    // 既存のファイルと新しいファイルの合計が3つを超えないかチェック
    if (fileFiles.length + files.length > 3) {
      toast({
        title: "⚠️ ファイル数の上限を超えています",
        description: "ファイルは最大3つまで投稿できます。",
        duration: 3000,
      });
      return;
    }

    // ファイルサイズと形式のチェック
    const maxSize = 10 * 1024 * 1024; // 10MB
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

  // 企業設定の読み込みとフォーム自動入力
  useEffect(() => {
    const loadBusinessSettings = async () => {
      if (!session?.user?.id) return;

      try {
        // ユーザーの役割を取得
        const { data: userData, error: userError } = await supabase
          .from('app_users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (!userError && userData) {
          setUserRole(userData.role);

          // businessユーザーの場合、企業設定を取得
          if (userData.role === 'business') {
            const { data: profileData, error: profileError } = await supabase
              .from('app_profiles')
              .select('business_url, business_store_id, business_store_name, business_default_content, business_default_phone, business_default_image_path, business_default_coupon')
              .eq('user_id', session.user.id)
              .single();

            if (!profileError && profileData) {
              setBusinessSettings(profileData);

              // フォームに自動入力
              if (profileData.business_url) {
                form.setValue('url', profileData.business_url);
              }
              if (profileData.business_store_id && profileData.business_store_name) {
                form.setValue('storeId', profileData.business_store_id);
                form.setValue('storeName', profileData.business_store_name);
              }
              // 追加設定項目の自動入力
              if (profileData.business_default_content) {
                form.setValue('content', profileData.business_default_content);
              }
              if (profileData.business_default_phone) {
                form.setValue('phoneNumber', profileData.business_default_phone);
              }
              if (profileData.business_default_coupon) {
                form.setValue('couponCode', profileData.business_default_coupon);
              }
              // デフォルト画像パスがある場合の処理
              if (profileData.business_default_image_path) {
                // 企業設定のデフォルト画像パスから公開URLを生成
                const { data: { publicUrl } } = supabase.storage
                  .from('images')
                  .getPublicUrl(profileData.business_default_image_path);
                setBusinessDefaultImageUrls([publicUrl]);
                setImagePreviewUrls([publicUrl]);
              }
                
              // 🔥 企業設定の位置情報を取得（共通関数を使用）
              if (profileData.business_store_id) {
                // 少し遅延させてから実行（businessSettingsの設定完了を待つ）
                setTimeout(() => {
                  fetchBusinessStoreLocation();
                }, 100);
              }
            }
          }
        }
      } catch (error) {
        console.error('企業設定の読み込みエラー:', error);
      }
    };

    if (status !== 'loading') {
      loadBusinessSettings();
    }
  }, [session?.user?.id, status, form, fetchBusinessStoreLocation]);

  // 🔥 位置情報取得の改善
  useEffect(() => {
    if (!latitude && !longitude && !locationLoading && !locationError) {
      console.log("PostPage: 位置情報の手動取得を試行");
      requestLocation();
    }
  }, [latitude, longitude, locationLoading, locationError, requestLocation]);

  // 🔥 投稿前の位置情報チェック
  const checkLocationBeforeSubmit = () => {
    if (!latitude || !longitude) {
      toast({
        title: "位置情報が必要です",
        description: "投稿を表示するために位置情報を許可してください",
        duration: 3000,
      });
      requestLocation();
      return false;
    }
    return true;
  };

  const getSelectPlaceholder = () => {
    if (permissionState === 'pending' || locationLoading) return "現在地を取得中...";
    if (permissionState === 'prompt') return "場所を検索するには位置情報の許可が必要です";
    if (permissionState === 'denied') return "位置情報がブロックされています";
    if (locationError) return `位置情報エラー: ${locationError}`;
    if (locationLoading) return "場所を検索中...";
    if (permissionState === 'granted' && latitude && longitude && !locationLoading) return "周辺500m以内に場所が見つかりません";
    return "場所を選択してください";
  };

  console.log("PostPage DEBUG:", {
    permissionState,
    latitude,
    longitude,
    locationLoading,
    locationError,
    availableStoresLength: 0,
    isSelectDisabled: (
      locationLoading ||
      !!locationError ||
      permissionState !== 'granted'
    ),
    currentPlaceholder: getSelectPlaceholder(),
  });

  // 🔥 Google Places API連携の確実な設定（モバイル最適化版）
  useEffect(() => {
    if (isLoaded && storeInputRef.current) {
      const newAutocomplete = new google.maps.places.Autocomplete(storeInputRef.current, {
        types: ['establishment'],
        componentRestrictions: { 'country': ['jp'] },
        // 🔥 モバイル向けの最適化オプション
        fields: ['place_id', 'name', 'geometry', 'formatted_address', 'types'],
      });
      
      // 🔥 検索結果を制限するためのカスタムフィルタリング
      const originalGetPredictions = (newAutocomplete as any).service?.getPlacePredictions;
      if (originalGetPredictions) {
        (newAutocomplete as any).service.getPlacePredictions = function(request: any, callback: any) {
          // 最大3件に制限
          const modifiedRequest = {
            ...request,
            // Google Places APIには公式の制限パラメータがないため、
            // 結果をフィルタリングで制限
          };
          
          originalGetPredictions.call(this, modifiedRequest, (predictions: any[], status: any) => {
            if (predictions) {
              // 結果を3件に制限
              const limitedPredictions = predictions.slice(0, 3);
              callback(limitedPredictions, status);
            } else {
              callback(predictions, status);
            }
          });
        };
      }

      // 🔥 検索候補のカスタム表示フォーマット
      const formatSearchResults = () => {
        setTimeout(() => {
          const pacContainer = document.querySelector('.pac-container') as HTMLElement;
          if (pacContainer) {
            const pacItems = pacContainer.querySelectorAll('.pac-item');
            
            pacItems.forEach((item) => {
              const pacItemQuery = item.querySelector('.pac-item-query');
              if (pacItemQuery) {
                // 店舗名と住所を分離
                const fullText = pacItemQuery.textContent || '';
                const parts = fullText.split(',');
                
                if (parts.length >= 2) {
                  const storeName = parts[0].trim();
                  const address = parts.slice(1).join(',').trim();
                  
                  // HTMLを再構築
                  pacItemQuery.innerHTML = `
                    <div style="font-weight: 600; font-size: 16px; color: #1f2937; margin-bottom: 4px; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${storeName}
                    </div>
                    <div style="font-size: 13px; color: #6b7280; font-weight: 400; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${address}
                    </div>
                  `;
                }
              }
            });
          }
        }, 100);
      };

      // 入力イベントでフォーマットを適用
      if (storeInputRef.current) {
        storeInputRef.current.addEventListener('input', formatSearchResults);
      }
      
      newAutocomplete.addListener('place_changed', () => {
        setLocationStatus('getting');
        const place = newAutocomplete.getPlace();
        
        console.log("PostPage: Place selected from Google Places:", place);
        
        if (place.geometry && place.geometry.location && place.name) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const storeName = place.name;
          
          console.log("PostPage: Setting location data from Google Places:", { lat, lng, storeName });
          
          // storeIdはplace_idまたは生成されたIDを使用
          const storeId = place.place_id || `google_${Date.now()}`;
          
          // フォームに店舗情報と位置情報を確実に設定
          form.setValue("storeId", storeId, { shouldValidate: true });
          form.setValue("storeName", storeName, { shouldValidate: true });
          form.setValue("location_lat", lat, { shouldValidate: true });
          form.setValue("location_lng", lng, { shouldValidate: true });
          form.setValue("store_latitude", lat, { shouldValidate: true });
          form.setValue("store_longitude", lng, { shouldValidate: true });
          
          setPlaceId(place.place_id || null);
          setStoreAddress(place.formatted_address || '');
          setSelectedPlace(place);
          setLocationStatus('success');
          
          toast({
            title: "✅ 店舗の位置情報を取得しました",
            description: `${storeName} (緯度: ${lat.toFixed(6)}, 経度: ${lng.toFixed(6)})`,
            duration: 1000,
          });
        } else {
          console.warn("PostPage: Place has no geometry, location, or name:", place);
          setLocationStatus('error');
          toast({
            title: "⚠️ 位置情報を取得できませんでした",
            description: "別の店舗を選択してください",
            duration: 3000,
          });
        }
      });
      setAutocomplete(newAutocomplete);
    }
  }, [isLoaded, form, toast]);

  // 位置情報状況表示コンポーネント
  const LocationStatusIndicator = () => {
    const lat = form.watch('store_latitude');
    const lng = form.watch('store_longitude');
    
    if (lat && lng) {
      return (
        <div className="flex items-center space-x-2 p-2 bg-green-50 border border-green-200 rounded-md">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-sm text-green-800">
            位置情報取得完了 (緯度: {lat.toFixed(6)}, 経度: ${lng.toFixed(6)})
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


  // オプション項目の表示状態管理（イベント情報専用）
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [optionalFieldsExpanded, setOptionalFieldsExpanded] = useState({
    image: false,
    location: false,
    url: false,
    phoneNumber: false,
    file: false,
    eventName: false,
    eventDate: false,
    eventPrice: false,
    eventArea: false,
  });

  // 企業設定で値が設定されているかチェックする関数
  const isBusinessFieldSet = (field: keyof typeof optionalFieldsExpanded): boolean => {
    if (userRole !== 'business' || !businessSettings) return false;
    
    switch (field) {
      case 'location':
        return !!(businessSettings.business_store_id && businessSettings.business_store_name);
      case 'url':
        return !!businessSettings.business_url;
      case 'image':
        return !!businessSettings.business_default_image_path;
      case 'coupon':
        return !!businessSettings.business_default_coupon;
      case 'phoneNumber':
        return !!businessSettings.business_default_phone;
      default:
        return false;
    }
  };

  // 企業設定変更案内モーダルを表示する関数
  const showBusinessSettingsGuide = () => {
    setShowBusinessSettingsModal(true);
  };

  // オプションフィールドの切り替え（イベント情報専用）
  const toggleOptionalField = (field: keyof typeof optionalFieldsExpanded) => {
    // 企業設定で値が設定されている場合はモーダルを表示
    if (isBusinessFieldSet(field)) {
      showBusinessSettingsGuide();
      return;
    }

    setOptionalFieldsExpanded(prev => {
      const newState = {
        ...prev,
        [field]: !prev[field]
      };

      // フィールドが閉じられるときに値をクリア
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
            setFilePreviewUrls([]);
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
    if (selectedCategory === 'イベント情報' && eventStartDate && eventStartDate.trim() !== '') {
      const calculatedDays = calculateEventExpiryDays(eventStartDate, eventEndDate);
      
      // 掲載期間を日数設定に変更し、計算された日数を設定
      form.setValue('expiryOption', 'days', { shouldValidate: true });
      form.setValue('customExpiryDays', calculatedDays, { shouldValidate: true });
      
      console.log(`イベント掲載期間を自動計算: ${calculatedDays}日 (開始: ${eventStartDate}, 終了: ${eventEndDate || '未設定'})`);
    }
  }, [selectedCategory, eventStartDate, eventEndDate, form]);

  if (status === "loading") {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (session) {
    return (
      <AppLayout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="container mx-auto max-w-lg p-4 md:p-8"
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(triggerConfirmationModal)} className="space-y-6 pb-20">
              
              {/* イベント情報タイトル */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-lg shadow-lg">
                <div className="flex items-center">
                  <CalendarDays className="mr-3 h-7 w-7" />
                  <div>
                    <h2 className="text-2xl font-bold">イベント情報を投稿</h2>
                    <p className="text-sm text-white/90 mt-1">地域のイベント情報を共有しましょう</p>
                  </div>
                </div>
              </div>

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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowTemplateModal(true)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 text-sm font-normal"
                      >
                        定型文
                      </Button>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Textarea
                          placeholder="イベント情報を投稿してみよう。（400文字以内）"
                          className="resize-none"
                          style={{ fontSize: '16px', minHeight: '140px' }}
                          rows={7}
                          maxLength={400}
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck="false"
                          {...field}
                          ref={(e) => {
                            field.ref(e);
                            (contentTextareaRef as any).current = e;
                          }}
                        />
                        <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white px-1 rounded">
                          {field.value?.length || 0}/400
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 掲載期間（イベント情報専用） */}
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

              {/* 🔥 カスタム掲載期間入力フィールドを削除 */}

              {/* 詳細情報（イベント情報専用） */}
              <div className="border rounded-lg bg-card">
                <motion.div
                  className="p-4 cursor-pointer select-none"
                  onClick={() => setShowOptionalFields(!showOptionalFields)}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-center">
                        <Settings className="mr-2 h-5 w-5 text-muted-foreground" />
                        <span className="text-lg font-semibold">詳細情報</span>
                        {hasOptionalValues() && (
                          <div className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            入力済み
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-red-600 mt-1 ml-7">
                        場所、イベント名、開催期日は必須です
                      </p>
                    </div>
                    {showOptionalFields ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </motion.div>

                {showOptionalFields && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t"
                  >
                    <div className="p-4 space-y-4">
                      {/* イベント情報項目のトグルボタン */}
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="grid grid-cols-2 gap-2"
                      >
                        {eventFields.map((field) => {
                          const { label, icon: Icon } = getFieldDisplayInfo(field);
                          const isExpanded = optionalFieldsExpanded[field as keyof typeof optionalFieldsExpanded];
                          const isBusinessSet = isBusinessFieldSet(field as keyof typeof optionalFieldsExpanded);
                          const isRequired = ['location', 'eventName', 'eventDate'].includes(field);
                          
                          return (
                            <motion.div
                              key={field}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.2, delay: eventFields.indexOf(field) * 0.05 }}
                            >
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => toggleOptionalField(field as keyof typeof optionalFieldsExpanded)}
                                className={`w-full justify-start transition-all duration-200 ${
                                  isBusinessSet
                                    ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
                                    : isExpanded 
                                    ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' 
                                    : 'bg-[#fafafa] text-[#73370c] border-gray-300 hover:bg-[#fafafa] hover:text-[#73370c]'
                                }`}
                              >
                                <Icon className="mr-2 h-4 w-4" />
                                {label}
                                {isRequired && <span className="ml-1 text-xs text-red-500">※</span>}
                                {isBusinessSet && <span className="ml-1 text-xs">(設定済み)</span>}
                              </Button>
                            </motion.div>
                          );
                        })}
                      </motion.div>

                      {/* 各詳細情報フィールドの表示 */}

                      {/* 1. 場所入力フィールド */}
                      {optionalFieldsExpanded.location && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FormField
                            control={form.control}
                            name="storeId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-lg font-semibold flex items-center">
                                  <StoreIcon className="mr-2 h-5 w-5" />
                                  場所
                                  {(selectedCategory === '空席情報' || selectedCategory === '在庫情報' || selectedCategory === 'イベント情報') && (
                                    <span className="text-destructive ml-1">※</span>
                                  )}
                                </FormLabel>
                                <FormControl>
                                  <div className="space-y-2">
                                    <div className="relative mobile-store-search">
                                      <FavoriteStoreInput
                                        value={{ id: field.value, name: form.getValues("storeName") }}
                                        onChange={async (store) => {
                                          if (store) {
                                            // 🔥 場所選択時にすべての位置情報を設定
                                            console.log("PostPage: Store selected from FavoriteStoreInput:", store);
                                            form.setValue("storeId", store.id, { shouldValidate: true });
                                            form.setValue("storeName", store.name, { shouldValidate: true });
                                            
                                            // 🔥 Google Places APIから詳細情報を取得
                                            if (window.google && window.google.maps && window.google.maps.places) {
                                              const service = new window.google.maps.places.PlacesService(document.createElement('div'));
                                              
                                              service.getDetails(
                                                {
                                                  placeId: store.id,
                                                  fields: ['geometry', 'name', 'formatted_address']
                                                },
                                                (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
                                                  if (status === window.google.maps.places.PlacesServiceStatus.OK && place && place.geometry && place.geometry.location) {
                                                    const lat = place.geometry.location.lat();
                                                    const lng = place.geometry.location.lng();
                                                    
                                                    console.log("PostPage: Setting location data from Places Details:", { lat, lng, name: place.name });
                                                    
                                                    // 🔥 位置情報を確実に設定
                                                    form.setValue("location_lat", lat, { shouldValidate: true });
                                                    form.setValue("location_lng", lng, { shouldValidate: true });
                                                    form.setValue("store_latitude", lat, { shouldValidate: true });
                                                    form.setValue("store_longitude", lng, { shouldValidate: true });
                                                    
                                                    setLocationStatus('success');
                                                    setSelectedPlace(place);
                                                    
                                                    toast({
                                                      title: "✅ 店舗の位置情報を取得しました",
                                                      description: `${place.name} (緯度: ${lat.toFixed(6)}, 経度: ${lng.toFixed(6)})`,
                                                      duration: 1000,
                                                    });
                                          } else {
                                                    console.warn("PostPage: Failed to get place details:", status);
                                                    setLocationStatus('error');
                                                    toast({
                                                      title: "⚠️ 位置情報を取得できませんでした",
                                                      description: "別の店舗を選択してください",
                                                      duration: 3000,
                                                    });
                                                  }
                                                }
                                              );
                                            }
                                          } else {
                                            // 🔥 場所をクリアした時はすべての位置情報をリセット
                                            form.setValue("storeId", "", { shouldValidate: true });
                                            form.setValue("storeName", "", { shouldValidate: true });
                                            form.setValue("location_lat", undefined, { shouldValidate: true });
                                            form.setValue("location_lng", undefined, { shouldValidate: true });
                                            form.setValue("store_latitude", undefined, { shouldValidate: true });
                                            form.setValue("store_longitude", undefined, { shouldValidate: true });
                                            setLocationStatus('none');
                                            setSelectedPlace(null);
                                          }
                                        }}
                                        placeholder="お店を検索または選択してください"
                                        style={{ fontSize: '16px' }}
                                      />
                                    </div>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      )}
                      {/* 11. イベント名フィールド */}
                      {optionalFieldsExpanded.eventName && isFieldVisibleForCategory('eventName', selectedCategory) && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FormField
                            control={form.control}
                            name="eventName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-lg font-semibold flex items-center">
                                  <CalendarDays className="mr-2 h-5 w-5" />
                                  イベント名<span className="text-destructive ml-1">※</span>
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="例: 春祭り、セール、ワークショップなど"
                                    {...field}
                                    style={{ fontSize: '16px' }}
                                    disabled={isUploading}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    spellCheck="false"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      )}
                      
                      {/* 12. 開催期日フィールド */}
                      {optionalFieldsExpanded.eventDate && isFieldVisibleForCategory('eventDate', selectedCategory) && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="space-y-4">
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                              <p className="text-sm text-amber-800">
                                💡 1日だけの開催の場合は、開始日のみ入力してください。複数日開催の場合は終了日も入力してください。
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="eventStartDate"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-lg font-semibold flex items-center">
                                      <CalendarDays className="mr-2 h-5 w-5" />
                                      開催開始日<span className="text-destructive ml-1">※</span>
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type="date"
                                        {...field}
                                        style={{ fontSize: '16px' }}
                                        disabled={isUploading}
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
                                    <FormLabel className="text-lg font-semibold flex items-center">
                                      <CalendarDays className="mr-2 h-5 w-5" />
                                      開催終了日<span className="text-sm text-gray-500 ml-1">（複数日開催の場合）</span>
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type="date"
                                        {...field}
                                        style={{ fontSize: '16px' }}
                                        disabled={isUploading}
                                        placeholder="1日開催の場合は空欄でOK"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                      
                      {/* 13. 料金フィールド */}
                      {optionalFieldsExpanded.eventPrice && isFieldVisibleForCategory('eventPrice', selectedCategory) && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FormField
                            control={form.control}
                            name="eventPrice"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-lg font-semibold flex items-center">
                                  <Tag className="mr-2 h-5 w-5" />
                                  料金
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="例: 無料、1000円、大人500円・子供300円など"
                                    {...field}
                                    style={{ fontSize: '16px' }}
                                    disabled={isUploading}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    spellCheck="false"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      )}

                      {/* 14. エリア情報フィールド */}
                      {optionalFieldsExpanded.eventArea && isFieldVisibleForCategory('eventArea', selectedCategory) && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="space-y-4">
                            <div className="flex items-center">
                              <MapPin className="mr-2 h-5 w-5" />
                              <span className="text-lg font-semibold">エリア情報</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* 都道府県 */}
                              <FormField
                                control={form.control}
                                name="prefecture"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-base font-medium">
                                      都道府県
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="例: 東京都、大阪府など"
                                        {...field}
                                        style={{ fontSize: '16px' }}
                                        disabled={isUploading}
                                        autoComplete="off"
                                        autoCorrect="off"
                                        autoCapitalize="off"
                                        spellCheck="false"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              {/* 市町村 */}
                              <FormField
                                control={form.control}
                                name="city"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-base font-medium">
                                      市町村
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="例: 渋谷区、大阪市など"
                                        {...field}
                                        style={{ fontSize: '16px' }}
                                        disabled={isUploading}
                                        autoComplete="off"
                                        autoCorrect="off"
                                        autoCapitalize="off"
                                        spellCheck="false"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                      {/* 2. 残数フィールド */}
                      {optionalFieldsExpanded.remainingSlots && isFieldVisibleForCategory('remainingSlots', selectedCategory) && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FormField
                            control={form.control}
                            name="remainingSlots"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-lg font-semibold flex items-center">
                                  <PackageIcon className="mr-2 h-5 w-5" />
                                  残数（座席数、在庫数など）
                                  {(selectedCategory === '空席情報' || selectedCategory === '在庫情報') && (
                                    <span className="text-destructive ml-1">※</span>
                                  )}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="9999"
                                    placeholder="例: 5"
                                    {...field}
                                    value={field.value === undefined ? '' : String(field.value)}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (value === '' || /^[0-9]+$/.test(value)) {
                                         field.onChange(value === '' ? undefined : parseInt(value, 10));
                                      }
                                    }}
                                    style={{ fontSize: '16px' }}
                                    disabled={isUploading}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    spellCheck="false"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      )}

                      {/* 3. リンク入力フィールド */}
                      {optionalFieldsExpanded.url && isFieldVisibleForCategory('url', selectedCategory) && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FormField
                            control={form.control}
                            name="url"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-lg font-semibold flex items-center">
                                  <LinkIcon className="mr-2 h-5 w-5" />
                                  リンク<span className="text-sm text-gray-500">（※例：SNSアカウントのURL）</span>
                                </FormLabel>
                                  <FormControl>
                                  <Input
                                    type="url"
                                    placeholder="https://example.com"
                                    {...field}
                                    style={{ fontSize: '16px' }}
                                    disabled={isUploading}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    spellCheck="false"
                                  />
                                  </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      )}

                      {/* 4. 画像アップロードフィールド */}
                      {optionalFieldsExpanded.image && isFieldVisibleForCategory('image', selectedCategory) && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FormItem>
                            <FormLabel className="text-lg font-semibold flex items-center">
                              <ImageIcon className="mr-2 h-5 w-5" />
                              画像 (最大5枚)
                            </FormLabel>
                            <FormControl>
                              <div className="space-y-4">
                                <div className="flex flex-col items-center space-y-3 p-6 border-2 border-dashed rounded-lg hover:border-primary transition-colors cursor-pointer bg-card">
                                  <Input
                                    id="image-upload"
                                    type="file"
                                    accept="image/png, image/jpeg, image/webp"
                                    multiple
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    disabled={isUploading || imageFiles.length >= 5}
                                  />
                                  
                                  {imagePreviewUrls.length > 0 ? (
                                    <div className="w-full">
                                      <div className="grid grid-cols-2 gap-2 mb-4">
                                        {imagePreviewUrls.map((url, index) => (
                                          <div key={index} className="relative group">
                                            <div className="w-full rounded-md overflow-hidden border-2 border-gray-200 aspect-[4/5]">
                                              <img 
                                                src={url} 
                                                alt={`プレビュー ${index + 1}`} 
                                                className="w-full h-full object-cover"
                                              />
                                            </div>
                                            <Button
                                              type="button"
                                              variant="destructive"
                                              size="icon"
                                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                              onClick={() => removeImage(index)}
                                              disabled={isUploading}
                                            >
                                              <X className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                      
                                      {imageFiles.length < 5 && (
                                        <label htmlFor="image-upload" className="flex flex-col items-center space-y-2 cursor-pointer text-muted-foreground">
                                          <Upload className="h-8 w-8" />
                                          <p className="text-sm">画像を追加 ({imageFiles.length}/5)</p>
                                        </label>
                                      )}
                                    </div>
                                  ) : (
                                    <label htmlFor="image-upload" className="flex flex-col items-center space-y-2 cursor-pointer text-muted-foreground">
                                      <Upload className="h-12 w-12" />
                                      <p className="text-lg">画像をアップロード</p>
                                      <p className="text-xs">PNG, JPG, WEBP (最大5MB・最大5枚)</p>
                                      <p className="text-xs text-blue-600">※掲示板では4:5比率で表示されます</p>
                                    </label>
                                  )}
                                </div>
                              </div>
                            </FormControl>
                            <p className="text-sm text-red-500 mt-1">※アップロードする画像は自己責任でお願いします。</p>
                          </FormItem>
                        </motion.div>
                      )}

                      {/* 5. 来客状況フィールド */}
                      {optionalFieldsExpanded.customerSituation && isFieldVisibleForCategory('customerSituation', selectedCategory) && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FormField
                            control={form.control}
                            name="customerSituation"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-lg font-semibold flex items-center">
                                  <Users className="mr-2 h-5 w-5" />
                                  来客状況
                                </FormLabel>
                                <div className="space-y-3">
                                  {/* 男女内訳のみ */}
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-sm">男性</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        max="999"
                                        placeholder="例: 8"
                                        value={maleCustomers === undefined ? '' : String(maleCustomers)}
                                        onChange={(e) => {
                                          handleMaleCustomersChange(e.target.value);
                                        }}
                                        style={{ fontSize: '16px' }}
                                        disabled={isUploading}
                                        autoComplete="off"
                                        autoCorrect="off"
                                        autoCapitalize="off"
                                        spellCheck="false"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-sm">女性</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        max="999"
                                        placeholder="例: 7"
                                        value={femaleCustomers === undefined ? '' : String(femaleCustomers)}
                                        onChange={(e) => {
                                          handleFemaleCustomersChange(e.target.value);
                                        }}
                                        style={{ fontSize: '16px' }}
                                        disabled={isUploading}
                                        autoComplete="off"
                                        autoCorrect="off"
                                        autoCapitalize="off"
                                        spellCheck="false"
                                      />
                                    </div>
                                  </div>
                                  
                                  {/* 🔥 プレビュー表示を削除 */}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      )}

                      {/* 6. 評価入力フィールド */}
                      {optionalFieldsExpanded.rating && isFieldVisibleForCategory('rating', selectedCategory) && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FormField
                            control={form.control}
                            name="rating"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-lg flex font-semibold items-center">
                                  <StarIcon className="mr-2 h-5 w-5" /> 評価 (0.0〜5.0)
                                </FormLabel>
                                  <FormControl>
                                  <div className="flex items-center space-x-2">
                                    {/* 星の表示 */}
                                    <div className="flex items-center">
                                      {[1, 2, 3, 4, 5].map((starIndex) => {
                                        const currentRating = field.value || 0;
                                        const fullStars = Math.floor(currentRating);
                                        const hasHalfStar = currentRating - fullStars >= 0.5;
                                        const isFull = starIndex <= fullStars;
                                        const isHalf = starIndex === fullStars + 1 && hasHalfStar;

                                        return (
                                          <div
                                            key={starIndex}
                                            className="relative"
                                            onClick={() => field.onChange(starIndex)} // クリックで整数値設定も可能
                                          >
                                            <StarIcon
                                              className={cn(
                                                "h-8 w-8 cursor-pointer text-gray-300",
                                                { "fill-yellow-400": isFull || isHalf }
                                              )}
                                            />
                                            {isHalf && (
                                              <div
                                                className="absolute inset-0 overflow-hidden"
                                                style={{ width: '50%' }} // 半分だけ色を塗る
                                              >
                                                <StarIcon className="h-8 w-8 text-yellow-400 fill-yellow-400" />
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                    {/* 数値入力フィールド */}
                                    <Input
                                      type="number"
                                      step="0.1" // 小数点第一位まで許可
                                      min="0.0"
                                      max="5.0"
                                      placeholder="例: 3.5"
                                      value={field.value === undefined ? '' : String(field.value)}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        // 数値または空文字列、小数点第一位までの数値のみを許可
                                        if (value === '' || /^(?:\d(?:\.\d)?|[0-4](?:\.\d)?|5(?:\.0)?)$/.test(value)) {
                                          field.onChange(value === '' ? undefined : parseFloat(value));
                                        }
                                      }}
                                      className="w-28 text-lg"
                                      autoComplete="off"
                                      autoCorrect="off"
                                      autoCapitalize="off"
                                      spellCheck="false"
                                    />
                                  </div>
                                  </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      )}

                      {/* 7. クーポンフィールド */}
                      {optionalFieldsExpanded.coupon && isFieldVisibleForCategory('coupon', selectedCategory) && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FormField
                            control={form.control}
                            name="couponCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-lg font-semibold flex items-center">
                                  <Tag className="mr-2 h-5 w-5" />
                                  クーポン
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="text"
                                    maxLength={50}
                                    placeholder="例: 会計から100円引き、ドリンク1杯無料"
                                    {...field}
                                    style={{ fontSize: '16px' }}
                                    disabled={isUploading}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    spellCheck="false"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      )}

                      {/* 8. 電話番号フィールド */}
                      {optionalFieldsExpanded.phoneNumber && isFieldVisibleForCategory('phoneNumber', selectedCategory) && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FormField
                            control={form.control}
                            name="phoneNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-lg font-semibold flex items-center">
                                  <Phone className="mr-2 h-5 w-5" />
                                  電話番号
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="tel"
                                    placeholder="例: 03-1234-5678(※-を含む)"
                                    {...field}
                                    style={{ fontSize: '16px' }}
                                    disabled={isUploading}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    spellCheck="false"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      )}

                      {/* 9. ファイル入力フィールド */}
                      {optionalFieldsExpanded.file && isFieldVisibleForCategory('file', selectedCategory) && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FormItem>
                            <FormLabel className="text-lg font-semibold flex items-center">
                              <FileText className="mr-2 h-5 w-5" />
                              ファイル (pdfなど、最大3つ)
                            </FormLabel>
                            <FormControl>
                              <div className="space-y-4">
                                <div className="flex flex-col items-center space-y-3 p-6 border-2 border-dashed rounded-lg hover:border-primary transition-colors cursor-pointer bg-card">
                                  <Input
                                    id="file-upload"
                                    type="file"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                                    multiple
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    disabled={isUploading || fileFiles.length >= 3}
                                  />
                                  
                                  {fileFiles.length > 0 ? (
                                    <div className="w-full">
                                      <div className="space-y-2 mb-4">
                                        {fileFiles.map((file, index) => (
                                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                            <div className="flex items-center space-x-2">
                                              <FileText className="h-4 w-4 text-gray-500" />
                                              <span className="text-sm truncate">{file.name}</span>
                                            </div>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => removeFile(index)}
                                              disabled={isUploading}
                                            >
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                      
                                      {fileFiles.length < 3 && (
                                        <label htmlFor="file-upload" className="flex flex-col items-center space-y-2 cursor-pointer text-muted-foreground">
                                          <Upload className="h-8 w-8" />
                                          <p className="text-sm">ファイルを追加 ({fileFiles.length}/3)</p>
                                        </label>
                                      )}
                                    </div>
                                  ) : (
                                    <label htmlFor="file-upload" className="flex flex-col items-center space-y-2 cursor-pointer text-muted-foreground">
                                      <Upload className="h-12 w-12" />
                                      <p className="text-lg">ファイルをアップロード</p>
                                      <p className="text-xs">PDF, Word, Excel (最大10MB・最大3つ)</p>
                                    </label>
                                  )}
                                </div>
                              </div>
                            </FormControl>
                          </FormItem>
                        </motion.div>
                      )}

                      {/* 10. おすそわけフィールド */}
                      {optionalFieldsExpanded.supportPurchase && isFieldVisibleForCategory('supportPurchase', selectedCategory) && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-4"
                        >
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                              <Heart className="h-5 w-5 text-pink-500 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-blue-800 mb-2">おすそわけについて</h3>
                                <p className="text-sm text-blue-700 leading-relaxed">
                                  おすそわけを有効にすると、この投稿を見た人があなたにおすそわけできます！(手数料は5%+決済手数料3.6%)
                                  <br />
                                  <span className="font-medium text-blue-800">※収益を受け取るにはStripe設定が必要です</span>
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                            <div className="flex items-center space-x-2">
                              <div>
                                <Label className="text-lg font-semibold">おすそわけを有効にする</Label>
                                <p className="text-sm text-gray-600">投稿におすそわけボタンを表示します</p>
                                {stripeSetupStatus.loading && (
                                  <p className="text-xs text-blue-600 flex items-center mt-1">
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    設定状況を確認中...
                                  </p>
                                )}
                                {!stripeSetupStatus.hasAccount && !stripeSetupStatus.loading && (
                                  <p className="text-xs text-amber-600 mt-1">
                                    ⚠️ Stripe設定が必要です
                                  </p>
                                )}
                                {stripeSetupStatus.hasAccount && stripeSetupStatus.onboardingCompleted && !stripeSetupStatus.loading && (
                                  <p className="text-xs text-green-600 mt-1">
                                    ✅ 設定完了済み
                                  </p>
                                )}
                                {stripeSetupStatus.hasAccount && !stripeSetupStatus.onboardingCompleted && !stripeSetupStatus.loading && (
                                  <p className="text-xs text-amber-600 mt-1">
                                    ⚠️ 本人確認が未完了です
                                  </p>
                                )}
                              </div>
                            </div>
                            <Switch
                              checked={form.getValues("supportPurchaseEnabled")}
                              onCheckedChange={handleSupportPurchaseToggle}
                              disabled={stripeSetupStatus.loading}
                            />
                          </div>

                          {form.getValues("supportPurchaseEnabled") && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="space-y-4"
                            >
                              <div className="space-y-3">
                                <Label className="text-base font-medium">おすそわけの金額を選択（最大3つ）</Label>
                                
                                {/* 既存の金額選択コードをそのまま維持 */}
                                {(form.getValues("supportPurchaseOptions") || []).length > 0 && (
                                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <HandCoins className="h-4 w-4 text-amber-500" />
                                      <span className="text-sm font-medium text-amber-800">選択済み:</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {(form.getValues("supportPurchaseOptions") || []).map((amount, index) => (
                                        <div key={index} className="flex items-center space-x-1 bg-white px-3 py-1 rounded-full border">
                                          <span className="text-sm font-medium">¥{amount.toLocaleString()}</span>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              const currentOptions = form.getValues("supportPurchaseOptions") || [];
                                              form.setValue("supportPurchaseOptions", currentOptions.filter((_, i) => i !== index));
                                            }}
                                            className="h-4 w-4 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* 既存の金額選択ボタン */}
                                <div className="grid grid-cols-3 gap-3">
                                  {[300, 500, 1000, 3000, 5000, 10000].map((presetAmount) => {
                                    const isSelected = (form.getValues("supportPurchaseOptions") || []).includes(presetAmount);
                                    const isMaxSelected = (form.getValues("supportPurchaseOptions") || []).length >= 3;
                                    
                                    return (
                                      <Button
                                        key={presetAmount}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const currentOptions = form.getValues("supportPurchaseOptions") || [];
                                          if (isSelected) {
                                            form.setValue("supportPurchaseOptions", currentOptions.filter(amount => amount !== presetAmount));
                                          } else if (currentOptions.length < 3) {
                                            form.setValue("supportPurchaseOptions", [...currentOptions, presetAmount].sort((a, b) => a - b));
                                          }
                                        }}
                                        disabled={!isSelected && isMaxSelected}
                                        className={`justify-center transition-all duration-200 h-12 ${
                                          isSelected 
                                            ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' 
                                            : 'bg-[#fafafa] text-[#73370c] border-gray-300 hover:bg-[#fafafa] hover:text-[#73370c]'
                                        } ${!isSelected && isMaxSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      >
                                        <div className="flex items-center space-x-2">
                                          {isSelected && <HandCoins className="h-4 w-4" />}
                                          <span className="font-medium">¥{presetAmount.toLocaleString()}</span>
                                        </div>
                                      </Button>
                                    );
                                  })}
                                </div>
                                
                                {(form.getValues("supportPurchaseOptions") || []).length >= 3 && (
                                  <p className="text-xs text-amber-600 mt-1 text-center">
                                    変更する場合は選択済みの金額を解除してください。
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      )}

                    </div>
                  </motion.div>
                )}
              </div>
              
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

          {/* 既存のモーダルコンポーネント... */}
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

          {/* 🔥 日数設定モーダル */}
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

          {/* 企業設定変更案内モーダル */}
          <CustomModal
            isOpen={showBusinessSettingsModal}
            onClose={() => setShowBusinessSettingsModal(false)}
            title="企業アカウント設定"
          >
            <div className="pt-2 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Settings className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-green-800 mb-2">設定済みの項目です</h3>
                    <p className="text-sm text-green-700 leading-relaxed">
                      この項目は企業アカウント設定で既に設定されています。<br />
                      変更する場合は、プロフィール画面の「企業アカウント設定」から修正してください。
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowBusinessSettingsModal(false)}
                >
                  閉じる
                </Button>
                <Button 
                  onClick={() => {
                    setShowBusinessSettingsModal(false);
                    router.push('/profile/edit');
                  }}
                >
                  企業設定を変更
                </Button>
              </div>
            </div>
          </CustomModal>

          {/* 🔥 定型文選択モーダル */}
          <CustomModal
            isOpen={showTemplateModal}
            onClose={() => setShowTemplateModal(false)}
            title={`定型文を選択 - ${selectedCategory}`}
          >
            <div className="pt-2 space-y-4">
              <p className="text-sm text-gray-600">
                以下から定型文を選択して投稿内容に適用できます。適用後に編集も可能です。
              </p>
              
              {selectedCategory && templateTexts[selectedCategory as keyof typeof templateTexts] && (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {templateTexts[selectedCategory as keyof typeof templateTexts].map((template, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
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
              )}
              
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
      </AppLayout>
    );
  }

  return null;
}