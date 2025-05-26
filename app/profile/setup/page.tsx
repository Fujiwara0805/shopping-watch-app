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
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, User as UserIcon, Info, Image as ImageIcon, X, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Profile } from '@/types/profile';
import { v4 as uuidv4 } from 'uuid';

const profileSchema = z.object({
  username: z.string().min(2, { message: 'ニックネームは2文字以上で入力してください。' }).max(30, { message: 'ニックネームは30文字以内で入力してください。' }),
  bio: z.string().max(160, { message: '自己紹介は160文字以内で入力してください。' }).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// コンポーネント名を ProfileSetupPage に変更
export default function ProfileSetupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false); // セットアップ時は常にfalseで良い
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: '', // 新規登録時は常に空
      bio: '', // 新規登録時は常に空
    },
    mode: 'onChange',
  });

  const { isValid, isSubmitting } = form.formState;

  // useEffectを新規登録用に調整
  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      console.log("ProfileSetupPage: User not logged in, redirecting to login page.");
      // ログインページへのリダイレクト
      router.replace(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
    } else {
       // セッションがあればローディング終了。新規登録のためプロフィール読み込みは行わない
      setLoading(false);
      console.log("ProfileSetupPage: User session found, ready for setup.");
    }
  }, [session, status, router]);

  // 新規登録なのでfetchProfileは不要。削除またはコメントアウトします。
  // const fetchProfile = async (userId: string) => { ... };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setSubmitError("ファイルサイズは5MB以下にしてください。");
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
      setSubmitError(null);
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreviewUrl(null);
    const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const onSubmit = async (values: ProfileFormValues) => {
    if (!session?.user?.id) {
      console.error("ProfileSetupPage: Save attempt without session user ID.");
      setSubmitError("ユーザーIDが見つかりません。再度ログインしてください。");
      return;
    }

    setIsSaving(true);
    setSubmitError(null);

    let avatarUrl = avatarPreviewUrl;

    try {
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${session.user.id}/${uuidv4()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          console.error("ProfileSetupPage: Error uploading avatar:", uploadError);
          throw new Error(`アバター画像のアップロードに失敗しました: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
         if (!urlData?.publicUrl) {
           throw new Error("アバター画像のURL取得に失敗しました。");
         }
        avatarUrl = urlData.publicUrl;

      } else if (avatarPreviewUrl === null && avatarFile === null) {
         avatarUrl = null;
      }

      const profileData: Partial<Profile> = {
        id: session.user.id,
        display_name: values.username,
        bio: values.bio,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(), // 新規登録時もupdated_atを設定
      };

      // Supabaseへの保存処理 (upsertを使用)
      const { error: upsertError } = await supabase
        .from('app_profiles')
        .upsert(profileData, { onConflict: 'id' }); // onConflict: 'id' で新規登録と更新を兼ねる

      if (upsertError) {
        console.error("ProfileSetupPage: Error saving profile:", upsertError);
        throw new Error(`プロフィールの保存に失敗しました: ${upsertError.message}`);
      }

      console.log("ProfileSetupPage: Profile saved successfully.");

      // 保存後、プロフィールページまたはタイムラインページへ遷移
      // 新規登録後はプロフィールページへ遷移するのが自然かもしれません
      router.push('/profile'); // 例: プロフィールページへ遷移

    } catch (error: any) {
      console.error("ProfileSetupPage: onSubmit error:", error);
      setSubmitError(error.message || "プロフィールの保存処理中にエラーが発生しました。");
    } finally {
      setIsSaving(false);
    }
  };

  // ローディング表示はセッションローディングのみで良い
  if (status === "loading") {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // セッションがあり、かつコンポーネント固有のローディングが終わったら表示
  if (session && !loading) {
    return (
      <AppLayout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="container mx-auto max-w-lg p-4 md:p-8"
        >
           {/* タイトルを新規登録用に変更 */}
           <h1 className="text-3xl font-bold text-center mb-6">プロフィール新規登録</h1>

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

              {submitError && (
                <p className="text-sm text-destructive text-center bg-destructive/10 p-3 rounded-md">{submitError}</p>
              )}

               {/* 新規登録時はプロフィール読み込みローディングは不要なので削除 */}
              {/* {profileLoading && (
                 <div className="flex items-center justify-center">
                   <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" /> プロフィール読み込み中...
                 </div>
               )} */}

              <motion.div whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  // 新規登録時はプロフィール読み込みは関係ないので profileLoading を削除
                  disabled={!isValid || isSaving}
                  className="w-full text-xl py-3"
                >
                  {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "登録する"} {/* ボタンテキストも変更 */}
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
