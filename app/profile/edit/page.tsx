"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabaseClient';
import { Profile, ProfileUpdate } from '@/types/profile'; // 先ほど作成した型定義
import AppLayout from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, UploadCloud, UserCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  username: z.string().min(2, { message: "ニックネームは2文字以上で入力してください。" }).max(50, { message: "ニックネームは50文字以内で入力してください。" }).nullable(),
  full_name: z.string().max(100, { message: "名前は100文字以内で入力してください。"}).nullable(),
  // avatar_url は直接フォームデータとしては扱わず、別途処理します
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileEditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: '',
      full_name: '',
    },
    mode: 'onChange',
  });

  const fetchProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error && status !== 406) { // 406 はレコードがない場合
        console.error('Error fetching profile:', error);
        throw error;
      }

      if (data) {
        setCurrentProfile(data);
        form.reset({
          username: data.username || '',
          full_name: data.full_name || '',
        });
        setAvatarUrl(data.avatar_url);
      }
    } catch (error) {
      // エラーハンドリング (例: Toast表示)
      console.error("プロフィール情報の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, form]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    fetchProfile();
  }, [session, status, router, fetchProfile]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!session?.user?.id) return;
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    try {
      // まず既存のアバターを削除（任意。古いファイルを残さないようにする場合）
      if (currentProfile?.avatar_url) {
        const oldFilePath = currentProfile.avatar_url.split('/').pop();
        if (oldFilePath) {
          await supabase.storage.from('avatars').remove([oldFilePath]);
        }
      }

      // 新しいアバターをアップロード
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true }); // upsert: true で同名ファイルは上書き

      if (uploadError) {
        throw uploadError;
      }

      // 公開URLを取得
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      if (!urlData?.publicUrl) {
        throw new Error("Failed to get public URL for avatar.");
      }
      const newAvatarUrl = urlData.publicUrl;
      setAvatarUrl(newAvatarUrl);

      // profilesテーブルも更新
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl, updated_at: new Date().toISOString() })
        .eq('id', session.user.id);

      if (updateError) {
        throw updateError;
      }
      setCurrentProfile(prev => prev ? { ...prev, avatar_url: newAvatarUrl } : null);

    } catch (error) {
      console.error('Error uploading avatar:', error);
      // エラーハンドリング
    } finally {
      setUploading(false);
    }
  };


  const onSubmit = async (values: ProfileFormValues) => {
    if (!session?.user?.id) return;
    setLoading(true);

    const profileUpdateData: ProfileUpdate = {
      username: values.username,
      full_name: values.full_name,
      updated_at: new Date().toISOString(),
      // avatar_url は handleAvatarUpload で直接更新済み
    };

    try {
      const { error } = await supabase
        .from('profiles')
        .update(profileUpdateData)
        .eq('id', session.user.id);

      if (error) {
        throw error;
      }
      // 成功時の処理 (例: Toast表示, プロフィールページへ遷移など)
      console.log("プロフィールを更新しました。");
      router.push('/timeline'); // 例: タイムラインへ戻る
    } catch (error) {
      console.error('Error updating profile:', error);
      // エラーハンドリング
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading && !currentProfile) { // 初期ロード中
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!session) {
    return null; // リダイレクト処理中に何も表示しない
  }

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto max-w-2xl p-4 md:p-8"
      >
        <h1 className="text-3xl font-bold mb-8 text-center">プロフィール編集</h1>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="flex flex-col items-center space-y-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <Avatar className="w-32 h-32 border-2 border-muted hover:border-primary transition-colors">
                    <AvatarImage src={avatarUrl || undefined} alt={currentProfile?.username || "User"} />
                    <AvatarFallback className="bg-muted">
                      {uploading ? (
                        <Loader2 className="h-10 w-10 animate-spin" />
                      ) : (
                        <UserCircle className="h-16 w-16 text-gray-400" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                </Label>
              </motion.div>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={uploading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('avatar-upload')?.click()}
                disabled={uploading}
                className="text-lg"
              >
                <UploadCloud className="mr-2 h-5 w-5" />
                {uploading ? "アップロード中..." : "プロフィール画像を変更"}
              </Button>
            </div>

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xl">ニックネーム</FormLabel>
                  <FormControl>
                    <Input placeholder="例: ショッピング好き" {...field} value={field.value || ''} className="text-lg"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xl">表示名 (任意)</FormLabel>
                  <FormControl>
                    <Input placeholder="例: 山田 太郎" {...field} value={field.value || ''} className="text-lg"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* 必要に応じて自己紹介などの他のフィールドを追加 */}
            {/* 
            <FormField
              control={form.control}
              name="bio" // SupabaseのprofilesテーブルとprofileSchemaにも追加が必要
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xl">自己紹介 (任意)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="よろしくお願いします！"
                      className="resize-none text-lg min-h-[100px]"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            */}

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button 
                type="submit" 
                disabled={loading || uploading || !form.formState.isDirty || !form.formState.isValid} 
                className={cn(
                  "w-full text-xl py-3",
                  (loading || uploading || !form.formState.isDirty || !form.formState.isValid) && "bg-gray-400 cursor-not-allowed hover:bg-gray-400"
                )}
              >
                {loading || uploading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                {loading ? "保存中..." : uploading ? "画像処理中..." : "プロフィールを保存"}
              </Button>
            </motion.div>
          </form>
        </Form>
      </motion.div>
    </AppLayout>
  );
}
