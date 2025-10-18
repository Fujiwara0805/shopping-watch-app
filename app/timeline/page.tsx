"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Search,  Loader2, SlidersHorizontal,  X,  Menu, User, Edit, Store, HelpCircle, FileText, LogOut,  Globe, NotebookText,  Zap, MessageSquare, Eye, Send, RefreshCw, UserPlus, Link as LinkIcon,  Trash2,  AlertTriangle, Compass, Info, Footprints, BookOpen, Clock, Megaphone, Heart, Package, Trophy, MessageSquareText, Utensils, Image } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/app-layout';
import { useSearchParams } from 'next/navigation';
import { PostCard } from '@/components/posts/post-card';
import { PostFilter, categories } from '@/components/posts/post-filter';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CustomModal } from '@/components/ui/custom-modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

import { ExtendedPostWithAuthor } from '@/types/timeline';

// 🔥 位置情報関連のコンポーネントをインポート
import { LocationPermissionDialog } from '@/components/common/LocationPermissionDialog';

// 🔥 プル・トゥ・リフレッシュライブラリをインポート
import PullToRefresh from 'react-simple-pull-to-refresh';

// 型定義
interface AuthorData {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  app_users?: { role: string }[] | { role: string } | null; // 🔥 追加：app_usersリレーション
}

interface PostLike {
  post_id: string;
  user_id: string;
  created_at: string;
}

interface Comment {
  id: string;
  post_id: string;
  app_profile_id: string;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  author: {
    id: string;
    user_id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
  isOwnComment: boolean;
}

interface PostFromDB {
  id: string;
  app_profile_id: string;
  store_id: string;
  store_name: string;
  category: string; // 🔥 カテゴリフィールド
  content: string;
  image_urls: string | null;
  url: string | null;
  file_urls: string | null;
  expiry_option: string;
  custom_expiry_minutes?: number | null; // 🔥 追加
  likes_count: number;
  views_count: number;
  comments_count: number;
  created_at: string;
  expires_at: string;
  store_latitude?: number;
  store_longitude?: number;
  user_latitude?: number;
  user_longitude?: number;
  rating?: number | null;
  support_purchase_enabled?: boolean;
  support_purchase_options?: string | null;
  // 🔥 追加: authorプロパティを定義
  author: AuthorData | AuthorData[] | null;
  post_likes: PostLike[] | null;
  author_role?: string;
  // 🔥 新規追加フィールド
  remaining_slots?: number | null;
  coupon_code?: string | null;
  customer_situation?: string | null;
  phone_number?: string | null; // 🔥 追加：電話番号フィールド
  // 🔥 イベント情報フィールドを追加
  event_name?: string | null;
  event_start_date?: string | null;
  event_end_date?: string | null;
  event_price?: string | null;
  // 🔥 住所情報フィールドを追加
  prefecture?: string | null;
  city?: string | null;
}

// ソート機能と特別検索モードを削除


const SEARCH_RADIUS_METERS = 1000; // 1km

// コメントコンポーネント
const CommentItem = ({ comment, onDelete, currentUserId }: {
  comment: Comment;
  onDelete: (commentId: string) => Promise<void>;
  currentUserId?: string;
}) => {
  const [isLiking, setIsLiking] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDeleteComment = async () => {
    if (!currentUserId || !comment.isOwnComment) {
      console.error('削除権限がありません:', { currentUserId, isOwnComment: comment.isOwnComment });
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(comment.id);
      toast({
        title: "コメントを削除しました",
        duration: 1000,
      });
      setShowDeleteModal(false);
    } catch (error: any) {
      console.error('コメント削除に失敗しました:', error);
      
      let errorMessage = "コメントの削除に失敗しました";
      if (error?.message?.includes('unauthorized') || error?.code === '42501') {
        errorMessage = "削除権限がありません";
      } else if (error?.message?.includes('not found')) {
        errorMessage = "コメントが見つかりません";
      }
      
      toast({
        title: "エラーが発生しました",
        description: errorMessage,
        duration: 3000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const authorAvatarUrl = comment.author?.avatar_url
    ? supabase.storage.from('avatars').getPublicUrl(comment.author.avatar_url).data.publicUrl
    : null;

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-start space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={authorAvatarUrl || undefined} alt={comment.author?.display_name || 'コメント投稿者'} />
            <AvatarFallback className="text-xs">{comment.author?.display_name?.charAt(0) || '?'}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-sm">{comment.author?.display_name || '匿名ユーザー'}</span>
                {comment.isOwnComment && (
                  <Badge variant="secondary" className="text-xs">自分</Badge>
                )}
                <span className="text-xs text-gray-500">
                  {(() => {
                    const date = new Date(comment.created_at);
                    const hours = date.getHours();
                    const minutes = date.getMinutes();
                    return `${hours}時${minutes.toString().padStart(2, '0')}分投稿`;
                  })()}
                </span>
              </div>
              
              {comment.isOwnComment && currentUserId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                  title="コメントを削除"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            <p className="text-sm text-gray-700">{comment.content}</p>
            
          </div>
        </div>
        
        <CustomModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="コメントの削除"
          description="このコメントを削除しますか？"
        >
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-red-800 font-medium">注意</span>
              </div>
              <p className="text-red-700 text-sm mt-2">
                削除したコメントは復元できません。本当に削除しますか？
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
                onClick={handleDeleteComment}
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
      </div>
    </>
  );
};

// コメントモーダルコンポーネント
const CommentsModal = ({ 
  post, 
  isOpen, 
  onClose, 
  currentUserId 
}: {
  post: ExtendedPostWithAuthor | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUserId) {
      console.error('ユーザーIDが見つかりません');
      return;
    }

    try {
      console.log('🔥 コメント削除開始:', commentId);

      // 🔥 削除前の状態を確認
      const { data: beforeData } = await supabase
        .from('post_comments')
        .select('id, is_deleted, content, app_profile_id')
        .eq('id', commentId)
        .single();
      
      console.log('🔥 削除前の状態:', beforeData);

      if (!beforeData) {
        throw new Error('コメントが見つかりません');
      }

      // 🔥 権限チェック：現在のユーザーのapp_profile_idを取得
      const { data: userProfile } = await supabase
        .from('app_profiles')
        .select('id')
        .eq('user_id', currentUserId)
        .single();

      console.log('🔥 ユーザープロフィール:', userProfile);

      if (!userProfile) {
        throw new Error('ユーザープロフィールが見つかりません');
      }

      // 🔥 権限チェック：コメントの所有者確認
      if (beforeData.app_profile_id !== userProfile.id) {
        throw new Error('このコメントを削除する権限がありません');
      }

      // 🔥 投稿削除と全く同じパターン：シンプルな論理削除
      const { error, data } = await supabase
        .from('post_comments')
        .update({ is_deleted: true })
        .eq('id', commentId)
        .eq('app_profile_id', userProfile.id) // 🔥 追加：二重チェック
        .select();

      console.log('🔥 削除処理結果:', { error, data });

      if (error) {
        console.error('🔥 コメント削除エラー:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('🔥 削除処理が実行されませんでした');
        throw new Error('コメントの削除に失敗しました - 権限エラー');
      }

      // 🔥 削除後の状態を確認
      const { data: afterData } = await supabase
        .from('post_comments')
        .select('id, is_deleted, content')
        .eq('id', commentId)
        .single();
      
      console.log('🔥 削除後の状態:', afterData);

      console.log('🔥 コメント削除成功:', commentId);

      // 🔥 重要：削除後にコメントを再取得
      await fetchComments();

    } catch (error) {
      console.error('🔥 コメントの削除に失敗しました:', error);
      throw error;
    }
  };

  // 🔥 修正：コメント取得処理で階層構造を削除
  const fetchComments = useCallback(async () => {
    if (!isOpen) return;
    
    setLoading(true);
    try {
      console.log('🔥 コメント取得開始 - post_id:', post?.id);
      
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          id,
          post_id,
          app_profile_id,
          parent_comment_id,
          content,
          created_at,
          updated_at,
          is_deleted,
          author:app_profiles!post_comments_app_profile_id_fkey (
            id,
            user_id,
            display_name,
            avatar_url,
            app_users!app_profiles_user_id_fkey (
              role
            )
          )
        `)
        .eq('post_id', post?.id)
        .eq('is_deleted', false)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: true });

      console.log('🔥 取得したコメント:', data);
      console.log('🔥 フィルタ前のコメント数:', data?.length);

      if (error) {
        console.error('🔥 コメント取得エラー:', error);
        throw error;
      }

      // 🔥 追加：削除されていないコメントのみを再確認
      const validComments = data?.filter(comment => comment.is_deleted === false) || [];
      console.log('🔥 フィルタ後のコメント数:', validComments.length);

      // 🔥 修正：いいね関連の処理を削除
      const processedComments = validComments.map((comment: any) => {
        const authorData = Array.isArray(comment.author) ? comment.author[0] : comment.author;
        
        const isOwnComment = currentUserId && authorData?.user_id ? 
          authorData.user_id === currentUserId : false;
        
        // 🔥 追加：author.roleを設定
        const authorRole = authorData?.app_users 
          ? Array.isArray(authorData.app_users) 
            ? authorData.app_users[0]?.role || null
            : authorData.app_users.role || null
          : null;
        
        return {
          ...comment,
          author: authorData ? {
            ...authorData,
            role: authorRole
          } : null,
          isOwnComment,
        };
      });

      console.log('🔥 最終的なコメント:', processedComments);
      setComments(processedComments);
    } catch (error) {
      console.error('コメントの取得に失敗しました:', error);
      toast({
        title: "エラーが発生しました",
        description: "コメントの読み込みに失敗しました",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, [isOpen, post?.id, toast, currentUserId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentUserId) return;

    setIsSubmitting(true);
    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('app_profiles')
        .select('id')
        .eq('user_id', currentUserId)
        .single();

      if (profileError || !userProfile) {
        console.error('プロフィールエラー:', profileError);
        throw new Error('ユーザープロフィールが見つかりません');
      }

      console.log('コメント投稿開始:', post?.id);

      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: post?.id,
          app_profile_id: userProfile.id,
          content: newComment.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_deleted: false,
          parent_comment_id: null
        });

      if (error) {
        console.error('コメント投稿エラー:', error);
        throw error;
      }

      console.log('コメント投稿成功');

      setNewComment('');
      await fetchComments();
      
      toast({
        title: "コメントを投稿しました",
        duration: 1000,
      });
    } catch (error) {
      console.error('コメントの投稿に失敗しました:', error);
      toast({
        title: "エラーが発生しました",
        description: "コメントの投稿に失敗しました",
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="コメント"
      description="※他者に配慮したコメントをお願いします。"
      className="sm:max-w-2xl"
    >
      <div className="space-y-4">
        {/* 投稿内容の表示 - 非表示にしました */}
        {/*
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-700">{post?.content}</p>
          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center space-x-1">
              <Footprints className="h-3 w-3" />
              <span>{post?.likes_count}</span>
            </span>
            <span className="flex items-center space-x-1">
              <Eye className="h-3 w-3" />
              <span>{post?.views_count}</span>
            </span>
            <span className="flex items-center space-x-1">
              <MessageSquare className="h-3 w-3" />
              <span>{post?.comments_count}</span>
            </span>
          </div>
        </div>
        */}

        {/* コメント一覧 */}
        <div className="h-[250px] overflow-y-auto custom-scrollbar border rounded-lg bg-gray-50">
          <div className="p-4 space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">まだコメントがありません</p>
                <p className="text-sm text-gray-400">最初のコメントを投稿してみましょう</p>
              </div>
            ) : (
              // 🔥 修正：コメント表示（固定高さ内でスクロール）
              comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onDelete={handleDeleteComment}
                  currentUserId={currentUserId}
                />
              ))
            )}
          </div>
        </div>

        {/* 新しいコメント投稿フォーム */}
        {currentUserId ? (
          <div className="border-t pt-4 space-y-3">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="コメントを入力..."
              className="resize-none"
              style={{ fontSize: '16px' }}
              rows={2}
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setNewComment('')}
                disabled={!newComment.trim()}
              >
                クリア
              </Button>
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                投稿
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-t pt-4 text-center">
            <p className="text-gray-500 mb-2">コメントを投稿するにはログインが必要です</p>
            <Button onClick={() => window.location.href = '/login'}>
              ログイン
            </Button>
          </div>
        )}
      </div>
    </CustomModal>
  );
};

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


// ハンバーガーメニューコンポーネント
const HamburgerMenu = ({ currentUser, onShowHowToUse }: { currentUser: any; onShowHowToUse?: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  // デバイス判定
  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isMobileWidth = window.innerWidth <= 768;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      setIsMobile(isMobileUserAgent || (isMobileWidth && isTouchDevice));
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  // モバイル用メニュー項目
  const mobileMenuItems = [
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
      label: 'おとく地図',
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
      icon: NotebookText,
      label: '買い物メモ',
      onClick: () => {
        router.push('/memo');
        setIsOpen(false);
      }
    },
    {
      icon: BookOpen,
      label: '使い方',
      onClick: () => {
        onShowHowToUse?.();
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
        router.push('/terms');
        setIsOpen(false);
      }
    },
    {
      icon: Zap,
      label: 'リリースノート',
      onClick: () => {
        router.push('/release-notes');
        setIsOpen(false);
      }
    }
  ];

  // PC用メニュー項目（指定された項目のみ）
  const pcMenuItems = [
    {
      icon: Edit,
      label: '投稿する',
      onClick: () => {
        router.push('/post');
        setIsOpen(false);
      }
    },
    {
      icon: UserPlus,
      label: '招待する',
      onClick: () => {
        // 招待モーダルを開く処理は親コンポーネントで管理
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
      icon: BookOpen,
      label: '使い方',
      onClick: () => {
        onShowHowToUse?.();
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
        router.push('/terms');
        setIsOpen(false);
      }
    },
    {
      icon: Zap,
      label: 'リリースノート',
      onClick: () => {
        router.push('/release-notes');
        setIsOpen(false);
      }
    }
  ];

  // デバイスに応じてメニュー項目を選択
  const menuItems = isMobile ? mobileMenuItems : pcMenuItems;

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

          <div className="space-y-1">
            {menuItems.map((item, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start text-left py-3 h-auto text-base hover:bg-[#73370c]/10 hover:text-[#73370c] transition-colors duration-200"
                onClick={item.onClick}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </Button>
            ))}
          </div>

          <Separator />

          <Button
            variant="ghost"
            className="w-full justify-start text-left py-3 h-auto text-base text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors duration-200 bg-white"
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
  const router = useRouter();
  const { toast } = useToast();
  
  const [posts, setPosts] = useState<ExtendedPostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const [activeFilter, setActiveFilter] = useState<string>('all');
  // 🔥 ジャンルフィルターを削除
  // const [activeGenreFilter, setActiveGenreFilter] = useState<string>('all');
  const [tempActiveFilter, setTempActiveFilter] = useState<string>('all');
  // 🔥 ジャンルフィルターを削除
  // const [tempActiveGenreFilter, setTempActiveGenreFilter] = useState<string>('all');
  
  // 🔥 新しいフィルター項目の状態を追加
  const [selectedPrefecture, setSelectedPrefecture] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [tempSelectedPrefecture, setTempSelectedPrefecture] = useState<string>('all');
  const [tempSelectedCity, setTempSelectedCity] = useState<string>('all');
  
  const [hasMore, setHasMore] = useState(true);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const currentUserRole = session?.user?.role;

  // 🔥 位置情報関連の状態を追加
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationPermissionState, setLocationPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unavailable' | 'pending'>('prompt');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  
  // 🔥 ご近所モードの状態を追加（デフォルトON）
  const [isNearbyMode, setIsNearbyMode] = useState(true);


  const searchParams = useSearchParams();
  const [highlightPostId, setHighlightPostId] = useState<string | null>(null);

  const [generalSearchTerm, setGeneralSearchTerm] = useState<string>('');
  const [pendingSearchQuery, setPendingSearchQuery] = useState<string | null>(null);
  // お気に入り店舗とイイネ投稿の状態管理を削除
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showLocationPermissionAlert, setShowLocationPermissionAlert] = useState(false);
  
  // 特別検索モードのUI状態を削除
  const { searchHistory, addToHistory, clearHistory } = useSearchHistory();

  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  
  // 🔥 都道府県・市町村のリスト
  const [prefectureList, setPrefectureList] = useState<string[]>([]);
  const [cityList, setCityList] = useState<string[]>([]);

  // 🔥 新規追加: 投稿ボタンのローディング状態
  const [isNavigatingToPost, setIsNavigatingToPost] = useState(false);
  // 🔥 追加: 更新ボタンのローディング状態
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 🔥 都道府県・市町村リストを取得する関数
  const fetchLocationLists = useCallback(async () => {
    try {
      // 都道府県リストを取得
      const { data: prefectures, error: prefError } = await supabase
        .from('posts')
        .select('prefecture')
        .not('prefecture', 'is', null)
        .order('prefecture');
      
      if (prefError) throw prefError;
      
      const uniquePrefectures = Array.from(new Set(prefectures.map(p => p.prefecture))).filter(Boolean);
      setPrefectureList(uniquePrefectures);
      
      // 市町村リストを取得（選択された都道府県に基づく）
      let cityQuery = supabase
        .from('posts')
        .select('city')
        .not('city', 'is', null);
      
      if (selectedPrefecture !== 'all') {
        cityQuery = cityQuery.eq('prefecture', selectedPrefecture);
      }
      
      const { data: cities, error: cityError } = await cityQuery.order('city');
      
      if (cityError) throw cityError;
      
      const uniqueCities = Array.from(new Set(cities.map(c => c.city))).filter(Boolean);
      setCityList(uniqueCities);
      
    } catch (error) {
      console.error('Error fetching location lists:', error);
    }
  }, [selectedPrefecture]);

  // 🔥 フィルターモーダルが開かれたときに都道府県・市町村リストを取得
  useEffect(() => {
    if (showFilterModal) {
      fetchLocationLists();
    }
  }, [showFilterModal, fetchLocationLists]);

  // 🔥 都道府県が変更されたときに市町村リストを更新
  useEffect(() => {
    if (tempSelectedPrefecture !== 'all') {
      fetchLocationLists();
    } else {
      // すべての都道府県が選択された場合は全市町村を表示
      fetchLocationLists();
    }
  }, [tempSelectedPrefecture, fetchLocationLists]);

  // 検索ボタン処理
  const handleSearch = useCallback(() => {
    if (generalSearchTerm.trim().length >= 2) {
      addToHistory(generalSearchTerm.trim());
    }
    setIsSearching(true);
    if (fetchPostsRef.current) {
      fetchPostsRef.current(0, true, generalSearchTerm.trim());
    }
  }, [generalSearchTerm, addToHistory]);

  // Enterキーでの検索
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  // コメントモーダル関連
  const [commentsModal, setCommentsModal] = useState<{
    isOpen: boolean;
    post: ExtendedPostWithAuthor | null;
  }>({
    isOpen: false,
    post: null,
  });

  // 追加: QRコードモーダルの状態
  const [showQrCodeModal, setShowQrCodeModal] = useState(false);

  // Refs for stable references
  const activeFilterRef = useRef(activeFilter);
  const userLocationRef = useRef(userLocation);
  const isNearbyModeRef = useRef(isNearbyMode); // 🔥 追加
  const selectedPrefectureRef = useRef(selectedPrefecture); // 🔥 追加
  const selectedCityRef = useRef(selectedCity); // 🔥 追加

  // Update refs
  useEffect(() => { activeFilterRef.current = activeFilter; }, [activeFilter]);
  useEffect(() => { userLocationRef.current = userLocation; }, [userLocation]);
  useEffect(() => { isNearbyModeRef.current = isNearbyMode; }, [isNearbyMode]); // 🔥 追加
  useEffect(() => { selectedPrefectureRef.current = selectedPrefecture; }, [selectedPrefecture]); // 🔥 追加
  useEffect(() => { selectedCityRef.current = selectedCity; }, [selectedCity]); // 🔥 追加

  useEffect(() => {
    setTempActiveFilter(activeFilter);
  }, [activeFilter]);

  useEffect(() => {
    const id = searchParams.get('highlightPostId');
    if (id) {
      setHighlightPostId(id);
    }
    
    // 🔥 URLパラメータから検索クエリを取得して設定
    const searchQuery = searchParams.get('search');
    if (searchQuery) {
      const decodedQuery = decodeURIComponent(searchQuery);
      console.log('🔥 URLパラメータから検索クエリを取得:', decodedQuery);
      setGeneralSearchTerm(decodedQuery);
      setIsSearching(true);
      console.log('🔥 検索状態を設定完了:', { decodedQuery, isSearching: true });
      
      // 🔥 検索履歴に追加（2文字以上の場合）
      if (decodedQuery.trim().length >= 2) {
        addToHistory(decodedQuery.trim());
      }
      
      // 🔥 即座に検索実行を試行する関数
      const executeSearch = () => {
        if (fetchPostsRef.current) {
          console.log('🔥 検索実行:', decodedQuery);
          return fetchPostsRef.current(0, true, decodedQuery.trim())
            .then(() => {
              console.log('🔥 検索完了');
              setIsSearching(false);
              return true;
            })
            .catch((error) => {
              console.error('🔥 検索エラー:', error);
              setIsSearching(false);
              return false;
            });
        }
        return Promise.resolve(false);
      };
      
      // 🔥 複数のタイミングで検索実行を試行
      const attemptSearch = async () => {
        // 即座に試行
        if (await executeSearch()) {
          return;
        }
        
        // 🔥 即座の実行が失敗した場合は保留検索もセット
        setPendingSearchQuery(decodedQuery);
        
        // 100ms後に再試行
        setTimeout(async () => {
          if (await executeSearch()) {
            setPendingSearchQuery(null); // 成功したら保留検索をクリア
            return;
          }
          
          // 300ms後にさらに再試行
          setTimeout(async () => {
            if (await executeSearch()) {
              setPendingSearchQuery(null); // 成功したら保留検索をクリア
              return;
            }
            
            // 最後の試行（500ms後）
            setTimeout(async () => {
              const result = await executeSearch();
              if (result) {
                setPendingSearchQuery(null); // 成功したら保留検索をクリア
              } else {
                console.warn('🔥 検索実行に失敗しました - 保留検索に依存');
                // 保留検索はそのまま残して、fetchPostsRefが利用可能になったら実行される
              }
            }, 500);
          }, 300);
        }, 100);
      };
      
      attemptSearch();
    }
  }, [searchParams, addToHistory]);

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

  // お気に入り店舗情報の取得処理を削除

  // いいねした投稿IDの取得処理を削除

  // 投稿データの取得
  const fetchPosts = useCallback(async (offset = 0, isInitial = false, searchTerm = '') => {
    const currentActiveFilter = activeFilterRef.current;
    const currentUserLocation = userLocationRef.current;
    const currentIsNearbyMode = isNearbyModeRef.current; // 🔥 refから取得するように修正

    // 距離計算関数
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

    // LCP改善：初期読み込み時の最適化
    if (isInitial) {
      setLoading(true);
      setPosts([]); // 既存投稿をクリア
    } else {
      setLoadingMore(true);
    }
    setError(null);
    
    try {
      const now = new Date().toISOString();
      
      // 🔥 デバッグ情報を追加
      console.log('🔍 投稿取得開始:', {
        currentActiveFilter,
        currentIsNearbyMode,
        currentUserLocation,
        offset,
        isInitial,
        searchTerm
      });
      
      // 基本クエリ（is_deletedフィルタを追加）
      let query = supabase
        .from('posts')
        .select(`
          id,
          app_profile_id,
          store_id,
          store_name,
          category,
          content,
          image_urls,
          url,
          file_urls,
          expiry_option,
          custom_expiry_minutes,
          likes_count,
          views_count,
          comments_count,
          created_at,
          expires_at,
          store_latitude,
          store_longitude,
          user_latitude,
          user_longitude,
          rating,
          support_purchase_enabled,
          support_purchase_options,
          author_role,
          remaining_slots,
          coupon_code,
          customer_situation,
          phone_number,
          event_name,
          event_start_date,
          event_end_date,
          event_price,
          prefecture,
          city,
          author:app_profiles!posts_app_profile_id_fkey (
            id,
            user_id,
            display_name,
            avatar_url,
            app_users!app_profiles_user_id_fkey (
              role
            )
          ),
          post_likes!fk_post_likes_post_id (
            post_id,
            user_id,
            created_at
          )
        `)
        .eq('is_deleted', false)
        .gt('expires_at', now);


      // 🔥 都道府県フィルタ
      const currentSelectedPrefecture = selectedPrefectureRef.current;
      if (currentSelectedPrefecture !== 'all') {
        query = query.eq('prefecture', currentSelectedPrefecture);
      }

      // 🔥 市町村フィルタ
      const currentSelectedCity = selectedCityRef.current;
      if (currentSelectedCity !== 'all') {
        query = query.eq('city', currentSelectedCity);
      }


      // 🔥 ジャンルフィルタを削除

      // 🔥 検索語による絞り込み（categoryも検索対象に追加）
      const effectiveSearchTerm = searchTerm;
      if (effectiveSearchTerm && effectiveSearchTerm.trim()) {
        const searchTermLower = effectiveSearchTerm.toLowerCase();
        console.log('🔥 検索クエリでフィルタリング:', { effectiveSearchTerm, searchTermLower });
        query = query.or(`store_name.ilike.%${searchTermLower}%,category.ilike.%${searchTermLower}%,content.ilike.%${searchTermLower}%`);
      }

      // 特別な検索モードを削除

      // デフォルトのソート（作成日時の降順）
      query = query.order('created_at', { ascending: false });

      // 🔥 ご近所モード時は全件取得してから距離フィルタリング、それ以外は従来通り
      if (currentUserLocation && currentIsNearbyMode) {
        // ご近所モード：初回のみ全件取得、2回目以降はキャッシュから取得
        if (offset === 0) {
          // パフォーマンス考慮で上限1000件に制限
          query = query.limit(1000);
          console.log('🔍 ご近所モード: 全件取得してから距離フィルタリング（上限1000件）');
        } else {
          // 2回目以降はキャッシュされたデータから取得するため、空のクエリを返す
          console.log('🔍 ご近所モード: キャッシュからページング処理');
          // 空の結果を返してキャッシュ処理に委ねる
          const { data: emptyData } = await supabase
            .from('posts')
            .select('id')
            .eq('id', 'non-existent-id')
            .limit(0);
          
          // キャッシュされたフィルタリング結果から次のページを取得
          const cachedFiltered = (window as any)._nearbyFilteredPosts || [];
          const startIndex = offset;
          const endIndex = offset + 20;
          const pageData = cachedFiltered.slice(startIndex, endIndex);
          
          console.log('🔍 キャッシュからページング:', {
            totalCached: cachedFiltered.length,
            startIndex,
            endIndex,
            pageSize: pageData.length
          });
          
          // ページデータを直接設定
          if (isInitial) {
            setPosts(pageData);
          } else {
            setPosts(prevPosts => [...prevPosts, ...pageData]);
          }
          
          // hasMoreの判定
          const remainingPosts = cachedFiltered.length - endIndex;
          setHasMore(remainingPosts > 0);
          
          setLoading(false);
          setLoadingMore(false);
          setIsSearching(false);
          return; // 早期リターン
        }
      } else {
        // 通常モード：従来通りのページング
        query = query.range(offset, offset + 19);
        console.log('🔍 通常モード: ページング適用', { offset, limit: offset + 19 });
      }

      const { data, error: dbError } = await query;

      // 🔥 デバッグ情報を追加
      console.log('🔍 データベースから取得した投稿数:', data?.length);
      console.log('🔍 検索クエリ:', effectiveSearchTerm);
      if (effectiveSearchTerm) {
        console.log('🔍 検索結果の店舗名:', data?.map(p => p.store_name).slice(0, 5));
      }
      console.log('🔍 取得した投稿のサンプル:', data?.slice(0, 2));

      if (dbError) {
        console.error('🔥 データベースエラー:', dbError);
        throw dbError;
      }

      // 🔥 検索結果が0件の場合のログ
      if (effectiveSearchTerm && (!data || data.length === 0)) {
        console.log('🔥 検索結果が0件:', { searchTerm: effectiveSearchTerm, data });
      }
      
      // ユーザーごとの総投稿数を取得
      const authorIds = (data as PostFromDB[]).map(post => {
        const authorData = Array.isArray(post.author) ? post.author[0] : post.author;
        return authorData?.id;
      }).filter(Boolean);
      const uniqueAuthorIds = Array.from(new Set(authorIds)) as string[];

      let authorPostCounts: Record<string, number> = {};
      if (uniqueAuthorIds.length > 0) {
        try {
          const { data: countData, error: countError } = await supabase
            .from('posts')
            .select('app_profile_id');

          if (!countError && countData) {
            authorPostCounts = countData.reduce((acc, post) => {
              acc[post.app_profile_id] = (acc[post.app_profile_id] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
          }
        } catch (e) {
          console.warn('投稿数の取得に失敗しました:', e);
        }
      }
      
      // データ処理（空席情報・在庫情報・イベント情報は投稿場所、その他は投稿者位置ベース）
      let processedPosts = (data as PostFromDB[]).map(post => {
        let distance;
        
        // 🔥 修正: カテゴリに関係なく、まず店舗位置情報をチェック
        if (currentUserLocation) {
          if (post.store_latitude && post.store_longitude) {
            // 店舗の位置情報がある場合は店舗位置を基準
            distance = calculateDistance(
              currentUserLocation.latitude,
              currentUserLocation.longitude,
              post.store_latitude,
              post.store_longitude
            );
            console.log('🔍 店舗位置での距離計算:', {
              postId: post.id,
              category: post.category,
              userLat: currentUserLocation.latitude,
              userLon: currentUserLocation.longitude,
              storeLat: post.store_latitude,
              storeLon: post.store_longitude,
              distance
            });
          } else if (post.user_latitude && post.user_longitude) {
            // 店舗位置情報がない場合は投稿者の位置を基準
            distance = calculateDistance(
              currentUserLocation.latitude,
              currentUserLocation.longitude,
              post.user_latitude,
              post.user_longitude
            );
            console.log('🔍 投稿者位置での距離計算:', {
              postId: post.id,
              category: post.category,
              userLat: currentUserLocation.latitude,
              userLon: currentUserLocation.longitude,
              postUserLat: post.user_latitude,
              postUserLon: post.user_longitude,
              distance
            });
          } else {
            console.log('🔍 位置情報不足で距離計算スキップ:', {
              postId: post.id,
              category: post.category,
              hasStoreLatLon: !!(post.store_latitude && post.store_longitude),
              hasUserLatLon: !!(post.user_latitude && post.user_longitude)
            });
          }
        }

        const authorData = Array.isArray(post.author) ? post.author[0] : post.author;
        const authorUserId = authorData && typeof authorData === 'object' && 'user_id' in authorData 
          ? (authorData as any).user_id 
          : null;
        
        // 🔥 追加：author.roleを設定（app_usersテーブルから取得）
        const authorRole = authorData?.app_users 
          ? Array.isArray(authorData.app_users) 
            ? authorData.app_users[0]?.role || null
            : authorData.app_users.role || null
          : null;

        const isLikedByCurrentUser = currentUserId 
          ? Array.isArray(post.post_likes) 
            ? post.post_likes.some((like: PostLike) => like.user_id === currentUserId)
            : false
          : false;

        const authorPostsCount = authorData?.id ? authorPostCounts[authorData.id] || 0 : 0;

        return {
          ...post,
          author: authorData ? {
            ...authorData,
            role: authorRole
          } : null,
          author_user_id: authorUserId,
          author_posts_count: authorPostsCount,
          isLikedByCurrentUser,
          likes_count: post.likes_count,
          views_count: post.views_count || 0,
          comments_count: post.comments_count || 0,
          distance,
        };
      });

      // 特別なソート処理を削除
      
      // 🔥 ご近所モード時の距離フィルタリングとページング処理
      if (currentUserLocation && currentIsNearbyMode) {
        console.log('🔍 距離フィルタリング適用前の投稿数:', processedPosts.length);
        
        // 距離フィルタリングを適用
        const filteredPosts = processedPosts.filter(post => {
          // 距離が計算されていない場合の処理を改善
          if (post.distance === undefined) {
            console.log('🔍 距離未計算のため除外:', {
              postId: post.id,
              category: post.category,
              hasStoreLocation: !!(post.store_latitude && post.store_longitude),
              hasUserLocation: !!(post.user_latitude && post.user_longitude)
            });
            return false;
          }
          
          const isWithinRadius = post.distance <= SEARCH_RADIUS_METERS;
          console.log('🔍 距離チェック:', {
            postId: post.id,
            distance: post.distance,
            radius: SEARCH_RADIUS_METERS,
            isWithin: isWithinRadius
          });
          
          return isWithinRadius;
        });
        
        console.log('🔥 距離フィルタリング適用後の投稿数:', filteredPosts.length);
        
        // 🔥 距離フィルタリング後にページング処理を適用
        const startIndex = offset;
        const endIndex = offset + 20;
        processedPosts = filteredPosts.slice(startIndex, endIndex);
        
        console.log('🔍 ご近所モード ページング:', {
          totalFiltered: filteredPosts.length,
          startIndex,
          endIndex,
          currentPage: processedPosts.length
        });
        
        // 🔥 hasMoreの判定をフィルタリング後の総数で行う
        const remainingPosts = filteredPosts.length - endIndex;
        const shouldHaveMoreNearby = remainingPosts > 0;
        console.log('🔍 ご近所モード hasMore判定:', {
          totalFiltered: filteredPosts.length,
          endIndex,
          remainingPosts,
          shouldHaveMore: shouldHaveMoreNearby
        });
        
        // 🔥 フィルタリング結果をキャッシュして後続のページングで使用
        (window as any)._nearbyFilteredPosts = filteredPosts;
        (window as any)._nearbyModeHasMore = shouldHaveMoreNearby;
        
      } else {
        console.log('🔍 距離フィルタリングをスキップ:', {
          hasLocation: !!currentUserLocation,
          isNearbyMode: currentIsNearbyMode
        });
      }

      // 距離ソート処理を削除

      if (isInitial) {
        console.log('🔥 投稿リストを初期化:', processedPosts.length, '件');
        setPosts(processedPosts as ExtendedPostWithAuthor[]);
      } else {
        console.log('🔥 投稿リストに追加:', processedPosts.length, '件');
        setPosts(prevPosts => [...prevPosts, ...processedPosts as ExtendedPostWithAuthor[]]);
      }

      // 🔥 最終的な投稿数をログ出力
      console.log('🔍 最終的に表示される投稿数:', processedPosts.length);
      console.log('🔍 最終投稿のサンプル:', processedPosts.slice(0, 2).map(p => ({
        id: p.id,
        category: p.category,
        distance: p.distance,
        author_role: p.author_role
      })));

      // 🔥 修正：hasMoreの判定を改善
      if (currentUserLocation && currentIsNearbyMode) {
        // ご近所モード：距離フィルタリング後の残り件数で判定
        const nearbyHasMore = (window as any)._nearbyModeHasMore || false;
        setHasMore(nearbyHasMore);
        console.log('🔍 ご近所モード hasMore設定:', nearbyHasMore);
      } else {
        // 通常モード：データベースから取得した件数で判定
        const shouldHaveMore = data.length === 20;
        setHasMore(shouldHaveMore);
        console.log('🔍 通常モード hasMore設定:', shouldHaveMore);
      }
    } catch (e: any) {
      console.error("投稿の取得に失敗しました:", e);
      setError("投稿の読み込みに失敗しました。しばらくしてから再度お試しください。");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsSearching(false);
    }
  }, [currentUserRole]);

  // IPアドレスを取得する関数
  const getClientInfo = async () => {
    try {
      const response = await fetch('/api/client-info');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('クライアント情報の取得に失敗:', error);
      return { ip: null, userAgent: navigator.userAgent };
    }
  };

  // ビュー数増加処理（適切な重複防止付き）
  const handleView = useCallback(async (postId: string) => {
    console.log('🔍 ビュー処理開始:', postId);
    
    try {
      // クライアントサイドでの重複防止（高速化のため）
      const viewedKey = `viewed_${postId}`;
      if (localStorage.getItem(viewedKey)) {
        console.log('❌ 既に視聴済み（localStorage）:', postId);
        return; // 既に視聴済みの場合は何もしない
      }

      // セッションIDを確実に取得
      let sessionId = sessionStorage.getItem('viewer_session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('viewer_session_id', sessionId);
        console.log('🆕 新しいセッションID:', sessionId);
      }

      // IPアドレス取得
      let clientInfo = { ip: null, userAgent: navigator.userAgent };
      try {
        const response = await fetch('/api/client-info');
        clientInfo = await response.json();
      } catch (e) {
        console.log('IP取得失敗、デフォルト値使用');
      }
      
      console.log('📤 RPC呼び出し:', {
        postId,
        currentUserId,
        sessionId,
        clientInfo
      });
      
      // RPC関数呼び出し
      const { data, error } = await supabase.rpc('increment_post_view', {
        p_post_id: postId,
        p_viewer_app_profile_id: currentUserId || null,
        p_viewer_session_id: sessionId,
        p_view_type: 'timeline_view',
        p_ip_address: clientInfo.ip,
        p_user_agent: clientInfo.userAgent
      });
      
      console.log('📨 RPC結果:', { data, error });
      
      if (error) {
        console.error('❌ RPC エラー:', error);
        return;
      }
      
      const success = data === true;
      
      if (success) {
        // 成功した場合のみUIを更新し、localStorageに記録
        localStorage.setItem(viewedKey, 'true');
        setPosts(prevPosts => prevPosts.map(p => 
          p.id === postId 
            ? { ...p, views_count: p.views_count + 1 }
            : p
        ));
        console.log('✅ 視聴回数更新成功');
      } else {
        console.log('⚠️ データベース側で重複判定（既に視聴済み）');
      }
      
    } catch (error) {
      console.error('💥 予期しないエラー:', error);
    }
  }, [currentUserId]);

  // コメントボタンクリック処理
  const handleCommentClick = useCallback((post: ExtendedPostWithAuthor) => {
    setCommentsModal({
      isOpen: true,
      post,
    });
  }, []);

  // コメントモーダルを閉じる処理
  const handleCloseCommentsModal = useCallback(() => {
    setCommentsModal({
      isOpen: false,
      post: null,
    });
  }, []);

  // 初回データ取得（検索クエリがない場合のみ）
  useEffect(() => {
    // 🔥 URLパラメータに検索クエリがある場合は初回データ取得をスキップ
    const searchQuery = searchParams.get('search');
    if (!searchQuery && fetchPostsRef.current) {
      console.log('🔥 初回データ取得を実行（検索クエリなし）');
      fetchPostsRef.current(0, true);
    } else if (searchQuery) {
      console.log('🔥 初回データ取得をスキップ（検索クエリあり）:', searchQuery);
    }
  }, [searchParams]);

  // リアルタイム検索の実装
  const fetchPostsRef = useRef<typeof fetchPosts>();
  fetchPostsRef.current = fetchPosts;

  // 🔥 fetchPostsRefが設定された後に保留中の検索を実行（バックアップ機能）
  useEffect(() => {
    if (pendingSearchQuery && fetchPostsRef.current) {
      console.log('🔥 保留中の検索を実行開始:', pendingSearchQuery);
      
      // 🔥 handleSearchと同じ処理を実行
      setIsSearching(true);
      if (pendingSearchQuery.trim().length >= 2) {
        addToHistory(pendingSearchQuery.trim());
        console.log('🔥 検索履歴に追加:', pendingSearchQuery.trim());
      }
      
      console.log('🔥 fetchPosts実行開始:', { query: pendingSearchQuery.trim() });
      
      // 🔥 検索実行
      fetchPostsRef.current(0, true, pendingSearchQuery.trim())
        .then(() => {
          console.log('🔥 保留検索完了');
          setIsSearching(false);
          setPendingSearchQuery(null); // 🔥 検索完了後にクリア
        })
        .catch((error) => {
          console.error('🔥 保留検索エラー:', error);
          setIsSearching(false);
          setPendingSearchQuery(null); // 🔥 エラー時もクリア
        });
      
      console.log('🔥 保留中の検索実行完了');
    }
  }, [pendingSearchQuery, addToHistory]);

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
    if (!loadingMore && hasMore && fetchPostsRef.current) {
      console.log('🔥 次のページを読み込み中...', { 
        currentPostsLength: posts.length, 
        hasMore, 
        loadingMore 
      });
      fetchPostsRef.current(posts.length, false, '');
    }
  }, [posts.length, loadingMore, hasMore]);

  // 🔥 Intersection Observer APIを使用した無限スクロール実装
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !loadingMore) {
          console.log('🔥 スクロール検知: 次のページを読み込み');
          loadMorePosts();
        }
      },
      {
        root: null,
        rootMargin: '100px', // 100px手前で検知
        threshold: 0.1
      }
    );

    const loadMoreTrigger = document.getElementById('load-more-trigger');
    if (loadMoreTrigger) {
      observer.observe(loadMoreTrigger);
    }

    return () => {
      if (loadMoreTrigger) {
        observer.unobserve(loadMoreTrigger);
      }
      observer.disconnect();
    };
  }, [loadMorePosts, hasMore, loadingMore]);

  // いいね処理の統合
  const handleLike = useCallback(async (postId: string, newLikedState: boolean) => {
    try {
      if (currentUserId) {
        await handleAuthenticatedLike(postId, newLikedState);
      } else {
        // 匿名ユーザーの場合は何もしない（PostCardでログインモーダルが表示される）
        return;
      }
    } catch (error) {
      console.error('いいね処理エラー:', error);
      // エラー時はUIを元に戻す
      setPosts(prevPosts => prevPosts.map(p => 
        p.id === postId 
          ? { 
              ...p, 
              isLikedByCurrentUser: !newLikedState, 
              likes_count: newLikedState ? p.likes_count - 1 : p.likes_count + 1
            } 
          : p
      ));
    }
  }, [currentUserId]);

  // ログインユーザーのいいね処理
  const handleAuthenticatedLike = async (postId: string, newLikedState: boolean) => {
    if (newLikedState) {
      // いいねを追加
      const { error: insertError } = await supabase
        .from('post_likes')
        .insert({ 
          post_id: postId, 
          user_id: currentUserId,
          created_at: new Date().toISOString()
        });
      if (insertError) throw insertError;
      
      // いいね状態の管理を削除
    } else {
      // いいねを削除
      const { error: deleteError } = await supabase
        .from('post_likes')
        .delete()
        .match({ post_id: postId, user_id: currentUserId });
      if (deleteError) throw deleteError;
      
      // いいね状態の管理を削除
    }
    
    // post_likesテーブルから現在のいいね数を取得して更新
    const { count, error: countError } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
    
    if (countError) {
      console.error('いいね数の取得エラー:', countError);
      // エラーが発生してもUIは楽観的に更新
    }
    
    const actualLikesCount = count || 0;
    
    // postsテーブルのlikes_countを実際の数に更新
    const { error: updateError } = await supabase
      .from('posts')
      .update({ likes_count: actualLikesCount })
      .eq('id', postId);
    
    if (updateError) {
      console.error('いいね数の更新エラー:', updateError);
    }
    
    setPosts(prevPosts => prevPosts.map(p => 
      p.id === postId 
        ? { 
            ...p, 
            isLikedByCurrentUser: newLikedState, 
            likes_count: actualLikesCount
          } 
        : p
    ));
  };


  // 🔥 位置情報取得の関数を修正（自動投稿取得を制御可能に）
  const getCurrentLocation = useCallback((autoFetch = true, forceRefresh = false) => {
    setIsRequestingLocation(true);
    setLocationError(null);
    
    // 🔥 強制更新の場合は保存された位置情報を削除
    if (forceRefresh) {
      localStorage.removeItem('userLocation');
      console.log('位置情報を強制リセットしました');
    }
    
    if (!navigator.geolocation) {
      setLocationError('位置情報が利用できません');
      setLocationPermissionState('unavailable');
      setIsRequestingLocation(false);
      return Promise.reject(new Error('位置情報が利用できません'));
    }

    return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
      // まず現在の許可状態をチェック
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setLocationPermissionState(result.state as any);
        
        if (result.state === 'denied') {
          setShowLocationModal(true);
          setIsRequestingLocation(false);
          reject(new Error('位置情報が拒否されています'));
          return;
        }

        // 位置情報を取得（強制更新の場合はmaxAgeを0に設定）
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const locationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            
            console.log('新しい位置情報を取得しました:', locationData);
            
            // 🔥 ローカル状態を更新
            setUserLocation(locationData);
            setLocationPermissionState('granted');
            setShowLocationModal(false);
            setIsRequestingLocation(false);
            
            // 🔥 新しい位置情報をローカルストレージに保存
            try {
              localStorage.setItem('userLocation', JSON.stringify({
                ...locationData,
                timestamp: Date.now(),
                // 5分間有効
                expiresAt: Date.now() + (5 * 60 * 1000)
              }));
              console.log('新しい位置情報をlocalStorageに保存しました:', locationData);
            } catch (error) {
              console.warn('位置情報の保存に失敗しました:', error);
            }
            
            // 🔥 自動投稿取得の制御
            if (autoFetch) {
              setTimeout(() => {
                if (fetchPostsRef.current) {
                  fetchPostsRef.current(0, true);
                }
              }, 100);
            }
            
            resolve(locationData);
          },
          (error) => {
            console.error('位置情報の取得に失敗しました:', error);
            setLocationError('現在地を取得できませんでした');
            setLocationPermissionState('denied');
            setShowLocationModal(true);
            setIsRequestingLocation(false);
            reject(error);
          },
          { 
            enableHighAccuracy: true, 
            timeout: 15000, // タイムアウトを15秒に延長
            maximumAge: forceRefresh ? 0 : 300000 // 🔥 強制更新の場合はキャッシュを使用しない
          }
        );
      }).catch(() => {
        // permissions API が使用できない場合は直接位置情報を取得
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const locationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            
            console.log('新しい位置情報を取得しました:', locationData);
            
            // 🔥 ローカル状態を更新
            setUserLocation(locationData);
            setLocationPermissionState('granted');
            setShowLocationModal(false);
            setIsRequestingLocation(false);
            
            // 🔥 新しい位置情報をローカルストレージに保存
            try {
              localStorage.setItem('userLocation', JSON.stringify({
                ...locationData,
                timestamp: Date.now(),
                // 5分間有効
                expiresAt: Date.now() + (5 * 60 * 1000)
              }));
              console.log('新しい位置情報をlocalStorageに保存しました:', locationData);
            } catch (error) {
              console.warn('位置情報の保存に失敗しました:', error);
            }
            
            // 🔥 自動投稿取得の制御
            if (autoFetch) {
              setTimeout(() => {
                if (fetchPostsRef.current) {
                  fetchPostsRef.current(0, true);
                }
              }, 100);
            }
            
            resolve(locationData);
          },
          (error) => {
            console.error('位置情報の取得に失敗しました:', error);
            setLocationError('現在地を取得できませんでした');
            setLocationPermissionState('denied');
            setShowLocationModal(true);
            setIsRequestingLocation(false);
            reject(error);
          },
          { 
            enableHighAccuracy: true, 
            timeout: 15000, // タイムアウトを15秒に延長
            maximumAge: forceRefresh ? 0 : 300000 // 🔥 強制更新の場合はキャッシュを使用しない
          }
        );
      });
    });
  }, []);

  // 🔥 保存された位置情報を読み込む関数を追加
  const loadSavedLocation = useCallback(() => {
    try {
      const savedLocationStr = localStorage.getItem('userLocation');
      if (savedLocationStr) {
        const savedLocation = JSON.parse(savedLocationStr);
        
        // 有効期限をチェック
        if (savedLocation.expiresAt && Date.now() < savedLocation.expiresAt) {
          console.log('保存された位置情報を使用します:', savedLocation);
          setUserLocation({
            latitude: savedLocation.latitude,
            longitude: savedLocation.longitude,
          });
          setLocationPermissionState('granted');
          return true; // 保存された位置情報を使用
        } else {
          console.log('保存された位置情報の有効期限が切れています');
          localStorage.removeItem('userLocation');
        }
      }
    } catch (error) {
      console.warn('保存された位置情報の読み込みに失敗しました:', error);
      localStorage.removeItem('userLocation');
    }
    return false; // 保存された位置情報が使用できない
  }, []);

  // 🔥 位置情報を初期化時に取得（修正版）
  useEffect(() => {
    // まず保存された位置情報を試行
    const hasSavedLocation = loadSavedLocation();
    
    // 保存された位置情報がない場合のみ新規取得
    if (!hasSavedLocation) {
      getCurrentLocation(true); // 初回は自動投稿取得を有効に
    } else {
      // 保存された位置情報がある場合は投稿を取得
      setTimeout(() => {
        if (fetchPostsRef.current) {
          fetchPostsRef.current(0, true);
        }
      }, 100);
    }
  }, [getCurrentLocation, loadSavedLocation]);

  // 🔥 位置情報許可モーダルのハンドラー
  const handleAllowLocation = () => {
    setShowLocationModal(false);
    getCurrentLocation(true); // 許可時は自動投稿取得を有効に
  };

  const handleDenyLocation = () => {
    setShowLocationModal(false);
    setLocationPermissionState('denied');
    setError('投稿を表示するには位置情報が必要です');
  };

  // 🔥 再試行ボタンのハンドラーを修正
  const handleRetry = () => {
    setError(null);
    getCurrentLocation();
  };

  // フィルターを適用する処理を修正
  const handleApplyFilters = () => {
    // 🔥 新しいフィルター項目を適用
    setSelectedPrefecture(tempSelectedPrefecture);
    setSelectedCity(tempSelectedCity);
    
    // 🔥 ご近所モードのキャッシュをクリア
    (window as any)._nearbyFilteredPosts = null;
    (window as any)._nearbyModeHasMore = false;
    
    setShowFilterModal(false);
    
    setTimeout(() => {
      if (fetchPostsRef.current) {
        fetchPostsRef.current(0, true);
      }
    }, 100);
  };

  // モーダルを閉じる処理を修正
  const handleCloseModal = () => {
    // 🔥 新しいフィルター項目も元に戻す
    setTempSelectedPrefecture(selectedPrefecture);
    setTempSelectedCity(selectedCity);
    setShowFilterModal(false);
  };

  // すべてクリア機能を修正
  const handleClearAllFilters = useCallback(() => {
    setGeneralSearchTerm('');
    setIsNearbyMode(true); // デフォルトのON状態に戻す
    // 🔥 新しいフィルター項目をクリア
    setSelectedPrefecture('all');
    setSelectedCity('all');
    setTempSelectedPrefecture('all');
    setTempSelectedCity('all');
    
    setTimeout(() => {
      if (fetchPostsRef.current) {
        fetchPostsRef.current(0, true);
      }
    }, 100);
  }, []);

  // アクティブなフィルタ数を計算を修正
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    // 🔥 新しいフィルター項目をカウント
    if (selectedPrefecture !== 'all') count++;
    if (selectedCity !== 'all') count++;
    return count;
  }, [selectedPrefecture, selectedCity]);

  // 招待モーダルの状態を追加
  const [showInviteModal, setShowInviteModal] = useState(false);


  // 🔥 カテゴリのカラーリング関数を修正
  const getCategoryColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      '空席情報': '#ea580c',      // orange-600
      '在庫情報': '#2563eb',      // blue-600
      'イベント情報': '#9333ea',    // purple-600
      '助け合い': '#dc2626',        // red-600
      '口コミ': '#4b5563',        // gray-600
    };
    
    return colorMap[category] || '#6b7280'; // gray-500 as default
  };

  // デバイス判定の状態を追加
  const [isMobile, setIsMobile] = useState(false);

  // デバイス判定
  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isMobileWidth = window.innerWidth <= 768;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      setIsMobile(isMobileUserAgent || (isMobileWidth && isTouchDevice));
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, []);


  // ログアウト処理をTimelineコンポーネントに移動
  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  // 🔥 新規追加: 投稿ページへの遷移ハンドラー
  const handleNavigateToPost = async () => {
    setIsNavigatingToPost(true);
    try {
      await router.push('/post');
    } catch (error) {
      console.error('投稿ページへの遷移に失敗しました:', error);
    } finally {
      // 少し遅延を入れてアニメーションを見せる
      setTimeout(() => {
        setIsNavigatingToPost(false);
      }, 500);
    }
  };

  // 🔥 更新ボタンのハンドラーを修正（ローディング状態を追加）
  const handleRefresh = useCallback(async () => {
    console.log('更新ボタンが押されました - 位置情報の強制リセットと再取得、投稿の更新を実行します');
    
    setIsRefreshing(true); // ローディング開始
    
    try {
      // 🔥 検索バーに値がある場合は「すべて」ボタンと同じ処理を実行
      if (generalSearchTerm) {
        setActiveFilter('all');
        setGeneralSearchTerm('');
        setIsNearbyMode(true); // デフォルトのON状態に戻す
        
        setTempActiveFilter('all');
        console.log('検索バーに値があったため、すべてのフィルターと検索条件をリセットしました');
      } else {
        console.log('検索バーに値がないため、フィルターリセットはスキップします');
      }
      
      // 🔥 ローカルストレージから位置情報を削除
      localStorage.removeItem('userLocation');
      console.log('ローカルストレージの位置情報をリセットしました');
      
      // 🔥 位置情報を強制再取得（キャッシュを使用しない）
      await getCurrentLocation(true, true); // forceRefresh = true
      
      console.log('更新処理が完了しました');
    } catch (error) {
      console.error('更新処理中にエラーが発生しました:', error);
      
      // エラーが発生した場合でも投稿の再取得は実行
      if (fetchPostsRef.current) {
        fetchPostsRef.current(0, true);
      }
    } finally {
      // 少し遅延を入れてローディング終了（ユーザー体験向上のため）
      setTimeout(() => {
        setIsRefreshing(false);
      }, 800);
    }
  }, [getCurrentLocation]);

  // 🔥 新規追加: 初回ローディング状態を管理
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // 🔥 最適化: 位置情報の効率的な取得
  useEffect(() => {
    console.log('掲示板画面に遷移しました - 位置情報を確認します');
    
    setIsInitialLoading(true);
    setLoading(true);
    
    // 🔥 既存の位置情報をチェック（キャッシュ活用）
    const checkAndGetLocation = async () => {
      try {
        const savedLocation = localStorage.getItem('userLocation');
        
        if (savedLocation) {
          try {
            const locationData = JSON.parse(savedLocation);
            const now = Date.now();
            
            // 🔥 位置情報が5分以内の場合は再利用
            if (locationData.expiresAt && locationData.expiresAt > now) {
              console.log('有効な位置情報が見つかりました - キャッシュを使用します');
              setUserLocation(locationData);
              setLocationPermissionState('granted');
              
              // 🔥 即座に投稿を取得
              if (fetchPostsRef.current) {
                await fetchPostsRef.current(0, true);
              }
              
              setIsInitialLoading(false);
              return;
            } else {
              console.log('位置情報の有効期限が切れています - 新規取得します');
            }
          } catch (parseError) {
            console.warn('保存された位置情報の解析に失敗:', parseError);
          }
        }
        
        // 🔥 位置情報がない、または期限切れの場合のみ新規取得
        console.log('新しい位置情報を取得します');
        await getCurrentLocation(true);
        
      } catch (error) {
        console.error('位置情報の取得に失敗しました:', error);
        setError('投稿を表示するには位置情報が必要です');
      } finally {
        setIsInitialLoading(false);
      }
    };
    
    checkAndGetLocation();
  }, []); // 🔥 依存配列を空にして、画面遷移時のみ実行

  const handleDeletePost = useCallback(async (postId: string) => {
    try {
      // UIから投稿を即座に削除
      setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
      
      toast({
        title: "投稿を削除しました",
        duration: 1000,
      });
    } catch (error) {
      console.error('投稿削除の処理でエラーが発生しました:', error);
      // エラー時は投稿一覧を再取得
      if (fetchPostsRef.current) {
        fetchPostsRef.current(0, true);
      }
    }
  }, [toast]);

  // 招待モーダルの状態を使い方モーダルに変更
  const [showHowToUseModal, setShowHowToUseModal] = useState(false);

  // 🔥 高速化：最小限のローディング表示
  if ((loading && posts.length === 0) || isInitialLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen" style={{ backgroundColor: '#fffaeb' }}>
          {/* 🔥 軽量化：シンプルなヘッダー */}
          <div className="sticky top-0 z-10 bg-[#73370c] p-3">
            <div className="flex items-center justify-center">
              <div className="text-white text-sm">読み込み中...</div>
            </div>
          </div>
          
          {/* 🔥 軽量化：最小限のローディング表示 */}
          <div className="flex items-center justify-center pt-20">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin"></div>
          </div>
        </div>

        {/* 🔥 位置情報許可モーダル */}
        <LocationPermissionDialog
          isOpen={showLocationModal}
          onAllow={handleAllowLocation}
          onDeny={handleDenyLocation}
          appName="トクドク"
          permissionState={locationPermissionState}
        />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="sticky top-0 z-10 border-b p-4 flex items-center space-x-2 bg-[#73370c]">
          {/* PC版ではHamburgerMenuを非表示にし、その分のスペースを確保 */}
          {!isMobile && (
            <div className="w-96 flex-shrink-0"></div> 
          )}
          {isMobile && <HamburgerMenu currentUser={currentUserProfile} onShowHowToUse={() => setShowHowToUseModal(true)} />}
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="店舗名やキーワードで検索"
              value={generalSearchTerm}
              onChange={(e) => setGeneralSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className={`w-full text-base transition-all duration-200 ${
                generalSearchTerm ? 'pr-16' : 'pr-10'
              }`}
              style={{ fontSize: '16px' }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            
            {/* 検索ボタン（テキスト入力時のみ表示） */}
            {generalSearchTerm && (
              <div className="absolute right-1 top-1/2 -translate-y-1/2">
                <Button
                  onClick={handleSearch}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 bg-[#f97414] hover:bg-[#f97414]/90 text-white rounded-md transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
            
            {/* 検索アイコン（テキストがない時の表示） */}
            {!generalSearchTerm && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
          {isMobile && (
            <Button onClick={() => setShowFilterModal(true)} variant="outline" className="relative">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              {activeFiltersCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          )}
          {/* PC版では右サイドバーの幅を考慮 */}
          {!isMobile && (
            <div className="w-80 flex-shrink-0"></div>
          )}
        </div>
        <div className="p-4">
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <p className="text-red-800 text-lg mb-4">{error}</p>
              
              {/* 🔥 位置情報エラーの場合は位置情報許可ボタンを表示 */}
              {locationPermissionState === 'denied' ? (
                <div className="space-y-3">
                  <Button onClick={handleRetry} className="w-full">
                    <Info className="h-4 w-4 mr-2" />
                    設定方法を見る
                  </Button>
                  <p className="text-sm text-red-600">
                    設定で位置情報を許可してください
                  </p>
                </div>
              ) : (
                <Button onClick={handleRetry} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  再試行
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 🔥 位置情報許可モーダル */}
        <LocationPermissionDialog
          isOpen={showLocationModal}
          onAllow={handleAllowLocation}
          onDeny={handleDenyLocation}
          appName="トクドク"
          permissionState={locationPermissionState}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
        {/* モバイル版のレイアウトのみを残す */}
        <div className="sticky top-0 z-10 border-b bg-[#73370c]">
          {/* 検索行 */}
          <div className="p-4 flex items-center space-x-2">
            <HamburgerMenu currentUser={currentUserProfile} onShowHowToUse={() => setShowHowToUseModal(true)} />
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="店舗名やキーワードで検索"
                value={generalSearchTerm}
                onChange={(e) => setGeneralSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className={`w-full text-base transition-all duration-200 ${
                  generalSearchTerm ? 'pr-16' : 'pr-10'
                }`}
                style={{ fontSize: '16px' }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
              
              {/* 検索ボタン（テキスト入力時のみ表示） */}
              {generalSearchTerm && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                  <Button
                    onClick={handleSearch}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 bg-[#f97414] hover:bg-[#f97414]/90 text-white rounded-md transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
              
              {/* 検索アイコン（テキストがない時の表示） */}
              {!generalSearchTerm && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              
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
                         addToHistory(term);
                         setIsSearching(true);
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
            
            {/* 近所/全表示トグルボタン */}
            <Button 
              onClick={() => {
                setIsNearbyMode(!isNearbyMode);
                // 🔥 ご近所モードのキャッシュをクリア
                (window as any)._nearbyFilteredPosts = null;
                (window as any)._nearbyModeHasMore = false;
                setTimeout(() => {
                  if (fetchPostsRef.current) {
                    fetchPostsRef.current(0, true);
                  }
                }, 100);
              }}
              variant="outline"
              className={cn(
                "relative px-3 py-2 text-sm font-medium transition-all duration-200 border-2",
                isNearbyMode 
                  ? "bg-[#f97414] hover:bg-[#f97414]/90 text-white border-[#f97414] shadow-md" 
                  : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300 shadow-sm"
              )}
            >
              <div className="flex items-center space-x-1">
                {isNearbyMode ? (
                  <>
                    <Compass className="h-4 w-4" />
                    <span>ご近所</span>
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4" />
                    <span>全表示</span>
                  </>
                )}
              </div>
            </Button>
          </div>
        </div>

        {/* カテゴリフィルター */}
        <div className="px-4 py-2 border-b bg-white">
          <PostFilter 
            activeFilter={activeFilter} 
            setActiveFilter={(filter) => {
              setActiveFilter(filter);
              // カテゴリ選択時に自動的に投稿を再取得
              setTimeout(() => {
                if (fetchPostsRef.current) {
                  fetchPostsRef.current(0, true);
                }
              }, 100);
            }}
          />
        </div>

        {/* リアルタイム検索中の表示 */}
        {isSearching && generalSearchTerm && generalSearchTerm.length >= 2 && (
          <div className="px-4 py-2 bg-blue-50 border-b">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm text-blue-700">「{generalSearchTerm}」を検索中...</span>
            </div>
          </div>
        )}

        {/* アクティブなフィルタの表示 */}
        {activeFilter !== 'all' && (
          <div className="px-4 py-2 bg-gray-50 border-b">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-600">選択中のカテゴリ:</span>
              <Badge variant="secondary" className="flex items-center gap-1">
                {activeFilter}
                <button 
                  onClick={() => {
                    setActiveFilter('all');
                    setTimeout(() => {
                      if (fetchPostsRef.current) {
                        fetchPostsRef.current(0, true);
                      }
                    }, 100);
                  }} 
                  className="ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            </div>
          </div>
        )}

        {/* 投稿するボタンと更新ボタンの行 */}
        <div className="px-4 py-3 bg-gray-50 border-b">
          <div className="flex space-x-2">
            <Button
              onClick={handleNavigateToPost}
              disabled={isNavigatingToPost}
              className={cn(
                "flex-1 text-white hover:opacity-90 relative overflow-hidden tap-highlight-transparent focus:ring-0 focus:ring-offset-0 focus:outline-none active:bg-current",
                isNavigatingToPost && "cursor-not-allowed"
              )}
              style={{ 
                backgroundColor: '#f97415',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {isNavigatingToPost ? (
                <motion.div
                  className="flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="mr-2"
                  >
                    <Loader2 className="h-4 w-4" />
                  </motion.div>
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    移動中...
                  </motion.span>
                </motion.div>
              ) : (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  投稿する
                </motion.span>
              )}
            </Button>
            <Button
              onClick={() => setShowFilterModal(true)}
              variant="outline"
              className={cn(
                "flex-1 tap-highlight-transparent focus:ring-0 focus:ring-offset-0 focus:outline-none active:bg-current relative",
                activeFiltersCount > 0 && "bg-blue-50 border-blue-300"
              )}
              style={{ 
                backgroundColor: activeFiltersCount > 0 ? '#dbeafe' : '#eefdf6',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              フィルター
              {activeFiltersCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              className={cn(
                "flex-1 relative overflow-hidden tap-highlight-transparent focus:ring-0 focus:ring-offset-0 focus:outline-none active:bg-current",
                isRefreshing && "cursor-not-allowed"
              )}
              style={{
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {isRefreshing ? (
                <motion.div
                  className="flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="mr-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </motion.div>
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    更新中...
                  </motion.span>
                </motion.div>
              ) : (
                <motion.div
                  className="flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  <span>更新</span>
                </motion.div>
              )}
            </Button>
          </div>
        </div>

        <PullToRefresh 
          onRefresh={handleRefresh}
          pullingContent=""
          refreshingContent={
            <div className="flex items-center justify-center py-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="mr-2"
              >
                <RefreshCw className="h-5 w-5 text-blue-600" />
              </motion.div>
              <span className="text-blue-600 font-medium">更新中...</span>
            </div>
          }
          pullDownThreshold={80}
          maxPullDownDistance={120}
          resistance={2}
        >
          <div className="timeline-scroll-container custom-scrollbar overscroll-none">
          <div className="p-4" style={{ paddingBottom: '24px' }}>
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
                     <Button onClick={() => {
                       setGeneralSearchTerm('');
                       setIsSearching(true);
                       if (fetchPostsRef.current) {
                         fetchPostsRef.current(0, true, '');
                       }
                     }} className="mt-4">
                       検索をクリア
                     </Button>
                  </div>
                ) : !userLocation ? (
                  <div>
                    <p className="text-xl text-muted-foreground mb-2">
                      現在地を取得しています...
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      近くの投稿を表示するために位置情報を取得中です
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xl text-muted-foreground mb-2">
                      {isNearbyMode 
                        ? '近くに投稿がありません'
                        : '投稿がありません'
                      }
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      {isNearbyMode 
                        ? '別の場所に移動するか、時間をおいて再度確認してください'
                        : '時間をおいて再度確認してください'
                      }
                    </p>
                  </div>
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
                        post.id === highlightPostId && 'ring-4 ring-primary ring-offset-2 rounded-xl'
                      )}
                    >
                      <PostCard 
                        post={post} 
                        onLike={handleLike}
                        onView={handleView}
                        onComment={handleCommentClick}
                        onDelete={handleDeletePost}
                        currentUserId={currentUserId}
                        showDistance={
                          process.env.NODE_ENV === 'development' 
                            ? post.distance !== undefined
                            : !!userLocation && post.distance !== undefined
                        }
                        isOwnPost={post.author_user_id === currentUserId}
                        enableComments={true}
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
                    <motion.div 
                      key={`loading-${i}`} 
                      className="w-full"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.1 }}
                    >
                      {/* CLS対策：実際の投稿カードと同じ構造のスケルトン */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {/* ヘッダー部分 */}
                        <div className="p-3 pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
                              <div className="space-y-1">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-2 w-12" />
                              </div>
                            </div>
                            <Skeleton className="h-6 w-16 rounded-full" />
                          </div>
                        </div>
                        
                        {/* コンテンツ部分 */}
                        <div className="p-3 pt-1">
                          <div className="space-y-2 mb-3">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                          </div>
                          
                          {/* 画像部分（固定アスペクト比） */}
                          <div className="flex justify-center w-full mb-3">
                            <Skeleton className="w-full max-w-sm rounded-md" style={{ aspectRatio: "4/5" }} />
                          </div>
                          
                          {/* フッター部分 */}
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center space-x-4">
                              <Skeleton className="h-8 w-12" />
                              <Skeleton className="h-8 w-12" />
                            </div>
                            <Skeleton className="h-8 w-16" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 🔥 無限スクロール用のUI表示を改善 */}
            {loadingMore && (
              <motion.div 
                className="text-center py-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex flex-col items-center space-y-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground">
                    さらに投稿を読み込み中...
                  </p>
                </div>
              </motion.div>
            )}
            
            {hasMore && !loadingMore && posts.length >= 20 && (
              <motion.div 
                id="load-more-trigger"
                className="text-center py-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex flex-col items-center space-y-3">
                  <div className="flex items-center space-x-2 text-primary">
                    <svg 
                      className="w-5 h-5 animate-bounce" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M19 14l-7 7m0 0l-7-7m7 7V3" 
                      />
                    </svg>
                    <span className="text-sm font-medium">スクロールして更新</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    下にスクロールすると次の20件を表示します
                  </p>
                </div>
              </motion.div>
            )}
            
            {!hasMore && posts.length > 0 && (
              <motion.div 
                className="text-center py-8" 
                style={{ marginBottom: '16px' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <svg 
                      className="w-4 h-4 text-green-600" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M5 13l4 4L19 7" 
                      />
                    </svg>
                  </div>
                  <p className="text-muted-foreground font-medium">
                    すべての投稿を表示しました
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {posts.length}件の投稿を表示中
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
        </PullToRefresh>

        {/* コメントモーダル */}
        {commentsModal.post && (
          <CommentsModal
            post={commentsModal.post}
            isOpen={commentsModal.isOpen}
            onClose={handleCloseCommentsModal}
            currentUserId={currentUserId}
          />
        )}

        {/* モバイル版フィルターモーダルを修正 */}
        <CustomModal
          isOpen={showFilterModal}
          onClose={handleCloseModal}
          title="検索フィルター"
          description="カテゴリーや表示範囲で絞り込むことができます。"
        >
          <div className="space-y-6 max-h-[70vh] overflow-y-auto">
            {/* ご近所トグルボタンを追加 */}
            <div>
              <h3 className="font-semibold text-lg mb-2">表示範囲</h3>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">ご近所モード</p>
                  <p className="text-xs text-gray-600">
                    {isNearbyMode ? "1km圏内の投稿のみ表示" : "全ての投稿を表示"}
                  </p>
                </div>
                <Switch
                  checked={isNearbyMode}
                  onCheckedChange={(checked) => {
                    setIsNearbyMode(checked);
                    // 🔥 ご近所モードのキャッシュをクリア
                    (window as any)._nearbyFilteredPosts = null;
                    (window as any)._nearbyModeHasMore = false;
                    // 状態変更後に投稿を再取得
                    setTimeout(() => {
                      if (fetchPostsRef.current) {
                        fetchPostsRef.current(0, true);
                      }
                    }, 100);
                  }}
                />
              </div>
            </div>
            

            {/* 🔥 都道府県フィルター */}
            <div>
              <h3 className="font-semibold text-lg mb-2">都道府県で絞り込み</h3>
              <Select 
                onValueChange={(value: string) => {
                  setTempSelectedPrefecture(value);
                  // 都道府県が変更されたら市町村をリセット
                  if (value !== tempSelectedPrefecture) {
                    setTempSelectedCity('all');
                  }
                }} 
                value={tempSelectedPrefecture}
              >
                <SelectTrigger className="w-full focus:ring-0 focus:ring-offset-0 focus:border-input">
                  <SelectValue placeholder="都道府県を選択" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="all" className="text-lg py-3">
                    すべての都道府県
                  </SelectItem>
                  {prefectureList.map((prefecture) => (
                    <SelectItem 
                      key={prefecture} 
                      value={prefecture}
                      className="text-lg py-3"
                    >
                      {prefecture}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 🔥 市町村フィルター */}
            <div>
              <h3 className="font-semibold text-lg mb-2">市町村で絞り込み</h3>
              <Select 
                onValueChange={(value: string) => setTempSelectedCity(value)} 
                value={tempSelectedCity}
                disabled={tempSelectedPrefecture === 'all' && cityList.length === 0}
              >
                <SelectTrigger className="w-full focus:ring-0 focus:ring-offset-0 focus:border-input">
                  <SelectValue placeholder="市町村を選択" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="all" className="text-lg py-3">
                    すべての市町村
                  </SelectItem>
                  {cityList.map((city) => (
                    <SelectItem 
                      key={city} 
                      value={city}
                      className="text-lg py-3"
                    >
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={() => {
              setTempSelectedPrefecture('all');
              setTempSelectedCity('all');
              setIsNearbyMode(true);
            }}>
              すべてクリア
            </Button>
            <Button onClick={handleApplyFilters}>フィルターを適用</Button>
          </div>
        </CustomModal>


        {/* 使い方モーダル */}
        <CustomModal
          isOpen={showHowToUseModal}
          onClose={() => setShowHowToUseModal(false)}
          title="トクドクの使い方"
          description="掲示板機能の使い方について"
          className="max-w-lg"
        >
          <Carousel className="w-full">
            <CarouselContent>
              {/* 1ページ目: すべてのカテゴリの説明と自動削除について */}
              <CarouselItem>
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      投稿を見るには、<span className="text-red-600">位置情報の許可</span>が必要です。また、全ての投稿は設定された時間で自動的に削除されます。
                    </p>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <MessageSquareText className="h-5 w-5 mr-2 text-blue-600" />
                      5つのカテゴリと詳細情報について
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#ea580c' }}>
                              <Utensils className="h-4 w-4 text-white" />
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-orange-800 mb-1">
                              空席情報
                            </p>
                            <p className="text-xs text-orange-600">
                              飲食店やコワーキングスペース等
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#2563eb' }}>
                              <Store className="h-4 w-4 text-white" />
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-blue-800 mb-1">
                              在庫情報
                            </p>
                            <p className="text-xs text-blue-600">
                              ショーケースの在庫やセール商品等
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#dc2626' }}>
                              <Heart className="h-4 w-4 text-white" />
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-red-800 mb-1">
                              助け合い
                            </p>
                            <p className="text-xs text-red-600">
                              食品ロス削減、物の譲り合いなど
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#4b5563' }}>
                              <MessageSquareText className="h-4 w-4 text-white" />
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800 mb-1">
                              口コミ
                            </p>
                            <p className="text-xs text-gray-600">
                              近所のお店の口コミやレビュー
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 col-span-2">
                        <div className="flex items-center space-x-3 justify-center">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#9333ea' }}>
                              <Megaphone className="h-4 w-4 text-white" />
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-purple-800 mb-1">
                              イベント情報
                            </p>
                            <p className="text-xs text-purple-600">
                              イベントの告知や紹介
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ページインジケーター */}
                  <div className="flex justify-center items-center space-x-2 pt-4 border-t">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                    <span className="text-xs text-gray-500 ml-2">1 / 3</span>
                  </div>
                </div>
              </CarouselItem>

              {/* 2ページ目: 投稿についての詳細情報10個（2列5行） */}
              <CarouselItem>
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      投稿には<span className="text-red-600">「カテゴリ(5種類)」</span>、<span className="text-red-600">「テキスト(400文字以内)」</span>と<span className="text-red-600">「掲載期間」</span>の入力が必須です。また、投稿内容に応じて、以下の詳細情報を任意で入力できます。（<span className="text-red-600">※ログイン必須</span>）
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-shrink-0">
                            <Store className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-blue-800">
                              場所
                            </p>
                            <p className="text-xs text-blue-600">
                              お店や施設の場所を設定
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-shrink-0">
                            <Package className="h-4 w-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-amber-800">
                              残数
                            </p>
                            <p className="text-xs text-amber-600">
                              席数・在庫数など
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-shrink-0">
                            <LinkIcon className="h-4 w-4 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-orange-800">
                              リンク
                            </p>
                            <p className="text-xs text-orange-600">
                              関連ウェブサイトURL
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-shrink-0">
                            <Image className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-800">
                              画像
                            </p>
                            <p className="text-xs text-green-600">
                              画像の添付(最大5枚)
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-shrink-0">
                            <User className="h-4 w-4 text-indigo-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-indigo-800">
                              来客状況
                            </p>
                            <p className="text-xs text-indigo-600">
                              現在の混雑度を記載
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-shrink-0">
                            <MessageSquare className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-purple-800">
                              評価
                            </p>
                            <p className="text-xs text-purple-600">
                              星による評価表現
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-pink-50 border border-pink-200 rounded-lg p-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-shrink-0">
                            <Zap className="h-4 w-4 text-pink-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-pink-800">
                              クーポン
                            </p>
                            <p className="text-xs text-pink-600">
                              割引やお得情報
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-teal-50 border border-teal-200 rounded-lg p-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-shrink-0">
                            <MessageSquare className="h-4 w-4 text-teal-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-teal-800">
                              電話番号
                            </p>
                            <p className="text-xs text-teal-600">
                              お店への連絡先
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-rose-50 border border-rose-200 rounded-lg p-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-shrink-0">
                            <FileText className="h-4 w-4 text-rose-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-rose-800">
                              ファイル
                            </p>
                            <p className="text-xs text-rose-600">
                              メニューや資料添付
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-shrink-0">
                            <Heart className="h-4 w-4 text-cyan-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-cyan-800">
                              おすそわけ
                            </p>
                            <p className="text-xs text-cyan-600">
                              寄付・投げ銭機能
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ページインジケーター */}
                  <div className="flex justify-center items-center space-x-2 pt-4 border-t">
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                    <span className="text-xs text-gray-500 ml-2">2 / 3</span>
                  </div>
                </div>
              </CarouselItem>

              {/* 3ページ目: 理解しましたボタンと加盟店募集 */}
              <CarouselItem>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Store className="h-5 w-5 mr-2 text-orange-600" />
                      加盟店募集のご案内
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <Store className="h-8 w-8 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-orange-800 mb-2">
                              加盟店を募集しています！
                            </p>
                            <p className="text-xs text-orange-700 mb-3">
                              お店の集客や地域とのつながりを強化したい事業者様を募集中です。リアルタイムで情報発信し、新しい顧客との出会いを創出しませんか？
                            </p>
                            <div className="bg-white rounded p-2 border border-orange-100">
                              <p className="text-xs text-orange-600">
                                ✓ 無料で始められます<br />
                                ✓ リアルタイム情報発信<br />
                                ✓ 地域密着型の集客支援
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <HelpCircle className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-blue-800 mb-1">
                              お問い合わせについて
                            </p>
                            <p className="text-xs text-blue-600">
                              ご質問やお問い合わせは、メニューの「お問い合わせ」からお気軽にどうぞ
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ページインジケーター */}
                  <div className="flex justify-center items-center space-x-2 pt-4 border-t">
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    <span className="text-xs text-gray-500 ml-2">3 / 3</span>
                  </div>

                  {/* 理解しましたボタン */}
                  <div className="pt-2">
                    <Button 
                      onClick={() => setShowHowToUseModal(false)}
                      className="w-full"
                    >
                      理解しました
                    </Button>
                  </div>
                </div>
              </CarouselItem>
            </CarouselContent>

            {/* カルーセルナビゲーション */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <CarouselPrevious className="relative left-0 translate-y-0" />
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <CarouselNext className="relative right-0 translate-y-0" />
            </div>
          </Carousel>
        </CustomModal>

        {/* 🔥 位置情報許可モーダルをメインレンダリング部分にも追加 */}
        <LocationPermissionDialog
          isOpen={showLocationModal}
          onAllow={handleAllowLocation}
          onDeny={handleDenyLocation}
          appName="トクドク"
          permissionState={locationPermissionState}
        />
      </div>
    </AppLayout>
  );
}