"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Search, Star, MapPin, Loader2, SlidersHorizontal, Heart, Plus, X, AlertCircle, Menu, User, Edit, Store, HelpCircle, FileText, LogOut, Settings, Globe,NotebookText} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { PostWithAuthor } from '@/types/post';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

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

// デバウンス機能付きフック
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// ハンバーガーメニューコンポーネント
const HamburgerMenu = ({ currentUser }: { currentUser: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  const menuItems = [
    {
      icon: User,
      label: 'マイページ',
      onClick: () => {
        router.push('/profile');
        setIsOpen(false);
      }
    },
    {
      icon: Edit,
      label: '投稿する',
      onClick: () => {
        router.push('/post');
        setIsOpen(false);
      }
    },
    {
      icon: Store,
      label: 'お店を探す',
      onClick: () => {
        router.push('/map');
        setIsOpen(false);
      }
    },
    {
      icon: Globe,
      label: 'ランディングページ',
      onClick: () => {
        router.push('/');
        setIsOpen(false);
      }
    },
    {
      icon: FileText,
      label: '広告・チラシ(未実装)',
      onClick: () => {
        router.push('/');
        setIsOpen(false);
      }
    },
    {
      icon: NotebookText,
      label: '買い物メモ',
      onClick: () => {
        router.push('/memo');
        setIsOpen(false);
      }
    },
    {
      icon: HelpCircle,
      label: 'お問い合わせ',
      onClick: () => {
        router.push('/contact');
        setIsOpen(false);
      }
    },
    {
      icon: FileText,
      label: '規約・ポリシー',
      onClick: () => {
        router.push('/');
        setIsOpen(false);
      }
    },
    {
      icon: Settings,
      label: '設定',
      onClick: () => {
        router.push('/');
        setIsOpen(false);
      }
    }
  ];

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="text-white hover:bg-white/10"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <CustomModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title=""
        description=""
        className="sm:max-w-md"
      >
        <div className="space-y-4">
          {/* ユーザー情報セクション */}
          {currentUser && (
            <>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage 
                    src={currentUser.avatar_url ? 
                      supabase.storage.from('avatars').getPublicUrl(currentUser.avatar_url).data.publicUrl : 
                      undefined
                    } 
                    alt={currentUser.display_name || 'ユーザー'} 
                  />
                  <AvatarFallback>
                    {currentUser.display_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-lg">
                    {currentUser.display_name || 'ユーザー'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {currentUser.email}
                  </p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* メニュー項目 */}
          <div className="space-y-1">
            {menuItems.map((item, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start text-left py-3 h-auto text-base hover:bg-gray-100"
                onClick={item.onClick}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </Button>
            ))}
          </div>

          <Separator />

          {/* ログアウトボタン */}
          <Button
            variant="ghost"
            className="w-full justify-start text-left py-3 h-auto text-base text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleSignOut}
          >
            <LogOut className="mr-3 h-5 w-5" />
            ログアウト
          </Button>
        </div>
      </CustomModal>
    </>
  );
};

export default function Timeline() {
  const [posts, setPosts] = useState<ExtendedPostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false); // リアルタイム検索中の状態
  
  // 適用済みフィルター状態（実際の検索に使用）
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchMode, setSearchMode] = useState<SearchMode>('all');
  const [sortBy, setSortBy] = useState<SortOption>('created_at_desc');
  
  // 一時的なフィルター状態（モーダル内での変更）
  const [tempActiveFilter, setTempActiveFilter] = useState<string>('all');
  const [tempSearchMode, setTempSearchMode] = useState<SearchMode>('all');
  const [tempSortBy, setTempSortBy] = useState<SortOption>('created_at_desc');
  
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
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [favoriteStoreIds, setFavoriteStoreIds] = useState<string[]>([]);
  const [favoriteStoreNames, setFavoriteStoreNames] = useState<string[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showLocationPermissionAlert, setShowLocationPermissionAlert] = useState(false);
  
  // 検索機能
  const [showSpecialSearch, setShowSpecialSearch] = useState(false);
  const { searchHistory, addToHistory, clearHistory } = useSearchHistory();

  // ユーザープロフィール情報
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

  // デバウンス付きの検索語（短い間隔で即座に反応）
  const debouncedSearchTerm = useDebounce(generalSearchTerm, 150);

  // Refs for stable references
  const activeFilterRef = useRef(activeFilter);
  const searchModeRef = useRef(searchMode);
  const userLocationRef = useRef(userLocation);
  const favoriteStoreIdsRef = useRef(favoriteStoreIds);
  const favoriteStoreNamesRef = useRef(favoriteStoreNames);
  const likedPostIdsRef = useRef(likedPostIds);
  const sortByRef = useRef(sortBy);

  // Update refs
  useEffect(() => { activeFilterRef.current = activeFilter; }, [activeFilter]);
  useEffect(() => { searchModeRef.current = searchMode; }, [searchMode]);
  useEffect(() => { userLocationRef.current = userLocation; }, [userLocation]);
  useEffect(() => { favoriteStoreIdsRef.current = favoriteStoreIds; }, [favoriteStoreIds]);
  useEffect(() => { favoriteStoreNamesRef.current = favoriteStoreNames; }, [favoriteStoreNames]);
  useEffect(() => { likedPostIdsRef.current = likedPostIds; }, [likedPostIds]);
  useEffect(() => { sortByRef.current = sortBy; }, [sortBy]);

  // 一時的なフィルター状態を適用済み状態で初期化
  useEffect(() => {
    setTempActiveFilter(activeFilter);
    setTempSearchMode(searchMode);
    setTempSortBy(sortBy);
  }, [activeFilter, searchMode, sortBy]);

  useEffect(() => {
    const id = searchParams.get('highlightPostId');
    if (id) {
      setHighlightPostId(id);
    }
  }, [searchParams]);

  // 現在のユーザープロフィール取得
  useEffect(() => {
    const fetchCurrentUserProfile = async () => {
      if (!currentUserId) {
        setCurrentUserProfile(null);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('app_profiles')
          .select('*')
          .eq('user_id', currentUserId)
          .single();

        if (error) {
          console.error('ユーザープロフィールの取得に失敗しました:', error);
          return;
        }

        setCurrentUserProfile({
          ...data,
          email: session?.user?.email
        });
      } catch (e) {
        console.error('ユーザープロフィールの取得中に予期せぬエラー:', e);
      }
    };

    if (session?.user?.id) {
      fetchCurrentUserProfile();
    }
  }, [currentUserId, session?.user?.email]);

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

  // いいねした投稿IDの取得を改善
  useEffect(() => {
    const fetchLikedPostIds = async () => {
      if (!currentUserId) {
        setLikedPostIds([]);
        return;
      }
      try {
        // より詳細な情報を取得してキャッシュ効率を向上
        const { data, error } = await supabase
          .from('post_likes')
          .select('post_id, created_at')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false }); // 最新のいいね順

        if (error) {
          console.error('いいねした投稿の取得に失敗しました:', error);
          setLikedPostIds([]);
        } else {
          const postIds = data?.map(item => item.post_id) || [];
          setLikedPostIds(postIds);
          console.log(`いいねした投稿: ${postIds.length}件`);
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
  const fetchPosts = useCallback(async (offset = 0, isInitial = false, searchTerm = '') => {
    const currentActiveFilter = activeFilterRef.current;
    const currentSearchMode = searchModeRef.current;
    const currentUserLocation = userLocationRef.current;
    const currentFavoriteStoreIds = favoriteStoreIdsRef.current;
    const currentLikedPostIds = likedPostIdsRef.current;
    const currentSortBy = sortByRef.current;

    // 距離計算関数（ハバーサイン公式）
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c * 1000;
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
          post_likes!fk_post_likes_post_id (
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

      // 検索語による絞り込み
      const effectiveSearchTerm = searchTerm;
      if (effectiveSearchTerm && effectiveSearchTerm.trim()) {
        const searchTermLower = effectiveSearchTerm.toLowerCase();
        query = query.or(`store_name.ilike.%${searchTermLower}%,category.ilike.%${searchTermLower}%,content.ilike.%${searchTermLower}%`);
      }

      // 特別な検索モード - いいね検索の改善
      if (currentSearchMode === 'favorite_store') {
        if (currentFavoriteStoreIds.length > 0) {
          query = query.in('store_id', currentFavoriteStoreIds);
        } else {
          query = query.eq('id', 'impossible-id');
        }
      } else if (currentSearchMode === 'liked_posts') {
        if (currentLikedPostIds.length > 0) {
          // いいねした投稿のみを表示
          query = query.in('id', currentLikedPostIds);
          console.log(`いいね検索: ${currentLikedPostIds.length}件の投稿をフィルタリング`);
        } else {
          // いいねした投稿がない場合は空の結果を返す
          query = query.eq('id', 'impossible-id');
          console.log('いいね検索: いいねした投稿がありません');
        }
      } else if (currentSearchMode === 'hybrid') {
        // 複合検索の改善
        const conditions = [];
        if (currentFavoriteStoreIds.length > 0) {
          conditions.push(`store_id.in.(${currentFavoriteStoreIds.join(',')})`);
        }
        if (currentLikedPostIds.length > 0) {
          conditions.push(`id.in.(${currentLikedPostIds.join(',')})`);
        }
        
        if (conditions.length > 0) {
          query = query.or(conditions.join(','));
          console.log(`複合検索: ${conditions.length}つの条件で検索`);
        } else {
          query = query.eq('id', 'impossible-id');
          console.log('複合検索: 検索条件がありません');
        }
      }

      // ソート処理
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
      
      // データ処理の改善
      let processedPosts = (data as PostFromDB[]).map(post => {
        let distance;
        
        if (currentUserLocation && post.store_latitude && post.store_longitude) {
          distance = calculateDistance(
            currentUserLocation.latitude,
            currentUserLocation.longitude,
            post.store_latitude,
            post.store_longitude
          );
        }

        const authorData = Array.isArray(post.author) ? post.author[0] : post.author;
        const authorUserId = authorData && typeof authorData === 'object' && 'user_id' in authorData 
          ? (authorData as any).user_id 
          : null;

        // いいね状態の正確な判定
        const isLikedByCurrentUser = Array.isArray(post.post_likes) 
          ? post.post_likes.some((like: PostLike) => like.user_id === currentUserId)
          : currentLikedPostIds.includes(post.id); // フォールバック

        return {
          ...post,
          author: authorData,
          author_user_id: authorUserId,
          isLikedByCurrentUser,
          likes_count: post.likes_count || (Array.isArray(post.post_likes) ? post.post_likes.length : 0),
          distance,
        };
      });

      // いいね検索時の特別なソート
      if (currentSearchMode === 'liked_posts' && currentLikedPostIds.length > 0) {
        // いいねした順序を保持してソート
        processedPosts = processedPosts.sort((a, b) => {
          const aIndex = currentLikedPostIds.indexOf(a.id);
          const bIndex = currentLikedPostIds.indexOf(b.id);
          return aIndex - bIndex; // いいねした順序でソート
        });
        console.log(`いいね検索結果: ${processedPosts.length}件の投稿を表示`);
      }

      // 周辺検索の処理
      if (currentSearchMode === 'nearby' && currentUserLocation) {
        processedPosts = processedPosts.filter(post => {
          return post.distance !== undefined && post.distance <= SEARCH_RADIUS_METERS;
        });
        console.log(`周辺検索: ${processedPosts.length}件の投稿が5km圏内にあります`);
      }

      // 距離によるソート
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

      // いいね検索時はページネーションを無効化（全件表示）
      setHasMore(data.length === 20 && currentSearchMode !== 'nearby' && currentSearchMode !== 'liked_posts');
    } catch (e: any) {
      console.error("投稿の取得に失敗しました:", e);
      setError("投稿の読み込みに失敗しました。しばらくしてから再度お試しください。");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsSearching(false);
    }
  }, []);

  // 初回データ取得
  useEffect(() => {
    if (fetchPostsRef.current) {
      fetchPostsRef.current(0, true);
    }
  }, []);

  // 検索履歴への追加（別useEffect）
  useEffect(() => {
    if (debouncedSearchTerm && debouncedSearchTerm.length >= 2) {
      addToHistory(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, addToHistory]);

  // リアルタイム検索の実装 - 依存関係を最小化
  const fetchPostsRef = useRef<typeof fetchPosts>();
  fetchPostsRef.current = fetchPosts;

  useEffect(() => {
    
    // 初期ロード完了後のみ実行
    if (loading && posts.length === 0) {
      console.log('初期ロード中のためスキップ');
      return;
    }

    setIsSearching(true);
    if (fetchPostsRef.current) {
      fetchPostsRef.current(0, true, debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

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
    if (!loadingMore && hasMore && searchModeRef.current !== 'nearby' && fetchPostsRef.current) {
      fetchPostsRef.current(posts.length, false, debouncedSearchTerm);
    }
  }, [posts.length, loadingMore, hasMore, debouncedSearchTerm]);

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

  // いいね処理の改善
  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!currentUserId) return;

    const post = posts.find(p => p.id === postId);
    if (post && post.author_user_id === currentUserId) {
      return;
    }

    try {
      if (isLiked) {
        console.log('いいね追加:', { postId, currentUserId });
        const { error } = await supabase
          .from('post_likes')
          .insert({ 
            post_id: postId, 
            user_id: currentUserId,
            created_at: new Date().toISOString()
          });
        if (error) throw error;
        
        // いいねした投稿リストを即座に更新
        setLikedPostIds(prev => [postId, ...prev.filter(id => id !== postId)]);
      } else {
        console.log('いいね削除:', { postId, currentUserId });
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .match({ post_id: postId, user_id: currentUserId });
        if (error) throw error;
        
        // いいねした投稿リストから削除
        setLikedPostIds(prev => prev.filter(id => id !== postId));
      }
      
      // UIの更新
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
    setTempSearchMode('nearby');
    
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
          setTempSearchMode('all');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setError('お使いのブラウザは位置情報に対応していません。');
      setIsGettingLocation(false);
      setShowLocationPermissionAlert(false);
      setTempSearchMode('all');
    }
  };

  // フィルターを適用する処理
  const handleApplyFilters = () => {
    // 一時的な状態を実際の状態に適用
    setActiveFilter(tempActiveFilter);
    setSearchMode(tempSearchMode);
    setSortBy(tempSortBy);
    
    setShowFilterModal(false);
    
    // フィルター適用後にデータを再取得
    setTimeout(() => {
      if (fetchPostsRef.current) {
        fetchPostsRef.current(0, true);
      }
    }, 100);
  };

  // モーダルを閉じる処理（変更を破棄）
  const handleCloseModal = () => {
    // 一時的な状態を現在の適用済み状態にリセット
    setTempActiveFilter(activeFilter);
    setTempSearchMode(searchMode);
    setTempSortBy(sortBy);
    setShowFilterModal(false);
  };

  // 修正されたすべてクリア機能
  const handleClearAllFilters = useCallback(() => {
    // すべてのフィルターをリセット
    setActiveFilter('all');
    setSearchMode('all');
    setSortBy('created_at_desc');
    setGeneralSearchTerm('');
    setUserLocation(null);
    
    // 一時的な状態もリセット
    setTempActiveFilter('all');
    setTempSearchMode('all');
    setTempSortBy('created_at_desc');
    
    // フィルターをクリアした後、強制的に全投稿を再取得
    setTimeout(() => {
      if (fetchPostsRef.current) {
        fetchPostsRef.current(0, true);
      }
    }, 100);
  }, []);

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
          <HamburgerMenu currentUser={currentUserProfile} />
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="店舗名やキーワードで検索"
              value={generalSearchTerm}
              onChange={(e) => setGeneralSearchTerm(e.target.value)}
              className="pr-10 w-full text-base" // text-baseを追加してモバイルでのズームを防ぐ
              style={{ fontSize: '16px' }} // 明示的に16pxを指定
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
              {isSearching && generalSearchTerm ? (
                <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
              ) : (
                <Search className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
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
          <HamburgerMenu currentUser={currentUserProfile} />
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="店舗名やキーワードで検索"
              value={generalSearchTerm}
              onChange={(e) => setGeneralSearchTerm(e.target.value)}
              className="pr-10 w-full text-base"
              style={{ fontSize: '16px' }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
              {isSearching && generalSearchTerm ? (
                <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
              ) : (
                <Search className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
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
            <Button onClick={() => fetchPostsRef.current && fetchPostsRef.current(0, true)} className="mt-4">再試行</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="sticky top-0 z-10 border-b p-4 flex items-center space-x-2 bg-[#73370c]">
        <HamburgerMenu currentUser={currentUserProfile} />
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="店舗名やキーワードで検索"
            value={generalSearchTerm}
            onChange={(e) => setGeneralSearchTerm(e.target.value)}
            className="pr-10 w-full text-base" // text-baseを追加
            style={{ fontSize: '16px' }} // 明示的に16pxを指定してモバイルでのズームを防ぐ
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            {isSearching && generalSearchTerm ? (
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
            ) : (
              <Search className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          
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
                    // 検索履歴クリック時も即座に検索実行
                    setTimeout(() => {
                      if (fetchPostsRef.current) {
                        fetchPostsRef.current(0, true, term);
                      }
                    }, 50);
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

      {/* リアルタイム検索中の表示 */}
      {isSearching && generalSearchTerm && (
        <div className="px-4 py-2 bg-blue-50 border-b">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-700">「{generalSearchTerm}」を検索中...</span>
          </div>
        </div>
      )}

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
          height: 'calc(100vh - 280px)',
          maxHeight: 'calc(100vh - 280px)',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        <div className="p-4 pb-safe">
          {posts.length === 0 && !loading && !isSearching ? (
            <div className="text-center py-10">
              <LayoutGrid size={48} className="mx-auto text-muted-foreground mb-4" />
              {generalSearchTerm ? (
                <div>
                  <p className="text-xl text-muted-foreground mb-2">
                    「{generalSearchTerm}」の検索結果がありません
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    別のキーワードで検索してみてください
                  </p>
                  <Button onClick={() => setGeneralSearchTerm('')} className="mt-4">
                    検索をクリア
                  </Button>
                </div>
              ) : searchMode === 'nearby' ? (
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
                <Button onClick={() => {
                  setSearchMode('all');
                  setTimeout(() => {
                    if (fetchPostsRef.current) {
                      fetchPostsRef.current(0, true);
                    }
                  }, 50);
                }} className="mt-4">
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
        onClose={handleCloseModal}
        title="検索フィルター"
        description="検索条件と表示順を設定できます。"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* おすすめの検索 */}
          <div>
            <h3 className="font-semibold text-lg mb-2">おすすめの検索</h3>
            <Button
              onClick={handleNearbySearch}
              disabled={isGettingLocation}
              className={cn(
                "w-full justify-start",
                tempSearchMode === 'nearby' ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              )}
            >
              {isGettingLocation ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4 mr-2" />
              )}
              周辺から検索 (5km圏内)
            </Button>
          </div>

          {/* 🔥 カテゴリ選択をドロップダウン形式に変更 */}
          <div>
            <h3 className="font-semibold text-lg mb-2">カテゴリーで絞り込み</h3>
            <Select 
              onValueChange={(value: string) => setTempActiveFilter(value)} 
              value={tempActiveFilter}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="カテゴリを選択" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem 
                    key={category} 
                    value={category === 'すべて' ? 'all' : category}
                  >
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">表示順</h3>
            <Select onValueChange={(value: SortOption) => setTempSortBy(value)} value={tempSortBy}>
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

          {/* 特別な検索（ドロップダウン形式） */}
          <div>
            <h3 className="font-semibold text-lg mb-2">特別な検索</h3>
            <Select onValueChange={(value: SearchMode) => setTempSearchMode(value)} value={tempSearchMode}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="検索方法を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての投稿</SelectItem>
                <SelectItem 
                  value="favorite_store" 
                  disabled={!currentUserId || favoriteStoreIds.length === 0}
                >
                  お気に入り店舗の投稿 {favoriteStoreIds.length > 0 && `(${favoriteStoreIds.length}店舗)`}
                </SelectItem>
                <SelectItem 
                  value="liked_posts" 
                  disabled={!currentUserId || likedPostIds.length === 0}
                >
                  いいねした投稿 
                </SelectItem>
                <SelectItem 
                  value="hybrid" 
                  disabled={!currentUserId || (favoriteStoreIds.length === 0 && likedPostIds.length === 0)}
                >
                  複合検索 (お気に入り + いいね) 
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* いいね検索の説明を追加 */}
          {tempSearchMode === 'liked_posts' && likedPostIds.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              最新のいいね順で表示されます
            </p>
          )}
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