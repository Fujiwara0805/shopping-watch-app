"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AppLayout from '@/components/layout/app-layout';
import { MapView } from '@/components/map/map-view';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CustomModal } from '@/components/ui/custom-modal';
import { Award, Sparkles, ShoppingBag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MapPage() {
  const [loading, setLoading] = useState(true);
  const [showPointsModal, setShowPointsModal] = useState(false);
  
  useEffect(() => {
    // ローディング時間を短縮してスマートフォンでの表示を早める
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500); // 1000ms → 500ms に短縮
    
    return () => clearTimeout(timer);
  }, []);

  // スマートフォン向けのローディングスケルトン
  const LoadingSkeleton = () => (
    <div 
      className="w-full bg-muted animate-pulse flex items-center justify-center"
      style={{ 
        height: 'calc(100vh - 56px - 64px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
        minHeight: '300px'
      }}
    >
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground text-sm">地図を読み込み中...</p>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 relative">
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <motion.div 
              key={'map'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full"
            >
              <MapView />
            </motion.div>
          )}
        </div>

        {/* ポイント説明モーダル */}
        <CustomModal
          isOpen={showPointsModal}
          onClose={() => setShowPointsModal(false)}
          title="ポイントシステム"
          description="投稿でポイントを貯めて、お得な特典と交換しよう！"
          showCloseButton={false}
          dialogContentClassName="fixed inset-0 z-50 flex items-center justify-center p-4 max-w-sm"
        >
          <div className="flex items-center text-lg font-bold text-gray-900 mb-4">
            <Award className="h-5 w-5 mr-2 text-yellow-500" />
            ポイントシステム
          </div>
          <div className="space-y-3 py-3">
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg p-3 border border-yellow-200">
              <h4 className="font-semibold text-gray-900 mb-1 flex items-center text-sm">
                <Sparkles className="h-4 w-4 mr-1 text-yellow-500" />
                ポイントの貯め方
              </h4>
              <p className="text-xs text-gray-700">
                投稿をするたびに、<span className="font-bold text-yellow-700">最大5ポイント</span>をもらえます。
                質の高い投稿ほど、より多くのポイントがもらえます！
              </p>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
              <h4 className="font-semibold text-gray-900 mb-1 flex items-center text-sm">
                <ShoppingBag className="h-4 w-4 mr-1 text-green-500" />
                ポイントの使い方
              </h4>
              <p className="text-xs text-gray-700">
                貯まったポイントは、<span className="font-bold text-green-700">Amazonギフト券</span>と交換できます。
                さまざまな額面のギフト券をご用意しています。
              </p>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <p className="text-xs text-blue-600 text-center">
                ※ ポイントシステムは現在開発中です。近日公開予定！
              </p>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button
              onClick={() => setShowPointsModal(false)}
              className="text-white text-sm"
              style={{ backgroundColor: '#73370c' }}
              size="sm"
            >
              <X className="h-3 w-3 mr-1" />
              閉じる
            </Button>
          </div>
        </CustomModal>
      </div>
    </AppLayout>
  );
}