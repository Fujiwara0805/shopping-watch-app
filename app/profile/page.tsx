"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, LogOut, Settings, Edit, MapPin, Heart, Store as StoreIcon, Calendar, TrendingUp, Award, Star, User, Sparkles, ShoppingBag, Info, X, Trash2, NotebookText, CheckCircle, ExternalLink, ArrowRight, Trophy, CreditCard } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useSession, signOut } from 'next-auth/react';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getHunterLevel, HUNTER_LEVELS } from '@/lib/hunter-level';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AppProfile {
  id: string;
  user_id: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  updated_at?: string;
  favorite_store_1_id?: string | null;
  favorite_store_1_name?: string | null;
  favorite_store_2_id?: string | null;
  favorite_store_2_name?: string | null;
  favorite_store_3_id?: string | null;
  favorite_store_3_name?: string | null;
  stripe_account_id?: string | null;
  stripe_onboarding_completed?: boolean;
  payout_enabled?: boolean;
}

// 統計カードのコンポーネント - よりコンパクトに
const StatCard = ({ icon: Icon, title, value, subtitle, gradient, delay = 0 }: {
  icon: any;
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  gradient: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
    whileHover={{ 
      scale: 1.02, 
      boxShadow: "0 10px 20px -5px rgb(0 0 0 / 0.15)" 
    }}
    className={cn(
      "relative overflow-hidden rounded-xl p-3",
      "backdrop-blur-sm border border-white/30",
      "shadow-md hover:shadow-lg transition-all duration-300",
      gradient
    )}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
    <div className="relative z-10 text-center">
      <div className="flex items-center justify-center mb-2">
        <Icon className="h-4 w-4 text-gray-700" />
      </div>
      <div className="text-3xl font-bold mb-1 text-gray-800 min-h-8 flex items-center justify-center">{value}</div>
      <p className="text-gray-600 text-xs font-medium">{title}</p>
      {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
    </div>
  </motion.div>
);

// お気に入り店舗カード
const FavoriteStoreCard = ({ store, index }: { store: { id: string; name: string }; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    whileHover={{ 
      y: -3,
      boxShadow: "0 10px 20px -5px rgb(0 0 0 / 0.1)" 
    }}
    className="group relative overflow-hidden rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-red-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <div className="relative z-10 p-4">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm" style={{ backgroundColor: '#c96342' }}>
            <StoreIcon className="h-5 w-5 text-white" />
          </div>
          <motion.div
            className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm group-hover:text-orange-600 transition-colors duration-200 truncate">
            {store.name}
          </h3>
          <p className="text-gray-500 text-xs">お気に入り店舗</p>
        </div>
        <Star className="h-4 w-4 text-yellow-400 group-hover:text-yellow-500 transition-colors duration-200 flex-shrink-0" />
      </div>
    </div>
  </motion.div>
);

// 設定アイテム
const SettingItem = ({ icon: Icon, title, description, action, variant = "default" }: {
  icon: any;
  title: string;
  description: string;
  action: () => void;
  variant?: "default" | "danger";
}) => (
  <motion.div
    whileHover={{ x: 3 }}
    whileTap={{ scale: 0.98 }}
    className="group"
  >
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start p-3 h-auto rounded-lg border border-gray-100",
        "hover:shadow-sm transition-all duration-300",
        "bg-white",
        variant === "danger" && "hover:bg-red-50 hover:border-red-200"
      )}
      onClick={action}
    >
      <div className="flex items-center space-x-3 w-full">
        <div className={cn(
          "w-8 h-8 rounded-md flex items-center justify-center",
          variant === "default" 
            ? "text-white" 
            : "bg-gradient-to-br from-red-500 to-pink-600 text-white"
        )} style={variant === "default" ? { backgroundColor: '#c96342' } : {}}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className={cn(
            "font-medium text-sm group-hover:translate-x-1 transition-transform duration-200",
            variant === "danger" && "text-red-600"
          )}>
            {title}
          </p>
          <p className="text-xs text-gray-500 truncate">{description}</p>
        </div>
      </div>
    </Button>
  </motion.div>
);

// LINE通知設定コンポーネント
const LineNotificationSettings = ({ 
  isConnected, 
  loading, 
  onNavigateToLineConnect,
  onRefreshConnection 
}: {
  isConnected: boolean;
  loading: boolean;
  onNavigateToLineConnect: () => void;
  onRefreshConnection: () => void;
}) => (
  <motion.div
    whileHover={{ scale: 1.01 }}
    className="p-3 bg-white rounded-lg border border-gray-100 shadow-sm"
  >
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5 flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <Label className="text-sm font-medium">LINE通知</Label>
            {isConnected ? (
              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                接続済み
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-xs">
                未接続
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {isConnected 
              ? "LINEでお得情報を受信中です" 
              : "LINEでお得情報を受け取る"
            }
          </p>
        </div>
      </div>
      
      <div className="flex space-x-2">
        {isConnected ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshConnection}
            disabled={loading}
            className="text-green-600 border-green-200 hover:bg-green-50 text-xs px-3 py-1 flex-1"
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-3 w-3 mr-1"
              >
                ⟳
              </motion.div>
            ) : (
              <CheckCircle className="h-3 w-3 mr-1" />
            )}
            {loading ? '確認中...' : '接続状況を確認'}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateToLineConnect}
            className="text-green-600 border-green-200 hover:bg-green-500 hover:text-white text-xs px-3 py-1 flex-1"
          >
            <svg className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
            </svg>
            LINE設定へ
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
    </div>
  </motion.div>
);

function ProfilePageContent() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userPostsCount, setUserPostsCount] = useState(0);
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("memo");
  const [currentUserLevel, setCurrentUserLevel] = useState<any>(null);

  // LINE接続状況の管理
  const [isLineConnected, setIsLineConnected] = useState(false);
  const [checkingLineConnection, setCheckingLineConnection] = useState(false);

  useEffect(() => {
    // ProfileLayoutで認証確認済みなので、直接データフェッチ
    const fetchProfileAndPostsCount = async () => {
      if (!session?.user?.id) {
        console.warn('ProfilePageContent: No session user ID available');
        return;
      }

      try {
        setLoading(true);

        const { data: appProfileData, error: profileError } = await supabase
          .from('app_profiles')
          .select(
            '*, favorite_store_1_id, favorite_store_1_name, favorite_store_2_id, favorite_store_2_name, favorite_store_3_id, favorite_store_3_name, stripe_account_id, stripe_onboarding_completed, payout_enabled'
          )
          .eq('user_id', session.user.id)
          .single();

        if (profileError) {
          console.error('ProfilePageContent: Error fetching profile:', profileError);
          return;
        }

        if (appProfileData) {
          setProfile(appProfileData);

          // 投稿数のみを取得（リレーションシップの曖昧性を回避）
          const { count: postsCount, error: postsCountError } = await supabase
            .from('posts')
            .select('id', { count: 'exact' })
            .eq('app_profile_id', appProfileData.id);

          if (postsCountError) {
            console.error('ProfilePageContent: Error fetching posts count:', postsCountError);
          } else {
            setUserPostsCount(postsCount || 0);
          }

          // 総いいね数を取得してハンターレベルを計算
          const { data: likesData, error: likesError } = await supabase
            .from('post_likes')
            .select('post_id')
            .in('post_id', 
              await supabase
                .from('posts')
                .select('id')
                .eq('app_profile_id', appProfileData.id)
                .then(result => result.data?.map(post => post.id) || [])
            );

          if (!likesError && likesData) {
            const totalLikes = likesData.length;
            const level = getHunterLevel(totalLikes);
            setCurrentUserLevel(level);
          }
        }
      } catch (e) {
        console.error('ProfilePageContent: Unexpected error:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndPostsCount();
  }, [session?.user?.id]);

  // LINE接続状況の確認
  const checkLineConnection = async (showToast = false) => {
    try {
      setCheckingLineConnection(true);
      const response = await fetch('/api/line/check-connection');
      const data = await response.json();
      setIsLineConnected(data.isConnected);
      
      // showToastがtrueの場合のみトーストを表示
      if (showToast && data.isConnected) {
        toast({
          title: "LINE接続確認完了",
          description: "LINEアカウントが正常に接続されています。",
        });
      }
    } catch (error) {
      console.error('Error checking LINE connection:', error);
      // エラーの場合は常にトーストを表示
      if (showToast) {
        toast({
          title: "接続確認エラー",
          description: "LINE接続状況の確認に失敗しました。",
          variant: "destructive"
        });
      }
    } finally {
      setCheckingLineConnection(false);
    }
  };

  // 初回LINE接続状況確認（トーストなし）
  useEffect(() => {
    if (session?.user?.id) {
      checkLineConnection(false);
    }
  }, [session?.user?.id]);
  
  const handleLogout = async () => {
    await signOut({ redirect: false, callbackUrl: '/login' });
    router.push('/login');
  };

  // LINE設定ページへのナビゲーション
  const handleNavigateToLineConnect = () => {
    router.push('/line-connect');
  };

  // お気に入り店舗のフィルタリング
  const favoriteStores = profile ? [
    { id: profile.favorite_store_1_id, name: profile.favorite_store_1_name },
    { id: profile.favorite_store_2_id, name: profile.favorite_store_2_name },
    { id: profile.favorite_store_3_id, name: profile.favorite_store_3_name },
  ].filter(store => store.id && store.name) as { id: string; name: string }[] : [];

  if (loading) {
    return (
      <div 
        className="h-screen flex items-center justify-center" 
        style={{ 
          backgroundColor: '#73370c',
          height: 'calc(var(--mobile-vh, 100vh) - 120px)',
          minHeight: '400px'
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full"
        />
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div 
        className="h-screen flex items-center justify-center" 
        style={{ 
          backgroundColor: '#73370c',
          height: 'calc(var(--mobile-vh, 100vh) - 120px)',
          minHeight: '400px'
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <User className="h-16 w-16 mx-auto text-white/60 mb-4" />
          <p className="text-lg text-white">プロフィール情報を読み込めませんでした。</p>
        </motion.div>
      </div>
    );
  }
  
  return (
    <div 
      className="h-screen flex flex-col" 
      style={{ 
        backgroundColor: '#73370c',
        height: 'calc(var(--mobile-vh, 100vh) - 120px)',
        minHeight: '500px'
      }}
    >
      {/* プロフィールヘッダー - 上部固定 */}
      <div className="flex-shrink-0 relative overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundColor: '#73370c' }} />
        <div className="relative z-10 p-4 text-white">
          {/* ヘッダーアクション - 編集ボタンをプロフィール情報と同じ行に */}
          <div className="flex items-start justify-between mb-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ scale: 1.05 }}
              className="relative flex items-center space-x-4"
            >
              <Avatar className="h-16 w-16 relative z-10 border-3 border-white/30">
                {profile.avatar_url ? (
                  <AvatarImage
                    src={supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl}
                    alt={profile.display_name ?? 'User Avatar'}
                  />
                ) : (
                  <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                    {profile.display_name?.charAt(0).toUpperCase() ?? 'U'}
                  </AvatarFallback>
                )}
              </Avatar>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex-1 min-w-0"
              >
                <h1 className="text-xl font-bold mb-1 truncate">{profile.display_name}</h1>
                <p className="text-white/80 text-xs mb-1 truncate">{session?.user?.email}</p>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3 text-white/60" />
                  <span className="text-white/60 text-xs">
                    登録: {new Date(profile.updated_at || '').toLocaleDateString('ja-JP')}
                  </span>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/profile/edit')}
                className="bg-white/20 hover:bg-white/30 border border-white/30 text-white text-xs px-3 py-1.5"
              >
                <Edit className="h-3 w-3 mr-1" />
                編集
              </Button>
            </motion.div>
          </div>
          
          {/* 統計カード - よりコンパクトに */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={ShoppingBag}
              title="投稿数"
              value={userPostsCount}
              subtitle="これまでの投稿"
              gradient="bg-green-100"
              delay={0.4}
            />
            {/* 称号カードをランキング確認ボタンに置き換え */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="h-full"
            >
              <button
                onClick={() => router.push('/hunter-ranking')}
                className="w-full h-full bg-yellow-100 rounded-xl p-3 flex flex-col items-center justify-center text-center backdrop-blur-sm border border-white/30 shadow-md hover:shadow-lg transition-all duration-300 group hover:bg-yellow-200"
              >
                <div className="p-3 rounded-full bg-white/50 mb-2 group-hover:bg-white transition-colors">
                  <Trophy className="h-6 w-6 text-yellow-700" />
                </div>
                <p className="font-bold text-gray-800">ランキングを確認</p>
                <div className="flex items-center justify-center space-x-1 mt-1">
                  <p className="text-xs text-gray-600">称号と順位を見る</p>
                  <ExternalLink className="h-3 w-3 text-gray-500" />
                </div>
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* タブナビゲーション - 中央固定 */}
      <div className="flex-shrink-0 bg-white/95 backdrop-blur-md border-b border-gray-200/50">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-4 py-2">
            <TabsList className="grid w-full grid-cols-3 bg-gray-50 h-10">
              <TabsTrigger 
                value="memo"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-300 text-base"
              >
                <NotebookText className="h-3 w-3 mr-1" />
                メモ機能
              </TabsTrigger>
              <TabsTrigger 
                value="favorites"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-300 text-base"
              >
                <Heart className="h-3 w-3 mr-1" />
                お気に入り
              </TabsTrigger>
              <TabsTrigger 
                value="settings"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-300 text-base"
              >
                <Settings className="h-3 w-3 mr-1" />
                設定
              </TabsTrigger>
            </TabsList>
          </div>

          {/* メインコンテンツエリア - スクロール可能 */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            {/* メモ機能タブ */}
            <TabsContent value="memo" className="m-0 h-full">
              <div className="h-full flex items-center justify-center p-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="text-center"
                >
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center">
                    <NotebookText className="h-8 w-8 text-green-500" />
                  </div>
                  
                  <p className="text-gray-600 mb-4 text-sm max-w-xs mx-auto">
                    買い忘れ防止に役立つ、<br />シンプルで使いやすい機能です
                  </p>
                  <Button
                    onClick={() => router.push('/memo')}
                    className="text-white shadow-md hover:shadow-lg transition-all duration-300"
                    style={{ backgroundColor: '#c96342' }}
                    size="sm"
                  >
                    メモ機能を使ってみる
                  </Button>
                </motion.div>
              </div>
            </TabsContent>
            
            {/* お気に入りタブ */}
            <TabsContent value="favorites" className="m-0 h-full">
              <div className="h-full overflow-y-auto p-4 space-y-4 custom-scrollbar">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between"
                >
                  <h2 className="text-lg font-bold text-gray-900">お気に入り店舗</h2>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">
                    {favoriteStores.length}/3 店舗
                  </Badge>
                </motion.div>

                {favoriteStores.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {favoriteStores.map((store, index) => (
                      <FavoriteStoreCard key={store.id} store={store} index={index} />
                    ))}
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="text-center py-8"
                  >
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-pink-100 to-red-100 rounded-full flex items-center justify-center">
                      <Heart className="h-8 w-8 text-pink-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">お気に入り店舗がありません</h3>
                    <p className="text-gray-500 mb-4 text-sm">よく利用する店舗を追加しましょう</p>
                    <Button 
                      variant="outline" 
                      onClick={() => router.push('/profile/edit')}
                      className="border-orange-200 hover:bg-orange-50 text-orange-600 text-sm"
                      size="sm"
                    >
                      <Heart className="h-3 w-3 mr-1" />
                      プロフィール編集
                    </Button>
                  </motion.div>
                )}
              </div>
            </TabsContent>
            
            {/* 設定タブ */}
            <TabsContent value="settings" className="m-0 h-full">
              <div className="h-full overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {/* 通知設定セクション */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-2"
                >
                  <h3 className="text-base font-bold text-gray-900 flex items-center mb-2">
                    <Bell className="h-4 w-4 mr-2 text-orange-600" />
                    通知設定
                  </h3>
                  
                  <LineNotificationSettings
                    isConnected={isLineConnected}
                    loading={checkingLineConnection}
                    onNavigateToLineConnect={handleNavigateToLineConnect}
                    onRefreshConnection={() => checkLineConnection(true)}
                  />
                </motion.div>
                
                <Separator className="my-3" />
                
                {/* アカウント設定セクション */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-2"
                >
                  <h3 className="text-base font-bold text-gray-900 flex items-center mb-2">
                    <User className="h-4 w-4 mr-2 text-amber-600" />
                    アカウント
                  </h3>
                  
                  <div className="space-y-2">
                    <SettingItem
                      icon={Settings}
                      title="アカウント設定"
                      description="プロフィール情報とお気に入り店舗の管理"
                      action={() => router.push('/profile/edit')}
                    />
                    
                    <SettingItem
                      icon={LogOut}
                      title="ログアウト"
                      description="アカウントからログアウトします"
                      action={handleLogout}
                      variant="danger"
                    />
                  </div>
                </motion.div>

                {/* おすそわけ設定セクション */}
                {profile?.stripe_account_id && (
                  <>
                    <Separator className="my-3" />
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="space-y-2 "
                    >
                      <h3 className="text-base font-bold text-gray-900 flex items-center mb-2">
                        <CreditCard className="h-4 w-4 mr-2 text-green-600" />
                        おすそわけ設定
                      </h3>
                      
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        className="p-3 bg-white rounded-lg border border-gray-100 shadow-sm"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <Label className="text-sm font-medium">Stripeアカウント</Label>
                                <Badge 
                                  variant="secondary" 
                                  className={cn(
                                    "text-xs",
                                    profile.stripe_onboarding_completed 
                                      ? "bg-green-100 text-green-800" 
                                      : "bg-yellow-100 text-yellow-800"
                                  )}
                                >
                                  {profile.stripe_onboarding_completed ? (
                                    <>
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      設定完了
                                    </>
                                  ) : (
                                    <>
                                      <Info className="h-3 w-3 mr-1" />
                                      設定中
                                    </>
                                  )}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-500">
                                {profile.stripe_onboarding_completed 
                                  ? "おすそわけの受け取り設定が完了しています" 
                                  : "おすそわけの受け取り設定を完了してください"
                                }
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push('/profile/stripe-setup')}
                              className="text-green-600 border-green-200 hover:bg-green-50 text-xs px-3 py-1 flex-1"
                            >
                              <Settings className="h-3 w-3 mr-1" />
                              設定確認
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push('/profile/stripe-account-management')}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs px-3 py-1 flex-1"
                            >
                              <User className="h-3 w-3 mr-1" />
                              アカウント管理
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  </>
                )}
                
                <div className="h-6" />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProfilePageContent />
  );
}