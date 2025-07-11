"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Clock, TrendingUp, Loader2, ShoppingCart, Sparkles, RefreshCw, MessageSquare, Notebook, Info, X, Users, ArrowLeft, Crown, Trash2 } from 'lucide-react';
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
import { useLoading } from '@/contexts/loading-context';

interface FamilyBoardPost {
  id: string;
  product_name: string;
  memo?: string | null;
  created_at: string;
  expires_at: string;
  user_id: string;
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

interface FamilyGroup {
  id: string;
  name: string;
  owner_id: string;
  userRole: 'owner' | 'member';
  members: {
    user_id: string;
    role: string;
    app_profiles: {
      display_name: string;
      avatar_url?: string;
    };
  }[];
}

export default function FamilyBoardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const { showLoading, hideLoading } = useLoading();
  
  const [posts, setPosts] = useState<FamilyBoardPost[]>([]);
  const [rankings, setRankings] = useState<ProductRanking[]>([]);
  const [currentGroup, setCurrentGroup] = useState<FamilyGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productInput, setProductInput] = useState('');
  const [memo, setMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // 未ログインの場合はリダイレクト
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=${encodeURIComponent('/board/family')}`);
    }
  }, [status, router]);

  // グループ情報と投稿を取得
  const fetchGroupData = useCallback(async () => {
    try {
      const response = await fetch('/api/board/family');
      if (!response.ok) {
        throw new Error('データの取得に失敗しました');
      }
      const data = await response.json();
      
      if (!data.group) {
        // グループに参加していない場合
        router.push('/family-group');
        return;
      }
      
      setCurrentGroup(data.group);
      setPosts(data.posts || []);
      setRankings(data.rankings || []);
    } catch (error) {
      console.error('Data fetch error:', error);
      toast({
        title: "エラー",
        description: "データの取得に失敗しました",
        variant: "destructive",
        duration: 1000,
      });
    }
  }, [router, toast]);

  // 初回読み込み
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchGroupData();
      setLoading(false);
    };

    if (status === 'authenticated') {
      loadData();
    }
  }, [status, fetchGroupData]);

  // 自動更新（1分ごと）
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      fetchGroupData();
    }, 60000);

    return () => clearInterval(interval);
  }, [session, fetchGroupData]);

  // 投稿の送信
  const handleSubmitPost = async () => {
    if (!session?.user?.id || !currentGroup) {
      toast({
        title: "エラー",
        description: "ログインとグループ参加が必要です",
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
      const response = await fetch('/api/board/family', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_name: productInput.trim(),
          memo: memo.trim() || null,
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
      await fetchGroupData();
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

  // 投稿削除
  const handleDeletePost = async (postId: string) => {
    if (!confirm('この投稿を削除しますか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/board/family?id=${postId}`, {
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
      await fetchGroupData();
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message || "削除に失敗しました",
        variant: "destructive",
        duration: 1000,
      });
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
    await fetchGroupData();
    setLastRefresh(new Date());
    hideLoading();
    toast({
      title: "更新しました",
      description: "最新の投稿情報を取得しました。",
      duration: 1000,
    });
  };

  if (status === 'loading' || loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-4">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-green-500" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!currentGroup) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-4">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-white/80 backdrop-blur-sm border-green-200 shadow-lg">
              <CardContent className="p-8 text-center">
                <Users className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-4">グループに参加していません</h2>
                <p className="text-gray-600 mb-6">
                  家族掲示板を利用するには、まずグループを作成するか、招待を受けてグループに参加してください。
                </p>
                <Button
                  onClick={() => router.push('/family-group')}
                  className="bg-green-500 hover:bg-green-600"
                >
                  グループ管理へ
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* ヘッダー */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="relative bg-gradient-to-br from-green-50 to-emerald-100 border-4 border-green-300 rounded-lg p-3 shadow-lg">
              <div className="absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 border-green-400"></div>
              <div className="absolute top-1 right-1 w-3 h-3 border-r-2 border-t-2 border-green-400"></div>
              <div className="absolute bottom-1 left-1 w-3 h-3 border-l-2 border-b-2 border-green-400"></div>
              <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-green-400"></div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-6 h-0.5 bg-green-400"></div>
                  <Users className="h-5 w-5 text-green-600" />
                  <div className="w-6 h-0.5 bg-green-400"></div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-base text-green-800 font-medium">
                    {currentGroup.name}
                  </p>
                  <p className="text-base text-green-900 font-bold flex items-center justify-center space-x-1">
                    <ShoppingCart className="h-4 w-4 text-green-500" />
                    <span>家族専用買い物掲示板</span>
                    <ShoppingCart className="h-4 w-4 text-green-500" />
                  </p>
                </div>
                
                <div className="flex items-center justify-center space-x-2 text-sm text-green-700">
                  <div className="w-8 h-0.5 bg-green-300"></div>
                  <span className="font-medium">メンバー限定で<br />買い物情報を共有</span>
                  <div className="w-8 h-0.5 bg-green-300"></div>
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
                <ArrowLeft className="h-4 w-4 mr-1" />
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
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 px-8 py-4 text-lg font-semibold rounded-full flex items-center space-x-3"
              type="button"
            >
              <span>今日買うものを投稿</span>
              <Users className="h-5 w-5" />
            </button>
          </motion.div>

          {/* グループメンバー */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-green-200 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-green-500" />
                    <h2 className="text-lg font-semibold text-gray-800">
                      グループメンバー
                    </h2>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {currentGroup.members.length}人
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {currentGroup.members.map((member) => (
                    <div
                      key={member.user_id}
                      className="flex items-center space-x-2 bg-gray-50 rounded-full px-3 py-1"
                    >
                      <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                        {member.app_profiles?.avatar_url ? (
                          <img
                            src={member.app_profiles.avatar_url}
                            alt={member.app_profiles.display_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="h-3 w-3 text-gray-600" />
                        )}
                      </div>
                      <span className="text-sm text-gray-700">
                        {member.app_profiles?.display_name || '名前未設定'}
                      </span>
                      {member.role === 'owner' && (
                        <Crown className="h-3 w-3 text-yellow-500" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ランキング */}
          {rankings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm border-green-200 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <h2 className="text-xl font-semibold text-gray-800">
                        グループ内人気商品
                      </h2>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      家族限定
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
            <Card className="bg-white/80 backdrop-blur-sm border-green-200 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center space-x-2 text-gray-800">
                    <ShoppingCart className="h-5 w-5 text-green-500" />
                    <span>グループの投稿</span>
                  </h2>
                  <div className="text-sm text-gray-500">
                    最終更新: {formatDistanceToNow(lastRefresh, { addSuffix: true, locale: ja })}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {posts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">まだ投稿がありません</p>
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
            <Card className="bg-green-50/80 backdrop-blur-sm border-green-200 shadow-lg">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-green-900 flex items-center justify-center space-x-2">
                      <Info className="h-5 w-5 text-green-600" />
                      <span>家族掲示板について</span>
                    </h3>
                  </div>
                  
                  <div className="grid gap-3">
                    <div className="flex items-start space-x-3 p-2.5 rounded-lg bg-white/50">
                      <Users className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-green-900 mb-0.5">
                          メンバー限定
                        </p>
                        <p className="text-xs text-green-800">
                          グループメンバーのみが投稿を閲覧・投稿できます。
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-2.5 rounded-lg bg-white/50">
                      <Clock className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-green-900 mb-0.5">
                          自動削除について
                        </p>
                        <p className="text-xs text-green-800">
                          投稿は<strong>5時間後に自動削除</strong>されます。
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-2.5 rounded-lg bg-white/50">
                      <ShoppingCart className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-green-900 mb-0.5">
                          買い物メモ連携
                        </p>
                        <p className="text-xs text-green-800">
                          投稿した商品は自動的に買い物メモに追加されます。
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
          description="グループメンバーと買い物情報を共有します。"
          className="max-w-lg"
        >
          <div className="space-y-6">
            {/* 注意メッセージ */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800 mb-1">
                    グループメンバー限定
                  </p>
                  <p className="text-xs text-green-700">
                    この投稿は<strong>「{currentGroup.name}」のメンバーのみ</strong>が閲覧できます。
                  </p>
                </div>
              </div>
            </div>

            {/* 商品入力 */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-800 flex items-center">
                <ShoppingCart className="h-4 w-4 mr-2 text-green-500" />
                買うものを入力してください
              </label>
              
              <div className="relative">
                <div className="relative">
                  <Input
                    value={productInput}
                    onChange={(e) => setProductInput(e.target.value)}
                    placeholder="商品名を入力してください（50文字以内）"
                    className="h-12 text-base border-2 border-gray-200 hover:border-green-300 focus:border-green-500 transition-colors"
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
                <MessageSquare className="h-4 w-4 mr-2 text-green-500" />
                メモ（任意）
              </label>
              <Textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="具体的な商品名や希望（値段や数量など）をご記入ください（100文字まで）"
                className="min-h-32 text-base border-2 border-gray-200 hover:border-green-300 focus:border-green-500 transition-colors resize-none"
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
                className="flex-1 h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    投稿中...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
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
