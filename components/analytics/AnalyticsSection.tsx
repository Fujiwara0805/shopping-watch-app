'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Users, TrendingUp, Loader2, Sparkles, Calendar } from 'lucide-react';

interface AnalyticsData {
  pageViews: number;
  visitors: number;
  period: string;
  lastUpdated: string;
}

interface AnalyticsSectionProps {
  className?: string;
}

/**
 * LP用 Analytics表示セクション
 * Google Analytics 4のデータを使用して訪問者数とPVを表示
 * デフォルトで過去30日間のデータを表示
 */
export function AnalyticsSection({ className = '' }: AnalyticsSectionProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDummy, setIsDummy] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      // 30日間のデータを取得
      const response = await fetch('/api/analytics?period=30d');
      const result = await response.json();
      
      // デバッグ用ログ
      if (process.env.NODE_ENV === 'development') {
        console.log('Analytics API Response:', result);
      }
      
      if (result.success && result.data) {
        setData(result.data);
        setIsDummy(result.isDummy || false);
        
        // 開発環境でダミーデータの場合は警告
        if (result.isDummy && process.env.NODE_ENV === 'development') {
          console.warn('Analytics: ダミーデータを使用中', result.message || result.debug);
        }
      }
    } catch (err) {
      console.error('Analytics取得エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // 10分ごとに自動更新
    const interval = setInterval(fetchData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 羊皮紙テクスチャ
  const ParchmentTexture = ({ opacity = 0.3 }: { opacity?: number }) => (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{
        opacity,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }}
    />
  );

  // 数字のアニメーション用コンポーネント
  const AnimatedNumber = ({ value, duration = 2 }: { value: number; duration?: number }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
      let startTime: number;
      let animationFrame: number;

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
        
        // イージング関数（easeOutExpo）
        const easeOutExpo = 1 - Math.pow(2, -10 * progress);
        setDisplayValue(Math.floor(value * easeOutExpo));

        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
        }
      };

      animationFrame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationFrame);
    }, [value, duration]);

    return <>{displayValue.toLocaleString()}</>;
  };

  return (
    <section className={`py-12 sm:py-16 px-4 sm:px-8 bg-gradient-to-b from-[#e8f4e5] to-[#f5e6d3] relative overflow-hidden ${className}`}>
      <ParchmentTexture opacity={0.1} />

      <div className="container mx-auto max-w-4xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center"
        >
          {/* セクションヘッダー */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="h-6 w-6 text-[#8b6914]" />
            </motion.div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#3d2914] font-serif">
              サイトの注目度
            </h2>
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="h-6 w-6 text-[#8b6914]" />
            </motion.div>
          </div>

          {/* メトリクス表示 */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center py-8"
              >
                <Loader2 className="h-10 w-10 animate-spin text-[#8b6914]" />
              </motion.div>
            ) : data ? (
              <motion.div
                key="data"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-4 sm:gap-8 max-w-xl mx-auto">
                  {/* 訪問者数 */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    className="bg-[#fff8f0] rounded-xl border-2 border-[#d4c4a8] p-4 sm:p-6 shadow-lg"
                  >
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div className="p-2 bg-[#8b6914]/10 rounded-full">
                        <Users className="h-5 w-5 sm:h-6 sm:w-6 text-[#8b6914]" />
                      </div>
                    </div>
                    <motion.p
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                      className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#3d2914] mb-1"
                    >
                      <AnimatedNumber value={data.visitors} />
                    </motion.p>
                    <p className="text-sm sm:text-base text-[#5c3a21] font-semibold">訪問者</p>
                  </motion.div>

                  {/* ページビュー */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    className="bg-[#fff8f0] rounded-xl border-2 border-[#d4c4a8] p-4 sm:p-6 shadow-lg"
                  >
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div className="p-2 bg-[#8b6914]/10 rounded-full">
                        <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-[#8b6914]" />
                      </div>
                    </div>
                    <motion.p
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                      className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#3d2914] mb-1"
                    >
                      <AnimatedNumber value={data.pageViews} />
                    </motion.p>
                    <p className="text-sm sm:text-base text-[#5c3a21] font-semibold">ページビュー</p>
                  </motion.div>
                </div>

                {/* 期間表示 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center justify-center gap-2 text-xs sm:text-sm text-[#8b7355]"
                >
                  <Calendar className="h-4 w-4" />
                  <span>{data.period}</span>
                  {isDummy && (
                    <span className="ml-2 px-2 py-0.5 bg-[#8b6914]/10 rounded-full text-xs">
                      サンプルデータ
                    </span>
                  )}
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
