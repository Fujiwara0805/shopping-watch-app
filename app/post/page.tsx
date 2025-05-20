"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Camera, Upload, X, Store as StoreIcon, LayoutGrid, ClipboardList, Image as ImageIcon, Percent, CalendarClock, PackageIcon, Calculator, ClockIcon } from 'lucide-react';
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

declare global {
  interface Window {
    google: any;
  }
}

const postSchema = z.object({
  storeId: z.string({ required_error: 'お店を選択してください' }),
  category: z.string({ required_error: 'カテゴリを選択してください' }),
  content: z.string().min(5, { message: '5文字以上入力してください' }).max(200, { message: '200文字以内で入力してください' }),
  discountRate: z.number().min(10, { message: '10%以上で入力してください' }).max(90, { message: '90%以下で入力してください' }),
  expiryTime: z.string().optional(),
  remainingItems: z.string().optional(),
  expiryOption: z.enum(['1h', '3h', '24h'], { required_error: '掲載期間を選択してください' }),
});

type PostFormValues = z.infer<typeof postSchema>;

type DisplayStore = Pick<Store, 'name'> & { id: string };

export default function PostPage() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const router = useRouter();
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
      category: '',
      content: '',
      discountRate: 30,
      expiryTime: '',
      remainingItems: '',
      expiryOption: '3h',
    },
    mode: 'onChange',
  });
  
  const { isValid } = form.formState;
  
  const onSubmit = (values: PostFormValues) => {
    console.log({ ...values, image: imageSrc });
    setTimeout(() => {
      router.push('/timeline');
    }, 1000);
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const removeImage = () => {
    setImageSrc(null);
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
      // 各条件がなぜ満たされなかったのかをログに出力
      if (permissionState !== 'granted') console.log("PostPage: Reason: permissionState is not 'granted'");
      if (!latitude || !longitude) console.log("PostPage: Reason: latitude or longitude is missing");
      if (!googleMapsApiLoaded) console.log("PostPage: Reason: googleMapsApiLoaded is false");
      if (!placesServiceRef.current) console.log("PostPage: Reason: placesServiceRef.current is null");
      if (locationLoading) console.log("PostPage: Reason: locationLoading is true");
    }
  }, [latitude, longitude, permissionState, googleMapsApiLoaded, locationLoading]); // placesServiceRef.current は依存配列に含めない

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

  // デバッグ用: 現在の主要なstateを表示
  console.log("PostPage DEBUG:", {
    permissionState,
    latitude,
    longitude,
    locationLoading,
    locationError,
    googleMapsApiLoaded, // ★ PlacesService の準備ができているか
    storeSearchLoading,  // ★ 店舗検索中か
    storeSearchError,    // ★ 店舗検索エラーはあるか
    availableStoresLength: availableStores.length, // ★ 取得できた店舗数
    isSelectDisabled: ( // ★ セレクトボックスが無効化されるかどうかの計算
      locationLoading ||
      storeSearchLoading ||
      (permissionState !== 'granted' && permissionState !== 'prompt') ||
      !!locationError ||
      !!storeSearchError ||
      !googleMapsApiLoaded ||
      (availableStores.length === 0 && permissionState === 'granted' && !storeSearchError)
    ),
    currentPlaceholder: getSelectPlaceholder(), // ★ 現在のプレースホルダーの内容
  });

  return (
    <AppLayout>
      <div className="p-4 pb-24">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="storeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-2xl flex items-center">
                    <StoreIcon className="mr-2 h-6 w-6" /> お店
                  </FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value} 
                    disabled={
                      locationLoading || 
                      storeSearchLoading || 
                      (permissionState !== 'granted' && permissionState !== 'prompt') ||
                      !!locationError ||
                      !!storeSearchError ||
                      !googleMapsApiLoaded ||
                      (availableStores.length === 0 && permissionState === 'granted' && !storeSearchError)
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="text-lg">
                        <SelectValue placeholder={getSelectPlaceholder()} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {permissionState === 'prompt' && !locationLoading && (
                        <div className="p-2 text-center">
                          <p className="text-lg text-muted-foreground mb-2">お店の検索には位置情報の許可が必要です。</p>
                          <Button type="button" onClick={requestLocation} size="sm" className="text-lg">
                            位置情報の利用を許可する
                          </Button>
                        </div>
                      )}
                      {permissionState === 'granted' && !locationError && !storeSearchError && availableStores.length > 0 &&
                        availableStores.map((store) => (
                          <SelectItem key={store.id} value={store.id} className="text-lg">
                            {store.name}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-2xl flex items-center">
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
                  <FormLabel className="text-2xl flex items-center">
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
            
            <div className="space-y-2">
              <Label className="text-2xl flex items-center">
                <ImageIcon className="mr-2 h-6 w-6" /> 写真 (任意)
              </Label>
              <div className="border-2 border-dashed rounded-md p-4 text-center">
                {imageSrc ? (
                  <div className="relative">
                    <img
                      src={imageSrc}
                      alt="商品の写真"
                      className="mx-auto h-48 object-cover rounded-md"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="py-4">
                    <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-lg text-muted-foreground mb-2">
                      写真をアップロードしてください
                    </p>
                    <p className="text-xs text-red-500 mb-2">
                      ※陳列している商品の画像はアップしないでください。<br />
                      購入後の商品の画像をアップしてください。
                    </p>
                    <div className="flex justify-center gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="relative text-lg"
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Upload className="h-4 w-4 mr-1" />
                        アップロード
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="discountRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-2xl flex items-center">
                    <Calculator className="mr-2 h-6 w-6" /> 値引き率: {field.value}%
                  </FormLabel>
                  <FormControl>
                    <Slider
                      min={10}
                      max={90}
                      step={5}
                      value={[field.value]}
                      onValueChange={(vals) => field.onChange(vals[0])}
                      className="py-4"
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
                  <FormLabel className="text-2xl flex items-center">
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
            
            <motion.div
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                type="submit" 
                className={cn(
                  "w-full mt-6 text-xl",
                  !isValid && "bg-gray-400 cursor-not-allowed hover:bg-gray-400"
                )}
                disabled={!isValid}
              >
                投稿する
              </Button>
            </motion.div>
          </form>
        </Form>
      </div>
    </AppLayout>
  );
}