"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PostCard, ExtendedPostWithAuthor } from '@/components/posts/post-card';
import { cn } from '@/lib/utils';

interface FullScreenPostViewerProps {
  posts: ExtendedPostWithAuthor[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onLike?: (postId: string, isLiked: boolean) => Promise<void>;
  currentUserId?: string | null;
  showDistance?: boolean;
}

export const FullScreenPostViewer: React.FC<FullScreenPostViewerProps> = ({
  posts,
  initialIndex,
  isOpen,
  onClose,
  onLike,
  currentUserId,
  showDistance = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const containerRef = useRef<HTMLDivElement>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 現在の投稿
  const currentPost = posts[currentIndex];

  // クライアントサイドでのマウント確認
  useEffect(() => {
    setMounted(true);
  }, []);

  // インデックスが範囲外の場合の処理
  useEffect(() => {
    if (initialIndex >= 0 && initialIndex < posts.length) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, posts.length]);

  // 🔥 本番環境対応の確実なビューポート高さ計算
  const getActualViewportHeight = useCallback(() => {
    if (typeof window === 'undefined') return 0;
    
    // 複数の方法でビューポート高さを取得し、最も適切な値を使用
    const methods = [
      () => window.innerHeight,
      () => document.documentElement.clientHeight,
      () => window.visualViewport?.height || 0,
      () => window.screen.availHeight,
    ];
    
    const heights = methods.map(method => {
      try {
        return method() || 0;
      } catch {
        return 0;
      }
    }).filter(h => h > 0);
    
    // iOS Safari の場合は最小値、その他は最大値を使用
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    return isIOS ? Math.min(...heights) : Math.max(...heights);
  }, []);

  // 閉じる処理を確実に実行
  const handleClose = useCallback(() => {
    console.log('フルスクリーンビューアーを閉じます');
    onClose();
  }, [onClose]);

  // 🔥 本番環境対応のスクロール制御
  useEffect(() => {
    if (!isOpen || !mounted) return;

    // スクロール位置を保存
    const scrollY = window.scrollY;
    
    // body要素の元のスタイルを保存
    const originalStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      height: document.body.style.height,
    };

    // 🔥 確実なスクロール無効化
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    // html要素にもスクロール無効化を適用
    document.documentElement.style.overflow = 'hidden';

    return () => {
      // 元のスタイルを復元
      Object.assign(document.body.style, originalStyles);
      document.documentElement.style.overflow = '';
      
      // スクロール位置を復元
      window.scrollTo(0, scrollY);
    };
  }, [isOpen, mounted]);

  // キーボードナビゲーション
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          handleClose();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 'ArrowUp':
          handlePrevious();
          break;
        case 'ArrowDown':
          handleNext();
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, currentIndex, handleClose]);

  const handleNext = useCallback(() => {
    if (isTransitioning) return;
    if (currentIndex < posts.length - 1) {
      setIsTransitioning(true);
      setCurrentIndex(currentIndex + 1);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [currentIndex, posts.length, isTransitioning]);

  const handlePrevious = useCallback(() => {
    if (isTransitioning) return;
    if (currentIndex > 0) {
      setIsTransitioning(true);
      setCurrentIndex(currentIndex - 1);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [currentIndex, isTransitioning]);

  // スワイプハンドラー
  const handlePanEnd = useCallback((event: any, info: PanInfo) => {
    const threshold = 100;
    const velocity = 300;

    // 水平スワイプ
    if (Math.abs(info.offset.x) > Math.abs(info.offset.y)) {
      setDirection('horizontal');
      if (info.offset.x > threshold || info.velocity.x > velocity) {
        handlePrevious();
      } else if (info.offset.x < -threshold || info.velocity.x < -velocity) {
        handleNext();
      }
    }
    // 垂直スワイプ
    else {
      setDirection('vertical');
      if (info.offset.y > threshold || info.velocity.y > velocity) {
        handlePrevious();
      } else if (info.offset.y < -threshold || info.velocity.y < -velocity) {
        handleNext();
      }
    }
  }, [handleNext, handlePrevious]);

  // バックグラウンドクリックで閉じる
  const handleBackgroundClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  // 🔥 本番環境対応の動的スタイル計算
  const actualHeight = getActualViewportHeight();
  
  const containerStyles: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
    minHeight: '100vh',
    maxHeight: '100vh',
    overflow: 'hidden',
    zIndex: 99999, // 🔥 確実に最前面に表示
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  };

  const contentStyles: React.CSSProperties = {
    width: '100%',
    height: '100vh',
    minHeight: '100vh',
    maxHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 16px',
  };

  const postContainerStyles: React.CSSProperties = {
    width: '100%',
    maxWidth: '512px', // max-w-lg相当
    height: `calc(100vh - 120px)`,
    maxHeight: `calc(100vh - 120px)`,
    overflow: 'hidden',
  };

  if (!mounted || !isOpen || !currentPost) return null;

  // 🔥 Portal を使用してDOMの最上位に配置
  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          style={containerStyles}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={handleBackgroundClick}
        >
          {/* 🔥 閉じるボタン - 確実に表示 */}
          <div 
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 100001,
            }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 bg-black/50 rounded-full backdrop-blur-sm border border-white/20 shadow-lg"
              onClick={handleClose}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* 🔥 インジケーター - 確実に表示 */}
          <div 
            style={{
              position: 'absolute',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 100001,
              display: 'flex',
              gap: '4px',
            }}
          >
            {posts.map((_, index) => (
              <div
                key={index}
                style={{
                  width: '32px',
                  height: '4px',
                  borderRadius: '2px',
                  backgroundColor: index === currentIndex ? 'white' : 'rgba(255, 255, 255, 0.3)',
                  transition: 'all 0.3s',
                }}
              />
            ))}
          </div>

          {/* 🔥 カウンター - 確実に表示 */}
          <div 
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              zIndex: 100001,
              color: 'white',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              padding: '4px 12px',
              borderRadius: '20px',
            }}
          >
            {currentIndex + 1} / {posts.length}
          </div>

          {/* 🔥 ナビゲーションヒント - 確実に表示 */}
          <div 
            style={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 100001,
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '12px',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ChevronLeft className="h-4 w-4" />
                <span>前へ</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>次へ</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
            <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ChevronUp className="h-4 w-4" />
                <span>スワイプ</span>
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* 🔥 メインコンテンツ - 確実にフルスクリーン */}
          <motion.div
            style={contentStyles}
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.2}
            onPanEnd={handlePanEnd}
            whileDrag={{ scale: 0.95 }}
          >
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentPost.id}
                custom={direction}
                initial={{
                  opacity: 0,
                  x: direction === 'horizontal' ? 300 : 0,
                  y: direction === 'vertical' ? 300 : 0,
                  scale: 0.9,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                  y: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  x: direction === 'horizontal' ? -300 : 0,
                  y: direction === 'vertical' ? -300 : 0,
                  scale: 0.9,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                  opacity: { duration: 0.2 },
                }}
                style={{ 
                  pointerEvents: 'auto',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* 🔥 PostCard - 本番環境対応の確実な表示 */}
                  <div style={postContainerStyles}>
                    <PostCard
                      post={currentPost}
                      onLike={onLike}
                      currentUserId={currentUserId}
                      showDistance={showDistance}
                      isOwnPost={currentPost.author_user_id === currentUserId}
                      isFullScreen={true}
                    />
                  </div>
                  
                  {/* オーバーレイコントロール */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* 左半分 - 前の投稿 */}
                    {currentIndex > 0 && (
                      <div
                        className="absolute left-0 top-0 w-1/3 h-full pointer-events-auto cursor-pointer flex items-center justify-start pl-2"
                        onClick={handlePrevious}
                      >
                        <motion.div
                          className="bg-black/40 text-white rounded-full p-2 opacity-0 hover:opacity-100 transition-opacity"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <ChevronLeft className="h-6 w-6" />
                        </motion.div>
                      </div>
                    )}

                    {/* 右半分 - 次の投稿 */}
                    {currentIndex < posts.length - 1 && (
                      <div
                        className="absolute right-0 top-0 w-1/3 h-full pointer-events-auto cursor-pointer flex items-center justify-end pr-2"
                        onClick={handleNext}
                      >
                        <motion.div
                          className="bg-black/40 text-white rounded-full p-2 opacity-0 hover:opacity-100 transition-opacity"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <ChevronRight className="h-6 w-6" />
                        </motion.div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* プリロード（パフォーマンス向上のため次の投稿を事前に読み込み） */}
          <div style={{ display: 'none' }}>
            {currentIndex > 0 && posts[currentIndex - 1] && (
              <PostCard
                post={posts[currentIndex - 1]}
                onLike={onLike}
                currentUserId={currentUserId}
                showDistance={showDistance}
                isOwnPost={posts[currentIndex - 1].author_user_id === currentUserId}
                disableClick={true}
                isFullScreen={true}
              />
            )}
            {currentIndex < posts.length - 1 && posts[currentIndex + 1] && (
              <PostCard
                post={posts[currentIndex + 1]}
                onLike={onLike}
                currentUserId={currentUserId}
                showDistance={showDistance}
                isOwnPost={posts[currentIndex + 1].author_user_id === currentUserId}
                disableClick={true}
                isFullScreen={true}
              />
            )}
          </div>

          {/* 🔥 デバッグ情報（開発環境のみ） */}
          {process.env.NODE_ENV === 'development' && (
            <div 
              style={{
                position: 'absolute',
                bottom: 80,
                left: 16,
                zIndex: 100001,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                fontSize: '12px',
                padding: '8px',
                borderRadius: '4px',
              }}
            >
              <div>高さ: {actualHeight}px</div>
              <div>幅: {typeof window !== 'undefined' ? window.innerWidth : 0}px</div>
              <div>UA: {typeof navigator !== 'undefined' && navigator.userAgent.includes('Safari') ? 'Safari' : 'Chrome'}</div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  // 🔥 Portal を使用してbody直下に配置
  return createPortal(modalContent, document.body);
};