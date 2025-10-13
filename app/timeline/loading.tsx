"use client";

import AppLayout from '@/components/layout/app-layout';

/**
 * Timeline用の最適化されたローディングページ
 * LCP改善：最小限のシンプルなローディング表示
 */
export default function TimelineLoading() {
  return (
    <AppLayout>
      <div className="min-h-screen" style={{ backgroundColor: '#fffaeb' }}>
        {/* シンプルなヘッダー */}
        <div className="sticky top-0 z-10 bg-[#73370c] p-4">
          <div className="flex items-center justify-center">
            <div className="text-white font-medium">読み込み中...</div>
          </div>
        </div>
        
        {/* シンプルなローディング表示 */}
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">投稿を読み込んでいます</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
