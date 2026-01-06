'use client';

import { motion, useScroll, useTransform, useMotionValue, useSpring, animate } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

// ========================================
// 共通SVGフィルター定義
// ========================================
const CinematicFilters = () => (
  <svg className="absolute w-0 h-0" aria-hidden="true">
    <defs>
      {/* ブルーム効果（光の滲み） */}
      <filter id="bloom" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur1" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="blur2" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="32" result="blur3" />
        <feMerge>
          <feMergeNode in="blur3" />
          <feMergeNode in="blur2" />
          <feMergeNode in="blur1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* ソフトグロー（柔らかな発光） */}
      <filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
        <feColorMatrix in="blur" type="matrix"
          values="1.2 0 0 0 0.1
                  0 1.1 0 0 0.05
                  0 0 1 0 0
                  0 0 0 1 0" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* 大気遠近法フィルター */}
      <filter id="atmosphericHaze" x="0" y="0" width="100%" height="100%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
        <feColorMatrix in="blur" type="matrix"
          values="0.7 0 0.1 0 0.15
                  0 0.7 0.15 0 0.18
                  0.1 0.15 0.8 0 0.22
                  0 0 0 0.85 0" />
      </filter>

      {/* ボリュメトリックライト */}
      <filter id="volumetricLight" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="20" result="blur" />
        <feSpecularLighting in="blur" surfaceScale="5" specularConstant="0.8" specularExponent="20" lightingColor="#fff8e7">
          <fePointLight x="400" y="-100" z="300" />
        </feSpecularLighting>
        <feComposite in="SourceGraphic" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
      </filter>

      {/* 水面反射 */}
      <filter id="waterReflection" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.01 0.05" numOctaves="3" seed="1" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" />
      </filter>

      {/* フィルムグレイン */}
      <filter id="filmGrain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" result="noise" />
        <feColorMatrix in="noise" type="saturate" values="0" result="monoNoise" />
        <feBlend in="SourceGraphic" in2="monoNoise" mode="overlay" result="grain" />
        <feComponentTransfer in="grain">
          <feFuncA type="linear" slope="0.15" />
        </feComponentTransfer>
        <feBlend in="SourceGraphic" mode="overlay" />
      </filter>

      {/* 色収差 */}
      <filter id="chromaticAberration" x="-2%" y="-2%" width="104%" height="104%">
        <feOffset in="SourceGraphic" dx="-1" dy="0" result="red">
          <animate attributeName="dx" values="-1;-1.5;-1" dur="8s" repeatCount="indefinite" />
        </feOffset>
        <feOffset in="SourceGraphic" dx="1" dy="0" result="blue">
          <animate attributeName="dx" values="1;1.5;1" dur="8s" repeatCount="indefinite" />
        </feOffset>
        <feColorMatrix in="red" type="matrix"
          values="1 0 0 0 0
                  0 0 0 0 0
                  0 0 0 0 0
                  0 0 0 1 0" result="redChannel" />
        <feColorMatrix in="blue" type="matrix"
          values="0 0 0 0 0
                  0 0 0 0 0
                  0 0 1 0 0
                  0 0 0 1 0" result="blueChannel" />
        <feColorMatrix in="SourceGraphic" type="matrix"
          values="0 0 0 0 0
                  0 1 0 0 0
                  0 0 0 0 0
                  0 0 0 1 0" result="greenChannel" />
        <feBlend in="redChannel" in2="greenChannel" mode="screen" result="rg" />
        <feBlend in="rg" in2="blueChannel" mode="screen" />
      </filter>
    </defs>
  </svg>
);

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
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
// 1. 祭りの夜景 - シネマティックバージョン
// ========================================
export const FestivalNightIllustration = ({ className = '' }: { className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  // 多層パララックス
  const bgY = useTransform(scrollYProgress, [0, 1], [0, -30]);
  const midY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const fgY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const lanternY = useTransform(scrollYProgress, [0, 1], [20, -40]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <CinematicFilters />
      
      {/* フィルムグレインオーバーレイ */}
      <div 
        className="absolute inset-0 pointer-events-none z-50 mix-blend-overlay opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* 浮遊する蛍の光 */}
      <FloatingParticles count={25} color="#ffecd2" minSize={2} maxSize={5} speed={15} />
      <FloatingParticles count={15} color="#ff9f43" minSize={1} maxSize={3} speed={25} />

      <svg viewBox="0 0 800 500" className="w-full h-auto relative z-10" preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* シネマティック夜空グラデーション（ティール＆オレンジ） */}
          <linearGradient id="cinematicNightSky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0a0a1a" />
            <stop offset="25%" stopColor="#1a1a3e" />
            <stop offset="50%" stopColor="#2d2d5a" />
            <stop offset="75%" stopColor="#3d2a4a" />
            <stop offset="100%" stopColor="#4a2d3d" />
          </linearGradient>

          {/* ゴールデンアワーの残光 */}
          <linearGradient id="goldenHourHorizon" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="60%" stopColor="#ff6b3520" />
            <stop offset="80%" stopColor="#ff8e5340" />
            <stop offset="100%" stopColor="#ffa07060" />
          </linearGradient>

          {/* 提灯の暖かな光 */}
          <radialGradient id="lanternWarmGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff8e7" stopOpacity="1" />
            <stop offset="30%" stopColor="#ffcc80" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#ff9f43" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ee5a24" stopOpacity="0" />
          </radialGradient>

          {/* 花火のグラデーション */}
          <radialGradient id="fireworkCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#ffeaa7" />
            <stop offset="70%" stopColor="#fdcb6e" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f39c12" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="fireworkRed" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="20%" stopColor="#ff6b6b" />
            <stop offset="100%" stopColor="#ee5a52" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="fireworkBlue" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="20%" stopColor="#74b9ff" />
            <stop offset="100%" stopColor="#0984e3" stopOpacity="0" />
          </radialGradient>

          {/* ボリュメトリックライト用 */}
          <linearGradient id="lightBeam" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#fff8e7" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#fff8e7" stopOpacity="0" />
          </linearGradient>

          {/* 山のシルエット用グラデーション（大気遠近法） */}
          <linearGradient id="distantMountain" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3d3d6a" />
            <stop offset="100%" stopColor="#4a4a7a" />
          </linearGradient>

          <linearGradient id="nearMountain" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2d2d5a" />
            <stop offset="100%" stopColor="#1a1a3e" />
          </linearGradient>
        </defs>

        {/* === 遠景レイヤー === */}
        <motion.g style={{ y: bgY }}>
          {/* 夜空 */}
          <rect width="800" height="500" fill="url(#cinematicNightSky)" />
          
          {/* 地平線の残光 */}
          <rect x="0" y="200" width="800" height="300" fill="url(#goldenHourHorizon)" />

          {/* 星々（深度による明るさの違い） */}
          {[...Array(50)].map((_, i) => {
            const depth = Math.random();
            const size = 0.3 + depth * 1.2;
            const opacity = 0.3 + depth * 0.7;
            return (
              <motion.circle
                key={`star-${i}`}
                cx={Math.random() * 800}
                cy={Math.random() * 180}
                r={size}
                fill="#fff"
                opacity={opacity}
                animate={{ 
                  opacity: [opacity * 0.5, opacity, opacity * 0.5],
                  scale: [0.8, 1.2, 0.8]
                }}
                transition={{ 
                  duration: 2 + Math.random() * 3, 
                  repeat: Infinity, 
                  delay: Math.random() * 2 
                }}
              />
            );
          })}

          {/* 遠くの山々（大気遠近法適用） */}
          <g filter="url(#atmosphericHaze)">
            <path
              d="M0 380 Q 100 320 200 350 Q 300 300 400 340 Q 500 280 600 320 Q 700 290 800 350 L 800 500 L 0 500 Z"
              fill="url(#distantMountain)"
              opacity="0.5"
            />
          </g>
        </motion.g>

        {/* === 花火（中〜遠景） === */}
        <motion.g style={{ y: bgY }}>
          {/* 中央の大きな花火 */}
          <motion.g
            animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            {[...Array(16)].map((_, i) => {
              const angle = (i * 22.5) * Math.PI / 180;
              const length = 50 + (i % 3) * 15;
              return (
                <motion.line
                  key={`fw-main-${i}`}
                  x1="400"
                  y1="100"
                  x2={400 + Math.cos(angle) * length}
                  y2={100 + Math.sin(angle) * length}
                  stroke="url(#fireworkCore)"
                  strokeWidth={3 - (i % 3)}
                  strokeLinecap="round"
                  filter="url(#bloom)"
                  animate={{ 
                    opacity: [0, 1, 0],
                    pathLength: [0, 1, 0.5]
                  }}
                  transition={{ 
                    duration: 2.5,
                    repeat: Infinity,
                    delay: i * 0.08
                  }}
                />
              );
            })}
            <circle cx="400" cy="100" r="20" fill="url(#fireworkCore)" filter="url(#bloom)" />
          </motion.g>

          {/* 左の花火 */}
          <motion.g
            animate={{ scale: [0.7, 1.2, 0.7] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.8 }}
          >
            {[...Array(12)].map((_, i) => {
              const angle = (i * 30) * Math.PI / 180;
              return (
                <motion.circle
                  key={`fw-left-${i}`}
                  cx={180 + Math.cos(angle) * 35}
                  cy={80 + Math.sin(angle) * 35}
                  r={4}
                  fill="url(#fireworkRed)"
                  filter="url(#softGlow)"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.1 }}
                />
              );
            })}
          </motion.g>

          {/* 右の花火 */}
          <motion.g
            animate={{ scale: [0.8, 1.3, 0.8] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1.2 }}
          >
            {[...Array(12)].map((_, i) => {
              const angle = (i * 30) * Math.PI / 180;
              return (
                <motion.circle
                  key={`fw-right-${i}`}
                  cx={620 + Math.cos(angle) * 40}
                  cy={70 + Math.sin(angle) * 40}
                  r={3.5}
                  fill="url(#fireworkBlue)"
                  filter="url(#softGlow)"
                  animate={{ opacity: [0.4, 1, 0.4], scale: [0.7, 1.3, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.12 }}
                />
              );
            })}
          </motion.g>
        </motion.g>

        {/* === 中景レイヤー === */}
        <motion.g style={{ y: midY }}>
          {/* 近くの山のシルエット */}
          <path
            d="M0 360 Q 80 310 160 340 Q 240 290 320 330 Q 400 280 480 320 Q 560 270 640 310 Q 720 280 800 330 L 800 500 L 0 500 Z"
            fill="url(#nearMountain)"
          />

          {/* 露店のシルエットと暖かい光 */}
          {[
            { x: 80, width: 100, lightX: 130 },
            { x: 380, width: 90, lightX: 425 },
            { x: 680, width: 95, lightX: 727 }
          ].map((stall, i) => (
            <g key={`stall-${i}`}>
              {/* 露店構造 */}
              <path
                d={`M${stall.x} 400 L${stall.x} 460 L${stall.x + stall.width} 460 L${stall.x + stall.width} 400 L${stall.x + stall.width / 2} 375 Z`}
                fill="#2a1a0a"
              />
              {/* 暖かい光の漏れ */}
              <motion.ellipse
                cx={stall.lightX}
                cy={430}
                rx={35}
                ry={15}
                fill="url(#lanternWarmGlow)"
                opacity={0.6}
                animate={{ opacity: [0.4, 0.7, 0.4], scale: [0.95, 1.05, 0.95] }}
                transition={{ duration: 2 + i * 0.5, repeat: Infinity }}
              />
              {/* 地面への光の反射 */}
              <motion.rect
                x={stall.x + 10}
                y={455}
                width={stall.width - 20}
                height={5}
                fill="#ff9f43"
                opacity={0.3}
                animate={{ opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </g>
          ))}
        </motion.g>

        {/* === 提灯レイヤー（中景〜前景の境界） === */}
        <motion.g style={{ y: lanternY }}>
          {[
            { x: 100, y: 280, scale: 1, delay: 0 },
            { x: 250, y: 295, scale: 0.9, delay: 0.3 },
            { x: 400, y: 270, scale: 1.1, delay: 0.6 },
            { x: 550, y: 285, scale: 0.95, delay: 0.9 },
            { x: 700, y: 275, scale: 1.05, delay: 1.2 },
          ].map((lantern, i) => (
            <motion.g
              key={`lantern-${i}`}
              animate={{ 
                y: [0, -8, 0],
                rotate: [-2, 2, -2]
              }}
              transition={{ 
                duration: 4 + i * 0.3,
                repeat: Infinity,
                delay: lantern.delay,
                ease: "easeInOut"
              }}
              style={{ transformOrigin: `${lantern.x}px ${lantern.y}px` }}
            >
              {/* 光のブルーム */}
              <motion.ellipse
                cx={lantern.x}
                cy={lantern.y + 20}
                rx={50 * lantern.scale}
                ry={30 * lantern.scale}
                fill="url(#lanternWarmGlow)"
                filter="url(#bloom)"
                animate={{ 
                  opacity: [0.4, 0.7, 0.4],
                  scale: [0.9, 1.1, 0.9]
                }}
                transition={{ duration: 2.5, repeat: Infinity, delay: lantern.delay }}
              />
              
              {/* 吊り紐 */}
              <line
                x1={lantern.x}
                y1={lantern.y - 8}
                x2={lantern.x}
                y2={lantern.y - 35}
                stroke="#3d2914"
                strokeWidth="2"
              />
              
              {/* 提灯上部装飾 */}
              <rect
                x={lantern.x - 20 * lantern.scale}
                y={lantern.y - 8}
                width={40 * lantern.scale}
                height={8}
                rx="3"
                fill="#5d3a1a"
              />
              
              {/* 提灯本体（内側の光） */}
              <rect
                x={lantern.x - 17 * lantern.scale}
                y={lantern.y}
                width={34 * lantern.scale}
                height={45 * lantern.scale}
                rx="6"
                fill="#fff8e7"
                filter="url(#softGlow)"
              />
              
              {/* 提灯本体（外枠） */}
              <rect
                x={lantern.x - 18 * lantern.scale}
                y={lantern.y - 2}
                width={36 * lantern.scale}
                height={50 * lantern.scale}
                rx="6"
                fill="none"
                stroke="#ee5a24"
                strokeWidth="2"
                opacity="0.8"
              />
              
              {/* 提灯の文様 */}
              <motion.text
                x={lantern.x}
                y={lantern.y + 28 * lantern.scale}
                textAnchor="middle"
                fill="#c0392b"
                fontSize={14 * lantern.scale}
                fontWeight="bold"
                animate={{ opacity: [0.6, 0.9, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                祭
              </motion.text>
              
              {/* 提灯下部装飾 */}
              <rect
                x={lantern.x - 20 * lantern.scale}
                y={lantern.y + 45 * lantern.scale}
                width={40 * lantern.scale}
                height={8}
                rx="3"
                fill="#5d3a1a"
              />
              
              {/* 地面への光の投影 */}
              <motion.ellipse
                cx={lantern.x}
                cy={lantern.y + 100}
                rx={30 * lantern.scale}
                ry={12 * lantern.scale}
                fill="#ff9f43"
                opacity={0.25}
                animate={{ opacity: [0.15, 0.35, 0.15], scale: [0.9, 1.1, 0.9] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
            </motion.g>
          ))}
        </motion.g>

        {/* === 前景レイヤー（ぼかし強め） === */}
        <motion.g style={{ y: fgY }} filter="url(#atmosphericHaze)">
          {/* 前景の人々のシルエット（大きめ・ぼかし） */}
          {[
            { x: 60, scale: 1.3, type: 'couple' },
            { x: 740, scale: 1.2, type: 'single' },
          ].map((person, i) => (
            <g key={`fg-person-${i}`} opacity="0.6">
              {person.type === 'couple' ? (
                <>
                  <ellipse cx={person.x} cy={470} rx={12 * person.scale} ry={18 * person.scale} fill="#1a0a0a" />
                  <circle cx={person.x} cy={445} r={8 * person.scale} fill="#1a0a0a" />
                  <ellipse cx={person.x + 25} cy={475} rx={10 * person.scale} ry={15 * person.scale} fill="#1a0a0a" />
                  <circle cx={person.x + 25} cy={455} r={7 * person.scale} fill="#1a0a0a" />
                </>
              ) : (
                <>
                  <ellipse cx={person.x} cy={475} rx={11 * person.scale} ry={16 * person.scale} fill="#1a0a0a" />
                  <circle cx={person.x} cy={455} r={7 * person.scale} fill="#1a0a0a" />
                </>
              )}
            </g>
          ))}
        </motion.g>

        {/* 中景の人々 */}
        {[
          { x: 200, scale: 0.85 },
          { x: 300, scale: 0.75 },
          { x: 500, scale: 0.9 },
          { x: 600, scale: 0.7 },
        ].map((person, i) => (
          <motion.g
            key={`person-${i}`}
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.8 }}
          >
            <ellipse
              cx={person.x}
              cy={450}
              rx={10 * person.scale}
              ry={14 * person.scale}
              fill="#1a1a3e"
            />
            <circle
              cx={person.x}
              cy={430}
              r={7 * person.scale}
              fill="#1a1a3e"
            />
          </motion.g>
        ))}

        {/* 地面 */}
        <rect x="0" y="460" width="800" height="40" fill="#1a1a3e" />
        
        {/* 地面の光の反射 */}
        <motion.rect
          x="0"
          y="455"
          width="800"
          height="15"
          fill="url(#goldenHourHorizon)"
          opacity="0.3"
          animate={{ opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 3, repeat: Infinity }}
        />

        {/* ビネット効果 */}
        <defs>
          <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
            <stop offset="60%" stopColor="transparent" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.5" />
          </radialGradient>
        </defs>
        <rect width="800" height="500" fill="url(#vignette)" />
      </svg>

      {/* CSS色収差効果 */}
      <div 
        className="absolute inset-0 pointer-events-none z-20 mix-blend-screen opacity-[0.03]"
        style={{
          background: 'linear-gradient(90deg, rgba(255,0,0,0.1) 0%, transparent 50%, rgba(0,0,255,0.1) 100%)',
        }}
      />
    </div>
  );
};

// ========================================
// 2. 田園風景 - シネマティックバージョン
// ========================================
export const CountrysideIllustration = ({ className = '' }: { className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const bgY = useTransform(scrollYProgress, [0, 1], [0, -20]);
  const midY = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const fgY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const cloudX = useTransform(scrollYProgress, [0, 1], [-30, 60]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <CinematicFilters />

      {/* フィルムグレインオーバーレイ */}
      <div 
        className="absolute inset-0 pointer-events-none z-50 mix-blend-overlay opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* 空中を舞う塵・花粉 */}
      <FloatingParticles count={20} color="#fff8dc" minSize={1} maxSize={2} speed={30} />

      <svg viewBox="0 0 800 450" className="w-full h-auto relative z-10" preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* シネマティック空グラデーション */}
          <linearGradient id="cinematicDaySky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5d9cec" />
            <stop offset="30%" stopColor="#87CEEB" />
            <stop offset="60%" stopColor="#b8d4e8" />
            <stop offset="100%" stopColor="#e8f0f5" />
          </linearGradient>

          {/* 太陽のグロー */}
          <radialGradient id="sunCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#FFF59D" />
            <stop offset="100%" stopColor="#FFEB3B" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="sunHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF59D" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#FFE082" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FFD54F" stopOpacity="0" />
          </radialGradient>

          {/* ボリュメトリックライト（光芒） */}
          <linearGradient id="godRay" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#fff8e7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#fff8e7" stopOpacity="0" />
          </linearGradient>

          {/* 草原グラデーション */}
          <linearGradient id="grassCinematic" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8BC34A" />
            <stop offset="50%" stopColor="#7CB342" />
            <stop offset="100%" stopColor="#558B2F" />
          </linearGradient>

          {/* 麦穂グラデーション */}
          <linearGradient id="wheatGolden" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFD54F" />
            <stop offset="50%" stopColor="#FFC107" />
            <stop offset="100%" stopColor="#FF8F00" />
          </linearGradient>

          {/* 大気遠近法用の山グラデーション */}
          <linearGradient id="distantHill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a8c5a8" />
            <stop offset="100%" stopColor="#90b890" />
          </linearGradient>

          <linearGradient id="midHill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#81C784" />
            <stop offset="100%" stopColor="#66BB6A" />
          </linearGradient>
        </defs>

        {/* === 遠景レイヤー === */}
        <motion.g style={{ y: bgY }}>
          {/* 空 */}
          <rect width="800" height="450" fill="url(#cinematicDaySky)" />

          {/* 太陽とハロ */}
          <motion.g
            animate={{ rotate: [0, 5, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: '680px 70px' }}
          >
            {/* 太陽のハロ（大） */}
            <motion.circle
              cx="680"
              cy="70"
              r="100"
              fill="url(#sunHalo)"
              filter="url(#bloom)"
              animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.8, 0.6] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            {/* 太陽コア */}
            <circle cx="680" cy="70" r="45" fill="url(#sunCore)" filter="url(#bloom)" />
            
            {/* 光芒（ゴッドレイ） */}
            {[...Array(8)].map((_, i) => {
              const angle = (i * 45) * Math.PI / 180;
              const length = 120 + (i % 2) * 40;
              return (
                <motion.line
                  key={`godray-${i}`}
                  x1="680"
                  y1="70"
                  x2={680 + Math.cos(angle) * length}
                  y2={70 + Math.sin(angle) * length}
                  stroke="url(#godRay)"
                  strokeWidth={15 - (i % 3) * 3}
                  strokeLinecap="round"
                  opacity={0.3}
                  animate={{ opacity: [0.2, 0.4, 0.2], scaleX: [0.9, 1.1, 0.9] }}
                  transition={{ duration: 3 + i * 0.5, repeat: Infinity }}
                />
              );
            })}
          </motion.g>

          {/* 雲 */}
          <motion.g style={{ x: cloudX }}>
            {/* 雲1（ふわふわ感のある雲） */}
            <g opacity="0.9" filter="url(#softGlow)">
              <ellipse cx="150" cy="100" rx="55" ry="32" fill="white" />
              <ellipse cx="195" cy="88" rx="45" ry="28" fill="white" />
              <ellipse cx="115" cy="95" rx="40" ry="25" fill="white" />
              <ellipse cx="160" cy="115" rx="35" ry="20" fill="#f8f8f8" />
            </g>
            {/* 雲2 */}
            <g opacity="0.85" filter="url(#softGlow)">
              <ellipse cx="450" cy="65" rx="50" ry="30" fill="white" />
              <ellipse cx="490" cy="55" rx="40" ry="25" fill="white" />
              <ellipse cx="415" cy="60" rx="35" ry="22" fill="white" />
            </g>
            {/* 雲3（遠く小さい） */}
            <g opacity="0.6">
              <ellipse cx="300" cy="50" rx="25" ry="15" fill="white" />
              <ellipse cx="320" cy="45" rx="20" ry="12" fill="white" />
            </g>
          </motion.g>

          {/* 遠くの山（大気遠近法：薄く青みがかる） */}
          <g filter="url(#atmosphericHaze)" opacity="0.5">
            <path
              d="M0 280 Q 80 230 160 260 Q 240 210 320 250 Q 400 190 480 240 Q 560 200 640 235 Q 720 195 800 250 L 800 450 L 0 450 Z"
              fill="url(#distantHill)"
            />
          </g>
        </motion.g>

        {/* === 中景レイヤー === */}
        <motion.g style={{ y: midY }}>
          {/* 近くの丘 */}
          <path
            d="M0 320 Q 100 280 200 305 Q 300 265 400 295 Q 500 260 600 290 Q 700 270 800 310 L 800 450 L 0 450 Z"
            fill="url(#midHill)"
          />

          {/* 麦畑 */}
          <g>
            {[...Array(50)].map((_, i) => {
              const x = 30 + (i * 15);
              const height = 55 + (i % 6) * 8;
              const delay = i * 0.05;
              return (
                <motion.g
                  key={`wheat-${i}`}
                  animate={{ rotate: [-4, 4, -4] }}
                  transition={{ 
                    duration: 2.5 + (i % 4) * 0.3, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  style={{ transformOrigin: `${x}px 385px` }}
                >
                  <line
                    x1={x}
                    y1={385}
                    x2={x}
                    y2={385 - height}
                    stroke="#8D6E63"
                    strokeWidth="1.5"
                  />
                  <motion.ellipse
                    cx={x}
                    cy={385 - height - 10}
                    rx="4"
                    ry="14"
                    fill="url(#wheatGolden)"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay }}
                  />
                  {/* 麦の細かい実 */}
                  <ellipse cx={x - 2} cy={385 - height - 5} rx="2" ry="4" fill="#FFB300" />
                  <ellipse cx={x + 2} cy={385 - height - 8} rx="2" ry="4" fill="#FFB300" />
                </motion.g>
              );
            })}
          </g>

          {/* 農家の家 */}
          <g>
            {/* 家の影 */}
            <ellipse cx="600" cy="370" rx="50" ry="8" fill="#3d5c3d" opacity="0.3" />
            
            {/* 家本体 */}
            <rect x="550" y="305" width="85" height="60" fill="#D7CCC8" />
            <rect x="548" y="303" width="89" height="64" fill="none" stroke="#BCAAA4" strokeWidth="2" />
            
            {/* 屋根 */}
            <path d="M538 305 L592 255 L646 305 Z" fill="#6D4C41" />
            <path d="M538 305 L592 255" stroke="#5D4037" strokeWidth="2" />
            <path d="M592 255 L646 305" stroke="#5D4037" strokeWidth="2" />
            
            {/* 煙突 */}
            <rect x="610" y="265" width="12" height="25" fill="#795548" />
            
            {/* 煙 */}
            {[...Array(3)].map((_, i) => (
              <motion.ellipse
                key={`smoke-${i}`}
                cx={616}
                cy={260 - i * 15}
                rx={5 + i * 3}
                ry={4 + i * 2}
                fill="#9E9E9E"
                opacity={0.4 - i * 0.1}
                animate={{ 
                  y: [0, -20, -40],
                  x: [0, 5, 10],
                  opacity: [0.4 - i * 0.1, 0.2, 0],
                  scale: [1, 1.5, 2]
                }}
                transition={{ 
                  duration: 4,
                  repeat: Infinity,
                  delay: i * 1.2
                }}
              />
            ))}
            
            {/* 窓（光る） */}
            <rect x="560" y="320" width="22" height="22" fill="#FFE082" />
            <motion.rect
              x="560" y="320" width="22" height="22"
              fill="#FFEB3B"
              animate={{ opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <line x1="571" y1="320" x2="571" y2="342" stroke="#5D4037" strokeWidth="2" />
            <line x1="560" y1="331" x2="582" y2="331" stroke="#5D4037" strokeWidth="2" />
            
            {/* ドア */}
            <rect x="600" y="335" width="22" height="30" fill="#5D4037" />
            <circle cx="618" cy="352" r="2" fill="#FFD54F" />
          </g>

          {/* 木々 */}
          <g>
            {/* 木1 */}
            <rect x="683" y="310" width="16" height="55" fill="#5D4037" />
            <ellipse cx="691" cy="285" rx="40" ry="45" fill="#43A047" />
            <ellipse cx="670" cy="300" rx="28" ry="33" fill="#4CAF50" />
            <ellipse cx="712" cy="295" rx="32" ry="38" fill="#388E3C" />
            {/* 木のハイライト */}
            <ellipse cx="680" cy="275" rx="15" ry="18" fill="#66BB6A" opacity="0.6" />
            
            {/* 木2 */}
            <rect x="728" y="325" width="12" height="40" fill="#5D4037" />
            <ellipse cx="734" cy="305" rx="30" ry="35" fill="#43A047" />
            <ellipse cx="718" cy="315" rx="22" ry="26" fill="#4CAF50" />
          </g>
        </motion.g>

        {/* === 前景レイヤー === */}
        <motion.g style={{ y: fgY }}>
          {/* 農作業する人 */}
          <motion.g
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* 体 */}
            <ellipse cx="300" cy="370" rx="11" ry="16" fill="#8D6E63" />
            {/* 頭 */}
            <circle cx="300" cy="348" r="9" fill="#FFCCBC" />
            {/* 帽子 */}
            <ellipse cx="300" cy="342" rx="14" ry="5" fill="#F5E6D3" />
            <ellipse cx="300" cy="340" rx="9" ry="7" fill="#E0D5C5" />
            {/* 腕 */}
            <line x1="289" y1="358" x2="272" y2="370" stroke="#FFCCBC" strokeWidth="4" strokeLinecap="round" />
            <motion.line
              x1="311"
              y1="358"
              x2="330"
              y2="345"
              stroke="#FFCCBC"
              strokeWidth="4"
              strokeLinecap="round"
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ transformOrigin: '311px 358px' }}
            />
            {/* 鎌 */}
            <motion.g
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ transformOrigin: '330px 345px' }}
            >
              <line x1="330" y1="345" x2="348" y2="328" stroke="#5D4037" strokeWidth="3" />
              <path d="M348 328 Q 360 322 355 342" stroke="#90A4AE" strokeWidth="2.5" fill="none" />
            </motion.g>
          </motion.g>

          {/* かかし */}
          <g>
            <line x1="180" y1="385" x2="180" y2="325" stroke="#5D4037" strokeWidth="5" />
            <line x1="158" y1="345" x2="202" y2="345" stroke="#5D4037" strokeWidth="4" />
            <circle cx="180" cy="312" r="13" fill="#FFCCBC" />
            <ellipse cx="180" cy="309" rx="16" ry="6" fill="#F5E6D3" />
            <motion.g
              animate={{ rotate: [-6, 6, -6] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: '180px 345px' }}
            >
              <rect x="163" y="330" width="34" height="28" fill="#3F51B5" />
              {/* 服のしわ */}
              <line x1="170" y1="335" x2="170" y2="355" stroke="#303F9F" strokeWidth="1" />
              <line x1="190" y1="335" x2="190" y2="355" stroke="#303F9F" strokeWidth="1" />
            </motion.g>
            {/* かかしの影 */}
            <ellipse cx="180" cy="390" rx="20" ry="5" fill="#3d5c3d" opacity="0.3" />
          </g>
        </motion.g>

        {/* 蝶々 */}
        {[
          { x: 140, y: 200, color1: '#FF9800', color2: '#F57C00' },
          { x: 420, y: 170, color1: '#E91E63', color2: '#C2185B' },
          { x: 580, y: 220, color1: '#9C27B0', color2: '#7B1FA2' },
        ].map((butterfly, i) => (
          <motion.g
            key={`butterfly-${i}`}
            animate={{ 
              x: [0, 40, 0, -30, 0],
              y: [0, -25, 0, -15, 0]
            }}
            transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.ellipse
              cx={butterfly.x - 6}
              cy={butterfly.y}
              rx="7"
              ry="5"
              fill={butterfly.color1}
              animate={{ scaleX: [1, 0.2, 1] }}
              transition={{ duration: 0.25, repeat: Infinity }}
            />
            <motion.ellipse
              cx={butterfly.x + 6}
              cy={butterfly.y}
              rx="7"
              ry="5"
              fill={butterfly.color1}
              animate={{ scaleX: [1, 0.2, 1] }}
              transition={{ duration: 0.25, repeat: Infinity }}
            />
            <ellipse cx={butterfly.x} cy={butterfly.y} rx="2.5" ry="6" fill="#3E2723" />
          </motion.g>
        ))}

        {/* 地面 */}
        <rect x="0" y="385" width="800" height="65" fill="url(#grassCinematic)" />
        
        {/* 地面のテクスチャ */}
        {[...Array(20)].map((_, i) => (
          <line
            key={`grass-blade-${i}`}
            x1={i * 42}
            y1={390}
            x2={i * 42 + 5}
            y2={380}
            stroke="#4CAF50"
            strokeWidth="2"
          />
        ))}

        {/* ビネット */}
        <defs>
          <radialGradient id="vignettDay" cx="50%" cy="50%" r="75%">
            <stop offset="50%" stopColor="transparent" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.25" />
          </radialGradient>
        </defs>
        <rect width="800" height="450" fill="url(#vignettDay)" />
      </svg>

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
    </div>
  );
};

// ========================================
// 3. 旅人のシルエット - シネマティックバージョン
// ========================================
export const TravelerIllustration = ({ className = '' }: { className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const travelerX = useTransform(scrollYProgress, [0, 1], [-15, 25]);
  const bgY = useTransform(scrollYProgress, [0, 1], [0, -15]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <CinematicFilters />

      {/* フィルムグレイン */}
      <div 
        className="absolute inset-0 pointer-events-none z-50 mix-blend-overlay opacity-25"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* 浮遊する光の粒子（夕焼けの塵） */}
      <FloatingParticles count={15} color="#ffecd2" minSize={1} maxSize={2} speed={25} />

      <svg viewBox="0 0 400 300" className="w-full h-auto relative z-10" preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* ゴールデンアワー夕焼けグラデーション */}
          <linearGradient id="goldenHourSky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2d1b4e" />
            <stop offset="20%" stopColor="#6b3a5c" />
            <stop offset="40%" stopColor="#c94b4b" />
            <stop offset="60%" stopColor="#ff7b4a" />
            <stop offset="80%" stopColor="#ffaa5c" />
            <stop offset="100%" stopColor="#ffd89b" />
          </linearGradient>

          {/* 太陽グラデーション */}
          <radialGradient id="settingSun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#fff3cd" />
            <stop offset="60%" stopColor="#ffd54f" />
            <stop offset="100%" stopColor="#ff8c00" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="sunAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffd54f" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#ff8c00" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ff6b35" stopOpacity="0" />
          </radialGradient>

          {/* シルエット用の深い色 */}
          <linearGradient id="silhouetteGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a0a0a" />
            <stop offset="100%" stopColor="#2d1515" />
          </linearGradient>

          {/* 道のグラデーション */}
          <linearGradient id="cinematicPath" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4a3728" />
            <stop offset="50%" stopColor="#6b5344" />
            <stop offset="100%" stopColor="#8b7355" />
          </linearGradient>
        </defs>

        {/* === 遠景 === */}
        <motion.g style={{ y: bgY }}>
          {/* 夕焼け空 */}
          <rect width="400" height="300" fill="url(#goldenHourSky)" />

          {/* 太陽のオーラ */}
          <motion.circle
            cx="320"
            cy="110"
            r="80"
            fill="url(#sunAura)"
            filter="url(#bloom)"
            animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 5, repeat: Infinity }}
          />

          {/* 太陽 */}
          <motion.circle
            cx="320"
            cy="110"
            r="42"
            fill="url(#settingSun)"
            filter="url(#bloom)"
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
          />

          {/* 光芒 */}
          {[...Array(6)].map((_, i) => {
            const angle = (i * 60 - 30) * Math.PI / 180;
            return (
              <motion.line
                key={`ray-${i}`}
                x1="320"
                y1="110"
                x2={320 + Math.cos(angle) * 150}
                y2={110 + Math.sin(angle) * 150}
                stroke="url(#sunAura)"
                strokeWidth={8}
                strokeLinecap="round"
                opacity={0.2}
                animate={{ opacity: [0.15, 0.3, 0.15], scaleX: [0.8, 1.1, 0.8] }}
                transition={{ duration: 4 + i * 0.5, repeat: Infinity }}
              />
            );
          })}

          {/* 遠くの山々（大気遠近法で紫がかる） */}
          <g filter="url(#atmosphericHaze)" opacity="0.4">
            <path
              d="M0 200 Q 40 165 80 185 Q 120 150 160 175 Q 200 140 240 170 Q 280 130 320 165 Q 360 145 400 180 L 400 300 L 0 300 Z"
              fill="#5d3a5a"
            />
          </g>

          {/* 中間の山 */}
          <g opacity="0.6">
            <path
              d="M0 220 Q 60 185 120 205 Q 180 170 240 195 Q 300 160 360 190 Q 380 175 400 200 L 400 300 L 0 300 Z"
              fill="#4a2d4a"
            />
          </g>
        </motion.g>

        {/* === 中景 === */}
        {/* 近くの丘 */}
        <path
          d="M0 235 Q 80 205 160 225 Q 240 195 320 220 Q 360 205 400 230 L 400 300 L 0 300 Z"
          fill="#3d2020"
        />

        {/* 道 */}
        <path
          d="M175 300 Q 190 270 205 245 Q 225 215 255 195 Q 285 175 320 160"
          fill="none"
          stroke="url(#cinematicPath)"
          strokeWidth="22"
          strokeLinecap="round"
        />
        {/* 道のエッジライト */}
        <path
          d="M175 300 Q 190 270 205 245 Q 225 215 255 195 Q 285 175 320 160"
          fill="none"
          stroke="#ffd89b"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.3"
        />

        {/* 道標 */}
        <g>
          <rect x="288" y="148" width="5" height="45" fill="#3d2914" />
          <rect x="282" y="142" width="42" height="18" fill="#5d4037" rx="2" />
          <motion.text
            x="303"
            y="155"
            textAnchor="middle"
            fill="#ffd89b"
            fontSize="10"
            fontWeight="bold"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            →
          </motion.text>
          {/* 道標の影 */}
          <ellipse cx="290" cy="193" rx="8" ry="3" fill="#1a0a0a" opacity="0.4" />
        </g>

        {/* === 旅人 === */}
        <motion.g style={{ x: travelerX }}>
          {/* 旅人の影 */}
          <motion.ellipse
            cx="205"
            cy="260"
            rx="20"
            ry="6"
            fill="#1a0a0a"
            opacity="0.5"
            animate={{ scaleX: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />

          {/* 体のシルエット */}
          <ellipse cx="205" cy="230" rx="13" ry="20" fill="url(#silhouetteGradient)" />
          
          {/* 頭 */}
          <circle cx="205" cy="202" r="12" fill="url(#silhouetteGradient)" />
          
          {/* 帽子 */}
          <ellipse cx="205" cy="194" rx="16" ry="6" fill="url(#silhouetteGradient)" />
          <ellipse cx="205" cy="190" rx="10" ry="10" fill="url(#silhouetteGradient)" />
          
          {/* リュック */}
          <ellipse cx="193" cy="225" rx="9" ry="14" fill="#2d1515" />
          
          {/* 杖 */}
          <motion.line
            x1="222"
            y1="215"
            x2="240"
            y2="255"
            stroke="#4a3020"
            strokeWidth="4"
            strokeLinecap="round"
            animate={{ rotate: [-3, 3, -3] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            style={{ transformOrigin: '222px 215px' }}
          />
          
          {/* 足の動き */}
          <motion.g
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          >
            <line x1="198" y1="248" x2="192" y2="262" stroke="url(#silhouetteGradient)" strokeWidth="5" strokeLinecap="round" />
          </motion.g>
          <motion.g
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
          >
            <line x1="212" y1="248" x2="218" y2="262" stroke="url(#silhouetteGradient)" strokeWidth="5" strokeLinecap="round" />
          </motion.g>

          {/* 旅人を縁取る逆光のハイライト */}
          <ellipse
            cx="205"
            cy="230"
            rx="14"
            ry="21"
            fill="none"
            stroke="#ffd89b"
            strokeWidth="1"
            opacity="0.4"
          />
          <circle
            cx="205"
            cy="202"
            r="13"
            fill="none"
            stroke="#ffd89b"
            strokeWidth="1"
            opacity="0.4"
          />
        </motion.g>

        {/* 鳥たち */}
        {[
          { x: 70, y: 55, delay: 0 },
          { x: 95, y: 45, delay: 0.15 },
          { x: 115, y: 60, delay: 0.3 },
          { x: 140, y: 50, delay: 0.45 },
        ].map((bird, i) => (
          <motion.path
            key={`bird-${i}`}
            d={`M${bird.x} ${bird.y} Q ${bird.x + 6} ${bird.y - 5} ${bird.x + 12} ${bird.y} Q ${bird.x + 18} ${bird.y - 5} ${bird.x + 24} ${bird.y}`}
            fill="none"
            stroke="#2d1515"
            strokeWidth="2"
            strokeLinecap="round"
            animate={{ 
              y: [0, -8, 0],
              x: [0, 15, 0]
            }}
            transition={{ duration: 4, repeat: Infinity, delay: bird.delay }}
          />
        ))}

        {/* 地面 */}
        <path
          d="M0 260 Q 100 250 200 260 Q 300 250 400 260 L 400 300 L 0 300 Z"
          fill="#2d1515"
        />

        {/* ビネット */}
        <defs>
          <radialGradient id="vignetteSunset" cx="50%" cy="50%" r="70%">
            <stop offset="50%" stopColor="transparent" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.45" />
          </radialGradient>
        </defs>
        <rect width="400" height="300" fill="url(#vignetteSunset)" />
      </svg>

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