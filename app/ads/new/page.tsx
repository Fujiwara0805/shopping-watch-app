// app/ads/new/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';

export default function NewAdPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [priority, setPriority] = useState(0);
  const [adType, setAdType] = useState<'standard' | 'google_ads' | 'affiliate'>('standard');
  const [googleAdsId, setGoogleAdsId] = useState('');
  const [affiliateUrl, setAffiliateUrl] = useState('');
  const [affiliateId, setAffiliateId] = useState('');
  const [a8HtmlCode, setA8HtmlCode] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [useImageUrl, setUseImageUrl] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  // 画像ファイルのアップロード処理
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（5MB以下）
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "⚠️ ファイルサイズが大きすぎます",
        description: "画像は5MB以下にしてください。",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    // ファイル形式チェック（新規投稿画面と同様）
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "⚠️ サポートされていないファイル形式です",
        description: "JPG、PNG、またはWEBP形式の画像を選択してください。",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 画像の削除
  const removeImage = () => {
    setImageFile(null);
    if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(null);
    setImageUrl('');
    setUseImageUrl(false);
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  // A8.netのHTMLコードからリンクURLと画像URLを抽出
  const parseA8HtmlCode = (html: string) => {
    try {
      // リンクURLを抽出（<a href="...">）
      const linkMatch = html.match(/<a[^>]+href=["']([^"']+)["']/i);
      if (linkMatch && linkMatch[1]) {
        setAffiliateUrl(linkMatch[1]);
      }

      // 画像URLを抽出（<img src="...">）
      const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1]) {
        setImageUrl(imgMatch[1]);
        setUseImageUrl(true);
        setImagePreviewUrl(imgMatch[1]);
      }

      // 素材IDを抽出（mid=s00000006576010018000 のような形式から）
      const midMatch = html.match(/mid=([^&"'\s]+)/i);
      if (midMatch && midMatch[1]) {
        // 最後の数字部分をIDとして使用
        const idMatch = midMatch[1].match(/(\d+)$/);
        if (idMatch) {
          setAffiliateId(idMatch[1]);
        }
      }

      toast({
        title: "✅ HTMLコードを解析しました",
        description: "リンクURLと画像URLを自動的に設定しました。",
      });
    } catch (error) {
      console.error('HTML解析エラー:', error);
      toast({
        title: "⚠️ 解析に失敗しました",
        description: "HTMLコードの形式を確認してください。",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user?.id) {
      toast({
        title: "エラー",
        description: "ログインが必要です。",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    let finalImageUrl: string | null = null;

    try {
      // 画像URLを直接使用する場合（A8.netのバナー画像URLなど）
      if (useImageUrl && imageUrl) {
        finalImageUrl = imageUrl;
      } 
      // 画像ファイルをアップロードする場合
      else if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const userFolder = session.user.id;
        const uniqueFileName = `${uuidv4()}.${fileExt}`;
        const objectPath = `${userFolder}/ads/${uniqueFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(objectPath, imageFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`画像のアップロードに失敗しました: ${uploadError.message}`);
        }

        // 公開URLを取得
        const { data: urlData } = supabase.storage
          .from('images')
          .getPublicUrl(objectPath);

        finalImageUrl = urlData.publicUrl;
      }

      const adData: any = {
        title,
        description: description || null,
        image_url: finalImageUrl || null,
        link_url: linkUrl || null,
        placement: 'events_list',
        priority: priority || 0,
        is_active: isActive,
        views_count: 0,
        clicks_count: 0,
      };

      // 広告タイプに応じたフィールドを追加（データベースに存在する場合のみ）
      if (adType === 'google_ads' && googleAdsId) {
        adData.google_ads_id = googleAdsId;
      }
      if (adType === 'affiliate') {
        if (affiliateUrl) adData.affiliate_url = affiliateUrl;
        if (affiliateId) adData.affiliate_id = affiliateId;
      }

      // 日付フィールド
      if (startDate) adData.start_date = startDate;
      if (endDate) adData.end_date = endDate;

      // サーバーサイドAPIエンドポイントを使用して広告を登録
      const response = await fetch('/api/ads/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adData),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('広告登録エラー:', result);
        toast({
          title: "登録に失敗しました",
          description: result.error || 'エラーが発生しました',
          variant: "destructive",
        });
      } else {
        toast({
          title: "✅ 広告を登録しました",
          description: "広告が正常に登録されました。",
        });
        // フォームをリセット
        setTitle('');
        setDescription('');
        setImageFile(null);
        if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(imagePreviewUrl);
        }
        setImagePreviewUrl(null);
        setImageUrl('');
        setUseImageUrl(false);
        setLinkUrl('');
        setPriority(0);
        setAdType('standard');
        setGoogleAdsId('');
        setAffiliateUrl('');
        setAffiliateId('');
        setA8HtmlCode('');
        setStartDate('');
        setEndDate('');
        setIsActive(true);
        const fileInput = document.getElementById('image-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    } catch (error: any) {
      console.error('広告登録エラー:', error);
      toast({
        title: "エラー",
        description: error.message || '広告の登録に失敗しました',
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="max-w-2xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-2xl shadow-lg p-6">
            <div>
              <Label className="text-sm font-semibold text-gray-700">タイトル *</Label>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                required 
                className="mt-1"
              />
            </div>
            
            <div>
              <Label className="text-sm font-semibold text-gray-700">説明</Label>
              <Textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div>
              <Label className="text-sm font-semibold text-gray-700">画像</Label>
              <div className="mt-1 space-y-3">
                {/* 画像プレビュー */}
                {imagePreviewUrl && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-gray-200"
                  >
                    <Image
                      src={imagePreviewUrl}
                      alt="プレビュー"
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}

                {/* 画像入力方法の選択（アフィリエイト広告の場合のみ表示） */}
                {adType === 'affiliate' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="image-upload-option"
                        name="image-option"
                        checked={!useImageUrl}
                        onChange={() => {
                          setUseImageUrl(false);
                          setImageUrl('');
                          if (imagePreviewUrl && !imagePreviewUrl.startsWith('blob:')) {
                            setImagePreviewUrl(null);
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="image-upload-option" className="text-sm">
                        画像をアップロード
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="image-url-option"
                        name="image-option"
                        checked={useImageUrl}
                        onChange={() => {
                          setUseImageUrl(true);
                          setImageFile(null);
                          if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
                            URL.revokeObjectURL(imagePreviewUrl);
                            setImagePreviewUrl(null);
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="image-url-option" className="text-sm">
                        A8.netのバナー画像URLを使用
                      </Label>
                    </div>
                  </div>
                )}

                {/* 画像URL入力（アフィリエイト広告でURL使用を選択した場合） */}
                {adType === 'affiliate' && useImageUrl && (
                  <div>
                    <Input
                      value={imageUrl}
                      onChange={(e) => {
                        setImageUrl(e.target.value);
                        if (e.target.value) {
                          setImagePreviewUrl(e.target.value);
                        } else {
                          setImagePreviewUrl(null);
                        }
                      }}
                      placeholder="https://www22.a8.net/svt/bgt?aid=..."
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      A8.netのバナー画像URLを入力してください
                    </p>
                  </div>
                )}

                {/* ファイルアップロード（URL使用でない場合） */}
                {!useImageUrl && (
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="image-upload"
                      className="flex items-center gap-2 px-4 py-2 bg-[#fa8238] hover:bg-[#e26822] text-white rounded-lg cursor-pointer transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      {imageFile ? '画像を変更' : '画像をアップロード'}
                    </Label>
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                )}
                {!useImageUrl && (
                  <p className="text-xs text-gray-500">
                    画像ファイル（JPG、PNG、WEBP）をアップロードしてください。最大5MB
                  </p>
                )}
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-semibold text-gray-700">リンクURL</Label>
              <Input 
                value={linkUrl} 
                onChange={(e) => setLinkUrl(e.target.value)} 
                className="mt-1"
                placeholder="https://example.com"
              />
            </div>
            
            <div>
              <Label className="text-sm font-semibold text-gray-700">広告タイプ *</Label>
              <Select value={adType} onValueChange={(value: 'standard' | 'google_ads' | 'affiliate') => setAdType(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">標準広告</SelectItem>
                  <SelectItem value="google_ads">Google Ads</SelectItem>
                  <SelectItem value="affiliate">アフィリエイト広告</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {adType === 'google_ads' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Label className="text-sm font-semibold text-gray-700">Google Ads ID</Label>
                <Input 
                  value={googleAdsId} 
                  onChange={(e) => setGoogleAdsId(e.target.value)} 
                  className="mt-1"
                  placeholder="ca-pub-xxxxxxxxxxxxxxxx"
                />
              </motion.div>
            )}

            {adType === 'affiliate' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <div>
                  <Label className="text-sm font-semibold text-gray-700">
                    A8.net HTMLコード（オプション）
                  </Label>
                  <Textarea
                    value={a8HtmlCode}
                    onChange={(e) => setA8HtmlCode(e.target.value)}
                    className="mt-1 font-mono text-xs"
                    placeholder='<a href="https://px.a8.net/svt/ejp?a8mat=..."><img src="https://www22.a8.net/svt/bgt?aid=..." /></a>'
                    rows={4}
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => parseA8HtmlCode(a8HtmlCode)}
                      disabled={!a8HtmlCode.trim()}
                      className="text-xs"
                    >
                      HTMLコードを解析
                    </Button>
                    <p className="text-xs text-gray-500">
                      A8.netのHTMLコードを貼り付けると、自動的にリンクURLと画像URLを設定します
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">
                    A8.netアフィリエイトURL *
                  </Label>
                  <Input 
                    value={affiliateUrl} 
                    onChange={(e) => setAffiliateUrl(e.target.value)} 
                    className="mt-1"
                    placeholder="https://px.a8.net/svt/ejp?a8mat=45IF57+4A7AGI+1EQO+1NN7DT"
                    required={adType === 'affiliate'}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    A8.netの広告リンク生成画面で取得したURLを入力してください
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">アフィリエイトID（管理用）</Label>
                  <Input 
                    value={affiliateId} 
                    onChange={(e) => setAffiliateId(e.target.value)} 
                    className="mt-1"
                    placeholder="018（素材IDなど）"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    管理用のID（素材IDなど）を入力してください（任意）
                  </p>
                </div>
              </motion.div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700">開始日</Label>
                <Input 
                  type="date"
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">終了日</Label>
                <Input 
                  type="date"
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-semibold text-gray-700">優先度</Label>
              <Input
                type="number"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="mt-1"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">数値が大きいほど優先的に表示されます</p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="isActive" className="text-sm font-semibold text-gray-700">
                アクティブ（表示する）
              </Label>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-[#fa8238] hover:bg-[#e26822] text-white"
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}