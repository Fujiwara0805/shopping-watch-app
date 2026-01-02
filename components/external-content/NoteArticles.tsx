'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, BookOpen, Loader2, Scroll } from 'lucide-react';

interface NoteArticle {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

interface NoteArticlesProps {
  username: string;
  maxItems?: number;
  className?: string;
}

/**
 * noteの記事一覧を表示するコンポーネント
 * RSSフィードを使用して最新記事を取得
 * 冒険の書風のデザイン
 */
export function NoteArticles({ username, maxItems = 3, className = '' }: NoteArticlesProps) {
  const [articles, setArticles] = useState<NoteArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // RSS to JSON API を使用（CORS回避）
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
        
        // 記事データを作成（画像なし）
        const parsedArticles: NoteArticle[] = data.items.slice(0, maxItems).map((item: any) => {
          // 説明文からHTMLタグを除去
          const cleanDescription = (item.description || item.content || '')
            .replace(/<[^>]*>/g, '')
            .trim()
            .slice(0, 100);
          
          return {
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            description: cleanDescription ? cleanDescription + '...' : '',
          };
        });
        
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

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Scroll className="h-10 w-10 text-[#8b6914]" />
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 text-[#5c3a21] ${className}`}>
        <p>{error}</p>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className={`text-center py-8 text-[#5c3a21] ${className}`}>
        <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>記事がありません</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {articles.map((article, index) => (
          <motion.a
            key={article.link}
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, scale: 0.9, rotateX: -10 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
            whileHover={{ 
              scale: 1.02, 
              boxShadow: '0 8px 32px rgba(61, 41, 20, 0.25), inset 0 0 20px rgba(139, 105, 20, 0.1)',
            }}
            className="group relative block overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #f5e6c8 0%, #e8d4a8 50%, #d4c090 100%)',
              borderRadius: '8px',
              border: '3px solid #8b6914',
              boxShadow: '0 4px 16px rgba(61, 41, 20, 0.2), inset 0 2px 4px rgba(255, 255, 255, 0.3)',
            }}
          >
            {/* 羊皮紙風の装飾 */}
            <div 
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                backgroundImage: `
                  radial-gradient(ellipse at 20% 20%, rgba(139, 105, 20, 0.15) 0%, transparent 50%),
                  radial-gradient(ellipse at 80% 80%, rgba(92, 58, 33, 0.1) 0%, transparent 50%),
                  url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")
                `,
              }}
            />
            
            {/* 角の装飾 */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#6b4e0a] rounded-tl-md" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#6b4e0a] rounded-tr-md" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#6b4e0a] rounded-bl-md" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#6b4e0a] rounded-br-md" />
            
            <div className="relative p-5">
              {/* 章番号 */}
              <div className="flex items-center justify-between mb-3">
                <motion.div 
                  className="flex items-center gap-2"
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.15 + 0.3 }}
                >
                  <span 
                    className="text-xs font-bold tracking-wider px-2 py-1 rounded"
                    style={{
                      background: 'linear-gradient(135deg, #8b6914 0%, #6b4e0a 100%)',
                      color: '#f5e6c8',
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    }}
                  >
                    第{index + 1}章
                  </span>
                </motion.div>
                <span 
                  className="text-xs italic"
                  style={{ 
                    color: '#6b4e0a',
                    fontFamily: 'serif',
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
                  fontSize: '1.1rem',
                  fontFamily: 'serif',
                  textShadow: '0 1px 1px rgba(255,255,255,0.5)',
                  lineHeight: '1.5',
                }}
              >
                {article.title}
              </h3>
              
              {/* 装飾ライン */}
              <div 
                className="w-full h-px mb-3"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, #8b6914 20%, #8b6914 80%, transparent 100%)',
                }}
              />
              
              {/* 説明文 */}
              <p 
                className="text-sm line-clamp-2 mb-4"
                style={{
                  color: '#5c3a21',
                  fontFamily: 'serif',
                  lineHeight: '1.7',
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
    </div>
  );
}

