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

interface AppProfile {
  id: string;
  user_id: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  updated_at?: string;
}

const profileSchema = z.object({
  username: z.string().min(2, { message: 'ニックネームは2文字以上で入力してください。' }).max(30, { message: 'ニックネームは30文字以内で入力してください。' }),
  bio: z.string().max(160, { message: '自己紹介は160文字以内で入力してください。' }).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileEditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);

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

    if (!session || !session.user?.id) {
      console.log("ProfileEditPage: User not logged in, redirecting to login page.");
      router.replace(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
    } else {
      fetchProfileByAppUserId(session.user.id);
      setLoading(false);
    }
  }, [session, status, router]);

  const fetchProfileByAppUserId = async (appUserId: string) => {
    setProfileLoading(true);
    setSubmitError(null);
    try {
      const { data, error } = await supabase
        .from('app_profiles')
        .select('*')
        .eq('user_id', appUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        form.reset({
          username: data.display_name || '',
          bio: data.bio || '',
        });
        setCurrentProfileId(data.id);
        if (data.avatar_url) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.avatar_url);
          setAvatarPreviewUrl(urlData?.publicUrl || null);
        } else {
          setAvatarPreviewUrl(null);
        }
        console.log("ProfileEditPage: Fetched existing profile for user_id:", appUserId, data);
      } else {
        console.log("ProfileEditPage: No existing profile found for user_id:", appUserId, "User might need to setup profile first.");
        setSubmitError("編集対象のプロフィールが見つかりません。先にプロフィールを作成してください。");
      }

    } catch (error: any) {
      console.error("ProfileEditPage: Error fetching profile:", error);
      setSubmitError("プロフィールの読み込みに失敗しました: " + error.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        form.setError("username", {type: "manual", message: "ファイルサイズは5MB以下にしてください。"});
        setAvatarFile(null);
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
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const onSubmit = async (values: ProfileFormValues) => {
    if (!session?.user?.id) {
      console.error("ProfileEditPage: Save attempt without session user ID.");
      setSubmitError("ユーザーIDが見つかりません。再度ログインしてください。");
      return;
    }
    if (!currentProfileId && !avatarFile && !values.username) {
        setSubmitError("更新対象のプロフィール情報が読み込めていません。");
        return;
    }

    setIsSaving(true);
    setSubmitError(null);

    let objectPathToSave: string | null = null;

    if (avatarPreviewUrl && !avatarFile) {
        const { data: fetchedProfile } = await supabase.from('app_profiles').select('avatar_url').eq('user_id', session.user.id).single();
        objectPathToSave = fetchedProfile?.avatar_url || null;
    }

    try {
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
          console.error("ProfileEditPage: Error uploading avatar:", uploadError);
          throw new Error(`アバター画像のアップロードに失敗しました: ${uploadError.message}`);
        }
      } else if (avatarPreviewUrl === null && avatarFile === null) {
         objectPathToSave = null;
      }

      const profileUpdateData: Omit<AppProfile, 'id' | 'user_id' | 'updated_at'> & { updated_at: string } = {
        display_name: values.username,
        bio: values.bio || null,
        avatar_url: objectPathToSave,
        updated_at: new Date().toISOString(),
      };

      if (currentProfileId) {
        const { error: updateError } = await supabase
          .from('app_profiles')
          .update(profileUpdateData)
          .eq('id', currentProfileId);

        if (updateError) {
          console.error("ProfileEditPage: Error updating profile:", updateError);
          throw new Error(`プロフィールの更新に失敗しました: ${updateError.message}`);
        }
      } else {
         throw new Error("更新対象のプロフィールIDが見つかりません。");
      }

      console.log("ProfileEditPage: Profile saved successfully.");
      router.push('/profile/setup/complete');

    } catch (error: any) {
      console.error("ProfileEditPage: onSubmit error:", error);
      setSubmitError(error.message || "プロフィールの保存処理中にエラーが発生しました。");
    } finally {
      setIsSaving(false);
    }
  };

  if (status === "loading" || loading || profileLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          {profileLoading && <p className="ml-2">プロフィール読み込み中...</p>}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto max-w-lg p-4 md:p-8"
      >
         <h1 className="text-3xl font-bold text-center mb-2">プロフィール編集</h1>
         {submitError && !form.formState.errors.username && !form.formState.errors.bio && (
            <p className="text-sm text-destructive text-center bg-destructive/10 p-3 rounded-md mb-4">{submitError}</p>
          )}
          {(!currentProfileId && !profileLoading && !submitError) && (
             <div className="text-center p-4 my-4 text-orange-700 bg-orange-100 rounded-md">
               <p>編集対象のプロフィールデータが見つかりません。先にプロフィールを作成してください。</p>
               <Button onClick={() => router.push('/profile/setup')} className="mt-2">新規登録ページへ</Button>
             </div>
          )}

        {currentProfileId && (
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
                    <Input placeholder="ニックネームを入力" className="text-lg" {...field} disabled={isSaving} />
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
                    <Textarea placeholder="自己紹介を入力してください" className="resize-none text-lg" rows={4} {...field} disabled={isSaving}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                disabled={!isValid || isSaving || profileLoading }
                className="w-full text-xl py-3"
              >
                {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "保存する"}
              </Button>
            </motion.div>
          </form>
        </Form>
        )}
      </motion.div>
    </AppLayout>
  );
}
