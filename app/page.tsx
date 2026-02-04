'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion';
import { MapPin, Menu, X, ChevronRight, Calendar, LogOut, Search, Layers, Clock, MapPinOff, Map, Users, ArrowRight, Compass, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession, signOut } from 'next-auth/react';
import { getPublicMaps } from '@/app/_actions/maps';
import { NoteArticlesSection } from '@/components/external-content';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, addDays } from 'date-fns';
import { designTokens } from '@/lib/constants';

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
// LP CONFIGURATION
// ===================================================================

const OITA_MUNICIPALITIES = [
  '大分市', '別府市', '中津市', '日田市', '佐伯市', '臼杵市', '津久見市',
  '竹田市', '豊後高田市', '杵築市', '宇佐市', '豊後大野市', '由布市',
  '国東市', '日出町', '九重町', '玖珠町', '姫島村'
];

const TARGET_AUDIENCE_OPTIONS = [
  { value: 'none', label: '指定なし' },
  { value: '家族向け', label: '家族向け' },
  { value: 'カップル向け', label: 'カップル向け' },
  { value: '一人参加', label: 'ひとり参加' },
  { value: '観光客向け', label: '観光客向け' },
  { value: '子ども向け', label: '子ども向け' },
  { value: 'シニア向け', label: 'シニア向け' },
];

const todayStr = format(new Date(), 'yyyy-MM-dd');
const defaultEndStr = format(addDays(new Date(), 14), 'yyyy-MM-dd');

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
      className="inline-block text-xs font-semibold tracking-[0.3em] uppercase"
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
// HERO SECTION
// ===================================================================

// Hero背景画像URL
const HERO_BG_IMAGE = 'https://res.cloudinary.com/dz9trbwma/image/upload/v1770102249/Gemini_Generated_Image_tlb61atlb61atlb6_mtlugk.png';

const HeroSection = ({
  onStart,
  onEventSearch,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  city,
  setCity,
  target,
  setTarget,
}: {
  onStart: () => void;
  onEventSearch: (params: { startDate: string; endDate: string; city: string; target: string }) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
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
        className="relative z-10 container mx-auto max-w-5xl px-6 pt-28 pb-20"
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
              Discover Oita&apos;s Local Events
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.1] tracking-tight"
            style={{ 
              fontFamily: designTokens.typography.display,
              color: designTokens.colors.text.primary,
            }}
          >
            あなたの周りには
            <br />
            <span className="relative inline-block mt-2">
              <span className="relative z-10">素敵な物語がある</span>
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
            className="max-w-xl mx-auto mt-12"
          >
            <ElevationCard elevation="high" padding="lg" hover={false}>
              <div className="space-y-4">
                {/* Date Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 text-left">
                    <Label 
                      className="text-sm font-semibold tracking-wide"
                      style={{ color: designTokens.colors.text.secondary }}
                    >
                    開催開始日
                    </Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={todayStr}
                      className="h-9 rounded-lg text-sm transition-all focus:ring-2"
                      style={{ 
                        borderColor: `${designTokens.colors.secondary.stone}50`,
                        backgroundColor: designTokens.colors.background.mist,
                        color: designTokens.colors.text.primary,
                      }}
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <Label 
                      className="text-sm font-semibold tracking-wide"
                      style={{ color: designTokens.colors.text.secondary }}
                    >
                    開催終了日
                    </Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      className="h-9 rounded-lg text-sm transition-all focus:ring-2"
                      style={{ 
                        borderColor: `${designTokens.colors.secondary.stone}50`,
                        backgroundColor: designTokens.colors.background.mist,
                        color: designTokens.colors.text.primary,
                      }}
                    />
                  </div>
                </div>

                {/* Area Select */}
                <div className="space-y-2 text-left">
                  <Label 
                    className="text-sm font-semibold tracking-wide"
                    style={{ color: designTokens.colors.text.secondary }}
                  >
                    エリア
                  </Label>
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger 
                      className="h-12 rounded-xl"
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
                <div className="space-y-2 text-left">
                  <Label 
                    className="text-sm font-semibold tracking-wide"
                    style={{ color: designTokens.colors.text.secondary }}
                  >
                    対象（任意）
                  </Label>
                  <Select value={target} onValueChange={setTarget}>
                    <SelectTrigger 
                      className="h-12 rounded-xl"
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
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStartDate(todayStr);
                      setEndDate(defaultEndStr);
                      setCity('all');
                      setTarget('none');
                    }}
                    className="flex-1 h-12 rounded-xl font-medium transition-all hover:bg-opacity-10"
                    style={{ 
                      borderColor: designTokens.colors.secondary.stone,
                      color: designTokens.colors.text.secondary,
                    }}
                  >
                    クリア
                  </Button>
                  <Button
                    onClick={() => onEventSearch({
                      startDate,
                      endDate,
                      city: city === 'all' ? '' : city,
                      target: target === 'none' ? '' : target,
                    })}
                    className="flex-1 h-12 rounded-xl font-semibold transition-all hover:opacity-90"
                    style={{ 
                      background: designTokens.colors.accent.lilac,
                      color: designTokens.colors.text.inverse,
                    }}
                  >
                    <Search className="w-4 h-4 mr-2" />
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
              className="group inline-flex items-center gap-3 px-10 py-5 rounded-full font-semibold text-base transition-all"
              style={{
                background: designTokens.colors.accent.gold,
                color: designTokens.colors.text.primary,
                boxShadow: `0 8px 32px ${designTokens.colors.accent.gold}50`,
              }}
            >
              <Map className="w-5 h-5" />
              地図を直接開く
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </motion.button>
            <p 
              className="text-sm mt-4"
              style={{ color: designTokens.colors.text.muted }}
            >
              登録不要・無料で今すぐ探索できます
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
      icon: <Layers className="w-6 h-6" />,
      title: '情報の分断',
      description: '市町村ごとにバラバラのプラットフォーム。一元的な発見体験が存在しない。',
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: '機会の消失',
      description: '「知らないうちに終わっていた」を繰り返す、情報到達の構造的な遅延。',
    },
    {
      icon: <MapPinOff className="w-6 h-6" />,
      title: '地図との断絶',
      description: 'テキストリストでは伝わらない、「場所」としての文脈と魅力。',
    },
  ];

  return (
    <section 
      ref={sectionRef}
      className="py-24 sm:py-32 px-6 relative overflow-hidden"
      style={{ background: designTokens.colors.background.cloud }}
    >
      <div className="container mx-auto max-w-4xl relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <SectionLabel>Challenges</SectionLabel>
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
            地域情報の分断が、
            <br />
            機会損失を生んでいる。
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg max-w-2xl mx-auto leading-relaxed"
            style={{ 
              fontFamily: designTokens.typography.body,
              color: designTokens.colors.text.secondary,
            }}
          >
            観光客は「何があるかわからない」。住民は「知らないうちに終わっていた」。
            <br className="hidden sm:block" />
            これが、大分の地域経済における見えない課題でした。
          </motion.p>
        </div>

        {/* Challenges List */}
        <div className="space-y-6">
          {challenges.map((challenge, index) => (
            <motion.div
              key={challenge.title}
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
            >
              <ElevationCard elevation="low" padding="lg" hover={false} className="flex items-start gap-6">
                <div 
                  className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ 
                    background: `${designTokens.colors.secondary.fern}15`,
                    color: designTokens.colors.secondary.fern,
                  }}
                >
                  {challenge.icon}
                </div>
                <div>
                  <h3 
                    className="text-xl font-semibold mb-2"
                    style={{ 
                      fontFamily: designTokens.typography.display,
                      color: designTokens.colors.primary.base,
                    }}
                  >
                    {challenge.title}
                  </h3>
                  <p 
                    className="leading-relaxed"
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
      label: 'DISCOVER',
      title: '地図から発見する',
      description: '日付・エリア・対象で絞り込み、地図上でイベントを俯瞰。「偶然の出会い」をデザインする検索体験。',
      icon: <Search className="w-8 h-8" />,
      color: designTokens.colors.accent.lilac,
    },
    {
      label: 'CREATE',
      title: 'あなたの地図を作る',
      description: 'お気に入りのスポットを登録し、パーソナルマップを構築。旅の記録が、誰かの道標になる。',
      icon: <Map className="w-8 h-8" />,
      color: designTokens.colors.secondary.fern,
    },
    {
      label: 'SHARE',
      title: '物語を共有する',
      description: '作成した地図は公開・限定公開を選択可能。地域の知見が、有機的に繋がっていく。',
      icon: <Users className="w-8 h-8" />,
      color: designTokens.colors.accent.gold,
    },
  ];

  return (
    <section 
      ref={sectionRef}
      className="py-24 sm:py-32 px-6 relative overflow-hidden"
      style={{ background: designTokens.colors.background.mist }}
    >
      <OrganicMeshBackground variant="mist" />
      
      <div className="container mx-auto max-w-5xl relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <SectionLabel>Solution</SectionLabel>
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
            地域情報の、
            <br />
            新しい標準。
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg max-w-2xl mx-auto leading-relaxed"
            style={{ 
              fontFamily: designTokens.typography.body,
              color: designTokens.colors.text.secondary,
            }}
          >
            TOKUDOKUは、大分県のローカルイベントを「地図」という普遍的インターフェースに統合。
            <br className="hidden sm:block" />
            情報を「探す」から、地域を「発見する」体験へ。
          </motion.p>
        </div>

        {/* Solutions Grid */}
        <div className="space-y-8">
          {solutions.map((solution, index) => (
            <motion.div
              key={solution.label}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 + index * 0.15 }}
            >
              <ElevationCard 
                elevation="medium" 
                padding="xl" 
                className="relative overflow-hidden group"
              >
                {/* Background Accent */}
                <div 
                  className="absolute top-0 right-0 w-72 h-72 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity duration-500"
                  style={{
                    background: `radial-gradient(circle at top right, ${solution.color} 0%, transparent 70%)`,
                  }}
                />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
                  {/* Icon */}
                  <div 
                    className="flex-shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                    style={{ 
                      background: `${solution.color}18`,
                      color: solution.color,
                    }}
                  >
                    {solution.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <span 
                      className="text-xs font-bold tracking-[0.2em] mb-2 block"
                      style={{ color: solution.color }}
                    >
                      {solution.label}
                    </span>
                    <h3 
                      className="text-2xl font-semibold mb-3"
                      style={{ 
                        fontFamily: designTokens.typography.display,
                        color: designTokens.colors.primary.base,
                      }}
                    >
                      {solution.title}
                    </h3>
                    <p 
                      className="text-base leading-relaxed max-w-xl"
                      style={{ 
                        fontFamily: designTokens.typography.body,
                        color: designTokens.colors.text.secondary,
                      }}
                    >
                      {solution.description}
                    </p>
                  </div>
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
// ATLAS SECTION (Public Maps)
// ===================================================================

const AtlasSection = ({ onMapClick }: { onMapClick: (mapId: string) => void }) => {
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

  return (
    <section 
      ref={sectionRef}
      className="py-24 sm:py-32 px-6 relative overflow-hidden"
      style={{ background: designTokens.colors.background.cloud }}
    >
      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <SectionLabel>Atlas</SectionLabel>
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
            地域の知見が、
            <br />
            地図になる。
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
            誰かが歩いた道は、次の旅人の道標になる。
            <br className="hidden sm:block" />
            TOKUDOKUユーザーが作成した公開マップ。
          </motion.p>
        </div>

        {/* Maps Display */}
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
          /* Mobile: Swipeable Cards */
          <div className="overflow-x-auto pb-4 -mx-6 px-6 snap-x snap-mandatory flex gap-4 scrollbar-hide">
            {publicMaps.map((map, index) => (
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
          /* Desktop: Bento Grid */
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            {publicMaps.map((map, index) => (
              <motion.div
                key={map.id}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                onClick={() => onMapClick(map.id)}
                className={`cursor-pointer ${index === 0 ? 'lg:col-span-2 lg:row-span-2' : ''}`}
              >
                <MapCard map={map} featured={index === 0} />
              </motion.div>
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
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/public-maps')}
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all"
            style={{ 
              border: `2px solid ${designTokens.colors.accent.lilac}60`,
              color: designTokens.colors.accent.lilacDark,
              background: `${designTokens.colors.accent.lilac}10`,
            }}
          >
            すべての地図を見る
            <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

// Map Card Component
const MapCard = ({ map, featured = false }: { map: PublicMapData; featured?: boolean }) => (
  <ElevationCard 
    elevation="medium" 
    padding="none" 
    className={`overflow-hidden h-full group ${featured ? 'min-h-[420px]' : 'min-h-[300px]'}`}
  >
    {/* Cover Image */}
    <div className={`relative overflow-hidden ${featured ? 'h-3/5' : 'h-3/5'}`}>
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
          <Map className="w-12 h-12" style={{ color: designTokens.colors.text.muted }} />
        </div>
      )}
      
      {/* Spots Badge */}
      <div 
        className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
        style={{ 
          background: 'rgba(255,255,255,0.95)',
          color: designTokens.colors.primary.base,
          boxShadow: designTokens.elevation.low,
        }}
      >
        <MapPin className="w-3.5 h-3.5" style={{ color: designTokens.colors.accent.lilac }} />
        {map.total_locations || 0}スポット
      </div>
      
      {/* Hover Overlay */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(to top, ${designTokens.colors.primary.base}50, transparent)` }}
      />
    </div>

    {/* Content */}
    <div className={`p-5 ${featured ? 'p-6' : ''}`}>
      <h3 
        className={`font-semibold mb-2 line-clamp-2 transition-colors ${featured ? 'text-xl' : 'text-base'}`}
        style={{ 
          fontFamily: designTokens.typography.display,
          color: designTokens.colors.primary.base,
        }}
      >
        {map.title}
      </h3>
      
      {map.hashtags && map.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {map.hashtags.slice(0, featured ? 4 : 2).map((tag, i) => (
            <span 
              key={i} 
              className="text-xs px-2 py-0.5 rounded-full"
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
        className="flex items-center text-xs"
        style={{ color: designTokens.colors.text.muted }}
      >
        <Calendar className="w-3.5 h-3.5 mr-1.5" />
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
      className="py-32 sm:py-40 px-6 relative overflow-hidden"
      style={{ background: designTokens.colors.primary.base }}
    >
      <OrganicMeshBackground variant="primary" />

      <div className="container mx-auto max-w-3xl relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          <span 
            className="inline-block text-xs font-semibold tracking-[0.3em] uppercase"
            style={{ color: designTokens.colors.accent.gold }}
          >
            Get Started
          </span>

          <h2 
            className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight"
            style={{ 
              fontFamily: designTokens.typography.display,
              color: designTokens.colors.text.inverse,
            }}
          >
            地域を、再発見する。
          </h2>
          
          <p 
            className="text-lg max-w-md mx-auto"
            style={{ color: `${designTokens.colors.text.inverse}90` }}
          >
            登録不要。今すぐ、大分の地図を開く。
          </p>

          <motion.button
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.97 }}
            onClick={onStart}
            className="group inline-flex items-center gap-3 px-12 py-5 rounded-xl font-semibold text-lg transition-all"
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
    className="py-16 px-6"
    style={{ 
      background: designTokens.colors.background.mist,
      borderTop: `1px solid ${designTokens.colors.secondary.stone}30`,
    }}
  >
    <div className="container mx-auto max-w-6xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <img
              src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png"
              alt="TOKUDOKU"
              className="h-10 w-10"
            />
            <span 
              className="font-bold text-xl tracking-wider"
              style={{ 
                fontFamily: designTokens.typography.display,
                color: designTokens.colors.primary.base,
              }}
            >
              TOKUDOKU
            </span>
          </div>
          <p 
            className="leading-relaxed max-w-xs"
            style={{ 
              fontFamily: designTokens.typography.body,
              color: designTokens.colors.text.secondary,
            }}
          >
            地域の新たな可能性に
            <br />
            光を当てる。
          </p>
        </div>

        {/* Links */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h4 
              className="font-semibold mb-4 text-sm tracking-wide"
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
                    className="text-sm transition-colors hover:underline"
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
              className="font-semibold mb-4 text-sm tracking-wide"
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
                    className="text-sm transition-colors hover:underline"
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

const Header = ({ scrollPosition }: { scrollPosition: number }) => {
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
            <div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
              style={{ 
                background: `${designTokens.colors.secondary.fern}15`,
                color: designTokens.colors.secondary.fern,
              }}
            >
              <MapPin className="w-8 h-8" />
            </div>
            
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
              地図上にあなたの位置を表示するために
              <br />
              位置情報を使用します
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
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  
  // Search form state
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(defaultEndStr);
  const [city, setCity] = useState('all');
  const [target, setTarget] = useState('none');

  useEffect(() => {
    const handleScroll = () => setScrollPosition(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMapClick = (mapId: string) => {
    setSelectedMapId(mapId);
    setShowLocationModal(true);
  };

  const handleStart = () => {
    setSelectedMapId(null);
    setShowLocationModal(true);
  };

  const handleEventSearch = (params: { startDate: string; endDate: string; city: string; target: string }) => {
    const searchParams = new URLSearchParams();
    if (params.startDate) searchParams.set('start_date', params.startDate);
    if (params.endDate) searchParams.set('end_date', params.endDate);
    if (params.city) searchParams.set('city', params.city);
    if (params.target) searchParams.set('target', params.target);
    router.push(searchParams.toString() ? `/events?${searchParams}` : '/events');
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
      {/* Google Fonts */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=IBM+Plex+Sans+JP:wght@400;500;600&family=Noto+Sans+JP:wght@400;500;600;700&display=swap');
        
        /* Hide scrollbar for Chrome, Safari and Opera */
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        /* Hide scrollbar for IE, Edge and Firefox */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <Header scrollPosition={scrollPosition} />
      
      <HeroSection
        onStart={handleStart}
        onEventSearch={handleEventSearch}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        city={city}
        setCity={setCity}
        target={target}
        setTarget={setTarget}
      />
      
      <ChallengesSection />
      
      <SolutionSection />
      
      <AtlasSection onMapClick={handleMapClick} />
      
      <NoteArticlesSection username="kind_ixora3833" maxItems={4} />
      
      <FinalCTASection onStart={handleStart} />
      
      <Footer />

      <LocationModal
        isOpen={showLocationModal}
        onClose={handleDenyLocation}
        onAllow={handleAllowLocation}
        onDeny={handleDenyLocation}
      />
    </main>
  );
}