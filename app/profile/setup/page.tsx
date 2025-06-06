"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AppLayout from '@/components/layout/app-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, User as UserIcon, Info, Image as ImageIcon, X, Upload, Store } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import FavoriteStoreInput from '@/components/profile/FavoriteStoreInput';
import { useLoading } from '@/contexts/loading-context';
import OnboardingModal from '@/components/onboarding/onboardingModal'; // 上記で作成したコンポーネント

// app_profiles テーブルの型定義
interface AppProfile {
  id: string;
  user_id: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  updated_at?: string;
  favorite_store_1_id?: string | null;
  favorite_store_1_name?: string | null;
  favorite_store_2_id?: string | null;
  favorite_store_2_name?: string | null;
  favorite_store_3_id?: string | null;
  favorite_store_3_name?: string | null;
}

const profileSchema = z.object({
  username: z.string().min(2, { message: 'ニックネームは2文字以上で入力してください。' }).max(30, { message: 'ニックネームは30文字以内で入力してください。' }),
  bio: z.string().max(160, { message: '自己紹介は160文字以内で入力してください。' }).optional(),
  favoriteStore1: z.object({ id: z.string().optional(), name: z.string().optional() }).nullable().optional(),
  favoriteStore2: z.object({ id: z.string().optional(), name: z.string().optional() }).nullable().optional(),
  favoriteStore3: z.object({ id: z.string().optional(), name: z.string().optional() }).nullable().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileSetupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showLoading, hideLoading } = useLoading();
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  
  // オンボーディングモーダルの状態管理
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profileExists, setProfileExists] = useState<boolean | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: '',
      bio: '',
      favoriteStore1: null,
      favoriteStore2: null,
      favoriteStore3: null,
    },
    mode: 'onChange',
  });

  const { isValid } = form.formState;

  // セッション管理とリダイレクト
  useEffect(() => {
    if (status === "loading") {
      showLoading();
      return;
    }

    if (!session) {
      console.log("ProfileSetupPage: User not logged in, redirecting to login page.");
      router.replace(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      hideLoading();
    } else if (!session.user?.id) {
      console.warn("ProfileSetupPage: Session found, but session.user.id (for app_users) is MISSING. Redirecting or showing error.");
      setSubmitError("ユーザー認証情報が不完全です。再度ログインしてください。");
      hideLoading();
    } else {
      hideLoading();
      console.log("ProfileSetupPage: User session found with app_users.id, ready for setup:", session.user.id);
    }

    if (session?.supabaseAccessToken) {
      supabase.auth.setSession({
        access_token: session.supabaseAccessToken as string,
        refresh_token: (session.supabaseRefreshToken as string) || '',
      });
    }
  }, [session, status, router, showLoading, hideLoading]);

  // プロフィール存在チェック関数
  const checkProfileExists = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('app_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = "The result contains 0 rows"
        console.error("Error checking profile existence:", error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error("Error in checkProfileExists:", error);
      return false;
    }
  };

  // オンボーディングモーダルの表示制御
  useEffect(() => {
    const initializeOnboarding = async () => {
      if (status === "authenticated" && session?.user?.id) {
        // プロフィールの存在をチェック
        const exists = await checkProfileExists(session.user.id);
        setProfileExists(exists);
        
        // プロフィールが存在しない場合のみオンボーディングを表示
        if (!exists) {
          // 少し遅延してからモーダルを表示（ページロードの完了を待つ）
          const timer = setTimeout(() => {
            setShowOnboarding(true);
          }, 1000);
          
          return () => clearTimeout(timer);
        }
      }
    };

    initializeOnboarding();
  }, [status, session?.user?.id]);

  // オンボーディングモーダルを閉じる処理
  const handleOnboardingClose = () => {
    setShowOnboarding(false);
    setProfileExists(true);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        form.setError("username", { type: "manual", message: "ファイルサイズは5MB以下にしてください。" });
        setAvatarFile(null);
        setAvatarPreviewUrl(null);
        e.target.value = '';
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.clearErrors("username");
      setSubmitError(null);
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreviewUrl(null);
    const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const onSubmit = async (values: ProfileFormValues) => {
    console.log("ProfileSetupPage onSubmit - Form values:", values);

    if (!session?.user?.id) {
      console.error("ProfileSetupPage: Save attempt without session user ID (app_users.id).");
      setSubmitError("ユーザー認証情報が見つかりません。再度ログインしてください。");
      return;
    }

    setIsSaving(true);
    setSubmitError(null);
    showLoading();

    let uploadedAvatarPath: string | null = null;

    try {
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const userFolder = session.user.id;
        const uniqueFileName = `${uuidv4()}.${fileExt}`;
        const objectPath = `${userFolder}/${uniqueFileName}`;

        console.log("ProfileSetupPage: Attempting to upload to objectPath:", objectPath);

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(objectPath, avatarFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          console.error("ProfileSetupPage: Error uploading avatar:", uploadError);
          throw new Error(`アバター画像のアップロードに失敗しました: ${uploadError.message}`);
        }
        uploadedAvatarPath = objectPath;
      }

      const newAppProfileId = uuidv4();

      const profileDataToSave: AppProfile = {
        id: newAppProfileId,
        user_id: session.user.id,
        display_name: values.username,
        bio: values.bio || null,
        avatar_url: uploadedAvatarPath,
        updated_at: new Date().toISOString(),
        favorite_store_1_id: values.favoriteStore1?.id || null,
        favorite_store_1_name: values.favoriteStore1?.name || null,
        favorite_store_2_id: values.favoriteStore2?.id || null,
        favorite_store_2_name: values.favoriteStore2?.name || null,
        favorite_store_3_id: values.favoriteStore3?.id || null,
        favorite_store_3_name: values.favoriteStore3?.name || null,
      };

      const { error: saveError } = await supabase
        .from('app_profiles')
        .insert(profileDataToSave);

      if (saveError) {
        console.error("ProfileSetupPage: Error saving profile to app_profiles:", saveError);
        throw new Error(`プロフィールの保存に失敗しました: ${saveError.message}`);
      }

      console.log("ProfileSetupPage: Profile saved successfully to app_profiles.");
      
      // プロフィール保存成功時にオンボーディングモーダルを閉じる
      if (showOnboarding) {
        setShowOnboarding(false);
        setProfileExists(true);
      }
      
      router.push('/profile/setup/complete');

    } catch (error: any) {
      console.error("ProfileSetupPage: onSubmit error:", error);
      setSubmitError(error.message || "プロフィールの保存処理中にエラーが発生しました。");
    } finally {
      setIsSaving(false);
      hideLoading();
    }
  };

  if (status === "loading") {
    return (
      <AppLayout>
        <div className="min-h-screen"></div>
      </AppLayout>
    );
  }

  if (session && session.user?.id && !submitError) {
    return (
      <AppLayout>
        {/* オンボーディングモーダル */}
        <OnboardingModal 
          isOpen={showOnboarding} 
          onClose={handleOnboardingClose}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="container mx-auto max-w-lg p-4 md:p-8"
        >
          {!session.user.id && (
            <div className="text-center p-4 my-4 text-red-700 bg-red-100 rounded-md">
              <p>ユーザー情報の読み込みに問題が発生しました。お手数ですが、再度ログインし直してください。</p>
              <Button onClick={() => router.push('/login')} className="mt-2">ログインページへ</Button>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-20">
              <FormItem>
                <FormLabel className="text-2xl flex items-center font-semibold">
                  <ImageIcon className="mr-2 h-7 w-7" /> プロフィール画像
                </FormLabel>
                <FormControl>
                  <div className="flex flex-col items-center space-y-3 p-6 border-2 border-dashed rounded-lg hover:border-primary transition-colors cursor-pointer bg-card">
                    <Input
                      id="avatar-upload"
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={isSaving}
                    />
                    {avatarPreviewUrl ? (
                      <div className="relative group">
                        <img src={avatarPreviewUrl} alt="アバタープレビュー" className="w-24 h-24 rounded-full object-cover" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                          onClick={removeAvatar}
                          disabled={isSaving}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label htmlFor="avatar-upload" className="flex flex-col items-center space-y-2 cursor-pointer text-muted-foreground">
                        <Upload className="h-12 w-12" />
                        <p className="text-lg">画像をアップロード</p>
                        <p className="text-sm">PNG, JPG, WEBP (最大5MB)</p>
                      </label>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-2xl flex items-center font-semibold">
                      <UserIcon className="mr-2 h-6 w-6" />ニックネーム
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="例: ショッピング好き" 
                        {...field} 
                        disabled={isSaving}
                        className="text-base py-6"
                        style={{ fontSize: '16px' }}
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
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-2xl flex items-center">
                      <Info className="mr-2 h-6 w-6" />自己紹介 (任意)
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="例: お得な情報を見つけるのが好きです！よろしくお願いします。" 
                        {...field} 
                        disabled={isSaving} 
                        rows={4}
                        className="text-base py-4"
                        style={{ fontSize: '16px' }}
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
                name="favoriteStore1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-2xl flex items-center font-semibold">
                      <Store className="mr-2 h-6 w-6 text-primary" /> お気に入り店舗1
                    </FormLabel>
                    <FormControl>
                      <FavoriteStoreInput
                        placeholder="店舗を検索して選択"
                        value={field.value === null ? undefined : field.value}
                        onChange={(value) => {
                          console.log(`FavoriteStore1 changed in Controller:`, value);
                          field.onChange(value);
                        }}
                        disabled={isSaving}
                        ref={field.ref}
                        className="text-base py-6"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="favoriteStore2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-2xl flex items-center">
                      <Store className="mr-2 h-6 w-6 text-primary" /> お気に入り店舗2 (任意)
                    </FormLabel>
                    <FormControl>
                      <FavoriteStoreInput
                        placeholder="店舗を検索して選択"
                        value={field.value === null ? undefined : field.value}
                        onChange={(value) => {
                          console.log(`FavoriteStore2 changed in Controller:`, value);
                          field.onChange(value);
                        }}
                        disabled={isSaving}
                        ref={field.ref}
                        className="text-base py-6"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="favoriteStore3"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-2xl flex items-center">
                      <Store className="mr-2 h-6 w-6 text-primary" /> お気に入り店舗3 (任意)
                    </FormLabel>
                    <FormControl>
                      <FavoriteStoreInput
                        placeholder="店舗を検索して選択"
                        value={field.value === null ? undefined : field.value}
                        onChange={(value) => {
                          console.log(`FavoriteStore3 changed in Controller:`, value);
                          field.onChange(value);
                        }}
                        disabled={isSaving}
                        ref={field.ref}
                        className="text-base py-6"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {submitError && (
                <p className="text-base font-medium text-destructive bg-destructive/10 p-3 rounded-md">{submitError}</p>
              )}

              <Button type="submit" className="w-full text-lg py-6" disabled={isSaving || !isValid}>
                {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                プロフィールを保存する
              </Button>
            </form>
          </Form>
        </motion.div>
      </AppLayout>
    );
  }

  if (submitError) {
    return (
      <AppLayout>
        <div className="container mx-auto max-w-lg p-4 md:p-8 text-center">
          <h1 className="text-3xl font-bold text-center mb-6 text-destructive">エラー</h1>
          <p className="text-destructive bg-destructive/10 p-4 rounded-md">{submitError}</p>
          <Button onClick={() => router.push('/login')} className="mt-4">ログインページへ戻る</Button>
        </div>
      </AppLayout>
    );
  }

  return null;
}