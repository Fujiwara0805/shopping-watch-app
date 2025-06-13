"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CustomModal } from '@/components/ui/custom-modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Star, 
  Calendar, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp,
  ChevronDown,
  Heart, 
  Share2, 
  MapPin,
  Clock,
  Store,
  Grid3X3,
  List,
  X,
  SlidersHorizontal,
  Copy,
  Edit3,
  Plus,
  Minus,
  RotateCcw,
  Check
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/app-layout';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useLocalStorage } from 'usehooks-ts';

// 簡素化された型定義
interface FlyerData {
  id: string;
  store_name: string;
  image_url: string;
  valid_from: string;
  valid_until: string;
  created_at: string;
}

interface FavoriteStore {
  id: string;
  name: string;
}

type DateFilter = 'all' | 'today' | 'tomorrow' | 'this_week';
type SortOption = 'newest' | 'ending_soon';

// 買い物メモアイテムの型定義（メモ機能と共通）
interface MemoItem {
  id: string;
  name: string;
  checked: boolean;
}

// チラシ上のメモアイテムの型定義
interface FlyerMemoItem {
  id: string;
  text: string;
  x: number;
  y: number;
  completed: boolean;
}

// ペン描画の型定義
interface DrawingPath {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

// チラシごとのメモと描画データを管理する型
interface FlyerAnnotations {
  [flyerId: string]: {
    memos: FlyerMemoItem[];
    drawings: DrawingPath[];
  };
}

export default function FlyersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  // 状態管理
  const [flyers, setFlyers] = useState<FlyerData[]>([]);
  const [filteredFlyers, setFilteredFlyers] = useState<FlyerData[]>([]);
  const [favoriteStores, setFavoriteStores] = useState<FavoriteStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [favoriteStoreFilter, setFavoriteStoreFilter] = useState<string>('all');

  // フルスクリーンビューア用の状態
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [currentFlyerIndex, setCurrentFlyerIndex] = useState(0);
  
  // スワイプ検出用
  const constraintsRef = useRef<HTMLDivElement>(null);

  // フルスクリーンビューア用の新しい状態
  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showDrawingTools, setShowDrawingTools] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
  const [penColor, setPenColor] = useState('#ff0000');
  const [penWidth, setPenWidth] = useState(3);
  const [showMemoInput, setShowMemoInput] = useState(false);
  const [memoPosition, setMemoPosition] = useState({ x: 0, y: 0 });
  const [memoText, setMemoText] = useState('');

  // チラシごとのメモと描画データを管理
  const [flyerAnnotations, setFlyerAnnotations] = useState<FlyerAnnotations>({});

  // メモ機能と共有するローカルストレージ
  const [shoppingMemo, setShoppingMemo] = useLocalStorage<MemoItem[]>('shoppingMemo', []);

  // 現在のチラシのメモと描画データを取得
  const currentFlyerId = filteredFlyers[currentFlyerIndex]?.id;
  const currentAnnotations = currentFlyerId ? flyerAnnotations[currentFlyerId] : null;
  const currentMemos = currentAnnotations?.memos || [];
  const currentDrawings = currentAnnotations?.drawings || [];

  // チラシデータの取得
  const fetchFlyers = useCallback(async () => {
    try {
      setLoading(true);
      
      // サンプルデータ（実際の実装では Supabase から取得）
      const sampleFlyers: FlyerData[] = [
        {
          id: '1',
          store_name: 'スーパーマーケットA',
          image_url: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1749786282/%E3%82%B9%E3%83%BC%E3%83%8F%E3%82%9A%E3%83%BC%E5%BA%83%E5%91%8A%E3%83%81%E3%83%A9%E3%82%B7_jgkh9h.png',
          valid_from: new Date().toISOString(),
          valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          store_name: 'ドラッグストアB',
          image_url: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1749786282/%E3%82%B9%E3%83%BC%E3%83%8F%E3%82%9A%E3%83%BC%E5%BA%83%E5%91%8A%E3%83%81%E3%83%A9%E3%82%B7_jgkh9h.png',
          valid_from: new Date().toISOString(),
          valid_until: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          store_name: '家電量販店C',
          image_url: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1749786282/%E3%82%B9%E3%83%BC%E3%83%8F%E3%82%9A%E3%83%BC%E5%BA%83%E5%91%8A%E3%83%81%E3%83%A9%E3%82%B7_jgkh9h.png',
          valid_from: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          valid_until: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        }
      ];
      
      setFlyers(sampleFlyers);
    } catch (error) {
      console.error('チラシの取得に失敗しました:', error);
      toast({
        title: "エラー",
        description: "チラシの取得に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // お気に入り店舗の取得
  const fetchFavoriteStores = useCallback(async () => {
    if (!session?.user?.id) return;
    
    try {
      // サンプルデータ（実際の実装では Supabase から取得）
      const sampleFavorites: FavoriteStore[] = [
        { id: 'store1', name: 'スーパーマーケットA' },
        { id: 'store2', name: 'ドラッグストアB' }
      ];
      
      setFavoriteStores(sampleFavorites);
    } catch (error) {
      console.error('お気に入り店舗の取得に失敗しました:', error);
    }
  }, [session?.user?.id]);

  // フィルタリング処理
  const applyFilters = useCallback(() => {
    let filtered = [...flyers];

    // 検索クエリでフィルタ
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(flyer => 
        flyer.store_name.toLowerCase().includes(query)
      );
    }

    // 日付でフィルタ
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(flyer => {
        const validFrom = parseISO(flyer.valid_from);
        const validUntil = parseISO(flyer.valid_until);
        
        switch (dateFilter) {
          case 'today':
            return isToday(validFrom) || (validFrom <= now && validUntil >= now && isToday(now));
          case 'tomorrow':
            return isTomorrow(validFrom) || (validFrom <= now && validUntil >= now && isTomorrow(now));
          case 'this_week':
            const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            return validFrom <= weekFromNow && validUntil >= now;
          default:
            return true;
        }
      });
    }

    // お気に入り店舗でフィルタ
    if (favoriteStoreFilter !== 'all') {
      filtered = filtered.filter(flyer => 
        favoriteStores.some(store => store.name === flyer.store_name)
      );
    }

    // ソート
    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'ending_soon':
          return new Date(a.valid_until).getTime() - new Date(b.valid_until).getTime();
        default:
          return 0;
      }
    });

    setFilteredFlyers(filtered);
  }, [flyers, searchQuery, dateFilter, sortOption, favoriteStoreFilter, favoriteStores]);

  // 初期化
  useEffect(() => {
    fetchFlyers();
    fetchFavoriteStores();
  }, [fetchFlyers, fetchFavoriteStores]);

  // フィルタ適用
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // フルスクリーンビューアを開く
  const openFullScreen = (index: number) => {
    setCurrentFlyerIndex(index);
    setIsFullScreenOpen(true);
  };

  // フルスクリーンナビゲーション
  const handleNext = useCallback(() => {
    if (isTransitioning) return;
    if (currentFlyerIndex < filteredFlyers.length - 1) {
      setIsTransitioning(true);
      setCurrentFlyerIndex(currentFlyerIndex + 1);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [currentFlyerIndex, filteredFlyers.length, isTransitioning]);

  const handlePrevious = useCallback(() => {
    if (isTransitioning) return;
    if (currentFlyerIndex > 0) {
      setIsTransitioning(true);
      setCurrentFlyerIndex(currentFlyerIndex - 1);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [currentFlyerIndex, isTransitioning]);

  // フルスクリーンビューアを閉じる関数を修正
  const closeFullScreen = useCallback(() => {
    setIsFullScreenOpen(false);
    setShowDrawingTools(false);
    setIsDrawing(false);
    setCurrentPath(null);
    setShowMemoInput(false);
    setMemoText('');
  }, []);

  // キーボードナビゲーション
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isFullScreenOpen) return;

      switch (event.key) {
        case 'Escape':
          closeFullScreen();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 'ArrowUp':
          handlePrevious();
          break;
        case 'ArrowDown':
          handleNext();
          break;
      }
    };

    if (isFullScreenOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isFullScreenOpen, handleNext, handlePrevious, closeFullScreen]);

  // スワイプハンドラー（改良版）
  const handlePanEnd = useCallback((event: any, info: PanInfo) => {
    const threshold = 100;
    const velocity = 300;

    // 水平スワイプ
    if (Math.abs(info.offset.x) > Math.abs(info.offset.y)) {
      setDirection('horizontal');
      if (info.offset.x > threshold || info.velocity.x > velocity) {
        handlePrevious();
      } else if (info.offset.x < -threshold || info.velocity.x < -velocity) {
        handleNext();
      }
    }
    // 垂直スワイプ
    else {
      setDirection('vertical');
      if (info.offset.y > threshold || info.velocity.y > velocity) {
        handlePrevious();
      } else if (info.offset.y < -threshold || info.velocity.y < -velocity) {
        handleNext();
      }
    }
  }, [handleNext, handlePrevious]);

  // ペン描画機能
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!showDrawingTools || !currentFlyerId) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newPath: DrawingPath = {
      id: Date.now().toString(),
      points: [{ x, y }],
      color: penColor,
      width: penWidth
    };
    
    setCurrentPath(newPath);
    setIsDrawing(true);
  }, [showDrawingTools, penColor, penWidth, currentFlyerId]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !currentPath) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentPath({
      ...currentPath,
      points: [...currentPath.points, { x, y }]
    });
  }, [isDrawing, currentPath]);

  const handleMouseUp = useCallback(() => {
    if (currentPath && currentFlyerId) {
      setFlyerAnnotations(prev => ({
        ...prev,
        [currentFlyerId]: {
          ...prev[currentFlyerId],
          memos: prev[currentFlyerId]?.memos || [],
          drawings: [...(prev[currentFlyerId]?.drawings || []), currentPath]
        }
      }));
      setCurrentPath(null);
    }
    setIsDrawing(false);
  }, [currentPath, currentFlyerId]);

  // 買い物メモ追加（メモ機能に反映）
  const handleAddMemo = useCallback((e: React.MouseEvent) => {
    if (showDrawingTools) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMemoPosition({ x, y });
    setShowMemoInput(true);
  }, [showDrawingTools]);

  const handleSaveMemo = useCallback(() => {
    if (memoText.trim() && currentFlyerId) {
      // チラシ上のメモとして追加
      const newFlyerMemo: FlyerMemoItem = {
        id: Date.now().toString(),
        text: memoText.trim(),
        x: memoPosition.x,
        y: memoPosition.y,
        completed: false
      };
      
      setFlyerAnnotations(prev => ({
        ...prev,
        [currentFlyerId]: {
          ...prev[currentFlyerId],
          memos: [...(prev[currentFlyerId]?.memos || []), newFlyerMemo],
          drawings: prev[currentFlyerId]?.drawings || []
        }
      }));

      // メモ機能のローカルストレージにも追加
      const newMemoItem: MemoItem = {
        id: crypto.randomUUID(),
        name: memoText.trim(),
        checked: false
      };
      
      setShoppingMemo(prev => [newMemoItem, ...prev]);
      
      setMemoText('');
      setShowMemoInput(false);
      
      toast({
        title: "メモを追加しました",
        description: `「${memoText.trim()}」を買い物メモに追加しました`,
      });
    }
  }, [memoText, memoPosition, setShoppingMemo, toast, currentFlyerId]);

  // 現在のチラシのメモと描画をクリア
  const clearCurrentAnnotations = useCallback(() => {
    if (currentFlyerId) {
      setFlyerAnnotations(prev => ({
        ...prev,
        [currentFlyerId]: {
          memos: [],
          drawings: []
        }
      }));
      setCurrentPath(null);
      toast({
        title: "クリアしました",
        description: "メモと描画をクリアしました",
      });
    }
  }, [currentFlyerId, toast]);

  // 店名をコピーする関数
  const copyStoreName = (storeName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(storeName);
    toast({
      title: "コピーしました",
      description: `${storeName}をクリップボードにコピーしました`,
    });
  };

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) return '今日';
    if (isTomorrow(date)) return '明日';
    return format(date, 'M/d', { locale: ja });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-80 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* 検索・フィルターバー */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {/* 検索バーと絞り込みボタン */}
          <div className="flex gap-2">
            <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="チラシを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(true)}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              絞り込み
            </Button>
          </div>

          {/* 今日・明日タブ（横幅均等） */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={dateFilter === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')}
              className="w-full"
            >
              <Calendar className="h-4 w-4 mr-1" />
              今日
            </Button>
            <Button
              variant={dateFilter === 'tomorrow' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter(dateFilter === 'tomorrow' ? 'all' : 'tomorrow')}
              className="w-full"
            >
              <Calendar className="h-4 w-4 mr-1" />
              明日
            </Button>
          </div>
        </motion.div>

        {/* チラシ一覧（画像のみ表示） */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {filteredFlyers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                条件に合うチラシが見つかりませんでした
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFlyers.map((flyer, index) => (
                <FlyerListItem
                  key={flyer.id}
                  flyer={flyer}
                  onClick={() => openFullScreen(index)}
                  onCopyStoreName={copyStoreName}
                  hasMemo={flyerAnnotations[flyer.id]?.memos?.length > 0}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* フィルターモーダル */}
      <CustomModal
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        title="フィルター設定"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">期間</label>
            <Select value={dateFilter} onValueChange={(value: DateFilter) => setDateFilter(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="today">今日</SelectItem>
                <SelectItem value="tomorrow">明日</SelectItem>
                <SelectItem value="this_week">今週</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">お気に入り店舗</label>
            <Select value={favoriteStoreFilter} onValueChange={setFavoriteStoreFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {favoriteStores.map(store => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">並び順</label>
            <Select value={sortOption} onValueChange={(value: SortOption) => setSortOption(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">新着順</SelectItem>
                <SelectItem value="ending_soon">終了間近順</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setDateFilter('all');
                setFavoriteStoreFilter('all');
                setSortOption('newest');
              }}
            >
              リセット
            </Button>
            <Button
              className="flex-1"
              onClick={() => setShowFilters(false)}
            >
              適用
            </Button>
          </div>
        </div>
      </CustomModal>

      {/* 改良されたフルスクリーンビューア */}
      <AnimatePresence>
        {isFullScreenOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeFullScreen();
              }
            }}
          >
            {/* ヘッダーコントロール */}
            <div className="absolute top-0 left-0 right-0 z-60 bg-gradient-to-b from-black/50 to-transparent p-4">
              <div className="flex items-center justify-between">
                {/* 閉じるボタン */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 rounded-full"
                  onClick={closeFullScreen}
                >
                  <X className="h-6 w-6" />
                </Button>

                {/* インジケーター */}
                <div className="flex space-x-1">
                  {filteredFlyers.map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        "w-8 h-1 rounded-full transition-all duration-300",
                        index === currentFlyerIndex ? "bg-white" : "bg-white/30"
                      )}
                    />
                  ))}
                </div>

                {/* カウンター */}
                <div className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
                  {currentFlyerIndex + 1} / {filteredFlyers.length}
                </div>
              </div>
            </div>

            {/* メインコンテンツ */}
            <motion.div
              className="w-full h-full max-w-4xl mx-auto flex items-center justify-center p-4"
              drag={!showDrawingTools}
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={0.2}
              onPanEnd={handlePanEnd}
              whileDrag={{ scale: 0.95 }}
            >
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentFlyerIndex}
                  custom={direction}
                  initial={{
                    opacity: 0,
                    x: direction === 'horizontal' ? 300 : 0,
                    y: direction === 'vertical' ? 300 : 0,
                    scale: 0.9,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    y: 0,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    x: direction === 'horizontal' ? -300 : 0,
                    y: direction === 'vertical' ? -300 : 0,
                    scale: 0.9,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    opacity: { duration: 0.2 },
                  }}
                  className="relative w-full h-full flex items-center justify-center"
                >
                  {/* チラシ画像 */}
                  <div 
                    className="relative max-w-full max-h-full cursor-grab active:cursor-grabbing"
                    onMouseDown={showDrawingTools ? handleMouseDown : handleAddMemo}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                  >
                    <img
                      src={filteredFlyers[currentFlyerIndex]?.image_url}
                      alt={`${filteredFlyers[currentFlyerIndex]?.store_name}のチラシ`}
                      className="max-w-full max-h-full object-contain"
                      draggable={false}
                    />

                    {/* ツールバー（画像の真ん中上に配置） */}
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-60 flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "text-white hover:bg-white/20 rounded-full",
                          showDrawingTools ? "bg-[#73370c]/80" : "bg-black/50"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDrawingTools(!showDrawingTools);
                        }}
                      >
                        <Edit3 className="h-5 w-5" />
                      </Button>
                      
                      {/* メモ・描画データクリアボタン */}
                      {(currentMemos.length > 0 || currentDrawings.length > 0) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20 rounded-full bg-[#f97415]/80"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearCurrentAnnotations();
                          }}
                        >
                          <RotateCcw className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                    
                    {/* 描画レイヤー */}
                    <svg 
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      style={{ zIndex: 10 }}
                    >
                      {currentDrawings.map(path => (
                        <polyline
                          key={path.id}
                          points={path.points.map(p => `${p.x},${p.y}`).join(' ')}
                          fill="none"
                          stroke={path.color}
                          strokeWidth={path.width}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ))}
                      {currentPath && (
                        <polyline
                          points={currentPath.points.map(p => `${p.x},${p.y}`).join(' ')}
                          fill="none"
                          stroke={currentPath.color}
                          strokeWidth={currentPath.width}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                    </svg>

                    {/* 買い物メモ */}
                    {currentMemos.map(memo => (
                      <div
                        key={memo.id}
                        className="absolute bg-yellow-400 text-black text-xs p-2 rounded shadow-lg max-w-32"
                        style={{ left: memo.x, top: memo.y, zIndex: 20 }}
                      >
                        <div className="flex items-center justify-between">
                          <span className={memo.completed ? 'line-through' : ''}>{memo.text}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-4 w-4 ml-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (currentFlyerId) {
                                setFlyerAnnotations(prev => ({
                                  ...prev,
                                  [currentFlyerId]: {
                                    ...prev[currentFlyerId],
                                    memos: prev[currentFlyerId]?.memos.map(m => 
                                      m.id === memo.id ? { ...m, completed: !m.completed } : m
                                    ) || [],
                                    drawings: prev[currentFlyerId]?.drawings || []
                                  }
                                }));
                              }
                            }}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* ナビゲーションエリア */}
                    {currentFlyerIndex > 0 && (
                      <div
                        className="absolute left-0 top-0 w-1/3 h-full cursor-pointer flex items-center justify-start pl-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrevious();
                        }}
                      >
                        <motion.div
                          className="bg-black/40 text-white rounded-full p-2 opacity-0 hover:opacity-100 transition-opacity"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <ChevronLeft className="h-6 w-6" />
                        </motion.div>
                      </div>
                    )}

                    {currentFlyerIndex < filteredFlyers.length - 1 && (
                      <div
                        className="absolute right-0 top-0 w-1/3 h-full cursor-pointer flex items-center justify-end pr-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNext();
                        }}
                      >
                        <motion.div
                          className="bg-black/40 text-white rounded-full p-2 opacity-0 hover:opacity-100 transition-opacity"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <ChevronRight className="h-6 w-6" />
                        </motion.div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* 描画ツール */}
            {showDrawingTools && (
              <div className="absolute top-20 left-4 z-60 bg-black/70 rounded-lg p-3 space-y-2">
                <div className="flex gap-2">
                  {['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'].map(color => (
                    <button
                      key={color}
                      className={cn(
                        "w-6 h-6 rounded-full border-2",
                        penColor === color ? "border-white" : "border-gray-400"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPenColor(color);
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPenWidth(Math.max(1, penWidth - 1));
                    }}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-white text-xs w-6 text-center">{penWidth}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPenWidth(Math.min(10, penWidth + 1));
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* フッター情報 */}
            <div className="absolute bottom-0 left-0 right-0 z-60 bg-gradient-to-t from-black/50 to-transparent p-4">
              <div className="text-center">
                {/* 店名情報 */}
                <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3 mb-4 inline-block">
                  <p className="text-white text-lg font-bold">
                    {filteredFlyers[currentFlyerIndex]?.store_name}
                  </p>
                  {/* メモ数を表示 */}
                  {currentMemos.length > 0 && (
                    <p className="text-white/70 text-sm">
                      メモ: {currentMemos.length}件
                    </p>
                  )}
                </div>

                {/* ナビゲーションヒント */}
                <div className="text-white/70 text-xs">
                  <div className="flex items-center justify-center space-x-4 mb-2">
                    <div className="flex items-center space-x-1">
                      <ChevronLeft className="h-4 w-4" />
                      <span>前へ</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>次へ</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="flex items-center justify-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <ChevronUp className="h-4 w-4" />
                      <span>スワイプ</span>
                      <ChevronDown className="h-4 w-4" />
                    </div>
                    <span>|</span>
                    <span>クリックでメモ追加</span>
                  </div>
                </div>
              </div>
            </div>

            {/* プリロード */}
            <div className="hidden">
              {currentFlyerIndex > 0 && filteredFlyers[currentFlyerIndex - 1] && (
                <img src={filteredFlyers[currentFlyerIndex - 1].image_url} alt="preload" />
              )}
              {currentFlyerIndex < filteredFlyers.length - 1 && filteredFlyers[currentFlyerIndex + 1] && (
                <img src={filteredFlyers[currentFlyerIndex + 1].image_url} alt="preload" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* メモ入力モーダル */}
      <CustomModal
        isOpen={showMemoInput}
        onClose={() => setShowMemoInput(false)}
        title="買い物メモを追加"
      >
        <div className="space-y-4">
          <Input
            placeholder="商品名を入力..."
            value={memoText}
            onChange={(e) => setMemoText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSaveMemo();
              }
            }}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowMemoInput(false)}
            >
              キャンセル
            </Button>
            <Button
              className="flex-1"
              onClick={handleSaveMemo}
              disabled={!memoText.trim()}
            >
              追加
            </Button>
          </div>
        </div>
      </CustomModal>
    </AppLayout>
  );
}

// チラシリストアイテムコンポーネント（メモ表示機能付き）
const FlyerListItem = ({ 
  flyer, 
  onClick, 
  onCopyStoreName,
  hasMemo = false
}: { 
  flyer: FlyerData; 
  onClick: () => void;
  onCopyStoreName: (storeName: string, e: React.MouseEvent) => void;
  hasMemo?: boolean;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer relative"
      onClick={onClick}
    >
      <div className="relative w-full h-48">
        <img
          src={flyer.image_url}
          alt={`${flyer.store_name}のチラシ`}
          className="w-full h-full object-cover"
          onError={(e) => {
            console.error('画像の読み込みに失敗しました:', flyer.image_url);
            e.currentTarget.src = 'https://via.placeholder.com/400x300/e5e7eb/6b7280?text=チラシ画像';
          }}
          onLoad={() => {
            console.log('画像の読み込みが成功しました:', flyer.image_url);
          }}
        />
        
        {/* メモがある場合のインジケーター */}
        {hasMemo && (
          <div className="absolute top-2 right-2 bg-yellow-400 text-black text-xs px-2 py-1 rounded-full font-bold">
            メモあり
          </div>
        )}
        
        {/* 店名を左下に表示 */}
        <Button 
          variant="ghost"
          className="absolute bottom-2 left-2 bg-black/60 text-white text-sm font-bold px-3 py-2 rounded-md h-auto hover:bg-black/80 transition-colors flex items-center space-x-2 backdrop-blur-sm"
          onClick={(e) => onCopyStoreName(flyer.store_name, e)}
        >
          <Copy size={14} />
          <span className="max-w-[120px] truncate">{flyer.store_name}</span>
        </Button>
      </div>
    </motion.div>
  );
};
