'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import Image from 'next/image';

// ========================================
// 画像URL定義
// ========================================
const ILLUSTRATION_IMAGES = {
  festival: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1767665102/AZuRAhkycAXIF9Zn-5aViw-AZuRAhkyUwkGp7w0OODmLg_c6tnh1.jpg',
  countryside: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1767665102/AZuRBxOr7PaNLnJoSisvOA-AZuRBxOr9GVBLVyRO825mw_oxgayw.jpg',
  traveler: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1767665101/AZuRCAfw499UrvnX8o7QrQ-AZuRCAfwnQOIbftTtJql_Q_tol55x.jpg',
};

// ========================================
// 浮遊する光の粒子コンポーネント
// ========================================
const FloatingParticles = ({ 
  count = 30, 
  color = '#ffecd2',
  minSize = 1,
  maxSize = 3,
  speed = 20 
}: { 
  count?: number;
  color?: string;
  minSize?: number;
  maxSize?: number;
  speed?: number;
}) => {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: minSize + Math.random() * (maxSize - minSize),
    duration: speed + Math.random() * speed,
    delay: Math.random() * speed,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            background: color,
            boxShadow: `0 0 ${particle.size * 4}px ${particle.size * 2}px ${color}`,
          }}
          animate={{
            y: [0, -100, -200],
            x: [0, Math.random() * 40 - 20, Math.random() * 60 - 30],
            opacity: [0, 0.8, 0],
            scale: [0.5, 1, 0.3],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
};

// ========================================
// 1. 祭りの夜景 - 画像バージョン
// ========================================
export const FestivalNightIllustration = ({ className = '' }: { className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  // パララックス効果
  const imageY = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.3, 0.1, 0.3]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      {/* フィルムグレインオーバーレイ */}
      <div 
        className="absolute inset-0 pointer-events-none z-30 mix-blend-overlay opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* 浮遊する蛍の光 */}
      <FloatingParticles count={25} color="#ffecd2" minSize={2} maxSize={5} speed={15} />
      <FloatingParticles count={15} color="#ff9f43" minSize={1} maxSize={3} speed={25} />

      {/* メイン画像 */}
      <motion.div 
        className="relative w-full aspect-[16/10]"
        style={{ y: imageY }}
      >
        <Image
          src={ILLUSTRATION_IMAGES.festival}
          alt="祭りの夜景"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
        
        {/* 暖かい光のオーバーレイ */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-t from-orange-500/20 via-transparent to-purple-900/10 mix-blend-overlay"
          style={{ opacity: overlayOpacity }}
        />
      </motion.div>

      {/* 提灯の光エフェクト（オーバーレイ） */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {[
          { x: '15%', y: '50%', delay: 0 },
          { x: '35%', y: '45%', delay: 0.3 },
          { x: '55%', y: '48%', delay: 0.6 },
          { x: '75%', y: '52%', delay: 0.9 },
          { x: '90%', y: '47%', delay: 1.2 },
        ].map((lantern, i) => (
          <motion.div
            key={`lantern-glow-${i}`}
            className="absolute w-16 h-16 rounded-full"
            style={{
              left: lantern.x,
              top: lantern.y,
              background: 'radial-gradient(circle, rgba(255,248,231,0.4) 0%, rgba(255,159,67,0.2) 40%, transparent 70%)',
              filter: 'blur(8px)',
            }}
            animate={{ 
              opacity: [0.4, 0.8, 0.4],
              scale: [0.9, 1.1, 0.9],
            }}
            transition={{ 
              duration: 2.5, 
              repeat: Infinity, 
              delay: lantern.delay,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* 花火エフェクト（オーバーレイ） */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {/* 中央の花火 */}
        <motion.div
          className="absolute w-24 h-24 rounded-full"
          style={{
            left: '50%',
            top: '15%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(253,203,110,0.3) 30%, transparent 60%)',
            filter: 'blur(4px)',
          }}
          animate={{ 
            scale: [0.8, 1.3, 0.8], 
            opacity: [0.3, 0.8, 0.3] 
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        
        {/* 左の花火 */}
        <motion.div
          className="absolute w-16 h-16 rounded-full"
          style={{
            left: '20%',
            top: '12%',
            background: 'radial-gradient(circle, rgba(255,107,107,0.5) 0%, rgba(238,90,82,0.2) 40%, transparent 60%)',
            filter: 'blur(3px)',
          }}
          animate={{ 
            scale: [0.7, 1.2, 0.7], 
            opacity: [0.2, 0.7, 0.2] 
          }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.8 }}
        />
        
        {/* 右の花火 */}
        <motion.div
          className="absolute w-20 h-20 rounded-full"
          style={{
            left: '75%',
            top: '10%',
            background: 'radial-gradient(circle, rgba(116,185,255,0.5) 0%, rgba(9,132,227,0.2) 40%, transparent 60%)',
            filter: 'blur(3px)',
          }}
          animate={{ 
            scale: [0.8, 1.3, 0.8], 
            opacity: [0.2, 0.6, 0.2] 
          }}
          transition={{ duration: 3, repeat: Infinity, delay: 1.2 }}
        />
      </div>

      {/* ビネット効果 */}
      <div 
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)',
        }}
      />

      {/* CSS色収差効果 */}
      <div 
        className="absolute inset-0 pointer-events-none z-30 mix-blend-screen opacity-[0.03]"
        style={{
          background: 'linear-gradient(90deg, rgba(255,0,0,0.1) 0%, transparent 50%, rgba(0,0,255,0.1) 100%)',
        }}
      />
    </div>
  );
};

// ========================================
// 2. 田園風景 - 画像バージョン
// ========================================
export const CountrysideIllustration = ({ className = '' }: { className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const imageY = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const sunGlowScale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.1, 1]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      {/* フィルムグレインオーバーレイ */}
      <div 
        className="absolute inset-0 pointer-events-none z-30 mix-blend-overlay opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* 空中を舞う塵・花粉 */}
      <FloatingParticles count={20} color="#fff8dc" minSize={1} maxSize={2} speed={30} />

      {/* メイン画像 */}
      <motion.div 
        className="relative w-full aspect-[16/10]"
        style={{ y: imageY }}
      >
        <Image
          src={ILLUSTRATION_IMAGES.countryside}
          alt="田園風景"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </motion.div>

      {/* 太陽のグロー効果 */}
      <motion.div
        className="absolute top-[5%] right-[10%] w-32 h-32 rounded-full pointer-events-none z-10"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(255,245,157,0.3) 30%, rgba(255,235,59,0.1) 60%, transparent 80%)',
          filter: 'blur(8px)',
          scale: sunGlowScale,
        }}
        animate={{ 
          opacity: [0.6, 0.9, 0.6],
        }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      {/* 光芒（ゴッドレイ）エフェクト */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={`godray-${i}`}
            className="absolute"
            style={{
              top: '0%',
              right: `${5 + i * 8}%`,
              width: '4px',
              height: '60%',
              background: 'linear-gradient(to bottom, rgba(255,248,231,0.3) 0%, transparent 100%)',
              transform: `rotate(${15 + i * 5}deg)`,
              transformOrigin: 'top center',
              filter: 'blur(3px)',
            }}
            animate={{ 
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{ 
              duration: 3 + i * 0.5, 
              repeat: Infinity,
              delay: i * 0.3
            }}
          />
        ))}
      </div>

      {/* 蝶々エフェクト */}
      {[
        { x: 20, y: 40, color: '#FF9800' },
        { x: 55, y: 35, color: '#E91E63' },
        { x: 75, y: 45, color: '#9C27B0' },
      ].map((butterfly, i) => (
        <motion.div
          key={`butterfly-${i}`}
          className="absolute w-4 h-3 pointer-events-none z-20"
          style={{
            left: `${butterfly.x}%`,
            top: `${butterfly.y}%`,
            background: butterfly.color,
            borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
            filter: 'blur(0.5px)',
          }}
          animate={{ 
            x: [0, 40, 0, -30, 0],
            y: [0, -25, 0, -15, 0],
            scale: [1, 0.8, 1, 0.9, 1],
          }}
          transition={{ 
            duration: 6 + i, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
      ))}

      {/* レンズフレア効果 */}
      <motion.div
        className="absolute top-[10%] right-[10%] w-24 h-24 rounded-full pointer-events-none z-20"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,245,157,0.2) 40%, transparent 70%)',
          filter: 'blur(2px)',
        }}
        animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      {/* ビネット */}
      <div 
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.2) 100%)',
        }}
      />
    </div>
  );
};

// ========================================
// 3. 旅人のシルエット - 画像バージョン
// ========================================
export const TravelerIllustration = ({ className = '' }: { className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const imageX = useTransform(scrollYProgress, [0, 1], [-10, 20]);
  const sunPulse = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.1, 1]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      {/* フィルムグレイン */}
      <div 
        className="absolute inset-0 pointer-events-none z-30 mix-blend-overlay opacity-25"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* 浮遊する光の粒子（夕焼けの塵） */}
      <FloatingParticles count={15} color="#ffecd2" minSize={1} maxSize={2} speed={25} />

      {/* メイン画像 */}
      <motion.div 
        className="relative w-full aspect-[4/3]"
        style={{ x: imageX }}
      >
        <Image
          src={ILLUSTRATION_IMAGES.traveler}
          alt="旅人のシルエット"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 512px"
          priority
        />
      </motion.div>

      {/* 太陽のオーラ効果 */}
      <motion.div
        className="absolute top-[25%] right-[15%] w-40 h-40 rounded-full pointer-events-none z-10"
        style={{
          background: 'radial-gradient(circle, rgba(255,213,79,0.4) 0%, rgba(255,140,0,0.2) 40%, rgba(255,107,53,0.1) 70%, transparent 100%)',
          filter: 'blur(10px)',
          scale: sunPulse,
        }}
        animate={{ 
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{ duration: 5, repeat: Infinity }}
      />

      {/* 光芒エフェクト */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {[...Array(6)].map((_, i) => {
          const angle = (i * 60 - 30);
          return (
            <motion.div
              key={`ray-${i}`}
              className="absolute"
              style={{
                top: '25%',
                right: '20%',
                width: '150px',
                height: '8px',
                background: 'linear-gradient(to right, rgba(255,213,79,0.3) 0%, transparent 100%)',
                transform: `rotate(${angle}deg)`,
                transformOrigin: 'left center',
                filter: 'blur(4px)',
              }}
              animate={{ 
                opacity: [0.15, 0.35, 0.15],
                scaleX: [0.8, 1.1, 0.8]
              }}
              transition={{ 
                duration: 4 + i * 0.5, 
                repeat: Infinity 
              }}
            />
          );
        })}
      </div>

      {/* 鳥のシルエット */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {[
          { x: 15, y: 15, delay: 0 },
          { x: 22, y: 12, delay: 0.15 },
          { x: 28, y: 18, delay: 0.3 },
          { x: 35, y: 14, delay: 0.45 },
        ].map((bird, i) => (
          <motion.div
            key={`bird-${i}`}
            className="absolute text-[#2d1515] text-xs"
            style={{
              left: `${bird.x}%`,
              top: `${bird.y}%`,
            }}
            animate={{ 
              y: [0, -8, 0],
              x: [0, 15, 0]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              delay: bird.delay 
            }}
          >
            ∿
          </motion.div>
        ))}
      </div>

      {/* 追加の光エフェクト */}
      <motion.div
        className="absolute top-[30%] right-[15%] w-16 h-16 rounded-full pointer-events-none z-20"
        style={{
          background: 'radial-gradient(circle, rgba(255,216,155,0.3) 0%, transparent 70%)',
          filter: 'blur(4px)',
        }}
        animate={{ opacity: [0.3, 0.6, 0.3], x: [0, 10, 0] }}
        transition={{ duration: 5, repeat: Infinity }}
      />

      {/* ビネット */}
      <div 
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)',
        }}
      />
    </div>
  );
};

// ========================================
// 4. 統合セクションコンポーネント
// ========================================
export const EventIllustrationSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [60, 0, 0, -60]);

  return (
    <section
      id="event-illustrations"
      ref={sectionRef}
      className="relative py-20 sm:py-32 px-4 sm:px-8 bg-gradient-to-b from-[#f5e6d3] via-[#f0ebe3] to-[#e8f4e5] overflow-hidden"
    >
      {/* 背景テクスチャ */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* 装飾的な光 */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-emerald-200/20 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto max-w-6xl relative z-10">
        <motion.div
          style={{ opacity, y }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-20 bg-gradient-to-r from-transparent to-[#8b6914]" />
            <p className="px-8 py-2 text-xs sm:text-sm tracking-[0.3em] font-bold text-[#8b6914] border border-[#8b6914]/30 bg-[#fff8f0]/60 backdrop-blur-sm font-sans uppercase">
              Local Events
            </p>
            <div className="h-px w-20 bg-gradient-to-l from-transparent to-[#8b6914]" />
          </div>
          
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#3d2914] tracking-tight font-serif leading-tight">
            地域のイベントを
            <br className="sm:hidden" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8b6914] to-[#c9a227]">発見</span>
            しよう
          </h2>
          <p className="text-lg sm:text-xl text-[#5c3a21]/80 mt-6 font-medium font-sans max-w-xl mx-auto">
            祭り、自然、文化。あなたの冒険が待っている
          </p>
        </motion.div>

        {/* イラストグリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {/* 祭りの夜景 */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            viewport={{ once: true, margin: "-100px" }}
            className="group relative rounded-2xl overflow-hidden shadow-2xl border-2 border-[#d4c4a8]/50 bg-[#1a1a3e]"
          >
            <div className="relative overflow-hidden">
              <FestivalNightIllustration className="w-full transition-transform duration-700 group-hover:scale-105" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#1a0a1a]/95 via-[#1a0a1a]/70 to-transparent p-8">
              <h3 className="text-2xl font-bold text-[#ffecd2] font-serif tracking-wide">夏祭り・花火大会</h3>
              <p className="text-sm text-[#d4c4a8]/90 mt-2 font-sans">灯篭の灯りに照らされた夜を楽しむ</p>
            </div>
          </motion.div>

          {/* 田園風景 */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.15 }}
            viewport={{ once: true, margin: "-100px" }}
            className="group relative rounded-2xl overflow-hidden shadow-2xl border-2 border-[#d4c4a8]/50 bg-[#87CEEB]"
          >
            <div className="relative overflow-hidden">
              <CountrysideIllustration className="w-full transition-transform duration-700 group-hover:scale-105" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#2d4a2d]/95 via-[#2d4a2d]/70 to-transparent p-8">
              <h3 className="text-2xl font-bold text-[#ffecd2] font-serif tracking-wide">収穫祭・農業体験</h3>
              <p className="text-sm text-[#d4c4a8]/90 mt-2 font-sans">自然と触れ合う贅沢な時間</p>
            </div>
          </motion.div>
        </div>

        {/* 旅人イラスト */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mt-12 max-w-lg mx-auto"
        >
          <div className="group relative rounded-2xl overflow-hidden shadow-2xl border-2 border-[#d4c4a8]/50 bg-[#ff8e53]">
            <div className="relative overflow-hidden">
              <TravelerIllustration className="w-full transition-transform duration-700 group-hover:scale-105" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#2d1515]/95 via-[#2d1515]/70 to-transparent p-8 text-center">
              <h3 className="text-2xl font-bold text-[#ffecd2] font-serif tracking-wide">さあ、旅に出よう</h3>
              <p className="text-sm text-[#d4c4a8]/90 mt-2 font-sans">あなただけの物語が始まる</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default EventIllustrationSection;
