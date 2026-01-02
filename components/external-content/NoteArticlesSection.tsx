'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, BookOpen, Loader2, Calendar, ChevronRight } from 'lucide-react';

interface NoteArticle {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  thumbnail?: string;
}

interface NoteArticlesSectionProps {
  username: string;
  maxItems?: number;
  className?: string;
}

/**
 * LP用 note記事セクション
 * RSSフィードを使用（API不要）
 */
export function NoteArticlesSection({ 
  username, 
  maxItems = 4, 
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
          description: item.description?.replace(/<[^>]*>/g, '').slice(0, 80) + '...',
          thumbnail: item.thumbnail || item.enclosure?.link,
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

      <div className="container mx-auto max-w-6xl relative z-10">
        {/* セクションヘッダー */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#8b6914]" />
            <p className="px-5 py-1 text-xs sm:text-sm tracking-[0.25em] font-bold text-[#8b6914] border border-[#8b6914]/30 bg-[#fff8f0]/50">
              ARTICLES
            </p>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#8b6914]" />
          </div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#3d2914] tracking-tight mt-4 font-serif">
            noteで記事を公開中
          </h2>
          <p className="text-base sm:text-lg text-[#5c3a21] mt-4 font-semibold">
            イベント情報やお知らせをnoteで発信しています
          </p>
        </motion.div>

        {/* 記事一覧 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-[#8b6914]" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-[#5c3a21] mb-4">{error}</p>
            <motion.a
              href={`https://note.com/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#8b6914] text-white rounded-full font-bold hover:bg-[#3d2914] transition-colors"
            >
              noteで見る
              <ExternalLink className="h-4 w-4" />
            </motion.a>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12 text-[#5c3a21]">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>記事がありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {articles.map((article, index) => (
              <motion.a
                key={article.link}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8, boxShadow: '0 15px 40px rgba(61, 41, 20, 0.15)' }}
                className="block bg-[#fff8f0] rounded-xl border-2 border-[#d4c4a8] overflow-hidden group"
              >
                {/* サムネイル */}
                <div className="h-36 sm:h-40 overflow-hidden bg-gradient-to-br from-[#41c9b4] to-[#2ea88f] relative">
                  {article.thumbnail ? (
                    <img
                      src={article.thumbnail}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <BookOpen className="h-12 w-12 text-white/50" />
                    </div>
                  )}
                  {/* noteロゴバッジ */}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1.5">
                    <img
                      src="https://assets.st-note.com/poc-image/manual/note-common-images/production/svg/logo_symbol__only-black.svg"
                      alt="note"
                      className="h-4 w-4"
                    />
                    <span className="text-xs font-bold text-gray-700">note</span>
                  </div>
                </div>

                {/* コンテンツ */}
                <div className="p-4">
                  <h3 className="font-bold text-[#3d2914] line-clamp-2 mb-2 group-hover:text-[#8b6914] transition-colors text-sm sm:text-base leading-tight">
                    {article.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5c3a21] line-clamp-2 mb-3 leading-relaxed">
                    {article.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-[#8b7355]">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(article.pubDate).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <ExternalLink className="h-3 w-3 group-hover:text-[#8b6914] transition-colors" />
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        )}

        {/* noteへのリンク */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <motion.a
            href={`https://note.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(65, 201, 180, 0.3)" }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#41c9b4] to-[#2ea88f] text-white rounded-full text-base font-bold hover:from-[#3ab8a5] hover:to-[#279b82] transition-all shadow-lg"
          >
            <img
              src="https://assets.st-note.com/poc-image/manual/note-common-images/production/svg/logo_symbol__only-black.svg"
              alt="note"
              className="h-6 w-6 invert"
            />
            すべての記事を見る
            <ChevronRight className="h-5 w-5" />
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}

