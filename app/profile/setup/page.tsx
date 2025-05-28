"use client";

import { useState, useEffect } from 'react';
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
import { Loader2, User as UserIcon, Info, Image as ImageIcon, X, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

// app_profiles テーブルの型定義 (仮。必要に応じて調整)
interface AppProfile {
  id: string; // app_profiles テーブルの主キー (UUID)
  user_id: string; // app_users テーブルのidへの外部キー
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  updated_at?: string; // Supabaseが自動更新するなら不要な場合も
  // created_at?: string;
}

const profileSchema = z.object({
  username: z.string().min(2, { message: 'ニックネームは2文字以上で入力してください。' }).max(30, { message: 'ニックネームは30文字以内で入力してください。' }),
  bio: z.string().max(160, { message: '自己紹介は160文字以内で入力してください。' }).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileSetupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: '',
      bio: '',
    },
    mode: 'onChange',
  });

  const { isValid } = form.formState;

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      console.log("ProfileSetupPage: User not logged in, redirecting to login page.");
      router.replace(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
    } else if (!session.user?.id) {
      console.warn("ProfileSetupPage: Session found, but session.user.id (for app_users) is MISSING. Redirecting or showing error.");
      setSubmitError("ユーザー認証情報が不完全です。再度ログインしてください。");
      setLoading(false);
    }
    else {
      setLoading(false);
      console.log("ProfileSetupPage: User session found with app_users.id, ready for setup:", session.user.id);
    }

    // NextAuthのセッションにSupabaseのアクセストークンが含まれていると仮定
    // (例: session.supabaseAccessToken)
    // この supabaseAccessToken をNextAuthのコールバックで設定しておく必要があります。
    if (session?.supabaseAccessToken) {
      supabase.auth.setSession({
        access_token: session.supabaseAccessToken as string,
        refresh_token: (session.supabaseRefreshToken as string) || '', // もしあれば
      });
    }
  }, [session, status, router]);

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
    if (!session?.user?.id) {
      console.error("ProfileSetupPage: Save attempt without session user ID (app_users.id).");
      setSubmitError("ユーザー認証情報が見つかりません。再度ログインしてください。");
      return;
    }

    setIsSaving(true);
    setSubmitError(null);

    let uploadedAvatarPath: string | null = null;

    try {
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const userFolder = session.user.id; // app_users.id (これが auth.uid() である想定)
        const uniqueFileName = `${uuidv4()}.${fileExt}`;
        // オブジェクトパスはバケット名を含めない
        const objectPath = `${userFolder}/${uniqueFileName}`; // 例: '6aa9958c-ce7e-46bb-b614-3201d2e4ce36/9b9cb96d-113c-4610-b13b-79f62ef63d0a.png'

        console.log("ProfileSetupPage: Attempting to upload to objectPath:", objectPath); // ★ログ追加

        const { error: uploadError } = await supabase.storage
          .from('avatars') // バケット名を指定
          .upload(objectPath, avatarFile, { // ここで指定するパスはバケットからの相対パス
            cacheControl: '3600',
            upsert: true, // trueにすると同名ファイルは上書き
          });

        if (uploadError) {
          console.error("ProfileSetupPage: Error uploading avatar:", uploadError);
          throw new Error(`アバター画像のアップロードに失敗しました: ${uploadError.message}`);
        }
        uploadedAvatarPath = objectPath; // 保存するのはこのオブジェクトパス
      }

      const newAppProfileId = uuidv4();

      const profileDataToSave: AppProfile = {
        id: newAppProfileId,
        user_id: session.user.id,
        display_name: values.username,
        bio: values.bio || null,
        avatar_url: uploadedAvatarPath,
        updated_at: new Date().toISOString(),
      };

      const { error: saveError } = await supabase
        .from('app_profiles')
        .insert(profileDataToSave);

      if (saveError) {
        console.error("ProfileSetupPage: Error saving profile to app_profiles:", saveError);
        throw new Error(`プロフィールの保存に失敗しました: ${saveError.message}`);
      }

      console.log("ProfileSetupPage: Profile saved successfully to app_profiles.");
      router.push('/profile/setup/complete');

    } catch (error: any) {
      console.error("ProfileSetupPage: onSubmit error:", error);
      setSubmitError(error.message || "プロフィールの保存処理中にエラーが発生しました。");
    } finally {
      setIsSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (session && session.user?.id && !submitError && !loading) {
    return (
      <AppLayout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="container mx-auto max-w-lg p-4 md:p-8"
        >
           <h1 className="text-3xl font-bold text-center mb-6">プロフィール新規登録</h1>
           {!session.user.id && !loading && (
             <div className="text-center p-4 my-4 text-red-700 bg-red-100 rounded-md">
               <p>ユーザー情報の読み込みに問題が発生しました。お手数ですが、再度ログインし直してください。</p>
               <Button onClick={() => router.push('/login')} className="mt-2">ログインページへ</Button>
             </div>
           )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormItem>
                <FormLabel className="text-xl flex items-center">
                  <ImageIcon className="mr-2 h-6 w-6" /> プロフィール画像 (任意)
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
                           <Upload className="h-10 w-10" />
                           <p className="text-base">画像をアップロード</p>
                           <p className="text-xs">PNG, JPG, WEBP (最大5MB)</p>
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
                    <FormLabel className="text-xl flex items-center"><UserIcon className="mr-2 h-6 w-6" /> ニックネーム</FormLabel>
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

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xl flex items-center"><Info className="mr-2 h-6 w-6" /> 自己紹介 (任意)</FormLabel>
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
              {submitError && !form.formState.errors.username && (
                <p className="text-sm text-destructive text-center bg-destructive/10 p-3 rounded-md">{submitError}</p>
              )}

              <motion.div whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  disabled={!isValid || isSaving || !session.user?.id}
                  className="w-full text-xl py-3"
                >
                  {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "登録する"}
                </Button>
              </motion.div>
            </form>
          </Form>
        </motion.div>
      </AppLayout>
    );
  }

  if (submitError && !loading) {
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
