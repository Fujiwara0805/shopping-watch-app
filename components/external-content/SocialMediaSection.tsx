'use client';

import { motion } from 'framer-motion';
import { ExternalLink, Newspaper, BookOpen } from 'lucide-react';
import { NoteArticles } from './NoteArticles';
import { InstagramFeedCard } from './InstagramEmbed';
import { COLORS } from '@/lib/constants/colors';

interface SocialMediaSectionProps {
  noteUsername?: string;
  instagramUsername?: string;
  xUsername?: string;
  className?: string;
}

/**
 * LP用ソーシャルメディアセクション
 * note記事、Instagram、Xへのリンクを統合表示
 */
export function SocialMediaSection({
  noteUsername = 'tokudoku',
  instagramUsername = 'tokudoku_nobody',
  xUsername,
  className = '',
}: SocialMediaSectionProps) {
  return (
    <section className={`py-16 sm:py-24 px-4 sm:px-8 bg-[#e8f4e5] relative overflow-hidden ${className}`}>
      {/* 背景装飾 */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="container mx-auto max-w-6xl relative z-10">
        {/* セクションヘッダー */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#8b6914]" />
            <p className="px-5 py-1 text-xs sm:text-sm tracking-[0.25em] font-bold text-[#8b6914] border border-[#8b6914]/30 bg-[#fff8f0]/50">
              NEWS & UPDATES
            </p>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#8b6914]" />
          </div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#3d2914] tracking-tight mt-4 font-serif">
            最新情報
          </h2>
          <p className="text-base sm:text-lg text-[#5c3a21] mt-4 font-semibold">
            トクドクの最新ニュースをチェック
          </p>
        </motion.div>

        {/* noteセクション */}
        {noteUsername && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[#fff8f0] rounded-lg border border-[#d4c4a8]">
                <BookOpen className="h-5 w-5 text-[#8b6914]" />
              </div>
              <h3 className="text-xl font-bold text-[#3d2914]">noteで記事を公開中</h3>
              <a
                href={`https://note.com/${noteUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-sm text-[#8b6914] hover:underline flex items-center gap-1"
              >
                すべて見る <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <NoteArticles username={noteUsername} maxItems={3} />
          </motion.div>
        )}

        {/* SNSリンクカード */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Instagram */}
          {instagramUsername && (
            <InstagramFeedCard username={instagramUsername} />
          )}

          {/* X (Twitter) */}
          {xUsername && (
            <motion.a
              href={`https://x.com/${xUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(61, 41, 20, 0.15)' }}
              className="block bg-[#fff8f0] rounded-xl border-2 border-[#d4c4a8] p-6 flex items-center gap-4"
            >
              <div className="flex-shrink-0">
                <img
                  src="https://res.cloudinary.com/dz9trbwma/image/upload/v1759308507/icons8-%E3%83%84%E3%82%A4%E3%83%83%E3%82%BF%E3%83%BCx-100_x18dc0.png"
                  alt="X"
                  className="h-12 w-12"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#3d2914] text-lg">@{xUsername}</h3>
                <p className="text-sm text-[#5c3a21]">Xをフォロー</p>
              </div>
              <ExternalLink className="h-5 w-5 text-[#8b6914]" />
            </motion.a>
          )}

          {/* Instagramのみの場合、Xリンクがなければ全幅表示 */}
          {instagramUsername && !xUsername && (
            <div className="hidden md:block" /> 
          )}
        </motion.div>
      </div>
    </section>
  );
}

