"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Camera, Upload, X, Store as StoreIcon, LayoutGrid, ClipboardList, Image as ImageIcon, CalendarClock, PackageIcon, ClockIcon, Tag, HelpCircle, MapPin, CheckCircle, Layers, ChevronDown, ChevronUp, Settings, Link as LinkIcon, FileText, HandCoins } from 'lucide-react';
import { CalendarDays, Star as StarIcon } from 'lucide-react'; // CalendarDaysとStarIconを追加
import { Calendar } from '@/components/ui/calendar'; // Calendarコンポーネントをインポート
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // Popoverコンポーネントをインポート
import { format } from 'date-fns'; // date-fnsのformat関数をインポート
import { ja } from 'date-fns/locale'; // 日本語ロケールをインポート
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
import { useToast } from "@/hooks/use-toast";
import { useLoadScript, Autocomplete, GoogleMap } from "@react-google-maps/api";
import { useLoading } from '@/contexts/loading-context';
import { useGoogleMapsApi } from '@/components/providers/GoogleMapsApiProvider';
import { Heart, Plus } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

declare global {
  interface Window {
    google: any;
  }
}

// 🔥 更新されたバリデーションスキーマ
const postSchema = z.object({
  storeId: z.string().optional(), // 任意に変更
  storeName: z.string().optional(), // 任意に変更
  genre: z.string().optional(), // 新規追加（任意）
  category: z.string().optional(), // 任意に変更
  content: z.string().min(5, { message: '5文字以上入力してください' }).max(240, { message: '240文字以内で入力してください' }), // 必須
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
     .optional() // 任意に変更
  ),
  url: z.string().url({ message: '有効なURLを入力してください' }).optional().or(z.literal('')),
  expiryOption: z.enum(['1h', '3h', '6h', '12h'], { required_error: '掲載期間を選択してください' }), // 必須
  // 位置情報フィールド（任意）
  location_lat: z.number().optional(),
  location_lng: z.number().optional(),
  store_latitude: z.number().optional(),
  store_longitude: z.number().optional(),
  rating: z.number().min(1, { message: '1以上5以下の値を入力してください' }).max(5, { message: '1以上5以下の値を入力してください' }).optional(), // 新規追加
  start_date: z.date().optional(), // 新規追加
  end_date: z.date().optional(), // 新規追加
  supportPurchaseEnabled: z.boolean().default(false),
  supportPurchaseOptions: z.array(z.number().min(100).max(100000)).max(3).optional(),
});

type PostFormValues = z.infer<typeof postSchema>;

type DisplayStore = Pick<Store, 'name'> & { id: string };

const libraries: ("places")[] = ["places"];

// 🔥 新規追加：ジャンルとカテゴリーの定義を更新
const genreCategories = {
  'ショッピング': ['惣菜', '弁当', '肉', '魚', '野菜', '果物', '米・パン類', 'デザート類', '日用品', '衣料品', 'その他'],
  'グルメ': ['和食', '洋食', '中華', 'イタリアン', 'フレンチ','レストラン', 'カフェ', 'ファストフード','居酒屋', 'その他'],
  '観光': ['観光ツアー','観光スポット', '宿泊施設','自然景観', '温泉', '博物館・美術館', '公園','水族館','アミューズメントパーク', 'その他'],
  'エンタメ': ['スポーツ', '映画・ドラマ','アイドル','アニメ','漫画', 'ゲーム', 'アウトドア', 'その他'],
  'サービス': ['家事代行', 'モノの保管', '手料理を振る舞う','デリバリー', 'ハウスクリーニング','買取','コーチング','引越し', 'その他'],
  'イベント': ['コンサート・ライブ', 'フェスティバル', '展示会', 'セミナー・講座', 'スポーツイベント', 'その他'],
  '求人': ['単発','ギグワーク', 'アルバイト・パート','インターン', 'フリーランス', 'その他'],
  '販売': ['古着', '中古品','農作物','特産品', 'ハンドメイド', 'デジタル商品', 'チケット', '移動販売', 'その他'],
  '貸し出し': ['漫画', 'ゲーム', '教科書・参考書','スペース(コワーキング・会議室)','家電','ゴルフ用品','キャンプ用品','車', '自転車', '傘', 'その他'], // 新規追加
  '宿泊': ['ホテル', '旅館', '民泊', '部屋の貸し出し', 'その他'], // 新規追加
  'ボランティア': ['環境・自然', '福祉・介護', '教育・子育て', '地域活動', '災害支援', 'その他'],
  '相談': ['生活相談', '仕事・キャリア', '恋愛・人間関係', '法律・お金', '健康・医療','起業相談','経営相談', 'その他'],
  'ニュース': ['地域ニュース','ゴシップ','災害情報', 'スポーツ', 'お役立ち情報','エンタメ','お知らせ', 'その他'], 
  'コミュニティ': ['塾・習い事','地域交流', 'イベント','起業家', '趣味','サークル','料理教室', '学習', '地域', 'その他'],
  '寄付': ['寄付','募金', 'その他'],
  '募集': ['メンバー募集', '助け合い', '里親（ペット）', 'その他'], // 新規追加
  'その他': ['不用品の廃棄']
};

const expiryOptions = [
  { value: '1h', label: '1時間' },
  { value: '3h', label: '3時間' },
  { value: '6h', label: '6時間' },
  { value: '12h', label: '12時間' },
];

export default function PostPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
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
  const [showStoreSearchInfoModal, setShowStoreSearchInfoModal] = useState(false);
  const { showLoading, hideLoading } = useLoading();
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  
  // 位置情報取得状況の表示用
  const [locationStatus, setLocationStatus] = useState<'none' | 'getting' | 'success' | 'error'>('none');

  // refを追加：内容フィールドへのフォーカス用
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const { isLoaded, loadError } = useGoogleMapsApi();

  // 🔥 更新されたフォーム設定
  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      storeId: '',
      storeName: '',
      genre: '',
      category: '',
      content: '',
      price: undefined,
      url: '',
      expiryOption: '3h',
      location_lat: undefined,
      location_lng: undefined,
      store_latitude: undefined,
      store_longitude: undefined,
      rating: undefined, // 新規追加
      start_date: undefined, // 新規追加
      end_date: undefined, // 新規追加
      supportPurchaseEnabled: false,
      supportPurchaseOptions: [],
    },
    mode: 'onChange',
  });
  
  const { formState: { isValid, isSubmitting } } = form;
  
  const selectedGenre = form.watch('genre');
  const selectedCategory = form.watch('category');
  const watchedFormValues = form.watch();

  // 価格計算モーダルの状態
  const [showPriceInfoModal, setShowPriceInfoModal] = useState(false);

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
  useEffect(() => {
    if (selectedGenre) {
      form.setValue('category', '');
    }
  }, [selectedGenre, form]);
  
  // 🔥 更新された投稿処理
  const handleActualSubmit = async (values: PostFormValues) => {
    if (!session?.user?.id) {
      console.log("PostPage: User not logged in, redirecting to login page.");
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    // 🔥 必須フィールドの検証（内容と掲載期間のみ）
    if (!values.content || values.content.length < 5) {
      setSubmitError("投稿内容を5文字以上入力してください。");
      return;
    }

    if (!values.expiryOption) {
      setSubmitError("掲載期間を選択してください。");
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
        if (values.storeName && values.storeName.trim() !== '') {
          return values.storeName;
        }
        
        // ジャンルに基づいたデフォルト値
        if (values.genre) {
          const genreDefaults = {
            'ショッピング': 'お店',
            '飲食店': 'レストラン',
            '観光': '観光地',
            'エンタメ': 'エンタメ施設', // レジャーから変更
            'サービス': 'サービス店',
            'シェア': 'シェアサービス', // 新規追加
            'コミュニティ': 'コミュニティ', // 新規追加
            '募集': '募集', // 新規追加
            'デリバリー': 'デリバリーサービス',
          };
          return genreDefaults[values.genre as keyof typeof genreDefaults] || null;
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
        store_name: getDefaultStoreName(), // 柔軟なデフォルト値
        genre: values.genre && values.genre.trim() !== '' ? values.genre : null,
        category: getDefaultCategory(), // 柔軟なデフォルト値
        content: values.content,
        image_urls: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
        file_urls: fileUrls.length > 0 ? JSON.stringify(fileUrls) : null,
        url: values.url && values.url.trim() !== '' ? values.url : null,
        price: values.price || null,
        expiry_option: values.expiryOption,
        expires_at: calculateExpiresAt(values.expiryOption).toISOString(),
        likes_count: 0,
        views_count: 0,
        comments_count: 0,
        is_deleted: false, // 🔥 追加：デフォルトでfalse
        rating: values.rating || null, // 新規追加
        start_date: values.start_date ? values.start_date.toISOString() : null, // 新規追加
        end_date: values.end_date ? values.end_date.toISOString() : null, // 新規追加
        support_purchase_enabled: values.supportPurchaseEnabled,
        support_purchase_options: values.supportPurchaseEnabled && (values.supportPurchaseOptions?.length ?? 0) > 0 
          ? JSON.stringify(values.supportPurchaseOptions) 
          : null,
      };

      // 🔥 店舗の位置情報を設定
      if (values.store_latitude && values.store_longitude) {
        postData.store_latitude = Number(values.store_latitude);
        postData.store_longitude = Number(values.store_longitude);
        postData.location_geom = `POINT(${values.store_longitude} ${values.store_latitude})`;
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
      form.reset({
        storeId: '',
        storeName: '',
        genre: '',
        category: '',
        content: '',
        price: undefined,
        url: '',
        expiryOption: '3h',
        location_lat: undefined,
        location_lng: undefined,
        store_latitude: undefined,
        store_longitude: undefined,
        rating: undefined, // 新規追加
        start_date: undefined, // 新規追加
        end_date: undefined, // 新規追加
        supportPurchaseEnabled: false,
        supportPurchaseOptions: [],
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

  const handleMoveToPriceCalculator = () => {
    setShowPriceInfoModal(false);
    window.open('https://discount-calculator-app.vercel.app/', '_blank');
  };

  // 🔥 オプション項目の表示状態管理
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [optionalFieldsExpanded, setOptionalFieldsExpanded] = useState({
    location: false,
    genre: false,
    category: false,
    price: false,
    url: false,
    file: false,
    rating: false, // 新規追加
    date: false, // 新規追加
    supportPurchase: false, // 追加
  });

  // 🔥 オプションフィールドの切り替え
  const toggleOptionalField = (field: keyof typeof optionalFieldsExpanded) => {
    setOptionalFieldsExpanded(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // 🔥 オプション項目の値が入力されているかチェック
  const hasOptionalValues = () => {
    const values = form.getValues();
    return !!(values.storeId || values.genre || values.category || values.price || values.url || fileFiles.length > 0 || values.rating || values.start_date || values.end_date || optionalFieldsExpanded.supportPurchase);
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
              
              {/* 🔥 1. 商品画像 */}
              <FormItem>
                <FormLabel className="text-xl mb-2 flex items-center">
                  <ImageIcon className="mr-2 h-7 w-7" />
                  商品画像 (任意・最大5枚)
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
                                <div className="w-full aspect-square rounded-md overflow-hidden border-2 border-gray-200">
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
                          {/* <p className="text-xs">※画像は350px × 350pxの固定サイズで表示されます</p> */}
                        </label>
                      )}
                    </div>
                  </div>
                </FormControl>
                <p className="text-sm text-red-500 mt-1">※アップロードする画像は自己責任でお願いします。</p>
              </FormItem>

              {/* 🔥 2. 内容（必須） */}
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
                        placeholder="みんなに知らせたい日常生活のちょっとしたおトク(得・特・徳)な情報やこんなおトクな情報が欲しいといった要望を記入してください（240文字以内）"
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
                    <Select onValueChange={field.onChange} value={field.value || ""}>
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
                  </FormItem>
                )}
              />

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
                      {/* オプション項目のトグルボタン */}
                      <div className="grid grid-cols-2 gap-2">
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
                          onClick={() => toggleOptionalField('genre')}
                          className={`justify-start transition-all duration-200 ${
                            optionalFieldsExpanded.genre 
                              ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' 
                              : 'bg-[#fafafa] text-[#73370c] border-gray-300 hover:bg-[#fafafa] hover:text-[#73370c]'
                          }`}
                        >
                          <Layers className="mr-2 h-4 w-4" />
                          ジャンル
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleOptionalField('category')}
                          className={`justify-start transition-all duration-200 ${
                            optionalFieldsExpanded.category 
                              ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' 
                              : 'bg-[#fafafa] text-[#73370c] border-gray-300 hover:bg-[#fafafa] hover:text-[#73370c]'
                          }`}
                        >
                          <LayoutGrid className="mr-2 h-4 w-4" />
                          カテゴリ
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleOptionalField('price')}
                          className={`justify-start transition-all duration-200 ${
                            optionalFieldsExpanded.price 
                              ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' 
                              : 'bg-[#fafafa] text-[#73370c] border-gray-300 hover:bg-[#fafafa] hover:text-[#73370c]'
                          }`}
                        >
                          <Tag className="mr-2 h-4 w-4" />
                          価格
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
                          onClick={() => toggleOptionalField('date')}
                          className={`justify-start transition-all duration-200 ${
                            optionalFieldsExpanded.date 
                              ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' 
                              : 'bg-[#fafafa] text-[#73370c] border-gray-300 hover:bg-[#fafafa] hover:text-[#73370c]'
                          }`}
                        >
                          <CalendarDays className="mr-2 h-4 w-4" />
                          日時
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
                          応援購入
                        </Button>
                      </div>

                      {/* 場所入力フィールド */}
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
                                    <div className="relative mobile-store-search">
                                      <FavoriteStoreInput
                                        value={{ id: field.value, name: form.getValues("storeName") }}
                                        onChange={async (store) => {
                                          if (store) {
                                            form.setValue("storeId", store.id, { shouldValidate: true });
                                            form.setValue("storeName", store.name, { shouldValidate: true });
                                          } else {
                                            form.setValue("storeId", "", { shouldValidate: true });
                                            form.setValue("storeName", "", { shouldValidate: true });
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

                      {/* ジャンル選択フィールド */}
                      {optionalFieldsExpanded.genre && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FormField
                            control={form.control}
                            name="genre"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-lg flex font-semibold items-center">
                                  <Layers className="mr-2 h-5 w-5" /> ジャンル
                                </FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger className="w-full text-lg py-6">
                                      <SelectValue placeholder="ジャンルを選択してください" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="max-h-[200px]">
                                    {Object.keys(genreCategories).map((genre) => (
                                      <SelectItem key={genre} value={genre} className="text-lg py-3">
                                        {genre}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      )}

                      {/* カテゴリー選択フィールド */}
                      {optionalFieldsExpanded.category && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-lg flex font-semibold items-center">
                                  <LayoutGrid className="mr-2 h-5 w-5" /> カテゴリ
                                </FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  value={field.value || ""}
                                  disabled={!selectedGenre}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full text-lg py-6">
                                      <SelectValue placeholder={
                                        selectedGenre 
                                          ? "カテゴリを選択してください" 
                                          : "まずジャンルを選択してください"
                                      } />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="max-h-[200px]">
                                    {selectedGenre && genreCategories[selectedGenre as keyof typeof genreCategories]?.map((category) => (
                                      <SelectItem key={category} value={category} className="text-lg py-3">
                                        {category}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      )}

                      {/* 価格入力フィールド */}
                      {optionalFieldsExpanded.price && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-lg flex font-semibold items-center">
                                  <Tag className="mr-2 h-5 w-5" />
                                  価格 (税込)
                                  {/* <span
                                    className="ml-2 flex items-center text-sm text-blue-600 cursor-pointer hover:underline"
                                    onClick={() => setShowPriceInfoModal(true)}
                                  >
                                    <HelpCircle className="h-4 w-4 mr-1" />
                                    何％割引っていくら？
                                  </span> */}
                                </FormLabel>
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
                        </motion.div>
                      )}

                      {/* リンク入力フィールド */}
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
                                  リンク（URL）
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

                      {/* ファイル入力フィールド */}
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

                      {/* 🔥 評価入力フィールド (数値入力と部分的な星表示に対応) */}
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

                      {/* 🔥 開始日・終了日入力フィールド (時間設定を追加) */}
                      {optionalFieldsExpanded.date && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FormItem>
                            <FormLabel className="text-lg flex font-semibold items-center">
                              <CalendarDays className="mr-2 h-5 w-5" /> 日時設定
                            </FormLabel>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="start_date"
                                render={({ field }) => (
                                  <FormItem className="flex flex-col">
                                    <FormLabel className="text-base">開始日</FormLabel>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <FormControl>
                                          <Button
                                            variant={"outline"}
                                            className={cn(
                                              "w-full pl-3 text-left font-normal",
                                              !field.value && "text-muted-foreground",
                                              "h-12 text-lg" // スタイル調整
                                            )}
                                          >
                                            {field.value ? (
                                              format(field.value, "PPP", { locale: ja })
                                            ) : (
                                              <span>日付を選択</span>
                                            )}
                                            <CalendarClock className="ml-auto h-5 w-5 opacity-50" />
                                          </Button>
                                        </FormControl>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                          mode="single"
                                          selected={field.value}
                                          onSelect={(date) => {
                                            if (date) {
                                              const currentTime = field.value ? new Date(field.value) : new Date();
                                              date.setHours(currentTime.getHours());
                                              date.setMinutes(currentTime.getMinutes());
                                              date.setSeconds(0);
                                              date.setMilliseconds(0);
                                              field.onChange(date);
                                            } else {
                                              field.onChange(undefined);
                                            }
                                          }}
                                          disabled={(date) =>
                                            date < new Date("1900-01-01")
                                          }
                                          initialFocus
                                          locale={ja}
                                        />
                                      </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    {/* 時間入力フィールドを追加 */}
                                    <div className="flex items-center space-x-2 mt-2">
                                      <CalendarClock className="h-5 w-5 text-muted-foreground" /> {/* 時計アイコン */}
                                      <Input
                                        type="time"
                                        value={field.value ? format(field.value, 'HH:mm') : ''}
                                        onChange={(e) => {
                                          const [hours, minutes] = e.target.value.split(':').map(Number);
                                          const newDate = field.value ? new Date(field.value) : new Date();
                                          newDate.setHours(hours);
                                          newDate.setMinutes(minutes);
                                          newDate.setSeconds(0);
                                          newDate.setMilliseconds(0);
                                          field.onChange(newDate);
                                        }}
                                        className="w-full text-lg"
                                        step="300" // 5分刻み
                                      />
                                    </div>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="end_date"
                                render={({ field }) => (
                                  <FormItem className="flex flex-col">
                                    <FormLabel className="text-base">終了日</FormLabel>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <FormControl>
                                          <Button
                                            variant={"outline"}
                                            className={cn(
                                              "w-full pl-3 text-left font-normal",
                                              !field.value && "text-muted-foreground",
                                              "h-12 text-lg" // スタイル調整
                                            )}
                                          >
                                            {field.value ? (
                                              format(field.value, "PPP", { locale: ja })
                                            ) : (
                                              <span>日付を選択</span>
                                            )}
                                            <CalendarClock className="ml-auto h-5 w-5 opacity-50" />
                                          </Button>
                                        </FormControl>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                          mode="single"
                                          selected={field.value}
                                          onSelect={(date) => {
                                            if (date) {
                                              const currentTime = field.value ? new Date(field.value) : new Date();
                                              date.setHours(currentTime.getHours());
                                              date.setMinutes(currentTime.getMinutes());
                                              date.setSeconds(0);
                                              date.setMilliseconds(0);
                                              field.onChange(date);
                                            } else {
                                              field.onChange(undefined);
                                            }
                                          }}
                                          disabled={(date) =>
                                            date < new Date("1900-01-01")
                                          }
                                          initialFocus
                                          locale={ja}
                                        />
                                      </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    {/* 時間入力フィールドを追加 */}
                                    <div className="flex items-center space-x-2 mt-2">
                                      <CalendarClock className="h-5 w-5 text-muted-foreground" /> {/* 時計アイコン */}
                                      <Input
                                        type="time"
                                        value={field.value ? format(field.value, 'HH:mm') : ''}
                                        onChange={(e) => {
                                          const [hours, minutes] = e.target.value.split(':').map(Number);
                                          const newDate = field.value ? new Date(field.value) : new Date();
                                          newDate.setHours(hours);
                                          newDate.setMinutes(minutes);
                                          newDate.setSeconds(0);
                                          newDate.setMilliseconds(0);
                                          field.onChange(newDate);
                                        }}
                                        className="w-full text-lg"
                                        step="300" // 5分刻み
                                      />
                                    </div>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </FormItem>
                        </motion.div>
                      )}

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
                                <h3 className="text-lg font-semibold text-blue-800 mb-2">応援購入について</h3>
                                <p className="text-sm text-blue-700 leading-relaxed">
                                  応援購入を有効にすると、この投稿を見た人があなたを応援できます！
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                            <div className="flex items-center space-x-2">
                              <div>
                                <Label className="text-lg font-semibold">応援購入を有効にする</Label>
                                <p className="text-sm text-gray-600">投稿に応援購入ボタンを表示します</p>
                              </div>
                            </div>
                            <Switch
                              checked={form.getValues("supportPurchaseEnabled")}
                              onCheckedChange={(checked) => form.setValue("supportPurchaseEnabled", checked)}
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
                                <Label className="text-base font-medium">応援購入の金額を選択（最大3つ）</Label>
                                
                                {/* 選択された金額の表示 */}
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
                                
                                {/* 金額選択ボタン */}
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
                                            // 選択を解除
                                            form.setValue("supportPurchaseOptions", currentOptions.filter(amount => amount !== presetAmount));
                                          } else if (currentOptions.length < 3) {
                                            // 新しく選択
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
                                
                                {/* 選択状況の表示 */}
                                <div className="text-center">
                                  {(form.getValues("supportPurchaseOptions") || []).length >= 3 && (
                                    <p className="text-xs text-amber-600 mt-1">
                                      変更する場合は選択済みの金額を解除してください。
                                    </p>
                                  )}
                                </div>
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

          {/* 既存の他のモーダル... */}
          <CustomModal
            isOpen={showStoreSearchInfoModal}
            onClose={() => setShowStoreSearchInfoModal(false)}
            title="場所の検索候補について"
          >
            <div className="pt-2">
              <p className="mb-4 text-center">
                検索候補が表示されない場合は、正確な場所情報を見つけるために、一度「場所を探す画面」へ移動してください。
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

          <CustomModal
            isOpen={showPriceInfoModal}
            onClose={() => setShowPriceInfoModal(false)}
            title="価格計算について"
          >
            <div className="pt-2">
              <p className="mb-4 text-center">
                割引率から価格を計算したい場合は、専用の計算ツールをご利用ください。
              </p>
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={handleMoveToPriceCalculator}
                >
                  割引計算ツールを開く
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