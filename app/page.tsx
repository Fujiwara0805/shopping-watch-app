'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { MapPin, Menu, X, ChevronRight, Calendar, User, LogOut, Compass, Feather, Search, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabaseClient';
import { useSession, signOut } from 'next-auth/react';
import { getPublicMaps } from '@/app/_actions/maps';
import { NoteArticlesSection } from '@/components/external-content';
import { AnalyticsSection } from '@/components/analytics';
import { EventIllustrationSection } from '@/components/lp';

// 🔥 公開マップの型定義
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

// 🔥 avatar_urlからSupabase StorageのPublic URLを取得する関数
const getAvatarPublicUrl = (avatarPath: string | null): string | null => {
  if (!avatarPath) return null;
  return supabase.storage.from('avatars').getPublicUrl(avatarPath).data.publicUrl;
};

// --- 羊皮紙テクスチャSVG ---
const ParchmentTexture = ({ opacity = 0.3 }: { opacity?: number }) => (
  <div 
    className="absolute inset-0 pointer-events-none"
    style={{
      opacity,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    }}
  />
);

// --- 装飾：羅針盤コンポーネント ---
const CompassDecoration = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" stroke="#8b6914" strokeWidth="2" opacity="0.6"/>
    <circle cx="50" cy="50" r="35" stroke="#8b6914" strokeWidth="1" opacity="0.4"/>
    <circle cx="50" cy="50" r="25" stroke="#8b6914" strokeWidth="1" opacity="0.3"/>
    <path d="M50 5 L53 50 L50 95 L47 50 Z" fill="#8b6914" opacity="0.5"/>
    <path d="M5 50 L50 47 L95 50 L50 53 Z" fill="#5c3a21" opacity="0.4"/>
    <circle cx="50" cy="50" r="5" fill="#8b6914"/>
    <text x="50" y="18" textAnchor="middle" fill="#5c3a21" fontSize="8" fontWeight="bold" opacity="0.7">N</text>
    <text x="50" y="88" textAnchor="middle" fill="#5c3a21" fontSize="8" fontWeight="bold" opacity="0.7">S</text>
    <text x="12" y="53" textAnchor="middle" fill="#5c3a21" fontSize="8" fontWeight="bold" opacity="0.7">W</text>
    <text x="88" y="53" textAnchor="middle" fill="#5c3a21" fontSize="8" fontWeight="bold" opacity="0.7">E</text>
  </svg>
);

// --- 装飾：等高線パターン ---
const TopographyLines = () => (
  <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
    <defs>
      <pattern id="topo-pattern" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
        <path d="M0 100 Q 50 80 100 100 T 200 100" fill="none" stroke="#5c3a21" strokeWidth="0.5"/>
        <path d="M0 120 Q 50 100 100 120 T 200 120" fill="none" stroke="#5c3a21" strokeWidth="0.5"/>
        <path d="M0 140 Q 50 120 100 140 T 200 140" fill="none" stroke="#5c3a21" strokeWidth="0.5"/>
        <circle cx="100" cy="100" r="30" fill="none" stroke="#5c3a21" strokeWidth="0.3"/>
        <circle cx="100" cy="100" r="50" fill="none" stroke="#5c3a21" strokeWidth="0.3"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#topo-pattern)"/>
  </svg>
);

// --- 公開マップ一覧セクション ---
const PublicMapsSection = ({ onMapClick }: { onMapClick: (mapId: string) => void }) => {
  const router = useRouter();
  const [publicMaps, setPublicMaps] = useState<PublicMapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });
  
  const parallaxY = useTransform(scrollYProgress, [0, 1], [50, -50]);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    fetchPublicMaps();
  }, []);

  const fetchPublicMaps = async () => {
    try {
      const { maps, error } = await getPublicMaps(12);

      if (error) {
        console.error('公開マップ取得エラー:', error);
        throw new Error(error);
      }
      
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

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? publicMaps.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === publicMaps.length - 1 ? 0 : prev + 1));
  };

  return (
    <section ref={sectionRef} className="py-16 sm:py-24 px-4 sm:px-8 bg-[#f5e6d3] relative overflow-hidden">
      <ParchmentTexture opacity={0.25} />
      <TopographyLines />
      
      {/* 装飾：羅針盤 */}
      <motion.div 
        style={{ y: parallaxY }}
        className="absolute -right-20 top-20 opacity-15 pointer-events-none"
      >
        <CompassDecoration className="w-64 h-64" />
      </motion.div>

      <div className="container mx-auto max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-10 sm:mb-16"
        >
          {/* セクションラベル：古文書風の装飾付き */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#8b6914]" />
            <p className="px-5 py-1 text-xs sm:text-sm tracking-[0.25em] font-bold text-[#8b6914] border border-[#8b6914]/30 bg-[#fff8f0]/50 font-sans">
            ATLAS
            </p>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#8b6914]" />
          </div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#3d2914] tracking-tight mt-4 font-serif">
          世界で一つだけの地図
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-[#5c3a21] mt-4 font-semibold font-sans">
          地域の知られざる魅力が詰まった<br />
            <span className="ml-1 text-[#3d2914] border-b-2 border-[#8b6914]/50">数々のスポットを紹介した地図たち</span>
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Compass className="h-12 w-12 text-[#8b6914]" />
            </motion.div>
          </div>
        ) : publicMaps.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 bg-[#fff8f0]/60 rounded-lg border border-dashed border-[#d4c4a8]"
          >
            <MapPin className="h-12 w-12 mx-auto mb-4 text-[#8b6914]/50" />
            <p className="text-[#5c3a21] font-medium font-sans">まだマップが投稿されていません</p>
          </motion.div>
        ) : (
          <div className="relative">
            {/* カルーセル */}
            <div className="overflow-hidden">
              <motion.div
                className="flex"
                animate={{ x: `-${currentIndex * 100}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                {publicMaps.map((map, index) => (
                  <div
                    key={map.id}
                    className="min-w-full md:min-w-[50%] px-2 sm:px-4"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      viewport={{ once: true }}
                      whileHover={{ y: -8, boxShadow: "0 20px 40px rgba(61, 41, 20, 0.2)" }}
                      className="bg-[#fff8f0] rounded-xl border-2 border-[#d4c4a8] overflow-hidden transition-all cursor-pointer group mx-auto max-w-md relative"
                      onClick={() => onMapClick(map.id)}
                    >
                      {/* シーリングワックス風の装飾 */}
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#8b2323] to-[#5c1515] rounded-full shadow-lg flex items-center justify-center">
                          <span className="text-[#ffecd2] text-xs font-bold">M</span>
                        </div>
                      </div>

                      {/* カバー画像 */}
                      <div className="h-48 sm:h-56 bg-gradient-to-br from-[#e8f4e5] to-[#d4ecd1] relative overflow-hidden">
                        {map.cover_image_url ? (
                          <img
                            src={map.cover_image_url}
                            alt={map.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <MapPin className="h-16 w-16 text-[#5c3a21]/30" />
                          </div>
                        )}
                        {/* スポット数 */}
                        <div className="absolute top-3 left-3 bg-[#fff8f0]/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-medium text-[#5c3a21] flex items-center gap-1 font-sans">
                          <MapPin className="h-3.5 w-3.5" />
                          {map.total_locations || 0}箇所
                        </div>
                        
                        {/* ホバー時のオーバーレイ */}
                        <div className="absolute inset-0 bg-[#3d2914]/0 group-hover:bg-[#3d2914]/20 transition-colors duration-300" />
                      </div>

                      {/* コンテンツ */}
                      <div className="p-4 border-t border-[#d4c4a8]">
                        <h3 className="text-lg sm:text-xl font-bold text-[#3d2914] mb-2 line-clamp-2 group-hover:text-[#5c3a21] transition-colors font-serif">
                          {map.title}
                        </h3>

                        {map.hashtags && map.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {map.hashtags.slice(0, 3).map((tag: string, i: number) => (
                              <span key={i} className="text-xs bg-[#e8f4e5] text-[#5c3a21] px-2 py-0.5 rounded-full font-sans">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center text-xs text-[#8b7355] font-sans">
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          {new Date(map.created_at).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* ナビゲーションボタン */}
            {publicMaps.length > 1 && !(isDesktop && publicMaps.length <= 2) && (
              <>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handlePrev}
                  className="absolute left-0 top-1/2 -translate-y-1/2 bg-[#fff8f0] hover:bg-[#ffecd2] p-3 rounded-full shadow-lg transition-all z-10 -ml-2 sm:-ml-4 border-2 border-[#8b6914]/30"
                  aria-label="前へ"
                >
                  <ChevronRight className="h-5 w-5 text-[#5c3a21] rotate-180" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleNext}
                  className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#fff8f0] hover:bg-[#ffecd2] p-3 rounded-full shadow-lg transition-all z-10 -mr-2 sm:-mr-4 border-2 border-[#8b6914]/30"
                  aria-label="次へ"
                >
                  <ChevronRight className="h-5 w-5 text-[#5c3a21]" />
                </motion.button>
              </>
            )}

            {/* インジケーター */}
            {publicMaps.length > 1 && !(isDesktop && publicMaps.length <= 2) && (
              <div className="flex justify-center gap-2 mt-6">
                {publicMaps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentIndex
                        ? 'w-8 bg-[#8b6914]'
                        : 'w-2 bg-[#d4c4a8] hover:bg-[#8b7355]'
                    }`}
                    aria-label={`マップ ${index + 1} へ移動`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 他のMy Mapをみるリンク */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(92, 58, 33, 0.2)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/public-maps')}
            className="inline-flex items-center gap-2 px-8 py-4 text-base font-bold text-[#5c3a21] hover:text-[#3d2914] border-2 border-[#5c3a21] hover:border-[#3d2914] rounded-full transition-all hover:bg-[#ffecd2] group font-sans"
          >
            地図帳をひらく
            <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

// --- 特徴カード コンポーネント ---
const FeatureCard = ({ 
  label, 
  title, 
  description, 
  icon: Icon, 
  index 
}: { 
  label: string; 
  title: string; 
  description: string; 
  icon: React.ElementType;
  index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay: index * 0.15 }}
    viewport={{ once: true }}
    whileHover={{ y: -8, boxShadow: "0 25px 50px rgba(61, 41, 20, 0.15)" }}
    className="bg-[#fff8f0] p-8 rounded-lg border-2 border-[#d4c4a8] shadow-xl flex flex-col items-center text-center relative overflow-hidden group"
  >
    {/* 背景装飾 */}
    <div className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none">
      <CompassDecoration className="w-full h-full" />
    </div>
    
    {/* アイコン */}
    <motion.div 
      whileHover={{ rotate: 10, scale: 1.1 }}
      className="w-16 h-16 bg-gradient-to-br from-[#8b6914] to-[#5c3a21] rounded-full flex items-center justify-center mb-4 shadow-lg"
    >
      <Icon className="h-8 w-8 text-[#ffecd2]" strokeWidth={1.5} />
    </motion.div>
    
    <span className="text-xs font-bold tracking-[0.2em] text-[#8b6914] uppercase mb-2 border-b border-[#8b6914]/30 pb-1 font-sans">
      {label}
    </span>
    <h3 className="text-xl sm:text-2xl font-bold mb-3 text-[#3d2914] font-serif">
      {title}
    </h3>
    <p className="text-sm sm:text-base text-[#5c3a21] leading-relaxed font-medium font-sans">
      {description}
    </p>
    
    {/* ホバー時の輝き効果 */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#8b6914]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -translate-x-full group-hover:translate-x-full" style={{ transition: 'transform 0.7s' }} />
  </motion.div>
);

// --- メイン実装 ---

const EventLP = ({ onStart, onMapClick }: { onStart: () => void; onMapClick: (mapId: string) => void }) => {
  const { data: session } = useSession();
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.1]);

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#f5e6d3] relative overflow-x-hidden font-sans">
      {/* 背景装飾 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <TopographyLines />
        <svg className="absolute top-0 right-0 w-full h-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0 0 C 30 40 70 40 100 0 L 100 100 L 0 100 Z" fill="url(#parchment-gradient)" />
          <defs>
            <linearGradient id="parchment-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b6914" />
              <stop offset="50%" stopColor="#d4c4a8" />
              <stop offset="100%" stopColor="#8b6914" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="relative z-10">
        {/* ヘッダー（Glassmorphism） */}
        <nav
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
            scrollPosition > 10
              ? 'bg-[#f5e6d3]/80 backdrop-blur-xl shadow-lg border-b border-[#8b6914]/20'
              : 'bg-transparent border-b border-transparent'
          }`}
        >
          <div className="container mx-auto px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              {/* ロゴ（焼印/紋章風） */}
              <div className="relative">
                <div className="absolute inset-0 bg-[#8b6914] blur-md opacity-30 rounded-full scale-110"></div>
                <div className="relative">
                  <img
                    src="https://res.cloudinary.com/dz9trbwma/image/upload/v1763822849/ChatGPT_Image_2025%E5%B9%B411%E6%9C%8822%E6%97%A5_23_46_11_-_%E7%B7%A8%E9%9B%86%E6%B8%88%E3%81%BF_n1uf53.png"
                    alt="トクドク"
                    className="h-12 w-12 sm:h-14 sm:w-14 relative z-10 drop-shadow-lg"
                  />
                  {/* 紋章風の輝き */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#ffecd2]/20 to-transparent rounded-full" />
                </div>
              </div>
              <span className={`font-bold text-xl tracking-[0.15em] hidden sm:block transition-colors duration-300 font-serif ${scrollPosition > 10 ? 'text-[#3d2914]' : 'text-[#3d2914]'}`}>
                TOKU<span className="text-[#8b6914]">DOKU</span>
              </span>
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-[#8b6914]/10 rounded-lg transition-colors"
              aria-label="メニュー"
            >
              <Menu
                className="h-6 w-6 sm:h-7 sm:w-7 text-[#5c3a21]"
                strokeWidth={2.5}
              />
            </motion.button>
          </div>
        </nav>

        {/* ハンバーガーメニュー（古い手紙風） */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMenuOpen(false)}
                className="fixed inset-0 bg-[#3d2914]/60 z-[60] backdrop-blur-sm"
              />

              <motion.div
                initial={{ x: '-100%', rotateY: -30 }}
                animate={{ x: 0, rotateY: 0 }}
                exit={{ x: '-100%', rotateY: -30 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed left-0 top-0 bottom-0 w-80 bg-[#f5e6d3] border-r-4 border-[#8b6914]/40 shadow-2xl z-[70] overflow-y-auto"
                style={{ perspective: '1000px' }}
              >
                {/* 羊皮紙テクスチャ */}
                <ParchmentTexture opacity={0.15} />
                
                <div className="p-6 relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                      <img
                        src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png"
                        alt="トクドク"
                        className="h-12 w-12"
                      />
                      <span className="font-bold text-lg text-[#3d2914] font-serif">TOKUDOKU</span>
                    </div>
                    <motion.button
                      whileHover={{ rotate: 90 }}
                      onClick={() => setIsMenuOpen(false)}
                      className="p-2 hover:bg-[#8b6914]/10 rounded-lg transition-colors"
                      aria-label="閉じる"
                    >
                      <X className="h-6 w-6 text-[#5c3a21]" strokeWidth={2.5} />
                    </motion.button>
                  </div>
                  <nav className="space-y-1">
                    {[
                      { href: '/profile', label: 'MyPage' },
                      { href: '/terms/terms-of-service', label: 'TermsOfService' },
                      { href: '/terms/privacy-policy', label: 'PrivacyPolicy' },
                      { href: '/terms/service-policy', label: 'ServicePolicy' },
                      { href: '/contact', label: 'Contact' },
                      { href: '/release-notes', label: 'ReleaseNotes' },
                    ].map((item, index) => (
                      <motion.a
                        key={item.href}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        href={item.href}
                        className="block px-4 py-3 text-[#5c3a21] hover:bg-[#8b6914]/10 hover:text-[#3d2914] rounded-lg transition-colors font-semibold border-b border-[#d4c4a8]/50 font-sans"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {item.label}
                      </motion.a>
                    ))}
                    
                    <motion.a
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      href="https://www.instagram.com/tokudoku_nobody/"
                      rel="noopener noreferrer"
                      className="flex items-center px-4 py-3 text-[#5c3a21] hover:bg-[#8b6914]/10 hover:text-[#3d2914] rounded-lg transition-colors mt-4 font-sans"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <img
                        src="https://res.cloudinary.com/dz9trbwma/image/upload/v1759308496/icons8-%E3%82%A4%E3%83%B3%E3%82%B9%E3%82%BF%E3%82%AF%E3%82%99%E3%83%A9%E3%83%A0-100_idedfz.png"
                        alt="Instagram"
                        className="h-8 w-8"
                      />
                      <span className="ml-2 font-bold font-sans">Instagram</span>
                    </motion.a>

                    {session && (
                      <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 }}
                        onClick={async () => {
                          setIsMenuOpen(false);
                          await signOut({ callbackUrl: '/' });
                        }}
                        className="flex items-center w-full px-4 py-3 text-[#dc2626] hover:bg-red-50 hover:text-[#b91c1c] rounded-lg transition-colors font-semibold border-t border-[#d4c4a8]/50 mt-4 font-sans"
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

        {/* ヒーローセクション */}
        <section ref={heroRef} className="relative min-h-screen flex items-center justify-center px-4 sm:px-8 overflow-hidden">
          {/* 背景画像（パララックス効果） */}
          <motion.div
            style={{ scale: heroScale }}
            className="absolute inset-0 bg-cover bg-center"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: 'url(https://res.cloudinary.com/dz9trbwma/image/upload/v1764920377/Gemini_Generated_Image_w5u33yw5u33yw5u3_jfispg.png)',
              }}
            />
          </motion.div>
          
          {/* オーバーレイ */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#3d2914]/70 via-[#3d2914]/50 to-[#f5e6d3]" />
          <div className="absolute inset-0 bg-black/20" />
          <ParchmentTexture opacity={0.08} />

          {/* 装飾：羅針盤（パララックス） */}
          <motion.div 
            style={{ opacity: heroOpacity }}
            className="absolute top-24 left-8 opacity-20 pointer-events-none hidden lg:block"
          >
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }}>
              <CompassDecoration className="w-32 h-32" />
            </motion.div>
          </motion.div>
          
          <motion.div 
            style={{ opacity: heroOpacity }}
            className="absolute bottom-32 right-8 opacity-15 pointer-events-none hidden lg:block"
          >
            <CompassDecoration className="w-48 h-48" />
          </motion.div>

          <div className="container mx-auto max-w-6xl relative z-10 pt-24 pb-16">
            <motion.div
              style={{ opacity: heroOpacity }}
              className="text-center space-y-8 sm:space-y-12"
            >
              <div className="space-y-6 sm:space-y-8">
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-xl sm:text-2xl md:text-3xl text-[#ffecd2] font-bold tracking-wider drop-shadow-lg font-sans"
                >
                  あなただけの<br />地図を作成できる
                </motion.p>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl text-white font-bold leading-tight tracking-tight drop-shadow-xl font-serif"
                >
                  知られていない
                  <br className="hidden sm:block" />
                  <span className="relative inline-block mt-3 pb-2">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffecd2] via-[#fff8f0] to-[#ffecd2]">
                    地域の魅力を発見
                    </span>
                    {/* 下線装飾 */}
                    <motion.span 
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.8, delay: 1 }}
                      className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#8b6914] to-transparent"
                    />
                  </span>
                </motion.h1>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.2 }}
                className="pt-6 sm:pt-8"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="lg"
                    onClick={onStart}
                    className="h-16 sm:h-20 px-12 sm:px-16 text-lg sm:text-2xl font-extrabold rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 bg-[#ffecd2] hover:bg-[#fff8f0] text-[#3d2914] relative overflow-hidden group"
                  >
                    {/* ホバー時の輝き */}
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <span className="relative flex items-center gap-2">
                      <Compass className="h-6 w-6" />
                      イベントを確認
                    </span>
                  </Button>
                </motion.div>
                <p className="text-lg sm:text-xl text-gray-200 mt-4 font-bold font-sans">
                  登録不要。今すぐ探索を始める
                </p>
                <motion.a
                  href="https://forms.gle/KBSd4xoWsp5bvDJ7A"
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 1.4 }}
                  whileHover={{ scale: 1.05, borderColor: '#ffecd2' }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-block mt-6 px-8 sm:px-12 py-3 sm:py-4 text-base sm:text-lg font-bold text-white bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full border border-[#ffecd2]/50 transition-all duration-300 shadow-lg font-sans"
                >
                  イベント情報募集中！
                </motion.a>
              </motion.div>

              {/* スクロールインジケーター（羅針盤風） */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 2 }}
                className="pt-12"
              >
                <motion.div
                  animate={{ y: [0, 12, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="flex flex-col items-center text-[#ffecd2]"
                >
                  <span className="text-sm font-semibold mb-3 tracking-wider font-sans">Scroll</span>
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Compass className="h-8 w-8" />
                  </motion.div>
                  <div className="w-px h-12 bg-gradient-to-b from-[#ffecd2] to-transparent mt-2" />
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* 公開マップセクション */}
        <PublicMapsSection onMapClick={onMapClick} />

        {/* 特徴セクション */}
        <section className="relative py-20 sm:py-28 px-4 sm:px-8 bg-[#e8f4e5] overflow-hidden">
          <ParchmentTexture opacity={0.15} />
          <TopographyLines />
          
          {/* 装飾 */}
          <div className="absolute -left-20 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
            <CompassDecoration className="w-80 h-80" />
          </div>

          <div className="container mx-auto max-w-6xl relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-14 sm:mb-20"
            >
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#8b6914]" />
                <p className="px-6 py-1.5 text-xs sm:text-sm tracking-[0.25em] font-bold text-[#8b6914] border border-[#8b6914]/30 bg-[#fff8f0]/50 font-sans">
                  FEATURES
                </p>
                <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#8b6914]" />
              </div>
              
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 text-[#3d2914] tracking-tight font-serif">
                <span className="text-[#5c3a21]">こだわり</span>の機能
              </h2>
              <p className="text-lg sm:text-xl md:text-2xl text-[#5c3a21] font-semibold mt-4 font-sans">
                ひとり旅をも支える<br />強力な冒険ツール
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              <FeatureCard
                label="CREATE"
                title="あなただけの地図を作成"
                description="お気に入りのスポットを登録して、世界で一つだけのオリジナルの地図を作成できます。"
                icon={Feather}
                index={0}
              />
              <FeatureCard
                label="DISCOVER"
                title="イベント情報を地図で発見"
                description="地域のイベント情報がマップ上に表示。開催中(予定)のイベントをひと目で把握できる。"
                icon={Search}
                index={1}
              />
              <FeatureCard
                label="SHARE"
                title="公開設定機能"
                description="作成した地図は公開範囲を設定でき、友達や家族だけにシェアすることや不特定多数のユーザーにシェアすることも可能です。"
                icon={Send}
                index={2}
              />
            </div>
          </div>
        </section>

        {/* イベントイラストセクション */}
        <EventIllustrationSection />

        {/* エモーショナルセクション（パララックス） */}

        {/* note記事セクション */}
        <NoteArticlesSection username="kind_ixora3833" maxItems={4} />

        {/* 注目度（Analytics）セクション */}
        <AnalyticsSection />

        {/* 最終CTA（発光表現強調） */}
        <section className="relative py-20 sm:py-28 px-4 sm:px-8 overflow-hidden bg-[#f5e6d3]">
          <div className="absolute inset-0 bg-gradient-to-t from-[#f5e6d3] via-[#f5e6d3]/80 to-transparent" />
          <ParchmentTexture opacity={0.15} />
          
          {/* 装飾：羅針盤 */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 opacity-10 pointer-events-none">
            <CompassDecoration className="w-96 h-96" />
          </div>

          <div className="container mx-auto max-w-4xl text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-10"
            >
              <h2 className="text-2xl sm:text-3xl lg:text-5xl font-extrabold leading-tight text-[#3d2914] font-serif">
                さあ、冒険を始めよう！
              </h2>

              <motion.div 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
                className="relative inline-block"
              >
                {/* 発光エフェクト */}
                <div className="absolute inset-0 bg-[#8b6914] blur-2xl opacity-30 rounded-full scale-110 animate-pulse" />
                <Button
                  size="lg"
                  onClick={onStart}
                  className="relative h-20 sm:h-24 px-16 sm:px-24 text-xl sm:text-3xl font-extrabold rounded-full shadow-2xl hover:shadow-[0_30px_60px_rgba(139,105,20,0.4)] transition-all duration-300 bg-gradient-to-r from-[#5c3a21] via-[#8b6914] to-[#5c3a21] hover:from-[#3d2914] hover:via-[#5c3a21] hover:to-[#3d2914] text-[#fff8f0] overflow-hidden group"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <span className="relative flex items-center gap-3">
                    <Compass className="h-8 w-8" />
                    イベントを確認
                  </span>
                </Button>
              </motion.div>

              <p className="text-lg sm:text-xl text-[#5c3a21] font-bold font-sans">
                登録不要。今すぐ冒険を始める
              </p>
            </motion.div>
          </div>
        </section>

        {/* フッター */}
        <footer className="py-12 sm:py-16 px-4 sm:px-8 border-t-2 border-[#8b6914]/30 bg-[#ffecd2] relative overflow-hidden">
          <ParchmentTexture opacity={0.1} />
          
          <div className="container mx-auto max-w-6xl relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <div className="flex items-center mb-4 gap-3">
                  <img
                    src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png"
                    alt="トクドク"
                    className="h-12 w-12"
                  />
                  <span className="text-[#3d2914] font-bold text-xl tracking-wider font-serif">TOKUDOKU</span>
                </div>
                <p className="text-lg text-[#5c3a21] leading-relaxed font-semibold font-sans">
                  地域の新たな可能性に
                  <br />
                  光を当てる
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-extrabold mb-3 text-[#5c3a21] text-base sm:text-lg border-b border-[#8b6914]/30 pb-2 font-serif">
                    サービス
                  </h4>
                  <ul className="space-y-2">
                    <li>
                      <a href="https://www.nobody-inc.jp/" target="_blank" className="text-[#8b7355] hover:text-[#3d2914] transition-colors font-semibold text-sm sm:text-base font-sans">会社概要</a>
                    </li>
                    <li>
                      <a href="/contact" className="text-[#8b7355] hover:text-[#3d2914] transition-colors font-semibold text-sm sm:text-base font-sans">問い合わせ</a>
                    </li>
                    <li>
                      <a href="/release-notes" className="text-[#8b7355] hover:text-[#3d2914] transition-colors font-semibold text-sm sm:text-base font-sans">リリースノート</a>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-extrabold mb-3 text-[#5c3a21] text-base sm:text-lg border-b border-[#8b6914]/30 pb-2 font-serif">
                    規約
                  </h4>
                  <ul className="space-y-2">
                    <li>
                      <a href="/terms/terms-of-service" className="text-[#8b7355] hover:text-[#3d2914] transition-colors font-semibold text-sm sm:text-base font-sans">利用規約</a>
                    </li>
                    <li>
                      <a href="/terms/privacy-policy" className="text-[#8b7355] hover:text-[#3d2914] transition-colors font-semibold text-sm sm:text-base font-sans">プライバシーポリシー</a>
                    </li>
                    <li>
                      <a href="/terms/service-policy" className="text-[#8b7355] hover:text-[#3d2914] transition-colors font-semibold text-sm sm:text-base font-sans">サービスポリシー</a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-[#d4c4a8] text-center">
              <p className="text-sm sm:text-base text-[#8b7355] font-semibold font-sans">
                © 2026 tokudoku All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

// --- 位置情報モーダル（古い手紙風） ---
const LocationModal = ({ 
  isOpen, 
  onClose, 
  onAllow, 
  onDeny 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onAllow: () => void; 
  onDeny: () => void;
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        {/* オーバーレイ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#3d2914]/70 backdrop-blur-sm z-[100]"
        />
        
        {/* モーダル（古い手紙風の出現アニメーション） */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotateX: -15 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          exit={{ opacity: 0, scale: 0.8, rotateX: -15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed inset-0 flex items-center justify-center z-[101] px-4"
          style={{ perspective: '1000px' }}
        >
          <div className="w-full max-w-md bg-[#f5e6d3] rounded-xl shadow-2xl border-4 border-[#8b6914]/40 overflow-hidden relative">
            {/* 羊皮紙テクスチャ */}
            <ParchmentTexture opacity={0.2} />
            
            {/* コンテンツ */}
            <div className="p-8 pt-12 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-6"
              >
                <h3 className="text-2xl font-bold text-[#3d2914] mb-3 font-serif">
                  位置情報の利用について
                </h3>
                <p className="text-[#5c3a21] font-medium font-sans">
                  地図上に情報を表示するために位置情報を使用します
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={onAllow}
                    className="w-full bg-gradient-to-r from-[#5c3a21] via-[#8b6914] to-[#5c3a21] hover:from-[#3d2914] hover:via-[#5c3a21] hover:to-[#3d2914] text-[#fff8f0] font-bold text-base sm:text-lg py-6 rounded-full shadow-lg relative overflow-hidden group"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <MapPin className="mr-2 h-6 w-6" strokeWidth={2.5} />
                    位置情報を許可して地図を探索
                  </Button>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={onDeny}
                    variant="outline"
                    className="w-full font-bold text-base sm:text-lg py-6 rounded-full border-2 border-[#8b6914]/50 text-[#5c3a21] hover:bg-[#ffecd2] hover:border-[#8b6914]"
                  >
                    今はスキップ
                  </Button>
                </motion.div>
              </motion.div>

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xs sm:text-sm text-[#8b7355] text-center font-semibold mt-6 font-sans"
              >
                ※ブラウザの設定で位置情報の許可をONにしてください
              </motion.p>
            </div>
            
            {/* 装飾：角の折れ */}
            <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-[#d4c4a8] to-transparent" />
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// --- メインコンポーネント ---

export default function Home() {
  const router = useRouter();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

  const handleStart = () => {
    setSelectedMapId(null);
    setShowLocationModal(true);
  };

  const handleMapClick = (mapId: string) => {
    setSelectedMapId(mapId);
    setShowLocationModal(true);
  };

  const handleAllowLocation = async () => {
    if ('geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });

        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: Date.now(),
          expiresAt: Date.now() + 60 * 60 * 1000
        };
        localStorage.setItem('userLocation', JSON.stringify(locationData));

        localStorage.setItem(
          'locationPermission',
          JSON.stringify({
            isGranted: true,
            timestamp: Date.now()
          })
        );

        setShowLocationModal(false);
        
        if (selectedMapId) {
          router.push(`/map?title_id=${selectedMapId}`);
        } else {
          router.push('/map');
        }
      } catch (error) {
        console.error('位置情報の取得に失敗:', error);
        setShowLocationModal(false);
        
        if (selectedMapId) {
          router.push(`/map?title_id=${selectedMapId}`);
        } else {
          router.push('/');
        }
      }
    } else {
      console.warn('位置情報が利用できません');
      setShowLocationModal(false);
      
      if (selectedMapId) {
        router.push(`/map?title_id=${selectedMapId}`);
      } else {
        router.push('/');
      }
    }
  };

  const handleDenyLocation = () => {
    setShowLocationModal(false);
    
    if (selectedMapId) {
      router.push(`/map?title_id=${selectedMapId}`);
    } else {
      router.push('/');
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <EventLP onStart={handleStart} onMapClick={handleMapClick} />

      <LocationModal
        isOpen={showLocationModal}
        onClose={handleDenyLocation}
        onAllow={handleAllowLocation}
        onDeny={handleDenyLocation}
      />
    </main>
  );
}