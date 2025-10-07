"use client";

import { cn } from "@/lib/utils";

interface OptimizedSkeletonProps {
  className?: string;
  aspectRatio?: string;
  children?: React.ReactNode;
}

/**
 * CLS対策済みのスケルトンコンポーネント
 * 実際のコンテンツと同じサイズを維持してレイアウトシフトを防ぐ
 */
export function OptimizedSkeleton({ 
  className, 
  aspectRatio,
  children,
  ...props 
}: OptimizedSkeletonProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
      style={aspectRatio ? { aspectRatio } : undefined}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * 投稿カード用の構造化スケルトン
 */
export function PostCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* ヘッダー部分 */}
      <div className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <OptimizedSkeleton className="h-7 w-7 rounded-full flex-shrink-0" />
            <div className="space-y-1">
              <OptimizedSkeleton className="h-3 w-16" />
              <OptimizedSkeleton className="h-2 w-12" />
            </div>
          </div>
          <OptimizedSkeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
      
      {/* コンテンツ部分 */}
      <div className="p-3 pt-1">
        <div className="space-y-2 mb-3">
          <OptimizedSkeleton className="h-4 w-full" />
          <OptimizedSkeleton className="h-4 w-3/4" />
        </div>
        
        {/* 画像部分（固定アスペクト比） */}
        <div className="flex justify-center w-full mb-3">
          <OptimizedSkeleton 
            className="w-full max-w-sm rounded-md" 
            aspectRatio="4/5" 
          />
        </div>
        
        {/* フッター部分 */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-4">
            <OptimizedSkeleton className="h-8 w-12" />
            <OptimizedSkeleton className="h-8 w-12" />
          </div>
          <OptimizedSkeleton className="h-8 w-16" />
        </div>
      </div>
    </div>
  );
}
