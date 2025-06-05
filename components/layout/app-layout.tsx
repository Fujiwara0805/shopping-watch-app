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
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastHeightRef = useRef<number>(0);
  
  // スマートフォン向けの viewport height 設定
  useEffect(() => {
    const updateViewportHeight = () => {
      const currentHeight = window.innerHeight;
      
      // 高さが変わっていない場合は処理をスキップ（無限ループ防止）
      if (Math.abs(currentHeight - lastHeightRef.current) < 5) {
        return;
      }
      
      lastHeightRef.current = currentHeight;
      
      // 実際の viewport height を取得
      const vh = currentHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      
      // Safe area inset の設定（値の重複を避ける）
      const satValue = getComputedStyle(document.documentElement).getPropertyValue('--sat');
      const sabValue = getComputedStyle(document.documentElement).getPropertyValue('--sab');
      
      if (!satValue || satValue === '') {
        document.documentElement.style.setProperty('--sat', '0px');
      }
      if (!sabValue || sabValue === '') {
        document.documentElement.style.setProperty('--sab', '0px');
      }
      
      // 動的な高さ計算（スマートフォン専用）
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        const windowHeight = window.innerHeight;
        const visualViewportHeight = window.visualViewport?.height || windowHeight;
        const actualHeight = Math.min(windowHeight, visualViewportHeight);
        
        document.documentElement.style.setProperty('--actual-vh', `${actualHeight}px`);
        
        // デバッグログを制限（開発環境のみ）
        if (process.env.NODE_ENV === 'development') {
          console.log('AppLayout: Mobile viewport update:', {
            windowHeight,
            visualViewportHeight,
            actualHeight,
            innerWidth: window.innerWidth
          });
        }
      }
    };

    // 初期設定（遅延実行で安定化）
    const initialTimeout = setTimeout(updateViewportHeight, 100);

    // デバウンス処理を追加したリサイズハンドラー
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = setTimeout(updateViewportHeight, 150);
    };
    
    const handleOrientationChange = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      // オリエンテーション変更は少し長めの遅延
      resizeTimeoutRef.current = setTimeout(updateViewportHeight, 300);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleOrientationChange, { passive: true });
    
    // Visual Viewport API のサポート確認（デバウンス付き）
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize, { passive: true });
    }

    return () => {
      clearTimeout(initialTimeout);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []); // 依存配列を空にして1回だけ実行
  
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
        // シンプルなフォールバック値を使用
        minHeight: '100vh',
        height: '100vh'
      }}
    >
      {showHeader && <AppHeader />}
      
      <main className="flex-1 relative overflow-hidden">
        <motion.div
          key={pathname}
          initial="hidden"
          animate="enter"
          exit="exit"
          variants={variants}
          transition={{ duration: 0.3, type: 'tween' }}
          className={`absolute inset-0 flex flex-col ${
            showNav 
              ? 'pb-16 md:pb-0' // ナビゲーション分のパディング
              : 'pb-0'
          }`}
        >
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </motion.div>
      </main>
      
      {showNav && <MainNav />}
    </div>
  );
}