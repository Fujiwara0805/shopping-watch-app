"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, User as UserIcon, Info, Image as ImageIcon, X, Upload, Store, Save, Trash2, Building2, Link as LinkIcon, FileText, Phone, Tag, Plus, CheckCircle, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import FavoriteStoreInput from '@/components/profile/FavoriteStoreInput';
import { useLoading } from '@/contexts/loading-context';
import { useToast } from '@/hooks/use-toast';

// bioフィールドを削除、企業設定フィールドを追加
const profileSchema = z.object({
  username: z.string().min(2, { message: 'ニックネームは2文字以上で入力してください。' }).max(30, { message: 'ニックネームは30文字以内で入力してください。' }),
  favoriteStore1: z.object({ id: z.string().optional(), name: z.string().optional() }).nullable().optional(),
  favoriteStore2: z.object({ id: z.string().optional(), name: z.string().optional() }).nullable().optional(),
  favoriteStore3: z.object({ id: z.string().optional(), name: z.string().optional() }).nullable().optional(),
  // リンクフィールド
  link1: z.string().url('有効なURLを入力してください').optional().or(z.literal('')),
  link2: z.string().url('有効なURLを入力してください').optional().or(z.literal('')),
  link3: z.string().url('有効なURLを入力してください').optional().or(z.literal('')),
  // 企業設定フィールド
  businessUrl: z.string().url('有効なURLを入力してください').optional().or(z.literal('')),
  businessStoreId: z.string().optional(),
  businessStoreName: z.string().optional(),
  // 企業用追加設定フィールド
  businessDefaultContent: z.string().max(240, { message: '240文字以内で入力してください' }).optional(),
  businessDefaultPhone: z.string().max(15, { message: '15文字以内で入力してください' }).optional(),
  businessDefaultCoupon: z.string().max(50, { message: '50文字以内で入力してください' }).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileEditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showLoading, hideLoading } = useLoading();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [currentAvatarPath, setCurrentAvatarPath] = useState<string | null>(null); // 追加：現在のアバターのパス
  const [isAvatarMarkedForDeletion, setIsAvatarMarkedForDeletion] = useState(false); // 追加：削除フラグ

  // データ利活用項目の状態
  const [dataConsent, setDataConsent] = useState(false);
  
  // 企業設定の状態管理
  const [userRole, setUserRole] = useState<string | null>(null);

  // 企業用デフォルト画像の状態管理
  const [businessDefaultImageFile, setBusinessDefaultImageFile] = useState<File | null>(null);
  const [businessDefaultImagePreviewUrl, setBusinessDefaultImagePreviewUrl] = useState<string | null>(null);
  const [currentBusinessDefaultImageUrl, setCurrentBusinessDefaultImageUrl] = useState<string | null>(null);
  const [currentBusinessDefaultImagePath, setCurrentBusinessDefaultImagePath] = useState<string | null>(null);
  const [isBusinessDefaultImageMarkedForDeletion, setIsBusinessDefaultImageMarkedForDeletion] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: '',
      favoriteStore1: null,
      favoriteStore2: null,
      favoriteStore3: null,
      // リンクのデフォルト値
      link1: '',
      link2: '',
      link3: '',
      // 企業設定のデフォルト値
      businessUrl: '',
      businessStoreId: '',
      businessStoreName: '',
      // 企業用追加設定のデフォルト値
      businessDefaultContent: '',
      businessDefaultPhone: '',
      businessDefaultCoupon: '',
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

  // プロフィール情報の読み込み（bioを除外）
  useEffect(() => {
    const loadProfile = async () => {
      if (status === "authenticated" && session?.user?.id) {
        try {
          // ユーザーの役割を取得
          const { data: userData, error: userError } = await supabase
            .from('app_users')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (!userError && userData) {
            setUserRole(userData.role);
          }

          const { data: profile, error } = await supabase
            .from('app_profiles')
            .select('*, business_default_content, business_default_phone, business_default_image_path, business_default_coupon')
            .eq('user_id', session.user.id)
            .single();

          if (error) {
            console.error('プロフィール読み込みエラー:', error);
            return;
          }

          if (profile) {
            // 基本情報（bioを除外）
            form.setValue('username', profile.display_name || '');
            
            // お気に入り店舗
            if (profile.favorite_store_1_id && profile.favorite_store_1_name) {
              form.setValue('favoriteStore1', {
                id: profile.favorite_store_1_id,
                name: profile.favorite_store_1_name
              });
            }
            if (profile.favorite_store_2_id && profile.favorite_store_2_name) {
              form.setValue('favoriteStore2', {
                id: profile.favorite_store_2_id,
                name: profile.favorite_store_2_name
              });
            }
            if (profile.favorite_store_3_id && profile.favorite_store_3_name) {
              form.setValue('favoriteStore3', {
                id: profile.favorite_store_3_id,
                name: profile.favorite_store_3_name
              });
            }

            // リンクを読み込む
            if (profile.url) {
              try {
                const urls = typeof profile.url === 'string' ? JSON.parse(profile.url) : profile.url;
                if (Array.isArray(urls)) {
                  form.setValue('link1', urls[0] || '');
                  form.setValue('link2', urls[1] || '');
                  form.setValue('link3', urls[2] || '');
                }
              } catch (e) {
                console.error('URLのパースに失敗:', e);
              }
            }

            // 企業設定（businessユーザーのみ）
            if (userData?.role === 'business') {
              form.setValue('businessUrl', profile.business_url || '');
              form.setValue('businessStoreId', profile.business_store_id || '');
              form.setValue('businessStoreName', profile.business_store_name || '');
              // 企業用追加設定
              form.setValue('businessDefaultContent', profile.business_default_content || '');
              form.setValue('businessDefaultPhone', profile.business_default_phone || '');
              form.setValue('businessDefaultCoupon', profile.business_default_coupon || '');
              
              // 企業用デフォルト画像
              if (profile.business_default_image_path) {
                setCurrentBusinessDefaultImagePath(profile.business_default_image_path);
                const { data: { publicUrl } } = supabase.storage
                  .from('images')
                  .getPublicUrl(profile.business_default_image_path);
                setCurrentBusinessDefaultImageUrl(publicUrl);
              }
            }

            // アバター
            if (profile.avatar_url) {
              setCurrentAvatarPath(profile.avatar_url); // 追加：パスを保存
              const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(profile.avatar_url);
              setCurrentAvatarUrl(publicUrl);
            }

            // データ同意
            setDataConsent(profile.data_consent || false);
          }
        } catch (error) {
          console.error('プロフィール読み込みエラー:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadProfile();
  }, [session, status, form]);

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
      setIsAvatarMarkedForDeletion(false); // 新しい画像を選択したら削除フラグをリセット
    }
  };

  // 企業用デフォルト画像のアップロード処理
  const handleBusinessDefaultImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setSubmitError("ファイルサイズは5MB以下にしてください。");
        setBusinessDefaultImageFile(null);
        setBusinessDefaultImagePreviewUrl(null);
        e.target.value = '';
        return;
      }
      setBusinessDefaultImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBusinessDefaultImagePreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      setSubmitError(null);
      setIsBusinessDefaultImageMarkedForDeletion(false);
    }
  };

  // 修正：アバター削除処理を改善
  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreviewUrl(null);
    const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    
    // 既存のアバターがある場合は削除マークを付ける
    if (currentAvatarUrl) {
      setIsAvatarMarkedForDeletion(true);
    }
  };

  // 企業用デフォルト画像の削除処理
  const removeBusinessDefaultImage = () => {
    setBusinessDefaultImageFile(null);
    setBusinessDefaultImagePreviewUrl(null);
    const fileInput = document.getElementById('business-default-image-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    
    // 既存の画像がある場合は削除マークを付ける
    if (currentBusinessDefaultImageUrl) {
      setIsBusinessDefaultImageMarkedForDeletion(true);
    }
  };

  // 追加：完全なアバター削除処理
  const deleteCurrentAvatar = async () => {
    if (!currentAvatarPath) return;

    try {
      // Supabaseストレージから削除
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([currentAvatarPath]);

      if (deleteError) {
        console.error('アバター削除エラー:', deleteError);
        // エラーがあっても処理を続行（ファイルが存在しない場合など）
      }

      // データベースのavatar_urlをnullに更新
      const { error: updateError } = await supabase
        .from('app_profiles')
        .update({ avatar_url: null, updated_at: new Date().toISOString() })
        .eq('user_id', session?.user?.id);

      if (updateError) {
        throw new Error(`アバターの削除に失敗しました: ${updateError.message}`);
      }

      // 状態をリセット
      setCurrentAvatarUrl(null);
      setCurrentAvatarPath(null);
      setIsAvatarMarkedForDeletion(false);
      setAvatarFile(null);
      setAvatarPreviewUrl(null);

      toast({
        title: "✅ アバターを削除しました",
        description: "プロフィール画像が削除されました",
        duration: 1000,
      });

    } catch (error: any) {
      console.error('アバター削除エラー:', error);
      toast({
        title: "❌ エラー",
        description: error.message || "アバターの削除に失敗しました",
        duration: 3000,
      });
    }
  };

  const onSubmit = async (values: ProfileFormValues) => {
    // データ同意チェック
    if (!dataConsent) {
      setSubmitError("データ利用に同意していただく必要があります。");
      return;
    }

    if (!session?.user?.id) {
      setSubmitError("ユーザー認証情報が見つかりません。");
      return;
    }

    setIsSaving(true);
    setSubmitError(null);
    showLoading();

    let uploadedAvatarPath: string | null = null;
    let shouldUpdateAvatar = false;
    let uploadedBusinessDefaultImagePath: string | null = null;
    let shouldUpdateBusinessDefaultImage = false;

    try {
      // アバター処理
      if (isAvatarMarkedForDeletion) {
        // 既存のアバターを削除
        if (currentAvatarPath) {
          const { error: deleteError } = await supabase.storage
            .from('avatars')
            .remove([currentAvatarPath]);
          
          if (deleteError) {
            console.error('既存アバター削除エラー:', deleteError);
            // エラーがあっても処理を続行
          }
        }
        uploadedAvatarPath = null;
        shouldUpdateAvatar = true;
      } else if (avatarFile) {
        // 新しいアバターをアップロード
        // 既存のアバターがある場合は先に削除
        if (currentAvatarPath) {
          const { error: deleteError } = await supabase.storage
            .from('avatars')
            .remove([currentAvatarPath]);
          
          if (deleteError) {
            console.error('既存アバター削除エラー:', deleteError);
            // エラーがあっても処理を続行
          }
        }

        const fileExt = avatarFile.name.split('.').pop();
        const userFolder = session.user.id;
        const uniqueFileName = `${uuidv4()}.${fileExt}`;
        const objectPath = `${userFolder}/${uniqueFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(objectPath, avatarFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`アバター画像のアップロードに失敗しました: ${uploadError.message}`);
        }
        uploadedAvatarPath = objectPath;
        shouldUpdateAvatar = true;
      }

      // 企業用デフォルト画像処理
      if (userRole === 'business') {
        if (isBusinessDefaultImageMarkedForDeletion) {
          // 既存の企業用デフォルト画像を削除
          if (currentBusinessDefaultImagePath) {
            const { error: deleteError } = await supabase.storage
              .from('images')
              .remove([currentBusinessDefaultImagePath]);
            
            if (deleteError) {
              console.error('既存企業デフォルト画像削除エラー:', deleteError);
            }
          }
          uploadedBusinessDefaultImagePath = null;
          shouldUpdateBusinessDefaultImage = true;
        } else if (businessDefaultImageFile) {
          // 新しい企業用デフォルト画像をアップロード
          if (currentBusinessDefaultImagePath) {
            const { error: deleteError } = await supabase.storage
              .from('images')
              .remove([currentBusinessDefaultImagePath]);
            
            if (deleteError) {
              console.error('既存企業デフォルト画像削除エラー:', deleteError);
            }
          }

          const fileExt = businessDefaultImageFile.name.split('.').pop();
          const userFolder = session.user.id;
          const uniqueFileName = `business_default_${uuidv4()}.${fileExt}`;
          const objectPath = `${userFolder}/${uniqueFileName}`;

          const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(objectPath, businessDefaultImageFile, {
              cacheControl: '3600',
              upsert: true,
            });

          if (uploadError) {
            throw new Error(`企業デフォルト画像のアップロードに失敗しました: ${uploadError.message}`);
          }
          uploadedBusinessDefaultImagePath = objectPath;
          shouldUpdateBusinessDefaultImage = true;
        }
      }

      // リンクを配列として保存
      const links = [values.link1, values.link2, values.link3].filter(link => link && link.trim() !== '');
      const urlData = links.length > 0 ? JSON.stringify(links) : null;

      // プロフィールデータの更新（任意項目を削除）
      const updateData = {
        display_name: values.username,
        updated_at: new Date().toISOString(),
        favorite_store_1_id: values.favoriteStore1?.id || null,
        favorite_store_1_name: values.favoriteStore1?.name || null,
        favorite_store_2_id: values.favoriteStore2?.id || null,
        favorite_store_2_name: values.favoriteStore2?.name || null,
        favorite_store_3_id: values.favoriteStore3?.id || null,
        favorite_store_3_name: values.favoriteStore3?.name || null,
        url: urlData,
        data_consent: dataConsent,
        // 企業設定（businessユーザーのみ）
        ...(userRole === 'business' && {
          business_url: values.businessUrl || null,
          business_store_id: values.businessStoreId || null,
          business_store_name: values.businessStoreName || null,
          // 企業用追加設定
          business_default_content: values.businessDefaultContent || null,
          business_default_phone: values.businessDefaultPhone || null,
          business_default_coupon: values.businessDefaultCoupon || null,
          ...(shouldUpdateBusinessDefaultImage && { business_default_image_path: uploadedBusinessDefaultImagePath }),
        }),
        ...(shouldUpdateAvatar && { avatar_url: uploadedAvatarPath }),
      };

      const { error: updateError } = await supabase
        .from('app_profiles')
        .update(updateData)
        .eq('user_id', session.user.id);

      if (updateError) {
        throw new Error(`プロフィールの更新に失敗しました: ${updateError.message}`);
      }

      toast({
        title: "✅ 更新完了",
        description: "プロフィールが正常に更新されました",
        duration: 1000,
      });

      router.push('/profile');

    } catch (error: any) {
      setSubmitError(error.message || "プロフィールの更新処理中にエラーが発生しました。");
    } finally {
      setIsSaving(false);
      hideLoading();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* ヘッダー */}
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
                  ⚠️ プロフィールの更新にはデータ利用への同意が必要です
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
                      {(avatarPreviewUrl || (currentAvatarUrl && !isAvatarMarkedForDeletion)) ? (
                        <div className="relative group">
                          <img 
                            src={avatarPreviewUrl || currentAvatarUrl || ''} 
                            alt="アバタープレビュー" 
                            className="w-24 h-24 rounded-full object-cover" 
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
                          <Upload className="h-12 w-12" />
                          <p className="text-lg">画像をアップロード</p>
                          <p className="text-sm">PNG, JPG, WEBP (最大5MB)</p>
                        </label>
                      )}
                      
                      {/* 完全削除ボタン */}
                      {currentAvatarUrl && !isAvatarMarkedForDeletion && !avatarPreviewUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={deleteCurrentAvatar}
                          disabled={isSaving}
                          className="flex items-center space-x-2 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>画像を削除</span>
                        </Button>
                      )}
                      
                      {/* 削除予定の表示 */}
                      {isAvatarMarkedForDeletion && (
                        <div className="text-center text-red-600 text-sm">
                          <p>画像は更新時に削除されます</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsAvatarMarkedForDeletion(false)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            削除をキャンセル
                          </Button>
                        </div>
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
                  リンク
                </CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  最大3つまでリンクを追加できます。
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* リンク1 */}
                <FormField
                  control={form.control}
                  name="link1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center space-x-2">
                        <span>リンク 1</span>
                        {field.value && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            登録済み
                          </Badge>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com"
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

                {/* リンク2 */}
                <FormField
                  control={form.control}
                  name="link2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center space-x-2">
                        <span>リンク 2</span>
                        {field.value && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            登録済み
                          </Badge>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com"
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

                {/* リンク3 */}
                <FormField
                  control={form.control}
                  name="link3"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center space-x-2">
                        <span>リンク 3</span>
                        {field.value && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            登録済み
                          </Badge>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com"
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

            {/* お気に入り店舗 - 企業アカウントでは非表示 */}
            {userRole !== 'business' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Store className="h-5 w-5 mr-2 text-green-600" />
                    お気に入り店舗
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    最大3店舗まで登録できます。
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 店舗1 - 常に表示 */}
                  <FormField
                    control={form.control}
                    name="favoriteStore1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium flex items-center space-x-2">
                          <span>お気に入り店舗 1</span>
                          {field.value?.id && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              登録済み
                            </Badge>
                          )}
                        </FormLabel>
                        <FormControl>
                          <FavoriteStoreInput
                            placeholder="店舗を検索して選択"
                            value={field.value === null ? undefined : field.value}
                            onChange={field.onChange}
                            disabled={isSaving}
                            style={{ fontSize: '16px' }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 店舗2 - 店舗1が登録されている場合のみ表示 */}
                  {form.watch('favoriteStore1')?.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3 }}
                    >
                      <FormField
                        control={form.control}
                        name="favoriteStore2"
                        render={({ field }) => (
                          <FormItem>
                            {field.value?.id ? (
                              // 登録済みの場合は削除のみ可能
                              <div className="space-y-2">
                                <FormLabel className="text-sm font-medium flex items-center space-x-2">
                                  <span>お気に入り店舗 2</span>
                                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    登録済み
                                  </Badge>
                                </FormLabel>
                                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {field.value.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      変更する場合は一度削除してから再度追加してください
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      field.onChange(null);
                                      // 3店舗目も削除
                                      form.setValue('favoriteStore3', null);
                                    }}
                                    className="ml-3 text-red-600 border-red-200 hover:bg-red-50"
                                    disabled={isSaving}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              // 未登録の場合は追加可能
                              <>
                                <FormLabel className="text-sm font-medium flex items-center space-x-2">
                                  <span>お気に入り店舗 2</span>
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                                    <Plus className="h-3 w-3 mr-1" />
                                    追加可能
                                  </Badge>
                                </FormLabel>
                                <FormControl>
                                  <FavoriteStoreInput
                                    placeholder="店舗を検索して選択"
                                    value={field.value === null ? undefined : field.value}
                                    onChange={field.onChange}
                                    disabled={isSaving}
                                    style={{ fontSize: '16px' }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </>
                            )}
                          </FormItem>
                        )}
                      />
                    </motion.div>
                  )}

                  {/* 店舗3 - 店舗1と店舗2が登録されている場合のみ表示 */}
                  {form.watch('favoriteStore1')?.id && form.watch('favoriteStore2')?.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3 }}
                    >
                      <FormField
                        control={form.control}
                        name="favoriteStore3"
                        render={({ field }) => (
                          <FormItem>
                            {field.value?.id ? (
                              // 登録済みの場合は削除のみ可能
                              <div className="space-y-2">
                                <FormLabel className="text-sm font-medium flex items-center space-x-2">
                                  <span>お気に入り店舗 3</span>
                                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    登録済み
                                  </Badge>
                                </FormLabel>
                                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {field.value.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      変更する場合は一度削除してから再度追加してください
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => field.onChange(null)}
                                    className="ml-3 text-red-600 border-red-200 hover:bg-red-50"
                                    disabled={isSaving}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              // 未登録の場合は追加可能
                              <>
                                <FormLabel className="text-sm font-medium flex items-center space-x-2">
                                  <span>お気に入り店舗 3</span>
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                                    <Plus className="h-3 w-3 mr-1" />
                                    追加可能
                                  </Badge>
                                </FormLabel>
                                <FormControl>
                                  <FavoriteStoreInput
                                    placeholder="店舗を検索して選択"
                                    value={field.value === null ? undefined : field.value}
                                    onChange={field.onChange}
                                    disabled={isSaving}
                                    style={{ fontSize: '16px' }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </>
                            )}
                          </FormItem>
                        )}
                      />
                    </motion.div>
                  )}

                  {/* 完了メッセージ */}
                  {form.watch('favoriteStore1')?.id && 
                   form.watch('favoriteStore2')?.id && 
                   form.watch('favoriteStore3')?.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="p-3 bg-green-50 border border-green-200 rounded-lg text-center"
                    >
                      <div className="flex items-center justify-center space-x-2 text-green-700">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">最大3店舗まで登録完了しました</span>
                      </div>
                    </motion.div>
                  )}

                  {/* 次に追加可能な店舗の案内 */}
                  {!form.watch('favoriteStore1')?.id && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2 text-blue-700">
                        <Plus className="h-4 w-4" />
                        <span className="text-sm font-medium">最初の店舗を追加してください</span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        お気に入りの店舗を登録すると、その店舗の情報を優先的に受け取れます
                      </p>
                    </div>
                  )}

                  {form.watch('favoriteStore1')?.id && !form.watch('favoriteStore2')?.id && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2 text-blue-700">
                        <Plus className="h-4 w-4" />
                        <span className="text-sm font-medium">2店舗目を追加できます</span>
                      </div>

                    </div>
                  )}

                  {form.watch('favoriteStore1')?.id && 
                   form.watch('favoriteStore2')?.id && 
                   !form.watch('favoriteStore3')?.id && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2 text-blue-700">
                        <Plus className="h-4 w-4" />
                        <span className="text-sm font-medium">3店舗目（最後）を追加できます</span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        最大3店舗まで登録可能です
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 企業設定（businessユーザーのみ表示） */}
            {userRole === 'business' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                    企業アカウント設定
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    ここで設定した情報は、投稿時に自動的に入力されます。
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 企業URL */}
                  <FormField
                    control={form.control}
                    name="businessUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center space-x-2">
                          <LinkIcon className="h-4 w-4" />
                          <span>企業URL</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="https://example.com"
                            {...field}
                            disabled={isSaving}
                            style={{ fontSize: '16px' }}
                            autoComplete="url"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 店舗 */}
                  <FormField
                    control={form.control}
                    name="businessStoreId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4" />
                          <span>店舗</span>
                        </FormLabel>
                        <FormControl>
                          <FavoriteStoreInput
                            value={{ 
                              id: field.value || '', 
                              name: form.getValues("businessStoreName") || '' 
                            }}
                            onChange={(store) => {
                              if (store) {
                                form.setValue("businessStoreId", store.id);
                                form.setValue("businessStoreName", store.name);
                              } else {
                                form.setValue("businessStoreId", "");
                                form.setValue("businessStoreName", "");
                              }
                            }}
                            placeholder="店舗を選択してください"
                            disabled={isSaving}
                            style={{ fontSize: '16px' }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 投稿内容 */}
                  <FormField
                    control={form.control}
                    name="businessDefaultContent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center space-x-2">
                          <FileText className="h-4 w-4" />
                          <span>投稿内容</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="企業の投稿で毎回使用する内容を入力してください（240文字以内）"
                            {...field}
                            disabled={isSaving}
                            style={{ fontSize: '16px' }}
                            rows={8}
                            maxLength={240}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 電話番号 */}
                  <FormField
                    control={form.control}
                    name="businessDefaultPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center space-x-2">
                          <Phone className="h-4 w-4" />
                          <span>電話番号</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="03-1234-5678"
                            {...field}
                            disabled={isSaving}
                            style={{ fontSize: '16px' }}
                            maxLength={15}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 画像 */}
                  <FormItem>
                    <FormLabel className="text-lg flex items-center font-semibold">
                      <ImageIcon className="mr-2 h-5 w-5" />
                      画像
                    </FormLabel>
                    <FormControl>
                      <div className="flex flex-col items-center space-y-3 p-6 border-2 border-dashed rounded-lg">
                        <Input
                          id="business-default-image-upload"
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          onChange={handleBusinessDefaultImageUpload}
                          className="hidden"
                          disabled={isSaving}
                        />
                        {(businessDefaultImagePreviewUrl || (currentBusinessDefaultImageUrl && !isBusinessDefaultImageMarkedForDeletion)) ? (
                          <div className="relative group">
                            <img 
                              src={businessDefaultImagePreviewUrl || currentBusinessDefaultImageUrl || ''} 
                              alt="企業デフォルト画像プレビュー" 
                              className="w-24 h-24 rounded-lg object-cover" 
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                              onClick={removeBusinessDefaultImage}
                              disabled={isSaving}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <label htmlFor="business-default-image-upload" className="flex flex-col items-center space-y-2 cursor-pointer text-muted-foreground">
                            <Upload className="h-12 w-12" />
                            <p className="text-lg">画像をアップロード</p>
                            <p className="text-sm">PNG, JPG, WEBP (最大5MB)</p>
                          </label>
                        )}
                        
                        {/* 削除予定の表示 */}
                        {isBusinessDefaultImageMarkedForDeletion && (
                          <div className="text-center text-red-600 text-sm">
                            <p>画像は更新時に削除されます</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsBusinessDefaultImageMarkedForDeletion(false)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              削除をキャンセル
                            </Button>
                          </div>
                        )}
                      </div>
                    </FormControl>
                  </FormItem>

                  {/* クーポン */}
                  <FormField
                    control={form.control}
                    name="businessDefaultCoupon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center space-x-2">
                          <Tag className="h-4 w-4" />
                          <span>クーポン</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="例: 会計から100円引き、ドリンク1杯無料"
                            {...field}
                            disabled={isSaving}
                            style={{ fontSize: '16px' }}
                            maxLength={50}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

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
                <Save className="h-5 w-5 mr-2" />
              )}
              {!dataConsent ? 'データ利用に同意してください' : 'プロフィールを更新'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
