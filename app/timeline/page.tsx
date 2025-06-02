"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PostFilter } from '@/components/posts/post-filter';
import { Skeleton } from '@/components/ui/skeleton';
import { Post } from '@/types/post';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Search, Star, MapPin, Loader2, SlidersHorizontal, Heart, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { PostWithAuthor, AuthorProfile } from '@/types/post';
import { useSession } from 'next-auth/react';
import AppLayout from '@/components/layout/app-layout';
import { useSearchParams } from 'next/navigation';
import { PostCard } from '@/components/posts/post-card';
import { Input } from '@/components/ui/input';
import { CustomModal } from '@/components/ui/custom-modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ExtendedPostWithAuthor extends PostWithAuthor {
  isLikedByCurrentUser?: boolean;
  likes_count: number;
  store_latitude?: number;
  store_longitude?: number;
}

type SortOption = 'created_at_desc' | 'created_at_asc' | 'expires_at_asc';

const categories = ['すべて', '惣菜', '弁当', '肉', '魚', '野菜', '果物', 'その他'];

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

  const [generalSearchTerm, setGeneralSearchTerm] = useState<string>('');
  const [searchMode, setSearchMode] = useState<'all' | 'category' | 'favorite_store' | 'liked_posts' | 'nearby'>('all');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [favoriteStoreIds, setFavoriteStoreIds] = useState<string[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('created_at_desc');

  const activeFilterRef = useRef(activeFilter);
  const generalSearchTermRef = useRef(generalSearchTerm);
  const searchModeRef = useRef(searchMode);
  const userLocationRef = useRef(userLocation);
  const favoriteStoreIdsRef = useRef(favoriteStoreIds);
  const likedPostIdsRef = useRef(likedPostIds);
  const sortByRef = useRef(sortBy);

  useEffect(() => { activeFilterRef.current = activeFilter; }, [activeFilter]);
  useEffect(() => { generalSearchTermRef.current = generalSearchTerm; }, [generalSearchTerm]);
  useEffect(() => { searchModeRef.current = searchMode; }, [searchMode]);
  useEffect(() => { userLocationRef.current = userLocation; }, [userLocation]);
  useEffect(() => { favoriteStoreIdsRef.current = favoriteStoreIds; }, [favoriteStoreIds]);
  useEffect(() => { likedPostIdsRef.current = likedPostIds; }, [likedPostIds]);
  useEffect(() => { sortByRef.current = sortBy; }, [sortBy]);

  useEffect(() => {
    const id = searchParams.get('highlightPostId');
    if (id) {
      setHighlightPostId(id);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchProfileFavoriteStoreIds = async () => {
      if (!currentUserId) {
        setFavoriteStoreIds([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('app_profiles')
          .select('favorite_store_1_id, favorite_store_2_id, favorite_store_3_id')
          .eq('user_id', currentUserId)
          .single();

        if (error) {
          console.error('プロフィールのお気に入り店舗IDの取得に失敗しました:', error);
          setFavoriteStoreIds([]);
        } else {
          const ids = [];
          if (data.favorite_store_1_id) ids.push(data.favorite_store_1_id);
          if (data.favorite_store_2_id) ids.push(data.favorite_store_2_id);
          if (data.favorite_store_3_id) ids.push(data.favorite_store_3_id);
          setFavoriteStoreIds(ids);
        }
      } catch (e) {
        console.error('プロフィールのお気に入り店舗IDの取得中に予期せぬエラー:', e);
        setFavoriteStoreIds([]);
      }
    };
    if (session?.user?.id) {
      fetchProfileFavoriteStoreIds();
    }
  }, [currentUserId, session?.user?.id]);

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
          setLikedPostIds(data.map(item => item.post_id));
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

  const fetchPosts = useCallback(async (offset = 0, isInitial = false) => {
    const currentActiveFilter = activeFilterRef.current;
    const currentGeneralSearchTerm = generalSearchTermRef.current;
    const currentSearchMode = searchModeRef.current;
    const currentUserLocation = userLocationRef.current;
    const currentFavoriteStoreIds = favoriteStoreIdsRef.current;
    const currentLikedPostIds = likedPostIdsRef.current;
    const currentSortBy = sortByRef.current;

    if (isInitial) {
      setLoading(true);
      setPosts([]);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    
    try {
      const now = new Date().toISOString();
      let query;

      if (currentSearchMode === 'nearby' && currentUserLocation) {
        const radiusInMeters = 50000;
        const { data, error: rpcError } = await supabase.rpc('get_nearby_posts', {
          lat: currentUserLocation.latitude,
          lon: currentUserLocation.longitude,
          distance_meters: radiusInMeters,
        });

        if (rpcError) {
          throw rpcError;
        }

        const processedPosts = data.map((post: any) => ({
          ...post,
          author: Array.isArray(post.author) ? post.author[0] : post.author,
          isLikedByCurrentUser: post.post_likes?.some((like: any) => like.user_id === currentUserId),
          likes_count: post.post_likes?.length || 0,
        }));

        if (isInitial) {
          setPosts(processedPosts as ExtendedPostWithAuthor[]);
        } else {
          setPosts(prevPosts => [...prevPosts, ...processedPosts as ExtendedPostWithAuthor[]]);
        }
        setHasMore(data.length === 20);
        setLoading(false);
        setLoadingMore(false);
        return;
      }
      
      query = supabase
        .from('posts')
        .select(`
          id,
          created_at,
          store_name,
          category,
          content,
          image_url,
          discount_rate,
          price,
          expires_at,
          store_latitude,
          store_longitude,
          author:app_profiles (
            display_name,
            avatar_url
          ),
          post_likes ( user_id )
        `)
        .gt('expires_at', now);

      if (currentSearchMode === 'category' && currentActiveFilter !== 'all') {
        query = query.eq('category', currentActiveFilter);
      } else if (currentSearchMode === 'favorite_store' && currentFavoriteStoreIds.length > 0) {
        query = query.in('store_id', currentFavoriteStoreIds);
      } else if (currentSearchMode === 'liked_posts' && currentLikedPostIds.length > 0) {
        query = query.in('id', currentLikedPostIds);
      } else if (currentSearchMode === 'all' && currentGeneralSearchTerm) {
        query = query.or(`store_name.ilike.%${currentGeneralSearchTerm}%,category.ilike.%${currentGeneralSearchTerm}%,content.ilike.%${currentGeneralSearchTerm}%`);
      }

      if (currentSortBy === 'created_at_desc') {
        query = query.order('created_at', { ascending: false });
      } else if (currentSortBy === 'created_at_asc') {
        query = query.order('created_at', { ascending: true });
      } else if (currentSortBy === 'expires_at_asc') {
        query = query.order('expires_at', { ascending: true });
      }

      query = query.range(offset, offset + 19);

      const { data, error: dbError } = await query;

      if (dbError) {
        throw dbError;
      }
      
      const processedPosts = data.map(post => ({
        ...post,
        author: Array.isArray(post.author) ? post.author[0] : post.author,
        isLikedByCurrentUser: post.post_likes.some(like => like.user_id === currentUserId),
        likes_count: post.post_likes.length,
      }));

      if (isInitial) {
        setPosts(processedPosts as ExtendedPostWithAuthor[]);
      } else {
        setPosts(prevPosts => [...prevPosts, ...processedPosts as ExtendedPostWithAuthor[]]);
      }

      setHasMore(data.length === 20);
    } catch (e: any) {
      console.error("投稿の取得に失敗しました:", e);
      setError("投稿の読み込みに失敗しました。しばらくしてから再度お試しください。");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchPosts(0, true);
  }, [fetchPosts]);

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

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!currentUserId) return;

    try {
      if (isLiked) {
        const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUserId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('post_likes').delete().match({ post_id: postId, user_id: currentUserId });
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

  const handleNearbySearch = () => {
    setIsGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setSearchMode('nearby');
          setIsGettingLocation(false);
          setShowFilterModal(false);
          fetchPosts(0, true);
        },
        (error) => {
          console.error('位置情報の取得に失敗しました:', error);
          setError('位置情報の取得に失敗しました。ブラウザの設定をご確認ください。');
          setIsGettingLocation(false);
          setUserLocation(null);
          setSearchMode('all');
          setShowFilterModal(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setError('お使いのブラウザは位置情報に対応していません。');
      setIsGettingLocation(false);
      setSearchMode('all');
      setShowFilterModal(false);
    }
  };

  const handleApplyFilters = () => {
    setShowFilterModal(false);
    fetchPosts(0, true);
  };

  if (loading && posts.length === 0 && searchModeRef.current !== 'nearby') {
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
          <Button onClick={() => setShowFilterModal(true)} variant="outline">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
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
          <Button onClick={() => setShowFilterModal(true)} variant="outline">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
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
        </div>
        <Button onClick={() => setShowFilterModal(true)} variant="outline">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
      
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
              <p className="text-xl text-muted-foreground">この検索条件に合う投稿はまだありません。</p>
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
                    className={post.id === highlightPostId ? 'ring-4 ring-primary ring-offset-2 rounded-xl' : ''}
                  >
                    <PostCard 
                      post={post} 
                      onLike={handleLike}
                      currentUserId={currentUserId}
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
              <p className="text-muted-foreground">すべての投稿を読み込みました</p>
            </div>
          )}
          
          <div className="h-4"></div>
        </div>
      </div>

      <CustomModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="検索フィルター"
        description="検索条件と表示順を設定できます。"
      >
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-2">カテゴリーで絞り込み</h3>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={activeFilter === category || (activeFilter === 'all' && category === 'すべて') ? 'default' : 'outline'}
                  onClick={() => {
                    setActiveFilter(category === 'すべて' ? 'all' : category);
                    setSearchMode('category');
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
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="並び替え" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at_desc">新着順</SelectItem>
                <SelectItem value="created_at_asc">古い順</SelectItem>
                <SelectItem value="expires_at_asc">期限が近い順</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-center my-4">
            <Button
              className="w-12 h-12 flex items-center justify-center bg-transparent hover:bg-transparent p-0 text-[#73370c]"
              onClick={() => { /* ここに何らかのロジックを必要に応じて追加 */ }}
            >
              <Plus className="h-8 w-8" />
            </Button>
          </div>

          <div className="flex flex-col space-y-3">
            <h3 className="font-semibold text-lg mb-1">特別な検索</h3>
            <Button 
              onClick={() => {
                setSearchMode('favorite_store');
                setGeneralSearchTerm('');
                setActiveFilter('all');
                handleApplyFilters();
              }}
              disabled={!currentUserId}
              className="justify-start bg-yellow-600 text-white hover:bg-yellow-100 hover:text-yellow-800"
            >
              <Star className="h-4 w-4 mr-2" />
              お気に入り店を検索
            </Button>
            <Button
              onClick={() => {
                setSearchMode('liked_posts');
                setGeneralSearchTerm('');
                setActiveFilter('all');
                handleApplyFilters();
              }}
              disabled={!currentUserId}
              className="justify-start bg-pink-600 text-white hover:bg-pink-100 hover:text-pink-800"
            >
              <Heart className="h-4 w-4 mr-2" />
              いいねした投稿を検索
            </Button>
            <Button
              onClick={handleNearbySearch}
              disabled={isGettingLocation}
              className="justify-start bg-green-600 text-white hover:bg-green-100 hover:text-green-800"
            >
              {isGettingLocation ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4 mr-2" />
              )}
              周辺から検索
            </Button>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleApplyFilters}>フィルターを適用</Button>
        </div>
      </CustomModal>
    </AppLayout>
  );
}