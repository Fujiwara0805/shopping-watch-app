"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Camera, Upload, X, Store as StoreIcon, LayoutGrid, ClipboardList, Image as ImageIcon, Percent, CalendarClock, PackageIcon, Calculator, ClockIcon, Tag, Laugh, Smile, Meh, Frown, Angry, HelpCircle } from 'lucide-react';
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


declare global {
  interface Window {
    google: any;
  }
}

const postSchema = z.object({
  storeId: z.string({ required_error: 'お店を選択してください' }),
  storeName: z.string({ required_error: "お店の名前が取得できませんでした。"}),
  category: z.string({ required_error: 'カテゴリを選択してください' }),
  content: z.string().min(5, { message: '5文字以上入力してください' }).max(200, { message: '200文字以内で入力してください' }),
  discountRate: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val === '') return undefined;
      const num = parseInt(String(val), 10);
      return isNaN(num) ? undefined : num;
    },
    z.number({ invalid_type_error: '有効な数値を入力してください' })
     .min(0, { message: '0%以上で入力してください' })
     .max(100, { message: '100%以下で入力してください' })
     .optional()
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
  expiryTime: z.string().optional(),
  remainingItems: z.string().optional(),
  expiryOption: z.enum(['1h', '3h', '6h', '12h'], { required_error: '掲載期間を選択してください' }),
  location_lat: z.number().optional().nullable(),
  location_lng: z.number().optional().nullable(),
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

export default function PostPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
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

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      storeId: '',
      storeName: '',
      category: '',
      content: '',
      discountRate: undefined,
      price: undefined,
      expiryTime: '',
      remainingItems: '',
      expiryOption: '3h',
    },
    mode: 'onChange',
  });
  
  const { formState: { isValid, isSubmitting } } = form;
  
  const selectedCategory = form.watch('category');

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
  
  const handleActualSubmit = async (values: PostFormValues) => {
    if (!session?.user?.id) {
      console.log("PostPage: User not logged in, redirecting to login page.");
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    form.clearErrors("root.serverError");
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

      const postData = {
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

      const { data: insertedPost, error: insertError } = await supabase
        .from('posts')
        .insert(postData)
        .select('id, store_id, store_name, app_profile_id')
        .single();

      if (insertError || !insertedPost) {
        console.error("PostPage: Error inserting post:", insertError);
        throw new Error(`投稿の保存に失敗しました: ${insertError?.message || "Unknown error"}`);
      }
      
      createdPostId = insertedPost.id;
      console.log("PostPage: Post inserted successfully with ID:", createdPostId, "Image path:", imageUrlToSave);

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

      form.reset();
      setImageFile(null);
      router.push('/post/complete');

    } catch (error: any) {
      console.error("PostPage: onSubmit error:", error);
      setSubmitError(error.message || "投稿処理中にエラーが発生しました。");
    } finally {
      setIsUploading(false);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setSubmitError(null);
    }
  };
  
  const removeImage = () => {
    setImageFile(null);
    setImagePreviewUrl(null);
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

  useEffect(() => {
    if (isLoaded && storeInputRef.current) {
      const newAutocomplete = new google.maps.places.Autocomplete(storeInputRef.current, {
        types: ['establishment'],
        componentRestrictions: { 'country': ['jp'] },
      });
      newAutocomplete.addListener('place_changed', () => {
        const place = newAutocomplete.getPlace();
        if (place.geometry && place.geometry.location) {
          form.setValue("storeName", place.name || "");
          form.setValue("location_lat", place.geometry.location.lat());
          form.setValue("location_lng", place.geometry.location.lng());
          setPlaceId(place.place_id || null);
          setStoreAddress(place.formatted_address || '');
        }
      });
      setAutocomplete(newAutocomplete);
    }
  }, [isLoaded, form]);

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
                </FormLabel>
                <FormControl>
                  <div className="flex flex-col items-center space-y-3 p-6 border-2 border-dashed rounded-lg hover:border-primary transition-colors cursor-pointer bg-card">
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isUploading}
                      onClick={() => setHasUserRemovedDefaultImage(false)}
                    />
                    {imagePreviewUrl ? (
                      <div className="relative group">
                        <img src={imagePreviewUrl} alt="プレビュー" className="max-h-60 rounded-md object-contain" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={removeImage}
                          disabled={isUploading}
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                    ) : (
                      <label htmlFor="image-upload" className="flex flex-col items-center space-y-2 cursor-pointer text-muted-foreground">
                        <Upload className="h-12 w-12" />
                        <p className="text-lg">画像をアップロード</p>
                        <p className="text-xs">PNG, JPG, WEBP (最大5MB)</p>
                      </label>
                    )}
                  </div>
                </FormControl>
                <p className="text-sm text-red-500 mt-1">※陳列している商品の画像をアップしないでください。購入後の商品の画像をアップしてください。</p>
                {!imageFile && (
                  <p className="text-sm text-muted-foreground mt-1 ">
                    画像が未アップロードの場合、自動的に画像が設定されます。
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
                      <FavoriteStoreInput
                        value={{ id: field.value, name: form.getValues("storeName") }}
                        onChange={(store) => {
                          if (store) {
                            form.setValue("storeId", store.id, { shouldValidate: true });
                            form.setValue("storeName", store.name, { shouldValidate: true });
                          } else {
                            form.setValue("storeId", "", { shouldValidate: true });
                            form.setValue("storeName", "", { shouldValidate: true });
                          }
                        }}
                        placeholder="お店を検索または選択してください"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <input type="hidden" {...form.register("storeName")} />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-xl flex font-semibold items-center">
                      <LayoutGrid className="mr-2 h-6 w-6" /> カテゴリ<span className="text-destructive ml-1">※</span>
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-3 gap-2"
                      >
                        {categories.map((category) => (
                          <div key={category}>
                            <RadioGroupItem
                              value={category}
                              id={`category-${category}`}
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor={`category-${category}`}
                              className={cn(
                                "flex flex-col items-center justify-between rounded-md border-2 border-muted p-3 text-lg",
                                "hover:border-primary peer-data-[state=checked]:border-primary",
                                "peer-data-[state=checked]:bg-primary/10"
                              )}
                            >
                              {category}
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
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xl flex font-semibold items-center">
                      <ClipboardList className="mr-2 h-6 w-6" /> 内容<span className="text-destructive ml-1">※</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="値引き内容や商品の状態を入力してください（240文字以内）"
                        className="resize-none text-lg"
                        rows={5}
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
                      <Calculator className="mr-2 h-6 w-6 " /> 値引き率 :
                      <span className="ml-2 text-primary font-bold flex items-center">
                        {(() => {
                          const selectedOption = discountIcons.find(option => option.value === field.value);
                          const displayIcon = selectedOption ? selectedOption.Icon : Angry; // デフォルトはAngry (0%)
                          const displayText = selectedOption ? selectedOption.label : "なし"; // デフォルトは「なし」

                          return (
                            <>
                              {React.createElement(displayIcon, { className: "h-7 w-7 mr-2" })}
                              {displayText}
                            </>
                          );
                        })()}
                      </span>
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(val) => field.onChange(parseInt(val, 10))}
                        defaultValue={field.value !== undefined ? String(field.value) : String(0)}
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
                                "flex flex-col items-center justify-center rounded-md border-2 border-muted p-3 text-center text-lg h-full cursor-pointer",
                                "hover:border-primary peer-data-[state=checked]:border-primary",
                                "peer-data-[state=checked]:bg-primary/10"
                              )}
                            >
                              {React.createElement(option.Icon, { className: "h-8 w-8 mb-1" })}
                              <span className="text-sm">{option.label}</span>
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
                        className="text-lg"
                        disabled={isUploading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="expiryTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg flex items-center">
                        <CalendarClock className="mr-2 h-5 w-5" /> 消費期限 (任意)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="date"
                          className="text-lg"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="remainingItems"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg flex items-center">
                        <PackageIcon className="mr-2 h-5 w-5" /> 残り数量 (任意)
                      </FormLabel>
                      <FormControl>
                        <div className="flex">
                          <Input
                            type="number"
                            min="1"
                            placeholder="10"
                            className="text-lg"
                            {...field}
                            value={field.value || ''}
                          />
                          <span className="ml-2 flex items-center text-muted-foreground text-lg">点</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                  disabled={!isValid || isSubmitting || isUploading}
                  className={cn(
                    "w-full text-xl py-3",
                    (!isValid || isSubmitting || isUploading) && "bg-gray-400 cursor-not-allowed hover:bg-gray-400"
                  )}
                >
                  {(isSubmitting || isUploading) ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "投稿する"}
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
              {imagePreviewUrl && (
                <div className="flex justify-center mb-4">
                  <img src={imagePreviewUrl} alt="投稿プレビュー" className="max-h-48 rounded-md object-contain border" />
                </div>
              )}
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
                検索候補が表示されない場合は、正確な店舗情報を見つけるために、一度お店を探す画面へ移動してください。
              </p>
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={() => {
                    setShowStoreSearchInfoModal(false);
                    router.push('/map'); // 仮の店舗検索画面パス
                  }}
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