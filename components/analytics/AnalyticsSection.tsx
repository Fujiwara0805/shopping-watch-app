'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Eye, Users, Loader2, Sparkles, Calendar, TrendingUp } from 'lucide-react';

interface AnalyticsData {
  pageViews: number;
  visitors: number;
  period: string;
  lastUpdated: string;
}

interface AnalyticsSectionProps {
  className?: string;
}

// ===== Design System: LP同一配色 =====
const colors = {
  base: '#F4F5F2',
  primary: '#6E7F80',
  primaryDark: '#5a6b6c',
  fern: '#8A9A5B',
  stone: '#C2B8A3',
  magicLilac: '#BFA3D1',
  goldDust: '#E2C275',
  secondary: '#E63946',
};

// 湯けむりグラデーション
const MistOverlay = ({ className = '' }: { className?: string }) => (
  <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
    <motion.div 
      animate={{ 
        y: [0, -15, 0],
        opacity: [0.15, 0.25, 0.15],
      }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#6E7F80]/10 rounded-full blur-3xl" 
    />
    <motion.div 
      animate={{ 
        y: [0, 15, 0],
        opacity: [0.1, 0.2, 0.1],
      }}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#8A9A5B]/10 rounded-full blur-3xl" 
    />
  </div>
);

// チャプターマーカー
const ChapterMarker = ({ number, title }: { number: string; title: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  
  return (
    <motion.div 
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className="flex items-center gap-4 mb-10"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#6E7F80] text-white font-bold text-sm shadow-lg shadow-[#6E7F80]/20">
        {number}
      </div>
      <div className="h-px flex-1 bg-gradient-to-r from-[#E2C275] via-[#E2C275]/50 to-transparent" />
      <span className="text-xs tracking-[0.3em] text-[#8A9A5B]/90 uppercase font-semibold px-3 py-1 bg-[#8A9A5B]/15 rounded-full border border-[#8A9A5B]/30">
        {title}
      </span>
      <div className="h-px flex-1 bg-gradient-to-l from-[#E2C275] via-[#E2C275]/50 to-transparent" />
    </motion.div>
  );
};

// Glassmorphism カード（LP同一）
const GlassCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div 
    className={`
      relative bg-[#C2B8A3]/10 backdrop-blur-xl rounded-2xl 
      border border-[#C2B8A3]/25 
      shadow-[0_8px_32px_rgba(194,184,163,0.15)]
      hover:shadow-[0_16px_48px_rgba(194,184,163,0.2)] 
      hover:border-[#8A9A5B]/40 
      transition-all duration-300
      ${className}
    `}
  >
    {children}
  </div>
);

/**
 * LP用 Analytics表示セクション
 * Neo-Oita Modernism - 大分の魅力を表現したモダンデザイン
 */
export function AnalyticsSection({ className = '' }: AnalyticsSectionProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDummy, setIsDummy] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics?period=30d');
      const result = await response.json();
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Analytics API Response:', result);
      }
      
      if (result.success && result.data) {
        setData(result.data);
        setIsDummy(result.isDummy || false);
        
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
    const interval = setInterval(fetchData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 数字のアニメーション用コンポーネント
  const AnimatedNumber = ({ value, duration = 2 }: { value: number; duration?: number }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
      let startTime: number;
      let animationFrame: number;

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
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
    <section 
      ref={sectionRef}
      className={`py-20 sm:py-28 px-6 relative overflow-hidden ${className}`}
      style={{ background: '#E6E9E5' }}
    >
      <MistOverlay className="opacity-50" />

      <div className="container mx-auto max-w-4xl relative z-10">
        <ChapterMarker number="04" title="TRACTION" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          {/* セクションヘッダー */}
          <div className="mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <TrendingUp className="h-6 w-6 text-[#E2C275]" />
              </motion.div>
              <h2 
                className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#6E7F80]"
                style={{ fontFamily: "'Noto Serif JP', serif" }}
              >
                サービスの注目度
              </h2>
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <TrendingUp className="h-6 w-6 text-[#E2C275]" />
              </motion.div>
            </div>
            <p className="text-[#6E7F80]/60">
              多くの冒険者がTOKUDOKUを訪れています
            </p>
          </div>

          {/* メトリクス表示 */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center py-12"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-12 h-12 border-2 border-[#C2B8A3]/30 border-t-[#8A9A5B] rounded-full"
                />
              </motion.div>
            ) : data ? (
              <motion.div
                key="data"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-xl mx-auto">
                  {/* 訪問者数 */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.1 }}
                    whileHover={{ y: -6 }}
                  >
                    <GlassCard className="p-6 sm:p-8">
                      <div className="flex items-center justify-center mb-4">
                        <div className="p-3 bg-[#6E7F80]/10 rounded-xl">
                          <Users className="h-6 w-6 sm:h-7 sm:w-7 text-[#6E7F80]" />
                        </div>
                      </div>
                      <motion.p
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                        className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#6E7F80] mb-2"
                      >
                        <AnimatedNumber value={data.visitors} />
                      </motion.p>
                      <p className="text-sm sm:text-base text-[#6E7F80]/60 font-medium">訪問者</p>
                      
                      {/* 下部アクセントライン */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#6E7F80] to-transparent rounded-b-2xl opacity-20" />
                    </GlassCard>
                  </motion.div>

                  {/* ページビュー */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.2 }}
                    whileHover={{ y: -6 }}
                  >
                    <GlassCard className="p-6 sm:p-8">
                      <div className="flex items-center justify-center mb-4">
                        <div className="p-3 bg-[#E63946]/10 rounded-xl">
                          <Eye className="h-6 w-6 sm:h-7 sm:w-7 text-[#E63946]" />
                        </div>
                      </div>
                      <motion.p
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                        className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#6E7F80] mb-2"
                      >
                        <AnimatedNumber value={data.pageViews} />
                      </motion.p>
                      <p className="text-sm sm:text-base text-[#6E7F80]/60 font-medium">ページビュー</p>
                      
                      {/* 下部アクセントライン */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#E63946] to-transparent rounded-b-2xl opacity-20" />
                    </GlassCard>
                  </motion.div>
                </div>

                {/* 期間表示 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center justify-center gap-3 text-sm text-[#6E7F80]/50"
                >
                  <Calendar className="h-4 w-4" />
                  <span>{data.period}</span>
                  {isDummy && (
                    <span className="ml-2 px-3 py-1 bg-[#E2C275]/10 text-[#E2C275] rounded-full text-xs font-medium">
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