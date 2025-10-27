"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Calendar, Clock, ExternalLink, AlertCircle, Phone, FileText, DollarSign, MapPinned, Link as LinkIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
  image_urls: string[] | null;
  event_name?: string | null;
  event_price?: string | null;
  prefecture?: string | null;
  city?: string | null;
  url?: string | null;
  phone_number?: string | null;
  file_urls?: string[] | null;
  event_start_date?: string | null;
  event_end_date?: string | null;
}

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (!eventId) return;

    const fetchEventDetail = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
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

        // file_urlsの正規化
        let fileUrls = data.file_urls;
        if (typeof fileUrls === 'string') {
          try {
            fileUrls = JSON.parse(fileUrls);
          } catch (e) {
            console.error('ファイルURLのパースに失敗:', e);
            fileUrls = null;
          }
        }

        setEvent({
          ...data,
          image_urls: imageUrls,
          file_urls: fileUrls
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73370c] mx-auto mb-4"></div>
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
          <Button onClick={() => router.back()} className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
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

  const nextImage = () => {
    if (event?.image_urls && event.image_urls.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % event.image_urls!.length);
    }
  };

  const prevImage = () => {
    if (event?.image_urls && event.image_urls.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + event.image_urls!.length) % event.image_urls!.length);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-y-auto">
      {/* ヘッダー */}
      <div className="bg-[#2C2C2C] border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.push('/map')}
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-white/10 text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-white">店舗詳細画面</h1>
          </div>
          <Button
            onClick={() => router.push('/map')}
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-white/10 text-white"
          >
            <span className="text-xl">×</span>
          </Button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-4xl mx-auto pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative"
        >
          {/* イベント画像カルーセル */}
          {event.image_urls && event.image_urls.length > 0 ? (
            <div className="relative h-80 w-full overflow-hidden bg-gray-900 sticky top-0 z-10">
              <img
                src={event.image_urls[currentImageIndex]}
                alt={event.event_name || event.store_name}
                className="w-full h-full object-cover"
              />
              
              {/* 右上の閉じるボタン */}
              <Button
                onClick={() => router.back()}
                size="icon"
                className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white border-2 border-white shadow-lg z-10"
              >
                <X className="h-6 w-6" />
              </Button>
              
              {/* 画像ナビゲーション */}
              {event.image_urls.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                  
                  {/* インジケーター */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {event.image_urls.map((_, index) => (
                      <div
                        key={index}
                        className={`h-2 rounded-full transition-all ${
                          index === currentImageIndex
                            ? 'w-8 bg-white'
                            : 'w-2 bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="relative h-80 w-full bg-gradient-to-br from-[#73370c] to-[#8B4513] flex items-center justify-center sticky top-0 z-10">
              <Calendar className="h-32 w-32 text-white opacity-50" />
              
              {/* 右上の閉じるボタン（画像なしの場合） */}
              <Button
                onClick={() => router.back()}
                size="icon"
                className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white border-2 border-white shadow-lg"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          )}

          {/* スクロール可能なコンテンツエリア */}
          <div className="bg-white">
            {/* 店舗/イベント名 */}
            <div className="px-4 py-5 border-b">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {event.event_name || event.store_name}
              </h2>
              {event.event_name && event.store_name && (
                <p className="text-gray-600 text-sm">{event.store_name}</p>
              )}
              {event.category && (
                <div className="inline-block mt-2 px-3 py-1 bg-[#73370c]/10 text-[#73370c] rounded-full text-xs font-medium">
                  {event.category}
                </div>
              )}
            </div>

            {/* ステータスバッジ */}
            <div className="px-4 py-3 border-b">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                開催中
              </div>
            </div>

            {/* 投稿内容 */}
            <div className="px-4 py-5 border-b">
              <div className="bg-blue-50 border-l-4 border-[#73370c] p-4 rounded-r-lg">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {event.content}
                </p>
              </div>
            </div>

            {/* 詳細情報 */}
            <div className="divide-y">
              {/* 場所 */}
              <div className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 mt-1 flex-shrink-0 text-red-500" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">住所</p>
                    <p className="text-gray-700">
                      {event.prefecture && event.city 
                        ? `${event.prefecture}${event.city}`
                        : event.store_name}
                    </p>
                    <Button
                      onClick={openGoogleMaps}
                      variant="link"
                      className="p-0 h-auto mt-2 text-[#73370c] hover:text-[#5c2a0a]"
                    >
                      Googleマップで開く
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* 開催期日 */}
              <div className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 mt-1 flex-shrink-0 text-[#73370c]" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">開催期間</p>
                    {event.event_start_date ? (
                      <p className="text-gray-700">
                        {new Date(event.event_start_date).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                        {event.event_end_date && event.event_end_date !== event.event_start_date && (
                          <> 〜 {new Date(event.event_end_date).toLocaleDateString('ja-JP', {
                            month: 'long',
                            day: 'numeric'
                          })}</>
                        )}
                      </p>
                    ) : (
                      <p className="text-gray-700">{formatDate(event.expires_at)}まで</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 料金 */}
              {event.event_price && (
                <div className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 mt-1 flex-shrink-0 text-green-500" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-1">料金</p>
                      <p className="text-gray-700">{event.event_price}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* エリア情報 */}
              {(event.prefecture || event.city) && (
                <div className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <MapPinned className="h-5 w-5 mt-1 flex-shrink-0 text-[#73370c]" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-1">エリア</p>
                      <p className="text-gray-700">
                        {event.prefecture} {event.city}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 電話番号 */}
              {event.phone_number && (
                <div className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 mt-1 flex-shrink-0 text-orange-500" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-1">電話番号</p>
                      <a
                        href={`tel:${event.phone_number}`}
                        className="text-[#73370c] hover:text-[#5c2a0a] font-medium"
                      >
                        {event.phone_number}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* ウェブサイト */}
              {event.url && (
                <div className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <LinkIcon className="h-5 w-5 mt-1 flex-shrink-0 text-indigo-500" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-1">ウェブサイト</p>
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#73370c] hover:text-[#5c2a0a] break-all"
                      >
                        {event.url}
                        <ExternalLink className="h-3 w-3 ml-1 inline" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* ファイル */}
              {event.file_urls && event.file_urls.length > 0 && (
                <div className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 mt-1 flex-shrink-0 text-gray-500" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-2">添付ファイル</p>
                      <div className="space-y-2">
                        {event.file_urls.map((fileUrl, index) => (
                          <a
                            key={index}
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <FileText className="h-4 w-4 text-gray-600" />
                            <span className="text-sm text-gray-700 flex-1">
                              ファイル {index + 1}
                            </span>
                            <ExternalLink className="h-4 w-4 text-gray-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* アクションボタン */}
            <div className="px-4 py-6 space-y-3">
              <Button
                onClick={openGoogleMaps}
                className="w-full bg-[#73370c] hover:bg-[#5c2a0a] text-white py-6 text-lg shadow-lg rounded-xl"
              >
                <MapPin className="h-5 w-5 mr-2" />
                地図で場所を確認
              </Button>

              <Button
                onClick={() => router.back()}
                variant="outline"
                className="w-full py-6 text-lg rounded-xl border-2"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                戻る
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

