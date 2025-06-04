"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AppLayout from '@/components/layout/app-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, User as UserIcon, Info, Image as ImageIcon, X, Upload, Store } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import FavoriteStoreInput from '@/components/profile/FavoriteStoreInput';

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
  bio: z.string().max(120, { message: '自己紹介は120文字以内で入力してください。' }).optional(),
  favoriteStore1: z.object({ id: z.string().optional(), name: z.string().optional() }).nullable().optional(),
  favoriteStore2: z.object({ id: z.string().optional(), name: z.string().optional() }).nullable().optional(),
  favoriteStore3: z.object({ id: z.string().optional(), name: z.string().optional() }).nullable().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// ローディングスケルトンコンポーネント
const ProfileSkeleton = () => (
  <div className="container mx-auto max-w-lg p-4 md:p-8 space-y-6">
    {/* アバター画像スケルトン */}
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <div className="flex justify-center">
        <Skeleton className="w-24 h-24 rounded-full" />
      </div>
    </div>
    
    {/* ニックネームスケルトン */}
    <div className="space-y-2">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-12 w-full" />
    </div>
    
    {/* 自己紹介スケルトン */}
    <div className="space-y-2">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-24 w-full" />
    </div>
    
    {/* お気に入り店舗スケルトン */}
    {[1, 2, 3].map((i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-12 w-full" />
      </div>
    ))}
    
    {/* ボタンスケルトン */}
    <Skeleton className="h-12 w-full" />
  </div>
);

export default function ProfileEditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<AppProfile | null>(null);

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

  // セッション状態の監視とリダイレクト処理
  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user?.id) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    // Supabaseセッションの設定（並列実行）
    if (session?.supabaseAccessToken) {
      supabase.auth.setSession({
        access_token: session.supabaseAccessToken as string,
        refresh_token: (session.supabaseRefreshToken as string) || '',
      });
    }
  }, [session, status, router]);

  // プロフィールデータの取得（最適化）
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      setSubmitError(null);

      const { data, error } = await supabase
        .from('app_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        setSubmitError("編集対象のプロフィールが見つかりません。先にプロフィールを作成してください。");
        return;
      }

      setCurrentProfile(data);

      // フォームデータの設定
      const formData = {
        username: data.display_name || '',
        bio: data.bio || '',
        favoriteStore1: data.favorite_store_1_id && data.favorite_store_1_name
          ? { id: data.favorite_store_1_id, name: data.favorite_store_1_name }
          : null,
        favoriteStore2: data.favorite_store_2_id && data.favorite_store_2_name
          ? { id: data.favorite_store_2_id, name: data.favorite_store_2_name }
          : null,
        favoriteStore3: data.favorite_store_3_id && data.favorite_store_3_name
          ? { id: data.favorite_store_3_id, name: data.favorite_store_3_name }
          : null,
      };

      // フォームをリセット
      form.reset(formData);

      // アバターURLを個別に取得
      let fetchedAvatarUrl: string | null = null;
      if (data.avatar_url) {
        fetchedAvatarUrl = supabase.storage.from('avatars').getPublicUrl(data.avatar_url).data?.publicUrl || null;
      }
      setAvatarPreviewUrl(fetchedAvatarUrl);

      console.log("ProfileEditPage: Profile loaded successfully:", data);

    } catch (error: any) {
      console.error("ProfileEditPage: Error fetching profile:", error);
      setSubmitError("プロフィールの読み込みに失敗しました: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [form]);

  // ユーザーIDが取得できたらプロフィールを取得
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      fetchProfile(session.user.id);
    }
  }, [session?.user?.id, status, fetchProfile]);

  // アバター画像アップロード処理の最適化
  const handleAvatarUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      form.setError("username", {
        type: "manual", 
        message: "ファイルサイズは5MB以下にしてください。"
      });
      setAvatarFile(null);
      e.target.value = '';
      return;
    }

    setAvatarFile(file);
    
    // FileReaderを使った画像プレビューの最適化
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    form.clearErrors("username");
    setSubmitError(null);
  }, [form]);

  const removeAvatar = useCallback(() => {
    setAvatarFile(null);
    setAvatarPreviewUrl(null);
    const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }, []);

  // フォーム送信処理の最適化
  const onSubmit = useCallback(async (values: ProfileFormValues) => {
    if (!session?.user?.id || !currentProfile) {
      setSubmitError("ユーザー情報またはプロフィール情報が不足しています。");
      return;
    }

    setIsSaving(true);
    setSubmitError(null);

    try {
      let objectPathToSave: string | null = null;

      // アバター画像のアップロード処理
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const userFolder = session.user.id;
        const uniqueFileName = `${uuidv4()}.${fileExt}`;
        objectPathToSave = `${userFolder}/${uniqueFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(objectPathToSave, avatarFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`アバター画像のアップロードに失敗しました: ${uploadError.message}`);
        }
      } else if (avatarPreviewUrl && currentProfile.avatar_url) {
        objectPathToSave = currentProfile.avatar_url;
      }

      // プロフィール更新データの準備
      const profileUpdateData = {
        display_name: values.username,
        bio: values.bio || null,
        avatar_url: objectPathToSave,
        updated_at: new Date().toISOString(),
        favorite_store_1_id: values.favoriteStore1?.id || null,
        favorite_store_1_name: values.favoriteStore1?.name || null,
        favorite_store_2_id: values.favoriteStore2?.id || null,
        favorite_store_2_name: values.favoriteStore2?.name || null,
        favorite_store_3_id: values.favoriteStore3?.id || null,
        favorite_store_3_name: values.favoriteStore3?.name || null,
      };

      const { error: updateError } = await supabase
        .from('app_profiles')
        .update(profileUpdateData)
        .eq('id', currentProfile.id);

      if (updateError) {
        throw new Error(`プロフィールの更新に失敗しました: ${updateError.message}`);
      }

      console.log("ProfileEditPage: Profile updated successfully.");
      
      // 成功時のリダイレクト
      router.push('/profile/setup/complete?edited=true');

    } catch (error: any) {
      console.error("ProfileEditPage: onSubmit error:", error);
      setSubmitError(error.message || "プロフィールの更新処理中にエラーが発生しました。");
    } finally {
      setIsSaving(false);
    }
  }, [session?.user?.id, currentProfile, avatarFile, avatarPreviewUrl, router]);

  // メモ化されたエラー表示
  const errorDisplay = useMemo(() => {
    if (submitError && !form.formState.errors.username && !form.formState.errors.bio) {
      return (
        <div className="text-sm text-destructive text-center bg-destructive/10 p-3 rounded-md mb-4">
          {submitError}
        </div>
      );
    }
    return null;
  }, [submitError, form.formState.errors]);

  // プロフィール未見つけ時の表示
  const noProfileDisplay = useMemo(() => {
    if (!currentProfile && !isLoading && !submitError) {
      return (
        <div className="text-center p-4 my-4 text-orange-700 bg-orange-100 rounded-md">
          <p>編集対象のプロフィールデータが見つかりません。先にプロフィールを作成してください。</p>
          <Button onClick={() => router.push('/profile/setup')} className="mt-2">
            新規登録ページへ
          </Button>
        </div>
      );
    }
    return null;
  }, [currentProfile, isLoading, submitError, router]);

  // ローディング中の表示
  if (status === "loading" || isLoading) {
    return (
      <AppLayout>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <ProfileSkeleton />
        </motion.div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="container mx-auto max-w-lg p-4 md:p-8"
      >
        {errorDisplay}
        {noProfileDisplay}

        {currentProfile && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-20">
              {/* アバター画像 */}
              <FormItem>
                <FormLabel className="text-2xl flex items-center font-semibold">
                  <ImageIcon className="mr-2 h-6 w-6" /> プロフィール画像
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
                        <img 
                          src={avatarPreviewUrl} 
                          alt="アバタープレビュー" 
                          className="w-24 h-24 rounded-full object-cover"
                          loading="lazy"
                        />
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
                        <Upload className="h-10 w-10" />
                        <p className="text-base">画像をアップロード</p>
                        <p className="text-xs">PNG, JPG, WEBP (最大5MB)</p>
                      </label>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>

              {/* ニックネーム */}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-2xl flex items-center font-semibold">
                      <UserIcon className="mr-2 h-6 w-6" /> ニックネーム
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="ニックネームを入力" 
                        className="text-lg" 
                        {...field} 
                        disabled={isSaving} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 自己紹介 */}
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-2xl flex items-center">
                      <Info className="mr-2 h-6 w-6" /> 自己紹介 (任意)
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="自己紹介を入力してください" 
                        className="resize-none text-lg" 
                        rows={4} 
                        {...field} 
                        disabled={isSaving}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* お気に入り店舗1 */}
              <FormField
                control={form.control}
                name="favoriteStore1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-2xl flex items-center font-semibold">
                      <Store className="mr-2 h-5 w-5 text-primary" /> お気に入り店舗1 
                    </FormLabel>
                    <FormControl>
                      <FavoriteStoreInput
                        placeholder="店舗を検索して選択"
                        value={field.value === null ? undefined : field.value}
                        onChange={(value) => field.onChange(value)}
                        disabled={isSaving}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* お気に入り店舗2 */}
              <FormField
                control={form.control}
                name="favoriteStore2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-2xl flex items-center">
                      <Store className="mr-2 h-5 w-5 text-primary" /> お気に入り店舗2 (任意)
                    </FormLabel>
                    <FormControl>
                      <FavoriteStoreInput
                        placeholder="店舗を検索して選択"
                        value={field.value === null ? undefined : field.value}
                        onChange={(value) => field.onChange(value)}
                        disabled={isSaving}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* お気に入り店舗3 */}
              <FormField
                control={form.control}
                name="favoriteStore3"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-2xl flex items-center">
                      <Store className="mr-2 h-5 w-5 text-primary" /> お気に入り店舗3 (任意)
                    </FormLabel>
                    <FormControl>
                      <FavoriteStoreInput
                        placeholder="店舗を検索して選択"
                        value={field.value === null ? undefined : field.value}
                        onChange={(value) => field.onChange(value)}
                        disabled={isSaving}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {submitError && (
                <p className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">
                  {submitError}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isSaving || !isValid}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                プロフィールを更新する
              </Button>

              {/* プロフィール画面へ戻るボタンを追加 */}
              <Button
                type="button"
                variant="outline"
                className="w-full mt-px bg-gray-100 text-gray-800 hover:bg-gray-200"
                onClick={() => router.push('/profile')}
                disabled={isSaving}
              >
                プロフィール画面へ戻る
              </Button>
            </form>
          </Form>
        )}
      </motion.div>
    </AppLayout>
  );
}