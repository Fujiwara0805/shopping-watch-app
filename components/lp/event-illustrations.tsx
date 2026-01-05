'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

// ========================================
// 1. 祭りの夜景イラスト - 灯篭と花火
// ========================================
export const FestivalNightIllustration = ({ className = '' }: { className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const lanternY = useTransform(scrollYProgress, [0, 1], [20, -20]);
  const fireworkScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1.2, 0.9]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <svg viewBox="0 0 800 500" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* グラデーション定義 */}
          <linearGradient id="nightSky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a1a3e" />
            <stop offset="50%" stopColor="#2d2d5a" />
            <stop offset="100%" stopColor="#4a3a5c" />
          </linearGradient>
          
          <linearGradient id="lanternGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff9f43" />
            <stop offset="100%" stopColor="#ee5a24" />
          </linearGradient>

          <radialGradient id="fireworkGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffeaa7" stopOpacity="1" />
            <stop offset="70%" stopColor="#fdcb6e" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f39c12" stopOpacity="0" />
          </radialGradient>

          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* 羊皮紙テクスチャ */}
          <pattern id="parchmentTexture" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="#f5e6d3" />
            <circle cx="20" cy="30" r="1" fill="#d4c4a8" opacity="0.3" />
            <circle cx="60" cy="70" r="0.8" fill="#d4c4a8" opacity="0.2" />
            <circle cx="80" cy="20" r="1.2" fill="#d4c4a8" opacity="0.25" />
          </pattern>
        </defs>

        {/* 背景 - 夜空 */}
        <rect width="800" height="500" fill="url(#nightSky)" />
        
        {/* 星々 */}
        {[...Array(30)].map((_, i) => (
          <motion.circle
            key={`star-${i}`}
            cx={50 + (i * 25) % 700}
            cy={30 + (i * 17) % 200}
            r={0.5 + (i % 3) * 0.3}
            fill="#fff"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: i * 0.1 }}
          />
        ))}

        {/* 花火 - 中央 */}
        <motion.g
          style={{ scale: fireworkScale }}
          className="origin-center"
        >
          {/* 花火の光線 */}
          {[...Array(12)].map((_, i) => {
            const angle = (i * 30) * Math.PI / 180;
            const x1 = 400;
            const y1 = 120;
            const x2 = 400 + Math.cos(angle) * 60;
            const y2 = 120 + Math.sin(angle) * 60;
            return (
              <motion.line
                key={`firework-line-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#ffeaa7"
                strokeWidth="2"
                filter="url(#glow)"
                animate={{ 
                  opacity: [0, 1, 0],
                  strokeWidth: [1, 3, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.1
                }}
              />
            );
          })}
          <circle cx="400" cy="120" r="15" fill="url(#fireworkGlow)" filter="url(#glow)" />
        </motion.g>

        {/* 花火 - 左 */}
        <motion.g
          animate={{ scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
        >
          {[...Array(8)].map((_, i) => {
            const angle = (i * 45) * Math.PI / 180;
            return (
              <motion.circle
                key={`firework-left-${i}`}
                cx={200 + Math.cos(angle) * 40}
                cy={100 + Math.sin(angle) * 40}
                r="4"
                fill="#ff6b6b"
                filter="url(#glow)"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
              />
            );
          })}
        </motion.g>

        {/* 花火 - 右 */}
        <motion.g
          animate={{ scale: [0.9, 1.2, 0.9] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
        >
          {[...Array(8)].map((_, i) => {
            const angle = (i * 45) * Math.PI / 180;
            return (
              <motion.circle
                key={`firework-right-${i}`}
                cx={600 + Math.cos(angle) * 35}
                cy={80 + Math.sin(angle) * 35}
                r="3"
                fill="#74b9ff"
                filter="url(#glow)"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.12 }}
              />
            );
          })}
        </motion.g>

        {/* 山のシルエット */}
        <path
          d="M0 350 Q 100 280 200 320 Q 300 280 400 300 Q 500 260 600 290 Q 700 270 800 320 L 800 500 L 0 500 Z"
          fill="#2d2d5a"
          opacity="0.8"
        />

        {/* 灯篭 - 複数配置 */}
        {[
          { x: 100, y: 280, delay: 0 },
          { x: 250, y: 300, delay: 0.3 },
          { x: 400, y: 270, delay: 0.6 },
          { x: 550, y: 290, delay: 0.9 },
          { x: 700, y: 275, delay: 1.2 },
        ].map((lantern, i) => (
          <motion.g
            key={`lantern-${i}`}
            style={{ y: lanternY }}
            animate={{ 
              y: [0, -5, 0],
              rotate: [-2, 2, -2]
            }}
            transition={{ 
              duration: 3 + i * 0.5,
              repeat: Infinity,
              delay: lantern.delay
            }}
          >
            {/* 灯篭本体 */}
            <rect
              x={lantern.x - 15}
              y={lantern.y}
              width="30"
              height="40"
              rx="5"
              fill="url(#lanternGlow)"
              filter="url(#glow)"
            />
            {/* 灯篭の装飾 */}
            <rect
              x={lantern.x - 18}
              y={lantern.y - 5}
              width="36"
              height="8"
              rx="2"
              fill="#8b4513"
            />
            <rect
              x={lantern.x - 18}
              y={lantern.y + 37}
              width="36"
              height="8"
              rx="2"
              fill="#8b4513"
            />
            {/* 吊り紐 */}
            <line
              x1={lantern.x}
              y1={lantern.y - 5}
              x2={lantern.x}
              y2={lantern.y - 30}
              stroke="#5c3a21"
              strokeWidth="2"
            />
            {/* 光の効果 */}
            <motion.ellipse
              cx={lantern.x}
              cy={lantern.y + 50}
              rx="25"
              ry="10"
              fill="#ff9f43"
              opacity="0.3"
              animate={{ opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.g>
        ))}

        {/* 露店のシルエット */}
        <g opacity="0.9">
          {/* 左の露店 */}
          <path
            d="M50 380 L50 450 L150 450 L150 380 L100 350 Z"
            fill="#3d2914"
          />
          <rect x="55" y="400" width="40" height="45" fill="#5c3a21" />
          <motion.rect
            x="100" y="400" width="45" height="45"
            fill="#8b6914"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          {/* 中央の露店 */}
          <path
            d="M350 390 L350 450 L450 450 L450 390 L400 365 Z"
            fill="#3d2914"
          />
          <rect x="360" y="405" width="35" height="40" fill="#5c3a21" />
          <motion.rect
            x="400" y="405" width="40" height="40"
            fill="#ee5a24"
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />

          {/* 右の露店 */}
          <path
            d="M650 385 L650 450 L750 450 L750 385 L700 360 Z"
            fill="#3d2914"
          />
          <rect x="660" y="400" width="35" height="45" fill="#5c3a21" />
          <motion.rect
            x="700" y="400" width="40" height="45"
            fill="#ff9f43"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
        </g>

        {/* 人々のシルエット */}
        {[
          { x: 180, scale: 0.8 },
          { x: 280, scale: 0.9 },
          { x: 320, scale: 0.7 },
          { x: 500, scale: 0.85 },
          { x: 580, scale: 0.75 },
        ].map((person, i) => (
          <motion.g
            key={`person-${i}`}
            animate={{ x: [0, 3, 0] }}
            transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
          >
            <ellipse
              cx={person.x}
              cy={440}
              rx={8 * person.scale}
              ry={12 * person.scale}
              fill="#1a1a3e"
            />
            <circle
              cx={person.x}
              cy={420}
              r={6 * person.scale}
              fill="#1a1a3e"
            />
          </motion.g>
        ))}

        {/* 地面 */}
        <rect x="0" y="450" width="800" height="50" fill="#2d2d5a" />
      </svg>
    </div>
  );
};

// ========================================
// 2. 田園風景イラスト - 収穫祭・自然
// ========================================
export const CountrysideIllustration = ({ className = '' }: { className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const cloudX = useTransform(scrollYProgress, [0, 1], [-50, 50]);
  const sunRotate = useTransform(scrollYProgress, [0, 1], [0, 30]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <svg viewBox="0 0 800 450" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="daySky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#87CEEB" />
            <stop offset="50%" stopColor="#B0E0E6" />
            <stop offset="100%" stopColor="#E0F7FA" />
          </linearGradient>

          <linearGradient id="grass" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7CB342" />
            <stop offset="100%" stopColor="#558B2F" />
          </linearGradient>

          <linearGradient id="wheat" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F9A825" />
            <stop offset="100%" stopColor="#F57F17" />
          </linearGradient>

          <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF59D" />
            <stop offset="50%" stopColor="#FFEE58" />
            <stop offset="100%" stopColor="#FDD835" stopOpacity="0.5" />
          </radialGradient>

          <filter id="softGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 空 */}
        <rect width="800" height="450" fill="url(#daySky)" />

        {/* 太陽 */}
        <motion.g style={{ rotate: sunRotate }} className="origin-center">
          <circle cx="680" cy="80" r="50" fill="url(#sunGlow)" filter="url(#softGlow)" />
          {/* 太陽光線 */}
          {[...Array(12)].map((_, i) => {
            const angle = (i * 30) * Math.PI / 180;
            return (
              <motion.line
                key={`sunray-${i}`}
                x1={680 + Math.cos(angle) * 55}
                y1={80 + Math.sin(angle) * 55}
                x2={680 + Math.cos(angle) * 75}
                y2={80 + Math.sin(angle) * 75}
                stroke="#FFF59D"
                strokeWidth="3"
                strokeLinecap="round"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
              />
            );
          })}
        </motion.g>

        {/* 雲 */}
        <motion.g style={{ x: cloudX }}>
          {/* 雲1 */}
          <g opacity="0.9">
            <ellipse cx="150" cy="100" rx="50" ry="30" fill="white" />
            <ellipse cx="190" cy="90" rx="40" ry="25" fill="white" />
            <ellipse cx="120" cy="95" rx="35" ry="22" fill="white" />
          </g>
          {/* 雲2 */}
          <g opacity="0.85">
            <ellipse cx="450" cy="70" rx="45" ry="28" fill="white" />
            <ellipse cx="485" cy="60" rx="35" ry="22" fill="white" />
            <ellipse cx="420" cy="65" rx="30" ry="20" fill="white" />
          </g>
        </motion.g>

        {/* 遠くの山 */}
        <path
          d="M0 280 Q 100 220 200 250 Q 300 200 400 230 Q 500 180 600 220 Q 700 190 800 240 L 800 450 L 0 450 Z"
          fill="#81C784"
          opacity="0.6"
        />

        {/* 近くの丘 */}
        <path
          d="M0 320 Q 150 280 300 310 Q 450 270 600 300 Q 700 280 800 320 L 800 450 L 0 450 Z"
          fill="url(#grass)"
        />

        {/* 麦畑 */}
        <g>
          {[...Array(40)].map((_, i) => {
            const x = 50 + (i * 18);
            const height = 60 + (i % 5) * 10;
            return (
              <motion.g
                key={`wheat-${i}`}
                animate={{ rotate: [-3, 3, -3] }}
                transition={{ duration: 2 + (i % 3) * 0.5, repeat: Infinity }}
                style={{ transformOrigin: `${x}px 380px` }}
              >
                <line
                  x1={x}
                  y1={380}
                  x2={x}
                  y2={380 - height}
                  stroke="#8D6E63"
                  strokeWidth="2"
                />
                <ellipse
                  cx={x}
                  cy={380 - height - 8}
                  rx="4"
                  ry="12"
                  fill="url(#wheat)"
                />
              </motion.g>
            );
          })}
        </g>

        {/* 農家の家 */}
        <g>
          {/* 家本体 */}
          <rect x="550" y="300" width="80" height="60" fill="#D7CCC8" />
          {/* 屋根 */}
          <path d="M540 300 L590 260 L640 300 Z" fill="#8D6E63" />
          {/* 窓 */}
          <rect x="560" y="315" width="20" height="20" fill="#FFF59D" />
          <motion.rect
            x="560" y="315" width="20" height="20"
            fill="#FFEB3B"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          {/* ドア */}
          <rect x="600" y="330" width="20" height="30" fill="#5D4037" />
        </g>

        {/* 木 */}
        <g>
          {/* 木1 */}
          <rect x="680" y="310" width="15" height="50" fill="#5D4037" />
          <ellipse cx="687" cy="290" rx="35" ry="40" fill="#4CAF50" />
          <ellipse cx="670" cy="300" rx="25" ry="30" fill="#66BB6A" />
          <ellipse cx="705" cy="295" rx="28" ry="32" fill="#43A047" />
          
          {/* 木2 */}
          <rect x="720" y="320" width="12" height="40" fill="#5D4037" />
          <ellipse cx="726" cy="305" rx="28" ry="32" fill="#4CAF50" />
          <ellipse cx="712" cy="310" rx="20" ry="25" fill="#66BB6A" />
        </g>

        {/* 人物 - 農作業をする人 */}
        <motion.g
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {/* 体 */}
          <ellipse cx="300" cy="365" rx="10" ry="15" fill="#8D6E63" />
          {/* 頭 */}
          <circle cx="300" cy="345" r="8" fill="#FFCCBC" />
          {/* 帽子 */}
          <ellipse cx="300" cy="340" rx="12" ry="4" fill="#F5E6D3" />
          <ellipse cx="300" cy="338" rx="8" ry="6" fill="#D7CCC8" />
          {/* 腕 */}
          <line x1="290" y1="355" x2="275" y2="365" stroke="#FFCCBC" strokeWidth="3" />
          <line x1="310" y1="355" x2="325" y2="345" stroke="#FFCCBC" strokeWidth="3" />
          {/* 鎌 */}
          <line x1="325" y1="345" x2="340" y2="330" stroke="#5D4037" strokeWidth="2" />
          <path d="M340 330 Q 350 325 345 340" stroke="#78909C" strokeWidth="2" fill="none" />
        </motion.g>

        {/* かかし */}
        <g>
          <line x1="200" y1="380" x2="200" y2="320" stroke="#5D4037" strokeWidth="4" />
          <line x1="180" y1="340" x2="220" y2="340" stroke="#5D4037" strokeWidth="3" />
          <circle cx="200" cy="310" r="12" fill="#FFCCBC" />
          <ellipse cx="200" cy="308" rx="15" ry="5" fill="#F5E6D3" />
          <motion.g
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ transformOrigin: '200px 340px' }}
          >
            <rect x="185" y="325" width="30" height="25" fill="#3F51B5" />
          </motion.g>
        </g>

        {/* 蝶々 */}
        {[
          { x: 150, y: 200 },
          { x: 400, y: 180 },
          { x: 600, y: 220 },
        ].map((butterfly, i) => (
          <motion.g
            key={`butterfly-${i}`}
            animate={{ 
              x: [0, 30, 0, -30, 0],
              y: [0, -20, 0, -10, 0]
            }}
            transition={{ duration: 5 + i, repeat: Infinity }}
          >
            <motion.ellipse
              cx={butterfly.x - 5}
              cy={butterfly.y}
              rx="6"
              ry="4"
              fill={i === 0 ? "#FF9800" : i === 1 ? "#E91E63" : "#9C27B0"}
              animate={{ scaleX: [1, 0.3, 1] }}
              transition={{ duration: 0.3, repeat: Infinity }}
            />
            <motion.ellipse
              cx={butterfly.x + 5}
              cy={butterfly.y}
              rx="6"
              ry="4"
              fill={i === 0 ? "#FF9800" : i === 1 ? "#E91E63" : "#9C27B0"}
              animate={{ scaleX: [1, 0.3, 1] }}
              transition={{ duration: 0.3, repeat: Infinity }}
            />
            <ellipse cx={butterfly.x} cy={butterfly.y} rx="2" ry="5" fill="#3E2723" />
          </motion.g>
        ))}

        {/* 地面 */}
        <rect x="0" y="380" width="800" height="70" fill="#558B2F" />
      </svg>
    </div>
  );
};

// ========================================
// 3. 旅人のシルエット - 冒険への出発
// ========================================
export const TravelerIllustration = ({ className = '' }: { className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const travelerX = useTransform(scrollYProgress, [0, 1], [-20, 20]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <svg viewBox="0 0 400 300" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="sunsetSky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FF6B6B" />
            <stop offset="30%" stopColor="#FF8E53" />
            <stop offset="60%" stopColor="#FEC89A" />
            <stop offset="100%" stopColor="#FFE5B4" />
          </linearGradient>

          <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8D6E63" />
            <stop offset="100%" stopColor="#A1887F" />
          </linearGradient>
        </defs>

        {/* 夕焼け空 */}
        <rect width="400" height="300" fill="url(#sunsetSky)" />

        {/* 太陽 */}
        <motion.circle
          cx="320"
          cy="100"
          r="40"
          fill="#FFD54F"
          filter="url(#softGlow)"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        {/* 遠くの山々 */}
        <path
          d="M0 200 Q 50 160 100 180 Q 150 140 200 170 Q 250 130 300 160 Q 350 140 400 180 L 400 300 L 0 300 Z"
          fill="#5D4037"
          opacity="0.4"
        />

        {/* 近くの丘 */}
        <path
          d="M0 230 Q 100 200 200 220 Q 300 190 400 230 L 400 300 L 0 300 Z"
          fill="#6D4C41"
          opacity="0.6"
        />

        {/* 道 */}
        <path
          d="M180 300 Q 200 260 220 230 Q 240 200 280 180"
          fill="none"
          stroke="url(#pathGradient)"
          strokeWidth="20"
          strokeLinecap="round"
        />
        <path
          d="M180 300 Q 200 260 220 230 Q 240 200 280 180"
          fill="none"
          stroke="#BCAAA4"
          strokeWidth="2"
          strokeDasharray="10 5"
        />

        {/* 旅人のシルエット */}
        <motion.g style={{ x: travelerX }}>
          {/* 体 */}
          <ellipse cx="220" cy="215" rx="12" ry="18" fill="#3E2723" />
          {/* 頭 */}
          <circle cx="220" cy="190" r="10" fill="#3E2723" />
          {/* 帽子 */}
          <ellipse cx="220" cy="183" rx="14" ry="5" fill="#3E2723" />
          <ellipse cx="220" cy="180" rx="8" ry="8" fill="#3E2723" />
          {/* 杖 */}
          <motion.line
            x1="235"
            y1="200"
            x2="250"
            y2="235"
            stroke="#5D4037"
            strokeWidth="3"
            strokeLinecap="round"
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{ transformOrigin: '235px 200px' }}
          />
          {/* リュック */}
          <ellipse cx="210" cy="210" rx="8" ry="12" fill="#4E342E" />
          {/* 足 */}
          <motion.g
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <line x1="215" y1="230" x2="210" y2="245" stroke="#3E2723" strokeWidth="4" />
          </motion.g>
          <motion.g
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, delay: 0.25 }}
          >
            <line x1="225" y1="230" x2="230" y2="245" stroke="#3E2723" strokeWidth="4" />
          </motion.g>
        </motion.g>

        {/* 鳥 */}
        {[
          { x: 80, y: 60, delay: 0 },
          { x: 100, y: 50, delay: 0.2 },
          { x: 120, y: 65, delay: 0.4 },
        ].map((bird, i) => (
          <motion.path
            key={`bird-${i}`}
            d={`M${bird.x} ${bird.y} Q ${bird.x + 5} ${bird.y - 5} ${bird.x + 10} ${bird.y} Q ${bird.x + 15} ${bird.y - 5} ${bird.x + 20} ${bird.y}`}
            fill="none"
            stroke="#3E2723"
            strokeWidth="2"
            animate={{ 
              y: [0, -5, 0],
              x: [0, 10, 0]
            }}
            transition={{ duration: 3, repeat: Infinity, delay: bird.delay }}
          />
        ))}

        {/* 道標 */}
        <g>
          <rect x="280" y="160" width="5" height="40" fill="#5D4037" />
          <rect x="275" y="155" width="40" height="15" fill="#8D6E63" rx="2" />
          <motion.text
            x="295"
            y="166"
            textAnchor="middle"
            fill="#3E2723"
            fontSize="8"
            fontWeight="bold"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            →
          </motion.text>
        </g>

        {/* 地面 */}
        <path
          d="M0 250 Q 100 240 200 250 Q 300 240 400 250 L 400 300 L 0 300 Z"
          fill="#4E342E"
        />
      </svg>
    </div>
  );
};

// ========================================
// 4. イベントセクション用の統合コンポーネント
// ========================================
export const EventIllustrationSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [50, 0, 0, -50]);

  return (
    <section
      id="event-illustrations"
      ref={sectionRef}
      className="relative py-16 sm:py-24 px-4 sm:px-8 bg-gradient-to-b from-[#f5e6d3] to-[#e8f4e5] overflow-hidden"
    >
      {/* 羊皮紙テクスチャ */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="container mx-auto max-w-6xl relative z-10">
        <motion.div
          style={{ opacity, y }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#8b6914]" />
            <p className="px-6 py-1.5 text-xs sm:text-sm tracking-[0.25em] font-bold text-[#8b6914] border border-[#8b6914]/30 bg-[#fff8f0]/50 font-sans">
              LOCAL EVENTS
            </p>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#8b6914]" />
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#3d2914] tracking-tight font-serif">
            地域のイベントを<br className="sm:hidden" />
            <span className="text-[#8b6914]">発見</span>しよう
          </h2>
          <p className="text-lg sm:text-xl text-[#5c3a21] mt-4 font-semibold font-sans">
            祭り、自然、文化。あなたの冒険が待っている
          </p>
        </motion.div>

        {/* イラストグリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 祭りの夜景 */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative rounded-2xl overflow-hidden shadow-xl border-4 border-[#d4c4a8] bg-[#fff8f0]"
          >
            <FestivalNightIllustration className="w-full" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#3d2914]/90 to-transparent p-6">
              <h3 className="text-xl font-bold text-[#ffecd2] font-serif">夏祭り・花火大会</h3>
              <p className="text-sm text-[#d4c4a8] mt-1 font-sans">灯篭の灯りに照らされた夜を楽しむ</p>
            </div>
          </motion.div>

          {/* 田園風景 */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="relative rounded-2xl overflow-hidden shadow-xl border-4 border-[#d4c4a8] bg-[#fff8f0]"
          >
            <CountrysideIllustration className="w-full" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#3d2914]/90 to-transparent p-6">
              <h3 className="text-xl font-bold text-[#ffecd2] font-serif">収穫祭・農業体験</h3>
              <p className="text-sm text-[#d4c4a8] mt-1 font-sans">自然と触れ合う贅沢な時間</p>
            </div>
          </motion.div>
        </div>

        {/* 旅人イラスト - 中央配置 */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-12 max-w-md mx-auto"
        >
          <div className="relative rounded-2xl overflow-hidden shadow-xl border-4 border-[#d4c4a8] bg-[#fff8f0]">
            <TravelerIllustration className="w-full" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#3d2914]/90 to-transparent p-6 text-center">
              <h3 className="text-xl font-bold text-[#ffecd2] font-serif">さあ、旅に出よう</h3>
              <p className="text-sm text-[#d4c4a8] mt-1 font-sans">あなただけの物語が始まる</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default EventIllustrationSection;

