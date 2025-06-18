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

  // 現在の投稿
  const currentPost = posts[currentIndex];

  // インデックスが範囲外の場合の処理
  useEffect(() => {
    if (initialIndex >= 0 && initialIndex < posts.length) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, posts.length]);

  // 🔥 ブラウザ横断対応のビューポート高さ設定
  useEffect(() => {
    if (!isOpen) return;

    const updateViewportHeight = () => {
      const currentHeight = window.innerHeight;
      const vh = currentHeight * 0.01;
      document.documentElement.style.setProperty('--fullscreen-vh', `${vh}px`);
    };

    updateViewportHeight();

    const handleResize = () => {
      setTimeout(updateViewportHeight, 100);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [isOpen]);

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
      // 🔥 ブラウザ横断対応のスクロール無効化
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = '';
        document.body.style.height = '';
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
          style={{
            // 🔥 ブラウザ横断対応の高さ設定
            height: 'calc(var(--fullscreen-vh, 1vh) * 100)',
            maxHeight: 'calc(var(--fullscreen-vh, 1vh) * 100)',
            overflow: 'hidden',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={handleBackgroundClick}
        >
          {/* 🔥 閉じるボタン - セーフエリア対応 */}
          <div 
            className="absolute z-70"
            style={{
              top: 'max(16px, env(safe-area-inset-top, 0px))',
              right: 'max(16px, env(safe-area-inset-right, 0px))',
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

          {/* 🔥 インジケーター - セーフエリア対応 */}
          <div 
            className="absolute left-1/2 transform -translate-x-1/2 z-60 flex space-x-1"
            style={{
              top: 'max(16px, env(safe-area-inset-top, 0px))',
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

          {/* 🔥 カウンター - セーフエリア対応 */}
          <div 
            className="absolute z-60 text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full"
            style={{
              top: 'max(16px, env(safe-area-inset-top, 0px))',
              left: 'max(16px, env(safe-area-inset-left, 0px))',
            }}
          >
            {currentIndex + 1} / {posts.length}
          </div>

          {/* 🔥 ナビゲーションヒント - セーフエリア対応 */}
          <div 
            className="absolute left-1/2 transform -translate-x-1/2 z-60 text-white/70 text-xs text-center"
            style={{
              bottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
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

          {/* 🔥 メインコンテンツ - ビューポート高さ対応 */}
          <motion.div
            className="w-full h-full max-w-lg mx-auto flex items-center justify-center"
            style={{
              // 🔥 セーフエリアを考慮したパディング
              paddingTop: 'max(60px, calc(env(safe-area-inset-top, 0px) + 60px))',
              paddingBottom: 'max(60px, calc(env(safe-area-inset-bottom, 0px) + 60px))',
              paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
              paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
              height: 'calc(var(--fullscreen-vh, 1vh) * 100)',
              maxHeight: 'calc(var(--fullscreen-vh, 1vh) * 100)',
            }}
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
                  // 🔥 最大高さをセーフエリアを考慮して設定
                  maxHeight: 'calc(var(--fullscreen-vh, 1vh) * 100 - 120px)',
                }}
              >
                <div className="relative">
                  {/* 🔥 PostCardを統一サイズで表示（ビューポート対応） */}
                  <div 
                    className="w-full"
                    style={{ 
                      maxHeight: 'calc(var(--fullscreen-vh, 1vh) * 100 - 120px)',
                      overflow: 'hidden',
                    }}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
};