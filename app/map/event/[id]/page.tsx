"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Calendar, Clock, Users, ExternalLink, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface EventDetail {
  id: string;
  category: string | null;
  store_name: string;
  content: string;
  store_latitude: number;
  store_longitude: number;
  created_at: string;
  expires_at: string;
  remaining_slots: number | null;
  image_urls: string[] | null;
  user_id: string;
  profiles?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;

    const fetchEventDetail = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            profiles:user_id (
              display_name,
              avatar_url
            )
          `)
          .eq('id', eventId)
          .eq('is_deleted', false)
          .single();

        if (error) {
          console.error('イベント詳細の取得に失敗:', error);
          setError('イベント情報の取得に失敗しました。');
          return;
        }

        if (!data) {
          setError('イベントが見つかりませんでした。');
          return;
        }

        // image_urlsの正規化
        let imageUrls = data.image_urls;
        if (typeof imageUrls === 'string') {
          try {
            imageUrls = JSON.parse(imageUrls);
          } catch (e) {
            console.error('画像URLのパースに失敗:', e);
            imageUrls = null;
          }
        }

        setEvent({
          ...data,
          image_urls: imageUrls
        });
      } catch (error) {
        console.error('イベント詳細の取得中にエラー:', error);
        setError('予期しないエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetail();
  }, [eventId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">イベント情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">エラー</h2>
          <p className="text-gray-600 mb-6">{error || 'イベントが見つかりませんでした。'}</p>
          <Button onClick={() => router.push('/map')} className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            マップに戻る
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${event.store_latitude},${event.store_longitude}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            onClick={() => router.push('/map')}
            variant="ghost"
            size="icon"
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-gray-900">イベント詳細</h1>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-4xl mx-auto p-4 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* イベント画像 */}
            {event.image_urls && event.image_urls.length > 0 ? (
              <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-gray-100">
                <img
                  src={event.image_urls[0]}
                  alt={event.store_name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="relative h-64 sm:h-80 w-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                <Calendar className="h-32 w-32 text-white opacity-50" />
              </div>
            )}

            {/* イベント情報 */}
            <div className="p-6 space-y-6">
              {/* イベント名 */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {event.content}
                </h2>
                <div className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  {event.category || 'イベント情報'}
                </div>
              </div>

              {/* 場所 */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0 text-red-500" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">開催場所</p>
                  <p className="text-gray-600 mt-1">{event.store_name}</p>
                  <Button
                    onClick={openGoogleMaps}
                    variant="link"
                    className="p-0 h-auto mt-2 text-blue-600"
                  >
                    Google Mapsで開く
                    <ExternalLink className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>

              {/* 開催期日 */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <Clock className="h-5 w-5 mt-0.5 flex-shrink-0 text-blue-500" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">開催期限</p>
                  <p className="text-gray-600 mt-1">{formatDate(event.expires_at)}まで</p>
                </div>
              </div>

              {/* 投稿日時 */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <Calendar className="h-5 w-5 mt-0.5 flex-shrink-0 text-green-500" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">投稿日</p>
                  <p className="text-gray-600 mt-1">{formatDate(event.created_at)}</p>
                </div>
              </div>

              {/* 残り枠数（あれば） */}
              {event.remaining_slots !== null && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <Users className="h-5 w-5 mt-0.5 flex-shrink-0 text-orange-500" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">残り枠数</p>
                    <p className="text-gray-600 mt-1">
                      {event.remaining_slots > 0
                        ? `${event.remaining_slots}枠`
                        : '満員'}
                    </p>
                  </div>
                </div>
              )}

              {/* 投稿者情報（あれば） */}
              {event.profiles && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-2">投稿者</p>
                  <div className="flex items-center gap-3">
                    {event.profiles.avatar_url ? (
                      <img
                        src={event.profiles.avatar_url}
                        alt={event.profiles.display_name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-600 text-sm font-medium">
                          {event.profiles.display_name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <p className="font-medium text-gray-900">
                      {event.profiles.display_name}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* アクションボタン */}
          <div className="mt-6 space-y-3">
            <Button
              onClick={openGoogleMaps}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-6 text-lg shadow-lg"
            >
              <MapPin className="h-5 w-5 mr-2" />
              地図で場所を確認
            </Button>

            <Button
              onClick={() => router.push('/map')}
              variant="outline"
              className="w-full py-6 text-lg"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              マップに戻る
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

