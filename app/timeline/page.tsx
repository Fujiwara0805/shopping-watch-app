"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PostCard } from '@/components/posts/post-card';
import { PostFilter } from '@/components/posts/post-filter';
import { Skeleton } from '@/components/ui/skeleton';
import { Post } from '@/types/post';
import { Button } from '@/components/ui/button';
import { Heart, Share2, MessageCircle, Clock, Link as LinkIcon, ExternalLink, Instagram } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { PostWithAuthor, AuthorProfile } from '@/types/post';
import { useSession } from 'next-auth/react';
import { LayoutGrid } from 'lucide-react';
import { CustomModal } from '@/components/ui/custom-modal';

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
  likes_count: number;
}

interface PostCardProps {
  post: ExtendedPostWithAuthor;
  onLike: (postId: string, isLiked: boolean) => Promise<void>;
  currentUserId?: string | null;
}

const NewPostCard: React.FC<PostCardProps> = ({ post, onLike, currentUserId }) => {
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

  const handleNativeShare = async () => {
    const shareData = {
      title: `${post.store_name}の${post.category}がお得！`,
      text: post.content,
      url: `${window.location.origin}/post/${post.id}`,
    };
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        setShowShareDialog(false);
      } catch (error) {
        console.error('ネイティブ共有失敗:', error);
      }
    } else {
      console.warn('ネイティブ共有APIが利用できません、またはこのデータを共有できません。');
      copyToClipboard(shareData.url);
    }
  };

  const handleInstagramShare = () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    copyToClipboard(postUrl);
    alert("投稿のリンクをコピーしました。Instagramアプリを開いて共有してください。");
    setShowShareDialog(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-card shadow-lg rounded-xl overflow-hidden border border-border"
    >
      <div className="p-5">
        <div className="flex items-center mb-4">
          <img src={authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=random&color=fff&font-size=0.33`} alt={authorName} className="w-10 h-10 rounded-full mr-3 bg-muted object-cover" />
          <div>
            <p className="font-semibold text-card-foreground">{authorName}</p>
            <p className="text-xs text-muted-foreground">{formatTimeAgo(new Date(post.created_at).getTime())}</p>
          </div>
        </div>
        
        {postImageUrl && (
          <div className="mb-3 aspect-[16/9] overflow-hidden rounded-lg border">
            <img src={postImageUrl} alt="投稿画像" className="w-full h-full object-cover" />
          </div>
        )}
        
        <h3 className="text-xl font-bold mb-1.5 text-foreground">{post.store_name} - <span className="text-primary">{post.category}</span></h3>
        <p className="text-base text-muted-foreground mb-3 whitespace-pre-line line-clamp-3">{post.content}</p>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          {post.discount_rate != null && (
            <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
              {post.discount_rate}% OFF
            </span>
          )}
          <div className="flex items-center">
            <Clock size={14} className="mr-1" />
            <span>{formatRemainingTime(new Date(post.expires_at).getTime())}</span>
          </div>
        </div>
      </div>
      
      <div className="border-t border-border px-3 py-2 flex justify-around bg-muted/20">
        <Button variant="ghost" size="sm" onClick={handleLikeClick} className="flex-1 flex items-center justify-center space-x-1.5 text-muted-foreground hover:text-primary transition-colors py-2.5">
          <Heart size={18} className={post.isLikedByCurrentUser ? "text-red-500 fill-red-500" : ""} />
          <span className="font-medium text-sm">{post.likes_count || 0}</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => {setShowShareDialog(true)}} className="flex-1 flex items-center justify-center space-x-1.5 text-muted-foreground hover:text-primary transition-colors py-2.5">
          <Share2 size={18} />
          <span className="font-medium text-sm">共有</span>
        </Button>
      </div>

      <CustomModal
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        title="投稿を共有"
        description="このお得情報を友達に知らせよう！"
      >
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start text-left py-3 h-auto text-base"
            onClick={() => {
                copyToClipboard(`${window.location.origin}/post/${post.id}`);
            }}
          >
            <LinkIcon className="mr-2.5 h-5 w-5" />
            リンクをコピー
          </Button>
          <Button
            className="w-full justify-start text-left py-3 h-auto text-base bg-[#1DA1F2] hover:bg-[#1a91da] text-white"
            onClick={() => {
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${post.store_name}の${post.category}がお得！ ${post.content}`)}&url=${encodeURIComponent(`${window.location.origin}/post/${post.id}`)}`, '_blank');
                setShowShareDialog(false);
            }}
          >
            <svg className="mr-2.5 h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden="true"><g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></g></svg>
            X (Twitter) で共有
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-left py-3 h-auto text-base bg-[#E1306C] hover:bg-[#c92a5f] text-white"
            onClick={handleInstagramShare}
          >
            <Instagram className="mr-2.5 h-5 w-5" />
            Instagramで共有
          </Button>
        </div>
        <div className="mt-6 flex justify-end">
            <Button variant="ghost" onClick={() => setShowShareDialog(false)} className="text-base px-5 py-2.5 h-auto">閉じる</Button>
        </div>
      </CustomModal>
    </motion.div>
  );
};

export default function Timeline() {
  const [posts, setPosts] = useState<ExtendedPostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const fetchPosts = useCallback(async () => {
    setLoading(true);
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
        .limit(20);

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

      setPosts(processedPosts as ExtendedPostWithAuthor[]);
    } catch (e: any) {
      console.error("投稿の取得に失敗しました:", e);
      setError("投稿の読み込みに失敗しました。しばらくしてから再度お試しください。");
    } finally {
      setLoading(false);
    }
  }, [activeFilter, currentUserId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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
      <>
        <PostFilter activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
        <div className="grid gap-6 mt-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[400px] w-full rounded-xl" />
          ))}
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <p className="text-destructive text-lg">{error}</p>
        <Button onClick={fetchPosts} className="mt-4">再試行</Button>
      </div>
    );
  }

  return (
    <>
      <PostFilter activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
      {loading && posts.length > 0 && (
        <div className="text-center py-4">
          <p>更新中...</p>
        </div>
      )}
      {posts.length === 0 && !loading ? (
        <div className="text-center py-10">
          <LayoutGrid size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-xl text-muted-foreground">このカテゴリの投稿はまだありません。</p>
        </div>
      ) : (
        <motion.div
          layout
          className="grid gap-4 sm:gap-6 mt-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {posts.map(post => (
            <NewPostCard 
              key={post.id} 
              post={post} 
              onLike={handleLike}
              currentUserId={currentUserId}
            />
          ))}
        </motion.div>
      )}
    </>
  );
}