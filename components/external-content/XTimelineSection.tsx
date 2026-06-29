'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ExternalLink, MessageCircle, Heart, Repeat2, Share } from 'lucide-react';

interface XTimelineSectionProps {
  username: string;
  className?: string;
}

/**
 * LP用 Xタイムラインセクション
 * 公式ウィジェットを使用（API不要）
 * 429エラー時はフォールバック表示
 */
export function XTimelineSection({ username, className = '' }: XTimelineSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;

  const loadTimeline = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);

      // Twitter ウィジェットスクリプトを読み込み（API不要）
      if (!(window as any).twttr) {
        const script = document.createElement('script');
        script.src = 'https://platform.twitter.com/widgets.js';
        script.async = true;
        script.charset = 'utf-8';
        document.body.appendChild(script);
        
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('スクリプトの読み込みに失敗しました'));
          // タイムアウト設定
          setTimeout(() => reject(new Error('タイムアウト')), 15000);
        });
      }

      // タイムラインを埋め込み
      if (containerRef.current && (window as any).twttr?.widgets) {
        containerRef.current.innerHTML = '';
        
        const timeline = await (window as any).twttr.widgets.createTimeline(
          {
            sourceType: 'profile',
            screenName: username,
          },
          containerRef.current,
          {
            height: 500,
            theme: 'light',
            lang: 'ja',
            dnt: true,
            chrome: 'noheader nofooter noborders transparent',
          }
        );
        
        if (!timeline) {
          throw new Error('タイムラインの作成に失敗');
        }
      }
    } catch (err) {
      console.error('Timeline埋め込みエラー:', err);
      // リトライ処理
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => loadTimeline(), 2000 * (retryCount + 1));
        return;
      }
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [username, retryCount]);

  useEffect(() => {
    if (username) {
      loadTimeline();
    }
  }, [username, loadTimeline]);

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
    <section className={`py-16 sm:py-24 px-4 sm:px-8 bg-[#f5e6d3] relative overflow-hidden ${className}`}>
      <ParchmentTexture opacity={0.15} />

      <div className="container mx-auto max-w-4xl relative z-10">
        {/* セクションヘッダー */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary" />
            <p className="px-5 py-1 text-xs sm:text-sm tracking-[0.25em] font-bold text-primary border border-primary/30 bg-muted/50">
              LATEST NEWS
            </p>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary" />
          </div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#3d2914] tracking-tight mt-4 font-serif">
            最新情報
          </h2>
          <p className="text-base sm:text-lg text-[#5c3a21] mt-4 font-semibold">
            Xで最新のお知らせをチェック
          </p>
        </motion.div>

        {/* タイムライン表示エリア */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="bg-[#fff8f0] rounded-xl border-2 border-[#d4c4a8] p-4 sm:p-6 shadow-lg"
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#d4c4a8]">
            <div className="flex items-center gap-3">
              <img
                src="https://res.cloudinary.com/dz9trbwma/image/upload/v1759308507/icons8-%E3%83%84%E3%82%A4%E3%83%83%E3%82%BF%E3%83%BCx-100_x18dc0.png"
                alt="X"
                className="h-8 w-8"
              />
              <div>
                <p className="font-bold text-[#3d2914]">@{username}</p>
                <p className="text-xs text-[#8b7355]">公式アカウント</p>
              </div>
            </div>
            <motion.a
              href={`https://x.com/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-sm font-bold hover:bg-gray-800 transition-colors"
            >
              フォローする
              <ExternalLink className="h-4 w-4" />
            </motion.a>
          </div>

          {/* タイムライン */}
          <div className="min-h-[400px] relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-[#8b6914]" />
              </div>
            )}
            
            {error && !loading && (
              <div className="flex flex-col items-center justify-center text-center py-8">
                {/* フォールバック: 直接リンクカード */}
                <div className="w-full max-w-md space-y-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <img
                        src="https://res.cloudinary.com/dz9trbwma/image/upload/v1759308507/icons8-%E3%83%84%E3%82%A4%E3%83%83%E3%82%BF%E3%83%BCx-100_x18dc0.png"
                        alt="X"
                        className="h-10 w-10"
                      />
                      <div className="text-left">
                        <p className="font-bold text-gray-900">TALE公式</p>
                        <p className="text-sm text-gray-500">@{username}</p>
                      </div>
                    </div>
                    <p className="text-gray-700 text-left mb-4">
                      大分県のイベント情報をお届け中！🎪<br/>
                      お祭り・マルシェ・ワークショップなど、週末のお出かけ情報をチェック✨
                    </p>
                    <div className="flex items-center gap-6 text-gray-400 text-sm mb-4">
                      <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /></span>
                      <span className="flex items-center gap-1"><Repeat2 className="h-4 w-4" /></span>
                      <span className="flex items-center gap-1"><Heart className="h-4 w-4" /></span>
                      <span className="flex items-center gap-1"><Share className="h-4 w-4" /></span>
                    </div>
                  </div>
                  
                  <motion.a
                    href={`https://x.com/${username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-black text-white rounded-full font-bold hover:bg-gray-800 transition-colors w-full justify-center"
                  >
                    <img
                      src="https://res.cloudinary.com/dz9trbwma/image/upload/v1759308507/icons8-%E3%83%84%E3%82%A4%E3%83%83%E3%82%BF%E3%83%BCx-100_x18dc0.png"
                      alt="X"
                      className="h-5 w-5 invert"
                    />
                    Xで最新情報をチェック
                    <ExternalLink className="h-4 w-4" />
                  </motion.a>
                  
                  <p className="text-xs text-[#8b7355]">
                    ※ 一時的に読み込みができない状態です
                  </p>
                </div>
              </div>
            )}
            
            <div 
              ref={containerRef} 
              className={`flex justify-center ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            />
          </div>
        </motion.div>

        {/* フォローCTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="text-center mt-8"
        >
          <motion.a
            href={`https://x.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)" }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-3 px-8 py-4 bg-black text-white rounded-full text-base font-bold hover:bg-gray-900 transition-all"
          >
            <img
              src="https://res.cloudinary.com/dz9trbwma/image/upload/v1759308507/icons8-%E3%83%84%E3%82%A4%E3%83%83%E3%82%BF%E3%83%BCx-100_x18dc0.png"
              alt="X"
              className="h-6 w-6 invert"
            />
            @{username} をフォロー
            <ExternalLink className="h-5 w-5" />
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}

