'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, BookOpen, Loader2, Calendar, ImageOff } from 'lucide-react';

interface NoteArticle {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  thumbnail?: string;
}

interface NoteArticlesProps {
  username: string;
  maxItems?: number;
  className?: string;
}

/**
 * HTMLからog:image（サムネイル）を抽出
 */
const extractThumbnailFromHtml = (html: string): string | undefined => {
  // content内のimg srcを抽出
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1];
  }
  return undefined;
};

/**
 * noteの記事一覧を表示するコンポーネント
 * RSSフィードを使用して最新記事を取得
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
        
        const parsedArticles: NoteArticle[] = data.items.slice(0, maxItems).map((item: any) => {
          // サムネイルの取得を複数の方法で試行
          let thumbnail = item.thumbnail || item.enclosure?.link;
          
          // thumbnailが空の場合、contentからimgを抽出
          if (!thumbnail && item.content) {
            thumbnail = extractThumbnailFromHtml(item.content);
          }
          
          // descriptionからも試行
          if (!thumbnail && item.description) {
            thumbnail = extractThumbnailFromHtml(item.description);
          }
          
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
            thumbnail,
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
        <Loader2 className="h-8 w-8 animate-spin text-[#8b6914]" />
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {articles.map((article, index) => (
          <motion.a
            key={article.link}
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(61, 41, 20, 0.15)' }}
            className="block bg-[#fff8f0] rounded-lg border-2 border-[#d4c4a8] overflow-hidden group"
          >
            <div className="h-40 overflow-hidden bg-gradient-to-br from-[#e8f4e5] to-[#d4c4a8]">
              {article.thumbnail ? (
                <img
                  src={article.thumbnail}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    // 画像読み込みエラー時はプレースホルダーを表示
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                    const placeholder = document.createElement('div');
                    placeholder.innerHTML = '<svg class="h-12 w-12 text-[#8b7355] opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>';
                    target.parentElement?.appendChild(placeholder.firstChild!);
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageOff className="h-12 w-12 text-[#8b7355] opacity-50" />
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <img
                  src="https://assets.st-note.com/poc-image/manual/note-common-images/production/svg/logo_symbol__only-black.svg"
                  alt="note"
                  className="h-4 w-4"
                />
                <span className="text-xs text-[#8b7355] font-medium">note</span>
              </div>
              <h3 className="font-bold text-[#3d2914] line-clamp-2 mb-2 group-hover:text-[#8b6914] transition-colors">
                {article.title}
              </h3>
              <p className="text-sm text-[#5c3a21] line-clamp-2 mb-3">
                {article.description}
              </p>
              <div className="flex items-center justify-between text-xs text-[#8b7355]">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(article.pubDate).toLocaleDateString('ja-JP')}
                </div>
                <ExternalLink className="h-3 w-3 group-hover:text-[#8b6914] transition-colors" />
              </div>
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}

