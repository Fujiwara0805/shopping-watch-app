'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ExternalLink } from 'lucide-react';

interface InstagramEmbedProps {
  postUrl: string;
  className?: string;
}

/**
 * Instagram投稿を埋め込むコンポーネント
 * oEmbed APIを使用
 */
export function InstagramEmbed({ postUrl, className = '' }: InstagramEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [embedHtml, setEmbedHtml] = useState<string | null>(null);

  useEffect(() => {
    const loadPost = async () => {
      try {
        setLoading(true);
        setError(null);

        // Instagram oEmbed API（CORS対応のプロキシ経由）
        const oEmbedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(postUrl)}&omitscript=true`;
        
        const response = await fetch(oEmbedUrl);
        
        if (!response.ok) {
          throw new Error('投稿の取得に失敗しました');
        }
        
        const data = await response.json();
        setEmbedHtml(data.html);

        // Instagram埋め込みスクリプトを読み込み
        if (!(window as any).instgrm) {
          const script = document.createElement('script');
          script.src = 'https://www.instagram.com/embed.js';
          script.async = true;
          document.body.appendChild(script);
          
          await new Promise<void>((resolve) => {
            script.onload = () => resolve();
          });
        }

        // 埋め込みを処理
        setTimeout(() => {
          if ((window as any).instgrm?.Embeds) {
            (window as any).instgrm.Embeds.process();
          }
        }, 100);

      } catch (err) {
        console.error('Instagram埋め込みエラー:', err);
        setError(err instanceof Error ? err.message : '投稿の読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (postUrl) {
      loadPost();
    }
  }, [postUrl]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`relative ${className}`}
    >
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {error && (
        <div className="text-center py-8 text-[#5c3a21]">
          <p>{error}</p>
          <a 
            href={postUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-primary hover:underline"
          >
            Instagramで見る <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )}
      {embedHtml && (
        <div 
          ref={containerRef}
          className="flex justify-center"
          dangerouslySetInnerHTML={{ __html: embedHtml }}
        />
      )}
    </motion.div>
  );
}

interface InstagramFeedProps {
  username: string;
  className?: string;
}

/**
 * Instagramフィードへのリンクカード
 * （APIの制限により、直接フィードを取得することは困難なため、リンクカードとして実装）
 */
export function InstagramFeedCard({ username, className = '' }: InstagramFeedProps) {
  return (
    <motion.a
      href={`https://www.instagram.com/${username}/`}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(61, 41, 20, 0.15)' }}
      className={`block bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] p-1 rounded-xl ${className}`}
    >
      <div className="bg-[#fff8f0] rounded-lg p-6 flex items-center gap-4">
        <div className="flex-shrink-0">
          <img
            src="https://res.cloudinary.com/dz9trbwma/image/upload/v1759308496/icons8-%E3%82%A4%E3%83%B3%E3%82%B9%E3%82%BF%E3%82%AF%E3%82%99%E3%83%A9%E3%83%A0-100_idedfz.png"
            alt="Instagram"
            className="h-12 w-12"
          />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-[#3d2914] text-lg">@{username}</h3>
          <p className="text-sm text-[#5c3a21]">Instagramをフォロー</p>
        </div>
        <ExternalLink className="h-5 w-5 text-primary" />
      </div>
    </motion.a>
  );
}

