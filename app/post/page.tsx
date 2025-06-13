"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Camera, Upload, X, Store as StoreIcon, LayoutGrid, ClipboardList, Image as ImageIcon, Percent, CalendarClock, PackageIcon, Calculator, ClockIcon, Tag, Laugh, Smile, Meh, Frown, Angry, HelpCircle, MapPin, CheckCircle, Crop } from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useLoadScript, Autocomplete, GoogleMap } from "@react-google-maps/api";
import { useLoading } from '@/contexts/loading-context';
import { setTimeout } from 'timers/promises';
import { PostCard } from '@/components/posts/post-card';

declare global {
  interface Window {
    google: any;
  }
}

// 🔥 厳密なバリデーションスキーマ
const postSchema = z.object({
  storeId: z.string().min(1, { message: 'お店を選択してください' }),
  storeName: z.string().min(1, { message: "お店の名前が取得できませんでした。"}),
  category: z.string().min(1, { message: 'カテゴリを選択してください' }),
  content: z.string().min(5, { message: '5文字以上入力してください' }).max(120, { message: '120文字以内で入力してください' }),
  discountRate: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val === '') return 1;
      const num = parseInt(String(val), 10);
      return isNaN(num) ? 1 : num;
    },
    z.number({ invalid_type_error: '有効な数値を入力してください' })
     .min(1, { message: 'おトク率を選択してください' })
     .max(100, { message: '100%以下で入力してください' })
  ),
  price: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val === '') return undefined;
      if (typeof val === 'string') {
        const num = parseInt(val.replace(/,/g, ''), 10);
        return isNaN(num) ? undefined : num;
      }
      return val;
    },
    z.number({ invalid_type_error: '有効な数値を入力してください' })
     .positive({ message: '価格は0より大きい値を入力してください' })
     .min(1, { message: '価格は1以上で入力してください' })
  ),
  expiryOption: z.enum(['1h', '3h', '6h', '12h'], { required_error: '掲載期間を選択してください' }),
  // 位置情報フィールド（任意）
  location_lat: z.number().optional(),
  location_lng: z.number().optional(),
  store_latitude: z.number().optional(),
  store_longitude: z.number().optional(),
});

type PostFormValues = z.infer<typeof postSchema>;

type DisplayStore = Pick<Store, 'name'> & { id: string };

const libraries: ("places")[] = ["places"];

const categories = ['惣菜', '弁当', '肉', '魚', '野菜', '果物', '米・パン類', 'デザート類', 'その他'];

const expiryOptions = [
  { value: '1h', label: '1時間後' },
  { value: '3h', label: '3時間後' },
  { value: '6h', label: '6時間後' },
  { value: '12h', label: '12時間後' },
];

const discountIcons = [
  { value: 1, Icon: Angry, label: "0%" },
  { value: 20, Icon: Frown, label: "20~40%" },
  { value: 40, Icon: Meh, label: "40~60%" },
  { value: 60, Icon: Smile, label: "60~80%" },
  { value: 80, Icon: Laugh, label: "80~100%" },
];

const defaultCategoryImages: Record<string, string> = {
  '惣菜': 'https://fuanykkpsjiynzzkkhtv.supabase.co/storage/v1/object/public/images//default_souzai.png',
  '弁当': 'https://fuanykkpsjiynzzkkhtv.supabase.co/storage/v1/object/public/images//default_bento.png',
  '肉': 'https://fuanykkpsjiynzzkkhtv.supabase.co/storage/v1/object/public/images//default_meat.png',
  '魚': 'https://fuanykkpsjiynzzkkhtv.supabase.co/storage/v1/object/public/images//default_fish.png',
  '野菜': 'https://fuanykkpsjiynzzkkhtv.supabase.co/storage/v1/object/public/images//default_vegetable.png',
  '果物': 'https://fuanykkpsjiynzzkkhtv.supabase.co/storage/v1/object/public/images//default_fruit.png',
  '米・パン類': 'https://fuanykkpsjiynzzkkhtv.supabase.co/storage/v1/object/public/images//default_bread_rice.png',
  'デザート類': 'https://fuanykkpsjiynzzkkhtv.supabase.co/storage/v1/object/public/images//default_dessert.png',
  'その他': 'https://fuanykkpsjiynzzkkhtv.supabase.co/storage/v1/object/public/images//default_other.png',
};

// 🔥 画像リサイズ関数（350px × 350px より大きい場合のみリサイズ）
const resizeImageToSquare = (file: File, targetSize: number = 350): Promise<{ file: File; resized: boolean; originalSize: { width: number; height: number } }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const originalWidth = img.width;
      const originalHeight = img.height;

      // 🔥 元画像が350px × 350px以下の場合はそのまま使用
      if (originalWidth <= targetSize && originalHeight <= targetSize) {
        console.log("PostPage: Image is already small enough, using original size:", { originalWidth, originalHeight });
        resolve({
          file: file, // 元のファイルをそのまま返す
          resized: false,
          originalSize: { width: originalWidth, height: originalHeight }
        });
        return;
      }

      // 🔥 350px × 350pxより大きい場合のみリサイズ処理
      console.log("PostPage: Image is larger than target size, resizing:", { originalWidth, originalHeight, targetSize });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // キャンバスサイズを目標サイズに設定
      canvas.width = targetSize;
      canvas.height = targetSize;

      // 背景を白で塗りつぶし（透明な場合のため）
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetSize, targetSize);

      // 画像全体を350px × 350pxにリサイズ（アスペクト比は変更されるが画像全体が表示される）
      ctx.drawImage(
        img,
        0, 0, // 描画開始位置（左上）
        targetSize, targetSize // 描画サイズ（350px × 350px）
      );

      // Canvas から Blob を作成
      canvas.toBlob((blob) => {
        if (blob) {
          // File オブジェクトを作成
          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          resolve({
            file: resizedFile,
            resized: true,
            originalSize: { width: originalWidth, height: originalHeight }
          });
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, file.type, 0.9); // 90%の品質で保存
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // 画像を読み込み
    img.src = URL.createObjectURL(file);
  });
};

export default function PostPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isResizing, setIsResizing] = useState(false); // 🔥 リサイズ中の状態
  const [imageResizeInfo, setImageResizeInfo] = useState<{
    resized: boolean;
    originalSize: { width: number; height: number };
    finalSize: { width: number; height: number };
  } | null>(null); // 🔥 リサイズ情報を保持
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [formDataToSubmit, setFormDataToSubmit] = useState<PostFormValues | null>(null);
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
  const [showStoreSearchInfoModal, setShowStoreSearchInfoModal] = useState(false);
  const [hasUserRemovedDefaultImage, setHasUserRemovedDefaultImage] = useState(false);
  const { showLoading, hideLoading } = useLoading();
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  
  // 位置情報取得状況の表示用
  const [locationStatus, setLocationStatus] = useState<'none' | 'getting' | 'success' | 'error'>('none');

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  // 🔥 厳密なフォーム設定
  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      storeId: '',
      storeName: '',
      category: '',
      content: '',
      discountRate: 1, // デフォルトを1に設定（0%に対応）
      price: undefined,
      expiryOption: '3h',
      location_lat: undefined,
      location_lng: undefined,
      store_latitude: undefined,
      store_longitude: undefined,
    },
    mode: 'onChange',
  });
  
  const { formState: { isValid, isSubmitting } } = form;
  
  const selectedCategory = form.watch('category');
  const watchedFormValues = form.watch(); // フォームの全フィールドを監視

  useEffect(() => {
    return () => {
      if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrl(reader.result as string);
        setHasUserRemovedDefaultImage(false);
      };
      reader.readAsDataURL(imageFile);
    } else if (selectedCategory && defaultCategoryImages[selectedCategory] && !hasUserRemovedDefaultImage) {
      setImagePreviewUrl(defaultCategoryImages[selectedCategory]);
    } else {
      setImagePreviewUrl(null);
    }
  }, [imageFile, selectedCategory, hasUserRemovedDefaultImage]);
  
  // 🔥 厳密な投稿処理
  const handleActualSubmit = async (values: PostFormValues) => {
    if (!session?.user?.id) {
      console.log("PostPage: User not logged in, redirecting to login page.");
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    // 🔥 必須フィールドの厳密な検証
    if (!values.storeId || !values.storeName) {
      setSubmitError("店舗が選択されていません。お店を選択してください。");
      return;
    }

    if (!values.category) {
      setSubmitError("カテゴリが選択されていません。");
      return;
    }

    if (!values.content || values.content.length < 5) {
      setSubmitError("投稿内容を5文字以上入力してください。");
      return;
    }

    if (values.discountRate === undefined || values.discountRate === null) {
      setSubmitError("おトク率を選択してください。");
      return;
    }

    if (!values.price || values.price <= 0) {
      setSubmitError("価格を正しく入力してください。");
      return;
    }

    console.log("PostPage: Form validation passed, values:", {
      storeId: values.storeId,
      storeName: values.storeName,
      store_latitude: values.store_latitude,
      store_longitude: values.store_longitude,
    });

    form.clearErrors("root.serverError");
    showLoading();
    setIsUploading(true);
    setSubmitError(null);
    setShowConfirmModal(false);

    let imageUrlToSave: string | null = null;
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

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const userFolder = session.user.id;
        const uniqueFileName = `${uuidv4()}.${fileExt}`;
        const objectPath = `${userFolder}/${uniqueFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(objectPath, imageFile, {
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
        
        imageUrlToSave = publicUrlData?.publicUrl || null;
        console.log("PostPage: User image uploaded to Supabase Storage. Public URL:", imageUrlToSave);
      } else {
        const category = values.category;
        if (category && defaultCategoryImages[category]) {
          imageUrlToSave = defaultCategoryImages[category];
          console.log("PostPage: Using default category image from Supabase Storage. Public URL:", imageUrlToSave);
        } else {
          imageUrlToSave = null;
          console.warn("PostPage: No user image and no default image found for category:", category);
        }
      }

      // 🔥 投稿データを確実に準備
      const postData: any = {
        app_profile_id: appProfileId,
        store_id: values.storeId,
        store_name: values.storeName,
        category: values.category,
        content: values.content,
        image_url: imageUrlToSave,
        discount_rate: values.discountRate,
        price: values.price,
        expiry_option: values.expiryOption,
        expires_at: calculateExpiresAt(values.expiryOption).toISOString(),
      };

      // 🔥 位置情報を確実に設定
      if (values.store_latitude && values.store_longitude) {
        postData.store_latitude = Number(values.store_latitude);
        postData.store_longitude = Number(values.store_longitude);
        postData.location_geom = `POINT(${values.store_longitude} ${values.store_latitude})`;
        
        console.log("PostPage: Saving post with location data:", {
          store_latitude: postData.store_latitude,
          store_longitude: postData.store_longitude,
          location_geom: postData.location_geom
        });
      } else {
        console.log("PostPage: Saving post without location data");
      }

      const { data: insertedPost, error: insertError } = await supabase
        .from('posts')
        .insert(postData)
        .select('id, store_id, store_name, app_profile_id, store_latitude, store_longitude')
        .single();

      if (insertError || !insertedPost) {
        console.error("PostPage: Error inserting post:", insertError);
        throw new Error(`投稿の保存に失敗しました: ${insertError?.message || "Unknown error"}`);
      }
      
      createdPostId = insertedPost.id;
      console.log("PostPage: Post inserted successfully with ID:", createdPostId, "Location:", {
        latitude: insertedPost.store_latitude,
        longitude: insertedPost.store_longitude
      });

      // 位置情報が保存されたかチェック（位置情報を送信した場合のみ）
      if (values.store_latitude && values.store_longitude && (!insertedPost.store_latitude || !insertedPost.store_longitude)) {
        console.warn("PostPage: Location data was not saved properly:", insertedPost);
        toast({
          title: "⚠️ 位置情報の保存に問題がありました",
          description: "投稿は保存されましたが、位置情報が正しく保存されませんでした。",
          duration: 5000,
        });
      } else if (values.store_latitude && values.store_longitude) {
        console.log("PostPage: Location data saved successfully!");
      }

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
      } else {
        console.warn("PostPage: Missing data for notification, skipping notify function call.", {
          createdPostId,
          storeId: insertedPost?.store_id,
          storeName: insertedPost?.store_name,
          appProfileId: insertedPost?.app_profile_id
        });
      }

      form.reset({
        storeId: '',
        storeName: '',
        category: '',
        content: '',
        discountRate: 1,
        price: undefined,
        expiryOption: '3h',
        location_lat: undefined,
        location_lng: undefined,
        store_latitude: undefined,
        store_longitude: undefined,
      });
      setImageFile(null);
      setImageResizeInfo(null); // 🔥 リサイズ情報もクリア
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

  // 🔥 画像アップロード処理を更新（リサイズ機能付き）
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（5MB制限）
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "⚠️ ファイルサイズが大きすぎます",
        description: "5MB以下の画像を選択してください。",
        duration: 3000,
      });
      return;
    }

    // ファイルタイプチェック
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "⚠️ サポートされていないファイル形式です",
        description: "JPG、PNG、またはWEBP形式の画像を選択してください。",
        duration: 3000,
      });
      return;
    }

    setIsResizing(true);
    setSubmitError(null);

    try {
      // 🔥 画像サイズをチェックしてリサイズ（必要な場合のみ）
      const result = await resizeImageToSquare(file, 350);
      
      setImageFile(result.file);
      setImageResizeInfo({
        resized: result.resized,
        originalSize: result.originalSize,
        finalSize: result.resized 
          ? { width: 350, height: 350 }
          : result.originalSize
      });
      
      // 🔥 適切なメッセージを表示
      if (result.resized) {
        toast({
          title: "✅ 画像をリサイズしました",
          description: `${result.originalSize.width}×${result.originalSize.height}px → 350×350px に最適化されました。`,
          duration: 3000,
        });
      } else {
        toast({
          title: "✅ 画像をアップロードしました",
          description: `${result.originalSize.width}×${result.originalSize.height}px (リサイズ不要)`,
          duration: 3000,
        });
      }
      
      console.log("PostPage: Image processing completed:", {
        originalSize: result.originalSize,
        resized: result.resized,
        originalFileSize: file.size,
        finalFileSize: result.file.size
      });
      
    } catch (error) {
      console.error("PostPage: Error processing image:", error);
      toast({
        title: "⚠️ 画像の処理に失敗しました",
        description: "別の画像を選択してください。",
        duration: 3000,
      });
    } finally {
      setIsResizing(false);
    }
  };
  
  const removeImage = () => {
    setImageFile(null);
    setImagePreviewUrl(null);
    setImageResizeInfo(null); // 🔥 リサイズ情報もクリア
    setHasUserRemovedDefaultImage(true);
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  useEffect(() => {
    if (status !== "loading" && !session) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [session, status, router]);

  const getSelectPlaceholder = () => {
    if (permissionState === 'pending' || locationLoading) return "現在地を取得中...";
    if (permissionState === 'prompt') return "お店を検索するには位置情報の許可が必要です";
    if (permissionState === 'denied') return "位置情報がブロックされています";
    if (locationError) return `位置情報エラー: ${locationError}`;
    if (locationLoading) return "お店を検索中...";
    if (permissionState === 'granted' && latitude && longitude && !locationLoading) return "周辺500m以内に店舗が見つかりません";
    return "お店を選択してください";
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

  // 🔥 Google Places API連携の確実な設定
  useEffect(() => {
    if (isLoaded && storeInputRef.current) {
      const newAutocomplete = new google.maps.places.Autocomplete(storeInputRef.current, {
        types: ['establishment'],
        componentRestrictions: { 'country': ['jp'] },
      });
      
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
            duration: 3000,
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

  const handleMoveToMap = () => {
    setShowStoreSearchInfoModal(false);
    router.push('/map');
  };

  // 位置情報状況表示コンポーネント
  const LocationStatusIndicator = () => {
    const lat = form.watch('store_latitude');
    const lng = form.watch('store_longitude');
    
    if (lat && lng) {
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
              <FormItem>
                <FormLabel className="text-xl mb-2 flex items-center">
                  <ImageIcon className="mr-2 h-7 w-7" />
                  商品画像 (任意)
                  {/* 🔥 リサイズ情報の表示 */}
                  <div className="ml-3 flex items-center bg-blue-50 px-2 py-1 rounded-md">
                    <Crop className="h-4 w-4 text-blue-600 mr-1" />
                    <span className="text-xs text-blue-800">大きい画像は350×350px調整</span>
                  </div>
                </FormLabel>
                <FormControl>
                  <div className="flex flex-col items-center space-y-3 p-6 border-2 border-dashed rounded-lg hover:border-primary transition-colors cursor-pointer bg-card">
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isUploading || isResizing}
                      onClick={() => setHasUserRemovedDefaultImage(false)}
                    />
                    {isResizing ? (
                      <div className="flex flex-col items-center space-y-3 text-muted-foreground">
                        <Loader2 className="h-12 w-12 animate-spin" />
                        <p className="text-lg">画像を350×350pxにリサイズ中...</p>
                      </div>
                    ) : imagePreviewUrl ? (
                      <div className="relative group">
                        {/* 🔥 プレビュー画像を350px × 350pxで表示 */}
                        <div className="w-[350px] h-[350px] rounded-md overflow-hidden border-2 border-gray-200">
                          <img 
                            src={imagePreviewUrl} 
                            alt="プレビュー" 
                            className="w-full h-full object-cover"
                            style={{ objectFit: 'cover' }}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={removeImage}
                          disabled={isUploading || isResizing}
                        >
                          <X className="h-5 w-5" />
                        </Button>
                        {/* 🔥 リサイズ情報の表示 */}
                        {imageFile && imageResizeInfo && (
                          <div className="absolute bottom-2 left-2 bg-green-500 text-white px-2 py-1 rounded-md text-xs">
                            {imageResizeInfo.resized 
                              ? `${imageResizeInfo.originalSize.width}×${imageResizeInfo.originalSize.height} → 350×350`
                              : `${imageResizeInfo.originalSize.width}×${imageResizeInfo.originalSize.height}`
                            }
                          </div>
                        )}
                      </div>
                    ) : (
                      <label htmlFor="image-upload" className="flex flex-col items-center space-y-2 cursor-pointer text-muted-foreground">
                        <Upload className="h-12 w-12" />
                        <p className="text-lg">画像をアップロード</p>
                        <p className="text-xs">PNG, JPG, WEBP (最大5MB)</p>
                        <p className="text-xs text-blue-600">350×350px以上の画像は自動調整されます</p>
                      </label>
                    )}
                  </div>
                </FormControl>
                <p className="text-sm text-red-500 mt-1">※陳列している商品の画像をアップしないでください。購入後の商品の画像をアップしてください。</p>
                {!imageFile && (
                  <p className="text-sm text-muted-foreground mt-1 ">
                    未アップロードの場合、自動的に画像が設定されます。
                  </p>
                )}
              </FormItem>

              <FormField
                control={form.control}
                name="storeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xl font-semibold flex items-center">
                      <StoreIcon className="mr-2 h-6 w-6" />お店<span className="text-destructive ml-1">※</span>
                      <span
                        className="ml-2 flex items-center text-sm text-blue-600 cursor-pointer hover:underline"
                        onClick={() => setShowStoreSearchInfoModal(true)}
                      >
                        <HelpCircle className="h-4 w-4 mr-1" />
                        検索候補が表示されない時は...
                      </span>
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <div className="relative">
                          <FavoriteStoreInput
                            value={{ id: field.value, name: form.getValues("storeName") }}
                            onChange={async (store) => {
                              console.log("PostPage: Store selected from FavoriteStoreInput:", store);
                              if (store) {
                                form.setValue("storeId", store.id, { shouldValidate: true });
                                form.setValue("storeName", store.name, { shouldValidate: true });
                                
                                // 🔥 位置情報を確実に設定（store情報に含まれている場合）
                                if ((store as any).latitude && (store as any).longitude) {
                                  const lat = Number((store as any).latitude);
                                  const lng = Number((store as any).longitude);
                                  
                                  console.log("PostPage: Setting location from store:", { lat, lng });
                                  
                                  form.setValue("store_latitude", lat, { shouldValidate: true });
                                  form.setValue("store_longitude", lng, { shouldValidate: true });
                                  form.setValue("location_lat", lat, { shouldValidate: true });
                                  form.setValue("location_lng", lng, { shouldValidate: true });
                                  setLocationStatus('success');
                                  
                                  toast({
                                    title: "✅ 店舗情報と位置情報を取得しました",
                                    description: `${store.name} (緯度: ${lat.toFixed(6)}, 経度: ${lng.toFixed(6)})`,
                                    duration: 3000,
                                  });
                                } else {
                                  console.warn("PostPage: Store has no location data, trying to fetch from Google Places:", store);
                                  
                                  // 🔥 位置情報がない場合はGoogle Places APIで検索
                                  if (window.google && window.google.maps && window.google.maps.places) {
                                    setLocationStatus('getting');
                                    
                                    const service = new google.maps.places.PlacesService(document.createElement('div'));
                                    const request = {
                                      query: store.name,
                                      fields: ['place_id', 'name', 'geometry', 'formatted_address'],
                                    };
                                    
                                    service.textSearch(request, (results, status) => {
                                      if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
                                        const place = results[0];
                                        console.log("PostPage: Found place via text search:", place);
                                        
                                        if (place.geometry && place.geometry.location) {
                                          const lat = place.geometry.location.lat();
                                          const lng = place.geometry.location.lng();
                                          
                                          console.log("PostPage: Setting location from Google Places text search:", { lat, lng });
                                          
                                          form.setValue("store_latitude", lat, { shouldValidate: true });
                                          form.setValue("store_longitude", lng, { shouldValidate: true });
                                          form.setValue("location_lat", lat, { shouldValidate: true });
                                          form.setValue("location_lng", lng, { shouldValidate: true });
                                          setLocationStatus('success');
                                          
                                          // 🔥 取得した位置情報をデータベースに保存
                                          try {
                                            supabase
                                              .from('stores')
                                              .update({
                                                latitude: lat,
                                                longitude: lng,
                                                location_geom: `POINT(${lng} ${lat})`
                                              })
                                              .eq('id', store.id)
                                              .then(({ error }) => {
                                                if (error) {
                                                  console.error("PostPage: Error updating store location:", error);
                                                } else {
                                                  console.log("PostPage: Store location updated successfully");
                                                }
                                              });
                                          } catch (error) {
                                            console.error("PostPage: Error saving store location:", error);
                                          }
                                          
                                          toast({
                                            title: "✅ 店舗情報と位置情報を取得しました",
                                            description: `${store.name} (緯度: ${lat.toFixed(6)}, 経度: ${lng.toFixed(6)})`,
                                            duration: 3000,
                                          });
                                        } else {
                                          console.warn("PostPage: No geometry found in place result");
                                          setLocationStatus('error');
                                          toast({
                                            title: "⚠️ 位置情報を取得できませんでした",
                                            description: "手動で位置情報を設定するか、別の店舗を選択してください",
                                            duration: 5000,
                                          });
                                        }
                                      } else {
                                        console.warn("PostPage: Places text search failed:", status);
                                        setLocationStatus('error');
                                        toast({
                                          title: "⚠️ 位置情報を取得できませんでした", 
                                          description: "手動で位置情報を設定するか、別の店舗を選択してください",
                                          duration: 5000,
                                        });
                                      }
                                    });
                                  } else {
                                    console.warn("PostPage: Google Places API not available");
                                    // 位置情報がない場合はundefinedに設定
                                    form.setValue("store_latitude", undefined, { shouldValidate: true });
                                    form.setValue("store_longitude", undefined, { shouldValidate: true });
                                    form.setValue("location_lat", undefined, { shouldValidate: true });
                                    form.setValue("location_lng", undefined, { shouldValidate: true });
                                    setLocationStatus('error');
                                    
                                    toast({
                                      title: "⚠️ 位置情報を取得できませんでした",
                                      description: "手動で位置情報を設定するか、別の店舗を選択してください",
                                      duration: 5000,
                                    });
                                  }
                                }
                              } else {
                                console.log("PostPage: Clearing store selection");
                                form.setValue("storeId", "", { shouldValidate: true });
                                form.setValue("storeName", "", { shouldValidate: true });
                                form.setValue("store_latitude", undefined, { shouldValidate: true });
                                form.setValue("store_longitude", undefined, { shouldValidate: true });
                                form.setValue("location_lat", undefined, { shouldValidate: true });
                                form.setValue("location_lng", undefined, { shouldValidate: true });
                                setLocationStatus('none');
                              }
                            }}
                            placeholder="お店を検索または選択してください"
                            style={{ fontSize: '16px' }}
                          />
                        </div>
                        <LocationStatusIndicator />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 🔥 隠しフィールドをFormFieldとして正しく設定 */}
              <FormField
                control={form.control}
                name="storeName"
                render={({ field }) => (
                  <FormItem style={{ display: 'none' }}>
                    <FormControl>
                      <input type="hidden" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="store_latitude"
                render={({ field }) => (
                  <FormItem style={{ display: 'none' }}>
                    <FormControl>
                      <input type="hidden" {...field} value={field.value || ''} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="store_longitude"
                render={({ field }) => (
                  <FormItem style={{ display: 'none' }}>
                    <FormControl>
                      <input type="hidden" {...field} value={field.value || ''} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location_lat"
                render={({ field }) => (
                  <FormItem style={{ display: 'none' }}>
                    <FormControl>
                      <input type="hidden" {...field} value={field.value || ''} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location_lng"
                render={({ field }) => (
                  <FormItem style={{ display: 'none' }}>
                    <FormControl>
                      <input type="hidden" {...field} value={field.value || ''} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xl flex font-semibold items-center">
                      <LayoutGrid className="mr-2 h-6 w-6" /> カテゴリ<span className="text-destructive ml-1">※</span>
                    </FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="w-full text-lg py-6">
                          <SelectValue placeholder="カテゴリを選択してください" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category} className="text-lg py-3">
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xl flex font-semibold items-center">
                      <ClipboardList className="mr-2 h-6 w-6" /> 内容<span className="text-destructive ml-1">※</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="商品の状態や残り数量、みんなに知らせたいお得情報を記入してください（120文字以内）"
                        className="resize-none"
                        style={{ fontSize: '16px' }}
                        rows={5}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="discountRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xl flex items-center font-semibold">
                      <Calculator className="mr-2 h-6 w-6 " /> お得感 <span className="text-destructive ml-1">※</span> :
                      <span className="ml-2 text-primary font-bold flex items-center">
                        {(() => {
                          const selectedOption = discountIcons.find(option => option.value === field.value);
                          const displayIcon = selectedOption ? selectedOption.Icon : Angry; // デフォルトはAngry (0%)

                          return (
                            <>
                              {React.createElement(displayIcon, { className: "h-7 w-7 mr-2" })}
                            </>
                          );
                        })()}
                      </span>
                      <span className="text-sm font-normal text-muted-foreground ml-3">お得度を顔文字であらわそう</span>
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(val) => field.onChange(parseInt(val, 10))}
                        value={field.value !== undefined ? String(field.value) : String(1)}
                        className="grid grid-cols-5 gap-2"
                      >
                        {discountIcons.map((option) => (
                          <div key={option.value}>
                            <RadioGroupItem
                              value={String(option.value)}
                              id={`discount-icon-${option.value}`}
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor={`discount-icon-${option.value}`}
                              className={cn(
                                "flex flex-col items-center justify-center rounded-md border-2 border-muted p-3 text-lg h-full cursor-pointer",
                                "hover:border-primary peer-data-[state=checked]:border-primary",
                                "peer-data-[state=checked]:bg-primary/10"
                              )}
                            >
                              {React.createElement(option.Icon, { className: "h-8 w-8 mb-1" })}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xl flex font-semibold items-center"><Tag className="mr-2 h-6 w-6" />価格 (税込)<span className="text-destructive ml-1">※</span></FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="例: 500"
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
              
              <FormField
                control={form.control}
                name="expiryOption"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-xl flex font-semibold items-center">
                      <ClockIcon className="mr-2 h-6 w-6" /> 掲載期間<span className="text-destructive ml-1">※</span>
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-3 gap-2"
                      >
                        {expiryOptions.map((option) => (
                          <div key={option.value}>
                            <RadioGroupItem
                              value={option.value.toString()}
                              id={`expiryOption-${option.value}`}
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor={`expiryOption-${option.value}`}
                              className={cn(
                                "flex flex-col items-center justify-center rounded-md border-2 border-muted p-3 text-lg h-full",
                                "hover:border-primary peer-data-[state=checked]:border-primary",
                                "peer-data-[state=checked]:bg-primary/10"
                              )}
                            >
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {submitError && (
                <p className="text-sm text-destructive text-center bg-destructive/10 p-3 rounded-md">{submitError}</p>
              )}

              <motion.div whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  disabled={!isValid || isSubmitting || isUploading || isResizing}
                  className={cn(
                    "w-full text-xl py-3",
                    (!isValid || isSubmitting || isUploading || isResizing) && "bg-gray-400 cursor-not-allowed hover:bg-gray-400"
                  )}
                >
                  {(isSubmitting || isUploading || isResizing) ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {isResizing ? "画像処理中..." : "投稿する"}
                    </>
                  ) : (
                    "投稿する"
                  )}
                </Button>
                <p className="text-sm text-destructive text-center mt-2">※は 必須入力です</p>
              </motion.div>
            </form>
          </Form>

          <CustomModal
            isOpen={showConfirmModal}
            onClose={() => {
              setShowConfirmModal(false);
              setFormDataToSubmit(null);
            }}
            title="投稿内容の確認"
          >
            <div className="pt-2">
              <p className="text-sm text-destructive  mb-4">
                投稿した記事は後から削除や編集を行うことはできません。
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
            isOpen={showStoreSearchInfoModal}
            onClose={() => setShowStoreSearchInfoModal(false)}
            title="お店の検索候補について"
          >
            <div className="pt-2">
              <p className="mb-4 text-center">
                検索候補が表示されない場合は、正確な店舗情報を見つけるために、一度「お店を探す画面」へ移動してください。
              </p>
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={handleMoveToMap}
                >
                  お店を探す画面へ移動
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