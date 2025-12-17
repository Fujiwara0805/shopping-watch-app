"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, User as UserIcon, Info, Image as ImageIcon, X, Upload, Check, Link as LinkIcon, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import FavoriteStoreInput from '@/components/profile/FavoriteStoreInput';
import { useLoading } from '@/contexts/loading-context';
import { AnimatePresence} from 'framer-motion';
import { createProfileSetup } from '@/app/_actions/profiles';

// app_profiles テーブルの型定義（bioを削除）
interface AppProfile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  updated_at?: string;
  favorite_store_1_id?: string | null;
  favorite_store_1_name?: string | null;
  favorite_store_2_id?: string | null;
  favorite_store_2_name?: string | null;
  favorite_store_3_id?: string | null;
  favorite_store_3_name?: string | null;
  // データ利活用項目
  age_group?: string | null;
  gender?: string | null;
  prefecture?: string | null;
  city?: string | null;
  family_structure?: string | null;
  children_count?: string | null;
  children_age_groups?: string[] | null;
  occupation?: string | null;
  household_income?: string | null;
  shopping_frequency?: string | null;
  primary_shopping_time?: string | null;
  average_spending?: string | null;
  shopping_style?: string | null;
  data_consent?: boolean;
}

// プロフィールスキーマ - お気に入り店舗機能を削除
const profileSchema = z.object({
  username: z.string().min(2, { message: 'ニックネームは2文字以上で入力してください。' }).max(30, { message: 'ニックネームは30文字以内で入力してください。' }),
  // リンクフィールド
  link1: z.string().url('有効なURLを入力してください').optional().or(z.literal('')),
  link2: z.string().url('有効なURLを入力してください').optional().or(z.literal('')),
  link3: z.string().url('有効なURLを入力してください').optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function ProfileSetupContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showLoading, hideLoading } = useLoading();
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  // データ利活用項目の状態
  const [dataConsent, setDataConsent] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: '',
      // リンクのデフォルト値
      link1: '',
      link2: '',
      link3: '',
    },
    mode: 'onChange',
  });

  const { isValid } = form.formState;

  // 完成度計算（基本項目のみ）
  const calculateCompleteness = () => {
    const basicFields = [form.watch('username')].filter(field => field && field.trim() !== '').length;
    const totalFields = 1; // 基本1項目のみ
    return Math.round((basicFields / totalFields) * 100);
  };

  const completeness = calculateCompleteness();

  // データ同意チェックの状態を監視
  const canSubmit = isValid && dataConsent;

  useEffect(() => {
    if (status === "authenticated" && session?.supabaseAccessToken) {
      supabase.auth.setSession({
        access_token: session.supabaseAccessToken as string,
        refresh_token: (session.supabaseRefreshToken as string) || '',
      });
    }
  }, [session, status]);

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
    if (fileInput) fileInput.value = '';
  };

  // 画像アップロード処理（クライアントサイド）
  const uploadAvatarToStorage = async (file: File, userId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExt}`;
    const objectPath = `${userId}/${uniqueFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(objectPath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`アバター画像のアップロードに失敗しました: ${uploadError.message}`);
    }

    return objectPath;
  };

  const onSubmit = async (values: ProfileFormValues) => {
    // データ同意チェック
    if (!dataConsent) {
      setSubmitError("データ利用に同意していただく必要があります。");
      return;
    }

    if (!session?.user?.id) {
      setSubmitError("ユーザー認証情報が見つかりません。再度ログインしてください。");
      return;
    }

    setIsSaving(true);
    setSubmitError(null);
    showLoading();

    try {
      const userId = session.user.id;

      // アバター画像をアップロード（クライアントサイド）
      let uploadedAvatarPath: string | null = null;
      if (avatarFile) {
        uploadedAvatarPath = await uploadAvatarToStorage(avatarFile, userId);
      }

      // リンクを配列として保存
      const links = [values.link1, values.link2, values.link3].filter(link => link && link.trim() !== '');
      const urlData = links.length > 0 ? JSON.stringify(links) : null;

      // 🔥 Server Actionを使用してプロフィールを保存
      const { success, error } = await createProfileSetup({
        userId,
        displayName: values.username,
        avatarPath: uploadedAvatarPath,
        urlData,
        dataConsent,
      });

      if (!success) {
        throw new Error(error || 'プロフィールの保存に失敗しました');
      }

      router.push('/profile/setup/complete');

    } catch (error: any) {
      setSubmitError(error.message || "プロフィールの保存処理中にエラーが発生しました。");
    } finally {
      setIsSaving(false);
      hideLoading();
    }
  };

  if (submitError && (!session || !session.user?.id)) {
    return (
      <div className="container mx-auto max-w-lg p-4 md:p-8 text-center">
        <h1 className="text-3xl font-bold text-center mb-6 text-destructive">エラー</h1>
        <p className="text-destructive bg-destructive/10 p-4 rounded-md">{submitError}</p>
        <Button onClick={() => router.push('/login')} className="mt-4">ログインページへ戻る</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* 完成度表示 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-white rounded-lg border border-gray-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">プロフィール完成度</span>
              <Badge variant={completeness >= 80 ? "default" : "secondary"}>
                {completeness}%
              </Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${completeness}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>

          {/* データ利用について */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`p-4 border rounded-lg ${
              dataConsent 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-start space-x-3">
              <Info className={`h-5 w-5 mt-0.5 ${
                dataConsent ? 'text-green-600' : 'text-red-600'
              }`} />
              <div className="flex-1">
                <h3 className={`font-medium mb-1 ${
                  dataConsent ? 'text-green-900' : 'text-red-900'
                }`}>
                  データ利用について {!dataConsent && '（必須）'}
                </h3>
                <p className={`text-sm mb-3 ${
                  dataConsent ? 'text-green-800' : 'text-red-800'
                }`}>
                  入力いただいた情報は、個人を特定しない統計データとして、
                  より良いサービス提供と地域の店舗様への情報提供に活用させていただきます。
                </p>
                {!dataConsent && (
                  <p className="text-sm text-red-700 font-medium mb-3">
                    ⚠️ プロフィールの作成にはデータ利用への同意が必要です
                  </p>
                )}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="data-consent"
                    checked={dataConsent}
                    onCheckedChange={(checked) => setDataConsent(checked === true)}
                  />
                  <Label htmlFor="data-consent" className={`text-sm ${
                    dataConsent ? 'text-green-800' : 'text-red-800'
                  }`}>
                    データ利用に同意する
                  </Label>
                </div>
              </div>
            </div>
          </motion.div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 基本プロフィール */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
                    基本プロフィール
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* アバター画像 */}
                  <FormItem>
                    <FormLabel className="text-lg flex items-center font-semibold">
                      <ImageIcon className="mr-2 h-5 w-5" /> プロフィール画像
                    </FormLabel>
                    <FormControl>
                      <div className="flex flex-col items-center space-y-3 p-6 border-2 border-dashed rounded-lg">
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
                  </FormItem>

                  {/* ニックネーム */}
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg flex items-center font-semibold">
                          <UserIcon className="mr-2 h-5 w-5" />ニックネーム
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="例: ショッピング好き" 
                            {...field} 
                            disabled={isSaving}
                            className="text-base py-6"
                            style={{ fontSize: '16px' }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* リンク設定 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <LinkIcon className="h-5 w-5 mr-2 text-blue-600" />
                    リンク設定
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    あなたのウェブサイトやSNSなどのリンクを最大3つまで登録できます。
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {['link1', 'link2', 'link3'].map((fieldName, index) => (
                    <FormField
                      key={fieldName}
                      control={form.control}
                      name={fieldName as "link1" | "link2" | "link3"}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium flex items-center space-x-2">
                            <span>リンク {index + 1}</span>
                            {field.value && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                登録済み
                              </Badge>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="例: https://your-website.com"
                              {...field}
                              disabled={isSaving}
                              className="text-base py-6"
                              style={{ fontSize: '16px' }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </CardContent>
              </Card>

              {submitError && (
                <p className="text-base font-medium text-destructive bg-destructive/10 p-3 rounded-md">{submitError}</p>
              )}

              <Button 
                type="submit" 
                className={`w-full h-12 font-medium ${
                  canSubmit 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={isSaving || !canSubmit}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Check className="h-5 w-5 mr-2" />
                )}
                {!dataConsent ? 'データ利用に同意してください' : 'プロフィールを作成する'}
              </Button>
            </form>
          </Form>
        </div>
    </div>
  );
}

export default function ProfileSetupPage() {
  return <ProfileSetupContent />;
}