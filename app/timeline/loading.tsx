"use client";

import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import AppLayout from '@/components/layout/app-layout';

/**
 * Timeline用の最適化されたローディングページ
 * LCP改善：初期表示を高速化
 */
export default function TimelineLoading() {
  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
        {/* ヘッダー部分のスケルトン */}
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-orange-200">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>

        {/* 検索・フィルター部分 */}
        <div className="p-4 space-y-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="flex space-x-2 overflow-x-auto">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full flex-shrink-0" />
            ))}
          </div>
        </div>

        {/* 投稿カード群のスケルトン */}
        <div className="p-4">
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="w-full"
              >
                {/* 実際の投稿カードと同じ構造のスケルトン */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* ヘッダー部分 */}
                  <div className="p-3 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
                        <div className="space-y-1">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-2 w-12" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  </div>
                  
                  {/* コンテンツ部分 */}
                  <div className="p-3 pt-1">
                    <div className="space-y-2 mb-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                    
                    {/* 画像部分（固定アスペクト比） */}
                    <div className="flex justify-center w-full mb-3">
                      <Skeleton className="w-full max-w-sm rounded-md" style={{ aspectRatio: "4/5" }} />
                    </div>
                    
                    {/* フッター部分 */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-8 w-12" />
                        <Skeleton className="h-8 w-12" />
                      </div>
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
