'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Users, TrendingUp, Loader2, RefreshCw } from 'lucide-react';
import { COLORS } from '@/lib/constants/colors';

interface AnalyticsData {
  pageViews: number;
  visitors: number;
  period: string;
  lastUpdated: string;
}

interface VisitorCountProps {
  className?: string;
  showRefresh?: boolean;
  variant?: 'card' | 'inline' | 'badge';
}

/**
 * 訪問者数・PV表示コンポーネント
 * LP上で「現在の注目度」として表示
 */
export function VisitorCount({ 
  className = '', 
  showRefresh = false,
  variant = 'card' 
}: VisitorCountProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/analytics?period=24h');
      const result = await response.json();
      
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || 'データの取得に失敗しました');
      }
    } catch (err) {
      console.error('Analytics取得エラー:', err);
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // 5分ごとに自動更新
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // バッジ形式
  if (variant === 'badge') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`inline-flex items-center gap-2 px-3 py-1.5 bg-[#8b6914]/10 rounded-full ${className}`}
      >
        <TrendingUp className="h-4 w-4 text-[#8b6914]" />
        {loading ? (
          <span className="text-sm text-[#5c3a21]">読込中...</span>
        ) : data ? (
          <span className="text-sm font-bold text-[#3d2914]">
            {data.visitors.toLocaleString()}人が閲覧中
          </span>
        ) : (
          <span className="text-sm text-[#5c3a21]">--</span>
        )}
      </motion.div>
    );
  }

  // インライン形式
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-[#8b6914]" />
        ) : data ? (
          <>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-[#8b6914]" />
              <span className="text-sm font-bold text-[#3d2914]">
                {data.visitors.toLocaleString()}
              </span>
              <span className="text-xs text-[#5c3a21]">訪問者</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-[#8b6914]" />
              <span className="text-sm font-bold text-[#3d2914]">
                {data.pageViews.toLocaleString()}
              </span>
              <span className="text-xs text-[#5c3a21]">PV</span>
            </div>
          </>
        ) : null}
      </div>
    );
  }

  // カード形式（デフォルト）
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-[#fff8f0] rounded-xl border-2 border-[#d4c4a8] p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#8b6914]/10 rounded-lg">
            <TrendingUp className="h-5 w-5 text-[#8b6914]" />
          </div>
          <h3 className="font-bold text-[#3d2914]">現在の注目度</h3>
        </div>
        {showRefresh && (
          <motion.button
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.3 }}
            onClick={fetchData}
            disabled={loading}
            className="p-2 hover:bg-[#8b6914]/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-[#8b6914] ${loading ? 'animate-spin' : ''}`} />
          </motion.button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-4"
          >
            <Loader2 className="h-8 w-8 animate-spin text-[#8b6914]" />
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-4 text-[#5c3a21]"
          >
            <p className="text-sm">{error}</p>
          </motion.div>
        ) : data ? (
          <motion.div
            key="data"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-[#f5e6d3] rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-[#8b6914]" />
                  <span className="text-sm text-[#5c3a21]">訪問者数</span>
                </div>
                <motion.p
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="text-3xl font-extrabold text-[#3d2914]"
                >
                  {data.visitors.toLocaleString()}
                </motion.p>
              </div>
              <div className="text-center p-4 bg-[#e8f4e5] rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Eye className="h-5 w-5 text-[#8b6914]" />
                  <span className="text-sm text-[#5c3a21]">ページビュー</span>
                </div>
                <motion.p
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="text-3xl font-extrabold text-[#3d2914]"
                >
                  {data.pageViews.toLocaleString()}
                </motion.p>
              </div>
            </div>
            <p className="text-xs text-center text-[#8b7355]">
              {data.period}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * コンパクトな注目度バッジ
 * ヘッダーやフッターに配置可能
 */
export function PopularityBadge({ className = '' }: { className?: string }) {
  return <VisitorCount variant="badge" className={className} />;
}

