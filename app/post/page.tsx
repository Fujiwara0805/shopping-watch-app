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

// 🔥 カテゴリ別の条件付きバリデーションスキーマ
const postSchema = z.object({
  storeId: z.string().optional(),
  storeName: z.string().optional(),
  category: z.enum(['空席情報', '在庫情報', 'イベント情報', '助け合い', '口コミ'], { required_error: 'カテゴリを選択してください' }),
  content: z.string().min(5, { message: '5文字以上入力してください' }).max(240, { message: '240文字以内で入力してください' }),
  url: z.string().url({ message: '有効なURLを入力してください' }).optional().or(z.literal('')),
  // 🔥 新しい掲載期間スキーマ
  expiryOption: z.enum(['15m', '30m', '45m', '60m', '12h', '24h', 'days', '90d'], { required_error: '掲載期間を選択してください' }),
  customExpiryMinutes: z.number().min(1).max(720).optional(),
  customExpiryDays: z.number().min(1).max(90).optional(), // イベント情報用の日数設定
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
  // 🔥 イベント情報用フィールド
  eventName: z.string().max(100).optional(), // イベント名
  eventStartDate: z.string().optional(), // 開催開始日
  eventEndDate: z.string().optional(), // 開催終了日
  eventPrice: z.string().max(50).optional(), // 料金
}).superRefine((data, ctx) => {
  // 🔥 空席情報・在庫情報の場合の必須チェック
  if (data.category === '空席情報' || data.category === '在庫情報') {
    if (!data.storeId || data.storeId.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${data.category}の場合、場所の選択は必須です`,
        path: ['storeId'],
      });
    }
    if (!data.storeName || data.storeName.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${data.category}の場合、場所の選択は必須です`,
        path: ['storeName'],
      });
    }
    if (data.remainingSlots === undefined || data.remainingSlots === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${data.category}の場合、残数の入力は必須です`,
        path: ['remainingSlots'],
      });
    }
    // 空席情報・在庫情報では15m-60mのみ許可
    if (!['15m', '30m', '45m', '60m'].includes(data.expiryOption)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${data.category}では15分〜60分の掲載期間のみ選択できます`,
        path: ['expiryOption'],
      });
    }
  }
  
  // 🔥 イベント情報の場合の必須チェック
  if (data.category === 'イベント情報') {
    if (!data.storeId || data.storeId.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${data.category}の場合、場所の選択は必須です`,
        path: ['storeId'],
      });
    }
    if (!data.storeName || data.storeName.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${data.category}の場合、場所の選択は必須です`,
        path: ['storeName'],
      });
    }
    if (data.expiryOption !== 'days') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${data.category}では日数設定での掲載期間設定が必要です`,
        path: ['expiryOption'],
      });
    }
    if (data.expiryOption === 'days' && (!data.customExpiryDays || data.customExpiryDays < 1 || data.customExpiryDays > 90)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'イベント情報の掲載期間は1日〜90日の範囲で設定してください',
        path: ['customExpiryDays'],
      });
    }
    // イベント情報の必須フィールドチェック
    if (!data.eventName || data.eventName.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'イベント情報の場合、イベント名の入力は必須です',
        path: ['eventName'],
      });
    }
    if (!data.eventStartDate || data.eventStartDate.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'イベント情報の場合、開催開始日の入力は必須です',
        path: ['eventStartDate'],
      });
    }
    // 開催終了日は任意（1日開催の場合は不要）
    // 終了日が入力されている場合は、開始日より後の日付であることをチェック
    if (data.eventEndDate && data.eventEndDate.trim() !== '' && data.eventStartDate && data.eventStartDate.trim() !== '') {
      const startDate = new Date(data.eventStartDate);
      const endDate = new Date(data.eventEndDate);
      if (endDate < startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '開催終了日は開始日以降の日付を選択してください',
          path: ['eventEndDate'],
        });
      }
    }
  }
  
  // 🔥 助け合いの場合の掲載期間チェック
  if (data.category === '助け合い') {
    if (!['30m', '60m', '12h', '24h'].includes(data.expiryOption)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${data.category}では30分、1時間、12時間、24時間のいずれかを選択してください`,
        path: ['expiryOption'],
      });
    }
  }
  
  // 🔥 口コミの場合は90日間固定
  if (data.category === '口コミ') {
    if (data.expiryOption !== '90d') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '口コミでは90日間の掲載期間が固定で設定されます',
        path: ['expiryOption'],
      });
    }
  }
});

type PostFormValues = z.infer<typeof postSchema>;

type DisplayStore = Pick<Store, 'name'> & { id: string };

const libraries: ("places")[] = ["places"];

// 🔥 新しいカテゴリ定義（並び順を変更）
const categoryOptions = [
  { value: '空席情報', label: '空席情報' },
  { value: '在庫情報', label: '在庫情報' },
  { value: 'イベント情報', label: 'イベント情報' },
  { value: '助け合い', label: '助け合い' },
  { value: '口コミ', label: '口コミ' },
];

// 🔥 ロール別に利用可能なカテゴリを取得する関数
const getAvailableCategoriesForRole = (userRole: string | null) => {
  if (!userRole) return []; // ロールが不明な場合は空配列
  
  switch (userRole) {
    case 'admin':
      // 管理者は全てのカテゴリを選択可能
      return categoryOptions;
    case 'user':
      // 一般ユーザーは口コミと助け合いのみ
      return categoryOptions.filter(option => 
        option.value === '口コミ' || option.value === '助け合い'
      );
    case 'business':
      // 事業者は空席情報、在庫情報、助け合いを選択可能
      return categoryOptions.filter(option => 
        option.value === '空席情報' || option.value === '在庫情報' || option.value === '助け合い'
      );
    default:
      // 不明なロールの場合は空配列
      return [];
  }
};

// 🔥 特定のカテゴリがユーザーロールで選択可能かチェックする関数
const isCategoryAvailableForRole = (category: string, userRole: string | null) => {
  const availableCategories = getAvailableCategoriesForRole(userRole);
  return availableCategories.some(option => option.value === category);
};

// 🔥 カテゴリ別の掲載期間オプション
const getExpiryOptionsForCategory = (category: string) => {
  if (category === '空席情報' || category === '在庫情報') {
    // 空席情報・在庫情報は15分〜60分のみ
    return [
      { value: '15m', label: '15分' },
      { value: '30m', label: '30分' },
      { value: '45m', label: '45分' },
      { value: '60m', label: '60分' },
    ];
  } else if (category === '助け合い') {
    // 助け合いは30分、1時間、12時間、24時間
    return [
      { value: '30m', label: '30分' },
      { value: '60m', label: '1時間' },
      { value: '12h', label: '12時間' },
      { value: '24h', label: '24時間' },
    ];
  } else if (category === 'イベント情報') {
    // イベント情報は日数設定
    return [
      { value: 'days', label: '日数設定（1-90日）' },
    ];
  } else if (category === '口コミ') {
    // 口コミは90日間固定
    return [
      { value: '90d', label: '90日間（固定）' },
    ];
  } else {
    // その他は30分をデフォルト
    return [
      { value: '30m', label: '30分' },
    ];
  }
};

// 🔥 カテゴリ別定型文データ
const templateTexts = {
  '空席情報': [
    '【空席あり】\n現在空席があります！\n・席数: \n・利用可能時間: \n・注意事項: ',
    '【カウンター席空き】\nカウンター席に空きがあります。\nお一人様でもお気軽にどうぞ！',
    '【テーブル席空き】\nテーブル席に余裕があります。\nグループでのご利用も可能です。',
    '【予約なしOK】\n予約なしでもご案内できます！\n混雑状況: \nお待ち時間: ',
  ],
  '在庫情報': [
    '【在庫あり】\n人気商品の在庫があります！\n・商品名: \n・残り数量: \n・価格: ',
    '【限定商品入荷】\n限定商品が入荷しました。\n数量限定のためお早めに！',
    '【セール商品あり】\nセール対象商品の在庫があります。\n・割引率: \n・セール期間: ',
    '【新商品入荷】\n新商品が入荷しました！\n・商品名: \n・特徴: \n・価格: ',
  ],
  'イベント情報': [
    '【イベント開催】\n楽しいイベントを開催します！\n・内容: \n・対象: \n・持ち物: ',
    '【ワークショップ開催】\nワークショップを開催します。\n・テーマ: \n・定員: \n・申込方法: ',
    '【セール開催】\n特別セールを開催中！\n・対象商品: \n・割引内容: \n・期間限定: ',
    '【体験会実施】\n体験会を実施します。\n・体験内容: \n・所要時間: \n・参加費: ',
  ],
  '助け合い': [
    '【おすそわけ】\n余ってしまった食材をおすそわけします。\n・品名: \n・数量: \n・受渡方法: ',
    '【お手伝い募集】\nお手伝いしていただける方を募集しています。\n・作業内容: \n・時間: \n・お礼: ',
    '【譲ります】\n使わなくなったものを譲ります。\n・品名: \n・状態: \n・引取方法: ',
    '【探しています】\n以下のものを探しています。\n・品名: \n・用途: \n・条件: ',
  ],
  '口コミ': [
    '【おすすめ】\nとても良かったのでおすすめします！\n・良かった点: \n・注意点: \n・総合評価: ',
    '【体験レポート】\n実際に利用してみた感想です。\n・サービス内容: \n・満足度: \n・リピート: ',
    '【お気に入り】\nお気に入りのお店/サービスです。\n・おすすめポイント: \n・利用頻度: \n・コスパ: ',
    '【比較レビュー】\n他と比較した感想です。\n・比較対象: \n・違い: \n・どちらがおすすめ: ',
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

// 🔥 デフォルトの掲載期間を取得
const getDefaultExpiryForCategory = (category: string) => {
  if (category === '空席情報' || category === '在庫情報') {
    return '30m';
  } else if (category === '助け合い') {
    return '60m'; // 1時間をデフォルト
  } else if (category === 'イベント情報') {
    return 'days';
  } else if (category === '口コミ') {
    return '90d';
  } else {
    return '30m'; // デフォルトを30分に変更
  }
};

// 🔥 カテゴリ別のプレースホルダーテキストを取得
const getPlaceholderForCategory = (category: string) => {
  switch (category) {
    case '空席情報':
      return '空席情報を投稿してみよう。（240文字以内）';
    case '在庫情報':
      return '在庫情報を投稿してみよう。（240文字以内）';
    case 'イベント情報':
      return 'イベント情報を投稿してみよう。（240文字以内）';
    case '助け合い':
      return '食品ロス削減、物の譲り合いなど、地域の助け合い情報を投稿してみよう。（240文字以内）';
    case '口コミ':
      return '口コミ情報を投稿してみよう。（240文字以内）';
    default:
      return '日常生活のちょっとしたおとく情報を投稿してみよう。（240文字以内）';
  }
};

// 🔥 カテゴリ別の表示項目を取得
const getCategoryFields = (category: string) => {
  const baseFields = ['location']; // 全カテゴリで場所は表示
  
  switch (category) {
    case '空席情報':
    case '在庫情報':
      return [...baseFields, 'remainingSlots', 'url', 'image', 'customerSituation', 'coupon', 'phoneNumber'];
    case 'イベント情報':
      return [...baseFields, 'eventName', 'eventDate', 'eventPrice', 'url', 'image', 'phoneNumber', 'file'];
    case '助け合い':
      return [...baseFields, 'url', 'image', 'phoneNumber', 'file', 'supportPurchase']; // おすそわけ = supportPurchase
    case '口コミ':
      return [...baseFields, 'url', 'image', 'rating', 'file'];
    default:
      return baseFields;
  }
};

// 🔥 フィールドの表示名とアイコンを取得
const getFieldDisplayInfo = (field: string) => {
  const fieldMap = {
    location: { label: '場所', icon: StoreIcon },
    remainingSlots: { label: '残席・在庫数', icon: PackageIcon },
    url: { label: 'リンク', icon: LinkIcon },
    image: { label: '画像', icon: ImageIcon },
    customerSituation: { label: '来客状況', icon: Users },
    coupon: { label: 'クーポン', icon: Tag },
    phoneNumber: { label: '電話番号', icon: Phone },
    file: { label: 'ファイル', icon: FileText },
    supportPurchase: { label: 'おすそわけ', icon: HandCoins },
    rating: { label: '評価', icon: StarIcon },
    eventName: { label: 'イベント名', icon: CalendarDays },
    eventDate: { label: '開催期日', icon: CalendarDays },
    eventPrice: { label: '料金', icon: Tag },
  };
  
  return fieldMap[field as keyof typeof fieldMap] || { label: field, icon: HelpCircle };
};

// 🔥 カテゴリに対応したフィールドかどうかをチェック
const isFieldVisibleForCategory = (field: string, category: string) => {
  const categoryFields = getCategoryFields(category);
  return categoryFields.includes(field);
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

  // 🔥 更新されたフォーム設定（電話番号を追加）
  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      storeId: '',
      storeName: '',
      category: '空席情報', // デフォルトカテゴリを変更
      content: '',
      url: '',
      expiryOption: '30m', // デフォルトを30分に変更
      customExpiryMinutes: undefined, // デフォルト2時間
      customExpiryDays: undefined, // イベント情報用デフォルト日数
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
      // 🔥 イベント情報フィールドのデフォルト値を追加
      eventName: '',
      eventStartDate: '',
      eventEndDate: '',
      eventPrice: '',
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

  // 🔥 カテゴリ変更時の処理
  useEffect(() => {
    if (selectedCategory) {
      // 🔥 投稿内容をリセット
      form.setValue('content', '');
      
      // 🔥 詳細情報をすべてリセット（企業設定は保持）
      form.setValue('storeId', businessSettings?.business_store_id || '');
      form.setValue('storeName', businessSettings?.business_store_name || '');
      form.setValue('location_lat', undefined);
      form.setValue('location_lng', undefined);
      form.setValue('store_latitude', undefined);
      form.setValue('store_longitude', undefined);
      form.setValue('rating', undefined);
      form.setValue('url', businessSettings?.business_url || '');
      form.setValue('remainingSlots', undefined);
      form.setValue('customerSituation', '');
      form.setValue('couponCode', businessSettings?.business_default_coupon || '');
      form.setValue('phoneNumber', businessSettings?.business_default_phone || '');
      form.setValue('supportPurchaseEnabled', false);
      form.setValue('supportPurchaseOptions', []);
      
      // 🔥 イベント情報フィールドもリセット
      form.setValue('eventName', '');
      form.setValue('eventStartDate', '');
      form.setValue('eventEndDate', '');
      form.setValue('eventPrice', '');
      
      // 🔥 画像・ファイルもリセット（企業設定のデフォルト画像は保持）
      setImageFiles([]);
      if (businessDefaultImageUrls.length > 0) {
        setImagePreviewUrls([...businessDefaultImageUrls]);
      } else {
        setImagePreviewUrls([]);
      }
      setFileFiles([]);
      setFilePreviewUrls([]);
      
      // 🔥 来客状況の状態もリセット
      setMaleCustomers(undefined);
      setFemaleCustomers(undefined);
      
      // 🔥 位置情報関連の状態もリセット
      setLocationStatus('none');
      setSelectedPlace(null);
      
      // 🔥 すべてのオプションフィールドを閉じる
      setOptionalFieldsExpanded({
        image: false,
        location: false,
        rating: false,
        url: false,
        remainingSlots: false,
        customerSituation: false,
        coupon: false,
        phoneNumber: false,
        file: false,
        supportPurchase: false,
        eventName: false,
        eventDate: false,
        eventPrice: false,
      });
      
      // 🔥 詳細情報セクションを閉じる
      setShowOptionalFields(false);
      
      // 🔥 イベント情報の場合は必須フィールドを自動展開
      if (selectedCategory === 'イベント情報') {
        setShowOptionalFields(true);
        setOptionalFieldsExpanded(prev => ({
          ...prev,
          location: true,     // 場所（必須）
          eventName: true,    // イベント名（必須）
          eventDate: true,    // 開催期日（必須）
        }));
      }
      
      // 掲載期間の設定
      const defaultExpiry = getDefaultExpiryForCategory(selectedCategory);
      const currentExpiry = form.getValues('expiryOption');
      const validOptions = getExpiryOptionsForCategory(selectedCategory).map(opt => opt.value);
      
      // 空席情報・在庫情報間の移動の場合は現在の値を保持、それ以外はデフォルト値を設定
      const isAvailabilityCategory = selectedCategory === '空席情報' || selectedCategory === '在庫情報';
      const currentIsAvailabilityOption = currentExpiry && ['15m', '30m', '45m', '60m'].includes(currentExpiry);
      
      if (isAvailabilityCategory && currentIsAvailabilityOption) {
        // 空席情報・在庫情報間の移動で、現在の値が有効な場合は保持
        // 何もしない（現在の値を保持）
      } else {
        // それ以外の場合はデフォルト値を設定
        form.setValue('expiryOption', defaultExpiry);
        
        // 日数設定の場合はデフォルト値を設定
        if (defaultExpiry === 'days') {
          form.setValue('customExpiryDays', 7); // 7日間をデフォルト
          form.setValue('customExpiryMinutes', undefined);
        } else {
          form.setValue('customExpiryMinutes', undefined);
          form.setValue('customExpiryDays', undefined);
        }
      }
      
      // 🔥 企業設定の場合は位置情報を再取得
      if (businessSettings?.business_store_id) {
        fetchBusinessStoreLocation();
      }
      
      // 🔥 空席情報・在庫情報・イベント情報の場合は必要な項目を自動展開（リセット後に）
      if (selectedCategory === '空席情報' || selectedCategory === '在庫情報') {
        // 少し遅延させてから展開（リセット処理完了後）
        setTimeout(() => {
          setOptionalFieldsExpanded(prev => ({
            ...prev,
            location: true,
            remainingSlots: true
          }));
          setShowOptionalFields(true);
        }, 100);
      } else if (selectedCategory === 'イベント情報') {
        // イベント情報の場合は場所のみ自動展開
        setTimeout(() => {
          setOptionalFieldsExpanded(prev => ({
            ...prev,
            location: true
          }));
          setShowOptionalFields(true);
        }, 100);
      }
    }
  }, [selectedCategory, form, businessSettings, businessDefaultImageUrls, fetchBusinessStoreLocation]);
  
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

    // 🔥 カテゴリ権限チェック
    if (!isCategoryAvailableForRole(values.category, userRole)) {
      setSubmitError("選択されたカテゴリを投稿する権限がありません。");
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

    // 日数設定の検証
    if (values.expiryOption === 'days' && (!values.customExpiryDays || values.customExpiryDays < 1 || values.customExpiryDays > 90)) {
      setSubmitError("日数設定は1日〜90日の範囲で設定してください。");
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
            '空席情報': '空席情報',
            '在庫情報': '在庫情報',
            'イベント情報': 'イベント情報',
            '応援': '応援先',
            'おとく自慢': 'おとく自慢',
            '口コミ': '口コミ',
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
        custom_expiry_minutes: values.expiryOption === 'days' ? (values.customExpiryDays || 7) * 24 * 60 :
                               values.expiryOption === '90d' ? 90 * 24 * 60 : null,
        expires_at: calculateExpiresAt(values.expiryOption, values.customExpiryMinutes, values.customExpiryDays).toISOString(),
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
        // 🔥 イベント情報フィールドを追加
        event_name: values.eventName && values.eventName.trim() !== '' ? values.eventName : null,
        event_start_date: values.eventStartDate && values.eventStartDate.trim() !== '' ? values.eventStartDate : null,
        event_end_date: values.eventEndDate && values.eventEndDate.trim() !== '' ? values.eventEndDate : null,
        event_price: values.eventPrice && values.eventPrice.trim() !== '' ? values.eventPrice : null,
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

              // フォームリセット（企業設定を考慮）
      const resetValues = {
        storeId: businessSettings?.business_store_id || '',
        storeName: businessSettings?.business_store_name || '',
        category: '空席情報' as const, // デフォルトカテゴリを変更
        content: businessSettings?.business_default_content || '',
        url: businessSettings?.business_url || '',
        expiryOption: '30m' as const, // デフォルトを30分に変更
        customExpiryMinutes: undefined, // デフォルト2時間
        customExpiryDays: undefined, // イベント情報用デフォルト日数
        location_lat: undefined,
        location_lng: undefined,
        store_latitude: undefined,
        store_longitude: undefined,
        rating: undefined,
        supportPurchaseEnabled: false,
        supportPurchaseOptions: [],
        remainingSlots: undefined,
        customerSituation: '',
        couponCode: businessSettings?.business_default_coupon || '',
        phoneNumber: businessSettings?.business_default_phone || '',
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
    eventName: false, // 🔥 イベント名を追加
    eventDate: false, // 🔥 開催期日を追加
    eventPrice: false, // 🔥 料金を追加
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

  // 🔥 オプションフィールドの切り替えと値のリセット（電話番号を追加）
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
          case 'eventName': // 🔥 イベント名のリセット処理を追加
            form.setValue('eventName', '', { shouldValidate: true });
            break;
          case 'eventDate': // 🔥 開催期日のリセット処理を追加
            form.setValue('eventStartDate', '', { shouldValidate: true });
            form.setValue('eventEndDate', '', { shouldValidate: true });
            break;
          case 'eventPrice': // 🔥 料金のリセット処理を追加
            form.setValue('eventPrice', '', { shouldValidate: true });
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
  const [showCustomDaysModal, setShowCustomDaysModal] = useState(false);
  const [customDays, setCustomDays] = useState(7);

  // 🔥 来客状況の状態を追加
  const [totalCustomers, setTotalCustomers] = useState<number | undefined>(undefined);
  const [maleCustomers, setMaleCustomers] = useState<number | undefined>(undefined);
  const [femaleCustomers, setFemaleCustomers] = useState<number | undefined>(undefined);

  // 🔥 日数設定の処理
  const handleCustomDaysSet = () => {
    if (customDays > 0 && customDays <= 90) {
      form.setValue('customExpiryDays', customDays);
      setShowCustomDaysModal(false);
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
              
              {/* 🔥 1. カテゴリ（必須） */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xl flex font-semibold items-center">
                      <Layers className="mr-2 h-6 w-6" /> カテゴリ<span className="text-destructive ml-1">※</span>
                    </FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        // 🔥 権限チェック
                        if (!isCategoryAvailableForRole(value, userRole)) {
                          toast({
                            title: "権限エラー",
                            description: "このカテゴリを選択する権限がありません。",
                            variant: "destructive",
                            duration: 3000,
                          });
                          return;
                        }
                        field.onChange(value);
                      }} 
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full text-lg py-6">
                          <SelectValue placeholder="カテゴリを選択してください" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[200px]">
                        {userRole ? (
                          getAvailableCategoriesForRole(userRole).map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-lg py-3">
                              {option.label}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="loading" disabled className="text-lg py-3">
                            ロール情報を読み込み中...
                          </SelectItem>
                        )}
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
                        disabled={!selectedCategory}
                      >
                        定型文
                      </Button>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={getPlaceholderForCategory(selectedCategory)}
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
                      if (value === 'days') {
                        setShowCustomDaysModal(true);
                      }
                    }} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="w-full text-lg py-6">
                          <SelectValue placeholder="掲載期間を選択してください" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getExpiryOptionsForCategory(selectedCategory || 'おとく自慢').map((option) => (
                          <SelectItem key={option.value} value={option.value} className="text-lg py-3">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    
                    {/* 日数設定が選択されている場合の表示 */}
                    {selectedExpiryOption === 'days' && form.getValues('customExpiryDays') && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <span className="text-sm text-blue-800">
                              設定期間: {form.getValues('customExpiryDays')}日間
                            </span>
                            {selectedCategory === 'イベント情報' && eventStartDate && (
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
                            disabled={selectedCategory === 'イベント情報' && Boolean(eventStartDate)}
                          >
                            {selectedCategory === 'イベント情報' && eventStartDate ? '自動計算' : '変更'}
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* イベント情報で日数設定が必要な場合の案内 */}
                    {selectedCategory === 'イベント情報' && selectedExpiryOption === 'days' && !form.getValues('customExpiryDays') && (
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="h-4 w-4 text-amber-600" />
                          <span className="text-sm text-amber-800">
                            イベント情報では開催日を入力すると掲載期間が自動計算されます。開催期日を入力してください。
                          </span>
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
                      {/* 🔥 カテゴリ別詳細情報項目のトグルボタン */}
                      <motion.div 
                        key={selectedCategory}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="grid grid-cols-2 gap-2"
                      >
                        {getCategoryFields(selectedCategory).map((field) => {
                          const { label, icon: Icon } = getFieldDisplayInfo(field);
                          const isExpanded = optionalFieldsExpanded[field as keyof typeof optionalFieldsExpanded];
                          const isBusinessSet = isBusinessFieldSet(field as keyof typeof optionalFieldsExpanded);
                          
                          return (
                            <motion.div
                              key={field}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.2, delay: getCategoryFields(selectedCategory).indexOf(field) * 0.05 }}
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
                                {isBusinessSet && (
                                  <span className="ml-1 text-xs">(設定済み)</span>
                                )}
                              </Button>
                            </motion.div>
                          );
                        })}
                      </motion.div>

                      {/* 🔥 各詳細情報フィールドの表示 */}

                      {/* 1. 場所入力フィールド */}
                      {optionalFieldsExpanded.location && isFieldVisibleForCategory('location', selectedCategory) && (
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