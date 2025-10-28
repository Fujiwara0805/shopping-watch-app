"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Calendar, Map, ExternalLink, AlertCircle, Phone, FileText, DollarSign, MapPinned, Link as LinkIcon, ChevronLeft, ChevronRight, X, ChevronDown, ChevronUp } from 'lucide-react';
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
  address?: string | null;
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
  const [isContentExpanded, setIsContentExpanded] = useState(false);

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

  // イベントステータスと残り時間を計算
  const getEventStatus = () => {
    if (!event) return { status: '未定', color: 'gray', remainingTime: '' };

    const now = new Date();
    const startDate = event.event_start_date ? new Date(event.event_start_date) : null;
    const endDate = event.event_end_date ? new Date(event.event_end_date) : new Date(event.expires_at);

    // 開催開始前
    if (startDate && now < startDate) {
      const diffMs = startDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return { 
        status: '開催予定', 
        color: 'blue',
        remainingTime: `開催まであと${diffDays}日`
      };
    }

    // 開催期間中または開催日当日
    if (now <= endDate) {
      const diffMs = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
      
      let remainingText = '';
      if (diffDays > 1) {
        remainingText = `あと${diffDays}日`;
      } else if (diffHours > 1) {
        remainingText = `あと${diffHours}時間`;
      } else {
        remainingText = 'まもなく終了';
      }
      
      return { 
        status: '開催中', 
        color: 'green',
        remainingTime: remainingText
      };
    }

    // 終了
    return { 
      status: '終了', 
      color: 'gray',
      remainingTime: ''
    };
  };

  // URLがInstagramかどうかを判定
  const isInstagramUrl = (url: string) => {
    return url.toLowerCase().includes('instagram.com');
  };

  // ウェブサイトのアイコンを取得
  const getWebsiteIcon = (url: string) => {
    if (isInstagramUrl(url)) {
      return 'https://res.cloudinary.com/dz9trbwma/image/upload/v1759308496/icons8-%E3%82%A4%E3%83%B3%E3%82%B9%E3%82%BF%E3%82%AF%E3%82%99%E3%83%A9%E3%83%A0-100_idedfz.png';
    }
    return 'https://res.cloudinary.com/dz9trbwma/image/upload/v1759366399/icons8-%E3%82%A6%E3%82%A7%E3%83%95%E3%82%99-100_a6uwwq.png';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#73370c] mx-auto mb-4"></div>
          <p className="text-gray-600 font-bold">イベント情報を読み込み中...</p>
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
          <p className="text-gray-600 font-bold mb-6">{error || 'イベントが見つかりませんでした。'}</p>
          <Button onClick={() => router.push('/map')} className="w-full font-bold">
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

  const eventStatus = getEventStatus();
  const statusColors = {
    green: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    gray: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' }
  };
  const colors = statusColors[eventStatus.color as keyof typeof statusColors];

  // 投稿内容の表示制御
  const contentText = event.content;
  const shouldTruncate = contentText.length > 100;
  const displayContent = shouldTruncate && !isContentExpanded 
    ? contentText.slice(0, 100) 
    : contentText;

  return (
    <div className="min-h-screen bg-gray-50 overflow-y-auto font-bold">
      {/* ヘッダー */}
      <div className="bg-[#73370c] border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-center">
          <h1 className="text-2xl font-bold text-white">イベント詳細画面</h1>
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
            <div className="relative h-80 w-full overflow-hidden bg-gray-900">
              <img
                src={event.image_urls[currentImageIndex]}
                alt={event.event_name || event.store_name}
                className="w-full h-full object-cover"
              />
              
              {/* 右上の閉じるボタン */}
              <Button
                onClick={() => router.push('/map')}
                size="icon"
                className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white border-2 border-white shadow-lg z-10 font-bold"
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
            <div className="relative h-80 w-full bg-gradient-to-br from-[#73370c] to-[#8B4513] flex items-center justify-center">
              <Calendar className="h-32 w-32 text-white opacity-50" />
              
              {/* 右上の閉じるボタン（画像なしの場合） */}
              <Button
                onClick={() => router.push('/map')}
                size="icon"
                className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white border-2 border-white shadow-lg font-bold"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          )}

          {/* スクロール可能なコンテンツエリア */}
          <div className="bg-white">
            {/* イベント名 */}
            <div className="px-4 py-5 pb-3">
              <h2 className="text-2xl font-bold text-[#73370c] mb-0">
                {event.event_name}
              </h2>
            </div>

            {/* ステータスバッジと残り時間 */}
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-3">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${colors.bg} ${colors.text} rounded-lg text-sm font-bold`}>
                  <div className={`w-2 h-2 ${colors.dot} rounded-full`}></div>
                  {eventStatus.status}
                </div>
                {eventStatus.remainingTime && (
                  <span className="text-red-600 font-bold text-sm">
                    {eventStatus.remainingTime}
                  </span>
                )}
              </div>
            </div>

            {/* 投稿内容 */}
            <div className="px-4 py-5 border-b">
              <div className="bg-blue-50 border-l-4 border-[#73370c] p-4 rounded-r-lg">
                <p className="text-gray-500 leading-relaxed whitespace-pre-wrap">
                  {displayContent}
                </p>
                {shouldTruncate && (
                  <button
                    onClick={() => setIsContentExpanded(!isContentExpanded)}
                    className="mt-2 flex items-center gap-1 text-[#73370c] hover:text-[#5c2a0a] font-bold text-sm"
                  >
                    {isContentExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        閉じる
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        続きを読む
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* 詳細情報 */}
            <div className="divide-y">
              {/* 開催場所 */}
              <div className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 mt-1 flex-shrink-0 text-red-500" />
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 mb-1">開催場所</p>
                    <p className="text-gray-700 font-bold mb-2">
                      {event.store_name}
                    </p>
                    <p className="text-xs text-gray-500 mb-2">
                      ※詳細はメディア情報をご確認ください
                    </p>
                    <Button
                      onClick={openGoogleMaps}
                      variant="link"
                      className="p-0 h-auto text-[#73370c] hover:text-[#5c2a0a] font-bold"
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
                    <p className="font-bold text-gray-900 mb-1">開催期間</p>
                    {event.event_start_date ? (
                      <p className="text-gray-700 font-bold">
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
                      <p className="text-gray-700 font-bold">{formatDate(event.expires_at)}まで</p>
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
                      <p className="font-bold text-gray-900 mb-1">料金</p>
                      <p className="text-gray-700 font-bold">{event.event_price}</p>
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
                      <p className="font-bold text-gray-900 mb-1">電話番号</p>
                      <a
                        href={`tel:${event.phone_number}`}
                        className="text-[#73370c] hover:text-[#5c2a0a] font-bold"
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
                      <p className="font-bold text-gray-900 mb-1">メディア情報</p>
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img 
                          src={getWebsiteIcon(event.url)} 
                          alt={isInstagramUrl(event.url) ? 'Instagram' : 'Website'}
                          className="h-12 w-12 cursor-pointer hover:opacity-80 transition-opacity"
                        />
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
                      <p className="font-bold text-gray-900 mb-2">添付ファイル</p>
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
                            <span className="text-sm text-gray-700 flex-1 font-bold">
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
              {/* 🔥 メディア情報（URL）へのリンクに変更 */}
              {event.url ? (
                <Button
                  onClick={() => window.open(event.url!, '_blank')}
                  className="w-full bg-[#73370c] text-white py-6 text-lg shadow-lg rounded-xl font-bold"
                >
                  <ExternalLink className="h-5 w-5 mr-2" />
                  詳細情報を確認
                </Button>
              ) : (
                <Button
                  onClick={openGoogleMaps}
                  className="w-full bg-[#73370c] text-white py-6 text-lg shadow-lg rounded-xl font-bold"
                >
                  <Map className="h-5 w-5 mr-2" />
                  地図でイベントを確認
                </Button>
              )}

              <Button
                onClick={() => router.push('/map')}
                variant="outline"
                className="w-full py-6 text-lg rounded-xl border-2 font-bold"
              >
                戻る
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

