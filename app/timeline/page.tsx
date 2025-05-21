"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '@/components/layout/app-layout';
import { PostCard } from '@/components/posts/post-card';
import { PostFilter, FilterOption } from '@/components/posts/post-filter';
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

const initialMockPosts: Post[] = [
  {
    id: '1',
    author: { id: 'user1', name: '食いしん坊太郎', avatar: 'https://i.pravatar.cc/150?u=user1' },
    storeId: 'storeA',
    storeName: 'スーパーマーケット ABC',
    category: '弁当',
    content: '幕ノ内弁当が半額！急げ〜！',
    image: 'https://images.unsplash.com/photo-1579887829096-3e890c7f1c11?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YmVudG98ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60',
    discountRate: 50,
    expiryOption: '3h',
    createdAt: Date.now() - 1000 * 60 * 30,
    expiresAt: Date.now() + 1000 * 60 * 60 * 2.5,
    likesCount: 12,
  },
  {
    id: '2',
    author: { id: 'user2', name: '節約上手ハナコ', avatar: 'https://i.pravatar.cc/150?u=user2' },
    storeId: 'storeB',
    storeName: 'デリカテッセン XYZ',
    category: '惣菜',
    content: '唐揚げ詰め放題、まだ間に合う！閉店間際でお得。',
    discountRate: 30,
    expiryOption: '1h',
    createdAt: Date.now() - 1000 * 60 * 5,
    expiresAt: Date.now() + 1000 * 60 * 55,
    likesCount: 5,
  },
  {
    id: '3',
    author: { id: 'user3', name: '過去の人', avatar: 'https://i.pravatar.cc/150?u=user3' },
    storeId: 'storeC',
    storeName: 'コンビニエンスストア123',
    category: 'その他',
    content: 'これはもう消えているはずの投稿です。',
    discountRate: 20,
    expiryOption: '1h',
    createdAt: Date.now() - 1000 * 60 * 120,
    expiresAt: Date.now() - 1000 * 60 * 60,
    likesCount: 2,
  }
];

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onShare: (postId: string) => void;
  isLikedByCurrentUser?: boolean;
}

const NewPostCard: React.FC<PostCardProps> = ({ post, onLike, onShare, isLikedByCurrentUser }) => {
  const [showShareDialog, setShowShareDialog] = useState(false);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${post.storeName}の${post.category}がお得！`,
        text: `${post.content} (値引き率: ${post.discountRate}%)`,
        url: window.location.href,
      })
      .then(() => console.log('共有成功'))
      .catch((error) => console.log('共有失敗', error));
    } else {
      setShowShareDialog(true);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("リンクをコピーしました！");
      setShowShareDialog(false);
    }).catch(err => console.error("コピー失敗:", err));
  };

  return (
    <motion.div className="bg-card shadow-lg rounded-lg overflow-hidden border border-border">
      <div className="p-4">
        <div className="flex items-center mb-3">
          <img src={post.author.avatar} alt={post.author.name} className="w-10 h-10 rounded-full mr-3" />
          <div>
            <p className="font-semibold text-card-foreground">{post.author.name}</p>
            <p className="text-xs text-muted-foreground">{formatTimeAgo(post.createdAt)}</p>
          </div>
        </div>
        
        {post.image && (
          <img src={post.image} alt="投稿画像" className="w-full h-48 object-cover rounded-md mb-3" />
        )}
        
        <h3 className="text-lg font-semibold mb-1 text-primary">{post.storeName} - {post.category}</h3>
        <p className="text-sm text-card-foreground mb-2">{post.content}</p>
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
          <span className="bg-accent text-accent-foreground px-2 py-1 rounded-full text-xs font-semibold">
            {post.discountRate}% OFF
          </span>
          <div className="flex items-center">
            <Clock size={14} className="mr-1" />
            <span>{formatRemainingTime(post.expiresAt)}</span>
          </div>
        </div>
      </div>
      
      <div className="border-t border-border px-4 py-2 flex justify-around">
        <Button variant="ghost" size="sm" onClick={() => onLike(post.id)} className="flex items-center space-x-1">
          <Heart size={18} className={isLikedByCurrentUser ? "text-red-500 fill-red-500" : ""} />
          <span>{post.likesCount}</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={handleShare} className="flex items-center space-x-1">
          <Share2 size={18} />
          <span>共有</span>
        </Button>
      </div>

      <AlertDialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>投稿を共有</AlertDialogTitle>
            <AlertDialogDescription>
              このお得情報を友達に知らせよう！
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Button className="w-full" onClick={() => copyToClipboard(window.location.href)}>
              リンクをコピー
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>閉じる</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default function Timeline() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      const now = Date.now();
      const validPosts = initialMockPosts.filter(p => p.expiresAt > now);
      setPosts(validPosts.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    }, 1000);
    
    const interval = setInterval(() => {
      setPosts(prevPosts => {
        const now = Date.now();
        return prevPosts
          .filter(p => p.expiresAt > now)
          .map(p => ({ ...p, likesCount: p.likesCount + (Math.random() > 0.8 ? 1 : 0) }))
          .sort((a, b) => b.createdAt - a.createdAt);
      });
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);
  
  const handleLike = useCallback(async (postId: string) => {
    console.log(`いいね: ${postId}`);
    setPosts(prevPosts =>
      prevPosts.map(p =>
        p.id === postId 
          ? { ...p, likesCount: (p.likesCount || 0) + 1 } 
          : p
      )
    );
  }, []);

  const handleShare = useCallback((postId: string) => {
    console.log(`共有: ${postId}`);
  }, []);

  const filteredPosts = posts.filter(post => {
    if (activeFilter === 'all') return true;
    return post.category === activeFilter;
  });

  return (
    <AppLayout>
      <div className="p-4">
        <PostFilter activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
        
        <div className="space-y-4 mt-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="mb-4">
                <Skeleton className="h-[280px] w-full rounded-lg" />
              </div>
            ))
          ) : (
            <AnimatePresence initial={false}>
              {filteredPosts.length > 0 ? (
                filteredPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <NewPostCard 
                      post={post} 
                      onLike={handleLike}
                      onShare={handleShare}
                    />
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-8 text-center"
                >
                  <p className="text-muted-foreground">表示できる投稿がありません。</p>
                  <p className="text-sm text-muted-foreground">新しい投稿をお待ちください。</p>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </AppLayout>
  );
}