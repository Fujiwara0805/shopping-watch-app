"use client";

import { ReactNode, useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { MainNav } from '@/components/layout/main-nav';
import { AppHeader } from '@/components/layout/app-header';

interface AppLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showNav?: boolean;
}

export default function AppLayout({ 
  children, 
  showHeader = true, 
  showNav = true 
}: AppLayoutProps) {
  const pathname = usePathname();
  
  // 地図ページかどうかを判定
  const isMapPage = pathname === '/map';
  
  // スマートフォン環境の検出
  const getIsMobile = (): boolean => {
    if (typeof window === 'undefined') return false;
    
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isMobileWidth = window.innerWidth <= 768;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    return isMobileUserAgent || (isMobileWidth && isTouchDevice);
  };

  // bodyクラスの設定とviewport height の設定
  useEffect(() => {
    // 地図ページの場合、bodyに map-page クラスを追加
    if (isMapPage) {
      document.body.classList.add('map-page');
    } else {
      document.body.classList.remove('map-page');
    }

    const updateViewportHeight = () => {
      const isMobile = getIsMobile();
      const currentHeight = window.innerHeight;
      
      // 基本のCSS変数を設定
      const vh = currentHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      
      if (isMobile) {
        const visualViewportHeight = window.visualViewport?.height || currentHeight;
        const actualHeight = Math.min(currentHeight, visualViewportHeight);
        
        document.documentElement.style.setProperty('--actual-vh', `${actualHeight}px`);
        document.documentElement.style.setProperty('--mobile-vh', `${actualHeight}px`);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('AppLayout: Mobile viewport:', {
            isMapPage,
            currentHeight,
            visualViewportHeight,
            actualHeight
          });
        }
      } else {
        document.documentElement.style.setProperty('--actual-vh', `${currentHeight}px`);
        document.documentElement.style.setProperty('--mobile-vh', `${currentHeight}px`);
      }
    };

    updateViewportHeight();

    // 地図ページの場合のみ、複数回実行
    if (isMapPage) {
      const timeouts = [
        setTimeout(updateViewportHeight, 100),
        setTimeout(updateViewportHeight, 500),
      ];

      const handleResize = () => {
        setTimeout(updateViewportHeight, 50);
      };
      
      const handleOrientationChange = () => {
        setTimeout(updateViewportHeight, 200);
      };

      window.addEventListener('resize', handleResize, { passive: true });
      window.addEventListener('orientationchange', handleOrientationChange, { passive: true });
      
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleResize, { passive: true });
      }

      return () => {
        timeouts.forEach(clearTimeout);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleOrientationChange);
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', handleResize);
        }
      };
    }

    // クリーンアップ（ページ離脱時にクラスを削除）
    return () => {
      if (isMapPage) {
        document.body.classList.remove('map-page');
      }
    };
  }, [isMapPage]);
  
  // For page transitions
  const variants = {
    hidden: { opacity: 0, x: 0, y: 20 },
    enter: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, x: 0, y: 20 },
  };

  // 地図ページ専用のスタイル
  if (isMapPage) {
    return (
      <div 
        className="flex flex-col bg-background"
        style={{ 
          minHeight: 'calc(var(--mobile-vh, 100vh))',
          height: 'calc(var(--mobile-vh, 100vh))',
          maxHeight: 'calc(var(--mobile-vh, 100vh))',
          overflow: 'hidden'
        }}
      >
        {showHeader && <AppHeader />}
        
        <main 
          className="flex-1 relative"
          style={{
            overflow: 'hidden',
            height: showHeader 
              ? 'calc(var(--mobile-vh, 100vh) - 56px)'
              : 'calc(var(--mobile-vh, 100vh))'
          }}
        >
          <motion.div
            key={pathname}
            initial="hidden"
            animate="enter"
            exit="exit"
            variants={variants}
            transition={{ duration: 0.3, type: 'tween' }}
            className="absolute inset-0 flex flex-col overflow-hidden"
            style={{
              paddingBottom: showNav ? '64px' : '0px'
            }}
          >
            <div 
              className="flex-1"
              style={{
                overflow: 'hidden',
                height: '100%'
              }}
            >
              {children}
            </div>
          </motion.div>
        </main>
        
        {showNav && <MainNav />}
      </div>
    );
  }

  // 通常のページのスタイル（スクロール可能）
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {showHeader && (
        <div className="sticky top-0 z-50">
          <AppHeader />
        </div>
      )}
      
      <main className="flex-1">
        <motion.div
          key={pathname}
          initial="hidden"
          animate="enter"
          exit="exit"
          variants={variants}
          transition={{ duration: 0.3, type: 'tween' }}
          className="min-h-full"
          style={{
            paddingBottom: showNav ? '80px' : '16px' // ナビゲーション分のパディング
          }}
        >
          {children}
        </motion.div>
      </main>
      
      {showNav && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <MainNav />
        </div>
      )}
    </div>
  );
}