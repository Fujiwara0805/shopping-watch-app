"use client";

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common/logo';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useNotification } from '@/contexts/NotificationContext';
import { useEffect, useState } from 'react';

export function AppHeader() {
  const pathname = usePathname();
  const { unreadCount, isLoading } = useNotification();
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
  
  // Get page title based on current path
  const getPageTitle = () => {
    switch (pathname) {
      case '/timeline':
        return isMobile ? 'おとく板' : 'トクドク掲示板サービス';
      case '/map':
        return 'お店を探す';
      case '/post':
        return '新規投稿';
      case '/profile':
        return 'マイページ';
      case '/profile/edit':
        return 'プロフィール編集';
      case '/profile/setup':
        return 'プロフィール作成';
      case '/notifications':
        return '通知';
      case '/contact':
        return 'お問い合わせ';
      case '/family-group':
        return 'グループ管理';
      case '/family-group/join/[token]':
        return '招待状';
      case '/family-group/shopping':
        return '共有メモ';
      case '/memo':
        return '買い物メモ';
      case '/flyers':
        return 'チラシ・広告';
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
      case '/hunter-ranking':
        return 'ランキング';
      default:
        return '';
    }
  };
  
  const showLogo = false;
  const title = getPageTitle();

  return (
    <header className="sticky top-0 z-10 bg-background border-b border-border">
      <motion.div 
        className="h-14 px-4 flex items-center justify-center relative"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="absolute left-4 flex items-center">
          <Link href="/timeline">
            <img src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png" alt="App Icon" className="h-12 w-12 object-contain" />
          </Link>
          {showLogo && <Logo withText size="small" />}
        </div>
        
        {!showLogo && title && (
          <h1 className="font-bold text-3xl text-center">{title}</h1>
        )}
        
        {/* PC版では通知アイコンを非表示 */}
        <div className={`absolute right-4 flex items-center space-x-2 ${!isMobile ? 'hidden' : ''}`}>
          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link href="/notifications">
              <Bell className="h-8 w-8" />
              {!isLoading && unreadCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  className="absolute -top-1 -right-1"
                >
                  <Badge 
                    variant="destructive"
                    className="px-1.5 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center text-xs"
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