"use client";

import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Heart, Share2, Clock, Link as LinkIcon, ExternalLink, Instagram, Copy, Laugh, Smile, Meh, Frown, Angry, MapPin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PostWithAuthor, AuthorProfile } from '@/types/post';
import { supabase } from '@/lib/supabaseClient';
import { CustomModal } from '@/components/ui/custom-modal';
import { useToast } from '@/hooks/use-toast';
import React from 'react';

const discountIcons = [
  { value: 0, Icon: Angry, label: "0%" },
  { value: 20, Icon: Frown, label: "20~40%" },
  { value: 40, Icon: Meh, label: "40~60%" },
  { value: 60, Icon: Smile, label: "60~80%" },
  { value: 80, Icon: Laugh, label: "80~100%" },
];

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

// 距離をフォーマット
function formatDistance(distance?: number): string {
  if (!distance) return '';
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }
  return `${(distance / 1000).toFixed(1)}km`;
}

export interface ExtendedPostWithAuthor extends PostWithAuthor {
  isLikedByCurrentUser?: boolean;
  likes_count: number;
  remaining_items?: number;
  consumption_deadline?: string;
  distance?: number;
  author_user_id?: string; // authorから取得するuser_id
  author_posts_count?: number; // ユーザーの投稿数を追加
}

interface PostCardProps {
  post: ExtendedPostWithAuthor;
  onLike?: (postId: string, isLiked: boolean) => Promise<void>;
  currentUserId?: string | null;
  showDistance?: boolean;
  isOwnPost?: boolean;
  onClick?: (postId: string) => void;
  disableClick?: boolean;
  isFullScreen?: boolean; // フルスクリーンモード時のスタイル適用
}

// 最適化された画像コンポーネント
const OptimizedImage = memo(({ 
  src, 
  alt, 
  className, 
  onLoad,
  onError 
}: { 
  src: string; 
  alt: string; 
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [loadStarted, setLoadStarted] = useState(false);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !loadStarted) {
            setIsInView(true);
            setLoadStarted(true);
            observer.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px', // 50px手前から読み込み開始
        threshold: 0.1
      }
    );

    observer.observe(img);
    return () => observer.unobserve(img);
  }, [loadStarted]);

  // プリロード機能（画面に入ったら即座に読み込む）
  useEffect(() => {
    if (isInView && !isLoaded && !hasError) {
      const img = new Image();
      img.onload = () => {
        setIsLoaded(true);
        onLoad?.();
      };
      img.onerror = () => {
        setHasError(true);
        onError?.();
      };
      img.src = src;
    }
  }, [isInView, src, isLoaded, hasError, onLoad, onError]);

  return (
    <div ref={imgRef} className={cn("relative overflow-hidden", className)}>
      {/* プレースホルダー */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 bg-gray-400 rounded animate-pulse" />
        </div>
      )}
      
      {/* エラー時のフォールバック */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
          <div className="text-gray-500 text-sm text-center">
            <div className="w-8 h-8 bg-gray-400 rounded mx-auto mb-2" />
            画像を読み込めません
          </div>
        </div>
      )}
      
      {/* 実際の画像 */}
      {isLoaded && !hasError && (
        <motion.img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          loading="lazy"
        />
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// メモ化されたバッジコンポーネント
const DiscountBadge = memo(({ discountRate }: { discountRate: number | null | undefined }) => {
  if (discountRate == null) return null;

  const selectedOption = discountIcons.find(option => option.value === discountRate);
  const displayIcon = selectedOption ? selectedOption.Icon : Angry;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.3 }}
    >
      <Badge className="bg-primary text-primary-foreground font-bold text-xl px-2 py-1 shadow-sm flex items-center">
        {React.createElement(displayIcon, { className: "h-6 w-6" })}
      </Badge>
    </motion.div>
  );
});

DiscountBadge.displayName = 'DiscountBadge';

// メモ化されたアバターコンポーネント
const UserAvatar = memo(({ author }: { author: AuthorProfile | null }) => {
  const authorAvatarUrl = author?.avatar_url
    ? supabase.storage.from('avatars').getPublicUrl(author.avatar_url).data.publicUrl
    : null;

  return (
    <Avatar className="h-7 w-7">
      <AvatarImage src={authorAvatarUrl || undefined} alt={author?.display_name || '投稿者'} />
      <AvatarFallback className="text-xs">{author?.display_name?.charAt(0) || '?'}</AvatarFallback>
    </Avatar>
  );
});

UserAvatar.displayName = 'UserAvatar';

// メモ化された投稿カードコンポーネント
export const PostCard = memo(({ 
  post, 
  onLike, 
  currentUserId, 
  showDistance = false, 
  isOwnPost, 
  onClick,
  disableClick = false,
  isFullScreen = false 
}: PostCardProps) => {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const { toast } = useToast();

  // 自分の投稿かどうかの判定を改善
  const isMyPost = isOwnPost || (post.author_user_id === currentUserId);

  const handleLikeClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation(); // 親のclickイベントを防ぐ
    
    if (isLiking) return; // 重複クリック防止
    
    // 自分の投稿にはいいねできない
    if (isMyPost) {
      toast({
        title: "自分の投稿にはいいねできません",
        duration: 2000,
      });
      return;
    }
    
    if (onLike && currentUserId) {
      setIsLiking(true);
      try {
        await onLike(post.id, !(post.isLikedByCurrentUser ?? false));
      } catch (error) {
        console.error('いいね処理エラー:', error);
        toast({
          title: "エラーが発生しました",
          description: "いいね処理に失敗しました。",
          duration: 3000,
        });
      } finally {
        setIsLiking(false);
      }
    } else if (!currentUserId) {
      toast({
        title: "ログインが必要です",
        description: "いいねをするにはログインしてください。",
        duration: 3000,
      });
    }
  }, [onLike, currentUserId, post.id, post.isLikedByCurrentUser, isLiking, toast, isMyPost]);

  const handleShareClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // 親のclickイベントを防ぐ
    setShowShareDialog(true);
  }, []);

  const handleCardClick = useCallback(() => {
    if (!disableClick && onClick) {
      onClick(post.id);
    }
  }, [disableClick, onClick, post.id]);
  
  const getCategoryColor = useCallback((category: string) => {
    switch(category) {
      case '惣菜':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case '弁当':
        return 'bg-green-100 text-green-800 border-green-200';
      case '肉':
        return 'bg-red-100 text-red-800 border-red-200';
      case '魚':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case '野菜':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case '果物':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);
  
  const formattedDate = post.created_at ? formatDistanceToNow(new Date(post.created_at), { 
    addSuffix: true,
    locale: ja
  }) : '日付不明';

  const postImageUrl = post.image_url;

  const copyToClipboard = useCallback((text: string, message: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: `✅ ${message}`,
        duration: 2000,
      });
      setShowShareDialog(false);
    }).catch(err => console.error("コピー失敗:", err));
  }, [toast]);

  const handleCopyStoreName = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // 親のclickイベントを防ぐ
    if (post.store_name) {
      copyToClipboard(post.store_name, `「${post.store_name}」をコピーしました！`);
    }
  }, [post.store_name, copyToClipboard]);

  const handleInstagramShare = useCallback(() => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    copyToClipboard(postUrl, "投稿のリンクをコピーしました。Instagramアプリを開いて共有してください。");
    setShowShareDialog(false);
  }, [post.id, copyToClipboard]);

  const handleNativeShare = useCallback(async () => {
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
      copyToClipboard(shareData.url, "リンクをコピーしました！");
    }
  }, [post.store_name, post.category, post.content, post.id, copyToClipboard]);

  return (
    <>
      <Card 
        className={cn(
          "overflow-hidden transition-all duration-200",
          !disableClick && "hover:shadow-lg cursor-pointer",
          isMyPost && "ring-2 ring-blue-200 bg-blue-50/30",
          isFullScreen && "bg-black/20 border-white/20"
        )}
        onClick={handleCardClick}
      >
        <CardHeader className="p-3 pb-1 space-y-0">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-2">
              <UserAvatar author={post.author} />
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <p className={cn(
                    "font-semibold text-base",
                    isFullScreen ? "text-white" : "text-foreground"
                  )}>
                    {post.author?.display_name || '不明な投稿者'}
                  </p>
                  {isMyPost && <Badge variant="secondary" className="text-xs">自分の投稿</Badge>}
                </div>
                <div className="flex items-center space-x-2">
                  <p className={cn(
                    "text-xs",
                    isFullScreen ? "text-white/80" : "text-muted-foreground"
                  )}>
                    {formattedDate}
                  </p>
                  {post.author_posts_count && post.author_posts_count > 0 && (
                    <>
                      <span className={cn(
                        "text-xs",
                        isFullScreen ? "text-white/60" : "text-muted-foreground/60"
                      )}>•</span>
                      <p className={cn(
                        "text-xs",
                        isFullScreen ? "text-white/80" : "text-muted-foreground"
                      )}>
                        投稿数: {post.author_posts_count}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end space-y-2">
              <Badge className={cn("text-lg", getCategoryColor(post.category || ''))}>
                {post.category || '不明'}
              </Badge>
              {showDistance && post.distance && (
                <Badge variant="outline" className="text-xs flex items-center">
                  <MapPin className="h-3 w-3 mr-1" />
                  {formatDistance(post.distance)}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-3 pt-1 flex flex-col h-full">
          <div className="flex-grow overflow-hidden" style={{ flexBasis: 'auto', marginBottom: '0.75rem' }}>
            <p className={cn(
              "text-lg whitespace-pre-line line-clamp-6",
              isFullScreen ? "text-white" : "text-muted-foreground"
            )}>
              {post.content || '内容がありません'}
            </p>
          </div>
          
          {postImageUrl && (
            <div className="flex justify-center w-full">
              <div className="relative rounded-md overflow-hidden" style={{ width: '350px', height: '350px' }}>
                <OptimizedImage
                  src={postImageUrl}
                  alt="投稿画像"
                  className="w-full h-full"
                  onLoad={() => setImageLoaded(true)}
                />
                
                <div className="absolute top-2 left-2 flex flex-col items-start space-y-2">
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className={cn(
                        "bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors backdrop-blur-sm",
                        isMyPost && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={handleLikeClick}
                      disabled={isLiking || isMyPost}
                      title={isMyPost ? "自分の投稿にはいいねできません" : "いいね"}
                    >
                      <Heart 
                        size={18} 
                        className={cn(
                          "transition-all duration-200",
                          post.isLikedByCurrentUser ? "text-red-500 fill-red-500 scale-110" : "",
                          isLiking && "animate-pulse"
                        )} 
                      />
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors backdrop-blur-sm"
                      onClick={handleShareClick}
                    >
                      <Share2 size={18} />
                    </Button>

                    {post.expires_at && (
                      <div className="bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1 backdrop-blur-sm">
                        <Clock size={14} />
                        <span>{formatRemainingTime(new Date(post.expires_at).getTime())}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* いいね数の数字のみ表示 */}
                  {post.likes_count > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm"
                    >
                      <span className="font-medium">{post.likes_count}</span>
                    </motion.div>
                  )}
                </div>
                
                <Button 
                  variant="ghost"
                  className="absolute bottom-1 left-1 bg-black/60 text-white text-lg font-bold px-3 py-1 rounded-md h-auto hover:bg-black/80 transition-colors flex items-center space-x-1 backdrop-blur-sm"
                  onClick={handleCopyStoreName}
                >
                  <Copy size={16} />
                  <span className="max-w-[150px] truncate">{post.store_name || '店舗不明'}</span>
                </Button>

                <div className="absolute top-[30px] right-2 flex flex-col items-end space-y-2">
                  <DiscountBadge discountRate={post.discount_rate} />
                  
                  {post.price != null && (
                    <div className="relative mt-2">
                      <div className="relative bg-gradient-to-br from-yellow-400 via-yellow-300 to-yellow-500 text-red-600 font-black text-3xl px-4 py-3 overflow-hidden"
                           style={{
                             clipPath: 'polygon(5% 15%, 15% 5%, 25% 20%, 35% 0%, 45% 15%, 55% 5%, 65% 20%, 75% 0%, 85% 15%, 95% 5%, 100% 20%, 95% 30%, 100% 40%, 90% 50%, 100% 60%, 95% 70%, 100% 80%, 85% 85%, 75% 100%, 65% 80%, 55% 95%, 45% 85%, 35% 100%, 25% 80%, 15% 95%, 5% 85%, 0% 80%, 5% 70%, 0% 60%, 10% 50%, 0% 40%, 5% 30%, 0% 20%)'
                           }}>
                        {/* チラシ風の背景パターン */}
                        <div className="absolute inset-0 opacity-20">
                          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/50 to-transparent"></div>
                          <div className="absolute bottom-0 right-0 w-4 h-4 bg-red-400 rounded-full transform translate-x-2 translate-y-2"></div>
                        </div>
                        <div className="relative z-10 flex items-center" style={{ textShadow: '2px 2px 0 white, -2px -2px 0 white, 2px -2px 0 white, -2px 2px 0 white, 1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white' }}>
                          <span className="text-2xl mr-1">¥</span>
                          <span className="tracking-tight">{post.price.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                copyToClipboard(`${window.location.origin}/post/${post.id}`, "リンクをコピーしました！");
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
          {navigator.share && typeof navigator.share === 'function' && (
            <Button
              variant="outline"
              className="w-full justify-start text-left py-3 h-auto text-base"
              onClick={handleNativeShare}
            >
              <ExternalLink className="mr-2.5 h-5 w-5" />
              その他のアプリで共有
            </Button>
          )}
        </div>
        <div className="mt-6 flex justify-end">
            <Button variant="ghost" onClick={() => setShowShareDialog(false)} className="text-base px-5 py-2.5 h-auto">閉じる</Button>
        </div>
      </CustomModal>
    </>
  );
});

PostCard.displayName = 'PostCard';