"use client";

import { ReactNode, useEffect, useRef } from 'react';
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
  
  // スマートフォン環境の検出
  const getIsMobile = (): boolean => {
    if (typeof window === 'undefined') return false;
    
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isMobileWidth = window.innerWidth <= 768;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    return isMobileUserAgent || (isMobileWidth && isTouchDevice);
  };

  // スマートフォン向けの viewport height 設定
  useEffect(() => {
    const updateViewportHeight = () => {
      const isMobile = getIsMobile();
      const currentHeight = window.innerHeight;
      
      // CSS変数を設定
      const vh = currentHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      
      if (isMobile) {
        // スマートフォンの場合、より保守的なアプローチ
        const visualViewportHeight = window.visualViewport?.height || currentHeight;
        const actualHeight = Math.min(currentHeight, visualViewportHeight);
        
        // スマートフォン用の実際の高さを設定
        document.documentElement.style.setProperty('--actual-vh', `${actualHeight}px`);
        document.documentElement.style.setProperty('--mobile-vh', `${actualHeight}px`);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('AppLayout: Mobile viewport:', {
            currentHeight,
            visualViewportHeight,
            actualHeight,
            userAgent: navigator.userAgent.substring(0, 50)
          });
        }
      } else {
        // デスクトップの場合
        document.documentElement.style.setProperty('--actual-vh', `${currentHeight}px`);
        document.documentElement.style.setProperty('--mobile-vh', `${currentHeight}px`);
      }
    };

    // 初期設定
    updateViewportHeight();

    // 複数のタイミングで実行（スマートフォンの安定性向上）
    const timeouts = [
      setTimeout(updateViewportHeight, 100),
      setTimeout(updateViewportHeight, 500),
    ];

    // イベントリスナー
    const handleResize = () => {
      setTimeout(updateViewportHeight, 50);
    };
    
    const handleOrientationChange = () => {
      setTimeout(updateViewportHeight, 200);
    };

    const handleVisualViewportChange = () => {
      setTimeout(updateViewportHeight, 50);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleOrientationChange, { passive: true });
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange, { passive: true });
    }

    return () => {
      timeouts.forEach(clearTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
      }
    };
  }, []);
  
  // For page transitions
  const variants = {
    hidden: { opacity: 0, x: 0, y: 20 },
    enter: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, x: 0, y: 20 },
  };

  return (
    <div 
      className="flex flex-col bg-background"
      style={{ 
        // スマートフォンに最適化された高さ設定
        minHeight: 'calc(var(--mobile-vh, 100vh))',
        height: 'calc(var(--mobile-vh, 100vh))',
        maxHeight: 'calc(var(--mobile-vh, 100vh))',
        overflow: 'hidden' // スクロール防止
      }}
    >
      {showHeader && <AppHeader />}
      
      <main 
        className="flex-1 relative"
        style={{
          overflow: 'hidden',
          // メインコンテンツエリアの高さを明示的に計算
          height: showHeader 
            ? 'calc(var(--mobile-vh, 100vh) - 56px)' // ヘッダー分を差し引く
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
            // ナビゲーション分のパディングを明示的に設定
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