'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Menu, X, ChevronRight, Calendar, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { CustomModal } from '@/components/ui/custom-modal';
import { supabase } from '@/lib/supabaseClient';
import { useSession, signOut } from 'next-auth/react';

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

// --- 公開マップ一覧セクション ---
const PublicMapsSection = ({ onMapClick }: { onMapClick: (mapId: string) => void }) => {
  const router = useRouter();
  const [publicMaps, setPublicMaps] = useState<PublicMapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);

  // 画面サイズを監視
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
      // 🔥 app_profilesテーブルとJOINして作成者情報も取得
      const { data, error } = await supabase
        .from('maps')
        .select(`
          id, 
          title, 
          locations, 
          created_at, 
          hashtags,
          app_profile_id,
          app_profiles (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('is_deleted', false)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) {
        console.error('公開マップ取得エラー（詳細）:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      // locationsから最初の画像をカバー画像として、スポット数を計算
      const mapsWithMetadata: PublicMapData[] = (data || []).map((map: any) => {
        const locations = Array.isArray(map.locations) ? map.locations : [];
        const totalLocations = locations.length;
        
        // 最初のロケーションの最初の画像をカバー画像として使用
        let coverImageUrl = null;
        for (const location of locations) {
          if (location.image_urls && Array.isArray(location.image_urls) && location.image_urls.length > 0) {
            coverImageUrl = location.image_urls[0];
            break;
          }
        }
        
        // 🔥 作成者情報を取得（型安全に）
        const profile = map.app_profiles as { id: string; display_name: string | null; avatar_url: string | null } | null;
        
        return {
          id: map.id,
          title: map.title,
          locations: locations,
          created_at: map.created_at,
          hashtags: map.hashtags,
          app_profile_id: map.app_profile_id,
          cover_image_url: coverImageUrl,
          total_locations: totalLocations,
          author_name: profile?.display_name || '匿名ユーザー',
          author_avatar_path: profile?.avatar_url || null, // 🔥 パスとして保持
        };
      });
      
      setPublicMaps(mapsWithMetadata);
    } catch (error: any) {
      console.error('公開マップ取得エラー:', error);
      console.error('エラーの詳細:', JSON.stringify(error, null, 2));
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
    <section className="py-16 sm:py-20 px-4 sm:px-8 bg-[#f5e6d3] relative overflow-hidden">
      {/* 羊皮紙風テクスチャオーバーレイ */}
      <div className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="container mx-auto max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-10 sm:mb-16"
        >
          <p className="inline-block px-5 py-1 mb-4 text-xs sm:text-sm tracking-[0.18em] font-bold text-[#5c3a21] border-b-2 border-[#8b6914]">
            MY MAPS
          </p>
          <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#3d2914] tracking-tight mt-2">
            世界で一つだけのデジタルマップ
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-[#5c3a21] mt-4 font-semibold">
            ユーザーが作成した<br />
            <span className="ml-1 text-[#3d2914] border-b-2 border-[#8b6914]/50">あなただけのデジタルマップ</span>
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8b6914]"></div>
          </div>
        ) : publicMaps.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-[#8b6914]/50" />
            <p className="text-[#5c3a21]">まだマップが投稿されていません</p>
          </div>
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
                      className="bg-[#fff8f0] rounded-xl border-2 border-[#d4c4a8] hover:border-[#8b6914] overflow-hidden transition-all hover:shadow-xl cursor-pointer group mx-auto max-w-md"
                      onClick={() => onMapClick(map.id)}
                    >
                      {/* 🔥 カバー画像（サイズ縮小） */}
                      <div className="h-48 sm:h-56 bg-gradient-to-br from-[#e8f4e5] to-[#d4ecd1] relative overflow-hidden">
                        {map.cover_image_url ? (
                          <img
                            src={map.cover_image_url}
                            alt={map.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <MapPin className="h-16 w-16 text-[#5c3a21]/30" />
                          </div>
                        )}
                        
                        {/* 🔥 作成者情報（右上に配置）- Avatarコンポーネント使用 */}
                        <div className="absolute top-3 right-3 bg-[#3d2914]/80 backdrop-blur-sm px-2.5 py-1.5 rounded-full flex items-center gap-2">
                          <Avatar className="h-6 w-6 border border-[#ffecd2]/50">
                            {map.author_avatar_path ? (
                              <AvatarImage
                                src={getAvatarPublicUrl(map.author_avatar_path) || ''}
                                alt={map.author_name}
                              />
                            ) : null}
                            <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-[#5c3a21] to-[#8b6914] text-[#fff8f0]">
                              {map.author_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-semibold text-[#fff8f0] max-w-[80px] truncate">
                            {map.author_name}
                          </span>
                        </div>

                        {/* スポット数（左上） */}
                        <div className="absolute top-3 left-3 bg-[#fff8f0]/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-medium text-[#5c3a21] flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {map.total_locations || 0}箇所
                        </div>
                      </div>

                      {/* 🔥 コンテンツ（コンパクト化） */}
                      <div className="p-4">
                        <h3 className="text-lg sm:text-xl font-bold text-[#3d2914] mb-2 line-clamp-2 group-hover:text-[#5c3a21] transition-colors">
                          {map.title}
                        </h3>

                        {/* ハッシュタグ */}
                        {map.hashtags && map.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {map.hashtags.slice(0, 3).map((tag: string, i: number) => (
                              <span key={i} className="text-xs bg-[#e8f4e5] text-[#5c3a21] px-2 py-0.5 rounded-full">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* 日付 */}
                        <div className="flex items-center text-xs text-[#8b7355]">
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

            {/* ナビゲーションボタン（PCで2件以下の場合は非表示） */}
            {publicMaps.length > 1 && !(isDesktop && publicMaps.length <= 2) && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-0 top-1/2 -translate-y-1/2 bg-[#fff8f0]/90 hover:bg-[#fff8f0] p-2.5 rounded-full shadow-lg transition-all z-10 -ml-1 sm:-ml-3 border border-[#d4c4a8]"
                  aria-label="前へ"
                >
                  <ChevronRight className="h-5 w-5 text-[#5c3a21] rotate-180" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#fff8f0]/90 hover:bg-[#fff8f0] p-2.5 rounded-full shadow-lg transition-all z-10 -mr-1 sm:-mr-3 border border-[#d4c4a8]"
                  aria-label="次へ"
                >
                  <ChevronRight className="h-5 w-5 text-[#5c3a21]" />
                </button>
              </>
            )}

            {/* インジケーター（PCで2件以下の場合は非表示） */}
            {publicMaps.length > 1 && !(isDesktop && publicMaps.length <= 2) && (
              <div className="flex justify-center gap-1.5 mt-5">
                {publicMaps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`h-1.5 rounded-full transition-all ${
                      index === currentIndex
                        ? 'w-6 bg-[#5c3a21]'
                        : 'w-1.5 bg-[#d4c4a8] hover:bg-[#8b7355]'
                    }`}
                    aria-label={`マップ ${index + 1} へ移動`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 🔥 他のMy Mapをみるリンク */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <button
            onClick={() => router.push('/public-maps')}
            className="inline-flex items-center gap-2 px-6 py-3 text-base font-bold text-[#5c3a21] hover:text-[#3d2914] border-2 border-[#5c3a21] hover:border-[#3d2914] rounded-full transition-all hover:bg-[#ffecd2] group"
          >
            他のMy Mapをみる
            <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};

// --- メイン実装 ---

const EventLP = ({ onStart, onMapClick }: { onStart: () => void; onMapClick: (mapId: string) => void }) => {
  const { data: session } = useSession();
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#f5e6d3] relative overflow-x-hidden font-sans">
      {/* 背景装飾（古地図風の装飾ライン） */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
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
        {/* ヘッダー */}
        <nav
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
            scrollPosition > 10
              ? 'bg-[#f5e6d3]/95 backdrop-blur-md shadow-lg border-[#d4c4a8]'
              : 'bg-transparent border-transparent'
          }`}
        >
          <div className="container mx-auto px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* ロゴアイコン */}
              <div className="relative">
                <div className="absolute inset-0 bg-[#8b6914] blur opacity-20 rounded-full"></div>
                <img
src="https://res.cloudinary.com/dz9trbwma/image/upload/v1763822849/ChatGPT_Image_2025%E5%B9%B411%E6%9C%8822%E6%97%A5_23_46_11_-_%E7%B7%A8%E9%9B%86%E6%B8%88%E3%81%BF_n1uf53.png"
                  alt="トクドク"
                  className="h-12 w-12 sm:h-14 sm:w-14 relative z-10 drop-shadow-md"
                />
              </div>
              <span className={`font-bold text-xl tracking-widest hidden sm:block ${scrollPosition > 10 ? 'text-[#3d2914]' : 'text-[#3d2914]'}`}>
                TOKU<span className="text-[#8b6914]">DOKU</span>
              </span>
            </div>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-[#d4c4a8]/30 rounded-lg transition-colors"
              aria-label="メニュー"
            >
              <Menu
                className="h-6 w-6 sm:h-7 sm:w-7 text-[#5c3a21]"
                strokeWidth={2.5}
              />
            </button>
          </div>
        </nav>

        {/* ハンバーガーメニュー */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMenuOpen(false)}
                className="fixed inset-0 bg-[#3d2914]/50 z-[60] backdrop-blur-sm"
              />

              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed left-0 top-0 bottom-0 w-72 bg-[#f5e6d3] border-r border-[#8b6914]/30 shadow-2xl z-[70] overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center">
                      <img
                        src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png"
                        alt="トクドク"
                        className="h-12 w-12"
                      />
                    </div>
                    <button
                      onClick={() => setIsMenuOpen(false)}
                      className="p-2 hover:bg-[#d4c4a8]/30 rounded-lg transition-colors"
                      aria-label="閉じる"
                    >
                      <X className="h-6 w-6 text-[#5c3a21]" strokeWidth={2.5} />
                    </button>
                  </div>

                  <nav className="space-y-2">
                    {[
                      { href: '/profile', label: 'マイページ' },
                      { href: '/terms/terms-of-service', label: '利用規約' },
                      { href: '/terms/privacy-policy', label: 'プライバシーポリシー' },
                      { href: '/terms/service-policy', label: 'サービスポリシー' },
                      { href: '/contact', label: '問い合わせ' },
                      { href: '/release-notes', label: 'リリースノート' },
                    ].map((item) => (
                      <a
                        key={item.href}
                        href={item.href}
                        className="block px-4 py-3 text-[#5c3a21] hover:bg-[#8b6914]/10 hover:text-[#3d2914] rounded-lg transition-colors font-semibold border-b border-[#d4c4a8]/50"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {item.label}
                      </a>
                    ))}
                    
                    <a
                      href="https://www.instagram.com/tokudoku_nobody/"
                      rel="noopener noreferrer"
                      className="flex items-center px-4 py-3 text-[#5c3a21] hover:bg-[#8b6914]/10 hover:text-[#3d2914] rounded-lg transition-colors mt-4"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <img
                        src="https://res.cloudinary.com/dz9trbwma/image/upload/v1759308496/icons8-%E3%82%A4%E3%83%B3%E3%82%B9%E3%82%BF%E3%82%AF%E3%82%99%E3%83%A9%E3%83%A0-100_idedfz.png"
                        alt="Instagram"
                        className="h-8 w-8 "
                      />
                      <span className="ml-2 font-bold">Instagram</span>
                    </a>

                    {/* ログアウトボタン（ログイン時のみ表示） */}
                    {session && (
                      <button
                        onClick={async () => {
                          setIsMenuOpen(false);
                          await signOut({ callbackUrl: '/' });
                        }}
                        className="flex items-center w-full px-4 py-3 text-[#dc2626] hover:bg-red-50 hover:text-[#b91c1c] rounded-lg transition-colors font-semibold border-t border-[#d4c4a8]/50 mt-4"
                      >
                        <LogOut className="h-5 w-5 mr-2" />
                        ログアウト
                      </button>
                    )}
                  </nav>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ヒーローセクション */}
        <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-8 overflow-hidden">
          {/* 背景画像（冒険・地図のイメージ） */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
'url(https://res.cloudinary.com/dz9trbwma/image/upload/v1764920377/Gemini_Generated_Image_w5u33yw5u33yw5u3_jfispg.png)',
            }}
          />
          {/* オーバーレイ（読みやすさのための暗めのグラデーション） */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#3d2914]/60 via-[#3d2914]/50 to-[#f5e6d3]" />
          <div className="absolute inset-0 bg-black/30" />
          
          {/* 羊皮紙テクスチャ */}
          <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
          />

          <div className="container mx-auto max-w-6xl relative z-10 pt-24 pb-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center space-y-8 sm:space-y-12"
            >
              <div className="space-y-6 sm:space-y-8">
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-xl sm:text-2xl md:text-3xl text-[#ffecd2] font-bold tracking-wider drop-shadow-lg"
                >
                  あなただけのマップを作成し
                  <br />
                  みんなとシェアしよう
                </motion.p>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl text-white font-bold leading-tight tracking-tight drop-shadow-xl"
                >
                  デジタルマップで
                  <br className="hidden sm:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffecd2] via-[#fff8f0] to-[#ffecd2] relative inline-block mt-3 pb-2">
                    新しい発見を
                  </span>
                </motion.h1>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.2 }}
                className="pt-6 sm:pt-8"
              >
                <Button
                  size="lg"
                  onClick={onStart}
                  className="h-16 sm:h-20 px-12 sm:px-16 text-lg sm:text-2xl font-extrabold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 bg-[#ffecd2] hover:bg-[#fff8f0] text-[#3d2914]"
                >
                  イベントを探す
                </Button>
                <p className="text-lg sm:text-xl text-gray-200 mt-4 font-bold">
                  無料で今すぐ始められます
                </p>
                <motion.a
                  href="https://forms.gle/KBSd4xoWsp5bvDJ7A"
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 1.4 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-block mt-6 px-8 sm:px-12 py-3 sm:py-4 text-base sm:text-lg font-bold text-white bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full border border-[#ffecd2]/50 hover:border-[#ffecd2] transition-all duration-300 shadow-lg"
                >
                  イベント情報募集中！
                </motion.a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 2 }}
                className="pt-12"
              >
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex flex-col items-center text-[#ffecd2] text-sm font-semibold"
                >
                  <span className="mb-2">Scroll</span>
                  <div className="w-px h-12 bg-gradient-to-b from-[#ffecd2] to-transparent" />
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* 🗺️ マイマップ一覧セクション（PointMapスタイル） */}
        <PublicMapsSection onMapClick={onMapClick} />

        {/* 特徴セクション（ミントグリーン背景） */}
        <section className="relative py-20 sm:py-24 px-4 sm:px-8 bg-[#e8f4e5] overflow-hidden">
          {/* 装飾ライン */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
             <svg className="absolute -top-20 -left-20 w-[150%] h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
               <path d="M0 50 Q 25 30 50 50 T 100 50" fill="none" stroke="#5c3a21" strokeWidth="0.2"/>
               <path d="M0 60 Q 25 40 50 60 T 100 60" fill="none" stroke="#5c3a21" strokeWidth="0.2"/>
             </svg>
          </div>

          <div className="container mx-auto max-w-6xl relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-12 sm:mb-16"
            >
              <p className="inline-block px-5 py-1 mb-4 text-xs sm:text-sm tracking-[0.18em] font-bold text-[#5c3a21]">
                FEATURES
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 text-[#3d2914] tracking-tight">
                <span className="text-[#5c3a21]">こだわり</span>の機能
              </h2>
              <p className="text-lg sm:text-xl md:text-2xl text-[#5c3a21] font-semibold mt-2">
                「My Map作成」「イベント情報」に<br />徹底的にこだわりました
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {[
                {
                  label: 'CREATE',
                  title: 'あなただけのマップを作成',
                  description: 'お気に入りのスポットを登録して、世界で一つだけのオリジナルマップを作成できます。'
                },
                {
                  label: 'DISCOVER',
                  title: 'イベント情報をマップで発見',
                  description: '地域のイベント情報がマップ上に表示。開催中のイベントをひと目で把握できます。'
                },
                {
                  label: 'SHARE',
                  title: 'みんなとシェア',
                  description: '作成したマップは公開・共有OK。友達や家族とお気に入りスポットをシェアしよう。'
                }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.08 }}
                  viewport={{ once: true }}
                  className="bg-[#fff8f0] p-8 rounded-lg border border-[#d4c4a8] shadow-xl flex flex-col items-center text-center hover:-translate-y-1 transition-transform duration-300"
                >
                  <span className="text-xs font-bold tracking-[0.15em] text-[#8b6914] uppercase mb-2">
                    {feature.label}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold mb-3 text-[#3d2914]">
                    {feature.title}
                  </h3>
                  <p className="text-sm sm:text-base text-[#5c3a21] leading-relaxed font-medium whitespace-pre-line">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* エモーショナルセクション（写真背景） */}
        <section className="py-20 sm:py-32 px-4 sm:px-8 relative overflow-hidden flex items-center justify-center">
          {/* 背景画像 */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: 'url(https://res.cloudinary.com/dz9trbwma/image/upload/v1764768098/photo-1524661135-423995f22d0b_myc9u9.jpg)',
            }}
          />
          <div className="absolute inset-0 bg-[#f5e6d3]/60" />
          
          {/* 羊皮紙テクスチャ */}
          <div className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
          />

          <div className="container mx-auto max-w-4xl relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight text-[#3d2914] drop-shadow-lg">
                他では出会えない体験に<br />
                出会えるのは「トクドク」だけ<br />
              </h2>
              <p className="text-xl sm:text-2xl lg:text-3xl text-[#5c3a21] leading-relaxed font-bold">
                デジタルマップで、<br />
                <span className="border-b-2 border-[#8b6914]">思い出と発見をシェア</span>
              </p>
            </motion.div>
          </div>
        </section>

        {/* 最終CTA */}
        <section className="relative py-16 sm:py-24 px-4 sm:px-8 overflow-hidden bg-[#f5e6d3]">
           {/* 背景：コンパスイメージ */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{
              backgroundImage:
'url(https://res.cloudinary.com/dz9trbwma/image/upload/v1764768321/photo-1516546453174-5e1098a4b4af_zwkcbo.jpg)'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#f5e6d3] via-[#f5e6d3]/80 to-transparent" />
          
          {/* 羊皮紙テクスチャ */}
          <div className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
          />

          <div className="container mx-auto max-w-4xl text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight text-[#3d2914]">
                さあ、冒険を始めよう！
              </h2>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  onClick={onStart}
                  className="h-18 sm:h-20 px-14 sm:px-20 text-xl sm:text-3xl font-extrabold rounded-full shadow-2xl hover:shadow-[0_24px_50px_rgba(61,41,20,0.35)] transform transition-all duration-300 bg-[#5c3a21] hover:bg-[#3d2914] text-[#fff8f0]"
                >
                  マップを見る
                </Button>
              </motion.div>

              <p className="text-lg sm:text-xl text-[#5c3a21] font-bold">
                アカウント登録不要 / 今すぐ使えます
              </p>
            </motion.div>
          </div>
        </section>

        {/* フッター */}
        <footer className="py-12 sm:py-16 px-4 sm:px-8 border-t border-[#d4c4a8] bg-[#ffecd2]">
          <div className="container mx-auto max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <div className="flex items-center mb-4 gap-2">
                  <img
                    src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png"
                    alt="トクドク"
                    className="h-10 w-10"
                  />
                  <span className="text-[#3d2914] font-bold text-xl">TOKUDOKU</span>
                </div>
                <p className="text-lg text-[#5c3a21] leading-relaxed font-semibold">
                  デジタルマップで、
                  <br />
                  あなたの「お気に入り」をみんなとシェア
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-extrabold mb-3 text-[#5c3a21] text-base sm:text-lg">
                    サービス
                  </h4>
                  <ul className="space-y-2">
                    <li>
                      <a href="/profile" className="text-[#8b7355] hover:text-[#3d2914] transition-colors font-semibold text-sm sm:text-base">マイページ</a>
                    </li>
                    <li>
                      <a href="/contact" className="text-[#8b7355] hover:text-[#3d2914] transition-colors font-semibold text-sm sm:text-base">問い合わせ</a>
                    </li>
                    <li>
                      <a href="/release-notes" className="text-[#8b7355] hover:text-[#3d2914] transition-colors font-semibold text-sm sm:text-base">リリースノート</a>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-extrabold mb-3 text-[#5c3a21] text-base sm:text-lg">
                    規約
                  </h4>
                  <ul className="space-y-2">
                    <li>
                      <a href="/terms/terms-of-service" className="text-[#8b7355] hover:text-[#3d2914] transition-colors font-semibold text-sm sm:text-base">利用規約</a>
                    </li>
                    <li>
                      <a href="/terms/privacy-policy" className="text-[#8b7355] hover:text-[#3d2914] transition-colors font-semibold text-sm sm:text-base">プライバシーポリシー</a>
                    </li>
                    <li>
                      <a href="/terms/service-policy" className="text-[#8b7355] hover:text-[#3d2914] transition-colors font-semibold text-sm sm:text-base">サービスポリシー</a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-[#d4c4a8] text-center">
              <p className="text-sm sm:text-base text-[#8b7355] font-semibold">
                © 2025 トクドク All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

// --- メインコンポーネント (エントリポイント) ---

export default function Home() {
  const router = useRouter();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

  const handleStart = () => {
    setSelectedMapId(null); // イベント探すボタンの場合はnull
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
        
        // selectedMapIdがある場合はtitle_idを付けて遷移
        if (selectedMapId) {
          router.push(`/map?title_id=${selectedMapId}`);
        } else {
          router.push('/map');
        }
      } catch (error) {
        console.error('位置情報の取得に失敗:', error);
        setShowLocationModal(false);
        
        // エラー時も遷移する
        if (selectedMapId) {
          router.push(`/map?title_id=${selectedMapId}`);
        } else {
          router.push('/');
        }
      }
    } else {
      console.warn('位置情報が利用できません');
      setShowLocationModal(false);
      
      // 位置情報が利用できない場合も遷移
      if (selectedMapId) {
        router.push(`/map?title_id=${selectedMapId}`);
      } else {
        router.push('/');
      }
    }
  };

  const handleDenyLocation = () => {
    setShowLocationModal(false);
    
    // 拒否時も遷移する
    if (selectedMapId) {
      router.push(`/map?title_id=${selectedMapId}`);
    } else {
      router.push('/');
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <EventLP onStart={handleStart} onMapClick={handleMapClick} />

      <CustomModal
        isOpen={showLocationModal}
        onClose={handleDenyLocation}
        title="位置情報の利用について"
        description="近くのイベントを地図上で表示するために位置情報を使用します"
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <Button
              onClick={handleAllowLocation}
              className="w-full bg-[#5c3a21] hover:bg-[#3d2914] text-[#fff8f0] font-bold text-base sm:text-lg py-6"
            >
              <MapPin className="mr-2 h-6 w-6" strokeWidth={2.5} />
              位置情報を許可してマップを探索
            </Button>

            <Button
              onClick={handleDenyLocation}
              variant="outline"
              className="w-full font-bold text-base sm:text-lg py-6 border-[#d4c4a8] text-[#5c3a21] hover:bg-[#ffecd2]"
            >
              今はスキップ
            </Button>
          </div>

          <p className="text-xs sm:text-sm text-[#8b7355] text-center font-semibold">
            ※ブラウザの設定で位置情報の許可をONにしてください
          </p>
        </div>
      </CustomModal>
    </main>
  );
}