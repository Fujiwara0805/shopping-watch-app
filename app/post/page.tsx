"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Camera, Upload, X, Store as StoreIcon, LayoutGrid, ClipboardList, Image as ImageIcon, Percent, CalendarClock, PackageIcon, Calculator, ClockIcon, JapaneseYen } from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { Store } from '@/types/store';
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { supabase } from '@/lib/supabaseClient';
import { calculateExpiresAt } from '@/lib/expires-at-date';
import { v4 as uuidv4 } from 'uuid';

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
     .optional()
  ),
  expiryTime: z.string().optional(),
  remainingItems: z.string().optional(),
  expiryOption: z.enum(['1h', '3h', '24h'], { required_error: '掲載期間を選択してください' }),
});

type PostFormValues = z.infer<typeof postSchema>;

type DisplayStore = Pick<Store, 'name'> & { id: string };

export default function PostPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    latitude,
    longitude,
    loading: locationLoading,
    error: locationError,
    permissionState,
    requestLocation
  } = useGeolocation();

  const [availableStores, setAvailableStores] = useState<DisplayStore[]>([]);
  const [storeSearchLoading, setStoreSearchLoading] = useState(false);
  const [storeSearchError, setStoreSearchError] = useState<string | null>(null);
  const [googleMapsApiLoaded, setGoogleMapsApiLoaded] = useState(false);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const hasLoggedApiCheckInitiationRef = useRef(false);
  
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
  
  const { isValid, isSubmitting } = form.formState;
  
  const onSubmit = async (values: PostFormValues) => {
    if (!session?.user?.id) {
      console.log("PostPage: User not logged in, redirecting to login page.");
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    form.clearErrors("root.serverError");
    setIsUploading(true);
    setSubmitError(null);

    let imageUrl = null;

    try {
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('post_images')
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error("PostPage: Error uploading image:", uploadError);
          throw new Error(`画像のアップロードに失敗しました: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage.from('post_images').getPublicUrl(filePath);
        if (!urlData?.publicUrl) {
          throw new Error("画像のURL取得に失敗しました。");
        }
        imageUrl = urlData.publicUrl;
      }

      const postData = {
        author_id: session.user.id,
        store_id: values.storeId,
        store_name: values.storeName,
        category: values.category,
        content: values.content,
        image_url: imageUrl,
        discount_rate: values.discountRate,
        price: values.price,
        expiry_option: values.expiryOption,
        created_at: new Date().toISOString(),
        expires_at: calculateExpiresAt(values.expiryOption).toISOString(),
      };

      const { error: insertError } = await supabase.from('posts').insert(postData);

      if (insertError) {
        console.error("PostPage: Error inserting post:", insertError);
        throw new Error(`投稿の保存に失敗しました: ${insertError.message}`);
      }

      console.log("PostPage: Post inserted successfully with image:", imageUrl);
      form.reset();
      setImageFile(null);
      setImagePreviewUrl(null);
      router.push('/timeline');

    } catch (error: any) {
      console.error("PostPage: onSubmit error:", error);
      setSubmitError(error.message || "投稿処理中にエラーが発生しました。");
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      setSubmitError(null);
    }
  };
  
  const removeImage = () => {
    setImageFile(null);
    setImagePreviewUrl(null);
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  useEffect(() => {
    const checkGoogleApi = () => {
      if (
        typeof window.google !== 'undefined' &&
        typeof window.google.maps !== 'undefined' &&
        typeof window.google.maps.places !== 'undefined' &&
        typeof window.google.maps.places.PlacesService === 'function'
      ) {
        console.log("PostPage: Google Maps API with PlacesService loaded successfully.");
        setGoogleMapsApiLoaded(true);
        if (!placesServiceRef.current) {
          const mapDivForService = document.createElement('div');
          placesServiceRef.current = new window.google.maps.places.PlacesService(mapDivForService);
          console.log("PostPage: PlacesService initialized.");
        }
      } else {
        if (!hasLoggedApiCheckInitiationRef.current) {
            console.log("PostPage: Google Maps API with PlacesService not yet loaded, starting to poll...");
            hasLoggedApiCheckInitiationRef.current = true;
        }
        setTimeout(checkGoogleApi, 500);
      }
    };

    if (!googleMapsApiLoaded && !hasLoggedApiCheckInitiationRef.current) {
        checkGoogleApi();
    }
  }, [googleMapsApiLoaded]);

  useEffect(() => {
    if (permissionState === 'granted' && !latitude && !longitude && !locationLoading) {
      console.log("PostPage: Permission is granted, and location not yet available. Requesting location...");
      requestLocation();
    }
  }, [permissionState, latitude, longitude, locationLoading, requestLocation]);

  useEffect(() => {
    console.log("PostPage: Store search useEffect triggered. Deps:", {
      permissionState,
      latitude,
      longitude,
      googleMapsApiLoaded,
      locationLoading,
      placesServiceExists: !!placesServiceRef.current
    });

    if (permissionState === 'granted' && latitude && longitude && googleMapsApiLoaded && placesServiceRef.current && !locationLoading) {
      console.log("PostPage: Conditions met for nearbySearch. Initializing search...");
      setStoreSearchLoading(true);
      setStoreSearchError(null);
      setAvailableStores([]);

      const request: google.maps.places.PlaceSearchRequest = {
        location: new window.google.maps.LatLng(latitude, longitude),
        radius: 100,
        keyword: 'スーパーマーケット OR コンビニエンスストア OR デパート OR ショッピングモール OR 小売店',
      };

      console.log("PostPage: Calling nearbySearch with request:", request);
      placesServiceRef.current.nearbySearch(request, (results, status, pagination) => {
        console.log("PostPage: nearbySearch callback. Status:", status, "Results:", results);
        setStoreSearchLoading(false);
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          const fetchedStores: DisplayStore[] = results
            .filter(place => place.place_id && place.name)
            .map(place => ({
              id: place.place_id!,
              name: place.name!,
            }));
          console.log("PostPage: Fetched stores:", fetchedStores);
          setAvailableStores(fetchedStores);
          if (fetchedStores.length === 0) {
            setStoreSearchError("周辺100m以内に店舗が見つかりませんでした。");
          }
        } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          console.log("PostPage: No stores found (ZERO_RESULTS).");
          setStoreSearchError("周辺100m以内に店舗が見つかりませんでした。");
        } else {
          console.error("PostPage: Error fetching stores. Status:", status, "Pagination:", pagination);
          setStoreSearchError(`店舗の検索に失敗しました。(${status})`);
        }
      });
    } else {
      console.log("PostPage: Conditions NOT met for nearbySearch or already loading/error.");
      if (permissionState !== 'granted') console.log("PostPage: Reason: permissionState is not 'granted'");
      if (!latitude || !longitude) console.log("PostPage: Reason: latitude or longitude is missing");
      if (!googleMapsApiLoaded) console.log("PostPage: Reason: googleMapsApiLoaded is false");
      if (!placesServiceRef.current) console.log("PostPage: Reason: placesServiceRef.current is null");
      if (locationLoading) console.log("PostPage: Reason: locationLoading is true");
    }
  }, [latitude, longitude, permissionState, googleMapsApiLoaded, locationLoading]);

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
    if (storeSearchLoading) return "お店を検索中...";
    if (storeSearchError) return storeSearchError;
    if (!googleMapsApiLoaded) return "地図サービスの読み込み待ち...";
    if (permissionState === 'granted' && availableStores.length === 0 && !storeSearchLoading && !storeSearchError) return "周辺500m以内に店舗が見つかりません";
    return "お店を選択してください";
  };

  console.log("PostPage DEBUG:", {
    permissionState,
    latitude,
    longitude,
    locationLoading,
    locationError,
    googleMapsApiLoaded,
    storeSearchLoading,
    storeSearchError,
    availableStoresLength: availableStores.length,
    isSelectDisabled: (
      locationLoading ||
      storeSearchLoading ||
      (permissionState !== 'granted' && permissionState !== 'prompt') ||
      !!locationError ||
      !!storeSearchError ||
      !googleMapsApiLoaded ||
      (availableStores.length === 0 && permissionState === 'granted' && !storeSearchError)
    ),
    currentPlaceholder: getSelectPlaceholder(),
  });

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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-20">
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
                <p className="text-xs text-red-500 mt-1">※陳列している商品の画像はアップしないでください。購入後の商品の画像をアップしてください。</p>
              </FormItem>

              <FormField
                control={form.control}
                name="storeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xl font-semibold flex items-center">
                      <StoreIcon className="mr-2 h-6 w-6" />お店
                    </FormLabel>
                    {(availableStores.length === 0 && permissionState === 'granted' && !storeSearchLoading && !storeSearchError && !locationLoading) || permissionState === 'denied' || !!locationError ? (
                      <p className="text-sm text-muted-foreground mt-1">
                        ※お店が選択できない場合は一度「お店を探す」画面を確認してください。
                      </p>
                    ) : null}
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        const selectedStore = availableStores.find(s => s.id === value);
                        form.setValue('storeName', selectedStore?.name || '');
                      }}
                      defaultValue={field.value}
                      disabled={storeSearchLoading || availableStores.length === 0 || isUploading}
                    >
                      <FormControl>
                        <SelectTrigger className="text-lg">
                          <SelectValue placeholder={getSelectPlaceholder()} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableStores.map((store) => (
                          <SelectItem key={store.id} value={store.id} className="text-lg">
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      <LayoutGrid className="mr-2 h-6 w-6" /> カテゴリ
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-3 gap-2"
                      >
                        {['惣菜', '弁当', '肉', '魚', '野菜', '果物', 'その他'].map((category) => (
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
                      <ClipboardList className="mr-2 h-6 w-6" /> 内容
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="値引き内容や商品の状態を入力してください"
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
                    <FormLabel className="text-xl flex items-center">
                      <Calculator className="mr-2 h-6 w-6" /> 値引き率 (任意): {field.value === undefined ? '-' : `${field.value}%`}
                    </FormLabel>
                    <FormControl>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[field.value === undefined ? 0 : field.value]}
                        onValueChange={(vals) => field.onChange(vals[0])}
                        className="py-4"
                      />
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
                    <FormLabel className="text-xl flex items-center"><JapaneseYen className="mr-2 h-6 w-6" />価格 (税込・任意)</FormLabel>
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
                      <ClockIcon className="mr-2 h-6 w-6" /> 掲載期間
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-3 gap-2"
                      >
                        {[
                          { value: '1h', label: '1時間' },
                          { value: '3h', label: '3時間' },
                          { value: '24h', label: '24時間' },
                        ].map((option) => (
                          <div key={option.value}>
                            <RadioGroupItem
                              value={option.value}
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
              </motion.div>
            </form>
          </Form>
        </motion.div>
      </AppLayout>
    );
  }

  return null;
}