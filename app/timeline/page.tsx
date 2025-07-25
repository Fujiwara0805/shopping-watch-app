"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Search, Star, MapPin, Loader2, SlidersHorizontal, Heart, Plus, X, AlertCircle, Menu, User, Edit, Store, HelpCircle, FileText, LogOut, Settings, Globe, NotebookText, Calculator, Zap, MessageSquare, Eye, Send, RefreshCw, UserPlus, Link as LinkIcon, ExternalLink, Instagram, Trash2, Flag, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { PostWithAuthor } from '@/types/post';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/app-layout';
import { useSearchParams } from 'next/navigation';
import { PostCard } from '@/components/posts/post-card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CustomModal } from '@/components/ui/custom-modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { getAnonymousSessionId } from '@/lib/session';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ExtendedPostWithAuthor } from '@/types/timeline';

// 型定義
interface AuthorData {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
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
  genre: string | null;
  category: string;
  content: string;
  image_urls: string | null;
  url: string | null;
  file_urls: string | null;
  expiry_option: string;
  likes_count: number;
  views_count: number;
  comments_count: number;
  price: number | null;
  created_at: string;
  expires_at: string;
  store_latitude?: number;
  store_longitude?: number;
  user_latitude?: number;
  user_longitude?: number;
  rating?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  // 🔥 追加: authorプロパティを定義
  author: AuthorData | AuthorData[] | null;
  post_likes: PostLike[] | null;
}

type SortOption = 'created_at_desc' | 'created_at_asc' | 'expires_at_asc' | 'distance_asc' | 'likes_desc' | 'views_desc' | 'comments_desc';
type SearchMode = 'all' | 'category' | 'favorite_store' | 'liked_posts' | 'hybrid';

// 🔥 更新されたカテゴリー分類
const genreCategories = {
  'ショッピング': ['惣菜', '弁当', '肉', '魚', '野菜', '果物', '米・パン類', 'デザート類', '日用品', '衣料品', 'その他'],
  'グルメ': ['和食', '洋食', '中華', 'イタリアン', 'フレンチ','レストラン', 'カフェ', 'ファストフード','居酒屋', 'その他'],
  '観光': ['観光ツアー','観光スポット', '宿泊施設','自然景観', '温泉', '博物館・美術館', '公園','水族館','アミューズメントパーク', 'その他'],
  'エンタメ': ['スポーツ', '映画・ドラマ','アイドル','アニメ','漫画', 'ゲーム', 'アウトドア', 'その他'],
  'サービス': ['家事代行', 'ペットハウス', 'デリバリー', 'ハウスクリーニング','家庭教師','コーチング','引越し', 'その他'],
  'イベント': ['コンサート・ライブ', 'フェスティバル', '展示会', 'セミナー・講座', 'スポーツイベント', 'その他'],
  '求人': ['単発','ギグワーク', 'アルバイト・パート','インターン', 'フリーランス', 'その他'],
  '販売': ['古着', '中古品','農作物','特産品', 'ハンドメイド', 'デジタル商品', 'チケット', '移動販売', 'その他'],
  '貸し出し': ['漫画', 'ゲーム', '日用品','キャンプグッズ','車', 'バイク', '傘', 'その他'], // 新規追加
  '宿泊': ['ホテル', '旅館', '民泊', '部屋の貸し出し', 'その他'], // 新規追加
  'ボランティア': ['環境・自然', '福祉・介護', '教育・子育て', '地域活動', '災害支援', 'その他'],
  '相談': ['生活相談', '仕事・キャリア', '恋愛・人間関係', '法律・お金', '健康・医療','起業相談','経営相談', 'その他'],
  'ニュース': ['地域ニュース','ゴシップ','災害情報', 'スポーツ', 'お役立ち情報','エンタメ','お知らせ', 'その他'], 
  'コミュニティ': ['塾・習い事','地域交流', 'イベント','起業家', '趣味','サークル','料理教室', '学習', '地域', 'その他'],
  '募集': ['メンバー募集', '助け合い', '里親（ペット）', '募金', 'その他'], // 新規追加
  'その他': ['不用品の廃棄']
};

// 🔥 全カテゴリーを取得する関数
const getAllCategories = () => {
  const allCategories = new Set<string>();
  Object.values(genreCategories).forEach(categories => {
    categories.forEach(category => allCategories.add(category));
  });
  return ['すべて', ...Array.from(allCategories).sort()];
};

const categories = getAllCategories();
const genres = ['すべて', 'ショッピング', 'グルメ', '観光', 'エンタメ', 'サービス', 'イベント', '求人', '販売', '貸し出し', '宿泊', 'ボランティア', '相談', 'ニュース', 'コミュニティ', '募集', 'その他'];
const SEARCH_RADIUS_METERS = 5000; // 5km

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
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ja })}
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
            avatar_url
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
        
        return {
          ...comment,
          author: authorData,
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
        {/* 投稿内容の表示 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-700">{post?.content}</p>
          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center space-x-1">
              <Heart className="h-3 w-3" />
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
    // {
    //   icon: FileText,
    //   label: '広告・チラシ(未実装)',
    //   onClick: () => {
    //     router.push('/');
    //     setIsOpen(false);
    //   }
    // },
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
            className="w-full justify-start text-left py-3 h-auto text-base text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors duration-200"
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
  const [activeGenreFilter, setActiveGenreFilter] = useState<string>('all');
  const [searchMode, setSearchMode] = useState<SearchMode>('all');
  const [sortBy, setSortBy] = useState<SortOption>('created_at_desc');
  
  const [tempActiveFilter, setTempActiveFilter] = useState<string>('all');
  const [tempActiveGenreFilter, setTempActiveGenreFilter] = useState<string>('all');
  const [tempSearchMode, setTempSearchMode] = useState<SearchMode>('all');
  const [tempSortBy, setTempSortBy] = useState<SortOption>('created_at_desc');
  
  const [hasMore, setHasMore] = useState(true);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const currentUserRole = session?.user?.role;

  // 管理者権限のログ出力
  useEffect(() => {
    if (currentUserRole) {
      console.log(`現在のユーザーロール: ${currentUserRole}`);
      if (currentUserRole === 'admin') {
        console.log('管理者アカウントでログインしています。');
      } else {
        console.log('一般ユーザーアカウントでログインしています。');
      }
    } else {
      console.log('ユーザーはログインしていません。');
    }
  }, [currentUserRole]);

  const searchParams = useSearchParams();
  const [highlightPostId, setHighlightPostId] = useState<string | null>(null);

  const [generalSearchTerm, setGeneralSearchTerm] = useState<string>('');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [favoriteStoreIds, setFavoriteStoreIds] = useState<string[]>([]);
  const [favoriteStoreNames, setFavoriteStoreNames] = useState<string[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showLocationPermissionAlert, setShowLocationPermissionAlert] = useState(false);
  
  const [showSpecialSearch, setShowSpecialSearch] = useState(false);
  const { searchHistory, addToHistory, clearHistory } = useSearchHistory();

  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

  const debouncedSearchTerm = useDebounce(generalSearchTerm, 800); // 150ms → 800msに変更

  // コメントモーダル関連
  const [commentsModal, setCommentsModal] = useState<{
    isOpen: boolean;
    post: ExtendedPostWithAuthor | null;
  }>({
    isOpen: false,
    post: null,
  });

  // Refs for stable references
  const activeFilterRef = useRef(activeFilter);
  const activeGenreFilterRef = useRef(activeGenreFilter); // 追加
  const searchModeRef = useRef(searchMode);
  const userLocationRef = useRef(userLocation);
  const favoriteStoreIdsRef = useRef(favoriteStoreIds);
  const favoriteStoreNamesRef = useRef(favoriteStoreNames);
  const likedPostIdsRef = useRef(likedPostIds);
  const sortByRef = useRef(sortBy);

  // Update refs
  useEffect(() => { activeFilterRef.current = activeFilter; }, [activeFilter]);
  useEffect(() => { activeGenreFilterRef.current = activeGenreFilter; }, [activeGenreFilter]); // 追加
  useEffect(() => { searchModeRef.current = searchMode; }, [searchMode]);
  useEffect(() => { userLocationRef.current = userLocation; }, [userLocation]);
  useEffect(() => { favoriteStoreIdsRef.current = favoriteStoreIds; }, [favoriteStoreIds]);
  useEffect(() => { favoriteStoreNamesRef.current = favoriteStoreNames; }, [favoriteStoreNames]);
  useEffect(() => { likedPostIdsRef.current = likedPostIds; }, [likedPostIds]);
  useEffect(() => { sortByRef.current = sortBy; }, [sortBy]);

  useEffect(() => {
    setTempActiveFilter(activeFilter);
    setTempActiveGenreFilter(activeGenreFilter); // 追加
    setTempSearchMode(searchMode);
    setTempSortBy(sortBy);
  }, [activeFilter, activeGenreFilter, searchMode, sortBy]); // activeGenreFilter追加

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

  // いいねした投稿IDの取得
  useEffect(() => {
    const fetchLikedPostIds = async () => {
      if (!currentUserId) {
        setLikedPostIds([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('post_likes')
          .select('post_id, created_at')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('いいねした投稿の取得に失敗しました:', error);
          setLikedPostIds([]);
        } else {
          const postIds = data?.map(item => item.post_id) || [];
          setLikedPostIds(postIds);
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
    const currentActiveGenreFilter = activeGenreFilterRef.current; // 追加
    const currentSearchMode = searchModeRef.current;
    const currentUserLocation = userLocationRef.current;
    const currentFavoriteStoreIds = favoriteStoreIdsRef.current;
    const currentLikedPostIds = likedPostIdsRef.current;
    const currentSortBy = sortByRef.current;
    const isAdmin = currentUserRole === 'admin'; // 管理者かどうかを判定

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

    if (isInitial) {
      setLoading(true);
      setPosts([]);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    
    try {
      const now = new Date().toISOString();
      
      // 基本クエリ（is_deletedフィルタを追加）
      let query = supabase
        .from('posts')
        .select(`
          id,
          app_profile_id,
          store_id,
          store_name,
          genre,
          category,
          content,
          image_urls,
          url,
          file_urls,
          expiry_option,
          likes_count,
          views_count,
          comments_count,
          price,
          created_at,
          expires_at,
          store_latitude,
          store_longitude,
          user_latitude,
          user_longitude,
          rating,
          start_date,
          end_date,
          author:app_profiles!posts_app_profile_id_fkey (
            id,
            user_id,
            display_name,
            avatar_url
          ),
          post_likes!fk_post_likes_post_id (
            post_id,
            user_id,
            created_at
          )
        `)
        .eq('is_deleted', false) // 🔥 追加：削除されていない投稿のみ取得
        .gt('expires_at', now);

      // カテゴリフィルタ
      if (currentActiveFilter !== 'all') {
        query = query.eq('category', currentActiveFilter);
      }

      // ジャンルフィルタ（追加）
      if (currentActiveGenreFilter !== 'all') {
        query = query.eq('genre', currentActiveGenreFilter);
      }

      // 検索語による絞り込み（genreも検索対象に追加）
      const effectiveSearchTerm = searchTerm;
      if (effectiveSearchTerm && effectiveSearchTerm.trim()) {
        const searchTermLower = effectiveSearchTerm.toLowerCase();
        query = query.or(`store_name.ilike.%${searchTermLower}%,genre.ilike.%${searchTermLower}%,category.ilike.%${searchTermLower}%,content.ilike.%${searchTermLower}%`);
      }

      // 特別な検索モード
      if (currentSearchMode === 'favorite_store') {
        if (currentFavoriteStoreIds.length > 0) {
          query = query.in('store_id', currentFavoriteStoreIds);
        } else {
          query = query.eq('id', 'impossible-id');
        }
      } else if (currentSearchMode === 'liked_posts') {
        if (currentLikedPostIds.length > 0) {
          query = query.in('id', currentLikedPostIds);
        } else {
          query = query.eq('id', 'impossible-id');
        }
      } else if (currentSearchMode === 'hybrid') {
        const conditions = [];
        if (currentFavoriteStoreIds.length > 0) {
          conditions.push(`store_id.in.(${currentFavoriteStoreIds.join(',')})`);
        }
        if (currentLikedPostIds.length > 0) {
          conditions.push(`id.in.(${currentLikedPostIds.join(',')})`);
        }
        
        if (conditions.length > 0) {
          query = query.or(conditions.join(','));
        } else {
          query = query.eq('id', 'impossible-id');
        }
      }

      // ソート処理（views_desc、comments_descを追加）
      if (currentSortBy === 'created_at_desc') {
        query = query.order('created_at', { ascending: false });
      } else if (currentSortBy === 'created_at_asc') {
        query = query.order('created_at', { ascending: true });
      } else if (currentSortBy === 'expires_at_asc') {
        query = query.order('expires_at', { ascending: true });
      } else if (currentSortBy === 'likes_desc') {
        query = query.order('likes_count', { ascending: false });
      } else if (currentSortBy === 'views_desc') {
        query = query.order('views_count', { ascending: false });
      } else if (currentSortBy === 'comments_desc') {
        query = query.order('comments_count', { ascending: false });
      }

      query = query.range(offset, offset + 19);

      const { data, error: dbError } = await query;

      if (dbError) {
        throw dbError;
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
      
      // データ処理（距離計算を端末位置情報ベースに変更）
      let processedPosts = (data as PostFromDB[]).map(post => {
        let distance;
        
        // 端末位置情報を使用して距離計算
        if (currentUserLocation && post.user_latitude && post.user_longitude) {
          distance = calculateDistance(
            currentUserLocation.latitude,
            currentUserLocation.longitude,
            post.user_latitude,
            post.user_longitude
          );
        }

        const authorData = Array.isArray(post.author) ? post.author[0] : post.author;
        const authorUserId = authorData && typeof authorData === 'object' && 'user_id' in authorData 
          ? (authorData as any).user_id 
          : null;

        const isLikedByCurrentUser = currentUserId 
          ? Array.isArray(post.post_likes) 
            ? post.post_likes.some((like: PostLike) => like.user_id === currentUserId)
            : currentLikedPostIds.includes(post.id)
          : false;

        const authorPostsCount = authorData?.id ? authorPostCounts[authorData.id] || 0 : 0;

        return {
          ...post,
          author: authorData,
          author_user_id: authorUserId,
          author_posts_count: authorPostsCount,
          isLikedByCurrentUser,
          likes_count: post.likes_count,
          views_count: post.views_count || 0,
          comments_count: post.comments_count || 0,
          distance,
        };
      });

      // いいね検索時の特別なソート
      if (currentSearchMode === 'liked_posts' && currentLikedPostIds.length > 0) {
        processedPosts = processedPosts.sort((a, b) => {
          const aIndex = currentLikedPostIds.indexOf(a.id);
          const bIndex = currentLikedPostIds.indexOf(b.id);
          return aIndex - bIndex;
        });
      }
      
      // 5km圏内フィルタリング機能を追加（管理者でない場合のみ適用）
      if (currentUserLocation && !isAdmin) { // 管理者ユーザーの場合、距離フィルタリングをスキップ
        processedPosts = processedPosts.filter(post => {
          return post.distance !== undefined && post.distance <= SEARCH_RADIUS_METERS;
        });
      }

      // 距離によるソート
      if (currentSortBy === 'distance_asc' && currentUserLocation && !isAdmin) { // 管理者でない場合のみ適用
        processedPosts = processedPosts
          .filter(post => post.distance !== undefined)
          .sort((a, b) => (a.distance || 0) - (b.distance || 0));
      }

      if (isInitial) {
        setPosts(processedPosts as ExtendedPostWithAuthor[]);
      } else {
        setPosts(prevPosts => [...prevPosts, ...processedPosts as ExtendedPostWithAuthor[]]);
      }

      // 5km圏内フィルタリング適用時はhasMoreをfalseに設定
      // 管理者の場合はhasMoreをtrueに維持し、全件取得を可能にする
      setHasMore(data.length === 20 && (!currentUserLocation || isAdmin));
    } catch (e: any) {
      console.error("投稿の取得に失敗しました:", e);
      setError("投稿の読み込みに失敗しました。しばらくしてから再度お試しください。");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsSearching(false);
    }
  }, [currentUserRole]); // currentUserRoleを依存配列に追加

  // ビュー数増加処理
  const handleView = useCallback(async (postId: string) => {
    try {
      let success = false;
      
      if (currentUserId) {
        // ログインユーザーの場合
        const { data, error } = await supabase.rpc('increment_post_view', {
          p_post_id: postId,
          p_viewer_user_id: currentUserId
        });
        
        if (error) {
          console.error('ビュー数更新エラー (認証済み):', error);
          throw error;
        }
        
        success = data === true;
      } else {
        // 非ログインユーザーの場合
        const sessionId = getAnonymousSessionId();
        const { data, error } = await supabase.rpc('increment_post_view_anonymous', {
          p_post_id: postId,
          p_viewer_session_id: sessionId
        });
        
        if (error) {
          console.error('ビュー数更新エラー (匿名):', error);
          throw error;
        }
        
        success = data === true;
      }

      // 成功した場合のみUIを更新
      if (success) {
        setPosts(prevPosts => prevPosts.map(p => 
          p.id === postId 
            ? { ...p, views_count: p.views_count + 1 }
            : p
        ));
      }
    } catch (error) {
      console.error('ビュー数の更新に失敗しました:', error);
      // エラーが発生してもUIの動作は継続
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

  // 初回データ取得
  useEffect(() => {
    if (fetchPostsRef.current) {
      fetchPostsRef.current(0, true);
    }
  }, []);

  // 検索履歴への追加
  useEffect(() => {
    if (debouncedSearchTerm && debouncedSearchTerm.length >= 3) { // 2文字 → 3文字に変更
      addToHistory(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, addToHistory]);

  // リアルタイム検索の実装
  const fetchPostsRef = useRef<typeof fetchPosts>();
  fetchPostsRef.current = fetchPosts;

  useEffect(() => {
    if (loading && posts.length === 0) {
      return;
    }

    // 検索語が空の場合は即座に実行、そうでなければデバウンス後に実行
    if (debouncedSearchTerm === '' || debouncedSearchTerm.length >= 2) {
      setIsSearching(true);
      if (fetchPostsRef.current) {
        fetchPostsRef.current(0, true, debouncedSearchTerm);
      }
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
    if (!loadingMore && hasMore && fetchPostsRef.current) {
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

  // いいね処理の統合
  const handleLike = useCallback(async (postId: string, isLiked: boolean) => {
    try {
      if (currentUserId) {
        await handleAuthenticatedLike(postId, isLiked);
      } else {
        await handleAnonymousLike(postId, isLiked);
      }
    } catch (error) {
      console.error('いいね処理エラー:', error);
      // エラー時はUIを元に戻す
      setPosts(prevPosts => prevPosts.map(p => 
        p.id === postId 
          ? { 
              ...p, 
              isLikedByCurrentUser: !isLiked, 
              likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1
            } 
          : p
      ));
    }
  }, [currentUserId]);

  // ログインユーザーのいいね処理
  const handleAuthenticatedLike = async (postId: string, isLiked: boolean) => {
    if (isLiked) {
      const { error } = await supabase
        .from('post_likes')
        .insert({ 
          post_id: postId, 
          user_id: currentUserId,
          created_at: new Date().toISOString()
        });
      if (error) throw error;
      
      setLikedPostIds(prev => [postId, ...prev.filter(id => id !== postId)]);
    } else {
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .match({ post_id: postId, user_id: currentUserId });
      if (error) throw error;
      
      setLikedPostIds(prev => prev.filter(id => id !== postId));
    }
    
    setPosts(prevPosts => prevPosts.map(p => 
      p.id === postId 
        ? { 
            ...p, 
            isLikedByCurrentUser: isLiked, 
            likes_count: isLiked ? p.likes_count + 1 : Math.max(0, p.likes_count - 1)
          } 
        : p
    ));
  };

  // 非ログインユーザーのいいね処理
  const handleAnonymousLike = async (postId: string, isLiked: boolean) => {
    const anonymousLikes = JSON.parse(localStorage.getItem('anonymousLikes') || '[]');
    
    if (isLiked && !anonymousLikes.includes(postId)) {
      anonymousLikes.push(postId);
      localStorage.setItem('anonymousLikes', JSON.stringify(anonymousLikes));
      
      const { error } = await supabase.rpc('increment_anonymous_like', { post_id: postId });
      if (error) throw error;
      
    } else if (!isLiked && anonymousLikes.includes(postId)) {
      const updatedLikes = anonymousLikes.filter((id: string) => id !== postId);
      localStorage.setItem('anonymousLikes', JSON.stringify(updatedLikes));
      
      const { error } = await supabase.rpc('decrement_anonymous_like', { post_id: postId });
      if (error) throw error;
    } else {
      return;
    }
    
    setPosts(prevPosts => prevPosts.map(p => 
      p.id === postId 
        ? { 
            ...p, 
            likes_count: isLiked ? p.likes_count + 1 : Math.max(0, p.likes_count - 1)
          } 
        : p
    ));
  };

  // 位置情報を初期化時に取得（自動取得）
  useEffect(() => {
    const getCurrentLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            
            // 位置情報取得後に投稿を取得
            setTimeout(() => {
              if (fetchPostsRef.current) {
                fetchPostsRef.current(0, true);
              }
            }, 100);
          },
          (error) => {
            console.error('位置情報の取得に失敗しました:', error);
            setError('位置情報の取得に失敗しました。ブラウザの設定で位置情報を許可してください。');
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 } // 5分間キャッシュ
        );
      } else {
        setError('お使いのブラウザは位置情報に対応していません。');
      }
    };

    getCurrentLocation();
  }, []);

  // フィルターを適用する処理
  const handleApplyFilters = () => {
    setActiveFilter(tempActiveFilter);
    setActiveGenreFilter(tempActiveGenreFilter); // 追加
    setSearchMode(tempSearchMode);
    setSortBy(tempSortBy);
    
    setShowFilterModal(false);
    
    setTimeout(() => {
      if (fetchPostsRef.current) {
        fetchPostsRef.current(0, true);
      }
    }, 100);
  };

  // モーダルを閉じる処理
  const handleCloseModal = () => {
    setTempActiveFilter(activeFilter);
    setTempActiveGenreFilter(activeGenreFilter); // 追加
    setTempSearchMode(searchMode);
    setTempSortBy(sortBy);
    setShowFilterModal(false);
  };

  // すべてクリア機能
  const handleClearAllFilters = useCallback(() => {
    setActiveFilter('all');
    setActiveGenreFilter('all');
    setSearchMode('all');
    setSortBy('created_at_desc');
    setGeneralSearchTerm('');
    // 🔥 修正：位置情報はクリアしない（5km圏内表示を維持）
    // setUserLocation(null); // この行を削除
    
    setTempActiveFilter('all');
    setTempActiveGenreFilter('all');
    setTempSearchMode('all');
    setTempSortBy('created_at_desc');
    
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
    if (activeGenreFilter !== 'all') count++; // 追加
    if (searchMode !== 'all') count++;
    if (sortBy !== 'created_at_desc') count++;
    return count;
  }, [activeFilter, activeGenreFilter, searchMode, sortBy]); // activeGenreFilter追加

  // 招待モーダルの状態を追加
  const [showInviteModal, setShowInviteModal] = useState(false);

  // 🔥 ジャンル変更時にカテゴリーフィルターをリセットする機能
  const handleGenreFilterChange = (genre: string) => {
    setTempActiveGenreFilter(genre);
    
    // ジャンルが変更された場合、カテゴリーフィルターをリセット
    if (genre !== 'all' && tempActiveFilter !== 'all') {
      const selectedGenreCategories = genreCategories[genre as keyof typeof genreCategories];
      if (selectedGenreCategories && !selectedGenreCategories.includes(tempActiveFilter)) {
        setTempActiveFilter('all');
      }
    }
  };

  // 🔥 選択されたジャンルに基づいて利用可能なカテゴリーを取得
  const getAvailableCategories = () => {
    if (tempActiveGenreFilter === 'all') {
      return categories;
    }
    
    const genreCategories_typed = genreCategories as Record<string, string[]>;
    const selectedGenreCategories = genreCategories_typed[tempActiveGenreFilter];
    
    if (selectedGenreCategories) {
      return ['すべて', ...selectedGenreCategories];
    }
    
    return categories;
  };

  // 🔥 追加：投稿削除処理
  const handleDeletePost = useCallback((postId: string) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
  }, []);

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
      <div className="sticky top-0 z-10 border-b bg-[#73370c]">
        {/* 検索行 */}
        <div className="p-4 flex items-center space-x-2">
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
          
          {/* フィルターボタン */}
          <Button onClick={() => setShowFilterModal(true)} variant="outline" className="relative">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            {(activeFilter !== 'all' || activeGenreFilter !== 'all' || sortBy !== 'created_at_desc') && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {(activeFilter !== 'all' ? 1 : 0) + (activeGenreFilter !== 'all' ? 1 : 0) + (sortBy !== 'created_at_desc' ? 1 : 0)}
              </Badge>
            )}
          </Button>
        </div>
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

      {/* アクティブなフィルタの表示（searchModeを除外） */}
      {(activeFilter !== 'all' || activeGenreFilter !== 'all' || sortBy !== 'created_at_desc') && (
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
            {activeGenreFilter !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                ジャンル: {activeGenreFilter}
                <button onClick={() => setActiveGenreFilter('all')} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {sortBy !== 'created_at_desc' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                並び順: {sortBy === 'likes_desc' ? 'いいね順' : sortBy === 'views_desc' ? '閲覧順' : sortBy === 'comments_desc' ? 'コメント順' : sortBy === 'expires_at_asc' ? '期限順' : sortBy === 'distance_asc' ? '距離順' : '新着順'}
                <button onClick={() => setSortBy('created_at_desc')} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={() => {
              setActiveFilter('all');
              setActiveGenreFilter('all');
              setSortBy('created_at_desc');
              // 🔥 修正：位置情報はクリアしない
              // 検索語のみクリア
              setGeneralSearchTerm('');
              
              // 即座にフィルターを適用
              setTimeout(() => {
                if (fetchPostsRef.current) {
                  fetchPostsRef.current(0, true);
                }
              }, 100);
            }}>
              すべてクリア
            </Button>
          </div>
        </div>
      )}

      {/* 投稿するボタンと更新ボタンの行 */}
      <div className="px-4 py-3 bg-gray-50 border-b">
        <div className="flex space-x-2">
          <Button
            onClick={() => router.push('/post')}
            className="flex-1 text-white hover:opacity-90"
            style={{ backgroundColor: '#f97415' }}
          >
            投稿する
          </Button>
          <Button
            onClick={() => setShowInviteModal(true)}
            variant="outline"
            className="flex-1"
            style={{ backgroundColor: '#eefdf6' }}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            招待する
          </Button>
          <Button
            onClick={() => {
              if (fetchPostsRef.current) {
                fetchPostsRef.current(0, true, debouncedSearchTerm);
              }
            }}
            variant="outline"
            className="flex-1 "
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            更新
          </Button>
        </div>
      </div>

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
                  <Button onClick={() => setGeneralSearchTerm('')} className="mt-4">
                    検索をクリア
                  </Button>
                </div>
              ) : !userLocation && currentUserRole !== 'admin' ? ( // 管理者の場合は位置情報待ちメッセージを表示しない
                <div>
                  <p className="text-xl text-muted-foreground mb-2">
                    位置情報を取得中...
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    5km圏内の投稿を表示するために位置情報を取得しています
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xl text-muted-foreground mb-2">
                    {currentUserRole === 'admin' ? '投稿がありません' : '現在地から5km圏内に投稿がありません'}
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    別の場所に移動するか、時間をおいて再度確認してください
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
                      onDelete={handleDeletePost} // 🔥 追加：削除コールバック
                      currentUserId={currentUserId}
                      showDistance={
                        process.env.NODE_ENV === 'development' 
                          ? post.distance !== undefined
                          : !!userLocation && post.distance !== undefined && currentUserRole !== 'admin' // 管理者の場合は距離表示を無効化
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
                  <Skeleton key={`loading-${i}`} className="h-[400px] w-full rounded-xl" />
                ))}
              </div>
            </div>
          )}
          
          {!hasMore && posts.length > 0 && (
            <div className="text-center py-8" style={{ marginBottom: '16px' }}>
              <p className="text-muted-foreground">
                すべての投稿を表示しました
              </p>
            </div>
          )}
        </div>
      </div>

      {/* コメントモーダル */}
      {commentsModal.post && (
        <CommentsModal
          post={commentsModal.post}
          isOpen={commentsModal.isOpen}
          onClose={handleCloseCommentsModal}
          currentUserId={currentUserId}
        />
      )}

      <CustomModal
        isOpen={showFilterModal}
        onClose={handleCloseModal}
        title="検索フィルター"
        description="検索条件と表示順を設定できます。"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          <div>
            <h3 className="font-semibold text-lg mb-2">ジャンルで絞り込み</h3>
            <Select 
              onValueChange={handleGenreFilterChange} 
              value={tempActiveGenreFilter}
            >
              <SelectTrigger className="w-full focus:ring-0 focus:ring-offset-0 focus:border-input">
                <SelectValue placeholder="ジャンルを選択" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {genres.map((genre) => (
                  <SelectItem 
                    key={genre} 
                    value={genre === 'すべて' ? 'all' : genre}
                    className="text-lg py-3"
                  >
                    {genre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">
              カテゴリーで絞り込み
              {tempActiveGenreFilter !== 'all' && (
                <span className="text-xs text-gray-500 ml-2">
                  ({tempActiveGenreFilter})
                </span>
              )}
            </h3>
            <Select 
              onValueChange={(value: string) => setTempActiveFilter(value)} 
              value={tempActiveFilter}
            >
              <SelectTrigger className="w-full focus:ring-0 focus:ring-offset-0 focus:border-input">
                <SelectValue placeholder="カテゴリを選択" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {getAvailableCategories().map((category) => (
                  <SelectItem 
                    key={category} 
                    value={category === 'すべて' ? 'all' : category}
                    className="text-lg py-3"
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
              <SelectTrigger className="w-full focus:ring-0 focus:ring-offset-0 focus:border-input">
                <SelectValue placeholder="並び替え" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                <SelectItem value="created_at_desc" className="text-lg py-3">新着順</SelectItem>
                <SelectItem value="created_at_asc" className="text-lg py-3">古い順</SelectItem>
                <SelectItem value="expires_at_asc" className="text-lg py-3">期限が近い順</SelectItem>
                <SelectItem value="likes_desc" className="text-lg py-3">いいねが多い順</SelectItem>
                <SelectItem value="views_desc" className="text-lg py-3">表示回数が多い順</SelectItem>
                <SelectItem value="comments_desc" className="text-lg py-3">コメントが多い順</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6 flex justify-between">
          <Button variant="outline" onClick={() => {
            setTempActiveFilter('all');
            setTempActiveGenreFilter('all');
            setTempSortBy('created_at_desc');
          }}>
            すべてクリア
          </Button>
          <Button onClick={handleApplyFilters}>フィルターを適用</Button>
        </div>
      </CustomModal>

      {/* 招待モーダル */}
      <CustomModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="トクドクに友達を招待"
        description="おトクな情報を友達と共有しましょう！"
        className="sm:max-w-md"
      >
        <div className="space-y-4">
          {/* 招待メッセージ */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-sm mb-2" style={{ color: '#73370c' }}>招待メッセージ</h3>
            <div className="bg-white p-3 rounded border">
              <p className="text-sm text-gray-700 mb-3">
                おトクな情報がたくさん見つかる「トクドク」に参加しませんか？
              </p>
              <p className="text-sm text-blue-600 font-medium">
                https://tokudoku.com/
              </p>
            </div>
          </div>

          {/* コピーボタン */}
          <Button
            onClick={() => {
              const message = `お得な情報がたくさん見つかる「トクドク」に参加しませんか？\\n\\nhttps://tokudoku.com/`;
              navigator.clipboard.writeText(message);
              toast({
                title: "招待メッセージをコピーしました！",
                description: "SNSやメッセージアプリで友達に送ってください",
                duration: 1000,
              });
            }}
            className="w-full"
          >
            <LinkIcon className="h-4 w-4 mr-2" />
            招待メッセージをコピー
          </Button>
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="ghost" onClick={() => setShowInviteModal(false)} className="text-base px-5 py-2.5 h-auto">
            閉じる
          </Button>
        </div>
      </CustomModal>
    </AppLayout>
  );
}