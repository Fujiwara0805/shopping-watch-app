"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '@/components/layout/app-layout';
import { PostCard } from '@/components/posts/post-card';
import { PostFilter } from '@/components/posts/post-filter';
import { Skeleton } from '@/components/ui/skeleton';
import { mockPosts } from '@/lib/mock-data';
import { Post } from '@/types/post';
import { Button } from '@/components/ui/button';
import { Heart, Share2, MessageCircle, Clock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/lib/supabaseClient';
import { PostWithAuthor, AuthorProfile } from '@/types/post';
import { useSession } from 'next-auth/react';
import { LayoutGrid } from 'lucide-react';

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const seconds = Math.round((now - timestamp) / 1000);

  if (seconds < 60) return `${seconds}秒前`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.round(hours / 24);
  return `${days}日前`;
}

function formatRemainingTime(expiresAt: number): string {
  const now = Date.now();
  const remainingMillis = expiresAt - now;

  if (remainingMillis <= 0) return "掲載終了";

  const hours = Math.floor(remainingMillis / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMillis % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `残り約${hours}時間${minutes > 0 ? `${minutes}分` : ''}`;
  }
  return `残り約${minutes}分`;
}

interface ExtendedPostWithAuthor extends PostWithAuthor {
  isLikedByCurrentUser?: boolean;
}

interface PostCardProps {
  post: ExtendedPostWithAuthor;
  onLike: (postId: string, isLiked: boolean) => Promise<void>;
  onShare: (postId: string) => void;
  currentUserId?: string | null;
}

const NewPostCard: React.FC<PostCardProps> = ({ post, onLike, onShare, currentUserId }) => {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const { data: session } = useSession();

  const authorName = post.author?.display_name || '匿名ユーザー';
  
  const authorAvatar = post.author?.avatar_url
    ? supabase.storage.from('avatars').getPublicUrl(post.author.avatar_url).data.publicUrl
    : undefined;

  const postImageUrl = post.image_url
    ? supabase.storage.from('images').getPublicUrl(post.image_url).data.publicUrl
    : null;

  const handleLikeClick = async () => {
    if (!session?.user?.id) {
      alert("いいねをするにはログインが必要です。");
      return;
    }
    await onLike(post.id, !(post.isLikedByCurrentUser ?? false));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("リンクをコピーしました！");
      setShowShareDialog(false);
    }).catch(err => console.error("コピー失敗:", err));
  };

  // ネイティブ共有APIの確認と実行
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${post.store_name}の${post.category}がお得！`,
          text: post.content,
          url: `${window.location.origin}/post/${post.id}`,
        });
        setShowShareDialog(false);
      } catch (error) {
        console.error('Failed to share:', error);
        // 共有に失敗した場合のフォールバック（例: リンクコピー）
        copyToClipboard(`${window.location.origin}/post/${post.id}`);
      }
    } else {
      // navigator.share が利用できない場合のフォールバック
      copyToClipboard(`${window.location.origin}/post/${post.id}`);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-card shadow-lg rounded-lg overflow-hidden border border-border"
    >
      <div className="p-4">
        <div className="flex items-center mb-3">
          <img src={authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=random`} alt={authorName} className="w-10 h-10 rounded-full mr-3 bg-muted" />
          <div>
            <p className="font-semibold text-card-foreground">{authorName}</p>
            <p className="text-xs text-muted-foreground">{formatTimeAgo(new Date(post.created_at).getTime())}</p>
          </div>
        </div>
        
        {postImageUrl && (
          <img src={postImageUrl} alt="投稿画像" className="w-full h-60 object-cover rounded-md mb-3" />
        )}
        
        <h3 className="text-xl font-semibold mb-1 text-primary">{post.store_name} - {post.category}</h3>
        <p className="text-base text-card-foreground mb-2 whitespace-pre-line">{post.content}</p>
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
          <span className="bg-primary text-primary-foreground px-2.5 py-1 rounded-full text-xs font-semibold shadow">
            {post.discount_rate}% OFF
          </span>
          <div className="flex items-center">
            <Clock size={14} className="mr-1" />
            <span>{formatRemainingTime(new Date(post.expires_at).getTime())}</span>
          </div>
        </div>
      </div>
      
      <div className="border-t border-border px-4 py-2 flex justify-around bg-muted/30">
        <Button variant="ghost" size="sm" onClick={handleLikeClick} className="flex items-center space-x-1 text-muted-foreground hover:text-primary transition-colors">
          <Heart size={18} className={post.isLikedByCurrentUser ? "text-red-500 fill-red-500" : ""} />
          <span className="font-medium">{post.likes_count || 0}</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => {setShowShareDialog(true)}} className="flex items-center space-x-1 text-muted-foreground hover:text-primary transition-colors">
          <Share2 size={18} />
          <span className="font-medium">共有</span>
        </Button>
      </div>

      {/* 共有ダイアログ */}
      <AnimatePresence>
        {showShareDialog && (
          <AlertDialog open={showShareDialog} onOpenChange={setShowShareDialog}>
            <AlertDialogContent asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <AlertDialogHeader>
                  <AlertDialogTitle>投稿を共有</AlertDialogTitle>
                  <AlertDialogDescription>
                    このお得情報を友達に知らせよう！
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                        copyToClipboard(`${window.location.origin}/post/${post.id}`);
                    }}
                  >
                    リンクをコピー
                  </Button>
                  <Button
                    className="w-full bg-[#1DA1F2] hover:bg-[#1a91da] text-white"
                    onClick={() => {
                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${post.store_name}の${post.category}がお得！ ${post.content}`)}&url=${encodeURIComponent(`${window.location.origin}/post/${post.id}`)}`, '_blank');
                        setShowShareDialog(false);
                    }}
                  >
                    X (Twitter) で共有
                  </Button>
                   {/* ネイティブ共有APIボタンを追加 */}
                  {'share' in navigator && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleNativeShare}
                    >
                      その他の方法で共有
                    </Button>
                  )}
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>閉じる</AlertDialogCancel>
                </AlertDialogFooter>
              </motion.div>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function Timeline() {
  const [posts, setPosts] = useState<ExtendedPostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const { data: session } = useSession();

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      let query = supabase
        .from('posts')
        .select(`
          *,
          author:app_profiles (
            display_name,
            avatar_url
          ),
          post_likes ( user_id )
        `)
        .gt('expires_at', now)
        .order('created_at', { ascending: false });

      if (activeFilter !== 'all') {
        query = query.eq('category', activeFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      const processedPosts = data?.map(post => ({
        ...post,
        likes_count: typeof post.likes_count === 'number' ? post.likes_count : 0,
        isLikedByCurrentUser: session?.user?.id ? post.post_likes.some((like: any) => like.user_id === session.user.id) : false,
        author: post.author || { display_name: '匿名ユーザー', avatar_url: null } as AuthorProfile,
      })) || [];

      console.log("Fetched and processed posts:", processedPosts);
      setPosts(processedPosts as ExtendedPostWithAuthor[]);

    } catch (e: any) {
      console.error("Error fetching posts:", e);
      setError("投稿の読み込みに失敗しました。");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, session?.user?.id]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    const postsSubscription = supabase
      .channel('public:posts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        (payload) => {
          console.log('Posts change received!', payload);
          fetchPosts();
        }
      )
      .subscribe();

    const likesSubscription = supabase
      .channel('public:post_likes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_likes' },
        (payload) => {
          console.log('Post_likes change received!', payload);
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsSubscription);
      supabase.removeChannel(likesSubscription);
    };
  }, [fetchPosts]);

  const handleLike = useCallback(async (postId: string, isCurrentlyLiked: boolean) => {
    if (!session?.user?.id) {
      console.error("User not logged in");
      return;
    }

    const userId = session.user.id;

    setPosts(prevPosts =>
      prevPosts.map(p =>
        p.id === postId
          ? {
              ...p,
              isLikedByCurrentUser: !isCurrentlyLiked,
              likes_count: isCurrentlyLiked
                ? (p.likes_count || 1) - 1
                : (p.likes_count || 0) + 1,
            }
          : p
      )
    );

    try {
      if (!isCurrentlyLiked) {
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: userId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .match({ post_id: postId, user_id: userId });
        if (error) throw error;
      }
    } catch (error) {
      console.error("Error updating like status:", error);
      fetchPosts();
    }
  }, [session?.user?.id, fetchPosts]);

  const handleShare = useCallback((postId: string) => {
    console.log(`共有: ${postId}`);
  }, []);

  return (
    <AppLayout>
      <div className="container mx-auto max-w-xl p-4">
        <PostFilter activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
        
        {error && (
          <div className="my-4 p-4 bg-destructive/10 text-destructive text-center rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-6 mt-6">
          <AnimatePresence>
            {loading && posts.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => (
                <motion.div
                  key={`skeleton-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Skeleton className="h-[320px] w-full rounded-lg" />
                </motion.div>
              ))
            ) : posts.length > 0 ? (
              posts.map(post => (
                <NewPostCard
                  key={post.id}
                  post={post}
                  onLike={handleLike}
                  onShare={handleShare}
                  currentUserId={session?.user?.id || null}
                />
              ))
            ) : (
              !loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-muted-foreground py-10"
                >
                  <LayoutGrid size={48} className="mx-auto mb-4" />
                  <p className="text-xl">表示できる投稿がまだありません。</p>
                  <p>新しい投稿をお待ちください！</p>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
}