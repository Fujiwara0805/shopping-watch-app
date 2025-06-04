"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Search, Star, MapPin, Loader2, SlidersHorizontal, Heart, Plus, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { PostWithAuthor } from '@/types/post';
import { useSession } from 'next-auth/react';
import AppLayout from '@/components/layout/app-layout';
import { useSearchParams } from 'next/navigation';
import { PostCard } from '@/components/posts/post-card';
import { FullScreenPostViewer } from '@/components/posts/fullscreen-post-viewer';
import { Input } from '@/components/ui/input';
import { CustomModal } from '@/components/ui/custom-modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

// 型定義の追加
interface AuthorData {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio?: string;
}

interface PostLike {
  post_id: string;
  user_id: string;
  created_at: string;
}

interface PostFromDB {
  id: string;
  app_profile_id: string;
  store_id: string;
  store_name: string;
  category: string;
  content: string;
  image_url: string | null;
  discount_rate: number | null;
  expiry_option: string;
  likes_count: number;
  price: number | null;
  created_at: string;
  expires_at: string;
  store_latitude?: number;
  store_longitude?: number;
  author: AuthorData | AuthorData[] | null;
  post_likes: PostLike[];
}

interface ExtendedPostWithAuthor extends PostWithAuthor {
  isLikedByCurrentUser?: boolean;
  likes_count: number;
  store_latitude?: number;
  store_longitude?: number;
  distance?: number;
  expiry_option: "1h" | "3h" | "6h" | "12h";
  app_profile_id: string;
  author_user_id?: string;
}

type SortOption = 'created_at_desc' | 'created_at_asc' | 'expires_at_asc' | 'distance_asc' | 'likes_desc';
type SearchMode = 'all' | 'category' | 'favorite_store' | 'liked_posts' | 'nearby' | 'hybrid';

const categories = ['すべて', '惣菜', '弁当', '肉', '魚', '野菜', '果物', '米・パン類', 'デザート類', 'その他'];
const SEARCH_RADIUS_METERS = 5000; // 5km

// 検索履歴管理
const useSearchHistory = () => {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  useEffect(() => {
    const history = localStorage.getItem('searchHistory');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, []);

  const addToHistory = useCallback((term: string) => {
    if (term.trim()) {
      setSearchHistory(prev => {
        const newHistory = [term, ...prev.filter(item => item !== term)].slice(0, 10);
        localStorage.setItem('searchHistory', JSON.stringify(newHistory));
        return newHistory;
      });
    }
  }, []);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
  }, []);

  return { searchHistory, addToHistory, clearHistory };
};

export default function Timeline() {
  const [posts, setPosts] = useState<ExtendedPostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [hasMore, setHasMore] = useState(true);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const searchParams = useSearchParams();
  const [highlightPostId, setHighlightPostId] = useState<string | null>(null);

  // フルスクリーンビューアー関連のstate
  const [fullScreenViewer, setFullScreenViewer] = useState({
    isOpen: false,
    initialIndex: 0,
  });

  const [generalSearchTerm, setGeneralSearchTerm] = useState<string>('');
  const [searchMode, setSearchMode] = useState<SearchMode>('all');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [favoriteStoreIds, setFavoriteStoreIds] = useState<string[]>([]);
  const [favoriteStoreNames, setFavoriteStoreNames] = useState<string[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('created_at_desc');
  const [showLocationPermissionAlert, setShowLocationPermissionAlert] = useState(false);
  
  // 検索機能
  const [showSpecialSearch, setShowSpecialSearch] = useState(false);
  const { searchHistory, addToHistory, clearHistory } = useSearchHistory();

  // Refs for stable references
  const activeFilterRef = useRef(activeFilter);
  const generalSearchTermRef = useRef(generalSearchTerm);
  const searchModeRef = useRef(searchMode);
  const userLocationRef = useRef(userLocation);
  const favoriteStoreIdsRef = useRef(favoriteStoreIds);
  const favoriteStoreNamesRef = useRef(favoriteStoreNames);
  const likedPostIdsRef = useRef(likedPostIds);
  const sortByRef = useRef(sortBy);

  // Update refs
  useEffect(() => { activeFilterRef.current = activeFilter; }, [activeFilter]);
  useEffect(() => { generalSearchTermRef.current = generalSearchTerm; }, [generalSearchTerm]);
  useEffect(() => { searchModeRef.current = searchMode; }, [searchMode]);
  useEffect(() => { userLocationRef.current = userLocation; }, [userLocation]);
  useEffect(() => { favoriteStoreIdsRef.current = favoriteStoreIds; }, [favoriteStoreIds]);
  useEffect(() => { favoriteStoreNamesRef.current = favoriteStoreNames; }, [favoriteStoreNames]);
  useEffect(() => { likedPostIdsRef.current = likedPostIds; }, [likedPostIds]);
  useEffect(() => { sortByRef.current = sortBy; }, [sortBy]);

  useEffect(() => {
    const id = searchParams.get('highlightPostId');
    if (id) {
      setHighlightPostId(id);
    }
  }, [searchParams]);

  // お気に入り店舗情報の取得
  useEffect(() => {
    const fetchFavoriteStores = async () => {
      if (!currentUserId) {
        setFavoriteStoreIds([]);
        setFavoriteStoreNames([]);
        return;
      }
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('app_profiles')
          .select('favorite_store_1_id, favorite_store_1_name, favorite_store_2_id, favorite_store_2_name, favorite_store_3_id, favorite_store_3_name')
          .eq('user_id', currentUserId)
          .single();

        if (profileError) {
          console.error('プロフィールのお気に入り店舗の取得に失敗しました:', profileError);
          setFavoriteStoreIds([]);
          setFavoriteStoreNames([]);
          return;
        }

        const ids: string[] = [];
        const names: string[] = [];
        
        if (profileData?.favorite_store_1_id) {
          ids.push(profileData.favorite_store_1_id);
          if (profileData.favorite_store_1_name) names.push(profileData.favorite_store_1_name);
        }
        if (profileData?.favorite_store_2_id) {
          ids.push(profileData.favorite_store_2_id);
          if (profileData.favorite_store_2_name) names.push(profileData.favorite_store_2_name);
        }
        if (profileData?.favorite_store_3_id) {
          ids.push(profileData.favorite_store_3_id);
          if (profileData.favorite_store_3_name) names.push(profileData.favorite_store_3_name);
        }
        
        setFavoriteStoreIds(ids);
        setFavoriteStoreNames(names);
      } catch (e) {
        console.error('プロフィールのお気に入り店舗の取得中に予期せぬエラー:', e);
        setFavoriteStoreIds([]);
        setFavoriteStoreNames([]);
      }
    };

    if (session?.user?.id) {
      fetchFavoriteStores();
    }
  }, [currentUserId, session?.user?.id]);

  // いいねした投稿IDの取得
  useEffect(() => {
    const fetchLikedPostIds = async () => {
      if (!currentUserId) {
        setLikedPostIds([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', currentUserId);

        if (error) {
          console.error('いいねした投稿の取得に失敗しました:', error);
          setLikedPostIds([]);
        } else {
          setLikedPostIds(data?.map(item => item.post_id) || []);
        }
      } catch (e) {
        console.error('いいねした投稿の取得中に予期せぬエラー:', e);
        setLikedPostIds([]);
      }
    };

    if (session?.user?.id) {
      fetchLikedPostIds();
    }
  }, [currentUserId, session?.user?.id]);

  // 投稿データの取得
  const fetchPosts = useCallback(async (offset = 0, isInitial = false) => {
    const currentActiveFilter = activeFilterRef.current;
    const currentGeneralSearchTerm = generalSearchTermRef.current;
    const currentSearchMode = searchModeRef.current;
    const currentUserLocation = userLocationRef.current;
    const currentFavoriteStoreIds = favoriteStoreIdsRef.current;
    const currentLikedPostIds = likedPostIdsRef.current;
    const currentSortBy = sortByRef.current;

    // 距離計算関数（ハバーサイン公式）- 関数内で定義
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371; // 地球の半径（km）
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c * 1000; // メートルで返す
    };

    if (isInitial) {
      setLoading(true);
      setPosts([]);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    
    try {
      const now = new Date().toISOString();
      
      // 基本クエリ
      let query = supabase
        .from('posts')
        .select(`
          id,
          app_profile_id,
          store_id,
          store_name,
          category,
          content,
          image_url,
          discount_rate,
          expiry_option,
          likes_count,
          price,
          created_at,
          expires_at,
          store_latitude,
          store_longitude,
          author:app_profiles!posts_app_profile_id_fkey (
            id,
            user_id,
            display_name,
            avatar_url,
            bio
          ),
          post_likes (
            post_id,
            user_id,
            created_at
          )
        `)
        .gt('expires_at', now);

      // カテゴリフィルタ
      if (currentActiveFilter !== 'all') {
        query = query.eq('category', currentActiveFilter);
      }

      // 一般検索
      if (currentGeneralSearchTerm) {
        const searchTerm = currentGeneralSearchTerm.toLowerCase();
        query = query.or(`store_name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
        addToHistory(currentGeneralSearchTerm);
      }

      // 特別な検索モード
      if (currentSearchMode === 'favorite_store') {
        if (currentFavoriteStoreIds.length > 0) {
          query = query.in('store_id', currentFavoriteStoreIds);
        } else {
          query = query.eq('id', 'impossible-id');
        }
      } else if (currentSearchMode === 'liked_posts' && currentLikedPostIds.length > 0) {
        query = query.in('id', currentLikedPostIds);
      } else if (currentSearchMode === 'hybrid') {
        if (currentFavoriteStoreIds.length > 0 && currentLikedPostIds.length > 0) {
          query = query.or(`store_id.in.(${currentFavoriteStoreIds.join(',')}),id.in.(${currentLikedPostIds.join(',')})`);
        } else if (currentFavoriteStoreIds.length > 0) {
          query = query.in('store_id', currentFavoriteStoreIds);
        } else if (currentLikedPostIds.length > 0) {
          query = query.in('id', currentLikedPostIds);
        }
      }

      // ソート（距離ソート以外）
      if (currentSortBy === 'created_at_desc') {
        query = query.order('created_at', { ascending: false });
      } else if (currentSortBy === 'created_at_asc') {
        query = query.order('created_at', { ascending: true });
      } else if (currentSortBy === 'expires_at_asc') {
        query = query.order('expires_at', { ascending: true });
      } else if (currentSortBy === 'likes_desc') {
        query = query.order('likes_count', { ascending: false });
      }

      query = query.range(offset, offset + 19);

      const { data, error: dbError } = await query;

      if (dbError) {
        throw dbError;
      }
      
      // 型安全なデータ処理と距離計算
      let processedPosts = (data as PostFromDB[]).map(post => {
        let distance;
        
        // 距離計算（位置情報がある場合）
        if (currentUserLocation && post.store_latitude && post.store_longitude) {
          distance = calculateDistance(
            currentUserLocation.latitude,
            currentUserLocation.longitude,
            post.store_latitude,
            post.store_longitude
          );
        }

        // 型安全なauthor処理
        const authorData = Array.isArray(post.author) ? post.author[0] : post.author;
        const authorUserId = authorData && typeof authorData === 'object' && 'user_id' in authorData 
          ? (authorData as any).user_id 
          : null;

        return {
          ...post,
          author: authorData,
          author_user_id: authorUserId,
          isLikedByCurrentUser: Array.isArray(post.post_likes) 
            ? post.post_likes.some((like: PostLike) => like.user_id === currentUserId)
            : false,
          likes_count: post.likes_count || (Array.isArray(post.post_likes) ? post.post_likes.length : 0),
          distance,
        };
      });

      // 周辺検索の場合は5km圏内のみフィルタリング
      if (currentSearchMode === 'nearby' && currentUserLocation) {
        processedPosts = processedPosts.filter(post => {
          return post.distance !== undefined && post.distance <= SEARCH_RADIUS_METERS;
        });
        console.log(`周辺検索: ${processedPosts.length}件の投稿が5km圏内にあります`);
      }

      // 距離によるソート（位置情報がある場合）
      if (currentSortBy === 'distance_asc' && currentUserLocation) {
        processedPosts = processedPosts
          .filter(post => post.distance !== undefined)
          .sort((a, b) => (a.distance || 0) - (b.distance || 0));
      }

      if (isInitial) {
        setPosts(processedPosts as ExtendedPostWithAuthor[]);
      } else {
        setPosts(prevPosts => [...prevPosts, ...processedPosts as ExtendedPostWithAuthor[]]);
      }

      setHasMore(data.length === 20 && !(currentSearchMode === 'nearby'));
    } catch (e: any) {
      console.error("投稿の取得に失敗しました:", e);
      setError("投稿の読み込みに失敗しました。しばらくしてから再度お試しください。");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentUserId, addToHistory]);

  // 初回データ取得
  useEffect(() => {
    fetchPosts(0, true);
  }, [currentUserId, addToHistory]); // fetchPostsと同じ依存配列

  // フィルタや検索条件が変更された時のデータ再取得
  useEffect(() => {
    const shouldRefetch = posts.length > 0; // 初回ロード後のみ
    if (shouldRefetch) {
      fetchPosts(0, true);
    }
  }, [activeFilter, generalSearchTerm, searchMode, sortBy, userLocation, favoriteStoreIds, likedPostIds]); // fetchPostsは含めない

  useEffect(() => {
    if (highlightPostId && posts.length > 0) {
      const element = document.getElementById(`post-${highlightPostId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          setHighlightPostId(null);
        }, 3000);
      }
    }
  }, [highlightPostId, posts]);

  const loadMorePosts = useCallback(() => {
    if (!loadingMore && hasMore && searchModeRef.current !== 'nearby') {
      fetchPosts(posts.length, false);
    }
  }, [fetchPosts, posts.length, loadingMore, hasMore]);

  useEffect(() => {
    const handleScroll = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target.scrollTop + target.clientHeight >= target.scrollHeight - 100) {
        loadMorePosts();
      }
    };

    const scrollContainer = document.querySelector('.timeline-scroll-container');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [loadMorePosts]);

  // いいね処理
  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!currentUserId) return;

    const post = posts.find(p => p.id === postId);
    if (post && post.author_user_id === currentUserId) {
      return;
    }

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('post_likes')
          .insert({ 
            post_id: postId, 
            user_id: currentUserId,
            created_at: new Date().toISOString()
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .match({ post_id: postId, user_id: currentUserId });
        if (error) throw error;
      }
      setPosts(prevPosts => prevPosts.map(p => 
        p.id === postId 
          ? { 
              ...p, 
              isLikedByCurrentUser: isLiked, 
              likes_count: isLiked ? (p.likes_count || 0) + 1 : Math.max(0, (p.likes_count || 0) - 1)
            } 
          : p
      ));
    } catch (error) {
      console.error("いいね処理エラー:", error);
    }
  };

  // 投稿カードクリック時のハンドラー
  const handlePostClick = useCallback((postId: string) => {
    const postIndex = posts.findIndex(post => post.id === postId);
    if (postIndex !== -1) {
      setFullScreenViewer({
        isOpen: true,
        initialIndex: postIndex,
      });
    }
  }, [posts]);

  // フルスクリーンビューアーを閉じる
  const closeFullScreenViewer = useCallback(() => {
    setFullScreenViewer({
      isOpen: false,
      initialIndex: 0,
    });
  }, []);

  const handleNearbySearch = () => {
    setShowLocationPermissionAlert(true);
    setIsGettingLocation(true);
    setSearchMode('nearby');
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setIsGettingLocation(false);
          setShowLocationPermissionAlert(false);
          console.log('位置情報取得成功:', position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error('位置情報の取得に失敗しました:', error);
          setError('位置情報の取得に失敗しました。ブラウザの設定で位置情報を許可してください。');
          setIsGettingLocation(false);
          setShowLocationPermissionAlert(false);
          setUserLocation(null);
          setSearchMode('all');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setError('お使いのブラウザは位置情報に対応していません。');
      setIsGettingLocation(false);
      setShowLocationPermissionAlert(false);
      setSearchMode('all');
    }
  };

  const handleApplyFilters = () => {
    setShowFilterModal(false);
    fetchPosts(0, true);
  };

  const handleClearAllFilters = () => {
    setActiveFilter('all');
    setSearchMode('all');
    setSortBy('created_at_desc');
    setGeneralSearchTerm('');
    fetchPosts(0, true);
  };

  // アクティブなフィルタ数を計算
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (activeFilter !== 'all') count++;
    if (searchMode !== 'all') count++;
    if (sortBy !== 'created_at_desc') count++;
    return count;
  }, [activeFilter, searchMode, sortBy]);

  if (loading && posts.length === 0) {
    return (
      <AppLayout>
        <div className="sticky top-0 z-10 border-b p-4 flex items-center space-x-2 bg-[#73370c]">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="店舗名やキーワードで検索"
              value={generalSearchTerm}
              onChange={(e) => setGeneralSearchTerm(e.target.value)}
              className="pr-10 w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearchMode('all');
                  fetchPosts(0, true);
                }
              }}
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <Button onClick={() => setShowFilterModal(true)} variant="outline" className="relative">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            {activeFiltersCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>
        
        <div className="p-4">
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-[400px] w-full rounded-xl" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="sticky top-0 z-10 border-b p-4 flex items-center space-x-2 bg-[#73370c]">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="店舗名やキーワードで検索"
              value={generalSearchTerm}
              onChange={(e) => setGeneralSearchTerm(e.target.value)}
              className="pr-10 w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearchMode('all');
                  fetchPosts(0, true);
                }
              }}
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <Button onClick={() => setShowFilterModal(true)} variant="outline" className="relative">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            {activeFiltersCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>
        <div className="p-4">
          <div className="text-center">
            <p className="text-destructive text-lg">{error}</p>
            <Button onClick={() => fetchPosts(0, true)} className="mt-4">再試行</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="sticky top-0 z-10 border-b p-4 flex items-center space-x-2 bg-[#73370c]">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="店舗名やキーワードで検索"
            value={generalSearchTerm}
            onChange={(e) => setGeneralSearchTerm(e.target.value)}
            className="pr-10 w-full"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSearchMode('all');
                fetchPosts(0, true);
              }
            }}
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          
          {/* 検索履歴のドロップダウン */}
          {searchHistory.length > 0 && generalSearchTerm === '' && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md mt-1 shadow-lg z-20">
              <div className="p-2 border-b bg-gray-50 flex justify-between items-center">
                <span className="text-sm text-gray-600">検索履歴</span>
                <Button variant="ghost" size="sm" onClick={clearHistory}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
              {searchHistory.slice(0, 5).map((term, index) => (
                <button
                  key={index}
                  className="w-full text-left p-2 hover:bg-gray-100 text-sm"
                  onClick={() => {
                    setGeneralSearchTerm(term);
                    setSearchMode('all');
                    fetchPosts(0, true);
                  }}
                >
                  {term}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button onClick={() => setShowFilterModal(true)} variant="outline" className="relative">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          {activeFiltersCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* 位置情報許可のアラート */}
      {showLocationPermissionAlert && (
        <div className="px-4 py-2">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              周辺検索を行うため、ブラウザの位置情報へのアクセスを許可してください。現在地から5km圏内の投稿のみ表示されます。
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* アクティブなフィルタの表示 */}
      {activeFiltersCount > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-b">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-600">アクティブなフィルタ:</span>
            {activeFilter !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                カテゴリ: {activeFilter}
                <button onClick={() => setActiveFilter('all')} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {searchMode !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {searchMode === 'favorite_store' && 'お気に入り店舗'}
                {searchMode === 'liked_posts' && 'いいねした投稿'}
                {searchMode === 'nearby' && `周辺検索 (5km圏内)`}
                {searchMode === 'hybrid' && '複合検索'}
                <button onClick={() => setSearchMode('all')} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={handleClearAllFilters}>
              すべてクリア
            </Button>
          </div>
        </div>
      )}

      {/* 周辺検索時の結果表示 */}
      {searchMode === 'nearby' && userLocation && !loading && (
        <div className="px-4 py-2 bg-blue-50 border-b">
          <p className="text-sm text-blue-700">
            📍 現在地から5km圏内の投稿を表示中 ({posts.length}件)
          </p>
        </div>
      )}
      
      <div 
        className="timeline-scroll-container custom-scrollbar overscroll-none"
        style={{ 
          height: 'calc(100vh - 120px)',
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        <div className="p-4 pb-safe">
          {posts.length === 0 && !loading ? (
            <div className="text-center py-10">
              <LayoutGrid size={48} className="mx-auto text-muted-foreground mb-4" />
              {searchMode === 'nearby' ? (
                <div>
                  <p className="text-xl text-muted-foreground mb-2">
                    現在地から5km圏内に投稿がありません
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    範囲を広げるか、別の検索条件をお試しください
                  </p>
                </div>
              ) : (
                <p className="text-xl text-muted-foreground">検索条件に合う投稿はまだありません。</p>
              )}
              {searchMode !== 'all' && (
                <Button onClick={() => setSearchMode('all')} className="mt-4">
                  すべての投稿を表示
                </Button>
              )}
            </div>
          ) : (
            <motion.div
              layout
              className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              <AnimatePresence mode="popLayout">
                {posts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    id={`post-${post.id}`}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={cn(
                      "cursor-pointer transform transition-transform hover:scale-105",
                      post.id === highlightPostId && 'ring-4 ring-primary ring-offset-2 rounded-xl'
                    )}
                    onClick={() => handlePostClick(post.id)}
                  >
                    <PostCard 
                      post={post} 
                      onLike={handleLike}
                      currentUserId={currentUserId}
                      showDistance={searchMode === 'nearby' && post.distance !== undefined}
                      isOwnPost={post.author_user_id === currentUserId}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
          
          {loadingMore && (
            <div className="mt-6">
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={`loading-${i}`} className="h-[400px] w-full rounded-xl" />
                ))}
              </div>
            </div>
          )}
          
          {!hasMore && posts.length > 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchMode === 'nearby' ? '5km圏内の投稿をすべて表示しました' : 'すべての投稿を読み込みました'}
              </p>
            </div>
          )}
          
          <div className="h-4"></div>
        </div>
      </div>

      {/* フルスクリーン投稿ビューアー */}
      <FullScreenPostViewer
        posts={posts}
        initialIndex={fullScreenViewer.initialIndex}
        isOpen={fullScreenViewer.isOpen}
        onClose={closeFullScreenViewer}
        onLike={handleLike}
        currentUserId={currentUserId}
        showDistance={searchMode === 'nearby'}
      />

      <CustomModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="検索フィルター"
        description="検索条件と表示順を設定できます。"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          <div>
            <h3 className="font-semibold text-lg mb-2">カテゴリーで絞り込み</h3>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={activeFilter === category || (activeFilter === 'all' && category === 'すべて') ? 'default' : 'outline'}
                  onClick={() => {
                    setActiveFilter(category === 'すべて' ? 'all' : category);
                  }}
                  className={cn(
                    "w-full",
                    (activeFilter === category || (activeFilter === 'all' && category === 'すべて')) && "bg-primary text-primary-foreground"
                  )}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">表示順</h3>
            <Select onValueChange={(value: SortOption) => setSortBy(value)} defaultValue={sortBy}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="並び替え" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at_desc">新着順</SelectItem>
                <SelectItem value="created_at_asc">古い順</SelectItem>
                <SelectItem value="expires_at_asc">期限が近い順</SelectItem>
                <SelectItem value="likes_desc">いいねが多い順</SelectItem>
                {userLocation && <SelectItem value="distance_asc">距離が近い順</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          {/* 特別な検索（トグル式） */}
          <div>
            <Button
              variant="ghost"
              onClick={() => setShowSpecialSearch(!showSpecialSearch)}
              className="w-full justify-between p-0 h-auto"
            >
              <h3 className="font-semibold text-lg">特別な検索</h3>
              <motion.div
                animate={{ rotate: showSpecialSearch ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </motion.div>
            </Button>
            
            <AnimatePresence>
              {showSpecialSearch && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col space-y-3 mt-4">
                    <Button 
                      onClick={() => {
                        setSearchMode('favorite_store');
                      }}
                      disabled={!currentUserId || favoriteStoreIds.length === 0}
                      className={cn(
                        "justify-start",
                        searchMode === 'favorite_store' ? "bg-yellow-600 text-white hover:bg-yellow-700" : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                      )}
                    >
                      <Star className="h-4 w-4 mr-2" />
                      お気に入り店を検索 {favoriteStoreIds.length > 0 && `(${favoriteStoreIds.length}店舗)`}
                    </Button>
                    <Button
                      onClick={() => {
                        setSearchMode('liked_posts');
                      }}
                      disabled={!currentUserId || likedPostIds.length === 0}
                      className={cn(
                        "justify-start",
                        searchMode === 'liked_posts' ? "bg-pink-600 text-white hover:bg-pink-700" : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                      )}
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      いいねした投稿を検索 {likedPostIds.length > 0 && `(${likedPostIds.length}件)`}
                    </Button>
                    <Button
                      onClick={handleNearbySearch}
                      disabled={isGettingLocation}
                      className={cn(
                        "justify-start",
                        searchMode === 'nearby' ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                      )}
                    >
                      {isGettingLocation ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <MapPin className="h-4 w-4 mr-2" />
                      )}
                      周辺から検索 (5km圏内)
                    </Button>
                    <Button
                      onClick={() => {
                        setSearchMode('hybrid');
                      }}
                      disabled={!currentUserId || (favoriteStoreIds.length === 0 && likedPostIds.length === 0)}
                      className={cn(
                        "justify-start",
                        searchMode === 'hybrid' ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                      )}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      複合検索 (お気に入り + いいね)
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-6 flex justify-between">
          <Button variant="outline" onClick={handleClearAllFilters}>
            すべてクリア
          </Button>
          <Button onClick={handleApplyFilters}>フィルターを適用</Button>
        </div>
      </CustomModal>
    </AppLayout>
  );
}