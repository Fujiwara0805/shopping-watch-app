"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bell, LogOut, Settings, Edit,  Store as StoreIcon, Calendar,  User, CheckCircle,  ArrowRight, Trophy, Compass, ShoppingBag, Megaphone, Trash2 } from 'lucide-react';

import { COLORS } from '@/lib/constants/colors';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useSession, signOut } from 'next-auth/react';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/hooks/use-toast';
import { getHunterLevel } from '@/lib/constants/hunter-levels';
import { StampBoardModal } from '@/components/stamp-board/stamp-board-modal';
import { getProfilePageData } from '@/app/_actions/profiles';
import { Breadcrumb } from '@/components/seo/breadcrumb';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface AppProfile {
  id: string;
  user_id: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  updated_at?: string;
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
        <Icon className="h-4 w-4" style={{ color: COLORS.textPrimary }} />
      </div>
      <div className="text-3xl font-bold mb-1 min-h-8 flex items-center justify-center" style={{ color: COLORS.textPrimary }}>{value}</div>
      <p className="text-xs font-medium" style={{ color: COLORS.textSecondary }}>{title}</p>
      {subtitle && <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>{subtitle}</p>}
    </div>
  </motion.div>
);



// 設定アイテム
const SettingItem = ({ icon: Icon, title, description, action, variant = "default", loading = false }: {
  icon: any;
  title: string;
  description: string;
  action: () => void;
  variant?: "default" | "danger";
  loading?: boolean;
}) => (
  <motion.div
    whileHover={{ x: 3 }}
    whileTap={{ scale: 0.98 }}
    className="group"
  >
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start p-3 h-auto rounded-lg border",
        "hover:shadow-sm transition-all duration-300",
        "bg-white",
        variant === "danger" && "hover:bg-red-50 hover:border-red-200"
      )}
      onClick={action}
      disabled={loading}
    >
      <div className="flex items-center space-x-3 w-full">
        <div className={cn(
          "w-8 h-8 rounded-md flex items-center justify-center",
          variant === "default" 
            ? "text-white" 
            : "bg-gradient-to-br from-red-500 to-pink-600 text-white"
        )} style={variant === "default" ? { backgroundColor: COLORS.primary } : {}}>
          {loading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="h-4 w-4"
            >
              ⟳
            </motion.div>
          ) : (
            <Icon className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className={cn(
            "font-medium text-sm group-hover:translate-x-1 transition-transform duration-200",
            variant === "danger" && "text-red-600"
          )}>
            {loading ? (variant === "danger" ? "ログアウト中..." : "読み込み中...") : title}
          </p>
          <p className="text-xs truncate" style={{ color: COLORS.textMuted }}>{description}</p>
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
    className="p-3 bg-white rounded-lg border shadow-sm"
    style={{ borderColor: COLORS.border }}
  >
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5 flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <Label className="text-sm font-medium">LINE通知</Label>
            {isConnected ? (
              <Badge variant="secondary" className="text-xs" style={{ backgroundColor: `${COLORS.success}20`, color: COLORS.success }}>
                <CheckCircle className="h-3 w-3 mr-1" />
                接続済み
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs" style={{ backgroundColor: COLORS.border, color: COLORS.textSecondary }}>
                未接続
              </Badge>
            )}
          </div>
          <p className="text-xs" style={{ color: COLORS.textMuted }}>
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
            className="text-xs px-3 py-1 flex-1"
            style={{ color: COLORS.success, borderColor: COLORS.success }}
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
            className="text-xs px-3 py-1 flex-1"
            style={{ color: COLORS.success, borderColor: COLORS.success }}
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
  const [currentUserLevel, setCurrentUserLevel] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // LINE接続状況の管理
  const [isLineConnected, setIsLineConnected] = useState(false);
  const [checkingLineConnection, setCheckingLineConnection] = useState(false);
  
  // ボタンローディング状態の管理
  const [accountSettingsLoading, setAccountSettingsLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  
  // アカウント削除確認ダイアログ
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // スタンプボードモーダルの管理
  const [stampBoardOpen, setStampBoardOpen] = useState(false);

  // PWA viewport height fix
  const [viewportHeight, setViewportHeight] = useState('100vh');

  useEffect(() => {
    const updateViewportHeight = () => {
      // 実際のビューポートの高さを取得
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      setViewportHeight(`${window.innerHeight}px`);
    };

    // 初回設定
    updateViewportHeight();

    // リサイズイベント
    window.addEventListener('resize', updateViewportHeight);
    
    // iOS Safari対応：orientationchange、focus、blur イベント
    window.addEventListener('orientationchange', updateViewportHeight);
    window.addEventListener('focus', updateViewportHeight);
    window.addEventListener('blur', updateViewportHeight);
    
    // PWA対応：visibilitychange イベント
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // アプリがフォアグラウンドに戻った時
        setTimeout(updateViewportHeight, 100);
      }
    });

    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('orientationchange', updateViewportHeight);
      window.removeEventListener('focus', updateViewportHeight);
      window.removeEventListener('blur', updateViewportHeight);
    };
  }, []);

  useEffect(() => {
    // ProfileLayoutで認証確認済みなので、直接データフェッチ
    const fetchProfileAndPostsCount = async () => {
      if (!session?.user?.id) {
        console.warn('ProfilePageContent: No session user ID available');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // 🔥 Server Actionを使用してプロフィールデータを取得
        const { data, error } = await getProfilePageData(session.user.id);

        if (error || !data) {
          console.error('ProfilePageContent: Error fetching profile:', error);
          setLoading(false);
          return;
        }

        setUserRole(data.role);
        setProfile(data.profile);
        setUserPostsCount(data.postsCount);

        // ハンターレベルを計算（投稿数ベース）
        const level = getHunterLevel(data.postsCount);
        setCurrentUserLevel(level);
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
    setLogoutLoading(true);
    try {
      await signOut({ redirect: false, callbackUrl: '/login' });
      router.push('/login');
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleNavigateToAccountSettings = async () => {
    setAccountSettingsLoading(true);
    try {
      router.push('/profile/edit');
    } finally {
      // ページ遷移後にローディングを解除
      setTimeout(() => setAccountSettingsLoading(false), 100);
    }
  };

  // LINE設定ページへのナビゲーション
  const handleNavigateToLineConnect = () => {
    router.push('/line-connect');
  };

  // アカウント削除確認ダイアログを開く（警告表示）
  const handleOpenDeleteAccountDialog = () => {
    setDeleteDialogOpen(true);
    toast({
      title: '注意',
      description: 'アカウントを削除すると、すべてのデータが復元できません。',
      variant: 'destructive',
    });
  };

  // アカウント削除を実行（OK許可後）
  const handleConfirmDeleteAccount = async () => {
    setDeleteAccountLoading(true);
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: '削除に失敗しました',
          description: data.error || 'しばらく経ってからお試しください。',
          variant: 'destructive',
        });
        setDeleteDialogOpen(false);
        return;
      }
      setDeleteDialogOpen(false);
      await signOut({ redirect: false, callbackUrl: '/' });
      router.push('/');
    } catch (e) {
      console.error('Account delete error:', e);
      toast({
        title: '削除に失敗しました',
        description: '予期せぬエラーが発生しました。',
        variant: 'destructive',
      });
      setDeleteDialogOpen(false);
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  // プロフィール情報がない場合はログイン画面へ遷移
  useEffect(() => {
    if (!loading && !profile) {
      router.push('/login');
    }
  }, [loading, profile, router]);

  if (loading) {
    return (
      <div 
        className="h-screen flex items-center justify-center" 
        style={{ 
          backgroundColor: COLORS.background,
          height: `calc(${viewportHeight} - 120px)`,
          minHeight: '400px'
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Compass className="h-12 w-12" style={{ color: COLORS.primary }} />
        </motion.div>
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div 
        className="h-screen flex items-center justify-center" 
        style={{ 
          backgroundColor: COLORS.background,
          height: `calc(${viewportHeight} - 120px)`,
          minHeight: '400px'
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <User className="h-16 w-16 mx-auto mb-4" style={{ color: `${COLORS.primary}80` }} />
          <p className="text-lg" style={{ color: COLORS.secondary }}>ログイン画面へ遷移します...</p>
        </motion.div>
      </div>
    );
  }
  
  return (
    <div 
      className="h-screen flex flex-col" 
      style={{ 
        backgroundColor: COLORS.background,
        height: `${viewportHeight}`, // 🔥 120pxの引き算を削除
        minHeight: '500px'
      }}
    >
      {/* パンくずリスト */}
      <div className="px-4 pt-3">
        <Breadcrumb />
      </div>
      
      {/* プロフィールヘッダー - 上部固定 */}
      <div className="flex-shrink-0 relative overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundColor: COLORS.secondary }} />
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
                  <AvatarFallback className="text-lg font-bold text-white" style={{ backgroundColor: COLORS.primary }}>
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
        </div>
      </div>

      {/* メインコンテンツエリア - スクロール可能 */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <div className="h-full overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {/* 通知設定セクション */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-2"
          >
            <h3 className="text-lg font-bold flex items-center mb-2" style={{ color: COLORS.textPrimary, fontFamily: "'Noto Serif JP', serif" }}>
              <Bell className="h-5 w-5 mr-2" style={{ color: COLORS.primary }} />
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
            <h3 className="text-lg font-bold flex items-center mb-2" style={{ color: COLORS.textPrimary, fontFamily: "'Noto Serif JP', serif" }}>
              <User className="h-5 w-5 mr-2" style={{ color: COLORS.primary }} />
              アカウント設定
            </h3>
            
            <div className="space-y-2">
              {/* 🎫 スタンプボードボタン */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group"
              >
                <Button
                  variant="ghost"
                  className="w-full justify-start p-3 h-auto rounded-lg border hover:shadow-sm transition-all duration-300"
                  style={{ borderColor: COLORS.border, backgroundColor: `${COLORS.cream}20` }}
                  onClick={() => setStampBoardOpen(true)}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: COLORS.primary }}>
                      <Trophy className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-sm group-hover:translate-x-1 transition-transform duration-200" style={{ color: COLORS.primary }}>
                        スタンプボード
                      </p>
                      <p className="text-xs truncate" style={{ color: COLORS.textSecondary }}>チェックインスタンプを確認</p>
                    </div>
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" style={{ color: COLORS.primary }} />
                  </div>
                </Button>
              </motion.div>

              {/* 🔥 adminユーザーの場合は投稿ボタンと広告作成ボタンを表示 */}
              {userRole === 'admin' && (
                <>
                  <SettingItem
                    icon={Edit}
                    title="投稿する"
                    description="新しいイベント情報を投稿"
                    action={() => router.push('/post')}
                  />
                  <SettingItem
                    icon={Megaphone}
                    title="広告を作成"
                    description="新しい広告を登録・管理"
                    action={() => router.push('/ads/new')}
                  />
                </>
              )}
              
              <SettingItem
                icon={Settings}
                title="アカウント設定"
                description="プロフィール情報とリンク設定の管理"
                action={handleNavigateToAccountSettings}
                loading={accountSettingsLoading}
              />
              
              <SettingItem
                icon={LogOut}
                title="ログアウト"
                description="アカウントからログアウトします"
                action={handleLogout}
                variant="danger"
                loading={logoutLoading}
              />
              
              <SettingItem
                icon={Trash2}
                title="アカウント削除"
                description="アカウントとデータを完全に削除します"
                action={handleOpenDeleteAccountDialog}
                variant="danger"
              />
            </div>
          </motion.div>
          
          {/* 🔥 下部に余白を追加（マップボタンのための余白） */}
          <div className="h-24" />
        </div>
      </div>

      {/* 右下のボタングループ（マップとメモ） */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {/* メモボタン */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="flex flex-col items-center"
        >
          <Button
            onClick={() => router.push('/memo')}
            size="icon"
            className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl shadow-lg flex flex-col items-center justify-center gap-1"
            style={{ backgroundColor: COLORS.secondary }}
          >
            <ShoppingBag className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: '#fff' }} />
            <span className="text-xs font-medium text-white">メモ</span>
          </Button>
        </motion.div>
        
        {/* マップボタン（羅針盤アイコン） */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05, boxShadow: `0 10px 30px ${COLORS.primary}40` }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex flex-col items-center"
        >
          <Button
            onClick={() => router.push('/map')}
            size="icon"
            className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl shadow-lg flex flex-col items-center justify-center gap-1"
            style={{ backgroundColor: COLORS.primary }}
          >
            <Compass className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: '#fff' }} />
            <span className="text-xs font-medium text-white">マップ</span>
          </Button>
        </motion.div>
      </div>

      {/* スタンプボードモーダル */}
      <StampBoardModal
        isOpen={stampBoardOpen}
        onClose={() => setStampBoardOpen(false)}
      />

      {/* アカウント削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">アカウント削除の確認</DialogTitle>
            <DialogDescription>
              アカウントを削除すると、プロフィール・コース・投稿などすべてのデータが完全に削除され、復元できません。この操作は取り消せません。よろしいですか？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteAccountLoading}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteAccount}
              disabled={deleteAccountLoading}
            >
              {deleteAccountLoading ? '削除中...' : 'OK（削除する）'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProfilePageContent />
  );
}