"use client";

import { ReactNode, useEffect, useState } from 'react';

interface MapLayoutProps {
  children: ReactNode;
}

export default function MapLayout({ children }: MapLayoutProps) {
  const [layoutDimensions, setLayoutDimensions] = useState({
    viewportHeight: 0,
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
    // ヘッダーとナビゲーションを削除したので全画面使用
    const contentHeight = Math.max(300, viewportHeight);
    
    setLayoutDimensions({
      viewportHeight,
      contentHeight
    });

    // CSS変数を直接設定（他のレイアウトとの競合を避けるため）
    document.documentElement.style.setProperty('--map-viewport-height', `${viewportHeight}px`);
    document.documentElement.style.setProperty('--map-content-height', `${contentHeight}px`);
    
    console.log('MapLayout: Layout dimensions updated:', {
      viewportHeight,
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

  return (
    <>
      {/* メインレイアウト - ヘッダーとナビゲーションを削除して全画面表示 */}
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
        {/* メインコンテンツ - 全画面表示 */}
        <div 
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            height: `${layoutDimensions.contentHeight}px`,
            minHeight: '300px',
            width: '100%'
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
      </div>
    </>
  );
}