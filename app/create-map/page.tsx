"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { 
  Upload, X, MapPin, Plus, Trash2, 
  Loader2, Image as ImageIcon, Link as LinkIcon, Tag, ClockIcon,
  MapIcon, CheckCircle, ChevronUp, ChevronDown, Home, User, ArrowLeft,
  Navigation, Crosshair, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { useSession } from "next-auth/react";
import { supabase } from '@/lib/supabaseClient';
import { calculateExpiresAt } from '@/lib/expires-at-date';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/lib/hooks/use-toast';
import { useLoading } from '@/lib/contexts/loading-context';
import { useGoogleMapsApi } from '@/components/providers/GoogleMapsApiProvider';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { createMap, type CreateMapInput, type LocationData as ServerLocationData } from '@/app/_actions/maps';
import { 
  TransportDetailInput, 
  TransportDetails, 
  DETAILED_TRANSPORT_OPTIONS,
  type TransportType 
} from '@/components/map/transport-detail-input';
import { Breadcrumb } from '@/components/seo/breadcrumb';
import { RPGAccordion } from '@/components/ui/rpg-accordion';
import { ReorderableTimeline, type TimelineSpotData } from '@/components/map/reorderable-timeline';
import { MarkerLocationModal } from '@/components/map/marker-location-modal';

// 移動手段の選択肢（タイムライン用）
const TRANSPORT_OPTIONS = [
  { value: 'none', label: '選択なし', icon: '−' },
  { value: 'walk', label: '徒歩', icon: '🚶' },
  { value: 'bus', label: 'バス', icon: '🚌' },
  { value: 'taxi', label: 'タクシー', icon: '🚕' },
  { value: 'car', label: '車', icon: '🚗' },
  { value: 'bicycle', label: '自転車', icon: '🚲' },
  { value: 'train', label: '電車', icon: '🚃' },
  { value: 'ship', label: '船', icon: '🚢' },
  { value: 'airplane', label: '飛行機', icon: '✈️' },
] as const;

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
  url: string;
  // 新規追加項目
  stayDuration?: number; // 滞在予定時間（分）
  transportDetails?: TransportDetails; // 詳細な移動手段情報
  nextTransport?: string; // 次のスポットへの移動手段（タイムライン用）
  nextTravelTime?: number; // 次のスポットへの所要時間（分）
}

// 掲載期間を自動計算する関数
const calculateMapExpiryDays = (startDate: string, endDate?: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDateStr = endDate && endDate.trim() !== '' ? endDate : startDate;
  const targetDate = new Date(targetDateStr);
  targetDate.setHours(23, 59, 59, 999);
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(1, Math.min(90, diffDays));
};

// フォームスキーマ
const createMapSchema = z.object({
  title: z.string().min(1, { message: 'タイトルは必須です' }).max(100, { message: '100文字以内で入力してください' }),
  description: z.string().max(500, { message: '500文字以内で入力してください' }).optional(),
  publicationStartDate: z.string().min(1, { message: '掲載開始日は必須です' }),
  publicationEndDate: z.string().optional(),
  customExpiryDays: z.number().min(1, { message: '1日以上を設定してください' }).max(90, { message: '90日以下を設定してください' }),
  isPublic: z.boolean(),
}).refine((data) => {
  if (data.publicationEndDate && data.publicationEndDate.trim() !== '' && data.publicationStartDate && data.publicationStartDate.trim() !== '') {
    const startDate = new Date(data.publicationStartDate);
    const endDate = new Date(data.publicationEndDate);
    return endDate >= startDate;
  }
  return true;
}, {
  message: '掲載終了日は開始日以降の日付を選択してください',
  path: ['publicationEndDate'],
});

type MapFormValues = z.infer<typeof createMapSchema>;

// 丸数字変換関数
const toCircledNumber = (num: number): string => {
  const circled = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', 
                   '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'];
  return circled[num - 1] || `${num}`;
};

export default function CreateMapPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const { showLoading, hideLoading } = useLoading();
  const { isLoaded, loadError } = useGoogleMapsApi();
  const { latitude, longitude } = useGeolocation();
  
  // フォーム管理
  const form = useForm<MapFormValues>({
    resolver: zodResolver(createMapSchema),
    defaultValues: {
      title: '',
      description: '',
      publicationStartDate: '',
      publicationEndDate: '',
      customExpiryDays: 30,
      isPublic: true,
    },
  });
  
  // ハッシュタグ管理
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const prevHashtagsLengthRef = useRef(0);
  
  // サムネイル管理
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  
  // 複数場所の管理
  const [locations, setLocations] = useState<LocationData[]>([{
    id: crypto.randomUUID(),
    storeName: '',
    storeId: '',
    store_latitude: undefined,
    store_longitude: undefined,
    content: '',
    imageFiles: [],
    imagePreviewUrls: [],
    url: '',
    stayDuration: undefined,
    transportDetails: { type: 'none' },
  }]);
  
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSavingSpot, setIsSavingSpot] = useState(false); // スポット個別保存中フラグ

  // currentLocationIndexが配列の範囲内に収まるようにする
  useEffect(() => {
    if (locations.length > 0 && currentLocationIndex >= locations.length) {
      setCurrentLocationIndex(locations.length - 1);
    }
  }, [locations.length, currentLocationIndex]);

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
      location.imageFiles.length > 0
    );
    
    return hasTitle && hasValidLocation;
  };
  
  // ログインチェック
  useEffect(() => {
    if (status !== "loading" && !session) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [session, status, router]);
  
  // ハッシュタグ追加
  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, '');
    if (tag && !hashtags.includes(tag) && hashtags.length < 10) {
      setHashtags([...hashtags, tag]);
      setHashtagInput(''); // 入力フォームをリセット
    }
  };
  
  // ハッシュタグ削除
  const removeHashtag = (tagToRemove: string) => {
    setHashtags(hashtags.filter(tag => tag !== tagToRemove));
  };

  // ハッシュタグが追加されたら入力フォームをリセット
  useEffect(() => {
    // ハッシュタグが追加された場合（長さが増えた場合）のみ入力フォームをリセット
    if (hashtags.length > prevHashtagsLengthRef.current) {
      setHashtagInput('');
    }
    prevHashtagsLengthRef.current = hashtags.length;
  }, [hashtags.length]);
  
  // サムネイル画像アップロード処理
  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    if (file.size > maxSize) {
      toast({
        title: "⚠️ ファイルサイズが大きすぎます",
        description: "画像は5MB以下にしてください",
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
    
    // プレビューURL生成
    const reader = new FileReader();
    reader.onloadend = () => {
      setThumbnailPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    setThumbnailFile(file);
    
    toast({
      title: "✅ サムネイルを設定しました",
      duration: 1000,
    });
  };
  
  // サムネイル削除
  const removeThumbnail = () => {
    if (thumbnailPreviewUrl && thumbnailPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(thumbnailPreviewUrl);
    }
    setThumbnailFile(null);
    setThumbnailPreviewUrl(null);
  };
  
  // 場所を追加（楽観的UI対応・即時反映）
  const addLocation = useCallback(() => {
    const newLocation: LocationData = {
      id: crypto.randomUUID(),
      storeName: '',
      storeId: '',
      store_latitude: undefined,
      store_longitude: undefined,
      content: '',
      imageFiles: [],
      imagePreviewUrls: [],
      url: '',
      stayDuration: undefined,
      transportDetails: { type: 'none' },
    };
    
    // 先に現在のlocations長を取得してからstateを更新
    setLocations(prevLocations => {
      const newLocations = [...prevLocations, newLocation];
      return newLocations;
    });
    
    // 次のレンダリングサイクルで新しいスポットを選択
    // requestAnimationFrameを使用してUIの更新を確実に待つ
    requestAnimationFrame(() => {
      setLocations(currentLocations => {
        setCurrentLocationIndex(currentLocations.length - 1);
        return currentLocations;
      });
    });
  }, []);
  
  // 場所を削除（安全な削除処理）
  const removeLocation = useCallback((index: number) => {
    setLocations(prevLocations => {
      if (prevLocations.length === 1) {
        toast({
          title: "⚠️ 削除できません",
          description: "最低1つのスポットが必要です",
          duration: 2000,
        });
        return prevLocations;
      }
      
      const newLocations = prevLocations.filter((_, i) => i !== index);
      
      // 現在選択中のインデックスを調整
      setTimeout(() => {
        setCurrentLocationIndex(prev => {
          if (prev >= newLocations.length) {
            return Math.max(0, newLocations.length - 1);
          }
          if (prev > index) {
            return prev - 1;
          }
          return prev;
        });
      }, 0);
      
      return newLocations;
    });
  }, [toast]);

  // 場所の順番を入れ替え（安全な入れ替え処理）
  const moveLocation = useCallback((index: number, direction: 'up' | 'down') => {
    setLocations(prevLocations => {
      if (direction === 'up' && index === 0) return prevLocations;
      if (direction === 'down' && index === prevLocations.length - 1) return prevLocations;
      
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const newLocations = [...prevLocations];
      
      // 配列の要素を入れ替え
      [newLocations[index], newLocations[targetIndex]] = [newLocations[targetIndex], newLocations[index]];
      
      // 現在選択中のインデックスも更新
      setTimeout(() => {
        setCurrentLocationIndex(prev => {
          if (prev === index) return targetIndex;
          if (prev === targetIndex) return index;
          return prev;
        });
      }, 0);
      
      return newLocations;
    });
  }, []);
  
  // 場所の情報を更新（不変性を保つ安全な更新）
  const updateLocation = useCallback((index: number, field: keyof LocationData, value: any) => {
    setLocations(prevLocations => {
      // インデックスが範囲外の場合は何もしない
      if (index < 0 || index >= prevLocations.length) {
        return prevLocations;
      }
      
      // 新しい配列を作成し、該当のオブジェクトのみ更新
      return prevLocations.map((loc, i) => {
        if (i === index) {
          return { ...loc, [field]: value };
        }
        return loc;
      });
    });
  }, []);
  
  // 画像アップロード処理（安全な非同期処理）
  const handleImageUpload = useCallback(async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // 現在のlocationsから該当のlocationを取得
    setLocations(prevLocations => {
      const location = prevLocations[index];
      if (!location) return prevLocations;
      
      if (location.imageFiles.length + files.length > 3) {
        toast({
          title: "⚠️ 画像枚数の上限を超えています",
          description: "各スポットに最大3枚まで画像を追加できます",
          duration: 3000,
        });
        return prevLocations;
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
          return prevLocations;
        }
        
        if (!allowedTypes.includes(file.type)) {
          toast({
            title: "⚠️ サポートされていないファイル形式です",
            description: "JPG、PNG、またはWEBP形式の画像を選択してください",
            duration: 3000,
          });
          return prevLocations;
        }
      }
      
      // プレビューURL生成（非同期だが、ここでは同期的に処理）
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
      
      // 非同期処理を別途実行
      readFilesAsDataURLs().then(newPreviewUrls => {
        setLocations(currentLocations => {
          return currentLocations.map((loc, i) => {
            if (i === index) {
              return {
                ...loc,
                imageFiles: [...loc.imageFiles, ...files],
                imagePreviewUrls: [...loc.imagePreviewUrls, ...newPreviewUrls],
              };
            }
            return loc;
          });
        });
        
        toast({
          title: "✅ 画像を追加しました",
          description: `${files.length}枚の画像が追加されました`,
          duration: 1000,
        });
      });
      
      return prevLocations;
    });
  }, [toast]);
  
  // スポットの入力バリデーション
  const validateSpot = useCallback((location: LocationData): { isValid: boolean; errorMessage: string | null } => {
    if (!location.storeName || (!location.storeId && (!location.store_latitude || !location.store_longitude))) {
      return { isValid: false, errorMessage: 'スポットを選択または位置を指定してください' };
    }
    
    if (!location.content || location.content.length < 5) {
      return { isValid: false, errorMessage: '説明を5文字以上入力してください' };
    }
    
    if (location.imageFiles.length === 0) {
      return { isValid: false, errorMessage: '画像を最低1枚アップロードしてください' };
    }
    
    return { isValid: true, errorMessage: null };
  }, []);

  // 「保存して続ける」処理
  const handleSaveAndContinue = useCallback(async () => {
    const currentLocation = locations[currentLocationIndex];
    if (!currentLocation) return;

    // バリデーション
    const { isValid, errorMessage } = validateSpot(currentLocation);
    if (!isValid) {
      toast({
        title: "⚠️ 入力エラー",
        description: errorMessage,
        duration: 3000,
      });
      return;
    }

    setIsSavingSpot(true);

    try {
      // 新しいスポットを追加
      const newLocation: LocationData = {
        id: crypto.randomUUID(),
        storeName: '',
        storeId: '',
        store_latitude: undefined,
        store_longitude: undefined,
        content: '',
        imageFiles: [],
        imagePreviewUrls: [],
        url: '',
        stayDuration: undefined,
        transportDetails: { type: 'none' },
      };

      // locationsを更新し、新しいインデックスを取得
      setLocations(prevLocations => {
        const newLocations = [...prevLocations, newLocation];
        // 次のレンダリングサイクルで新しいスポットを選択
        requestAnimationFrame(() => {
          setCurrentLocationIndex(newLocations.length - 1);
        });
        return newLocations;
      });

      toast({
        title: "✅ スポットを保存しました",
        description: "次のスポットを入力してください",
        duration: 2000,
      });
    } catch (error) {
      console.error("スポット保存エラー:", error);
      toast({
        title: "⚠️ エラー",
        description: "スポットの保存に失敗しました",
        duration: 3000,
      });
    } finally {
      setIsSavingSpot(false);
    }
  }, [locations, currentLocationIndex, validateSpot, toast]);

  // 画像削除（安全な削除処理）
  const removeImage = useCallback((locationIndex: number, imageIndex: number) => {
    setLocations(prevLocations => {
      const location = prevLocations[locationIndex];
      if (!location) return prevLocations;
      
      // blob URLを解放
      const urlToRevoke = location.imagePreviewUrls[imageIndex];
      if (urlToRevoke && urlToRevoke.startsWith('blob:')) {
        URL.revokeObjectURL(urlToRevoke);
      }
      
      return prevLocations.map((loc, i) => {
        if (i === locationIndex) {
          return {
            ...loc,
            imageFiles: loc.imageFiles.filter((_, idx) => idx !== imageIndex),
            imagePreviewUrls: loc.imagePreviewUrls.filter((_, idx) => idx !== imageIndex),
          };
        }
        return loc;
      });
    });
  }, []);
  
  // 画像アップロード処理（クライアントサイド - Supabase Storage直接アップロード）
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

  // 投稿処理
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
      
      if (location.imageFiles.length === 0) {
        setSubmitError(`スポット${toCircledNumber(i + 1)}: 画像を最低1枚アップロードしてください`);
        setCurrentLocationIndex(i);
        return;
      }
    }
    
    setSubmitError(null);
    showLoading();
    setIsSubmitting(true);
    
    try {
      const userId = session.user.id;
      
      // 掲載期限を計算
      const expiresAt = calculateExpiresAt('days', undefined, values.customExpiryDays);
      
      // サムネイル画像をアップロード（クライアントサイド）
      let thumbnailUrl: string | null = null;
      if (thumbnailFile) {
        thumbnailUrl = await uploadImageToStorage(thumbnailFile, userId);
      }
      
      // 🔥 各場所の画像をアップロードして、locations配列を構築（クライアントサイド）
      const locationsData: ServerLocationData[] = [];
      
      for (let i = 0; i < locations.length; i++) {
        const location = locations[i];
        
        // 画像アップロード
        const imageUrls: string[] = [];
        for (const file of location.imageFiles) {
          const url = await uploadImageToStorage(file, userId);
          imageUrls.push(url);
        }
        
        // 場所データを配列に追加
        locationsData.push({
          order: i,
          store_id: location.storeId || null,
          store_name: location.storeName,
          store_latitude: location.store_latitude,
          store_longitude: location.store_longitude,
          content: location.content,
          image_urls: imageUrls,
          url: location.url && location.url.trim() !== '' ? location.url : null,
          stay_duration: location.stayDuration,
          // 詳細な移動手段情報を送信
          recommended_transport: location.transportDetails?.type !== 'none' ? location.transportDetails?.type : undefined,
          transport_details: location.transportDetails?.type !== 'none' ? JSON.stringify(location.transportDetails) : null,
        });
      }
      
      // 🔥 Server Actionを使用してマップを作成
      const mapInput: CreateMapInput = {
        userId,
        title: values.title,
        description: values.description || null,
        thumbnailUrl,
        locations: locationsData,
        hashtags: hashtags.length > 0 ? hashtags : null,
        expiresAt: expiresAt.toISOString(),
        expiryOption: `${values.customExpiryDays}d`,
        publicationStartDate: values.publicationStartDate,
        publicationEndDate: values.publicationEndDate || null,
        authorRole: session?.user?.role === 'admin' ? 'admin' : 'user',
        isPublic: values.isPublic,
      };
      
      const { mapId, error: createError } = await createMap(mapInput);
      
      if (createError || !mapId) {
        throw new Error(createError || 'マップの作成に失敗しました');
      }
      
      // 完了画面に遷移
      router.push('/create-map/complete');

    } catch (error: any) {
      console.error("マップ作成エラー:", error);
      setSubmitError(error.message || "マップ作成中にエラーが発生しました");
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
    <div className="container mx-auto max-w-3xl px-4 py-4 pb-8">
      {/* パンくずリスト */}
      <Breadcrumb className="mb-4" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* 基本情報（アコーディオン） */}
            <RPGAccordion
              title="モデルコースの基本情報"
              icon={<MapIcon className="h-5 w-5" />}
              iconType="scroll"
              defaultOpen={true}
              contentClassName="space-y-4"
            >
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
                        placeholder="例: 別府温泉巡りコース"
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
                    className="h-12 w-12 p-0 bg-primary hover:bg-primary/90"
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
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-background text-primary rounded-full text-sm font-medium"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => removeHashtag(tag)}
                          className="ml-1 hover:bg-primary/10 rounded-full p-0.5"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </motion.span>
                    ))}
                  </div>
                )}
              </div>
              
              {/* サムネイル画像 */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center">
                  <ImageIcon className="mr-2 h-4 w-4" />
                  サムネイル画像（16:9）
                </Label>
                <p className="text-xs text-gray-500 mb-2">
                  MyMapのカバー画像として表示されます
                </p>
                
                {thumbnailPreviewUrl ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative w-full max-w-xs"
                    style={{ aspectRatio: '16/9' }}
                  >
                    <img
                      src={thumbnailPreviewUrl}
                      alt="サムネイルプレビュー"
                      className="w-full h-full object-cover rounded-xl border border-gray-200 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={removeThumbnail}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                ) : (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                      className="hidden"
                      id="thumbnail-upload"
                    />
                    <label
                      htmlFor="thumbnail-upload"
                      className="cursor-pointer flex items-center justify-center p-6 border-2 border-dashed border-input rounded-xl hover:border-primary hover:bg-background/80 transition-colors max-w-xs"
                    >
                      <div className="text-center">
                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600">タップして画像を選択</p>
                        <p className="text-xs text-gray-400">JPG, PNG, WEBP（5MB以下）</p>
                      </div>
                    </label>
                  </>
                )}
              </div>
              
              {/* タイトルの説明文 */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">
                      タイトルの説明文（任意）
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="このモデルコースの説明を入力してください（最大500文字）"
                        className="min-h-[140px] text-base resize-none"
                        maxLength={500}
                      />
                    </FormControl>
                    <div className="flex justify-between items-center">
                      <FormMessage />
                      <p className="text-xs text-gray-500">
                        {field.value?.length || 0}/500
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              {/* 掲載開始日 */}
              <FormField
                control={form.control}
                name="publicationStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">
                      掲載開始日<span className="text-destructive ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="h-10 text-sm max-w-[200px]"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          const startDate = e.target.value;
                          const endDate = form.getValues('publicationEndDate');
                          if (startDate) {
                            const calculatedDays = calculateMapExpiryDays(startDate, endDate);
                            form.setValue('customExpiryDays', calculatedDays);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 掲載終了日 */}
              <FormField
                control={form.control}
                name="publicationEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">
                      掲載終了日（任意）
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="h-10 text-sm max-w-[200px]"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          const startDate = form.getValues('publicationStartDate');
                          const endDate = e.target.value;
                          if (startDate) {
                            const calculatedDays = calculateMapExpiryDays(startDate, endDate);
                            form.setValue('customExpiryDays', calculatedDays);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 掲載期間（自動計算結果） */}
              <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ClockIcon className="mr-2 h-4 w-4 text-gray-600" />
                    <span className="text-sm font-semibold text-gray-700">掲載期間</span>
                  </div>
                  <span className="text-base font-bold text-primary">
                    {form.watch('customExpiryDays')}日間
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  ※掲載開始日と終了日から自動計算されます
                </p>
              </div>

              {/* 公開・非公開設定 */}
              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-semibold">
                        公開設定
                      </FormLabel>
                      <div className="text-sm text-gray-500">
                        {field.value ? 'このモデルコースは公開されます' : 'このモデルコースは非公開です'}
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </RPGAccordion>
            
            {/* ルートタイムライン（アコーディオン + ドラッグ＆ドロップ） */}
            <RPGAccordion
              title="旅のルート"
              icon={<Navigation className="h-5 w-5" />}
              iconType="key"
              defaultOpen={true}
              className="bg-gradient-to-br from-background to-muted border-border"
              badge={`${locations.filter(loc => loc.storeName).length}スポット`}
            >
              <ReorderableTimeline
                spots={locations.map((loc) => ({
                  id: loc.id,
                  storeName: loc.storeName,
                  hasImage: loc.imageFiles.length > 0,
                  isComplete: !!loc.storeName,
                }))}
                currentIndex={currentLocationIndex}
                onReorder={(fromIndex, toIndex) => {
                  // 並び替え後のlocationsを更新
                  const newLocations = [...locations];
                  const [movedItem] = newLocations.splice(fromIndex, 1);
                  newLocations.splice(toIndex, 0, movedItem);
                  setLocations(newLocations);
                  // 選択中のスポットのインデックスを更新
                  if (currentLocationIndex === fromIndex) {
                    setCurrentLocationIndex(toIndex);
                  } else if (
                    fromIndex < currentLocationIndex && toIndex >= currentLocationIndex
                  ) {
                    setCurrentLocationIndex(currentLocationIndex - 1);
                  } else if (
                    fromIndex > currentLocationIndex && toIndex <= currentLocationIndex
                  ) {
                    setCurrentLocationIndex(currentLocationIndex + 1);
                  }
                }}
                onSelect={(index) => setCurrentLocationIndex(index)}
                onRemove={(index) => removeLocation(index)}
                onAdd={addLocation}
              />
            </RPGAccordion>

            {/* スポット編集フォーム */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-primary flex items-center">
                <MapIcon className="mr-2 h-5 w-5" />
                スポット {currentLocationIndex + 1} の編集
              </h2>
              
              {/* 現在選択されているスポットのフォーム */}
              <AnimatePresence mode="wait">
                {locations[currentLocationIndex] && (
                  <motion.div
                    key={currentLocationIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-xl border-2 border-border p-4 space-y-4 shadow-sm"
                  >
                    <LocationForm
                      location={locations[currentLocationIndex]}
                      locationIndex={currentLocationIndex}
                      updateLocation={updateLocation}
                      handleImageUpload={handleImageUpload}
                      removeImage={removeImage}
                      isLoaded={isLoaded}
                      loadError={loadError}
                      userLatitude={latitude}
                      userLongitude={longitude}
                      allLocations={locations}
                      onSaveAndContinue={handleSaveAndContinue}
                      isSavingSpot={isSavingSpot}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
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
                    作成中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    モデルコースを作成する
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                <span className="text-red-600">※は必須項目です</span>
              </p>
              
              {/* 戻るボタン */}
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
  isLoaded: boolean;
  loadError: Error | null;
  userLatitude?: number | null;
  userLongitude?: number | null;
  allLocations?: LocationData[];
  onSaveAndContinue?: () => void;
  isSavingSpot?: boolean;
}

function LocationForm({
  location,
  locationIndex,
  updateLocation,
  handleImageUpload,
  removeImage,
  isLoaded,
  loadError,
  userLatitude,
  userLongitude,
  allLocations = [],
  onSaveAndContinue,
  isSavingSpot = false,
}: LocationFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [locationStatus, setLocationStatus] = useState<'none' | 'getting' | 'success' | 'error'>('none');
  const [isMarkerModalOpen, setIsMarkerModalOpen] = useState(false);
  
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
  
  // 画像アップロード処理
  const handleImageUploadLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    handleImageUpload(locationIndex, e);
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
            className="w-full px-4 py-3 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base"
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
            <span className="font-semibold">マーカーピンで位置を指定する</span>
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
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUploadLocal}
          className="hidden"
          id={`image-upload-${locationIndex}`}
        />
        <label
          htmlFor={`image-upload-${locationIndex}`}
          className="cursor-pointer flex items-center justify-center p-6 border-2 border-dashed border-input rounded-xl hover:border-primary hover:bg-background/80 transition-colors"
        >
          <div className="text-center">
            <Upload className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">タップして画像を選択</p>
            <p className="text-xs text-gray-400">JPG, PNG, WEBP（各5MB以下）</p>
          </div>
        </label>
        
        {location.imagePreviewUrls.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {location.imagePreviewUrls.map((url, imgIndex) => (
              <div key={imgIndex} className="relative group" style={{ aspectRatio: '16/10' }}>
                <img
                  src={url}
                  alt={`Preview ${imgIndex + 1}`}
                  className="w-full h-full object-cover rounded-lg border border-gray-200"
                />
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
      
      {/* 詳細な移動手段入力 */}
      <TransportDetailInput
        value={location.transportDetails || { type: 'none' }}
        onChange={(details) => updateLocation(locationIndex, 'transportDetails', details)}
        label="このスポットへの移動手段（任意）"
        className="mt-2"
      />

      {/* 保存して続けるボタン */}
      {onSaveAndContinue && (
        <motion.div 
          className="pt-4 border-t border-border"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            type="button"
            onClick={onSaveAndContinue}
            disabled={isSavingSpot}
            className="w-full h-14 text-base font-bold rounded-xl shadow-md bg-gradient-to-r from-green-500 to-green-600 hover:from-[#16a34a] hover:to-[#15803d] text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSavingSpot ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                保存して次のスポットを追加
              </>
            )}
          </Button>
          <p className="text-xs text-gray-500 text-center mt-2">
            ※このスポットを保存し、続けて次のスポットを入力できます
          </p>
        </motion.div>
      )}
      
      {/* 🔥 マーカー位置選択モーダル */}
      <MarkerLocationModal
        isOpen={isMarkerModalOpen}
        onClose={() => setIsMarkerModalOpen(false)}
        onSave={handleMarkerSave}
        initialLat={location.store_latitude || userLatitude || undefined}
        initialLng={location.store_longitude || userLongitude || undefined}
        initialSpotName={location.storeName}
        isLoaded={isLoaded}
        existingLocations={allLocations}
        currentLocationId={location.id}
      />
    </div>
  );
}