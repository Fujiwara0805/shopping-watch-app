"use client";

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common/logo';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useNotification } from '@/contexts/NotificationContext';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabaseClient';

// 🎨 LPカラーパレット
const COLORS = {
  primary: '#8b6914',      // ゴールドブラウン
  primaryDark: '#3d2914',  // ダークブラウン
  secondary: '#5c3a21',    // ミディアムブラウン
  background: '#f5e6d3',   // ベージュ
  surface: '#fff8f0',      // オフホワイト
  cream: '#ffecd2',        // クリーム
  border: '#d4c4a8',       // ライトベージュ
};

export function AppHeader() {
  const pathname = usePathname();
  const { unreadCount, isLoading } = useNotification();
  const { data: session } = useSession();
  const [isMobile, setIsMobile] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  
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

  // ユーザーの役割を取得
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!session?.user?.id) {
        setUserRole(null);
        return;
      }

      try {
        const { data: userData, error } = await supabase
          .from('app_users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (!error && userData) {
          setUserRole(userData.role);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };

    fetchUserRole();
  }, [session?.user?.id]);
  
  // Get page title based on current path
  const getPageTitle = () => {
    // 動的ルートのチェック（先にチェックする必要がある）
    if (pathname.startsWith('/my-maps/edit/')) {
      return 'My Map編集';
    }
    
    switch (pathname) {
      case '/post':
        return '新規投稿';
      case '/events':
        return 'イベント一覧';
      case '/create-map':
        return 'My Map 作成';
      case '/my-maps':
        return 'My Map 画面';
      case '/public-maps':
        return 'My Map 一覧';
      case '/profile':
        return 'マイページ';
      case '/profile/edit':
        return 'プロフィール編集';
      case '/profile/setup':
        return 'プロフィール作成';
      case '/line-connect':
        return 'LINE通知設定';
      case '/notifications':
        return '通知';
      case '/contactm':
        return 'お問い合わせ';
      case '/memo':
        return 'メモ';
      case '/train-schedule':
        return '時刻表';
      case '/terms':
        return '利用規約一覧';
      case '/terms/terms-of-service':
        return '利用規約';
      case '/terms/privacy-policy':
        return 'ポリシー関連';
      case '/terms/service-policy':
        return 'ポリシー関連';
      case '/settings':
        return '設定';
      case '/release-notes':
        return 'リリースノート';
      case '/ads/new':
        return '広告作成';
      default:
        return '';
    }
  };
  
  const showLogo = false;
  const title = getPageTitle();

  return (
    <header 
      className="sticky top-0 z-10 border-b"
      style={{ 
        backgroundColor: COLORS.background, 
        borderColor: COLORS.border 
      }}
    >
      <motion.div 
        className="h-14 px-4 flex items-center justify-center relative"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="absolute left-4 flex items-center">
          <Link href="/">
            <img src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png" alt="App Icon" className="h-12 w-12 object-contain" />
          </Link>
          {showLogo && <Logo withText size="small" />}
        </div>
        
        {!showLogo && title && (
          <h1 
            className="font-bold text-2xl text-center"
            style={{ 
              color: COLORS.primaryDark,
              fontFamily: "'Noto Serif JP', serif"
            }}
          >
            {title}
          </h1>
        )}
        
        {/* 右側のアイコン（通知） */}
        <div className={`absolute right-4 flex items-center space-x-2 ${!isMobile ? 'hidden' : ''}`}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative hover:bg-[#ffecd2]" 
            asChild
          >
            <Link href="/notifications">
              <Bell className="h-7 w-7" style={{ color: COLORS.secondary }} />
              {!isLoading && unreadCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  className="absolute -top-1 -right-1"
                >
                  <Badge 
                    className="px-1.5 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center text-xs text-white"
                    style={{ backgroundColor: '#8b2323' }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                </motion.div>
              )}
            </Link>
          </Button>
        </div>
      </motion.div>
    </header>
  );
}