"use client";

import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns'; // formatをimportに追加
import { ja } from 'date-fns/locale';
import { Heart, Share2, Clock, Link as LinkIcon, ExternalLink, Instagram, Copy, Laugh, Smile, Meh, Frown, Angry, MapPin, Eye, MessageCircle, ChevronDown, Tag, DollarSign, UserPlus, Info, ChevronLeft, ChevronRight, ShoppingCart, Utensils, Camera, GamepadIcon, Wrench, Layers, FileIcon, Calendar, Briefcase, ShoppingBag, Users, MessageSquareText, Trash2, Flag, AlertTriangle, Loader2, Star, Car, Home, Package, Megaphone, HandCoins } from 'lucide-react'; // Star, Car, Home, Package, Megaphoneアイコンを追加
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { PostWithAuthor, AuthorProfile } from '@/types/post';
import { supabase } from '@/lib/supabaseClient';
import { CustomModal } from '@/components/ui/custom-modal';
import { useToast } from '@/hooks/use-toast';
import React from 'react';
import { ExtendedPostWithAuthor } from '@/types/timeline';

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

function formatDistance(distance?: number): string {
  if (!distance) return '';
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }
  return `${(distance / 1000).toFixed(1)}km`;
}

function formatViewCount(count: number): string {
  if (count < 1000) {
    return count.toString();
  } else if (count < 10000) {
    return `${(count / 1000).toFixed(1)}k`;
  } else {
    return `${Math.floor(count / 1000)}k`;
  }
}

function formatCommentCount(count: number): string {
  if (count < 1000) {
    return count.toString();
  } else if (count < 10000) {
    return `${(count / 1000).toFixed(1)}k`;
  } else {
    return `${Math.floor(count / 1000)}k`;
  }
}

// 🔥 対象者のラベルを取得する関数
function getTargetAudienceLabel(targetAudience?: string | null): string | null {
  if (!targetAudience) return null;
  
  const targetAudienceOptions = [
    { value: 'すべての人', label: 'すべての人' },
    { value: '10代', label: '10代' },
    { value: '20代', label: '20代' },
    { value: '30代', label: '30代' },
    { value: '40代', label: '40代' },
    { value: '50代', label: '50代' },
    { value: '60代以上', label: '60代以上' },
    { value: '学生', label: '学生' },
    { value: 'business_person', label: 'ビジネスマン・OL' },
    { value: '主婦・主夫', label: '主婦・主夫' },
    { value: '子育て世代', label: '子育て世代' },
    { value: '一人暮らし', label: '一人暮らし' },
    { value: 'ファミリー', label: 'ファミリー' },
    { value: '高齢者', label: '高齢者' },
    { value: 'フリーランス', label: 'フリーランス' },
    { value: '起業家・経営者', label: '起業家・経営者' },
    { value: '観光客・旅行者', label: '観光客・旅行者' },
    { value: '地域住民', label: '地域住民' },
  ];
  
  const option = targetAudienceOptions.find(opt => opt.value === targetAudience);
  return option ? option.label : null;
}

interface PostCardProps {
  post: ExtendedPostWithAuthor;
  onLike?: (postId: string, isLiked: boolean) => Promise<void>;
  onView?: (postId: string) => Promise<void>;
  onComment?: (post: ExtendedPostWithAuthor) => void;
  onDelete?: (postId: string) => void;
  currentUserId?: string | null;
  showDistance?: boolean;
  isOwnPost?: boolean;
  onClick?: (postId: string) => void;
  disableClick?: boolean;
  enableComments?: boolean;
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
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    observer.observe(img);
    return () => observer.unobserve(img);
  }, [loadStarted]);

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
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 bg-gray-400 rounded animate-pulse" />
        </div>
      )}
      
      {hasError && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
          <div className="text-gray-500 text-sm text-center">
            <div className="w-8 h-8 bg-gray-400 rounded mx-auto mb-2" />
            画像を読み込めません
          </div>
        </div>
      )}
      
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

// 新規追加：RatingDisplayコンポーネント (post-card.tsx内で使用するため修正)
const RatingDisplay = memo(({ rating }: { rating: number | null | undefined }) => {
  if (rating == null) return null;

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.5;

  return (
    <div className="flex items-center space-x-0.5">
      {[...Array(5)].map((_, i) => {
        const isFull = i < fullStars;
        const isHalf = i === fullStars && hasHalfStar;

        return (
          <div key={i} className="relative">
            <Star
              className={cn(
                "h-4 w-4 text-gray-300",
                { "fill-yellow-400": isFull || isHalf }
              )}
            />
            {isHalf && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: '50%' }}
              >
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              </div>
            )}
          </div>
        );
      })}
      <span className="text-sm font-medium ml-1" style={{ color: '#73370c' }}>({rating.toFixed(1)})</span>
    </div>
  );
});

RatingDisplay.displayName = 'RatingDisplay';

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

export const PostCard = memo(({ 
  post, 
  onLike, 
  onView,
  onComment,
  onDelete,
  currentUserId, 
  showDistance = false, 
  isOwnPost, 
  onClick,
  disableClick = false,
  enableComments = false
}: PostCardProps) => {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showBasicInfo, setShowBasicInfo] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [hasBeenViewed, setHasBeenViewed] = useState(false);
  
  // 🔥 追加：削除・通報モーダル関連
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  
  // 🔥 追加：応援購入のローディング状態管理
  const [supportPurchaseLoading, setSupportPurchaseLoading] = useState<{ [key: string]: boolean }>({});
  
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

  const isMyPost = isOwnPost || (post.author_user_id === currentUserId);

  const [anonymousLikedPosts, setAnonymousLikedPosts] = useState<string[]>([]);
  
  useEffect(() => {
    if (!currentUserId) {
      const anonymousLikes = JSON.parse(localStorage.getItem('anonymousLikes') || '[]');
      setAnonymousLikedPosts(anonymousLikes);
    }
  }, [currentUserId]);

  // ビュー数カウント（Intersection Observer使用）
  useEffect(() => {
    if (!onView || hasBeenViewed) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            setHasBeenViewed(true);
            onView(post.id);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.5,
        rootMargin: '0px'
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [onView, post.id, hasBeenViewed]);

  const isLiked = currentUserId 
    ? post.isLikedByCurrentUser 
    : anonymousLikedPosts.includes(post.id);

  const handleLikeClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isLiking) return;
    
    if (isMyPost && currentUserId) {
      toast({
        title: "自分の投稿にはいいねできません",
        duration: 1000,
      });
      return;
    }

    if (!currentUserId) {
      const anonymousLikes = JSON.parse(localStorage.getItem('anonymousLikes') || '[]');
      const alreadyLiked = anonymousLikes.includes(post.id);
      
      if (alreadyLiked && !isLiked) {
        setAnonymousLikedPosts(prev => prev.filter(id => id !== post.id));
        return;
      } else if (!alreadyLiked && isLiked) {
        setAnonymousLikedPosts(prev => [...prev, post.id]);
        return;
      }
    }
    
    if (onLike) {
      setIsLiking(true);
      try {
        await onLike(post.id, !isLiked);
        
        if (!currentUserId) {
          if (!isLiked) {
            setAnonymousLikedPosts(prev => [...prev, post.id]);
          } else {
            setAnonymousLikedPosts(prev => prev.filter(id => id !== post.id));
          }
        }
      } catch (error) {
        console.error('いいね処理エラー:', error);
        toast({
          title: "エラーが発生しました",
          description: "いいね処理に失敗しました。",
          duration: 1000,
        });
      } finally {
        setIsLiking(false);
      }
    }
  }, [onLike, post.id, isLiked, isLiking, toast, isMyPost, currentUserId]);

  const handleShareClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowShareDialog(true);
  }, []);

  const handleCommentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onComment) {
      onComment(post);
    }
  }, [onComment, post]);

  const handleCardClick = useCallback(() => {
    if (!disableClick && onClick) {
      onClick(post.id);
    }
  }, [disableClick, onClick, post.id]);
  
  // ジャンルのアイコンとカラーを取得する関数
  const getGenreIconAndColor = useCallback((genre: string) => {
    switch(genre) {
      case 'ショッピング':
        return {
          icon: ShoppingCart,
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800',
          borderColor: 'border-purple-200'
        };
      case '飲食店':
        return {
          icon: Utensils,
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-800',
          borderColor: 'border-orange-200'
        };
      case '観光':
        return {
          icon: Camera,
          bgColor: 'bg-teal-100',
          textColor: 'text-teal-800',
          borderColor: 'border-teal-200'
        };
      case 'エンタメ': // レジャーから変更
        return {
          icon: GamepadIcon,
          bgColor: 'bg-pink-100',
          textColor: 'text-pink-800',
          borderColor: 'border-pink-200'
        };
      case 'サービス':
        return {
          icon: Wrench,
          bgColor: 'bg-indigo-100',
          textColor: 'text-indigo-800',
          borderColor: 'border-indigo-200'
        };
      case 'イベント':
        return {
          icon: Calendar,
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200'
        };
      case '求人':
        return {
          icon: Briefcase,
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200'
        };
      case '販売':
        return {
          icon: ShoppingBag,
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200'
        };
      case 'ボランティア':
        return {
          icon: Users,
          bgColor: 'bg-emerald-100',
          textColor: 'text-emerald-800',
          borderColor: 'border-emerald-200'
        };
      case '相談':
        return {
          icon: MessageSquareText,
          bgColor: 'bg-rose-100',
          textColor: 'text-rose-800',
          borderColor: 'border-rose-200'
        };
      case 'シェア': // 新規追加
        return {
          icon: Users, // 適切なアイコンを選択
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-800',
          borderColor: 'border-orange-200'
        };
      case 'コミュニティ': // 新規追加
        return {
          icon: MessageCircle, // 適切なアイコンを選択
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800',
          borderColor: 'border-purple-200'
        };
      case '募集': // 新規追加
        return {
          icon: UserPlus, // 適切なアイコンを選択
          bgColor: 'bg-cyan-100',
          textColor: 'text-cyan-800',
          borderColor: 'border-cyan-200'
        };
      case 'デリバリー':
        return {
          icon: Package,
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200'
        };
      default:
        return {
          icon: Layers,
          bgColor: 'bg-slate-100',
          textColor: 'text-slate-800',
          borderColor: 'border-slate-200'
        };
    }
  }, []);

  // カテゴリカラーを取得する関数 (不明の定義を削除)
  const getCategoryColor = useCallback((category: string) => {
    switch(category) {
      // ショッピング系
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
      case '米・パン類':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'デザート類':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case '日用品':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case '衣料品':
        return 'bg-violet-100 text-violet-800 border-violet-200';
      
      // 飲食店系
      case '和食':
        return 'bg-red-100 text-red-800 border-red-200';
      case '洋食':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case '中華':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'イタリアン':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'フレンチ':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'カフェ':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'ファストフード':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      
      // 観光系
      case '観光スポット':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case '宿泊施設':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case '温泉':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case '博物館・美術館':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case '公園':
        return 'bg-green-100 text-green-800 border-green-200';
      
      // エンタメ系 (旧レジャー)
      case 'アミューズメント':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'スポーツ':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case '映画・エンタメ':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'アウトドア':
        return 'bg-green-100 text-green-800 border-green-200';
      
      // サービス系
      case '美容・健康':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case '教育':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case '医療':
        return 'bg-red-100 text-red-800 border-red-200';
      case '修理・メンテナンス':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      
      // イベント系
      case 'コンサート・ライブ':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'フェスティバル':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case '展示会':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'セミナー・講座':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'sportsイベント':
        return 'bg-red-100 text-red-800 border-red-200';
      
      // 求人系
      case '正社員':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'アルバイト・パート':
        return 'bg-green-100 text-green-800 border-green-200';
      case '派遣・契約':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'インターン':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'フリーランス':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      
      // 販売系
      case '新品':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case '中古品':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ハンドメイド':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'デジタル商品':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'チケット':
        return 'bg-red-100 text-red-800 border-red-200';
      case '移動販売':
        return 'bg-green-100 text-green-800 border-green-200';
      
      // ボランティア系
      case '環境・自然':
        return 'bg-green-100 text-green-800 border-green-200';
      case '福祉・介護':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case '教育・子育て':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case '地域活動':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case '災害支援':
        return 'bg-red-100 text-red-800 border-red-200';
      
      // 相談系
      case '生活相談':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case '仕事・キャリア':
        return 'bg-green-100 text-green-800 border-green-200';
      case '恋愛・人間関係':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case '法律・お金':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case '健康・医療':
        return 'bg-red-100 text-red-800 border-red-200';

      // シェア系 (新規追加)
      case 'タクシー':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ライドシェア':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'カーシェア':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ホテル':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case '民泊':
        return 'bg-green-100 text-green-800 border-green-200';
      case '旅館':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'コンドミニアム':
        return 'bg-purple-100 text-purple-800 border-purple-200';

      // コミュニティ系 (新規追加)
      case '交流':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'イベント':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case '趣味':
        return 'bg-green-100 text-green-800 border-green-200';
      case '学習':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case '地域':
        return 'bg-teal-100 text-teal-800 border-teal-200';

      // 募集系 (新規追加)
      case 'メンバー募集':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case '助け合い':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ボランティア':
        return 'bg-green-100 text-green-800 border-green-200';
      case '参加者募集':
        return 'bg-red-100 text-red-800 border-red-200';
      
      // デリバリー系
      case 'フードデリバリー':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case '日用品デリバリー':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case '薬局デリバリー':
        return 'bg-red-100 text-red-800 border-red-200';

      default: // 未定義のカテゴリに対するフォールバック
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);
  
  const formattedDate = post.created_at ? formatDistanceToNow(new Date(post.created_at), { 
    addSuffix: true,
    locale: ja
  }) : '日付不明';

  // 新規追加: 日付フォーマット
  const formattedStartDate = post.start_date ? format(new Date(post.start_date), "yyyy年MM月dd日 HH:mm", { locale: ja }) : null;
  const formattedEndDate = post.end_date ? format(new Date(post.end_date), "yyyy年MM月dd日 HH:mm", { locale: ja }) : null;

  const copyToClipboard = useCallback((text: string, message: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: `✅ ${message}`,
        duration: 1000,
      });
      setShowShareDialog(false);
    }).catch(err => console.error("コピー失敗:", err));
  }, [toast]);

  const handleCopyStoreName = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
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
      copyToClipboard(shareData.url, "リンクをコピーしました！");
    }
  }, [post.store_name, post.category, post.content, post.id, copyToClipboard]);

  // 複数画像の処理
  const getImageUrls = useCallback(() => {
    if (post.image_urls) {
      try {
        const urls = JSON.parse(post.image_urls);
        return Array.isArray(urls) ? urls : [];
      } catch (error) {
        console.error('画像URLsの解析エラー:', error);
        return [];
      }
    }
    return [];
  }, [post.image_urls]);

  // ファイルURLの処理
  const getFileUrls = useCallback(() => {
    if (post.file_urls) {
      try {
        const urls = JSON.parse(post.file_urls);
        return Array.isArray(urls) ? urls : [];
      } catch (error) {
        console.error('ファイルURLsの解析エラー:', error);
        return [];
      }
    }
    return [];
  }, [post.file_urls]);

  // ファイルアイコンの取得
  const getFileIcon = useCallback((fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      default:
        return '📎';
    }
  }, []);

  const imageUrls = getImageUrls();
  const fileUrls = getFileUrls();

  const genreIconAndColor = getGenreIconAndColor(post.genre || '');
  const GenreIcon = genreIconAndColor.icon;

  // 🔥 追加：投稿削除処理
  const handleDeletePost = async () => {
    if (!currentUserId || !isMyPost) return;

    setIsDeleting(true);
    try {
      // 論理削除に変更
      const { error } = await supabase
        .from('posts')
        .update({ is_deleted: true })
        .eq('id', post.id);

      if (error) {
        console.error('投稿削除エラー:', error);
        throw error;
      }

      toast({
        title: "投稿を削除しました",
        duration: 1000,
      });

      setShowDeleteModal(false);
      
      // 親コンポーネントに削除を通知
      if (onDelete) {
        onDelete(post.id);
      }
    } catch (error) {
      console.error('投稿の削除に失敗しました:', error);
      toast({
        title: "エラーが発生しました",
        description: "投稿の削除に失敗しました",
        duration: 3000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // 🔥 追加：通報処理
  const handleReportPost = async () => {
    if (!reportReason.trim()) {
      toast({
        title: "通報理由を選択してください",
        duration: 2000,
      });
      return;
    }

    setIsReporting(true);
    try {
      // お問い合わせフォームに送信
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: '通報システム',
          email: 'report@tokudoku.com',
          subject: `投稿通報 - ${post.id}`,
          message: `
【投稿通報】
投稿ID: ${post.id}
投稿者: ${post.author?.display_name || '不明'}
店舗名: ${post.store_name}
投稿内容: ${post.content}

通報理由: ${reportReason}
詳細: ${reportDetails || 'なし'}

通報者: ${currentUserId ? 'ログインユーザー' : '匿名ユーザー'}
通報日時: ${new Date().toLocaleString('ja-JP')}
          `,
        }),
      });

      if (!response.ok) {
        throw new Error('通報の送信に失敗しました');
      }

      toast({
        title: "通報を送信しました",
        description: "担当者が内容を確認いたします",
        duration: 2000,
      });

      setShowReportModal(false);
      setReportReason('');
      setReportDetails('');
    } catch (error) {
      console.error('通報の送信に失敗しました:', error);
      toast({
        title: "エラーが発生しました",
        description: "通報の送信に失敗しました",
        duration: 3000,
      });
    } finally {
      setIsReporting(false);
    }
  };

  // 🔥 応援購入ハンドラーを修正（ローディング状態追加）
  const handleSupportPurchase = useCallback(async (postId: string, amount: number) => {
    const loadingKey = `${postId}-${amount}`;
    
    // ローディング開始
    setSupportPurchaseLoading(prev => ({ ...prev, [loadingKey]: true }));

    try {
      const response = await fetch('/api/support-purchase/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          amount,
        }),
      });

      const data = await response.json();
      
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        // より具体的なエラーメッセージを表示
        let errorTitle = "応援購入できません";
        let errorDescription = data.error || '決済URLの取得に失敗しました';
        
        // 🔥 修正：エラーコードに応じた詳細メッセージ
        if (data.errorCode === 'SELLER_STRIPE_ACCOUNT_NOT_FOUND') {
          errorTitle = "応援購入設定未完了";
          errorDescription = data.error;
        } else if (data.errorCode === 'SELLER_STRIPE_SETUP_INCOMPLETE') {
          errorTitle = "応援購入設定未完了";
          errorDescription = data.error;
        } else if (data.errorCode === 'SELLER_PAYOUT_NOT_ENABLED') {
          errorTitle = "支払い受取設定未完了";
          errorDescription = data.error;
        }
        
        toast({
          title: errorTitle,
          description: errorDescription,
          duration: 5000, // エラーメッセージは長めに表示
        });
      }
    } catch (error) {
      console.error('Support purchase error:', error);
      toast({
        title: "エラーが発生しました",
        description: "決済処理の開始に失敗しました。しばらく時間をおいて再度お試しください。",
        duration: 3000,
      });
    } finally {
      // ローディング終了
      setSupportPurchaseLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  }, [toast]);

  return (
    <>
      <Card 
        ref={cardRef}
        className={cn(
          "overflow-hidden transition-all duration-200",
          !disableClick && "hover:shadow-lg cursor-pointer",
          isMyPost && "ring-2 ring-blue-200 bg-blue-50/30"
        )}
        onClick={handleCardClick}
      >
        <CardHeader className="p-3 pb-1 space-y-0">
          {/* 投稿者情報セクション（独立） */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center space-x-2">
              <UserAvatar author={post.author} />
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <p className="font-semibold text-base" style={{ color: '#73370c' }}>
                    {post.author?.display_name || '不明な投稿者'}
                  </p>
                  {isMyPost && <Badge variant="secondary" className="text-xs">自分の投稿</Badge>}
                  {/* 評価表示は詳細情報セクションへ移動 */}
                </div>
                <div className="flex items-center space-x-2">
                  {post.author_posts_count && post.author_posts_count > 0 && (
                    <>
                      <p className="text-xs" style={{ color: '#73370c' }}>
                        投稿数: {post.author_posts_count}
                      </p>
                      <span className="text-xs" style={{ color: '#73370c' }}>•</span>
                    </>
                  )}
                  <p className="text-xs" style={{ color: '#73370c' }}>
                    {formattedDate}
                  </p>
                </div>
              </div>
            </div>
            
            {/* 🔥 追加：自分の投稿の場合は削除ボタン */}
            {isMyPost && currentUserId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(true);
                }}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                title="投稿を削除"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* 詳細情報セクション（トグル形式・6行2列表形式） */}
          <div className="mt-1">
            <div className="border border-gray-200 rounded-md overflow-hidden">
              {/* トグルヘッダー */}
              <button
                onClick={() => setShowBasicInfo(!showBasicInfo)}
                className="w-full bg-gray-50 border-b border-gray-200 p-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Info className="h-4 w-4 text-gray-500" />
                  <span className="text-base font-medium" style={{ color: '#73370c' }}>詳細情報</span>
                </div>
                <motion.div
                  animate={{ rotate: showBasicInfo ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </motion.div>
              </button>
              
              {/* トグルコンテンツ */}
              <motion.div
                initial={false}
                animate={{ height: showBasicInfo ? 'auto' : 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-white">
                  <table className="w-full">
                    <tbody>
                      {/* 評価表示 (新しい行として追加) */}
                      {post.rating != null && (
                        <tr className="border-b border-gray-100">
                          <td className="p-3 bg-gray-50 w-1/3 font-medium border-r border-gray-100">
                            <div className="flex items-center space-x-2">
                              <Star className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="text-base" style={{ color: '#73370c' }}>評価</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <RatingDisplay rating={post.rating} />
                          </td>
                        </tr>
                      )}

                      {/* 期間表示 (開始日・終了日) */}
                      {(post.start_date || post.end_date) && ( // どちらか一方でもあれば表示
                        <tr className="border-b border-gray-100">
                          <td className="p-3 bg-gray-50 w-1/3 font-medium border-r border-gray-100">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="text-base" style={{ color: '#73370c' }}>期間</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="text-base font-medium" style={{ color: '#73370c' }}>
                              {post.start_date && format(new Date(post.start_date), "yyyy年MM月dd日 HH:mm", { locale: ja })}
                              {post.start_date && post.end_date && " ~ "}
                              {post.end_date && format(new Date(post.end_date), "yyyy年MM月dd日 HH:mm", { locale: ja })}
                            </span>
                          </td>
                        </tr>
                      )}
                      
                      {/* 1行目: 場所 - 店舗IDがあり、店舗名が「店舗不明」以外の場合のみ表示 */}
                      {post.store_id && post.store_name && post.store_name !== '店舗不明' && (
                        <tr className="border-b border-gray-100">
                          <td className="p-3 bg-gray-50 w-1/3 font-medium border-r border-gray-100">
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="text-base" style={{ color: '#73370c' }}>場所</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-between">
                              <Button
                                variant="ghost"
                                className="p-0 h-auto font-normal hover:bg-transparent hover:text-primary flex-1"
                                onClick={handleCopyStoreName}
                                title="店舗名をコピー"
                              >
                                <span className={cn(
                                  "whitespace-normal break-words",
                                  (post.store_name || '').length > 20 ? "text-sm" : "text-base"
                                )} style={{ color: '#73370c' }}>
                                  {post.store_name}
                                </span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopyStoreName}
                                className="p-1 h-auto hover:bg-gray-100"
                                title="店舗名をコピー"
                              >
                                <Copy className="h-4 w-4 text-gray-400 hover:text-gray-600 flex-shrink-0" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                      
                      {/* 2行目: ジャンル - ジャンルが設定されている場合のみ表示 */}
                      {post.genre && (
                        <tr className="border-b border-gray-100">
                          <td className="p-3 bg-gray-50 w-1/3 font-medium border-r border-gray-100">
                            <div className="flex items-center space-x-2">
                              <GenreIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="text-base" style={{ color: '#73370c' }}>ジャンル</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className={cn(
                              "inline-flex items-center space-x-2 px-3 py-1 rounded-full text-base font-medium border",
                              genreIconAndColor.bgColor,
                              genreIconAndColor.textColor,
                              genreIconAndColor.borderColor
                            )}>
                              <GenreIcon className="h-4 w-4 flex-shrink-0" />
                              <span>{post.genre}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                      
                      {/* 3行目: カテゴリ - カテゴリがnullまたはundefinedではない場合のみ表示 */}
                      {post.category && post.category !== '' && post.category !== null && (
                        <tr className="border-b border-gray-100">
                          <td className="p-3 bg-gray-50 w-1/3 font-medium border-r border-gray-100">
                            <div className="flex items-center space-x-2">
                              <Tag className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="text-base" style={{ color: '#73370c' }}>カテゴリ</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge className={cn("text-base", getCategoryColor(post.category))}>
                              {post.category}
                            </Badge>
                          </td>
                        </tr>
                      )}
                      
                      {/* 4行目: 価格 - 価格が設定されている場合のみ表示 */}
                      {post.price != null && (
                        <tr className="border-b border-gray-100">
                          <td className="p-3 bg-gray-50 w-1/3 font-medium border-r border-gray-100">
                            <div className="flex items-center space-x-2">
                              <DollarSign className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="text-base" style={{ color: '#73370c' }}>価格</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="text-base font-medium" style={{ color: '#73370c' }}>
                              {post.price.toLocaleString()}円〜
                            </span>
                          </td>
                        </tr>
                      )}
                      
                      {/* 8行目: リンク - 既に条件分岐済み */}
                      {post.url && (
                        <tr className="border-b border-gray-100">
                          <td className="p-3 bg-gray-50 w-1/3 font-medium border-r border-gray-100">
                            <div className="flex items-center space-x-2">
                              <LinkIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="text-base" style={{ color: '#73370c' }}>リンク</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline break-all"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {post.url}
                            </a>
                          </td>
                        </tr>
                      )}
                      
                      {/* 9行目: ファイル - 既に条件分岐済み */}
                      {fileUrls.length > 0 && (
                        <tr className="border-b border-gray-100">
                          <td className="p-3 bg-gray-50 w-1/3 font-medium border-r border-gray-100">
                            <div className="flex items-center space-x-2">
                              <FileIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="text-base" style={{ color: '#73370c' }}>ファイル</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="space-y-2">
                              {fileUrls.map((fileUrl, index) => {
                                const fileName = fileUrl.split('/').pop() || `ファイル${index + 1}`;
                                return (
                                  <a
                                    key={index}
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span className="text-lg">{getFileIcon(fileName)}</span>
                                    <span className="break-all">{fileName}</span>
                                  </a>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                      
                      {/* 🔥 対象者情報の表示（ファイルの後、視聴回数の前に追加） */}
                      {post.target_audience && (
                        <tr className="border-b border-gray-100">
                          <td className="p-3 bg-gray-50 w-1/3 font-medium border-r border-gray-100">
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="text-base" style={{ color: '#73370c' }}>対象者</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-base">
                              {getTargetAudienceLabel(post.target_audience)}
                            </Badge>
                          </td>
                        </tr>
                      )}
                      
                      {/* 視聴回数行 - 常に表示 */}
                      <tr className="border-b border-gray-100">
                        <td className="p-3 bg-gray-50 w-1/3 font-medium border-r border-gray-100">
                          <div className="flex items-center space-x-2">
                            <Eye className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            <span className="text-base" style={{ color: '#73370c' }}>視聴回数</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-base" style={{ color: '#73370c' }}>
                            {formatViewCount(post.views_count)}
                          </span>
                        </td>
                      </tr>
                      
                      {/* 残り時間行 - 常に表示 */}
                      <tr className={cn(showDistance && post.distance !== undefined ? "border-b border-gray-100" : "")}>
                        <td className="p-3 bg-gray-50 w-1/3 font-medium border-r border-gray-100">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            <span className="text-base" style={{ color: '#73370c' }}>残り時間</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-base" style={{ color: '#73370c' }}>
                            {post.expires_at ? formatRemainingTime(new Date(post.expires_at).getTime()) : '期限なし'}
                          </span>
                        </td>
                      </tr>
                      
                      {/* 7行目: 距離（開発環境でのみ表示）
                      {showDistance && post.distance !== undefined && (
                        <tr>
                          <td className="p-3 bg-gray-50 w-1/3 font-medium border-r border-gray-100">
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="text-base" style={{ color: '#73370c' }}>距離</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="text-base font-medium text-blue-600">
                              {formatDistance(post.distance)}
                            </span>
                          </td>
                        </tr>
                      )} */}

                      {/* 🔥 応援購入表示を詳細情報テーブルに追加（残り時間の前） */}
                      {post.support_purchase_enabled && post.support_purchase_options && (
                        <tr className="border-b border-gray-100">
                          <td className="p-3 bg-gray-50 w-1/3 font-medium border-r border-gray-100">
                            <div className="flex items-center space-x-2">
                              <Heart className="h-4 w-4 text-pink-500 flex-shrink-0" />
                              <span className="text-base" style={{ color: '#73370c' }}>応援購入</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-2">
                              {JSON.parse(post.support_purchase_options).map((amount: number, index: number) => {
                                const loadingKey = `${post.id}-${amount}`;
                                const isLoading = supportPurchaseLoading[loadingKey];
                                
                                return (
                                  <Button
                                    key={index}
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSupportPurchase(post.id, amount);
                                    }}
                                    className={cn(
                                      "bg-gradient-to-r from-orange-50 to-red-50 text-[#73370c] border-orange-200 font-semibold transition-all duration-300 transform",
                                      "hover:from-orange-100 hover:to-red-100 hover:border-orange-300 hover:shadow-md hover:scale-105",
                                      "active:scale-95 active:shadow-sm",
                                      isLoading && "opacity-75 cursor-not-allowed",
                                      isMyPost && "opacity-50 cursor-not-allowed hover:scale-100"
                                    )}
                                    disabled={isMyPost || isLoading}
                                    title={isMyPost ? "自分の投稿には応援購入できません" : `¥${amount.toLocaleString()}で応援する`}
                                  >
                                    {isLoading ? (
                                      <>
                                        <motion.div
                                          animate={{ rotate: 360 }}
                                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                          className="h-3 w-3 mr-1"
                                        >
                                          <Loader2 className="h-3 w-3 text-[#73370c]" />
                                        </motion.div>
                                        処理中...
                                      </>
                                    ) : (
                                      <>
                                        <HandCoins className="h-3 w-3 mr-1" />
                                        ¥{amount.toLocaleString()}
                                      </>
                                    )}
                                  </Button>
                                );
                              })}
                            </div>
                            {isMyPost && (
                              <p className="text-xs text-gray-500 mt-1">※自分の投稿には応援購入できません</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-3 pt-1 flex flex-col h-full">
          {/* 投稿内容との間隔調整 */}
          <div className="flex-grow overflow-hidden mb-3 mt-1">
            <p className="text-lg whitespace-pre-line" style={{ color: '#73370c' }}>
              {post.content ? (post.content.length > 240 ? post.content.substring(0, 240) + '...' : post.content) : '内容がありません'}
            </p>
          </div>
          
          {/* 画像表示エリア（複数画像対応） */}
          {imageUrls.length > 0 && (
            <div className="flex justify-center w-full mb-3">
              <div className="relative rounded-md overflow-hidden">
                {imageUrls.length === 1 ? (
                  // 単一画像の場合
                  <OptimizedImage
                    src={imageUrls[0]}
                    alt="投稿画像"
                    className="w-full h-full"
                    onLoad={() => setImageLoaded(true)}
                  />
                ) : (
                  // 複数画像の場合（カルーセル）
                  <Carousel className="w-full h-full">
                    <CarouselContent>
                      {imageUrls.map((imageUrl, index) => (
                        <CarouselItem key={index}>
                          <OptimizedImage
                            src={imageUrl}
                            alt={`投稿画像 ${index + 1}`}
                            className="w-full h-full"
                            onLoad={() => setImageLoaded(true)}
                          />
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    
                    {/* カルーセルナビゲーション */}
                    <CarouselPrevious 
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 text-gray-700 border-gray-300 shadow-lg"
                      size="sm"
                    />
                    <CarouselNext 
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 text-gray-700 border-gray-300 shadow-lg"
                      size="sm"
                    />
                    
                    {/* 画像インジケーター */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
                      {imageUrls.map((_, index) => (
                        <div
                          key={index}
                          className="w-2 h-2 rounded-full bg-white/60 shadow-sm"
                        />
                      ))}
                    </div>
                  </Carousel>
                )}
              </div>
            </div>
          )}

          {/* 新しい統計・アクション行（横幅重視のレイアウト） */}
          <div className="bg-gray-50 rounded-lg p-2 mt-2">
            <div className="grid grid-cols-3 gap-1 h-6">
              {/* いいね */}
              <button
                onClick={handleLikeClick}
                className={cn(
                  "flex items-center justify-center space-x-1 h-full rounded-md transition-colors px-1 border border-gray-300",
                  isLiked && "text-red-500",
                  isMyPost && currentUserId && "opacity-50 cursor-not-allowed",
                  isLiking && "opacity-50 cursor-not-allowed"
                )}
                style={{ backgroundColor: '#fcebeb' }}
                disabled={isLiking || (isMyPost && Boolean(currentUserId))}
                title={isMyPost && currentUserId ? "自分の投稿にはいいねできません" : "いいね"}
              >
                <Heart className={cn(
                  "h-4 w-4 transition-all duration-200 flex-shrink-0",
                  isLiked ? "text-red-500 fill-red-500" : "text-gray-600 hover:text-red-500",
                  isLiking && "animate-pulse"
                )} />
                <span className="text-base font-medium truncate">{post.likes_count}</span>
                <span className="text-base text-gray-500 truncate">いいね</span>
              </button>

              {/* コメント数 */}
              {enableComments && (
                <button
                  onClick={handleCommentClick}
                  className="flex items-center justify-center space-x-1 h-full rounded-md transition-colors text-gray-600 hover:text-blue-500 px-1 border border-gray-300"
                  style={{ backgroundColor: '#eff4ff' }}
                  title="コメント"
                >
                  <MessageCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-base font-medium truncate">{formatCommentCount(post.comments_count)}</span>
                  <span className="text-base text-gray-500 truncate">コメント</span>
                </button>
              )}

              {/* シェアボタン */}
              <button
                onClick={handleShareClick}
                className="flex items-center justify-center space-x-1 h-full rounded-md transition-colors text-gray-600 hover:text-gray-800 px-1 border border-gray-300"
                style={{ backgroundColor: '#eefdf6' }}
                title="共有"
              >
                <Share2 className="h-4 w-4 flex-shrink-0" />
                <span className="text-base font-medium truncate">共有</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 🔥 追加：削除確認モーダル */}
      <CustomModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="投稿の削除"
        description="この投稿を削除しますか？"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-red-800 font-medium">注意</span>
            </div>
            <p className="text-red-700 text-sm mt-2">
              削除した投稿は復元できません。本当に削除しますか？
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePost}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  削除中...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  削除する
                </>
              )}
            </Button>
          </div>
        </div>
      </CustomModal>

      {/* 🔥 改良：通報モーダル */}
      <CustomModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="投稿を通報"
        description="不適切な投稿を報告してください"
        className="sm:max-w-md"
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-amber-800 font-medium text-sm">通報について</span>
            </div>
            <p className="text-amber-700 text-xs mt-1">
              通報いただいた内容は運営チームのメールに送信され、適切に対応いたします。
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">通報理由 <span className="text-red-500">*</span></label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            >
              <option value="">理由を選択してください</option>
              <option value="spam">スパム・過度な宣伝</option>
              <option value="inappropriate">不適切な内容・画像</option>
              <option value="harassment">嫌がらせ・誹謗中傷</option>
              <option value="fake">虚偽・誤解を招く情報</option>
              <option value="violence">暴力的な内容</option>
              <option value="adult">アダルト・性的な内容</option>
              <option value="copyright">著作権侵害</option>
              <option value="privacy">個人情報の漏洩</option>
              <option value="illegal">違法行為・危険行為</option>
              <option value="other">その他</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">詳細情報（任意）</label>
            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="具体的な問題点や詳細があれば記載してください（500文字以内）"
              className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500 resize-none"
              rows={6}
              maxLength={500}
              style={{ fontSize: '16px' }}
            />
            <div className="text-xs text-gray-500 mt-1">
              {reportDetails.length}/500文字
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowReportModal(false);
                setReportReason('');
                setReportDetails('');
              }}
              disabled={isReporting}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleReportPost}
              disabled={isReporting || !reportReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isReporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  送信中...
                </>
              ) : (
                <>
                  <Flag className="h-4 w-4 mr-2" />
                  通報する
                </>
              )}
            </Button>
          </div>
        </div>
      </CustomModal>

      {/* 🔥 更新：共有モーダル（通報機能追加） */}
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
          
          {/* 🔥 追加：通報ボタン */}
          {!isMyPost && (
            <>
              <hr className="my-2" />
              <Button
                variant="outline"
                className="w-full justify-start text-left py-3 h-auto text-base text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => {
                  setShowShareDialog(false);
                  setShowReportModal(true);
                }}
              >
                <Flag className="mr-2.5 h-5 w-5" />
                この投稿を通報
              </Button>
            </>
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