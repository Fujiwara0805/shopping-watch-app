'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion';
import { MapPin, Menu, X, ChevronRight, Calendar, LogOut, Search, Layers, Map, Users, ArrowRight, Compass, ExternalLink, Sparkles, Route, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession, signOut } from 'next-auth/react';
import { getPublicMaps } from '@/app/_actions/maps';
import { getPublicSpots } from '@/app/_actions/spots';
import type { SpotWithAuthor } from '@/types/spot';
import { NoteArticlesSection } from '@/components/external-content';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { designTokens, OITA_MUNICIPALITIES, TARGET_AUDIENCE_OPTIONS } from '@/lib/constants';
import { useFeedback } from '@/lib/contexts/feedback-context';
import { FeedbackModal } from '@/components/feedback/feedback-modal';

// ===================================================================
// TYPE DEFINITIONS
// ===================================================================

interface PublicMapData {
  id: string;
  title: string;
  locations: any[];
  created_at: string;
  hashtags: string[] | null;
  app_profile_id: string;
  cover_image_url: string | null;
  total_locations: number;
  author_name: string;
  author_avatar_path: string | null;
}

// ===================================================================
// DECORATIVE COMPONENTS
// ===================================================================

// 有機的グラデーションメッシュ背景
const OrganicMeshBackground = ({ variant = 'mist' }: { variant?: 'mist' | 'cloud' | 'primary' }) => {
  const backgrounds = {
    mist: designTokens.colors.background.mist,
    cloud: designTokens.colors.background.cloud,
    primary: designTokens.colors.primary.base,
  };
  
  const isDark = variant === 'primary';
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base */}
      <div 
        className="absolute inset-0"
        style={{ background: backgrounds[variant] }}
      />
      
      {/* Animated Mesh Orbs */}
      <motion.div
        animate={{
          x: [0, 40, 0],
          y: [0, -30, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2"
        style={{
          background: isDark
            ? `radial-gradient(circle, ${designTokens.colors.accent.gold}20 0%, transparent 70%)`
            : `radial-gradient(circle, ${designTokens.colors.secondary.fern}15 0%, transparent 70%)`,
          filter: 'blur(80px)',
        }}
      />
      
      <motion.div
        animate={{
          x: [0, -50, 0],
          y: [0, 40, 0],
          scale: [1.1, 1, 1.1],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-1/4 -right-1/4 w-2/3 h-2/3"
        style={{
          background: isDark
            ? `radial-gradient(circle, ${designTokens.colors.accent.lilac}15 0%, transparent 70%)`
            : `radial-gradient(circle, ${designTokens.colors.secondary.stone}25 0%, transparent 70%)`,
          filter: 'blur(100px)',
        }}
      />
      
      <motion.div
        animate={{
          x: [0, 30, 0],
          y: [0, 50, 0],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/3 right-1/4 w-1/3 h-1/3"
        style={{
          background: isDark
            ? `radial-gradient(circle, ${designTokens.colors.primary.light}10 0%, transparent 70%)`
            : `radial-gradient(circle, ${designTokens.colors.accent.lilac}10 0%, transparent 70%)`,
          filter: 'blur(60px)',
        }}
      />
      
      {/* Subtle Noise Texture */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

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
      className="inline-block text-xs lg:text-sm font-semibold tracking-[0.3em] uppercase"
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
  style: styleOverride,
}: { 
  children: React.ReactNode; 
  className?: string;
  elevation?: 'subtle' | 'low' | 'medium' | 'high';
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  style?: React.CSSProperties;
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
        ...styleOverride,
      }}
    >
      {children}
    </motion.div>
  );
};

// ===================================================================
// HERO SECTION
// ===================================================================

// Hero背景画像URL
const HERO_BG_IMAGE = 'https://res.cloudinary.com/dz9trbwma/image/upload/v1770102249/Gemini_Generated_Image_tlb61atlb61atlb6_mtlugk.png';

const HeroSection = ({
  onStart,
  onEventSearch,
  city,
  setCity,
  target,
  setTarget,
}: {
  onStart: () => void;
  onEventSearch: (params: { city: string; target: string }) => void;
  city: string;
  setCity: (v: string) => void;
  target: string;
  setTarget: (v: string) => void;
}) => {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.6], [0, 100]);
  const scale = useTransform(scrollYProgress, [0, 0.6], [1, 0.96]);
  
  // パララックス効果用
  const bgY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  return (
    <section 
      ref={heroRef} 
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ marginTop: '-4px' }}
    >
      {/* Background Image with Parallax */}
      <motion.div 
        className="absolute inset-0 z-0"
        style={{ y: bgY, scale: bgScale }}
      >
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: `url(${HERO_BG_IMAGE})`,
            backgroundPosition: 'center 30%',
          }}
        />
        
        {/* Gradient Overlay - 白色を濃くして背景画像を適度に覆う */}
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(
              180deg,
              ${designTokens.colors.background.white}E6 0%,
              ${designTokens.colors.background.white}D9 25%,
              ${designTokens.colors.background.white}CC 50%,
              ${designTokens.colors.background.white}D9 75%,
              ${designTokens.colors.background.white}F2 100%
            )`,
          }}
        />
        
        {/* サイドのビネット効果（白をやや濃く） */}
        <div 
          className="absolute inset-0"
          style={{
            background: `radial-gradient(
              ellipse at center,
              transparent 0%,
              transparent 45%,
              ${designTokens.colors.background.white}60 100%
            )`,
          }}
        />
        
        {/* カラーアクセントオーバーレイ */}
        <div 
          className="absolute inset-0 mix-blend-soft-light opacity-30"
          style={{
            background: `linear-gradient(
              135deg,
              ${designTokens.colors.accent.gold}40 0%,
              transparent 50%,
              ${designTokens.colors.accent.lilac}30 100%
            )`,
          }}
        />
      </motion.div>

      {/* Animated Accent Orbs (背景の上に配置) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
        <motion.div
          animate={{
            x: [0, 40, 0],
            y: [0, -30, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2"
          style={{
            background: `radial-gradient(circle, ${designTokens.colors.accent.gold}15 0%, transparent 70%)`,
            filter: 'blur(80px)',
          }}
        />
        
        <motion.div
          animate={{
            x: [0, -50, 0],
            y: [0, 40, 0],
            scale: [1.1, 1, 1.1],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-1/4 -right-1/4 w-2/3 h-2/3"
          style={{
            background: `radial-gradient(circle, ${designTokens.colors.accent.lilac}12 0%, transparent 70%)`,
            filter: 'blur(100px)',
          }}
        />
      </div>

      {/* Main Content */}
      <motion.div 
        style={{ opacity, y, scale }} 
        className="relative z-10 container mx-auto max-w-5xl lg:max-w-6xl xl:max-w-7xl px-6 pt-28 pb-20"
      >
        {/* コンテンツ背景のグラス効果（モバイル対応） */}
        <div 
          className="absolute inset-0 -mx-6 rounded-3xl hidden md:block"
          style={{
            background: `${designTokens.colors.background.white}60`,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            margin: '-20px',
            padding: '20px',
          }}
        />
        <div className="text-center space-y-8 relative z-10">
          
          {/* Micro Label */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium"
              style={{
                background: `${designTokens.colors.accent.gold}20`,
                color: designTokens.colors.accent.goldDark,
                fontFamily: designTokens.typography.body,
              }}
            >
              <Compass className="w-4 h-4" />
              Preserve &amp; Discover Oita&apos;s Heritage
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-semibold leading-[1.1] tracking-tight"
            style={{
              fontFamily: designTokens.typography.display,
              color: designTokens.colors.text.primary,
            }}
          >
            大分の魅力を発信
            <br />
            <span className="relative inline-block mt-2">
              <span className="relative z-10">県内のイベントを探そう</span>
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: 1.2 }}
                className="absolute bottom-2 left-0 right-0 h-4 -z-10 origin-left rounded-sm"
                style={{ background: `${designTokens.colors.accent.gold}50` }}
              />
            </span>
          </motion.h1>


          {/* Search Form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="max-w-md md:max-w-2xl mx-auto mt-8"
          >
            <ElevationCard elevation="high" padding="md" hover={false} style={{ background: '#999da8' }}>
              {/* PC: 横並び / モバイル: 縦並び */}
              <div className="space-y-3 md:space-y-0 md:flex md:items-end md:gap-4">
                {/* Area Select */}
                <div className="space-y-1.5 text-left md:flex-1">
                  <Label
                    className="text-xs font-semibold tracking-wide"
                    style={{ color: 'rgba(255,255,255,0.95)' }}
                  >
                    エリア
                  </Label>
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger
                      className="h-10 rounded-lg text-sm"
                      style={{
                        borderColor: `${designTokens.colors.secondary.stone}50`,
                        backgroundColor: designTokens.colors.background.mist,
                        color: designTokens.colors.text.primary,
                      }}
                    >
                      <SelectValue placeholder="大分県内の市町村" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">すべてのエリア</SelectItem>
                      {OITA_MUNICIPALITIES.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Target Audience */}
                <div className="space-y-1.5 text-left md:flex-1">
                  <Label
                    className="text-xs font-semibold tracking-wide"
                    style={{ color: 'rgba(255,255,255,0.95)' }}
                  >
                    対象者（任意）
                  </Label>
                  <Select value={target} onValueChange={setTarget}>
                    <SelectTrigger
                      className="h-10 rounded-lg text-sm"
                      style={{
                        borderColor: `${designTokens.colors.secondary.stone}50`,
                        backgroundColor: designTokens.colors.background.mist,
                        color: designTokens.colors.text.primary,
                      }}
                    >
                      <SelectValue placeholder="指定なし" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {TARGET_AUDIENCE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1 md:pt-0 md:flex-shrink-0">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCity('all');
                      setTarget('none');
                    }}
                    className="flex-1 md:flex-initial h-10 rounded-lg text-sm font-medium transition-all hover:bg-opacity-10 md:px-4"
                    style={{
                      borderColor: designTokens.colors.secondary.stone,
                      color: designTokens.colors.text.secondary,
                    }}
                  >
                    クリア
                  </Button>
                  <Button
                    onClick={() => onEventSearch({
                      city: city === 'all' ? '' : city,
                      target: target === 'none' ? '' : target,
                    })}
                    className="flex-1 md:flex-initial h-10 rounded-lg text-sm font-semibold transition-all hover:opacity-90 md:px-6"
                    style={{
                      background: designTokens.colors.accent.lilac,
                      color: designTokens.colors.text.inverse,
                    }}
                  >
                    <Search className="w-3.5 h-3.5 mr-1.5" />
                    イベントを探す
                  </Button>
                </div>
              </div>
            </ElevationCard>
          </motion.div>

          {/* Secondary CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="pt-6"
          >
            <motion.button
              whileHover={{ scale: 1.03, y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStart}
              className="group inline-flex items-center gap-3 px-10 py-5 lg:px-12 lg:py-6 lg:text-lg rounded-full font-semibold text-base transition-all"
              style={{
                background: designTokens.colors.accent.gold,
                color: designTokens.colors.text.primary,
                boxShadow: `0 8px 32px ${designTokens.colors.accent.gold}50`,
              }}
            >
              <Map className="w-5 h-5" />
              地図から探す
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </motion.button>
            <p
              className="text-sm lg:text-base mt-4"
              style={{ color: designTokens.colors.text.muted }}
            >
              登録不要 ー 30秒で周辺イベントが見つかる
            </p>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col items-center"
            style={{ color: designTokens.colors.text.muted }}
          >
            <span className="text-[10px] font-semibold tracking-[0.2em] mb-2">SCROLL</span>
            <div className="w-5 h-8 rounded-full border-2 border-current flex justify-center pt-1">
              <motion.div
                animate={{ y: [0, 8, 0], opacity: [1, 0, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-1 h-2 rounded-full bg-current"
              />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
};

// ===================================================================
// CHALLENGES SECTION
// ===================================================================

const ChallengesSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  const challenges = [
    {
      imageUrl: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1770516535/Gemini_Generated_Image_n5dwvwn5dwvwn5dw_nq711a.png',
      title: '5年後も、10年後も続くように',
      description: '県内のお祭りやイベントがこれから5年後、10年後、20年後も続くように、情報を発信していきたい。',
    },
    {
      imageUrl: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1770516535/Gemini_Generated_Image_sauq56sauq56sauq_bgou7c.png',
      title: '「自分だけの旅」を求めて',
      description: 'ツアーではなく、自分のペースで巡りたい。一人旅もインバウンド旅行者も、本当に欲しいのは「地元の人だけが知る、生きた情報」。',
    },
    {
      imageUrl: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1770516536/Gemini_Generated_Image_tgqneqtgqneqtgqn_ekswrm.png',
      title: 'まだ誰も見つけていない名所',
      description: '大分には、ガイドブックに載っていない絶景スポットや穴場がまだまだ眠っている。あなたの「発見」が、次の人気スポットになる。',
    },
  ];

  return (
    <section 
      ref={sectionRef}
      className="py-24 sm:py-32 lg:py-40 px-6 relative overflow-hidden"
      style={{ background: designTokens.colors.background.cloud }}
    >
      <div className="container mx-auto max-w-4xl lg:max-w-5xl xl:max-w-6xl relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20 lg:mb-24">
          <SectionLabel>Challenges</SectionLabel>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-4 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight"
            style={{
              fontFamily: designTokens.typography.display,
              color: designTokens.colors.primary.base,
            }}
          >
            もっと多くの人に
            <br />
            大分の魅力を届けたい
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg lg:text-xl max-w-2xl lg:max-w-3xl mx-auto leading-relaxed"
            style={{
              fontFamily: designTokens.typography.body,
              color: designTokens.colors.text.secondary,
            }}
          >
            各々の市町村が独自の観光サイトで魅力的な情報を発信していますが、
            <br className="hidden sm:block" />
            大分県内の魅力を一括で検索できるサイトがあれば、もっと多くの人に大分の魅力を届けられるのではないかと考えました。
          </motion.p>
        </div>

        {/* Challenges List - PC: 3列グリッド・画像・テキスト大きく / モバイル: 縦並び */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 lg:gap-10">
          {challenges.map((challenge, index) => (
            <motion.div
              key={challenge.title}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
            >
              <ElevationCard elevation="low" padding="none" hover={true} className="overflow-hidden h-full">
                <div className="aspect-[4/3] lg:aspect-[5/4] w-full overflow-hidden bg-white/80">
                  <img
                    src={challenge.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="px-5 sm:px-6 lg:px-8 py-5 sm:py-6 lg:py-8 text-center">
                  <h3
                    className="text-lg sm:text-xl lg:text-2xl font-semibold mb-3"
                    style={{
                      fontFamily: designTokens.typography.display,
                      color: designTokens.colors.primary.base,
                    }}
                  >
                    {challenge.title}
                  </h3>
                  <p
                    className="text-sm sm:text-base lg:text-lg leading-relaxed text-center"
                    style={{
                      fontFamily: designTokens.typography.body,
                      color: designTokens.colors.text.secondary,
                    }}
                  >
                    {challenge.description}
                  </p>
                </div>
              </ElevationCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ===================================================================
// SOLUTION SECTION
// ===================================================================

const SolutionSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  const solutions = [
    {
      label: 'PRESERVE',
      title: '週末のイベント、もう見逃さない',
      description: '大分県内のイベント・祭り・マルシェをリアルタイムで集約。「知らなかった」を「行ってきた！」に変える。地域の文化を未来へつなぎます。',
      icon: <Sparkles className="w-5 h-5" />,
      color: designTokens.colors.accent.lilac,
    },
    {
      label: 'DISCOVER',
      title: 'あなたの「お気に入り」が名所になる',
      description: '地元の人だからこそ知っている穴場をマップに登録。みんなの「発見」が集まると、まだ誰も知らない新しい名所が生まれます。',
      icon: <MapPin className="w-5 h-5" />,
      color: designTokens.colors.secondary.fern,
    },
    {
      label: 'EXPLORE',
      title: '一人旅でも大分を存分に楽しめる情報を届けたい',
      description: '各市町村のモデルコースやスタンプラリーなど、地図を必要とする情報を一覧で集約。一人旅や海外からの旅行者の方でも、大分を存分に楽しめる情報をお届けします。',
      icon: <Route className="w-5 h-5" />,
      color: designTokens.colors.accent.gold,
    },
  ];

  return (
    <section 
      ref={sectionRef}
      className="py-24 sm:py-32 lg:py-40 px-6 relative overflow-hidden"
      style={{ background: designTokens.colors.background.mist }}
    >
      <OrganicMeshBackground variant="mist" />
      
      <div className="container mx-auto max-w-5xl lg:max-w-6xl relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20 lg:mb-24">
          <SectionLabel>Solution</SectionLabel>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-4 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight"
            style={{
              fontFamily: designTokens.typography.display,
              color: designTokens.colors.primary.base,
            }}
          >
            大切な思い出を
            <br />
            後世まで語り続けたい
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg lg:text-xl max-w-2xl lg:max-w-3xl mx-auto leading-relaxed"
            style={{
              fontFamily: designTokens.typography.body,
              color: designTokens.colors.text.secondary,
            }}
          >
            地域イベント情報の発信から、地元の人だけが知っているスポットの発見まで。
            <br className="hidden sm:block" />
            あなたと一緒に作り上げていく大分の魅力を発信するサービスを作りました。
          </motion.p>
        </div>

        {/* Solutions Grid - PC: 3列・テキスト大きく / モバイル: 縦並び */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 xl:gap-10">
          {solutions.map((solution, index) => (
            <motion.div
              key={solution.label}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 + index * 0.15 }}
            >
              <ElevationCard
                elevation="medium"
                padding="lg"
                className="relative overflow-hidden group h-full"
              >
                {/* Background Accent */}
                <div 
                  className="absolute top-0 right-0 w-72 h-72 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity duration-500"
                  style={{
                    background: `radial-gradient(circle at top right, ${solution.color} 0%, transparent 70%)`,
                  }}
                />
                
                <div className="relative z-10">
                  <span 
                    className="text-xs font-bold tracking-[0.2em] mb-2 block"
                    style={{ color: solution.color }}
                  >
                    {solution.label}
                  </span>
                  {/* タイトルの横に小さなアイコンを配置（モバイルでも同様） */}
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
                      style={{ 
                        background: `${solution.color}18`,
                        color: solution.color,
                      }}
                    >
                      {solution.icon}
                    </div>
                    <h3 
                      className="text-lg sm:text-xl md:text-2xl lg:text-2xl font-semibold leading-tight min-w-0"
                      style={{ 
                        fontFamily: designTokens.typography.display,
                        color: designTokens.colors.primary.base,
                      }}
                    >
                      {solution.title}
                    </h3>
                  </div>
                  <p 
                    className="text-base lg:text-lg leading-relaxed max-w-xl"
                    style={{ 
                      fontFamily: designTokens.typography.body,
                      color: designTokens.colors.text.secondary,
                    }}
                  >
                    {solution.description}
                  </p>
                </div>
                
                {/* Bottom Accent Line */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-1 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
                  style={{ background: solution.color }}
                />
              </ElevationCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ===================================================================
// SPOTS SECTION
// ===================================================================

const SpotsSection = () => {
  const router = useRouter();
  const [spots, setSpots] = useState<SpotWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  useEffect(() => {
    fetchSpots();
  }, []);

  const fetchSpots = async () => {
    try {
      const { spots: fetchedSpots, error } = await getPublicSpots(6);
      if (error) throw new Error(error);
      setSpots(fetchedSpots);
    } catch (error: any) {
      console.error('スポット取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      ref={sectionRef}
      className="py-24 sm:py-32 lg:py-40 px-6 relative overflow-hidden"
      style={{ background: designTokens.colors.background.cloud }}
    >
      <div className="container mx-auto max-w-5xl lg:max-w-6xl relative z-10">
        <div className="text-center mb-16 lg:mb-20">
          <SectionLabel>Spots</SectionLabel>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-4 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight"
            style={{
              fontFamily: designTokens.typography.display,
              color: designTokens.colors.primary.base,
            }}
          >
            あなたのお気に入りの
            <br />
            場所を紹介しよう。
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg lg:text-xl max-w-2xl lg:max-w-3xl mx-auto leading-relaxed"
            style={{
              fontFamily: designTokens.typography.body,
              color: designTokens.colors.text.secondary,
            }}
          >
            あなたのお気に入りスポットを地図に登録することができます。
            <br className="hidden sm:block" />
            一人の発見がたくさんの人の思い出になります。
          </motion.p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 border-2 rounded-full"
              style={{
                borderColor: `${designTokens.colors.secondary.stone}50`,
                borderTopColor: designTokens.colors.secondary.fern,
              }}
            />
          </div>
        ) : spots.length === 0 ? null : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {spots.map((spot, index) => (
              <motion.div
                key={spot.id}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <ElevationCard elevation="medium" padding="none" className="overflow-hidden h-full group">
                  <div className="relative overflow-hidden h-48 lg:h-56">
                    {spot.image_urls && spot.image_urls.length > 0 ? (
                      <img
                        src={spot.image_urls[0]}
                        alt={spot.store_name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: designTokens.colors.background.cloud }}
                      >
                        <MapPin className="w-12 h-12 lg:w-14 lg:h-14" style={{ color: designTokens.colors.text.muted }} />
                      </div>
                    )}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: `linear-gradient(to top, ${designTokens.colors.primary.base}50, transparent)` }}
                    />
                  </div>
                  <div className="p-5 lg:p-6">
                    <h3
                      className="font-semibold text-base lg:text-lg mb-2 line-clamp-1"
                      style={{
                        fontFamily: designTokens.typography.display,
                        color: designTokens.colors.primary.base,
                      }}
                    >
                      {spot.store_name}
                    </h3>
                    <p
                      className="text-sm lg:text-base line-clamp-2 mb-3"
                      style={{ color: designTokens.colors.text.secondary }}
                    >
                      {spot.description}
                    </p>
                    <div
                      className="flex items-center text-xs lg:text-sm"
                      style={{ color: designTokens.colors.text.muted }}
                    >
                      <Users className="w-3.5 h-3.5 lg:w-4 lg:h-4 mr-1.5" />
                      {spot.author_name}
                    </div>
                  </div>
                </ElevationCard>
              </motion.div>
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center mt-12"
        >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/create-spot')}
              className="group inline-flex items-center gap-2 px-8 py-4 lg:px-10 lg:py-5 lg:text-lg rounded-full font-semibold transition-all"
              style={{
                background: designTokens.colors.secondary.fern,
                color: designTokens.colors.text.inverse,
                boxShadow: `0 8px 32px ${designTokens.colors.secondary.fern}40`,
              }}
            >
              <MapPin className="w-5 h-5" />
              スポットを登録する
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </motion.button>
          </motion.div>
      </div>
    </section>
  );
};

// ===================================================================
// MODEL COURSE SECTION (Public Maps)
// ===================================================================

const ModelCourseSection = ({ onMapClick }: { onMapClick: (mapId: string) => void }) => {
  const router = useRouter();
  const [publicMaps, setPublicMaps] = useState<PublicMapData[]>([]);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchPublicMaps();
  }, []);

  const fetchPublicMaps = async () => {
    try {
      const { maps, error } = await getPublicMaps(6);
      if (error) throw new Error(error);
      
      const mapsWithMetadata: PublicMapData[] = maps.map((map: any) => ({
        id: map.id,
        title: map.title,
        locations: map.locations || [],
        created_at: map.created_at,
        hashtags: map.hashtags,
        app_profile_id: map.app_profile_id,
        cover_image_url: map.cover_image_url,
        total_locations: map.total_locations,
        author_name: map.author_name,
        author_avatar_path: map.author_avatar_path,
      }));
      
      setPublicMaps(mapsWithMetadata);
    } catch (error: any) {
      console.error('公開マップ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 最大3件まで表示。1件は中央、2件は2列、3件は3列
  const displayedMaps = publicMaps.slice(0, 3);

  return (
    <section 
      ref={sectionRef}
      className="py-24 sm:py-32 lg:py-40 px-6 relative overflow-hidden"
      style={{ background: designTokens.colors.background.cloud }}
    >
      <div className="container mx-auto max-w-6xl xl:max-w-7xl relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 lg:mb-20">
          <SectionLabel>Model Course</SectionLabel>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-4 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight"
            style={{
              fontFamily: designTokens.typography.display,
              color: designTokens.colors.primary.base,
            }}
          >
            魅力的なルートを
            <br />
            探索しに出かけよう。
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg lg:text-xl max-w-2xl lg:max-w-3xl mx-auto leading-relaxed"
            style={{
              fontFamily: designTokens.typography.body,
              color: designTokens.colors.text.secondary,
            }}
          >
            観光サイトでまとめられているモデルコースやスタンプラリーイベント、あなたが作成したおすすめルートまで、情報を掲載・閲覧できます。
            <br className="hidden sm:block" />
            自治体の方はもちろん、個人で地図を作成することが可能です。
          </motion.p>
        </div>

        {/* Maps Display - 最大3件。1件:中央 / 2件:2列 / 3件:3列 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
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
        ) : publicMaps.length === 0 ? (
          <ElevationCard elevation="low" padding="xl" hover={false} className="max-w-md mx-auto text-center">
            <Map className="w-12 h-12 mx-auto mb-4" style={{ color: designTokens.colors.text.muted }} />
            <p style={{ color: designTokens.colors.text.secondary }}>まだマップが投稿されていません</p>
          </ElevationCard>
        ) : isMobile ? (
          /* Mobile: Swipeable Cards（最大3件） */
          <div className="overflow-x-auto pb-4 -mx-6 px-6 snap-x snap-mandatory flex gap-4 scrollbar-hide">
            {displayedMaps.map((map, index) => (
              <motion.div
                key={map.id}
                initial={{ opacity: 0, x: 30 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                onClick={() => onMapClick(map.id)}
                className="snap-center flex-shrink-0 w-[80vw] max-w-sm cursor-pointer"
              >
                <MapCard map={map} />
              </motion.div>
            ))}
          </div>
        ) : (
          /* Desktop: 1件=中央 / 2件=2列 / 3件=3列 */
          <div
            className={
              displayedMaps.length === 1
                ? 'flex justify-center'
                : displayedMaps.length === 2
                  ? 'grid grid-cols-2 gap-6 lg:gap-8 max-w-3xl xl:max-w-4xl mx-auto'
                  : 'grid grid-cols-3 gap-6 lg:gap-8'
            }
          >
            {displayedMaps.map((map, index) => (
              <motion.div
                key={map.id}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                onClick={() => onMapClick(map.id)}
                className={`cursor-pointer ${displayedMaps.length === 1 ? 'w-full max-w-md' : ''}`}
              >
                <MapCard map={map} />
              </motion.div>
            ))}
          </div>
        )}

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center mt-12 lg:mt-16"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/courses')}
            className="group inline-flex items-center gap-2 px-8 py-4 lg:px-10 lg:py-5 lg:text-lg rounded-full font-semibold transition-all"
            style={{ 
              border: `2px solid ${designTokens.colors.accent.lilac}60`,
              color: designTokens.colors.accent.lilacDark,
              background: `${designTokens.colors.accent.lilac}10`,
            }}
          >
            すべてのモデルコースを見る
            <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

// Map Card Component（PCでは全カード同一サイズ）
const MapCard = ({ map }: { map: PublicMapData }) => (
  <ElevationCard 
    elevation="medium" 
    padding="none" 
    className="overflow-hidden h-full group min-h-[300px] lg:min-h-[360px]"
  >
    {/* Cover Image */}
    <div className="relative overflow-hidden h-3/5 lg:min-h-[220px]">
      {map.cover_image_url ? (
        <img
          src={map.cover_image_url}
          alt={map.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div 
          className="w-full h-full flex items-center justify-center"
          style={{ background: designTokens.colors.background.cloud }}
        >
          <Map className="w-12 h-12 lg:w-14 lg:h-14" style={{ color: designTokens.colors.text.muted }} />
        </div>
      )}
      
      {/* Spots Badge */}
      <div 
        className="absolute top-4 left-4 lg:top-5 lg:left-5 px-3 py-1.5 lg:px-4 lg:py-2 rounded-full text-xs lg:text-sm font-semibold flex items-center gap-1.5"
        style={{ 
          background: 'rgba(255,255,255,0.95)',
          color: designTokens.colors.primary.base,
          boxShadow: designTokens.elevation.low,
        }}
      >
        <MapPin className="w-3.5 h-3.5 lg:w-4 lg:h-4" style={{ color: designTokens.colors.accent.lilac }} />
        {map.total_locations || 0}スポット
      </div>
      
      {/* Hover Overlay */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(to top, ${designTokens.colors.primary.base}50, transparent)` }}
      />
    </div>

    {/* Content */}
    <div className="p-5 lg:p-6">
      <h3 
        className="font-semibold mb-2 line-clamp-2 transition-colors text-base lg:text-lg"
        style={{ 
          fontFamily: designTokens.typography.display,
          color: designTokens.colors.primary.base,
        }}
      >
        {map.title}
      </h3>
      
      {map.hashtags && map.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {map.hashtags.slice(0, 2).map((tag, i) => (
            <span 
              key={i} 
              className="text-xs lg:text-sm px-2 py-0.5 rounded-full"
              style={{ 
                background: `${designTokens.colors.secondary.fern}15`,
                color: designTokens.colors.secondary.fern,
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div 
        className="flex items-center text-xs lg:text-sm"
        style={{ color: designTokens.colors.text.muted }}
      >
        <Calendar className="w-3.5 h-3.5 lg:w-4 lg:h-4 mr-1.5" />
        {new Date(map.created_at).toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
      </div>
    </div>
  </ElevationCard>
);

// ===================================================================
// FINAL CTA SECTION
// ===================================================================

const FinalCTASection = ({ onStart }: { onStart: () => void }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section 
      ref={sectionRef}
      className="py-32 sm:py-40 lg:py-48 px-6 relative overflow-hidden"
      style={{ background: designTokens.colors.primary.base }}
    >
      <OrganicMeshBackground variant="primary" />

      <div className="container mx-auto max-w-3xl lg:max-w-4xl relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="space-y-8 lg:space-y-10"
        >
          <span 
            className="inline-block text-xs lg:text-sm font-semibold tracking-[0.3em] uppercase"
            style={{ color: designTokens.colors.accent.gold }}
          >
            Get Started
          </span>

          <h2
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight"
            style={{
              fontFamily: designTokens.typography.display,
              color: designTokens.colors.text.inverse,
            }}
          >
            大分を楽しもう!
          </h2>

          <p
            className="text-lg lg:text-xl max-w-md lg:max-w-lg mx-auto"
            style={{ color: `${designTokens.colors.text.inverse}90` }}
          >
            完全無料・登録不要で、今すぐスタート。
          </p>

          <motion.button
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.97 }}
            onClick={onStart}
            className="group inline-flex items-center gap-3 px-12 py-5 lg:px-16 lg:py-6 rounded-xl font-semibold text-lg lg:text-xl transition-all"
            style={{
              background: designTokens.colors.accent.gold,
              color: designTokens.colors.text.primary,
              boxShadow: `0 12px 48px ${designTokens.colors.accent.gold}40`,
            }}
          >
            <Compass className="w-6 h-6" />
            地図を開く
            <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-2" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

// ===================================================================
// FOOTER
// ===================================================================

const Footer = () => (
  <footer 
    className="py-16 lg:py-20 px-6"
    style={{ 
      background: designTokens.colors.background.mist,
      borderTop: `1px solid ${designTokens.colors.secondary.stone}30`,
    }}
  >
    <div className="container mx-auto max-w-6xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 mb-12">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <img
              src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png"
              alt="TOKUDOKU"
              className="h-10 w-10 lg:h-12 lg:w-12"
            />
            <span 
              className="font-bold text-xl lg:text-2xl tracking-wider"
              style={{ 
                fontFamily: designTokens.typography.display,
                color: designTokens.colors.primary.base,
              }}
            >
              TOKUDOKU
            </span>
          </div>
          <p
            className="leading-relaxed max-w-xs lg:max-w-sm lg:text-base"
            style={{
              fontFamily: designTokens.typography.body,
              color: designTokens.colors.text.secondary,
            }}
          >
            大分のイベント・スポット・旅を、
            <br />
            もっと身近に。
          </p>
        </div>

        {/* Links */}
        <div className="grid grid-cols-2 gap-8 lg:gap-12">
          <div>
            <h4 
              className="font-semibold mb-4 text-sm lg:text-base tracking-wide"
              style={{ color: designTokens.colors.primary.base }}
            >
              サービス
            </h4>
            <ul className="space-y-3">
              {[
                { href: 'https://www.nobody-inc.jp/', label: '会社概要', external: true },
                { href: '/contact', label: 'お問い合わせ' },
                { href: '/release-notes', label: 'リリースノート' },
              ].map((link) => (
                <li key={link.href}>
                  <a 
                    href={link.href}
                    {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="text-sm lg:text-base transition-colors hover:underline"
                    style={{ color: designTokens.colors.text.secondary }}
                  >
                    {link.label}
                    {link.external && <ExternalLink className="inline w-3 h-3 ml-1" />}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 
              className="font-semibold mb-4 text-sm lg:text-base tracking-wide"
              style={{ color: designTokens.colors.primary.base }}
            >
              規約
            </h4>
            <ul className="space-y-3">
              {[
                { href: '/terms/terms-of-service', label: '利用規約' },
                { href: '/terms/privacy-policy', label: 'プライバシーポリシー' },
                { href: '/terms/service-policy', label: 'サービスポリシー' },
              ].map((link) => (
                <li key={link.href}>
                  <a 
                    href={link.href}
                    className="text-sm lg:text-base transition-colors hover:underline"
                    style={{ color: designTokens.colors.text.secondary }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div 
        className="h-px w-full max-w-4xl mx-auto mb-8"
        style={{ background: `linear-gradient(90deg, transparent, ${designTokens.colors.accent.gold}40, transparent)` }}
      />

      <div className="text-center">
        <p 
          className="text-sm"
          style={{ color: designTokens.colors.text.muted }}
        >
          © 2026 TOKUDOKU by Nobody Inc. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
);

// ===================================================================
// HEADER NAVIGATION
// ===================================================================

const Header = ({ scrollPosition, onFeedbackOpen }: { scrollPosition: number; onFeedbackOpen: () => void }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session } = useSession();
  const isScrolled = scrollPosition > 50;

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: isScrolled ? `${designTokens.colors.background.mist}F2` : 'transparent',
          backdropFilter: isScrolled ? 'blur(20px)' : 'none',
          borderBottom: isScrolled ? `1px solid ${designTokens.colors.secondary.stone}30` : 'none',
        }}
      >
        <div className="container mx-auto px-6 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3">
            <span 
              className="font-semibold text-lg tracking-wider hidden sm:block"
              style={{ 
                fontFamily: designTokens.typography.display,
                color: designTokens.colors.primary.base,
              }}
            >
              TOKU<span style={{ color: designTokens.colors.accent.gold }}>DOKU</span>
            </span>
          </a>

          {/* Menu Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsMenuOpen(true)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: designTokens.colors.primary.base }}
          >
            <Menu className="h-6 w-6" />
          </motion.button>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-[60]"
              style={{ background: `${designTokens.colors.primary.base}40`, backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-80 shadow-2xl z-[70] overflow-y-auto"
              style={{ background: designTokens.colors.background.white }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <span 
                    className="font-semibold text-lg"
                    style={{ color: designTokens.colors.primary.base }}
                  >
                    Menu
                  </span>
                  <motion.button
                    whileHover={{ rotate: 90 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: designTokens.colors.primary.base }}
                  >
                    <X className="h-6 w-6" />
                  </motion.button>
                </div>
                
                <nav className="space-y-1">
                  {[
                    { href: '/profile', label: 'マイページ' },
                    { href: '/terms/terms-of-service', label: '利用規約' },
                    { href: '/terms/privacy-policy', label: 'プライバシーポリシー' },
                    { href: '/contact', label: 'お問い合わせ' },
                    { href: '/release-notes', label: 'リリースノート' },
                  ].map((item, index) => (
                    <motion.a
                      key={item.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      href={item.href}
                      className="block px-4 py-3 rounded-lg font-medium transition-colors"
                      style={{ color: designTokens.colors.text.secondary }}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </motion.a>
                  ))}

                  {/* ご意見 */}
                  <motion.button
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 }}
                    onClick={() => {
                      setIsMenuOpen(false);
                      onFeedbackOpen();
                    }}
                    className="flex items-center w-full px-4 py-3 rounded-lg font-medium transition-colors"
                    style={{ color: designTokens.colors.accent.lilacDark }}
                  >
                    <MessageSquare className="h-5 w-5 mr-2" />
                    ご意見
                  </motion.button>

                  {session && (
                    <motion.button
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      onClick={async () => {
                        setIsMenuOpen(false);
                        await signOut({ callbackUrl: '/' });
                      }}
                      className="flex items-center w-full px-4 py-3 rounded-lg font-medium mt-4 transition-colors"
                      style={{ color: designTokens.colors.functional.error }}
                    >
                      <LogOut className="h-5 w-5 mr-2" />
                      ログアウト
                    </motion.button>
                  )}
                </nav>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

// ===================================================================
// LOCATION MODAL
// ===================================================================

const LocationModal = ({
  isOpen,
  onClose,
  onAllow,
  onDeny,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAllow: () => void;
  onDeny: () => void;
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100]"
          style={{ background: `${designTokens.colors.primary.base}50`, backdropFilter: 'blur(8px)' }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 30, stiffness: 400 }}
          className="fixed inset-0 flex items-center justify-center z-[101] px-4"
        >
          <ElevationCard elevation="high" padding="xl" hover={false} className="w-full max-w-md text-center">            
            <h3 
              className="text-2xl font-semibold mb-3"
              style={{ 
                fontFamily: designTokens.typography.display,
                color: designTokens.colors.primary.base,
              }}
            >
              位置情報の利用
            </h3>
            <p 
              className="mb-8"
              style={{ color: designTokens.colors.text.secondary }}
            >
              地図上にあなたの現在地を表示するために
              位置情報を使用します。
            </p>

            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onAllow}
                className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                style={{
                  background: designTokens.colors.accent.lilac,
                  color: designTokens.colors.text.inverse,
                }}
              >
                <MapPin className="w-5 h-5" />
                位置情報を許可して探索
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onDeny}
                className="w-full py-4 rounded-xl font-medium transition-all"
                style={{ 
                  color: designTokens.colors.text.secondary,
                  background: `${designTokens.colors.secondary.stone}20`,
                }}
              >
                今はスキップ
              </motion.button>
            </div>

            <p 
              className="text-xs mt-6"
              style={{ color: designTokens.colors.text.muted }}
            >
              ※ブラウザの設定で位置情報の許可をONにしてください
            </p>
          </ElevationCard>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// ===================================================================
// MAIN COMPONENT
// ===================================================================

export default function Home() {
  const router = useRouter();
  const { showFeedbackModal, setShowFeedbackModal, openFeedbackModal } = useFeedback();
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

  // Search form state（LP離脱・リロード時にリセット）
  const [city, setCity] = useState('all');
  const [target, setTarget] = useState('none');

  useEffect(() => {
    const handleScroll = () => setScrollPosition(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // bfcache 復元時（戻るボタンで LP に戻った場合など）に検索フォームをリセット
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setCity('all');
        setTarget('none');
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  const handleMapClick = (mapId: string) => {
    setSelectedMapId(mapId);
    setShowLocationModal(true);
  };

  const handleStart = () => {
    setSelectedMapId(null);
    setShowLocationModal(true);
  };

  const handleEventSearch = (params: { city: string; target: string }) => {
    const searchParams = new URLSearchParams();
    searchParams.set('city', params.city?.trim() || 'all');
    if (params.target?.trim()) searchParams.set('target', params.target.trim());
    router.push(`/events?${searchParams.toString()}`);
  };

  const handleAllowLocation = async () => {
    if ('geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        });

        localStorage.setItem('userLocation', JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: Date.now(),
          expiresAt: Date.now() + 60 * 60 * 1000,
        }));

        localStorage.setItem('locationPermission', JSON.stringify({
          isGranted: true,
          timestamp: Date.now(),
        }));

        setShowLocationModal(false);
        router.push(selectedMapId ? `/map?title_id=${selectedMapId}` : '/map');
      } catch (error) {
        console.error('位置情報の取得に失敗:', error);
        setShowLocationModal(false);
        router.push(selectedMapId ? `/map?title_id=${selectedMapId}` : '/');
      }
    } else {
      setShowLocationModal(false);
      router.push(selectedMapId ? `/map?title_id=${selectedMapId}` : '/');
    }
  };

  const handleDenyLocation = () => {
    setShowLocationModal(false);
    router.push(selectedMapId ? `/map?title_id=${selectedMapId}` : '/');
  };

  return (
    <main 
      className="min-h-screen"
      style={{ 
        background: designTokens.colors.background.mist,
        fontFamily: designTokens.typography.body,
      }}
    >

      <Header scrollPosition={scrollPosition} onFeedbackOpen={openFeedbackModal} />
      
      <HeroSection
        onStart={handleStart}
        onEventSearch={handleEventSearch}
        city={city}
        setCity={setCity}
        target={target}
        setTarget={setTarget}
      />
      
      <ChallengesSection />
      
      <SolutionSection />

      <SpotsSection />

      <ModelCourseSection onMapClick={handleMapClick} />
      
      <NoteArticlesSection username="kind_ixora3833" maxItems={4} />
      
      <FinalCTASection onStart={handleStart} />
      
      <Footer />

      <LocationModal
        isOpen={showLocationModal}
        onClose={handleDenyLocation}
        onAllow={handleAllowLocation}
        onDeny={handleDenyLocation}
      />

      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />
    </main>
  );
}