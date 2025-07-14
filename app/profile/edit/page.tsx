"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
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
import { Loader2, User as UserIcon, Info, Image as ImageIcon, X, Upload, Store, Baby, MapPin, Briefcase, ShoppingCart, Check, Save } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import FavoriteStoreInput from '@/components/profile/FavoriteStoreInput';
import { useLoading } from '@/contexts/loading-context';
import { useToast } from '@/hooks/use-toast';

// bioフィールドを削除
const profileSchema = z.object({
  username: z.string().min(2, { message: 'ニックネームは2文字以上で入力してください。' }).max(30, { message: 'ニックネームは30文字以内で入力してください。' }),
  favoriteStore1: z.object({ id: z.string().optional(), name: z.string().optional() }).nullable().optional(),
  favoriteStore2: z.object({ id: z.string().optional(), name: z.string().optional() }).nullable().optional(),
  favoriteStore3: z.object({ id: z.string().optional(), name: z.string().optional() }).nullable().optional(),
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

  // データ利活用項目の状態
  const [ageGroup, setAgeGroup] = useState('');
  const [gender, setGender] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [city, setCity] = useState('');
  const [familyStructure, setFamilyStructure] = useState('');
  const [childrenCount, setChildrenCount] = useState('');
  const [childrenAgeGroups, setChildrenAgeGroups] = useState<string[]>([]);
  const [occupation, setOccupation] = useState('');
  const [householdIncome, setHouseholdIncome] = useState('');
  const [shoppingFrequency, setShoppingFrequency] = useState('');
  const [primaryShoppingTime, setPrimaryShoppingTime] = useState('');
  const [averageSpending, setAverageSpending] = useState('');
  const [shoppingStyle, setShoppingStyle] = useState('');
  const [dataConsent, setDataConsent] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: '',
      favoriteStore1: null,
      favoriteStore2: null,
      favoriteStore3: null,
    },
    mode: 'onChange',
  });

  const { isValid } = form.formState;

  // 完成度計算（bioを除外）
  const calculateCompleteness = () => {
    const basicFields = [form.watch('username')].filter(field => field && field.trim() !== '').length;
    const dataFields = [
      ageGroup, gender, prefecture, city, familyStructure, occupation,
      shoppingFrequency, primaryShoppingTime, averageSpending, shoppingStyle
    ].filter(field => field !== '').length;
    
    const totalFields = 11; // 基本1項目 + データ利活用10項目
    const filledFields = basicFields + dataFields;
    return Math.round((filledFields / totalFields) * 100);
  };

  const completeness = calculateCompleteness();

  // データ同意チェックの状態を監視
  const canSubmit = isValid && dataConsent;

  // プロフィール情報の読み込み（bioを除外）
  useEffect(() => {
    const loadProfile = async () => {
      if (status === "authenticated" && session?.user?.id) {
        try {
          const { data: profile, error } = await supabase
            .from('app_profiles')
            .select('*')
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

            // アバター
            if (profile.avatar_url) {
              const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(profile.avatar_url);
              setCurrentAvatarUrl(publicUrl);
            }

            // データ利活用項目
            setAgeGroup(profile.age_group || '');
            setGender(profile.gender || '');
            setPrefecture(profile.prefecture || '');
            setCity(profile.city || '');
            setFamilyStructure(profile.family_structure || '');
            setChildrenCount(profile.children_count || '');
            setChildrenAgeGroups(profile.children_age_groups || []);
            setOccupation(profile.occupation || '');
            setHouseholdIncome(profile.household_income || '');
            setShoppingFrequency(profile.shopping_frequency || '');
            setPrimaryShoppingTime(profile.primary_shopping_time || '');
            setAverageSpending(profile.average_spending || '');
            setShoppingStyle(profile.shopping_style || '');
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
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreviewUrl(null);
    const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
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

    try {
      // アバターのアップロード
      if (avatarFile) {
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
      }

      // プロフィールデータの更新（bioを除外）
      const updateData = {
        display_name: values.username,
        updated_at: new Date().toISOString(),
        favorite_store_1_id: values.favoriteStore1?.id || null,
        favorite_store_1_name: values.favoriteStore1?.name || null,
        favorite_store_2_id: values.favoriteStore2?.id || null,
        favorite_store_2_name: values.favoriteStore2?.name || null,
        favorite_store_3_id: values.favoriteStore3?.id || null,
        favorite_store_3_name: values.favoriteStore3?.name || null,
        // データ利活用項目
        age_group: ageGroup || null,
        gender: gender || null,
        prefecture: prefecture || null,
        city: city || null,
        family_structure: familyStructure || null,
        children_count: childrenCount || null,
        children_age_groups: childrenAgeGroups.length > 0 ? childrenAgeGroups : null,
        occupation: occupation || null,
        household_income: householdIncome || null,
        shopping_frequency: shoppingFrequency || null,
        primary_shopping_time: primaryShoppingTime || null,
        average_spending: averageSpending || null,
        shopping_style: shoppingStyle || null,
        data_consent: dataConsent,
        ...(uploadedAvatarPath && { avatar_url: uploadedAvatarPath }),
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
                      {avatarPreviewUrl || currentAvatarUrl ? (
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

                {/* 自己紹介セクションを削除 */}
              </CardContent>
            </Card>

            {/* お気に入り店舗 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Store className="h-5 w-5 mr-2 text-green-600" />
                  お気に入り店舗
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="favoriteStore1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">お気に入り店舗 1</FormLabel>
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

                <FormField
                  control={form.control}
                  name="favoriteStore2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">お気に入り店舗 2</FormLabel>
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

                <FormField
                  control={form.control}
                  name="favoriteStore3"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">お気に入り店舗 3</FormLabel>
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
              </CardContent>
            </Card>

            {/* 基本情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
                  基本情報（任意）
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 年齢層 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">年齢層</Label>
                  <Select value={ageGroup} onValueChange={setAgeGroup}>
                    <SelectTrigger>
                      <SelectValue placeholder="年齢層を選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10代">10代</SelectItem>
                      <SelectItem value="20代">20代</SelectItem>
                      <SelectItem value="30代">30代</SelectItem>
                      <SelectItem value="40代">40代</SelectItem>
                      <SelectItem value="50代">50代</SelectItem>
                      <SelectItem value="60代">60代</SelectItem>
                      <SelectItem value="70代">70代</SelectItem>
                      <SelectItem value="80代以上">80代以上</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 性別 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">性別</Label>
                  <RadioGroup value={gender} onValueChange={setGender}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="男性" id="male" />
                      <Label htmlFor="male" className="text-sm">男性</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="女性" id="female" />
                      <Label htmlFor="female" className="text-sm">女性</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="その他" id="other" />
                      <Label htmlFor="other" className="text-sm">その他</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="回答しない" id="no_answer" />
                      <Label htmlFor="no_answer" className="text-sm">回答しない</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* 居住地域 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">居住地域</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={prefecture} onValueChange={setPrefecture}>
                      <SelectTrigger>
                        <SelectValue placeholder="都道府県" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="北海道">北海道</SelectItem>
                        <SelectItem value="青森県">青森県</SelectItem>
                        <SelectItem value="岩手県">岩手県</SelectItem>
                        <SelectItem value="宮城県">宮城県</SelectItem>
                        <SelectItem value="秋田県">秋田県</SelectItem>
                        <SelectItem value="山形県">山形県</SelectItem>
                        <SelectItem value="福島県">福島県</SelectItem>
                        <SelectItem value="茨城県">茨城県</SelectItem>
                        <SelectItem value="栃木県">栃木県</SelectItem>
                        <SelectItem value="群馬県">群馬県</SelectItem>
                        <SelectItem value="埼玉県">埼玉県</SelectItem>
                        <SelectItem value="千葉県">千葉県</SelectItem>
                        <SelectItem value="東京都">東京都</SelectItem>
                        <SelectItem value="神奈川県">神奈川県</SelectItem>
                        <SelectItem value="新潟県">新潟県</SelectItem>
                        <SelectItem value="富山県">富山県</SelectItem>
                        <SelectItem value="石川県">石川県</SelectItem>
                        <SelectItem value="福井県">福井県</SelectItem>
                        <SelectItem value="山梨県">山梨県</SelectItem>
                        <SelectItem value="長野県">長野県</SelectItem>
                        <SelectItem value="岐阜県">岐阜県</SelectItem>
                        <SelectItem value="静岡県">静岡県</SelectItem>
                        <SelectItem value="愛知県">愛知県</SelectItem>
                        <SelectItem value="三重県">三重県</SelectItem>
                        <SelectItem value="滋賀県">滋賀県</SelectItem>
                        <SelectItem value="京都府">京都府</SelectItem>
                        <SelectItem value="大阪府">大阪府</SelectItem>
                        <SelectItem value="兵庫県">兵庫県</SelectItem>
                        <SelectItem value="奈良県">奈良県</SelectItem>
                        <SelectItem value="和歌山県">和歌山県</SelectItem>
                        <SelectItem value="鳥取県">鳥取県</SelectItem>
                        <SelectItem value="島根県">島根県</SelectItem>
                        <SelectItem value="岡山県">岡山県</SelectItem>
                        <SelectItem value="広島県">広島県</SelectItem>
                        <SelectItem value="山口県">山口県</SelectItem>
                        <SelectItem value="徳島県">徳島県</SelectItem>
                        <SelectItem value="香川県">香川県</SelectItem>
                        <SelectItem value="愛媛県">愛媛県</SelectItem>
                        <SelectItem value="高知県">高知県</SelectItem>
                        <SelectItem value="福岡県">福岡県</SelectItem>
                        <SelectItem value="佐賀県">佐賀県</SelectItem>
                        <SelectItem value="長崎県">長崎県</SelectItem>
                        <SelectItem value="熊本県">熊本県</SelectItem>
                        <SelectItem value="大分県">大分県</SelectItem>
                        <SelectItem value="宮崎県">宮崎県</SelectItem>
                        <SelectItem value="鹿児島県">鹿児島県</SelectItem>
                        <SelectItem value="沖縄県">沖縄県</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="市区町村"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 家族構成 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Baby className="h-5 w-5 mr-2 text-green-600" />
                  家族構成（任意）
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={familyStructure} onValueChange={setFamilyStructure}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="単身" id="single" />
                    <Label htmlFor="single" className="text-sm">単身</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="夫婦のみ" id="couple" />
                    <Label htmlFor="couple" className="text-sm">夫婦のみ</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="子どもがいる家庭" id="family_with_children" />
                    <Label htmlFor="family_with_children" className="text-sm">子どもがいる家庭</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ひとり親世帯" id="single_parent" />
                    <Label htmlFor="single_parent" className="text-sm">ひとり親世帯</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="三世代同居" id="three_generation" />
                    <Label htmlFor="three_generation" className="text-sm">三世代同居</Label>
                  </div>
                </RadioGroup>

                {/* 子どもの詳細情報 */}
                {(familyStructure === '子どもがいる家庭' || familyStructure === 'ひとり親世帯' || familyStructure === '三世代同居') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <h4 className="font-medium text-green-900">お子さまについて</h4>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">お子さまの人数</Label>
                      <Select value={childrenCount} onValueChange={setChildrenCount}>
                        <SelectTrigger>
                          <SelectValue placeholder="人数を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1人">1人</SelectItem>
                          <SelectItem value="2人">2人</SelectItem>
                          <SelectItem value="3人">3人</SelectItem>
                          <SelectItem value="4人">4人</SelectItem>
                          <SelectItem value="5人以上">5人以上</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">お子さまの年齢層（複数選択可）</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: '乳児（0-1歳）', label: '乳児（0-1歳）' },
                          { value: '幼児（2-3歳）', label: '幼児（2-3歳）' },
                          { value: '未就学児（4-6歳）', label: '未就学児（4-6歳）' },
                          { value: '小学生（7-12歳）', label: '小学生（7-12歳）' },
                          { value: '中学生（13-15歳）', label: '中学生（13-15歳）' },
                          { value: '高校生（16-18歳）', label: '高校生（16-18歳）' },
                          { value: '成人（19歳以上）', label: '成人（19歳以上）' }
                        ].map((ageGroup) => (
                          <div key={ageGroup.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={ageGroup.value}
                              checked={childrenAgeGroups.includes(ageGroup.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setChildrenAgeGroups([...childrenAgeGroups, ageGroup.value]);
                                } else {
                                  setChildrenAgeGroups(childrenAgeGroups.filter(g => g !== ageGroup.value));
                                }
                              }}
                            />
                            <Label htmlFor={ageGroup.value} className="text-xs">
                              {ageGroup.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* 職業・収入 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Briefcase className="h-5 w-5 mr-2 text-purple-600" />
                  職業・収入（任意）
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 職業 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">職業</Label>
                  <Select value={occupation} onValueChange={setOccupation}>
                    <SelectTrigger>
                      <SelectValue placeholder="職業を選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="会社員（正社員）">会社員（正社員）</SelectItem>
                      <SelectItem value="契約社員・派遣社員">契約社員・派遣社員</SelectItem>
                      <SelectItem value="公務員">公務員</SelectItem>
                      <SelectItem value="自営業・フリーランス">自営業・フリーランス</SelectItem>
                      <SelectItem value="パート・アルバイト">パート・アルバイト</SelectItem>
                      <SelectItem value="学生">学生</SelectItem>
                      <SelectItem value="主婦・主夫">主婦・主夫</SelectItem>
                      <SelectItem value="退職・年金受給者">退職・年金受給者</SelectItem>
                      <SelectItem value="その他">その他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">世帯年収</Label>
                  <Select value={householdIncome} onValueChange={setHouseholdIncome}>
                    <SelectTrigger>
                      <SelectValue placeholder="世帯年収を選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300万円未満">300万円未満</SelectItem>
                      <SelectItem value="300万円～500万円未満">300万円～500万円未満</SelectItem>
                      <SelectItem value="500万円～700万円未満">500万円～700万円未満</SelectItem>
                      <SelectItem value="700万円～1000万円未満">700万円～1000万円未満</SelectItem>
                      <SelectItem value="1000万円～1500万円未満">1000万円～1500万円未満</SelectItem>
                      <SelectItem value="1500万円以上">1500万円以上</SelectItem>
                      <SelectItem value="回答しない">回答しない</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* 買い物行動 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <ShoppingCart className="h-5 w-5 mr-2 text-orange-600" />
                  買い物行動（任意）
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">買い物頻度</Label>
                  <Select value={shoppingFrequency} onValueChange={setShoppingFrequency}>
                    <SelectTrigger>
                      <SelectValue placeholder="頻度を選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="週1回未満">週1回未満</SelectItem>
                      <SelectItem value="週1-2回">週1-2回</SelectItem>
                      <SelectItem value="週3-4回">週3-4回</SelectItem>
                      <SelectItem value="ほぼ毎日">ほぼ毎日</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">主な買い物時間</Label>
                  <Select value={primaryShoppingTime} onValueChange={setPrimaryShoppingTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="時間帯を選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="朝（6-9時）">朝（6-9時）</SelectItem>
                      <SelectItem value="午前（9-12時）">午前（9-12時）</SelectItem>
                      <SelectItem value="午後（12-18時）">午後（12-18時）</SelectItem>
                      <SelectItem value="夜（18-22時）">夜（18-22時）</SelectItem>
                      <SelectItem value="深夜（22時以降）">深夜（22時以降）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">1回の平均買い物金額</Label>
                  <Select value={averageSpending} onValueChange={setAverageSpending}>
                    <SelectTrigger>
                      <SelectValue placeholder="金額を選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1,000円未満">1,000円未満</SelectItem>
                      <SelectItem value="1,000円～3,000円">1,000円～3,000円</SelectItem>
                      <SelectItem value="3,000円～5,000円">3,000円～5,000円</SelectItem>
                      <SelectItem value="5,000円～10,000円">5,000円～10,000円</SelectItem>
                      <SelectItem value="10,000円以上">10,000円以上</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">買い物スタイル</Label>
                  <Select value={shoppingStyle} onValueChange={setShoppingStyle}>
                    <SelectTrigger>
                      <SelectValue placeholder="スタイルを選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="計画的（リストを作成）">計画的（リストを作成）</SelectItem>
                      <SelectItem value="衝動的（その場で判断）">衝動的（その場で判断）</SelectItem>
                      <SelectItem value="セール重視">セール重視</SelectItem>
                      <SelectItem value="品質重視">品質重視</SelectItem>
                      <SelectItem value="利便性重視">利便性重視</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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