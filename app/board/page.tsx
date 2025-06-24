"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Clock, TrendingUp, Loader2, ShoppingCart, Sparkles, RefreshCw, Calendar, MessageSquare, ShoppingBag, Notebook, Info, Mail, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CustomModal } from '@/components/ui/custom-modal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import AppLayout from '@/components/layout/app-layout';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

// 掲示板リクエストの型定義
interface BoardRequest {
  id: string;
  product_name: string;
  memo?: string | null;  // memoフィールドを追加
  created_at: string;
  expires_at: string;
}

// ランキング用の型定義
interface ProductRanking {
  product_name: string;
  count: number;
  rank: number;
}

// 買い物メモアイテムの型定義（ローカルストレージ用）
interface MemoItem {
  id: string;
  name: string;
  checked: boolean;
}

// 商品選択肢（カテゴリ別に整理）- 全てひらがなに統一
const PRODUCT_CATEGORIES = {
  '野菜': [
    'とまと', 'きゅうり', 'たまねぎ', 'にんじん', 'じゃがいも', 
    'きゃべつ', 'れたす', 'ぴーまん', 'なす', 'ぶろっこりー', 
    'ほうれんそう', 'だいこん', 'もやし', 'ごーやー', 'おくら',
    'かぼちゃ', 'とうもろこし', 'いんげん', 'あすぱらがす', 'せろり',
    'ちんげんさい', 'はくさい', 'みずな', 'にら', 'ねぎ',
    'らっきょう', 'しょうが', 'にんにく', 'ごぼう', 'れんこん',
    'たけのこ', 'しいたけ', 'えのき', 'しめじ', 'まいたけ',
    'えりんぎ', 'なめこ', 'きくらげ', 'わかめ', 'のり',
    'こまつな', 'みつば', 'しそ', 'ぱせり', 'ばじる',
    'ろーずまりー', 'たいむ', 'せーじ', 'おれがの', 'みんと',
    'かいわれだいこん', 'すぷらうと', 'べびーりーふ', 'るっこら', 'くれそん',
    'えんどうまめ', 'そらまめ', 'だいず', 'あずき', 'いんげんまめ',
    'らでぃっしゅ', 'かぶ', 'やまいも', 'さといも', 'さつまいも'
  ],
  '果物': [
    'ばなな', 'りんご', 'みかん', 'いちご', 'ぶどう', 'めろん', 
    'すいか', 'ぱいなっぷる', 'きうい', 'おれんじ', 'れもん',
    'らいむ', 'ぐれーぷふるーつ', 'もも', 'なし', 'かき',
    'ぷらむ', 'あんず', 'さくらんぼ', 'ぶるーべりー', 'らずべりー',
    'いちじく', 'ざくろ', 'まんごー', 'ぱぱいや', 'どらごんふるーつ'
  ],
  '肉類': [
    'ぶたにく', 'とりにく', 'ぎゅうにく', 'ひきにく', 'そーせーじ', 
    'はむ', 'べーこん', 'らむにく', 'あいにく', 'しかにく'
  ],
  '魚介類': [
    'さかな', 'さーもん', 'まぐろ', 'えび', 'いか', 'たこ', 
    'あじ', 'さば', 'いわし', 'さんま', 'ぶり', 'たい',
    'ひらめ', 'かれい', 'あなご', 'うなぎ', 'かに', 'ほたて',
    'あさり', 'しじみ', 'はまぐり', 'むーる貝'
  ],
  '乳製品・卵': [
    'ぎゅうにゅう', 'たまご', 'ちーず', 'よーぐると', 'ばたー',
    'せいくりーむ', 'あいすくりーむ', 'こんでんすみるく'
  ],
  '主食': [
    'ぱん', 'おこめ', 'ぱすた', 'うどん', 'そば', 'らーめん',
    'そーめん', 'ひやむぎ', 'やきそば', 'おにぎり', 'もち'
  ],
  'その他': [
    'ちょうみりょう', 'れいとうしょくひん', 'おかし', 'のみもの',
    'じゅーす', 'こーひー', 'こうちゃ', 'りょくちゃ', 'みず',
    'びーる', 'わいん', 'にほんしゅ', 'しょうちゅう', 'その他'
  ]
};

export default function BoardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [productInput, setProductInput] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requests, setRequests] = useState<BoardRequest[]>([]);
  const [rankings, setRankings] = useState<ProductRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { toast } = useToast();
  const router = useRouter();
  const [memo, setMemo] = useState('');

  // 全商品リストを作成
  const allProducts = useMemo(() => {
    return Object.values(PRODUCT_CATEGORIES).flat();
  }, []);

  // 検索候補をフィルタリング
  const filteredSuggestions = useMemo(() => {
    if (!productInput.trim()) return [];
    
    return allProducts.filter(product =>
      product.toLowerCase().includes(productInput.toLowerCase())
    ).slice(0, 10); // 最大10件まで表示
  }, [productInput, allProducts]);

  // 入力値が有効な商品かチェック
  const isValidProduct = useMemo(() => {
    return allProducts.includes(productInput);
  }, [productInput, allProducts]);

  // 掲示板リクエストを取得（有効期限内のもののみ）
  const fetchRequests = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('board_requests')
        .select('*')
        .gt('expires_at', now) // 有効期限内のもののみ
        .order('created_at', { ascending: false });

      if (error) {
        console.error('リクエスト取得エラー:', error);
        // エラーがあってもページは表示する
        setRequests([]);
        return;
      }

      setRequests(data || []);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('リクエスト取得エラー:', error);
      setRequests([]);
    }
  }, []);

  // ランキングを計算
  const calculateRankings = useCallback(() => {
    if (!requests.length) {
      setRankings([]);
      return;
    }

    const productCounts = requests.reduce((acc, request) => {
      acc[request.product_name] = (acc[request.product_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sortedProducts = Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([product_name, count], index) => ({
        product_name,
        count,
        rank: index + 1
      }));

    setRankings(sortedProducts);
  }, [requests]);

  // 期限切れリクエストを削除（クライアントサイドでの補助的な処理）
  const removeExpiredRequests = useCallback(() => {
    const now = new Date();
    setRequests(prev => prev.filter(request => new Date(request.expires_at) > now));
  }, []);

  // 初期データ読み込み
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchRequests();
      } catch (error) {
        console.error('Initial data loading error:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [fetchRequests]);

  // リクエストが更新されたらランキングを計算
  useEffect(() => {
    calculateRankings();
  }, [requests, calculateRankings]);

  // 定期的にデータを更新（期限切れチェック含む）
  useEffect(() => {
    const interval = setInterval(() => {
      removeExpiredRequests();
      fetchRequests();
    }, 60000); // 1分ごとに更新

    return () => clearInterval(interval);
  }, [removeExpiredRequests, fetchRequests]);

  // リアルタイム更新の設定
  useEffect(() => {
    const channel = supabase
      .channel('board-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'board_requests',
        },
        (payload) => {
          const newRequest = payload.new as BoardRequest;
          // 有効期限をチェック
          if (new Date(newRequest.expires_at) > new Date()) {
            setRequests((prev) => [newRequest, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 商品入力の処理
  const handleProductInputChange = (value: string) => {
    setProductInput(value);
    setSelectedProduct(value);
    setShowSuggestions(value.trim().length > 0);
  };

  // 候補選択の処理
  const handleSuggestionSelect = (product: string) => {
    setProductInput(product);
    setSelectedProduct(product);
    setShowSuggestions(false);
  };

  // 入力フィールドのクリア
  const handleClearInput = () => {
    setProductInput('');
    setSelectedProduct('');
    setShowSuggestions(false);
  };

  // 商品リクエストを送信
  const handleSubmitRequest = async () => {
    if (!selectedProduct || !isValidProduct) {
      toast({
        title: "入力エラー",
        description: "選択肢から商品を選択してください。",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. 掲示板に投稿（メモの有無に関わらず）
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 8);

      const { error } = await supabase
        .from('board_requests')
        .insert({
          product_name: selectedProduct,
          memo: memo.trim() || null,
          expires_at: expiresAt.toISOString(),
        });

      if (error) {
        throw error;
      }

      // 2. 買い物メモに追加（メモの有無に関わらず）
      addToShoppingMemo(selectedProduct);

      // 3. 成功通知
      if (memo.trim()) {
        toast({
          title: "✨ リクエストを送信しました！",
          description: `${selectedProduct}のリクエストが掲示板に追加され、買い物メモにも追加されました。`,
        });
      } else {
        toast({
          title: "✨ リクエストを送信しました！",
          description: `${selectedProduct}のリクエストが掲示板に追加され、買い物メモにも追加されました。`,
        });
      }

      setIsModalOpen(false);
      setSelectedProduct('');
      setProductInput('');
      setMemo('');
      
      // 手動でデータを更新
      await fetchRequests();
    } catch (error) {
      console.error('リクエスト送信エラー:', error);
      toast({
        title: "エラーが発生しました",
        description: "リクエストの送信に失敗しました。もう一度お試しください。",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 買い物メモに追加（既存のリクエストから）
  const addToShoppingMemo = (productName: string) => {
    try {
      // ローカルストレージから既存のメモを取得
      const existingMemo = localStorage.getItem('shoppingMemo');
      let memoItems: MemoItem[] = existingMemo ? JSON.parse(existingMemo) : [];
      
      // 同じ商品が既に存在するかチェック
      const isDuplicate = memoItems.some(item => item.name === productName);
      if (isDuplicate) {
        toast({
          title: "既に追加済みです",
          description: `${productName}は既に買い物メモに追加されています。`,
          variant: "default",
        });
        return;
      }

      // 新しいアイテムを追加
      const newItem: MemoItem = {
        id: crypto.randomUUID(),
        name: productName,
        checked: false
      };
      
      memoItems = [newItem, ...memoItems];
      localStorage.setItem('shoppingMemo', JSON.stringify(memoItems));
      
      toast({
        title: "🛒 買い物メモに追加しました！",
        description: `${productName}を買い物メモに追加しました。`,
      });
    } catch (error) {
      console.error('買い物メモ追加エラー:', error);
      toast({
        title: "エラーが発生しました",
        description: "買い物メモへの追加に失敗しました。",
        variant: "destructive",
      });
    }
  };

  // モーダルを開く
  const handleOpenModal = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setIsModalOpen(true);
    setSelectedProduct('');
    setProductInput('');
    setShowSuggestions(false);
    setMemo('');
  }, []);

  // モーダルを閉じる
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedProduct('');
    setProductInput('');
    setShowSuggestions(false);
    setMemo('');
  }, []);

  // 手動リフレッシュ
  const handleRefresh = async () => {
    setLoading(true);
    await fetchRequests();
    setLoading(false);
    toast({
      title: "更新しました",
      description: "最新のリクエスト情報を取得しました。",
    });
  };

  // タイムラインページへの遷移
  const handleGoToTimeline = () => {
    router.push('/timeline');
  };

  // 買い物メモページへの遷移
  const handleGoToMemo = () => {
    router.push('/memo');
  };

  // 問い合わせページへの遷移
  const handleGoToContact = () => {
    router.push('/contact');
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* ヘッダー */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            {/* お品書き風のデザイン */}
            <div className="relative bg-gradient-to-br from-amber-50 to-orange-100 border-4 border-amber-300 rounded-lg p-3 shadow-lg">
              {/* 装飾的な角の要素 */}
              <div className="absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 border-amber-400"></div>
              <div className="absolute top-1 right-1 w-3 h-3 border-r-2 border-t-2 border-amber-400"></div>
              <div className="absolute bottom-1 left-1 w-3 h-3 border-l-2 border-b-2 border-amber-400"></div>
              <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-amber-400"></div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-6 h-0.5 bg-amber-400"></div>
                  <ShoppingCart className="h-5 w-5 text-amber-600" />
                  <div className="w-6 h-0.5 bg-amber-400"></div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-base text-amber-800 font-medium">
                    今日買うものを投稿すると
                  </p>
                  <p className="text-base text-amber-900 font-bold flex items-center justify-center space-x-1">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    <span>お得な情報が手に入るかも？</span>
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                  </p>
                </div>
                
                <div className="flex items-center justify-center space-x-2 text-sm text-amber-700">
                  <div className="w-8 h-0.5 bg-amber-300"></div>
                  <span className="font-medium">今日買うものを入力すると、<br />自動的に買い物メモに追加されます。</span>
                  <div className="w-8 h-0.5 bg-amber-300"></div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-center space-x-4">
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
                onClick={handleGoToTimeline}
                className="bg-[#73370c] hover:bg-[#5c2c0a] text-white font-medium border-0 shadow-sm"
              >
                <Clock className="h-4 w-4 mr-1" />
                タイムライン画面へ
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleGoToMemo}
                className="bg-[#22c55d] hover:bg-[#16a34a] text-white font-medium border-0 shadow-sm"
              >
                <Notebook className="h-4 w-4 mr-1" />
                買い物メモ
              </Button>
            </div>
          </motion.div>

          {/* リクエストボタン */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center"
          >
            <button
              onClick={handleOpenModal}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 px-8 py-4 text-lg font-semibold rounded-full flex items-center space-x-3"
              type="button"
            >
              <Plus className="h-6 w-6" />
              <span>今日買うものを入力</span>
              <Sparkles className="h-5 w-5" />
            </button>
          </motion.div>

          {/* ランキング */}
          {rankings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm border-orange-200 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-orange-500" />
                      <h2 className="text-xl font-semibold" style={{ color: '#73370c' }}>
                        人気商品ランキング
                      </h2>
                    </div>
                    <div className="text-sm text-gray-500">
                      （随時更新中）
                    </div>
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

          {/* 今日買うもの一覧 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-orange-200 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center space-x-2" style={{ color: '#73370c' }}>
                    <ShoppingCart className="h-5 w-5 text-orange-500" />
                    <span>みんなの今日買うもの</span>
                  </h2>
                  <div className="text-sm text-gray-500">
                    最終更新: {formatDistanceToNow(lastRefresh, { addSuffix: true, locale: ja })}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">現在投稿はありません</p>
                    <p className="text-sm">最初の投稿をしてみましょう！</p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    <AnimatePresence>
                      {requests.map((request, index) => (
                        <motion.div
                          key={request.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="mb-1">
                                <span className="font-medium text-gray-900">
                                  {request.product_name}
                                </span>
                              </div>
                              
                              {/* メモがある場合のみ表示 */}
                              {request.memo && request.memo.trim() && (
                                <div className="flex items-start space-x-1 mb-2">
                                  <MessageSquare className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-gray-600 leading-relaxed">
                                    {request.memo}
                                  </p>
                                </div>
                              )}
                              
                              {/* 投稿日時を表示 */}
                              <div className="flex items-center space-x-2">
                                <Clock className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {formatDistanceToNow(new Date(request.created_at), {
                                    addSuffix: true,
                                    locale: ja,
                                  })}
                                </span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-500">
                                  {new Date(request.created_at).toLocaleString('ja-JP', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </div>
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
                  {/* タイトルを中央配置 */}
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-blue-900 flex items-center justify-center space-x-2">
                      <Info className="h-5 w-5 text-blue-600" />
                      <span>ご利用について</span>
                    </h3>
                  </div>
                  
                  {/* 説明項目をバランスよく配置 */}
                  <div className="grid gap-3">
                    <div className="flex items-start space-x-3 p-2.5 rounded-lg bg-white/50">
                      <Clock className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-blue-900 mb-0.5">
                          自動削除について
                        </p>
                        <p className="text-xs text-blue-800">
                          投稿は<strong>8時間後に自動削除</strong>されます。
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-2.5 rounded-lg bg-white/50">
                      <ShoppingCart className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-blue-900 mb-0.5">
                          買い物メモ連携
                        </p>
                        <p className="text-xs text-blue-800">
                          入力した商品は自動的に買い物メモにも追加されます。
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-2.5 rounded-lg bg-white/50">
                      <Mail className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-blue-900 mb-0.5">
                          商品追加のご要望
                        </p>
                        <p className="text-xs text-blue-800">
                          商品の選択肢に追加してほしい商品がございましたら、
                          <button
                            onClick={handleGoToContact}
                            className="text-blue-600 hover:text-blue-800 underline font-medium mx-1 transition-colors"
                          >
                            問い合わせ画面
                          </button>
                          よりご連絡ください。
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
          onClose={handleCloseModal}
          title="今日買うものを入力"
          description="商品を選択して投稿すると、ボードに表示され、同時に買い物メモにも追加されます。"
          className="max-w-lg"
        >
          <div className="space-y-6">
            {/* 商品入力 */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-800 flex items-center">
                <ShoppingCart className="h-4 w-4 mr-2 text-orange-500" />
                買うものを選択してください（ひらがな）
              </label>
              
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={productInput}
                    onChange={(e) => handleProductInputChange(e.target.value)}
                    onFocus={() => setShowSuggestions(productInput.trim().length > 0)}
                    placeholder="商品名を入力してください..."
                    className={cn(
                      "h-12 pl-10 pr-10 text-base border-2 transition-colors",
                      isValidProduct || !productInput 
                        ? "border-gray-200 hover:border-orange-300 focus:border-orange-500" 
                        : "border-red-300 hover:border-red-400 focus:border-red-500"
                    )}
                    style={{ fontSize: '16px' }}
                  />
                  {productInput && (
                    <button
                      onClick={handleClearInput}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* 検索候補 */}
                <AnimatePresence>
                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                    >
                      {filteredSuggestions.map((product, index) => (
                        <button
                          key={product}
                          onClick={() => handleSuggestionSelect(product)}
                          className="w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <span className="font-medium text-gray-900">{product}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* バリデーションメッセージ */}
                {productInput && !isValidProduct && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-red-600 mt-1 flex items-center"
                  >
                    <Info className="h-3 w-3 mr-1" />
                    選択肢から商品を選択してください
                  </motion.p>
                )}
              </div>
            </div>

            {/* メモ入力 */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-800 flex items-center">
                <MessageSquare className="h-4 w-4 mr-2 text-orange-500" />
                メモ（任意）
              </label>
              <Textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="具体的な商品名や希望（値段や数量など）をご記入ください（100文字まで）"
                className="min-h-32 text-base border-2 border-gray-200 hover:border-orange-300 focus:border-orange-500 transition-colors resize-none"
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
                onClick={handleCloseModal}
                className="flex-1 h-12 border-2 hover:bg-gray-50"
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleSubmitRequest}
                disabled={!selectedProduct || !isValidProduct || isSubmitting}
                className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    投稿中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
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
