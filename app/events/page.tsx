"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Loader2, X, Calendar, MapPin, Eye, MessageSquare, Footprints, SlidersHorizontal,  Map, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { CustomModal } from '@/components/ui/custom-modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// 型定義
interface EventPost {
  id: string;
  app_profile_id: string;
  store_id: string;
  store_name: string;
  content: string;
  image_urls: string | null;
  expires_at: string;
  store_latitude?: number;
  store_longitude?: number;
  likes_count: number;
  views_count: number;
  comments_count: number;
  created_at: string;
  event_name?: string | null;
  event_start_date?: string | null;
  event_end_date?: string | null;
  prefecture?: string | null;
  city?: string | null;
  author_user_id?: string;
  distance?: number;
}

// イベントカードコンポーネント
const EventCard = ({ 
  post, 
  currentUserId,
  onDelete 
}: { 
  post: EventPost; 
  currentUserId?: string | null;
  onDelete?: (postId: string) => void;
}) => {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 削除処理
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('この投稿を削除してもよろしいですか？')) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_deleted: true })
        .eq('id', post.id);
      
      if (error) throw error;
      
      if (onDelete) {
        onDelete(post.id);
      }
    } catch (error) {
      console.error('削除エラー:', error);
      alert('投稿の削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // 画像URLの取得
  const getImageUrls = () => {
    if (post.image_urls) {
      try {
        const urls = typeof post.image_urls === 'string' 
          ? JSON.parse(post.image_urls) 
          : post.image_urls;
        return Array.isArray(urls) ? urls : [];
      } catch (error) {
        console.error('画像URLsの解析エラー:', error);
        return [];
      }
    }
    return [];
  };

  const imageUrls = getImageUrls();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-[#73370c]/10 hover:shadow-xl transition-shadow duration-200"
    >
      {/* カードヘッダー */}
      <div className="relative">
        {/* 画像表示 - 🔥 品質向上 */}
        {imageUrls && imageUrls.length > 0 ? (
          <div className="relative h-48 w-full overflow-hidden bg-gray-100">
            <img
              src={imageUrls[0]}
              alt={post.store_name}
              className="w-full h-full object-cover"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </div>
        ) : (
          <div className="relative h-48 w-full bg-[#fef3e8] flex items-center justify-center">
            <Calendar className="h-20 w-20 text-[#73370c] opacity-30" />
          </div>
        )}
        
        {/* 自分の投稿バッジ */}
        {post.author_user_id === currentUserId && (
          <div className="absolute top-2 left-2">
            <Badge variant="default" className="text-xs bg-blue-600">自分の投稿</Badge>
          </div>
        )}

        {/* 🔥 市町村バッジ（距離の代わりに表示） */}
        <div className="absolute top-2 right-2 flex flex-col gap-2">
          {post.city && (
            <Badge className="text-xs bg-green-600">
              {post.city}
            </Badge>
          )}
          
          {/* 🔥 自分の投稿の場合は削除ボタンを表示 */}
          {post.author_user_id === currentUserId && (
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              size="icon"
              variant="destructive"
              className="h-8 w-8 rounded-full shadow-lg"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* カード内容 */}
      <div className="p-4 space-y-3">
        {/* 🔥 イベント名 - 15文字制限、テキストカラー変更 */}
        <h3 className="text-lg font-bold line-clamp-2 min-h-[1.5rem]" style={{ color: '#73370c' }}>
          {(post.event_name || post.content).length > 15 
            ? `${(post.event_name || post.content).substring(0, 15)}...` 
            : (post.event_name || post.content)}
        </h3>

        {/* 🔥 開催場所 */}
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-500" />
          <span className="line-clamp-1">{post.store_name}</span>
        </div>

        {/* 🔥 開催期日 */}
        {post.event_start_date && (
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
            <span>
              {new Date(post.event_start_date).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
              {post.event_end_date && post.event_end_date !== post.event_start_date && (
                ` 〜 ${new Date(post.event_end_date).toLocaleDateString('ja-JP', {
                  month: 'long',
                  day: 'numeric'
                })}`
              )}
            </span>
          </div>
        )}

        {/* 統計情報（いいね・閲覧数） - 削除 */}

        {/* 詳細を見るボタン */}
        <Button
          onClick={() => router.push(`/map/event/${post.id}`)}
          className="w-full mt-2 bg-[#73370c] hover:bg-[#5c2a0a] text-white shadow-lg"
        >
          詳細を見る
        </Button>
      </div>
    </motion.div>
  );
};

export default function EventsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [posts, setPosts] = useState<EventPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // フィルター・ソート関連
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'distance'>('date');
  const [selectedPrefecture, setSelectedPrefecture] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [tempSortBy, setTempSortBy] = useState<'date' | 'distance'>('date');
  const [tempSelectedPrefecture, setTempSelectedPrefecture] = useState('all');
  const [tempSelectedCity, setTempSelectedCity] = useState('all');

  // 都道府県・市町村リスト
  const [prefectureList, setPrefectureList] = useState<string[]>([]);
  const [cityList, setCityList] = useState<string[]>([]);
  
  // 削除処理
  const handleDeletePost = (postId: string) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
    toast({
      title: "✅ 削除完了",
      description: "投稿を削除しました",
      duration: 2000,
    });
  };

  // 位置情報
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const fetchPostsRef = useRef<typeof fetchPosts>();

  // 位置情報取得
  useEffect(() => {
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      try {
        const locationData = JSON.parse(savedLocation);
        if (locationData.expiresAt && Date.now() < locationData.expiresAt) {
          setUserLocation({
            latitude: locationData.latitude,
            longitude: locationData.longitude
          });
        }
      } catch (error) {
        console.error('位置情報の取得に失敗:', error);
      }
    }
  }, []);

  // 距離計算（Haversine formula）
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // 地球の半径（メートル）
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // メートル単位
  };

  // イベント情報取得
  const fetchPosts = useCallback(async (offset = 0, isInitial = false, search = '') => {
    console.log('🔥 fetchPosts呼び出し:', { offset, isInitial, search, timestamp: new Date().toISOString() });
    
    setLoading(true);
    setPosts([]); // 常にリセット

    try {
      const now = new Date();

      // 🔥 マップ画面と同じロジック：全件取得（ページネーションなし）
      let query = supabase
        .from('posts')
        .select(`
          id,
          app_profile_id,
          store_id,
          store_name,
          content,
          image_urls,
          expires_at,
          store_latitude,
          store_longitude,
          likes_count,
          views_count,
          comments_count,
          created_at,
          event_name,
          event_start_date,
          event_end_date,
          prefecture,
          city,
          author:app_profiles!posts_app_profile_id_fkey (
            user_id
          )
        `)
        .eq('is_deleted', false)
        .eq('category', 'イベント情報');

      // 検索フィルター
      if (search && search.trim()) {
        const searchLower = search.toLowerCase();
        query = query.or(`event_name.ilike.%${searchLower}%,content.ilike.%${searchLower}%,store_name.ilike.%${searchLower}%`);
      }

      // 都道府県フィルター
      if (selectedPrefecture !== 'all') {
        query = query.eq('prefecture', selectedPrefecture);
      }

      // 市町村フィルター
      if (selectedCity !== 'all') {
        query = query.eq('city', selectedCity);
      }


      const { data, error } = await query;

      if (error) {
        console.error('データ取得エラー:', error);
        throw error;
      }
      // データ加工
      let processedPosts = (data || []).map((post: any) => {
        const authorData = Array.isArray(post.author) ? post.author[0] : post.author;
        const authorUserId = authorData?.user_id || null;

        let distance: number | undefined = undefined;
        if (userLocation && post.store_latitude && post.store_longitude) {
          distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            post.store_latitude,
            post.store_longitude
          );
        }

        return {
          ...post,
          author_user_id: authorUserId,
          distance
        };
      });

      // 🔥 終了したイベントを除外 - event_end_dateの23:59:59またはevent_start_dateの23:59:59で判定
      processedPosts = processedPosts.filter((post: any) => {
        // event_end_dateがある場合はその日の23:59:59まで表示
        if (post.event_end_date) {
          const endDate = new Date(post.event_end_date);
          endDate.setHours(23, 59, 59, 999);
          return now <= endDate;
        }
        // event_end_dateがない場合は、event_start_dateの23:59:59まで表示
        if (post.event_start_date) {
          const startDate = new Date(post.event_start_date);
          startDate.setHours(23, 59, 59, 999);
          return now <= startDate;
        }
        // どちらもない場合はexpires_atで判定
        return now <= new Date(post.expires_at);
      });

      // 🔥 座標が有効なイベントのみを対象にする（マップ画面と同じロジック）
      processedPosts = processedPosts.filter((post: any) => {
        const hasValidCoordinates = 
          post.store_latitude !== null && 
          post.store_latitude !== undefined &&
          post.store_longitude !== null && 
          post.store_longitude !== undefined &&
          !isNaN(post.store_latitude) &&
          !isNaN(post.store_longitude);
        
        if (!hasValidCoordinates) {
          console.warn('⚠️ 無効な座標のイベント（一覧画面）:', post.id, post.event_name, {
            lat: post.store_latitude,
            lng: post.store_longitude
          });
        }
        
        return hasValidCoordinates;
      });

      console.log('3. 座標フィルタリング後:', processedPosts.length, '件');

      // 🔥 event_nameで重複排除（同じイベント名の投稿は1件のみ表示）
      const uniqueEventNames = new Set<string>();
      processedPosts = processedPosts.filter((post: any) => {
        if (!post.event_name) return true; // event_nameがない場合はそのまま通す
        
        if (uniqueEventNames.has(post.event_name)) {
          console.log('🔄 重複イベント除外:', post.event_name, '(ID:', post.id, ')');
          return false; // 既に存在する場合は除外
        }
        
        uniqueEventNames.add(post.event_name);
        return true;
      });

      console.log('4. event_name重複除外後:', processedPosts.length, '件');

      // 🔥 ソート処理
      if (sortBy === 'date') {
        // 開催日順（event_start_dateでソート）
        processedPosts = processedPosts.sort((a, b) => {
          const aDate = a.event_start_date ? new Date(a.event_start_date).getTime() : new Date(a.created_at).getTime();
          const bDate = b.event_start_date ? new Date(b.event_start_date).getTime() : new Date(b.created_at).getTime();
          return aDate - bDate;
        });
      } else if (sortBy === 'distance' && userLocation) {
        // 距離順
        processedPosts = processedPosts
          .filter((p: EventPost) => p.distance !== undefined)
          .sort((a: EventPost, b: EventPost) => (a.distance || 0) - (b.distance || 0));
      }
      // 🔥 常に全件を上書き（マップ画面と同じ）
      setPosts(processedPosts);
      
      // 🔥 無限スクロール無効化
      setHasMore(false);
    } catch (error) {
      console.error('投稿取得エラー:', error);
      toast({
        title: 'エラー',
        description: '投稿の取得に失敗しました',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsSearching(false);
    }
  }, [selectedPrefecture, selectedCity, sortBy, userLocation, searchTerm, toast]);

  fetchPostsRef.current = fetchPosts;

  // 都道府県・市町村リスト取得
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('prefecture, city')
          .eq('category', 'イベント情報')
          .not('city', 'is', null); // 🔥 cityカラムをフィルタリング

        if (error) throw error;

        // �� 都道府県リストの取得
        const prefectures = Array.from(new Set(data.map(d => d.prefecture).filter(Boolean))).sort();
        setPrefectureList(prefectures as string[]);

        // �� 市町村リストの取得（全体または都道府県でフィルタ）
        if (selectedPrefecture !== 'all') {
          const cities = Array.from(new Set(
            data.filter(d => d.prefecture === selectedPrefecture)
              .map(d => d.city)
              .filter(Boolean)
          )).sort();
          setCityList(cities as string[]);
        } else {
          // 🔥 全都道府県の市町村を表示
          const cities = Array.from(new Set(data.map(d => d.city).filter(Boolean))).sort();
          setCityList(cities as string[]);
        }
      } catch (error) {
        console.error('地域情報の取得に失敗:', error);
      }
    };

    fetchLocations();
  }, [selectedPrefecture]);

  // 初回データ取得
  const hasInitialized = useRef(false);
  
  useEffect(() => {
    console.log('🔔 初回データ取得useEffect呼び出し（hasInitialized:', hasInitialized.current, ')');
    
    // 🔥 React Strict Modeでの2重実行を防ぐ
    if (hasInitialized.current) {
      console.log('⏭️ 既に初期化済みのためスキップ');
      return;
    }
    
    console.log('🎬 初回データ取得useEffect実行');
    hasInitialized.current = true;
    
    if (fetchPostsRef.current) {
      fetchPostsRef.current(0, true, '');
    }
  }, []); // 空の依存配列で初回のみ実行

  // 🔥 フィルター変更時の再取得（初回マウント時は実行しない）
  const isFirstMount = useRef(true);
  
  useEffect(() => {
    // 初回マウント時はスキップ
    if (isFirstMount.current) {
      isFirstMount.current = false;
      console.log('⏭️ 初回マウント時はスキップ（フィルター監視useEffect）');
      return;
    }
    
    console.log('🔄 フィルター変更検知 → 再取得', { selectedPrefecture, selectedCity, sortBy });
    if (fetchPostsRef.current) {
      fetchPostsRef.current(0, true, searchTerm);
    }
  }, [selectedPrefecture, selectedCity, sortBy]); // フィルター項目のみを監視（searchTermを削除）

  // 検索処理
  const handleSearch = useCallback(() => {
    setIsSearching(true);
    if (fetchPostsRef.current) {
      fetchPostsRef.current(0, true, searchTerm);
    }
  }, [searchTerm]);

  const handleSearchTermChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  // 更新処理
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (fetchPostsRef.current) {
        await fetchPostsRef.current(0, true, searchTerm);
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  }, [searchTerm]);


  // フィルター適用
  const applyFilters = () => {
    setSortBy(tempSortBy);
    setSelectedPrefecture(tempSelectedPrefecture);
    setSelectedCity(tempSelectedCity);
    setShowFilterModal(false);
    // 🔥 setTimeoutを削除：useEffectで監視する方式に変更
  };

  // フィルターリセット
  const resetFilters = () => {
    setTempSortBy('date');
    setTempSelectedPrefecture('all');
    setTempSelectedCity('all');
  };

  // アクティブフィルター数
  const activeFiltersCount = 
    (sortBy !== 'date' ? 1 : 0) +
    (selectedPrefecture !== 'all' ? 1 : 0) +
    (selectedCity !== 'all' ? 1 : 0);

  if (loading) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
          <div className="flex items-center justify-center pt-20">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin"></div>
          </div>
        </div>
      </>
    );
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
        <div className="sticky top-0 z-10 border-b bg-[#73370c]">
          <div className="p-4">
            {/* 検索バー */}
            <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-center">
              <h1 className="text-3xl font-bold text-white">イベント一覧</h1>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="イベント名で検索"
                  value={searchTerm}
                  onChange={handleSearchTermChange}
                  onKeyPress={handleKeyPress}
                  className="w-full text-base pr-10"
                  style={{ 
                    fontSize: '16px',
                    touchAction: 'manipulation',
                  }}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
                
                <Button
                  onClick={() => {
                    setSearchTerm('');
                    if (fetchPostsRef.current) {
                      fetchPostsRef.current(0, true, '');
                    }
                  }}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "absolute right-1 top-1/2 -translate-y-1/2 h-8 px-2 transition-opacity",
                    searchTerm ? "opacity-100" : "opacity-0 pointer-events-none"
                  )}
                  tabIndex={searchTerm ? 0 : -1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Button
                onClick={() => setShowFilterModal(true)}
                variant="outline"
                className="relative"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {activeFiltersCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* コンテンツ */}
        <PullToRefresh
          onRefresh={handleRefresh}
          pullingContent=""
          refreshingContent={
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-2" />
              <span className="text-blue-600 font-medium">更新中...</span>
            </div>
          }
          pullDownThreshold={80}
          maxPullDownDistance={120}
          resistance={2}
        >
          <div className="p-4">
            {posts.length === 0 ? (
              <div className="text-center py-10">
                <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">イベント情報がありません</p>
              </div>
            ) : (
              <>
                <motion.div
                  layout
                  className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                  <AnimatePresence mode="popLayout">
                    {posts.map((post, index) => (
                      <motion.div
                        key={post.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <EventCard 
                          post={post} 
                          currentUserId={currentUserId} 
                          onDelete={handleDeletePost}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>

                {/* 追加読み込み */}
                {hasMore && !loadingMore && posts.length >= 20 && (
                  <div id="load-more-trigger" className="text-center py-6">
                    <p className="text-sm text-gray-500">スクロールして更に読み込む</p>
                  </div>
                )}

                {loadingMore && (
                  <div className="text-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </div>
                )}

                {!hasMore && posts.length > 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-600">すべてのイベントを表示しました</p>
                    <p className="text-sm mt-1">
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                        {posts.length}件
                      </span>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </PullToRefresh>

        {/* マップアイコン（右下固定） */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Button
            onClick={() => router.push('/map')}
            size="icon"
            className="h-14 w-14 rounded-full shadow-2xl bg-[#73370c] hover:bg-[#5c2a0a] text-white border-2 border-white"
          >
            <Map className="h-6 w-6" />
          </Button>
        </motion.div>

        {/* フィルター・ソートモーダル */}
        <CustomModal
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          title="フィルター機能"
          description="イベントを絞り込み・並び替えます"
        >
          <div className="space-y-4">
            {/* ソート */}
            <div>
              <label className="block text-sm font-medium mb-2">並び順</label>
              <Select value={tempSortBy} onValueChange={(value: 'date' | 'distance') => setTempSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">開催日（早い順）</SelectItem>
                  <SelectItem value="distance">距離（近い順）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* 🔥 市町村フィルター */}
            <div>
              <label className="block text-sm font-medium mb-2">市町村</label>
              <Select value={tempSelectedCity} onValueChange={setTempSelectedCity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {cityList.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button variant="outline" onClick={resetFilters} className="flex-1">
                リセット
              </Button>
              <Button onClick={applyFilters} className="flex-1">
                適用
              </Button>
            </div>
          </div>
        </CustomModal>
      </div>
  );
}
