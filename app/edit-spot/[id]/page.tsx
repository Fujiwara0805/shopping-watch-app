"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Upload, X, MapPin, Loader2, Image as ImageIcon,
  Link as LinkIcon, CheckCircle, Navigation,
  Sparkles, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useSession } from "next-auth/react";
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/lib/hooks/use-toast';
import { useLoading } from '@/lib/contexts/loading-context';
import { useGoogleMapsApi } from '@/components/providers/GoogleMapsApiProvider';
import { getSpotById, updateSpot, type UpdateSpotInput } from '@/app/_actions/spots';
import { MarkerLocationModal } from '@/components/map/marker-location-modal';
import { Breadcrumb } from '@/components/seo/breadcrumb';
import { designTokens, TARGET_TAGS, TAG_ACTIVITIES } from '@/lib/constants';
import type { TargetTagId } from '@/lib/constants/target-tags';

const editSpotSchema = z.object({
  storeName: z.string().min(1, { message: 'タイトルは必須です' }).max(100, { message: '100文字以内で入力してください' }),
  description: z.string().min(5, { message: '説明は5文字以上入力してください' }).max(800, { message: '800文字以内で入力してください' }),
  url: z.string().url({ message: '有効なURLを入力してください' }).optional().or(z.literal('')),
});

type SpotFormValues = z.infer<typeof editSpotSchema>;

export default function EditSpotPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const { showLoading, hideLoading } = useLoading();
  const { isLoaded } = useGoogleMapsApi();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [storeId, setStoreId] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [prefecture, setPrefecture] = useState<string>('大分県');
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagActivities, setTagActivities] = useState<Record<string, string[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<SpotFormValues>({
    resolver: zodResolver(editSpotSchema),
    defaultValues: { storeName: '', description: '', url: '' },
  });

  // 認証チェック
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // スポットデータ読み込み
  useEffect(() => {
    async function loadSpot() {
      const { spot, error } = await getSpotById(params.id);
      if (error || !spot) {
        toast({ title: 'エラー', description: 'スポットが見つかりません', variant: 'destructive' });
        router.push('/map?view=spots');
        return;
      }

      form.reset({
        storeName: spot.store_name,
        description: spot.description,
        url: spot.url || '',
      });
      setExistingImages(spot.image_urls || []);
      setSelectedLocation({ lat: spot.store_latitude, lng: spot.store_longitude });
      setLocationName(spot.store_name);
      setStoreId(spot.store_id);
      setCity(spot.city);
      setPrefecture(spot.prefecture);

      if (spot.tag_activities) {
        const activities = typeof spot.tag_activities === 'string'
          ? JSON.parse(spot.tag_activities)
          : spot.tag_activities;
        setTagActivities(activities);
        setSelectedTags(Object.keys(activities));
      }

      setLoading(false);
    }
    if (status === 'authenticated') {
      loadSpot();
    }
  }, [params.id, status, form, router, toast]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalImages = existingImages.length + imageFiles.length;
    const remaining = 3 - totalImages;
    if (remaining <= 0) {
      toast({ title: '画像は最大3枚までです', variant: 'destructive' });
      return;
    }
    const valid = files.filter(f => f.size <= 10 * 1024 * 1024).slice(0, remaining);
    setImageFiles(prev => [...prev, ...valid]);
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    const userId = session?.user?.id || 'guest';

    for (const file of imageFiles) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${userId}/${uuidv4()}.${ext}`;
      const { error } = await supabase.storage
        .from('images')
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path);
        uploadedUrls.push(publicUrl);
      }
    }
    return uploadedUrls;
  };

  const handleLocationSave = (lat: number, lng: number, spotName: string) => {
    setSelectedLocation({ lat, lng });
    if (spotName) setLocationName(spotName);
    setShowMapModal(false);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId]
    );
  };

  const toggleActivity = (tagId: string, activityId: string) => {
    setTagActivities(prev => {
      const current = prev[tagId] || [];
      const updated = current.includes(activityId)
        ? current.filter(a => a !== activityId)
        : [...current, activityId];
      return { ...prev, [tagId]: updated };
    });
  };

  const onSubmit = async (values: SpotFormValues) => {
    if (!session?.user?.id) {
      toast({ title: 'ログインが必要です', variant: 'destructive' });
      return;
    }
    if (!selectedLocation) {
      toast({ title: '位置情報を設定してください', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    showLoading();

    try {
      const newImageUrls = await uploadImages();
      const allImages = [...existingImages, ...newImageUrls];

      const input: UpdateSpotInput = {
        storeName: values.storeName,
        description: values.description,
        storeLatitude: selectedLocation.lat,
        storeLongitude: selectedLocation.lng,
        storeId,
        imageUrls: allImages,
        url: values.url || null,
        city,
        prefecture,
        targetTags: selectedTags,
        tagActivities,
      };

      const { success, error } = await updateSpot(params.id, session.user.id, input);

      if (error || !success) {
        toast({ title: 'エラー', description: error || '更新に失敗しました', variant: 'destructive' });
        return;
      }

      toast({ title: 'スポットを更新しました', duration: 2000 });
      router.push('/map?view=spots');
    } catch (err: any) {
      toast({ title: 'エラー', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
      hideLoading();
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Breadcrumb />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-6">スポットを編集</h1>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 画像 */}
              <div>
                <Label className="text-sm font-medium">画像（最大3枚）</Label>
                <div className="flex flex-wrap gap-3 mt-2">
                  {existingImages.map((url, i) => (
                    <div key={`existing-${i}`} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(i)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {imageFiles.map((file, i) => (
                    <div key={`new-${i}`} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border">
                      <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeNewImage(i)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {existingImages.length + imageFiles.length < 3 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center hover:border-foreground/30 transition-colors"
                    >
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>

              {/* 位置情報 */}
              <div>
                <Label className="text-sm font-medium">位置情報</Label>
                {selectedLocation ? (
                  <div className="mt-2 p-3 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-sm">{locationName || `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`}</span>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setShowMapModal(true)}>
                      位置を変更
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" className="mt-2 w-full" onClick={() => setShowMapModal(true)}>
                    <MapPin className="mr-2 h-4 w-4" /> 位置を設定
                  </Button>
                )}
              </div>

              {/* タイトル */}
              <FormField
                control={form.control}
                name="storeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>タイトル</FormLabel>
                    <FormControl>
                      <Input placeholder="スポット名を入力" maxLength={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 説明 */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>説明</FormLabel>
                    <FormControl>
                      <Textarea placeholder="スポットの説明（5〜800文字）" rows={5} maxLength={800} {...field} />
                    </FormControl>
                    <div className="text-xs text-muted-foreground text-right">{field.value?.length || 0}/800</div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* URL */}
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL（任意）</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* タグ */}
              <div>
                <Label className="text-sm font-medium mb-2 block">タグ（任意）</Label>
                <div className="flex flex-wrap gap-2">
                  {TARGET_TAGS.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        selectedTags.includes(tag.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-muted-foreground border-border hover:border-foreground/30'
                      }`}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
                {selectedTags.map((tagId) => {
                  const activities = TAG_ACTIVITIES[tagId as TargetTagId];
                  if (!activities?.length) return null;
                  return (
                    <div key={tagId} className="mt-3 ml-2">
                      <p className="text-xs text-muted-foreground mb-1">
                        {TARGET_TAGS.find(t => t.id === tagId)?.label} のアクティビティ:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {activities.map((act) => (
                          <button
                            key={act.id}
                            type="button"
                            onClick={() => toggleActivity(tagId, act.id)}
                            className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                              (tagActivities[tagId] || []).includes(act.id)
                                ? 'bg-secondary text-secondary-foreground border-secondary'
                                : 'bg-card text-muted-foreground border-border'
                            }`}
                          >
                            {act.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 送信 */}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl font-semibold"
              >
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 更新中...</>
                ) : (
                  <><CheckCircle className="mr-2 h-4 w-4" /> スポットを更新</>
                )}
              </Button>
            </form>
          </Form>
        </motion.div>
      </div>

      {/* マップモーダル */}
      {showMapModal && isLoaded && (
        <MarkerLocationModal
          isOpen={showMapModal}
          onClose={() => setShowMapModal(false)}
          onSave={handleLocationSave}
          initialLat={selectedLocation?.lat}
          initialLng={selectedLocation?.lng}
          initialSpotName={locationName}
          isLoaded={isLoaded}
        />
      )}
    </div>
  );
}
