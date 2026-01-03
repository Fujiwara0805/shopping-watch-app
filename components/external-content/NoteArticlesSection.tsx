'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, BookOpen, Scroll, ChevronRight } from 'lucide-react';

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

/**
 * LP用 note記事セクション
 * 冒険の書風のデザイン
 */
export function NoteArticlesSection({ 
  username, 
  maxItems = 2, 
  className = '' 
}: NoteArticlesSectionProps) {
  const [articles, setArticles] = useState<NoteArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // RSS to JSON API を使用（CORS回避、API不要）
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
          description: item.description?.replace(/<[^>]*>/g, '').slice(0, 100) + '...',
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

  return (
    <section className={`py-16 sm:py-24 px-4 sm:px-8 bg-[#e8f4e5] relative overflow-hidden ${className}`}>
      <ParchmentTexture opacity={0.1} />

      <div className="container mx-auto max-w-5xl relative z-10">
        {/* セクションヘッダー - 冒険の書風 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#8b6914]" />
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Scroll className="h-8 w-8 text-[#8b6914]" />
            </motion.div>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#8b6914]" />
          </div>
          
          <h2 
            className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#3d2914] tracking-tight mt-4"
            style={{ fontFamily: 'serif' }}
          >
            冒険の記録
          </h2>
          <p className="text-base sm:text-lg text-[#5c3a21] mt-4 font-medium" style={{ fontFamily: 'serif' }}>
            冒険者たちへ届ける物語
          </p>
        </motion.div>

        {/* 記事一覧 - 冒険の書スタイル */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Scroll className="h-12 w-12 text-[#8b6914]" />
            </motion.div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-[#5c3a21] mb-4" style={{ fontFamily: 'serif' }}>{error}</p>
            <motion.a
              href={`https://note.com/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#8b6914] text-[#f5e6c8] rounded font-bold hover:bg-[#6b4e0a] transition-colors"
              style={{ fontFamily: 'serif' }}
            >
              記録を見る
              <ExternalLink className="h-4 w-4" />
            </motion.a>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12 text-[#5c3a21]">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p style={{ fontFamily: 'serif' }}>まだ記録がありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {articles.map((article, index) => (
              <motion.a
                key={article.link}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ 
                  scale: 1.02, 
                  boxShadow: '0 12px 40px rgba(61, 41, 20, 0.25)',
                }}
                className="group relative block overflow-hidden"
                style={{
                  background: 'linear-gradient(145deg, #f5e6c8 0%, #e8d4a8 50%, #d4c090 100%)',
                  borderRadius: '12px',
                  border: '4px solid #8b6914',
                  boxShadow: '0 6px 24px rgba(61, 41, 20, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4)',
                }}
              >
                {/* 羊皮紙風の装飾 */}
                <div 
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    backgroundImage: `
                      radial-gradient(ellipse at 15% 15%, rgba(139, 105, 20, 0.2) 0%, transparent 50%),
                      radial-gradient(ellipse at 85% 85%, rgba(92, 58, 33, 0.15) 0%, transparent 50%),
                      url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")
                    `,
                  }}
                />
                
                {/* 角の装飾 - 本のコーナー風 */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#6b4e0a] rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#6b4e0a] rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#6b4e0a] rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#6b4e0a] rounded-br-lg" />
                
                <div className="relative p-6">
                  {/* 日付 */}
                  <div className="flex items-center justify-end mb-3">
                    <span 
                      className="text-xs"
                      style={{ 
                        color: '#6b4e0a',
                        fontFamily: 'serif',
                        fontStyle: 'italic',
                      }}
                    >
                      {new Date(article.pubDate).toLocaleDateString('ja-JP', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  
                  {/* タイトル */}
                  <h3 
                    className="font-bold line-clamp-2 mb-3 group-hover:text-[#4a3508] transition-colors"
                    style={{
                      color: '#3d2914',
                      fontSize: '1.15rem',
                      fontFamily: 'serif',
                      textShadow: '0 1px 1px rgba(255,255,255,0.6)',
                      lineHeight: '1.6',
                    }}
                  >
                    {article.title}
                  </h3>
                  
                  {/* 装飾ライン */}
                  <div 
                    className="w-full h-0.5 mb-3"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, #8b6914 15%, #8b6914 85%, transparent 100%)',
                    }}
                  />
                  
                  {/* 説明文 */}
                  <p 
                    className="text-sm line-clamp-2 mb-4"
                    style={{
                      color: '#5c3a21',
                      fontFamily: 'serif',
                      lineHeight: '1.8',
                    }}
                  >
                    {article.description}
                  </p>
                  
                  {/* 続きを読むリンク */}
                  <motion.div 
                    className="flex items-center justify-end"
                    whileHover={{ x: 5 }}
                  >
                    <span 
                      className="flex items-center gap-2 text-sm group-hover:text-[#4a3508] transition-colors"
                      style={{
                        color: '#8b6914',
                        fontFamily: 'serif',
                        fontStyle: 'italic',
                      }}
                    >
                      <Scroll className="h-4 w-4" />
                      続きを読む
                      <ExternalLink className="h-3 w-3 opacity-70" />
                    </span>
                  </motion.div>
                </div>
              </motion.a>
            ))}
          </div>
        )}

        {/* noteへのリンク - 冒険の書風 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <motion.a
            href={`https://note.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ 
              scale: 1.05, 
              boxShadow: "0 12px 40px rgba(139, 105, 20, 0.4)",
            }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-3 px-8 py-4 text-base font-bold transition-all"
            style={{
              background: 'linear-gradient(135deg, #8b6914 0%, #6b4e0a 100%)',
              color: '#f5e6c8',
              borderRadius: '8px',
              border: '3px solid #4a3508',
              fontFamily: 'serif',
              boxShadow: '0 6px 24px rgba(107, 78, 10, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.2)',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}
          >
            <BookOpen className="h-5 w-5" />
            すべての記録を見る
            <ChevronRight className="h-5 w-5" />
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}

