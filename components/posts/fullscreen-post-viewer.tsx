"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [viewportHeight, setViewportHeight] = useState(0);

  // 現在の投稿
  const currentPost = posts[currentIndex];

  // インデックスが範囲外の場合の処理
  useEffect(() => {
    if (initialIndex >= 0 && initialIndex < posts.length) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, posts.length]);

  // 🔥 本番環境対応のビューポート高さ計算
  const getActualViewportHeight = useCallback(() => {
    // 複数の方法でビューポート高さを取得し、最も適切な値を使用
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.clientHeight;
    const screenHeight = window.screen.height;
    
    // visualViewport API がサポートされている場合は使用
    if (window.visualViewport) {
      return window.visualViewport.height;
    }
    
    // iOS Safari の場合は特別な処理
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      return Math.min(windowHeight, documentHeight, screenHeight);
    }
    
    // Chrome/Firefox などの場合
    return Math.max(windowHeight, documentHeight);
  }, []);

  // 🔥 本番環境対応のビューポート高さ設定
  useEffect(() => {
    if (!isOpen) return;

    const updateViewportHeight = () => {
      const actualHeight = getActualViewportHeight();
      setViewportHeight(actualHeight);
      
      // CSS変数を直接設定（本番環境でも確実に動作）
      document.documentElement.style.setProperty('--fullscreen-vh', `${actualHeight / 100}px`);
      document.documentElement.style.setProperty('--actual-viewport-height', `${actualHeight}px`);
      
      console.log('フルスクリーン高さ更新:', actualHeight);
    };

    updateViewportHeight();

    const handleResize = () => {
      setTimeout(updateViewportHeight, 100);
    };

    const handleOrientationChange = () => {
      setTimeout(updateViewportHeight, 500); // オリエンテーション変更後の遅延
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleOrientationChange, { passive: true });
    
    // visualViewport API 対応
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize, { passive: true });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, [isOpen, getActualViewportHeight]);

  // 閉じる処理を確実に実行
  const handleClose = useCallback(() => {
    console.log('フルスクリーンビューアーを閉じます');
    onClose();
  }, [onClose]);

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
      
      // 🔥 本番環境対応のスクロール無効化
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalWidth = document.body.style.width;
      const originalHeight = document.body.style.height;
      const originalTop = document.body.style.top;
      
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.top = '0';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = originalWidth;
        document.body.style.height = originalHeight;
        document.body.style.top = originalTop;
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

  if (!isOpen || !currentPost) return null;

  // 🔥 本番環境対応の動的スタイル計算
  const actualHeight = viewportHeight || getActualViewportHeight();
  const containerStyles: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: `${actualHeight}px`,
    maxHeight: `${actualHeight}px`,
    overflow: 'hidden',
    zIndex: 50,
  };

  const contentStyles: React.CSSProperties = {
    width: '100%',
    height: `${actualHeight}px`,
    maxHeight: `${actualHeight}px`,
    paddingTop: Math.max(60, 16),
    paddingBottom: Math.max(60, 16),
    paddingLeft: 16,
    paddingRight: 16,
  };

  const postContainerStyles: React.CSSProperties = {
    maxHeight: `${actualHeight - 120}px`,
    overflow: 'hidden',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          className="bg-black bg-opacity-90 flex items-center justify-center"
          style={containerStyles}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={handleBackgroundClick}
        >
          {/* 🔥 閉じるボタン - 本番環境対応 */}
          <div 
            className="absolute z-70"
            style={{
              top: 16,
              right: 16,
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

          {/* 🔥 インジケーター - 本番環境対応 */}
          <div 
            className="absolute left-1/2 transform -translate-x-1/2 z-60 flex space-x-1"
            style={{
              top: 16,
            }}
          >
            {posts.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-8 h-1 rounded-full transition-all duration-300",
                  index === currentIndex ? "bg-white" : "bg-white/30"
                )}
              />
            ))}
          </div>

          {/* 🔥 カウンター - 本番環境対応 */}
          <div 
            className="absolute z-60 text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full"
            style={{
              top: 16,
              left: 16,
            }}
          >
            {currentIndex + 1} / {posts.length}
          </div>

          {/* 🔥 ナビゲーションヒント - 本番環境対応 */}
          <div 
            className="absolute left-1/2 transform -translate-x-1/2 z-60 text-white/70 text-xs text-center"
            style={{
              bottom: 16,
            }}
          >
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <ChevronLeft className="h-4 w-4" />
                <span>前へ</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>次へ</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-1 flex items-center justify-center space-x-4">
              <div className="flex items-center space-x-1">
                <ChevronUp className="h-4 w-4" />
                <span>スワイプ</span>
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* 🔥 メインコンテンツ - 本番環境対応 */}
          <motion.div
            className="max-w-lg mx-auto flex items-center justify-center"
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
                className="w-full h-fit overflow-hidden"
                style={{ 
                  pointerEvents: 'auto',
                }}
              >
                <div className="relative">
                  {/* 🔥 PostCard - 本番環境対応の高さ制限 */}
                  <div 
                    className="w-full"
                    style={postContainerStyles}
                  >
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
          <div className="hidden">
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
              className="absolute z-70 bg-black/80 text-white text-xs p-2 rounded"
              style={{
                bottom: 80,
                left: 16,
              }}
            >
              <div>高さ: {actualHeight}px</div>
              <div>幅: {window.innerWidth}px</div>
              <div>UA: {navigator.userAgent.includes('Safari') ? 'Safari' : 'Chrome'}</div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};