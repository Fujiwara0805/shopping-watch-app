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
import FavoriteStoreInput from '@/components/profile/FavoriteStoreInput';
import { CustomModal } from '@/components/ui/custom-modal';

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
          console.error("PostPage: Error uploading image:", uploadError);
          throw new Error(`画像のアップロードに失敗しました: ${uploadError.message}`);
        }
        imageUrlToSave = objectPath;
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
        created_at: new Date().toISOString(),
        expires_at: calculateExpiresAt(values.expiryOption).toISOString(),
      };

      const { error: insertError } = await supabase.from('posts').insert(postData);

      if (insertError) {
        console.error("PostPage: Error inserting post:", insertError);
        throw new Error(`投稿の保存に失敗しました: ${insertError.message}`);
      }

      console.log("PostPage: Post inserted successfully with image path:", imageUrlToSave);
      form.reset();
      setImageFile(null);
      setImagePreviewUrl(null);
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
                      <Calculator className="mr-2 h-6 w-6" /> 値引き率 (任意): {field.value === undefined ? `0%` : `${field.value}%`}
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
          <CustomModal
            isOpen={showConfirmModal}
            onClose={() => {
              setShowConfirmModal(false);
              setFormDataToSubmit(null);
            }}
            title="投稿内容の確認"
            description="投稿した記事は後から削除や編集を行うことはできません。本当に投稿しますか？"
          >
            <div className="pt-2">
              <p className="text-sm text-destructive">
                投稿した記事は後から削除や編集を行うことはできません。
                <br/>
                本当に投稿しますか？
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
        </motion.div>
      </AppLayout>
    );
  }

  return null;
}