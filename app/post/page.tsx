"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Camera, Upload, X, Store as StoreIcon, LayoutGrid, ClipboardList, Image as ImageIcon, ClockIcon, PackageIcon, Tag, HelpCircle, MapPin, CheckCircle, Layers, ChevronDown, ChevronUp, Settings, Link as LinkIcon, FileText, HandCoins, Users, Phone, BarChart3, Star as StarIcon } from 'lucide-react';
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

// 🔥 更新されたバリデーションスキーマ（電話番号を追加、カテゴリを修正）
const postSchema = z.object({
  storeId: z.string().optional(),
  storeName: z.string().optional(),
  category: z.enum(['空席状況', '在庫状況', 'PR', '応援', '受け渡し', '雑談'], { required_error: 'カテゴリを選択してください' }),
  content: z.string().min(5, { message: '5文字以上入力してください' }).max(240, { message: '240文字以内で入力してください' }),
  url: z.string().url({ message: '有効なURLを入力してください' }).optional().or(z.literal('')),
  // 🔥 新しい掲載期間スキーマ
  expiryOption: z.enum(['15m', '30m', '45m', '60m', 'custom'], { required_error: '掲載期間を選択してください' }),
  customExpiryMinutes: z.number().min(1).max(720).optional(),
  // 位置情報フィールド（任意）
  location_lat: z.number().optional(),
  location_lng: z.number().optional(),
  store_latitude: z.number().optional(),
  store_longitude: z.number().optional(),
  rating: z.number().min(0).max(5, { message: '0以上5以下の値を入力してください' }).optional(),
  supportPurchaseEnabled: z.boolean().default(false),
  supportPurchaseOptions: z.array(z.number().min(100).max(100000)).max(3).optional(),
  // 🔥 独立した項目として分離
  remainingSlots: z.number().min(0).max(9999).optional(), // 残りの数（席、在庫）
  customerSituation: z.string().optional(), // 来客状況
  couponCode: z.string().max(50).optional(), // クーポン
  phoneNumber: z.string().max(15).optional(), // 🔥 電話番号を追加
});

type PostFormValues = z.infer<typeof postSchema>;

type DisplayStore = Pick<Store, 'name'> & { id: string };

const libraries: ("places")[] = ["places"];

// 🔥 新しいカテゴリ定義
const categoryOptions = [
  { value: '空席状況', label: '空席状況' },
  { value: '在庫状況', label: '在庫状況' },
  { value: 'PR', label: 'PR' },
  { value: '応援', label: '応援' },
  { value: '受け渡し', label: '受け渡し' },
  { value: '雑談', label: '雑談' },
];

// 🔥 新しい掲載期間オプション
const expiryOptions = [
  { value: '15m', label: '15分' },
  { value: '30m', label: '30分' },
  { value: '45m', label: '45分' },
  { value: '60m', label: '60分' },
  { value: 'custom', label: 'カスタム設定（最大12時間）' },
];

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

  // 🔥 更新されたフォーム設定（電話番号を追加）
  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      storeId: '',
      storeName: '',
      category: '空席状況',
      content: '',
      url: '',
      expiryOption: '30m',
      customExpiryMinutes: undefined,
      location_lat: undefined,
      location_lng: undefined,
      store_latitude: undefined,
      store_longitude: undefined,
      rating: undefined,
      supportPurchaseEnabled: false,
      supportPurchaseOptions: [],
      remainingSlots: undefined,
      customerSituation: '',
      couponCode: '',
      phoneNumber: '', // 🔥 電話番号のデフォルト値を追加
    },
    mode: 'onChange',
  });
  
  const { formState: { isValid, isSubmitting } } = form;
  
  const selectedCategory = form.watch('category'); // ジャンルからカテゴリに変更
  const selectedExpiryOption = form.watch('expiryOption');
  const watchedFormValues = form.watch();

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

  // 🔥 ジャンル変更時にカテゴリーをリセット
  // useEffect(() => {
  //   if (selectedCategory) {
  //     form.setValue('category', undefined);
  //   }
  // }, [selectedCategory, form]);
  
  // 🔥 更新された投稿処理
  const handleActualSubmit = async (values: PostFormValues) => {
    if (!session?.user?.id) {
      console.log("PostPage: User not logged in, redirecting to login page.");
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    // 🔥 必須フィールドの検証（カテゴリ、内容、掲載期間）
    if (!values.category) {
      setSubmitError("カテゴリを選択してください。");
      return;
    }

    if (!values.content || values.content.length < 5) {
      setSubmitError("投稿内容を5文字以上入力してください。");
      return;
    }

    if (!values.expiryOption) {
      setSubmitError("掲載期間を選択してください。");
      return;
    }

    // カスタム掲載期間の検証
    if (values.expiryOption === 'custom' && (!values.customExpiryMinutes || values.customExpiryMinutes < 1 || values.customExpiryMinutes > 720)) {
      setSubmitError("カスタム掲載期間は1分〜720分（12時間）の範囲で設定してください。");
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

      // 🔥 投稿データを準備（完全版）
      const getDefaultStoreName = () => {
        // 🔥 実際に入力された店舗名がある場合はそれを使用
        const actualStoreName = form.getValues("storeName");
        if (actualStoreName && actualStoreName.trim() !== '') {
          return actualStoreName;
        }
        
        // 🔥 店舗名が入力されていない場合のみ、カテゴリベースのデフォルト値を使用
        const selectedCategory = form.getValues("category");
        if (selectedCategory) {
          const categoryDefaults = {
            '空席状況': '空席状況',
            '在庫状況': '在庫状況',
            'PR': 'PR',
            '応援': '応援先',
            '受け渡し': '受け渡し場所',
          };
          return categoryDefaults[selectedCategory as keyof typeof categoryDefaults] || null;
        }
        
        return null;
      };

      const getDefaultCategory = () => {
        if (values.category && values.category.trim() !== '') {
          return values.category;
        }
        
        return null;
      };

      // 🔥 修正：投稿作成時にis_deletedフィールドを追加
      const postData: any = {
        app_profile_id: appProfileId,
        store_id: values.storeId && values.storeId.trim() !== '' ? values.storeId : null,
        store_name: getDefaultStoreName(),
        category: values.category || null, // 🔥 カテゴリは明示的に選択された場合のみ保存
        content: values.content,
        image_urls: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
        file_urls: fileUrls.length > 0 ? JSON.stringify(fileUrls) : null,
        url: values.url && values.url.trim() !== '' ? values.url : null,
        expiry_option: values.expiryOption,
        custom_expiry_minutes: values.expiryOption === 'custom' ? values.customExpiryMinutes : null,
        expires_at: calculateExpiresAt(values.expiryOption, values.customExpiryMinutes).toISOString(),
        likes_count: 0,
        views_count: 0,
        comments_count: 0,
        is_deleted: false,
        rating: values.rating || null,
        support_purchase_enabled: values.supportPurchaseEnabled,
        support_purchase_options: values.supportPurchaseEnabled && (values.supportPurchaseOptions?.length ?? 0) > 0 
          ? JSON.stringify(values.supportPurchaseOptions) 
          : null,
        // 🔥 独立したフィールドとして追加
        remaining_slots: values.remainingSlots || null,
        customer_situation: values.customerSituation && values.customerSituation.trim() !== '' ? values.customerSituation : null,
        coupon_code: values.couponCode && values.couponCode.trim() !== '' ? values.couponCode : null,
        phone_number: values.phoneNumber && values.phoneNumber.trim() !== '' ? values.phoneNumber : null, // 🔥 電話番号を追加
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

      // フォームリセット（電話番号を追加）
      form.reset({
        storeId: '',
        storeName: '',
        category: '空席状況',
        content: '',
        url: '',
        expiryOption: '30m',
        customExpiryMinutes: undefined,
        location_lat: undefined,
        location_lng: undefined,
        store_latitude: undefined,
        store_longitude: undefined,
        rating: undefined,
        supportPurchaseEnabled: false,
        supportPurchaseOptions: [],
        remainingSlots: undefined,
        customerSituation: '',
        couponCode: '',
        phoneNumber: '', // 🔥 電話番号のリセットを追加
      });
      setImageFiles([]);
      setImagePreviewUrls([]);
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
        description: "5km圏内表示機能のために位置情報を許可してください",
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


  // 🔥 オプション項目の表示状態管理（10項目に更新）
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [optionalFieldsExpanded, setOptionalFieldsExpanded] = useState({
    image: false, // 🔥 画像を追加
    location: false,
    rating: false,
    url: false,
    remainingSlots: false,
    customerSituation: false,
    coupon: false,
    phoneNumber: false, // 🔥 電話番号を追加
    file: false,
    supportPurchase: false,
  });

  // 🔥 オプションフィールドの切り替えと値のリセット（電話番号を追加）
  const toggleOptionalField = (field: keyof typeof optionalFieldsExpanded) => {
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
          case 'rating':
            form.setValue('rating', undefined, { shouldValidate: true });
            break;
          case 'url':
            form.setValue('url', '', { shouldValidate: true });
            break;
          case 'remainingSlots':
            form.setValue('remainingSlots', undefined, { shouldValidate: true });
            break;
          case 'customerSituation':
            form.setValue('customerSituation', '', { shouldValidate: true });
            setMaleCustomers(undefined);
            setFemaleCustomers(undefined);
            break;
          case 'coupon':
            form.setValue('couponCode', '', { shouldValidate: true });
            break;
          case 'phoneNumber': // 🔥 電話番号のリセット処理を追加
            form.setValue('phoneNumber', '', { shouldValidate: true });
            break;
          case 'file':
            setFileFiles([]);
            setFilePreviewUrls([]);
            break;
          case 'supportPurchase':
            form.setValue('supportPurchaseEnabled', false);
            form.setValue('supportPurchaseOptions', []);
            break;
          default:
            break;
        }
      }
      return newState;
    });
  };

  // 🔥 オプション項目の値が入力されているかチェック（画像と電話番号を追加）
  const hasOptionalValues = () => {
    const values = form.getValues();
    return !!(imageFiles.length > 0 || values.storeId || values.rating || values.url || values.remainingSlots || values.customerSituation || values.couponCode || values.phoneNumber || fileFiles.length > 0 || values.supportPurchaseEnabled);
  };

  // 🔥 Stripe Connect機能を有効化
  const STRIPE_CONNECT_ENABLED = true; // falseから変更

  // 🔥 Stripe設定確認を有効化
  const checkStripeSetup = async () => {
    if (!session?.user?.id) return;
    
    setStripeSetupStatus(prev => ({ ...prev, loading: true }));
    
    try {
      const { data: profile, error } = await supabase
        .from('app_profiles')
        .select('stripe_account_id, stripe_onboarding_completed')
        .eq('user_id', session.user.id)
        .single();

      if (error) {
        console.error('Profile fetch error:', error);
        setStripeSetupStatus({
          hasAccount: false,
          onboardingCompleted: false,
          loading: false
        });
        return;
      }

      const hasAccount = !!profile?.stripe_account_id;
      const onboardingCompleted = !!profile?.stripe_onboarding_completed;
      
      setStripeSetupStatus({
        hasAccount,
        onboardingCompleted,
        loading: false
      });

      // デバッグログ追加
      console.log('Stripe Setup Status:', {
        hasAccount,
        onboardingCompleted,
        stripe_account_id: profile?.stripe_account_id
      });

    } catch (error) {
      console.error('Stripe setup check error:', error);
      setStripeSetupStatus(prev => ({ ...prev, loading: false }));
    }
  };

  // 🔥 おすそわけ有効化時のチェック処理を修正
  const handleSupportPurchaseToggle = async (checked: boolean) => {
    if (!checked) {
      form.setValue("supportPurchaseEnabled", false);
      form.setValue("supportPurchaseOptions", []);
      return;
    }

    // 最新のStripe設定状況をチェック
    await checkStripeSetup();
    
    // 少し待ってから状態を確認（非同期処理の完了を待つ）
    setTimeout(() => {
      if (!stripeSetupStatus.hasAccount || !stripeSetupStatus.onboardingCompleted) {
        setShowStripeSetupModal(true);
        return;
      }

      form.setValue("supportPurchaseEnabled", true);
      toast({
        title: "✅ おすそわけ機能を有効化しました",
        description: "金額を選択して投稿してください",
        duration: 3000,
      });
    }, 500);
  };

  // 🔥 Stripe設定画面への遷移
  const handleNavigateToStripeSetup = () => {
    setShowStripeSetupModal(false);
    router.push('/profile/stripe-setup');
  };

  // 🔥 初期ロード時にStripe設定状態を確認
  useEffect(() => {
    if (session?.user?.id && STRIPE_CONNECT_ENABLED) {
      checkStripeSetup();
    }
  }, [session?.user?.id]);

  // 🔥 Stripe設定完了後の自動有効化
  useEffect(() => {
    const fromStripeSetup = searchParams.get('from_stripe_setup');
    if (fromStripeSetup === 'true' && session?.user?.id) {
      // Stripe設定状況を確認してからおすそわけを有効化
      checkStripeSetupAndEnable();
    }
  }, [session?.user?.id, searchParams]);

  // 🔥 Stripe設定確認とおすそわけ自動有効化
  const checkStripeSetupAndEnable = async () => {
    if (!session?.user?.id) return; // この行を追加
    
    setStripeSetupStatus(prev => ({ ...prev, loading: true }));
    
    try {
      const { data: profile, error } = await supabase
        .from('app_profiles')
        .select('stripe_account_id, stripe_onboarding_completed')
        .eq('user_id', session.user.id)
        .single();

      if (error) {
        console.error('Profile fetch error:', error);
        setStripeSetupStatus({
          hasAccount: false,
          onboardingCompleted: false,
          loading: false
        });
        return;
      }

      const hasAccount = !!profile?.stripe_account_id;
      const onboardingCompleted = !!profile?.stripe_onboarding_completed;
      
      setStripeSetupStatus({
        hasAccount,
        onboardingCompleted,
        loading: false
      });

      // 設定が完了している場合、おすそわけを自動有効化
      if (hasAccount && onboardingCompleted) {
        form.setValue("supportPurchaseEnabled", true);
        
        toast({
          title: "✅ おすそわけ機能を有効化しました",
          description: "金額を選択して投稿してください",
          duration: 4000,
        });
        
        // URLパラメータをクリア
        router.replace('/post');
      }

    } catch (error) {
      console.error('Stripe setup check error:', error);
      setStripeSetupStatus(prev => ({ ...prev, loading: false }));
    }
  };

  // 🔥 モーダル状態を追加
  const [showCustomTimeModal, setShowCustomTimeModal] = useState(false);
  const [customHours, setCustomHours] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(30);

  // 🔥 来客状況の状態を追加
  const [totalCustomers, setTotalCustomers] = useState<number | undefined>(undefined);
  const [maleCustomers, setMaleCustomers] = useState<number | undefined>(undefined);
  const [femaleCustomers, setFemaleCustomers] = useState<number | undefined>(undefined);

  // 🔥 カスタム時間設定の処理
  const handleCustomTimeSet = () => {
    const totalMinutes = customHours * 60 + customMinutes;
    if (totalMinutes > 0 && totalMinutes <= 720) {
      form.setValue('customExpiryMinutes', totalMinutes);
      setShowCustomTimeModal(false);
    }
  };

  // 🔥 来客状況の更新処理を修正（男性・女性の両方を確実に保存）
  const updateCustomerSituation = () => {
    let situation = '';
    
    // 男性・女性の人数が入力されている場合のみ処理
    if (maleCustomers !== undefined || femaleCustomers !== undefined) {
      const parts = [];
      
      // 男性の人数（0でも表示）
      if (maleCustomers !== undefined) {
        parts.push(`男性: ${maleCustomers}人`);
      }
      
      // 女性の人数（0でも表示）
      if (femaleCustomers !== undefined) {
        parts.push(`女性: ${femaleCustomers}人`);
      }
      
      if (parts.length > 0) {
        situation = parts.join(', ');
      }
    }
    
    console.log('updateCustomerSituation:', { 
      maleCustomers, 
      femaleCustomers, 
      situation 
    }); // デバッグログ追加
    
    form.setValue('customerSituation', situation);
  };

  // 🔥 男性数変更時の処理を修正
  const handleMaleCustomersChange = (value: string) => {
    const num = value === '' ? undefined : parseInt(value, 10);
    console.log('handleMaleCustomersChange:', { value, num }); // デバッグログ追加
    setMaleCustomers(num);
    // 即座に更新するためsetTimeoutを削除
    updateCustomerSituation();
  };

  // 🔥 女性数変更時の処理を修正
  const handleFemaleCustomersChange = (value: string) => {
    const num = value === '' ? undefined : parseInt(value, 10);
    console.log('handleFemaleCustomersChange:', { value, num }); // デバッグログ追加
    setFemaleCustomers(num);
    // 即座に更新するためsetTimeoutを削除
    updateCustomerSituation();
  };

  // 🔥 useEffectで状態変更時に確実に更新
  useEffect(() => {
    updateCustomerSituation();
  }, [maleCustomers, femaleCustomers]);

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
              
              {/* 🔥 1. カテゴリ（必須） */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xl flex font-semibold items-center">
                      <Layers className="mr-2 h-6 w-6" /> カテゴリ<span className="text-destructive ml-1">※</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="w-full text-lg py-6">
                          <SelectValue placeholder="カテゴリを選択してください" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[200px]">
                        {categoryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="text-lg py-3">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 🔥 2. 投稿内容（必須） */}
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xl flex font-semibold items-center">
                      <ClipboardList className="mr-2 h-6 w-6" /> 投稿内容<span className="text-destructive ml-1">※</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="日常生活のちょっとしたおとく情報を投稿してみよう。（240文字以内）"
                        className="resize-none"
                        style={{ fontSize: '16px', minHeight: '140px' }}
                        rows={7}
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
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 🔥 3. 掲載期間（必須） */}
              <FormField
                control={form.control}
                name="expiryOption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xl flex font-semibold items-center">
                      <ClockIcon className="mr-2 h-6 w-6" /> 掲載期間<span className="text-destructive ml-1">※</span>
                    </FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      if (value === 'custom') {
                        setShowCustomTimeModal(true);
                      }
                    }} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="w-full text-lg py-6">
                          <SelectValue placeholder="掲載期間を選択してください" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {expiryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="text-lg py-3">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    
                    {/* カスタム時間が設定されている場合の表示 */}
                    {selectedExpiryOption === 'custom' && form.getValues('customExpiryMinutes') && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-blue-800">
                            設定時間: {Math.floor(form.getValues('customExpiryMinutes')! / 60)}時間{form.getValues('customExpiryMinutes')! % 60}分
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowCustomTimeModal(true)}
                          >
                            変更
                          </Button>
                        </div>
                      </div>
                    )}
                  </FormItem>
                )}
              />

              {/* 🔥 カスタム掲載期間入力フィールドを削除 */}

              {/* 🔥 4. オプション項目バー */}
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
                        <span className="text-lg font-semibold">詳細情報 (任意)</span>
                        {hasOptionalValues() && (
                          <div className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            入力済み
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-red-600 mt-1 ml-7">
                        投稿内容に応じて詳細情報をご利用ください
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
                      {/* オプション項目のトグルボタン - 2列5行に変更 */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleOptionalField('image')}
                          className={`justify-start transition-all duration-200 ${
                            optionalFieldsExpanded.image 
                              ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' 
                              : 'bg-[#fafafa] text-[#73370c] border-gray-300 hover:bg-[#fafafa] hover:text-[#73370c]'
                          }`}
                        >
                          <ImageIcon className="mr-2 h-4 w-4" />
                          画像
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleOptionalField('location')}
                          className={`justify-start transition-all duration-200 ${
                            optionalFieldsExpanded.location 
                              ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' 
                              : 'bg-[#fafafa] text-[#73370c] border-gray-300 hover:bg-[#fafafa] hover:text-[#73370c]'
                          }`}
                        >
                          <StoreIcon className="mr-2 h-4 w-4" />
                          場所
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleOptionalField('rating')}
                          className={`justify-start transition-all duration-200 ${
                            optionalFieldsExpanded.rating 
                              ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' 
                              : 'bg-[#fafafa] text-[#73370c] border-gray-300 hover:bg-[#fafafa] hover:text-[#73370c]'
                          }`}
                        >
                          <StarIcon className="mr-2 h-4 w-4" />
                          評価
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleOptionalField('url')}
                          className={`justify-start transition-all duration-200 ${
                            optionalFieldsExpanded.url 
                              ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' 
                              : 'bg-[#fafafa] text-[#73370c] border-gray-300 hover:bg-[#fafafa] hover:text-[#73370c]'
                          }`}
                        >
                          <LinkIcon className="mr-2 h-4 w-4" />
                          リンク
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleOptionalField('remainingSlots')}
                          className={`justify-start transition-all duration-200 ${
                            optionalFieldsExpanded.remainingSlots 
                              ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' 
                              : 'bg-[#fafafa] text-[#73370c] border-gray-300 hover:bg-[#fafafa] hover:text-[#73370c]'
                          }`}
                        >
                          <PackageIcon className="mr-2 h-4 w-4" />
                          残数
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleOptionalField('customerSituation')}
                          className={`justify-start transition-all duration-200 ${
                            optionalFieldsExpanded.customerSituation 
                              ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' 
                              : 'bg-[#fafafa] text-[#73370c] border-gray-300 hover:bg-[#fafafa] hover:text-[#73370c]'
                          }`}
                        >
                          <Users className="mr-2 h-4 w-4" />
                          来客状況
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleOptionalField('coupon')}
                          className={`justify-start transition-all duration-200 ${
                            optionalFieldsExpanded.coupon 
                              ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' 
                              : 'bg-[#fafafa] text-[#73370c] border-gray-300 hover:bg-[#fafafa] hover:text-[#73370c]'
                          }`}
                        >
                          <Tag className="mr-2 h-4 w-4" />
                          クーポン
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleOptionalField('phoneNumber')}
                          className={`justify-start transition-all duration-200 ${
                            optionalFieldsExpanded.phoneNumber 
                              ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' 
                              : 'bg-[#fafafa] text-[#73370c] border-gray-300 hover:bg-[#fafafa] hover:text-[#73370c]'
                          }`}
                        >
                          <Phone className="mr-2 h-4 w-4" />
                          電話番号
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleOptionalField('file')}
                          className={`justify-start transition-all duration-200 ${
                            optionalFieldsExpanded.file 
                              ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' 
                              : 'bg-[#fafafa] text-[#73370c] border-gray-300 hover:bg-[#fafafa] hover:text-[#73370c]'
                          }`}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          ファイル
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleOptionalField('supportPurchase')}
                          className={`justify-start transition-all duration-200 ${
                            optionalFieldsExpanded.supportPurchase 
                            ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' 
                            : 'bg-[#fafafa] text-[#73370c] border-gray-300 hover:bg-[#fafafa] hover:text-[#73370c]'
                          }`}
                          >
                          <Heart className="mr-2 h-4 w-4" />
                          おすそわけ
                        </Button>
                      </div>

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

                      {/* 6. 評価入力フィールド */}
                      {optionalFieldsExpanded.rating && (
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

                      {/* 2. 残数フィールド */}
                      {optionalFieldsExpanded.remainingSlots && (
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
                      {optionalFieldsExpanded.url && (
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
                      {optionalFieldsExpanded.image && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FormItem>
                            <FormLabel className="text-lg font-semibold flex items-center">
                              <ImageIcon className="mr-2 h-5 w-5" />
                              画像 (最大5枚・掲示板では4:5比率で表示)
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
                      {optionalFieldsExpanded.customerSituation && (
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

                      {/* 来客状況フィールド - プレビュー削除版 */}
                      {optionalFieldsExpanded.customerSituation && (
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

                      {/* 7. クーポンフィールド */}
                      {optionalFieldsExpanded.coupon && (
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
                      {optionalFieldsExpanded.phoneNumber && (
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
                      {optionalFieldsExpanded.file && (
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
                      {optionalFieldsExpanded.supportPurchase && (
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

          {/* 🔥 カスタム時間設定モーダル */}
          <CustomModal
            isOpen={showCustomTimeModal}
            onClose={() => setShowCustomTimeModal(false)}
            title="カスタム掲載時間の設定"
          >
            <div className="pt-2 space-y-4">
              <p className="text-sm text-gray-600">
                掲載時間を設定してください（最大12時間）
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">時間</Label>
                  <Select 
                    value={String(customHours)} 
                    onValueChange={(value) => setCustomHours(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 13 }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {i}時間
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              </div>
                
                <div>
                  <Label className="text-sm font-medium">分</Label>
                  <Select 
                    value={String(customMinutes)} 
                    onValueChange={(value) => setCustomMinutes(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 15, 30, 45].map((minute) => (
                        <SelectItem key={minute} value={String(minute)}>
                          {minute}分
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              </div>
            </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm text-blue-800">
                  設定時間: {customHours}時間{customMinutes}分
                  {customHours * 60 + customMinutes > 720 && (
                    <span className="text-red-600 block">※12時間を超えています</span>
                  )}
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCustomTimeModal(false)}
                >
                  キャンセル
                </Button>
                <Button 
                  onClick={handleCustomTimeSet}
                  disabled={customHours * 60 + customMinutes > 720 || customHours * 60 + customMinutes === 0}
                >
                  設定
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