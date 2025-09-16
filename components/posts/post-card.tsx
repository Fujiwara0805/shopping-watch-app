"use client";

import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { Heart, Share2, Clock, Link as LinkIcon, ExternalLink, Instagram, Copy, MapPin, Eye, MessageCircle, ChevronDown, Tag, UserPlus, Info, ShoppingCart, Utensils, Camera, GamepadIcon, Wrench, Layers, FileIcon, Calendar, Briefcase, ShoppingBag, Users, MessageSquareText, Trash2, Flag, AlertTriangle, Loader2, Star, Package, HandCoins, User, UserCheck, PersonStanding, Footprints } from 'lucide-react';
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

// 🔥 ジャンルのアイコンとカラーを取得する関数を修正（カテゴリ用に変更）
const getCategoryIconAndColor = (category: string) => {
  switch(category) {
    case '飲食店':
      return {
        icon: Utensils,
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-800',
        borderColor: 'border-orange-200'
      };
    case '小売店':
      return {
        icon: ShoppingBag,
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-200'
      };
    case 'イベント集客':
      return {
        icon: Calendar,
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-800',
        borderColor: 'border-purple-200'
      };
    case '応援':
      return {
        icon: Heart,
        bgColor: 'bg-pink-100',
        textColor: 'text-pink-800',
        borderColor: 'border-pink-200'
      };
    case '受け渡し':
      return {
        icon: Package,
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-200'
      };
    case '雑談': // 🔥 追加
      return {
        icon: MessageSquareText,
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-800',
        borderColor: 'border-gray-200'
      };
    default:
      return {
        icon: Layers,
        bgColor: 'bg-slate-100',
        textColor: 'text-slate-800',
        borderColor: 'border-slate-200'
      };
  }
};

// カテゴリカラーを取得する関数
const getCategoryColor = (category: string) => {
  switch(category) {
    case '飲食店':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case '小売店':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'イベント集客':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case '応援':
      return 'bg-pink-100 text-pink-800 border-pink-200';
    case '受け渡し':
      return 'bg-green-100 text-green-800 border-green-200';
    case '雑談': // 🔥 追加
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// 🔥 修正：来客状況を解析して表示するコンポーネント
const CustomerSituationDisplay = memo(({ customerSituation }: { customerSituation: string }) => {
  // 来客状況の文字列から人数を抽出（総人数なし）
  const parseCustomerSituation = (situation: string) => {
    // "男性: 4人, 女性: 6人" の形式から抽出
    const maleMatch = situation.match(/男性:\s*(\d+)/);
    const femaleMatch = situation.match(/女性:\s*(\d+)/);
    
    return {
      male: maleMatch ? parseInt(maleMatch[1]) : 0,
      female: femaleMatch ? parseInt(femaleMatch[1]) : 0
    };
  };

  const { male, female } = parseCustomerSituation(customerSituation);

  return (
    <div className="flex items-center space-x-3">
      {/* 男性の人数 */}
      {male > 0 && (
        <div className="flex items-center space-x-1 bg-blue-100 px-3 py-1.5 rounded-md">
          <User className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-700">{male}</span>
        </div>
      )}
      
      {/* 女性の人数 */}
      {female > 0 && (
        <div className="flex items-center space-x-1 bg-pink-100 px-3 py-1.5 rounded-md">
          <UserCheck className="h-4 w-4 text-pink-600" />
          <span className="text-sm font-medium text-pink-700">{female}</span>
        </div>
      )}
    </div>
  );
});

CustomerSituationDisplay.displayName = 'CustomerSituationDisplay';

// 🔥 新規追加：残り数の単位を取得する関数
const getRemainingUnit = (category: string | null) => {
  switch(category) {
    case '飲食店':
      return '席';
    case '小売店':
      return '個';
    case 'イベント集客':
      return '人';
    default:
      return '件';
  }
};

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
  const [showBasicInfo, setShowBasicInfo] = useState(true); // 🔥 修正：初期状態をtrueに変更
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
  
  // 🔥 追加：おすそわけのローディング状態管理
  const [supportPurchaseLoading, setSupportPurchaseLoading] = useState<{ [key: string]: boolean }>({});
  
  // 🔥 新規追加：クーポンモーダル関連
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [isDownloadingCoupon, setIsDownloadingCoupon] = useState(false);
  const couponModalRef = useRef<HTMLDivElement>(null);
  
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

  const categoryIconAndColor = getCategoryIconAndColor(post.category || '');
  const CategoryIcon = categoryIconAndColor.icon;

  // 🔥 修正：投稿時間のフォーマット関数を変更（489行目付近）
  const formattedDate = post.created_at ? (() => {
    const date = new Date(post.created_at);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours}時${minutes.toString().padStart(2, '0')}分投稿`;
  })() : '時間不明';

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

  // 🔥 おすそわけハンドラーを修正（ローディング状態追加）
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
        let errorTitle = "おすそわけできません";
        let errorDescription = data.error || '決済URLの取得に失敗しました';
        
        // 🔥 修正：エラーコードに応じた詳細メッセージ
        if (data.errorCode === 'SELLER_STRIPE_ACCOUNT_NOT_FOUND') {
          errorTitle = "おすそわけ設定未完了";
          errorDescription = data.error;
        } else if (data.errorCode === 'SELLER_STRIPE_SETUP_INCOMPLETE') {
          errorTitle = "おすそわけ設定未完了";
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

  // 🔥 新規追加：クーポンボタンクリック処理
  const handleCouponClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCouponModal(true);
  }, []);

  // 🔥 新規追加：クーポン有効期限の計算
  const getCouponExpiryTime = useCallback(() => {
    if (!post.created_at) return '時間不明';
    
    const createdDate = new Date(post.created_at);
    const expiryDate = new Date(createdDate.getTime() + (3 * 60 * 60 * 1000)); // 3時間後
    
    const hours = expiryDate.getHours();
    const minutes = expiryDate.getMinutes();
    const month = expiryDate.getMonth() + 1;
    const day = expiryDate.getDate();
    
    return `${month}月${day}日 ${hours}時${minutes.toString().padStart(2, '0')}分まで`;
  }, [post.created_at]);

  // 🔥 新規追加：クーポン画像保存処理
  const handleDownloadCoupon = useCallback(async () => {
    if (!couponModalRef.current) return;
    
    setIsDownloadingCoupon(true);
    
    try {
      // html2canvasを動的インポート
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(couponModalRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // 高解像度
        useCORS: true,
        allowTaint: true,
        // 🔥 修正：黄色背景の範囲のサイズに合わせて調整
        width: couponModalRef.current.offsetWidth,
        height: couponModalRef.current.offsetHeight,
      });
      
      // 画像をダウンロード
      const link = document.createElement('a');
      link.download = `tokudoku-coupon-${post.store_name || 'store'}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast({
        title: "クーポンを保存しました！",
        description: "画像ファイルとして保存されました",
        duration: 2000,
      });
    } catch (error) {
      console.error('クーポン画像の保存に失敗しました:', error);
      toast({
        title: "保存に失敗しました",
        description: "もう一度お試しください",
        duration: 2000,
      });
    } finally {
      setIsDownloadingCoupon(false);
    }
  }, [post.store_name, toast]);

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
                  {/* 🔥 修正：条件に応じてバッジを表示 */}
                  {(() => {
                    // クーポン配布中の条件チェック
                    const hasLocation = post.store_id && post.store_name && post.store_name !== '店舗不明';
                    const isRestaurant = post.category === '飲食店';
                    const hasRemainingOrCustomer = (post.remaining_slots != null) || (post.customer_situation && post.customer_situation.trim() !== '');
                    
                    const showCouponBadge = hasLocation && isRestaurant && hasRemainingOrCustomer;
                    
                    if (showCouponBadge) {
                      return (
                        <Badge 
                          className="text-base bg-yellow-100 text-yellow-800 border-yellow-200 animate-pulse cursor-pointer hover:bg-yellow-200 transition-colors"
                          title="クリックしてクーポンを表示"
                          onClick={handleCouponClick}
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          クーポン配布中
                        </Badge>
                      );
                    } else if (isMyPost) {
                      return <Badge variant="default" className="text-xs">自分の投稿</Badge>;
                    }
                    
                    return null;
                  })()}
                </div>
                <div className="flex items-center space-x-2">
                  {/* 🔥 投稿数の表示を削除 */}
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
                      {/* 評価表示 */}
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

                      {/* 場所 */}
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
                      
                      {/* カテゴリ */}
                      {post.category && post.category !== '' && post.category !== null && (
                        <tr className="border-b border-gray-100">
                          <td className="p-3 bg-gray-50 w-1/3 font-medium border-r border-gray-100">
                            <div className="flex items-center space-x-2">
                              <CategoryIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="text-base" style={{ color: '#73370c' }}>カテゴリ</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge className={cn("text-base", getCategoryColor(post.category))}>
                              <CategoryIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                              {post.category}
                            </Badge>
                          </td>
                        </tr>
                      )}
                      
                      {/* リンク */}
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
                      
                      {/* ファイル */}
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
                      
                      {/* 🔥 修正：残り枠数の表示 */}
                      {post.remaining_slots != null && (
                        <tr className="border-b border-gray-100">
                          <td className="p-3 bg-gray-50 w-1/3 font-medium border-r border-gray-100">
                            <div className="flex items-center space-x-2">
                              <Package className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="text-base" style={{ color: '#73370c' }}>残りの数</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center">
                              <span className="text-base font-bold text-left" style={{ color: '#dd3730' }}>
                                残りわずか {post.remaining_slots}{getRemainingUnit(post.category)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* 🔥 修正：来客状況の表示 */}
                      {post.customer_situation && post.customer_situation.trim() !== '' && (
                        <tr className="border-b border-gray-100">
                          <td className="p-3 bg-gray-50 w-1/3 font-medium border-r border-gray-100">
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="text-base" style={{ color: '#73370c' }}>来客状況</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <CustomerSituationDisplay customerSituation={post.customer_situation} />
                          </td>
                        </tr>
                      )}

                      {/* 🔥 新規追加：クーポンの表示 */}
                      {post.coupon_code && post.coupon_code.trim() !== '' && (
                        <tr className="border-b border-gray-100">
                          <td className="p-3 bg-gray-50 w-1/3 font-medium border-r border-gray-100">
                            <div className="flex items-center space-x-2">
                              <Tag className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="text-base" style={{ color: '#73370c' }}>クーポン</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge className="text-base bg-yellow-100 text-yellow-800 border-yellow-200">
                              {post.coupon_code}
                            </Badge>
                          </td>
                        </tr>
                      )}

                      {/* おすそわけ表示 */}
                      {post.support_purchase_enabled && post.support_purchase_options && (
                        <tr className="border-b border-gray-100">
                          <td className="p-3 bg-gray-50 w-1/3 font-medium border-r border-gray-100">
                            <div className="flex items-center space-x-2">
                              <Heart className="h-4 w-4 text-pink-500 flex-shrink-0" />
                              <span className="text-base" style={{ color: '#73370c' }}>お裾分け</span>
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
                                    title={isMyPost ? "自分の投稿にはおすそわけできません" : `¥${amount.toLocaleString()}でおすそわけする`}
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
                              <p className="text-xs text-gray-500 mt-1">※自分の投稿にはおすそわけできません</p>
                            )}
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
                          <span className="text-base" style={{ color: '#dd3730' }}>
                            {post.expires_at ? formatRemainingTime(new Date(post.expires_at).getTime()) : '期限なし'}
                          </span>
                        </td>
                      </tr>
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
                title={isMyPost && currentUserId ? "自分の投稿には行くよできません" : "行くよ"}
              >
                <Footprints className={cn(
                  "h-4 w-4 transition-all duration-200 flex-shrink-0",
                  isLiked ? "text-red-500 fill-red-500" : "text-gray-600 hover:text-red-500",
                  isLiking && "animate-pulse"
                )} />
                <span className="text-base font-medium truncate">{post.likes_count}</span>
                <span className="text-base text-gray-500 truncate">行くよ</span>
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

      {/* 🔥 新規追加：クーポンモーダル */}
      <CustomModal
        isOpen={showCouponModal}
        onClose={() => setShowCouponModal(false)}
        title=""
        description=""
        className="sm:max-w-md"
      >
        {/* 🔥 修正：保存対象の範囲を黄色背景のdivのみに限定 */}
        <div 
          ref={couponModalRef}
          className="bg-gradient-to-br from-yellow-50 to-orange-50 p-8 rounded-lg border-2 border-yellow-200"
          style={{ minHeight: '500px' }}
        >
          {/* タイトル */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-yellow-800 mb-2">
              トクドク応援クーポン
            </h2>
          </div>
          
          {/* トクドクアイコン（中央配置） */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full overflow-hidden shadow-lg">
              <img 
                src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png"
                alt="トクドクアイコン"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          {/* 店舗名 */}
          <div className="text-center mb-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {post.store_name}
            </h3>
            <p className="text-gray-600">でご利用いただけます</p>
          </div>
          
          {/* クーポン内容（投稿のクーポンコードを表示） */}
          {post.coupon_code && (
            <div className="bg-white p-4 rounded-lg border-2 border-dashed border-yellow-400 mb-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">クーポン内容</p>
                <p className="text-lg font-bold text-yellow-800">{post.coupon_code}</p>
              </div>
            </div>
          )}
          
          {/* 有効期限 */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600 mb-1">有効期限</p>
            <p className="text-lg font-semibold text-red-600">
              {getCouponExpiryTime()}
            </p>
          </div>
          
          {/* 注意事項 */}
          <div className="text-left text-base text-gray-500 mb-6">
            <p>※クーポン内容は、お店でご確認ください。</p>
            <p className="text-base font-semibold text-red-600">※投稿は、設定した時間が過ぎると削除されます。必ず画像を保存して会計時にご提示ください。</p>
          </div>
        </div>
        
        {/* 🔥 ボタンエリアは保存対象外（refの外側に配置） */}
        <div className="flex justify-between items-center mt-6">
          <Button
            variant="outline"
            onClick={() => setShowCouponModal(false)}
          >
            閉じる
          </Button>
          
          <Button
            onClick={handleDownloadCoupon}
            disabled={isDownloadingCoupon}
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            {isDownloadingCoupon ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                保存中...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                画像として保存
              </>
            )}
          </Button>
        </div>
      </CustomModal>
    </>
  );
});

PostCard.displayName = 'PostCard';