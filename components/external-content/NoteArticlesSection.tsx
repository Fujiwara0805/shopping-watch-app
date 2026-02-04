'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ExternalLink, BookOpen, ChevronRight, ArrowUpRight, Calendar } from 'lucide-react';

// ===================================================================
// DESIGN SYSTEM: "Oita Organic Elegance"
// 大分の自然と伝統を表現する洗練されたカラーパレット
// ===================================================================

const designTokens = {
  colors: {
    // メインカラー
    primary: {
      base: '#6E7F80',      // スモークブルー
      dark: '#5A6B6C',
      light: '#8A9A9B',
      contrast: '#FFFFFF',
    },
    // サブカラー
    secondary: {
      fern: '#8A9A5B',       // フェルン・オリーブグリーン
      fernLight: '#A4B47A',
      fernDark: '#6F7D48',
      stone: '#C2B8A3',      // ストーンベージュ
      stoneLight: '#D4CCBA',
      stoneDark: '#A89E8A',
    },
    // アクセントカラー
    accent: {
      lilac: '#BFA3D1',      // マジック・ライラック
      lilacLight: '#D4C2E3',
      lilacDark: '#9B7FB5',
      gold: '#E2C275',       // ゴールドダスト
      goldLight: '#EDD49A',
      goldDark: '#C9A85C',
    },
    // 背景色
    background: {
      mist: '#F4F5F2',       // ミストホワイト
      cloud: '#E6E9E5',      // クラウドグレー
      white: '#FFFFFF',
    },
    // テキスト色
    text: {
      primary: '#2D3436',
      secondary: '#636E72',
      muted: '#95A5A6',
      inverse: '#FFFFFF',
    },
    // 機能色
    functional: {
      error: '#E74C3C',
      success: '#27AE60',
      warning: '#F39C12',
      info: '#3498DB',
    },
  },
  typography: {
    display: "'Sora', 'Noto Sans JP', sans-serif",
    body: "'IBM Plex Sans JP', 'Noto Sans JP', sans-serif",
  },
  elevation: {
    subtle: '0 1px 3px rgba(110, 127, 128, 0.08)',
    low: '0 2px 8px rgba(110, 127, 128, 0.10)',
    medium: '0 4px 16px rgba(110, 127, 128, 0.12)',
    high: '0 8px 32px rgba(110, 127, 128, 0.15)',
  },
};

// ===================================================================
// TYPES
// ===================================================================

interface NoteArticle {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

interface NoteArticlesSectionProps {
  username: string;
  maxItems?: number;
  className?: string;
}

// ===================================================================
// SHARED COMPONENTS
// ===================================================================

// セクションラベル
const SectionLabel = ({ children }: { children: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  
  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className="inline-block text-xs font-semibold tracking-[0.3em] uppercase text-center"
      style={{ 
        color: designTokens.colors.accent.gold,
        fontFamily: designTokens.typography.body,
      }}
    >
      {children}
    </motion.span>
  );
};

// エレベーションカード
const ElevationCard = ({ 
  children, 
  className = '', 
  elevation = 'medium',
  hover = true,
  padding = 'lg',
}: { 
  children: React.ReactNode; 
  className?: string;
  elevation?: 'subtle' | 'low' | 'medium' | 'high';
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}) => {
  const paddingMap = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  };
  
  return (
    <motion.div
      whileHover={hover ? { y: -6, boxShadow: designTokens.elevation.high } : {}}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`
        relative rounded-2xl overflow-hidden
        ${paddingMap[padding]}
        ${className}
      `}
      style={{
        background: designTokens.colors.background.white,
        boxShadow: designTokens.elevation[elevation],
        border: `1px solid ${designTokens.colors.secondary.stone}30`,
      }}
    >
      {children}
    </motion.div>
  );
};

// ===================================================================
// NOTE ARTICLES SECTION
// ===================================================================

export function NoteArticlesSection({ 
  username, 
  maxItems = 4, 
  className = '' 
}: NoteArticlesSectionProps) {
  const [articles, setArticles] = useState<NoteArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const rssUrl = `https://note.com/${username}/rss`;
        const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error('記事の取得に失敗しました');
        }
        
        const data = await response.json();
        
        if (data.status !== 'ok') {
          throw new Error('RSSフィードの解析に失敗しました');
        }
        
        const parsedArticles: NoteArticle[] = data.items.slice(0, maxItems).map((item: any) => ({
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          description: item.description?.replace(/<[^>]*>/g, '').slice(0, 140) + '...',
        }));
        
        setArticles(parsedArticles);
      } catch (err) {
        console.error('Note記事取得エラー:', err);
        setError(err instanceof Error ? err.message : '記事の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchArticles();
    }
  }, [username, maxItems]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <section 
      ref={sectionRef}
      className={`py-24 sm:py-32 px-6 relative overflow-hidden ${className}`}
      style={{ background: designTokens.colors.background.mist }}
    >
      {/* Subtle Background Gradient */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${designTokens.colors.accent.gold}12 0%, transparent 60%)`,
        }}
      />

      <div className="container mx-auto max-w-5xl relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <SectionLabel>Stories</SectionLabel>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-4 text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight"
            style={{ 
              fontFamily: designTokens.typography.display,
              color: designTokens.colors.primary.base,
            }}
          >
            旅の途中から。
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg max-w-xl mx-auto leading-relaxed"
            style={{ 
              fontFamily: designTokens.typography.body,
              color: designTokens.colors.text.secondary,
            }}
          >
            TOKUDOKUを通じて見つけた体験、地域との出会い。
            <br className="hidden sm:block" />
            私たちのnoteで、その物語を綴っています。
          </motion.p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 border-2 rounded-full"
              style={{ 
                borderColor: `${designTokens.colors.secondary.stone}50`,
                borderTopColor: designTokens.colors.accent.gold,
              }}
            />
          </div>
        ) : error ? (
          <ElevationCard elevation="low" padding="xl" hover={false} className="max-w-md mx-auto text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4" style={{ color: designTokens.colors.text.muted }} />
            <p className="mb-6" style={{ color: designTokens.colors.text.secondary }}>{error}</p>
            <motion.a
              href={`https://note.com/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all"
              style={{ 
                background: designTokens.colors.accent.lilac,
                color: designTokens.colors.text.inverse,
              }}
            >
              noteで読む
              <ExternalLink className="w-4 h-4" />
            </motion.a>
          </ElevationCard>
        ) : articles.length === 0 ? (
          <ElevationCard elevation="low" padding="xl" hover={false} className="max-w-md mx-auto text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4" style={{ color: designTokens.colors.text.muted }} />
            <p style={{ color: designTokens.colors.text.secondary }}>まだ記事がありません</p>
          </ElevationCard>
        ) : isMobile ? (
          /* Mobile: Single Featured Article + Link */
          <div>
            <motion.a
              href={articles[0].link}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="block group"
            >
              <ElevationCard elevation="medium" padding="lg" className="relative">
                {/* Date Badge */}
                <div 
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-4"
                  style={{ 
                    background: `${designTokens.colors.accent.gold}25`,
                    color: designTokens.colors.accent.goldDark,
                  }}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(articles[0].pubDate)}
                </div>

                {/* Title */}
                <h3 
                  className="text-xl font-semibold mb-3 leading-relaxed transition-colors"
                  style={{ 
                    fontFamily: designTokens.typography.display,
                    color: designTokens.colors.primary.base,
                  }}
                >
                  {articles[0].title}
                </h3>

                {/* Description */}
                <p 
                  className="text-sm leading-relaxed mb-4 line-clamp-3"
                  style={{ color: designTokens.colors.text.secondary }}
                >
                  {articles[0].description}
                </p>

                {/* Read More */}
                <div className="flex items-center gap-2">
                  <span 
                    className="text-sm font-semibold"
                    style={{ color: designTokens.colors.accent.lilac }}
                  >
                    続きを読む
                  </span>
                  <ArrowUpRight 
                    className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
                    style={{ color: designTokens.colors.accent.lilac }}
                  />
                </div>

                {/* Bottom Accent */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-1 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
                  style={{ background: designTokens.colors.accent.lilac }}
                />
              </ElevationCard>
            </motion.a>

            {/* More Articles Link */}
            {articles.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="text-center mt-6"
              >
                <span 
                  className="text-sm"
                  style={{ color: designTokens.colors.text.muted }}
                >
                  他{articles.length - 1}件の記事
                </span>
              </motion.div>
            )}
          </div>
        ) : (
          /* Desktop: Grid Layout */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {articles.map((article, index) => (
              <motion.a
                key={article.link}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                className="block group"
              >
                <ElevationCard elevation="low" padding="lg" className="h-full relative">
                  {/* Date Badge */}
                  <div 
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-4"
                    style={{ 
                      background: `${designTokens.colors.accent.gold}20`,
                      color: designTokens.colors.accent.goldDark,
                    }}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(article.pubDate)}
                  </div>

                  {/* Title */}
                  <h3 
                    className="text-lg font-semibold mb-3 leading-relaxed line-clamp-2 transition-colors"
                    style={{ 
                      fontFamily: designTokens.typography.display,
                      color: designTokens.colors.primary.base,
                    }}
                  >
                    {article.title}
                  </h3>

                  {/* Divider */}
                  <div 
                    className="w-full h-px mb-3"
                    style={{ 
                      background: `linear-gradient(90deg, ${designTokens.colors.accent.gold}40 0%, transparent 100%)`,
                    }}
                  />

                  {/* Description */}
                  <p 
                    className="text-sm leading-relaxed mb-4 line-clamp-2"
                    style={{ color: designTokens.colors.text.secondary }}
                  >
                    {article.description}
                  </p>

                  {/* Read More */}
                  <div className="flex items-center gap-2 mt-auto">
                    <span 
                      className="text-sm font-semibold"
                      style={{ color: designTokens.colors.accent.lilac }}
                    >
                      続きを読む
                    </span>
                    <ArrowUpRight 
                      className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
                      style={{ color: designTokens.colors.accent.lilac }}
                    />
                  </div>

                  {/* Bottom Accent */}
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-1 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
                    style={{ background: designTokens.colors.accent.lilac }}
                  />
                </ElevationCard>
              </motion.a>
            ))}
          </div>
        )}

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center mt-12"
        >
          <motion.a
            href={`https://note.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all"
            style={{ 
              border: `2px solid ${designTokens.colors.accent.lilac}60`,
              color: designTokens.colors.accent.lilacDark,
              background: `${designTokens.colors.accent.lilac}10`,
            }}
          >
            <BookOpen className="w-5 h-5" />
            すべての記事を見る
            <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}

// ===================================================================
// ANALYTICS SECTION (Optional)
// ===================================================================

export function AnalyticsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  const stats = [
    { value: '18', label: '市町村', suffix: '' },
    { value: '500', label: '登録イベント', suffix: '+' },
    { value: '1,200', label: '公開マップ', suffix: '+' },
    { value: '99', label: '満足度', suffix: '%' },
  ];

  return (
    <section 
      ref={sectionRef}
      className="py-20 px-6 relative overflow-hidden"
      style={{ background: designTokens.colors.primary.base }}
    >
      <div className="container mx-auto max-w-5xl relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <div 
                className="text-4xl md:text-5xl font-bold mb-2"
                style={{ 
                  fontFamily: designTokens.typography.display,
                  color: designTokens.colors.accent.gold,
                }}
              >
                {stat.value}
                <span className="text-2xl">{stat.suffix}</span>
              </div>
              <div 
                className="text-sm font-medium"
                style={{ color: `${designTokens.colors.text.inverse}90` }}
              >
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}