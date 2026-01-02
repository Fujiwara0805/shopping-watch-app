'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface XEmbedProps {
  tweetUrl: string;
  className?: string;
}

/**
 * X（旧Twitter）の投稿を埋め込むコンポーネント
 * oEmbed APIを使用
 */
export function XEmbed({ tweetUrl, className = '' }: XEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTweet = async () => {
      try {
        setLoading(true);
        setError(null);

        // Twitter ウィジェットスクリプトを読み込み
        if (!(window as any).twttr) {
          const script = document.createElement('script');
          script.src = 'https://platform.twitter.com/widgets.js';
          script.async = true;
          script.charset = 'utf-8';
          document.body.appendChild(script);
          
          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Twitterウィジェットの読み込みに失敗しました'));
          });
        }

        // ツイートを埋め込み
        if (containerRef.current && (window as any).twttr?.widgets) {
          containerRef.current.innerHTML = '';
          await (window as any).twttr.widgets.createTweet(
            extractTweetId(tweetUrl),
            containerRef.current,
            {
              theme: 'light',
              lang: 'ja',
              dnt: true,
            }
          );
        }
      } catch (err) {
        console.error('Tweet埋め込みエラー:', err);
        setError(err instanceof Error ? err.message : 'ツイートの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (tweetUrl) {
      loadTweet();
    }
  }, [tweetUrl]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`relative ${className}`}
    >
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#8b6914]" />
        </div>
      )}
      {error && (
        <div className="text-center py-8 text-[#5c3a21]">
          <p>{error}</p>
        </div>
      )}
      <div ref={containerRef} className="flex justify-center" />
    </motion.div>
  );
}

/**
 * ツイートURLからツイートIDを抽出
 */
function extractTweetId(url: string): string {
  const match = url.match(/status\/(\d+)/);
  return match ? match[1] : '';
}

interface XTimelineEmbedProps {
  username: string;
  height?: number;
  className?: string;
}

/**
 * Xのタイムラインを埋め込むコンポーネント
 */
export function XTimelineEmbed({ username, height = 400, className = '' }: XTimelineEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTimeline = async () => {
      try {
        setLoading(true);

        // Twitter ウィジェットスクリプトを読み込み
        if (!(window as any).twttr) {
          const script = document.createElement('script');
          script.src = 'https://platform.twitter.com/widgets.js';
          script.async = true;
          script.charset = 'utf-8';
          document.body.appendChild(script);
          
          await new Promise<void>((resolve) => {
            script.onload = () => resolve();
          });
        }

        // タイムラインを埋め込み
        if (containerRef.current && (window as any).twttr?.widgets) {
          containerRef.current.innerHTML = '';
          await (window as any).twttr.widgets.createTimeline(
            {
              sourceType: 'profile',
              screenName: username,
            },
            containerRef.current,
            {
              height,
              theme: 'light',
              lang: 'ja',
              dnt: true,
            }
          );
        }
      } catch (err) {
        console.error('Timeline埋め込みエラー:', err);
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      loadTimeline();
    }
  }, [username, height]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`relative ${className}`}
    >
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#8b6914]" />
        </div>
      )}
      <div ref={containerRef} className="flex justify-center" />
    </motion.div>
  );
}

