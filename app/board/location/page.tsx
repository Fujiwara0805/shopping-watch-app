"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Clock, TrendingUp, Loader2, ShoppingCart, Sparkles, RefreshCw, Calendar, MessageSquare, ShoppingBag, Notebook, Info, Mail, Search, X, MapPin, Users, ArrowLeft, Lock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CustomModal } from '@/components/ui/custom-modal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import AppLayout from '@/components/layout/app-layout';
import { useSession } from 'next-auth/react';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { useLoading } from '@/contexts/loading-context';

interface LocationBoardPost {
  id: string;
  product_name: string;
  memo?: string | null;
  created_at: string;
  expires_at: string;
  distance?: number;
  user_id: string; // 追加
  user: {
    nickname: string;
    profile_image_url?: string;
  };
}

interface ProductRanking {
  product_name: string;
  count: number;
  rank: number;
}

interface MemoItem {
  id: string;
  name: string;
  checked: boolean;
}

export default function LocationBoardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const { showLoading, hideLoading } = useLoading();
  
  const [posts, setPosts] = useState<LocationBoardPost[]>([]);
  const [rankings, setRankings] = useState<ProductRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productInput, setProductInput] = useState('');
  const [memo, setMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  // 位置情報の取得
  const {
    latitude,
    longitude,
    error: locationError,
    loading: locationLoading,  // Change from isLoading to loading
    permissionState,
    requestLocation
  } = useGeolocation();

  // 位置情報オブジェクトを作成
  const location = latitude && longitude ? { latitude, longitude } : null;

  // 未ログインの場合はログインページへリダイレクト
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=${encodeURIComponent('/board/location')}`);
    }
  }, [status, router]);

  // 位置情報の自動取得
  useEffect(() => {
    if (status === 'authenticated' && permissionState === 'prompt') {
      requestLocation();
    }
  }, [status, permissionState, requestLocation]);

  // 投稿一覧の取得
  const fetchPosts = useCallback(async () => {
    if (!location) return;

    try {
      const response = await fetch(
        `/api/board/location?latitude=${location.latitude}&longitude=${location.longitude}`
      );

      if (!response.ok) {
        throw new Error('投稿の取得に失敗しました');
      }

      const data = await response.json();
      setPosts(data.posts || []);
      setRankings(data.rankings || []);
    } catch (error) {
      console.error('投稿取得エラー:', error);
      toast({
        title: "エラー",
        description: "投稿の取得に失敗しました",
        variant: "destructive",
      });
    }
  }, [location?.latitude, location?.longitude, toast]);

  // 初回読み込み
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchPosts();
      setLoading(false);
    };

    if (session && location?.latitude && location?.longitude) {
      loadData();
    }
  }, [session, location?.latitude, location?.longitude, fetchPosts]);

  // 自動更新（1分ごと）
  useEffect(() => {
    if (!session || !location?.latitude || !location?.longitude) return;

    const interval = setInterval(() => {
      fetchPosts();
    }, 60000);

    return () => clearInterval(interval);
  }, [session, location?.latitude, location?.longitude, fetchPosts]);

  // 投稿削除機能
  const handleDeletePost = async (postId: string) => {
    if (!confirm('この投稿を削除しますか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/board/location?id=${postId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '削除に失敗しました');
      }

      toast({
        title: "削除完了",
        description: "投稿が削除されました",
        duration: 1000,
      });

      // 投稿一覧を更新
      await fetchPosts();
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message || "削除に失敗しました",
        variant: "destructive",
        duration: 1000,
      });
    }
  };

  // 投稿の送信
  const handleSubmitPost = async () => {
    if (!session?.user?.id || !location) {
      toast({
        title: "エラー",
        description: "ログインと位置情報が必要です",
        variant: "destructive",
        duration: 1000,
      });
      return;
    }

    if (!productInput.trim()) {
      toast({
        title: "エラー",
        description: "商品名を入力してください",
        variant: "destructive",
        duration: 1000,
      });
      return;
    }

    setIsSubmitting(true);
    showLoading();

    try {
      const response = await fetch('/api/board/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_name: productInput.trim(),
          memo: memo.trim() || null,
          latitude: location.latitude,
          longitude: location.longitude,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '投稿に失敗しました');
      }

      toast({
        title: "✅ 投稿完了",
        description: "投稿が完了しました",
        duration: 1000,
      });

      // 買い物メモに追加
      addToShoppingMemo(productInput.trim());

      // フォームをリセット
      setProductInput('');
      setMemo('');
      setIsModalOpen(false);

      // 投稿一覧を更新
      await fetchPosts();
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message || "投稿に失敗しました",
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setIsSubmitting(false);
      hideLoading();
    }
  };

  // 買い物メモに追加
  const addToShoppingMemo = (productName: string) => {
    try {
      const existingMemo = localStorage.getItem('shoppingMemo');
      let memoItems: MemoItem[] = existingMemo ? JSON.parse(existingMemo) : [];
      
      const isDuplicate = memoItems.some(item => 
        item.name.toLowerCase() === productName.toLowerCase()
      );
      
      if (isDuplicate) {
        toast({
          title: "ℹ️ すでに追加されています",
          description: `${productName}は既に買い物メモに存在します。`,
          duration: 1000,
        });
        return;
      }
      
      const newItem: MemoItem = {
        id: Date.now().toString(),
        name: productName,
        checked: false
      };
      
      memoItems = [newItem, ...memoItems];
      localStorage.setItem('shoppingMemo', JSON.stringify(memoItems));
      
      toast({
        title: "🛒 買い物メモに追加しました！",
        description: `${productName}を買い物メモに追加しました。`,
        duration: 1000,
      });
    } catch (error) {
      console.error('買い物メモ追加エラー:', error);
    }
  };

  // 手動リフレッシュ
  const handleRefresh = async () => {
    showLoading();
    await fetchPosts();
    setLastRefresh(new Date());
    hideLoading();
    toast({
      title: "更新しました",
      description: "最新の投稿情報を取得しました。",
      duration: 1000,
    });
  };

  // ローディング中の表示
  if (status === 'loading' || loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </div>
      </AppLayout>
    );
  }

  // 位置情報エラーの表示
  if (!location && !locationLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-white/80 backdrop-blur-sm border-blue-200 shadow-lg">
              <CardContent className="p-8 text-center">
                <MapPin className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-4">位置情報が必要です</h2>
                <p className="text-gray-600 mb-6">
                  この機能を利用するには位置情報の許可が必要です。
                  <br />
                  周辺5km圏内の投稿のみが表示されます。
                </p>
                {permissionState === 'denied' ? (
                  <div className="space-y-4">
                    <p className="text-sm text-red-600">
                      位置情報がブロックされています。
                      <br />
                      ブラウザの設定から位置情報を許可してください。
                    </p>
                  </div>
                ) : (
                  <Button
                    onClick={requestLocation}
                    disabled={locationLoading}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    {locationLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        位置情報を取得中...
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4 mr-2" />
                        位置情報を許可する
                      </>
                    )}
                  </Button>
                )}
                <div className="mt-6">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/board')}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    通常の掲示板に戻る
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* ヘッダー */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="relative bg-gradient-to-br from-blue-50 to-indigo-100 border-4 border-blue-300 rounded-lg p-3 shadow-lg">
              <div className="absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 border-blue-400"></div>
              <div className="absolute top-1 right-1 w-3 h-3 border-r-2 border-t-2 border-blue-400"></div>
              <div className="absolute bottom-1 left-1 w-3 h-3 border-l-2 border-b-2 border-blue-400"></div>
              <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-blue-400"></div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-6 h-0.5 bg-blue-400"></div>
                  <Lock className="h-5 w-5 text-blue-600" />
                  <div className="w-6 h-0.5 bg-blue-400"></div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-base text-blue-800 font-medium">
                    ログインユーザー限定掲示板
                  </p>
                  <p className="text-base text-blue-900 font-bold flex items-center justify-center space-x-1">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    <span>周辺5km圏内の投稿のみ表示</span>
                    <MapPin className="h-4 w-4 text-blue-500" />
                  </p>
                </div>
                
                <div className="flex items-center justify-center space-x-2 text-sm text-blue-700">
                  <div className="w-8 h-0.5 bg-blue-300"></div>
                  <span className="font-medium">位置情報に基づいて<br />近くの投稿が表示されます</span>
                  <div className="w-8 h-0.5 bg-blue-300"></div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/board')}
                className="border-gray-300"
              >
                戻る
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleRefresh}
                className="bg-[#ffcc33] hover:bg-[#e6b82e] text-gray-900 font-medium border-0 shadow-sm"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                更新
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => router.push('/memo')}
                className="bg-[#22c55d] hover:bg-[#16a34a] text-white font-medium border-0 shadow-sm"
              >
                <Notebook className="h-4 w-4 mr-1" />
                買い物メモ
              </Button>
            </div>
          </motion.div>

          {/* 投稿ボタン */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center"
          >
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 px-8 py-4 text-lg font-semibold rounded-full flex items-center space-x-3"
              type="button"
            >
              <span>今日買うものを投稿</span>
              <MapPin className="h-5 w-5" />
            </button>
          </motion.div>

          {/* ランキング */}
          {rankings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm border-blue-200 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      <h2 className="text-xl font-semibold text-gray-800">
                        周辺エリア人気商品
                      </h2>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      5km圏内
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="max-h-64 overflow-y-auto space-y-3">
                    {rankings.slice(0, 8).map((item, index) => (
                      <motion.div
                        key={item.product_name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg transition-all duration-200 hover:shadow-md",
                          index === 0 && "bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-200",
                          index === 1 && "bg-gradient-to-r from-gray-100 to-gray-200 border border-gray-200",
                          index === 2 && "bg-gradient-to-r from-orange-100 to-red-100 border border-orange-200",
                          index > 2 && "bg-gray-50 hover:bg-gray-100"
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm",
                            index === 0 && "bg-gradient-to-r from-yellow-500 to-orange-500 text-white",
                            index === 1 && "bg-gradient-to-r from-gray-500 to-gray-600 text-white",
                            index === 2 && "bg-gradient-to-r from-orange-500 to-red-500 text-white",
                            index > 2 && "bg-gray-300 text-gray-700"
                          )}>
                            {item.rank}
                          </div>
                          <span className="font-medium text-gray-900">
                            {item.product_name}
                          </span>
                        </div>
                        <Badge variant="secondary" className="font-semibold text-sm">
                          {item.count}件
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 投稿一覧 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-blue-200 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center space-x-2 text-gray-800">
                    <Users className="h-5 w-5 text-blue-500" />
                    <span>周辺の投稿</span>
                  </h2>
                  <div className="text-sm text-gray-500">
                    最終更新: {formatDistanceToNow(lastRefresh, { addSuffix: true, locale: ja })}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {posts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">周辺に投稿はありません</p>
                    <p className="text-sm">最初の投稿をしてみましょう！</p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    <AnimatePresence>
                      {posts.map((post, index) => (
                        <motion.div
                          key={post.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-gray-900">
                                  {post.product_name}
                                </span>
                                {post.distance && (
                                  <Badge variant="outline" className="text-xs">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {post.distance.toFixed(1)}km
                                  </Badge>
                                )}
                              </div>
                              
                              {post.memo && post.memo.trim() && (
                                <div className="flex items-start space-x-1 mb-2">
                                  <MessageSquare className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-gray-600 leading-relaxed">
                                    {post.memo}
                                  </p>
                                </div>
                              )}
                              
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center space-x-1">
                                  <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                                    {post.user.profile_image_url ? (
                                      <img
                                        src={post.user.profile_image_url}
                                        alt={post.user.nickname}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          // 画像読み込みエラー時にデフォルト表示
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          const parent = target.parentElement;
                                          if (parent) {
                                            const icon = parent.querySelector('.default-icon') as HTMLElement;
                                            if (icon) {
                                              icon.style.display = 'block';
                                            }
                                          }
                                        }}
                                      />
                                    ) : null}
                                    <Users 
                                      className="h-3 w-3 text-gray-600 default-icon" 
                                      style={{ display: post.user.profile_image_url ? 'none' : 'block' }} 
                                    />
                                  </div>
                                  <span className="text-xs text-gray-600">{post.user.nickname}</span>
                                </div>
                                <span className="text-xs text-gray-400">•</span>
                                <Clock className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {formatDistanceToNow(new Date(post.created_at), {
                                    addSuffix: true,
                                    locale: ja,
                                  })}
                                </span>
                              </div>
                            </div>
                            
                            {/* 削除ボタン（自分の投稿のみ表示） */}
                            {post.user_id === session?.user?.id && (
                              <div className="ml-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeletePost(post.id)}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* 説明カード */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="bg-blue-50/80 backdrop-blur-sm border-blue-200 shadow-lg">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-blue-900 flex items-center justify-center space-x-2">
                      <Info className="h-5 w-5 text-blue-600" />
                      <span>ご利用について</span>
                    </h3>
                  </div>
                  
                  <div className="grid gap-3">
                    <div className="flex items-start space-x-3 p-2.5 rounded-lg bg-white/50">
                      <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-blue-900 mb-0.5">
                          位置情報について
                        </p>
                        <p className="text-xs text-blue-800">
                          投稿時の位置情報から<strong>5km圏内</strong>の投稿のみ表示されます。
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-2.5 rounded-lg bg-white/50">
                      <Lock className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-blue-900 mb-0.5">
                          プライバシー保護
                        </p>
                        <p className="text-xs text-blue-800">
                          正確な位置情報は<strong>他のユーザーには公開されません</strong>。
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-2.5 rounded-lg bg-white/50">
                      <Clock className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-blue-900 mb-0.5">
                          自動削除について
                        </p>
                        <p className="text-xs text-blue-800">
                          投稿は<strong>5時間後に自動削除</strong>されます。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* 投稿モーダル */}
        <CustomModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="今日買うものを投稿"
          description="商品名を入力して投稿すると、周辺5km圏内のユーザーに表示されます。"
          className="max-w-lg"
        >
          <div className="space-y-6">
            {/* 注意メッセージ */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800 mb-1">
                    位置情報について
                  </p>
                  <p className="text-xs text-blue-700">
                    現在地の情報が投稿に含まれますが、<strong>正確な位置は他のユーザーには表示されません</strong>。
                  </p>
                </div>
              </div>
            </div>

            {/* 商品入力 */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-800 flex items-center">
                <ShoppingCart className="h-4 w-4 mr-2 text-blue-500" />
                買うものを入力してください
              </label>
              
              <div className="relative">
                <div className="relative">
                  <Input
                    value={productInput}
                    onChange={(e) => setProductInput(e.target.value)}
                    placeholder="商品名を入力してください（50文字以内）"
                    className="h-12 text-base border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 transition-colors"
                    style={{ fontSize: '16px' }}
                    maxLength={50}
                  />
                  {productInput && (
                    <button
                      onClick={() => setProductInput('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                {/* 文字数カウンター */}
                <div className="text-xs text-gray-500 text-right mt-1">
                  {productInput.length}/50文字
                </div>
              </div>
            </div>

            {/* メモ入力 */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-800 flex items-center">
                <MessageSquare className="h-4 w-4 mr-2 text-blue-500" />
                メモ（任意）
              </label>
              <Textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="具体的な商品名や希望（値段や数量など）をご記入ください（100文字まで）"
                className="min-h-32 text-base border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 transition-colors resize-none"
                style={{ fontSize: '16px' }}
                maxLength={100}
              />
              <div className="text-xs text-gray-500 text-right">
                {memo.length}/100文字
              </div>
            </div>

            {/* ボタン */}
            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 h-12 border-2 hover:bg-gray-50"
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleSubmitPost}
                disabled={!productInput.trim() || isSubmitting}
                className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    投稿中...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    投稿する
                  </>
                )}
              </Button>
            </div>
          </div>
        </CustomModal>
      </div>
    </AppLayout>
  );
}