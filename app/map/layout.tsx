"use client";

import { ReactNode, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useNotification } from '@/contexts/NotificationContext';
import { Clock, MapPin, PlusCircle, User, ShoppingBag, Newspaper } from 'lucide-react';
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface MapLayoutProps {
  children: ReactNode;
}

// ナビゲーションアイテム
const navItems = [
  {
    name: "掲示板",
    href: "/timeline",
    icon: Newspaper,
  },
  {
    name: "お店を探す",
    href: "/map",
    icon: MapPin,
  },
  {
    name: "買い物メモ",
    href: "/memo",
    icon: ShoppingBag,
  },
  {
    name: "マイページ",
    href: "/profile",
    icon: User,
  },
];

export default function MapLayout({ children }: MapLayoutProps) {
  const pathname = usePathname();
  const { unreadCount, isLoading } = useNotification();
  
  const [layoutDimensions, setLayoutDimensions] = useState({
    viewportHeight: 0,
    headerHeight: 56,
    navHeight: 64,
    contentHeight: 0
  });

  // ビューポート高さの正確な計算
  const calculateViewportHeight = () => {
    if (typeof window === 'undefined') return 0;
    
    // iPhone Safari対応: visual viewportがある場合はそれを使用
    const windowHeight = window.innerHeight;
    const visualViewportHeight = window.visualViewport?.height || windowHeight;
    
    // より正確な高さを取得
    const actualHeight = Math.min(windowHeight, visualViewportHeight);
    
    console.log('MapLayout: Viewport calculation:', {
      windowHeight,
      visualViewportHeight,
      actualHeight,
      isMobile: window.innerWidth <= 768
    });
    
    return actualHeight;
  };

  // レイアウト寸法の更新
  const updateLayoutDimensions = () => {
    const viewportHeight = calculateViewportHeight();
    const headerHeight = 56; // AppHeaderの固定高さ
    const navHeight = 64;    // MainNavの固定高さ
    const contentHeight = Math.max(300, viewportHeight - headerHeight - navHeight);
    
    setLayoutDimensions({
      viewportHeight,
      headerHeight,
      navHeight,
      contentHeight
    });

    // CSS変数を直接設定（他のレイアウトとの競合を避けるため）
    document.documentElement.style.setProperty('--map-viewport-height', `${viewportHeight}px`);
    document.documentElement.style.setProperty('--map-content-height', `${contentHeight}px`);
    
    console.log('MapLayout: Layout dimensions updated:', {
      viewportHeight,
      headerHeight,
      navHeight,
      contentHeight
    });
    
    return contentHeight > 0;
  };

  // 初期化とリサイズハンドリング
  useEffect(() => {
    console.log('MapLayout: Initializing map layout');
    
    // ページ用の専用クラスを設定
    document.body.classList.add('map-page-active');
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    // 初期寸法計算
    updateLayoutDimensions();
    
    // CLS対策：初期レイアウト設定を一度だけ実行
    let timeoutId: NodeJS.Timeout;
    const scheduleUpdate = (delay: number) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (updateLayoutDimensions()) {
          // 成功した場合は追加の更新をスキップ
          return;
        }
        // 失敗した場合のみ再試行
        if (delay < 1000) {
          scheduleUpdate(delay * 2);
        }
      }, delay);
    };
    
    scheduleUpdate(100);

    // リサイズハンドラー
    const handleResize = () => {
      setTimeout(updateLayoutDimensions, 50);
    };

    const handleOrientationChange = () => {
      setTimeout(() => {
        updateLayoutDimensions();
      }, 200);
    };

    // イベントリスナー登録
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleOrientationChange, { passive: true });
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize, { passive: true });
    }

    return () => {
      // クリーンアップ
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
      
      // ページ離脱時の復元
      document.body.classList.remove('map-page-active');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, []);

  // ナビゲーションのクリックハンドラー
  const handlePostClick = (e: React.MouseEvent) => {
    // 必要に応じてログイン状態チェックなどを追加
  };

  return (
    <>
      {/* メインレイアウト */}
      <div 
        className="map-layout-container"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f5f5f5',
          overflow: 'hidden'
        }}
      >
        {/* ヘッダー (AppHeaderの機能を統合) */}
        <div 
          style={{
            flexShrink: 0,
            height: `${layoutDimensions.headerHeight}px`,
            zIndex: 50
          }}
        >
          <header className="bg-background border-b border-border">
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
              </div>
              
              <h1 className="font-bold text-3xl text-center">お店を探す</h1>
              
              <div className="absolute right-4 flex items-center space-x-2">
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
        </div>
        
        {/* メインコンテンツ */}
        <div 
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            height: `${layoutDimensions.contentHeight}px`,
            minHeight: '300px'
          }}
        >
          <div 
            style={{
              width: '100%',
              height: '100%',
              position: 'relative'
            }}
          >
            {children}
          </div>
        </div>
        
        {/* ナビゲーション (MainNavの機能を統合) */}
        <div 
          style={{
            flexShrink: 0,
            height: `${layoutDimensions.navHeight}px`,
            zIndex: 50
          }}
        >
          <nav className="bg-background border-t border-border pb-safe">
            <div className="flex justify-around items-center h-16">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={item.href === '/post' ? handlePostClick : undefined}
                    className={cn(
                      "flex flex-col items-center justify-center w-full h-full relative",
                      "transition-colors duration-200",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <div className="relative">
                      <item.icon className="h-6 w-6" />
                      {isActive && (
                        <motion.div
                          layoutId="navIndicator"
                          className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
                          transition={{ duration: 0.3 }}
                        />
                      )}
                    </div>
                    <span className="text-xs mt-1">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}