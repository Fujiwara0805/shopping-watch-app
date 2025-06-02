"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PostFilter } from '@/components/posts/post-filter';
import { Skeleton } from '@/components/ui/skeleton';
import { Post } from '@/types/post';
import { Button } from '@/components/ui/button';
import { LayoutGrid } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { PostWithAuthor, AuthorProfile } from '@/types/post';
import { useSession } from 'next-auth/react';
import AppLayout from '@/components/layout/app-layout';
import { useSearchParams } from 'next/navigation';
import { PostCard } from '@/components/posts/post-card';

interface ExtendedPostWithAuthor extends PostWithAuthor {
  isLikedByCurrentUser?: boolean;
  likes_count: number;
}

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

  useEffect(() => {
    const id = searchParams.get('highlightPostId');
    if (id) {
      setHighlightPostId(id);
    }
  }, [searchParams]);

  const fetchPosts = useCallback(async (offset = 0, isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    
    try {
      const now = new Date().toISOString();
      let query = supabase
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
          author:app_profiles (
            display_name,
            avatar_url
          ),
          post_likes ( user_id )
        `)
        .gt('expires_at', now)
        .order('created_at', { ascending: false })
        .range(offset, offset + 19); // 20件ずつ取得

      if (activeFilter !== 'all') {
        query = query.eq('category', activeFilter);
      }

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

      // 20件未満の場合、これ以上データがないと判断
      setHasMore(data.length === 20);
    } catch (e: any) {
      console.error("投稿の取得に失敗しました:", e);
      setError("投稿の読み込みに失敗しました。しばらくしてから再度お試しください。");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeFilter, currentUserId]);

  useEffect(() => {
    fetchPosts(0, true);
  }, [fetchPosts]);

  // ハイライトとスクロールのためのeffect
  useEffect(() => {
    if (highlightPostId && posts.length > 0) {
      const element = document.getElementById(`post-${highlightPostId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // ハイライトアニメーションを適用するために、少し遅延させる
        setTimeout(() => {
          setHighlightPostId(null); // 一度ハイライトしたらリセット
        }, 3000); // 3秒後にハイライトを解除
      }
    }
  }, [highlightPostId, posts]);

  const loadMorePosts = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchPosts(posts.length, false);
    }
  }, [fetchPosts, posts.length, loadingMore, hasMore]);

  // スクロール監視のためのeffect
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

  if (loading && posts.length === 0) {
    return (
      <AppLayout>
        {/* フィルター部分 - 固定 */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="p-4">
            <PostFilter activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
          </div>
        </div>
        
        {/* ローディング表示 */}
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
      {/* フィルター部分 - 固定 */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="p-4">
          <PostFilter activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
        </div>
      </div>
      
      {/* 投稿一覧部分 - スクロール可能 */}
      <div 
        className="timeline-scroll-container custom-scrollbar overscroll-none"
        style={{ 
          height: 'calc(100vh - 120px)', // フィルター部分の高さを引く
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        <div className="p-4 pb-safe">
          {posts.length === 0 && !loading ? (
            <div className="text-center py-10">
              <LayoutGrid size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-xl text-muted-foreground">このカテゴリの投稿はまだありません。</p>
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
          
          {/* 追加読み込み中の表示 */}
          {loadingMore && (
            <div className="mt-6">
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={`loading-${i}`} className="h-[400px] w-full rounded-xl" />
                ))}
              </div>
            </div>
          )}
          
          {/* すべて読み込み完了の表示 */}
          {!hasMore && posts.length > 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">すべての投稿を読み込みました</p>
            </div>
          )}
          
          {/* 最後の余白 */}
          <div className="h-4"></div>
        </div>
      </div>
    </AppLayout>
  );
}