"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapView } from '@/components/map/map-view';
import { CustomModal } from '@/components/ui/custom-modal';
import { Award, Sparkles, ShoppingBag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MapPage() {
  const [loading, setLoading] = useState(true);
  const [showPointsModal, setShowPointsModal] = useState(false);
  
  useEffect(() => {
    // 簡素なローディング時間
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  // スマートフォン向けのローディングスケルトン
  const LoadingSkeleton = () => (
    <div 
      className="w-full h-full bg-muted animate-pulse flex items-center justify-center"
      style={{ minHeight: '100vh' }} // CLS対策：最小高さを固定
    >
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground text-sm">地図を準備中...</p>
      </div>
    </div>
  );

  return (
    <>
      {/* マップページは独自のレイアウトシステムを使用 */}
      <div className="h-full w-full overflow-hidden">
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <motion.div 
            key={'map'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="h-full w-full"
          >
            <MapView />
          </motion.div>
        )}
      </div>
    </>
  );
}