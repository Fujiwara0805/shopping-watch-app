'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomModal } from '@/components/ui/custom-modal';

// --- メイン実装 ---

const EventLP = ({ onStart }: { onStart: () => void }) => {
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
    <div className="min-h-screen bg-[#0f172a] relative overflow-x-hidden font-sans">
      {/* 背景装飾（ゴールドのラインで高級感を演出） */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <svg className="absolute top-0 right-0 w-full h-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0 0 C 30 40 70 40 100 0 L 100 100 L 0 100 Z" fill="url(#gold-gradient)" />
          <defs>
            <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b49026" />
              <stop offset="50%" stopColor="#fcf6ba" />
              <stop offset="100%" stopColor="#b49026" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="relative z-10">
        {/* ヘッダー */}
        <nav
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-white/5 ${
            scrollPosition > 10
              ? 'bg-[#0f172a]/90 backdrop-blur-md shadow-lg'
              : 'bg-transparent border-transparent'
          }`}
        >
          <div className="container mx-auto px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* ロゴアイコン */}
              <div className="relative">
                <div className="absolute inset-0 bg-[#ffffff] blur opacity-30 rounded-full"></div>
                <img
src="https://res.cloudinary.com/dz9trbwma/image/upload/v1763822849/ChatGPT_Image_2025%E5%B9%B411%E6%9C%8822%E6%97%A5_23_46_11_-_%E7%B7%A8%E9%9B%86%E6%B8%88%E3%81%BF_n1uf53.png"
                  alt="トクドク"
                  className="h-12 w-12 sm:h-14 sm:w-14 relative z-10 drop-shadow-md"
                />
              </div>
              <span className={`font-bold text-xl tracking-widest hidden sm:block ${scrollPosition > 10 ? 'text-white' : 'text-white'}`}>
                TOKU<span className="text-[#d4af37]">DOKU</span>
              </span>
            </div>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="メニュー"
            >
              <Menu
                className="h-6 w-6 sm:h-7 sm:w-7 text-[#d4af37]"
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
                className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
              />

              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed left-0 top-0 bottom-0 w-72 bg-[#0f172a] border-r border-[#d4af37]/30 shadow-2xl z-[70] overflow-y-auto"
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
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      aria-label="閉じる"
                    >
                      <X className="h-6 w-6 text-[#d4af37]" strokeWidth={2.5} />
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
                        className="block px-4 py-3 text-gray-300 hover:bg-[#d4af37]/10 hover:text-[#d4af37] rounded-lg transition-colors font-semibold border-b border-white/5"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {item.label}
                      </a>
                    ))}
                    
                    <a
                      href="https://www.instagram.com/tokudoku_nobody/"
                      rel="noopener noreferrer"
                      className="flex items-center px-4 py-3 text-gray-300 hover:bg-[#d4af37]/10 hover:text-[#d4af37] rounded-lg transition-colors mt-4"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <img
                        src="https://res.cloudinary.com/dz9trbwma/image/upload/v1759308496/icons8-%E3%82%A4%E3%83%B3%E3%82%B9%E3%82%BF%E3%82%AF%E3%82%99%E3%83%A9%E3%83%A0-100_idedfz.png"
                        alt="Instagram"
                        className="h-8 w-8 "
                      />
                      <span className="ml-2 font-bold">Instagram</span>
                    </a>
                  </nav>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ヒーローセクション */}
        <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-8 overflow-hidden">
          {/* 背景画像（城・花火・祭りのイメージ） */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                'url(https://res.cloudinary.com/dz9trbwma/image/upload/v1761712808/11_%E7%A5%AD%E3%82%8A_%E5%A4%8F%E7%A5%AD%E3%82%8A%E3%81%AE%E6%A7%98%E5%AD%90_oxlvol.jpg)',
            }}
          />
          {/* オーバーレイ（濃紺のグラデーションでリッチに） */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/80 via-[#0f172a]/60 to-[#0f172a]" />
          <div className="absolute inset-0 bg-black/30" />

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
                  className="text-xl sm:text-2xl md:text-3xl text-[#d4af37] font-bold tracking-wider drop-shadow-lg"
                >
                  大分県内のイベント情報を
                  <br />
                  多数掲載中!!!
                </motion.p>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl text-white font-bold leading-tight tracking-tight drop-shadow-xl"
                >
                  わくわくする日常を
                  <br className="hidden sm:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fcf6ba] via-[#d4af37] to-[#b49026] relative inline-block mt-3 pb-2">
                    あなたにお届けします
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-gray-200 max-w-3xl mx-auto leading-relaxed font-bold drop-shadow-md"
                >
                  マップ上で
                  <br className="sm:hidden" />
                  イベント情報が見つかる
                </motion.p>
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
                  className="h-16 sm:h-20 px-12 sm:px-16 text-lg sm:text-2xl font-extrabold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 bg-[#73370c] hover:bg-[#5c2a0a] text-white"
                >
                  イベントを探す
                </Button>
                <p className="text-lg sm:text-xl text-gray-300 mt-4 font-bold">
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
                  className="inline-block mt-6 px-8 sm:px-12 py-3 sm:py-4 text-base sm:text-lg font-bold text-white bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full border border-[#d4af37]/50 hover:border-[#d4af37] transition-all duration-300 shadow-lg"
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
                  className="flex flex-col items-center text-[#d4af37] text-sm font-semibold"
                >
                  <span className="mb-2">Scroll</span>
                  <div className="w-px h-12 bg-gradient-to-b from-[#d4af37] to-transparent" />
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* 使い方セクション（白背景で清潔感を出す） */}
        <section className="py-20 sm:py-24 px-4 sm:px-8 bg-white relative overflow-hidden">
          <div className="container mx-auto max-w-6xl relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-12 sm:mb-20"
            >
              <p className="inline-block px-5 py-1 mb-4 text-xs sm:text-sm tracking-[0.18em] font-bold text-[#0f172a] border-b-2 border-[#d4af37]">
                HOW TO USE
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#0f172a] tracking-tight mt-2">
                かんたん3ステップ
              </h2>
              <p className="text-lg sm:text-xl md:text-2xl text-gray-600 mt-5 font-semibold">
                直感的なマップで、<br />
                <span className="ml-1 text-[#0f172a] border-b-2 border-[#d4af37]/50">今日行きたいイベントがすぐ見つかる</span>
              </p>
            </motion.div>

            {/* STEP カード */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
              {[
                {
                  step: '01',
                  title: '地図をひらく',
                  description: 'イベント情報が地図上にピンで表示されます。',
                  imageUrl: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761742897/1A7F75AD-84B0-45C6-87EF-1EC6EEF1A4EB_1_201_a_gulzoo.jpg'
                },
                {
                  step: '02',
                  title: 'ピンをタップ',
                  description: 'ピンを押すと、画面下に\nイベント情報が表示されます。',
                  imageUrl: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1763465785/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2025-11-18_20.35.26_hofjao.png'
                },
                {
                  step: '03',
                  title: 'あとは出掛けるだけ',
                  description: '気になったイベントに足を運んで、\nいつもの街をもっと楽しみましょう。',
                  imageUrl: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761712807/08_%E7%A5%AD%E3%82%8A_%E5%B1%8B%E5%8F%B0%E9%A2%A8%E6%99%AF_gen7np.jpg'
                }
              ].map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: index * 0.08 }}
                  viewport={{ once: true }}
                  className="flex flex-col items-center text-center group"
                >
                  <div className="mb-6 relative">
                    {/* ステップ番号の装飾 */}
                    <span className="text-sm font-bold tracking-[0.2em] text-[#d4af37] block mb-2">STEP {item.step}</span>
                    {index < 2 && (
                      <div className="hidden md:block absolute top-1/2 -right-2/3 w-1/2 border-t-2 border-dashed border-gray-300 text-gray-300">
                        <span className="absolute -top-2.5 right-0 transform rotate-45 border-t-2 border-r-2 border-dashed border-gray-300 w-4 h-4"></span>
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-[#0f172a] mb-3">
                    {item.title}
                  </h3>

                  <p className="text-base sm:text-base text-gray-600 leading-relaxed font-medium mb-6 whitespace-pre-line">
                    {item.description}
                  </p>

                  <div className="w-full rounded-2xl overflow-hidden shadow-lg border border-gray-100">
                     <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-48 object-cover"
                      />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* ミニ補足 */}
            <div className="mt-16 text-center">
              <p className="inline-block py-2 px-6 bg-[#f1f5f9] rounded-full text-xs sm:text-sm font-bold text-gray-600">
                アカウント登録不要で、すぐご利用できます
              </p>
            </div>
          </div>
        </section>

        {/* 特徴セクション（濃紺背景で引き締める） */}
        <section className="relative py-20 sm:py-24 px-4 sm:px-8 bg-[#0f172a] overflow-hidden">
          {/* 金色の装飾ライン */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
             <svg className="absolute -top-20 -left-20 w-[150%] h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
               <path d="M0 50 Q 25 30 50 50 T 100 50" fill="none" stroke="#d4af37" strokeWidth="0.2"/>
               <path d="M0 60 Q 25 40 50 60 T 100 60" fill="none" stroke="#d4af37" strokeWidth="0.2"/>
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
              <p className="inline-block px-5 py-1 mb-4 text-xs sm:text-sm tracking-[0.18em] font-bold text-[#d4af37]">
                FEATURES
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 text-white tracking-tight">
                <span className="text-[#d4af37]">こだわり</span>の機能
              </h2>
              <p className="text-lg sm:text-xl md:text-2xl text-gray-300 font-semibold mt-2">
                「探しやすさ」「確かさ」「気軽さ」に<br />徹底的にこだわりました
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {[
                {
                  label: 'FINDABILITY',
                  title: '地図で一目でわかる',
                  description: 'どこで何が開催されているか、ピンを見るだけで直感的に把握できます。'
                },
                {
                  label: 'REAL-TIME',
                  title: '開催中の情報だけ表示',
                  description: '終了したイベント情報は自動で非表示。今日～近日のイベントだけが並びます。'
                },
                {
                  label: 'FREE & EASY',
                  title: '完全無料で、今すぐ',
                  description: '会員登録もクレジットカードも不要。アプリを開くだけで使えます。'
                }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.08 }}
                  viewport={{ once: true }}
                  className="bg-white p-8 rounded-lg border border-gray-200 shadow-xl flex flex-col items-center text-center hover:-translate-y-1 transition-transform duration-300"
                >
                  <span className="text-xs font-bold tracking-[0.15em] text-[#d4af37] uppercase mb-2">
                    {feature.label}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold mb-3 text-[#0f172a]">
                    {feature.title}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed font-medium whitespace-pre-line">
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
              backgroundImage: 'url(https://res.cloudinary.com/dz9trbwma/image/upload/v1761712807/07_%E7%A5%AD%E3%82%8A_%E5%B1%8B%E5%8F%B0%E3%82%AF%E3%82%99%E3%83%AB%E3%83%A1_wwmiek.jpg)',
            }}
          />
          <div className="absolute inset-0 bg-[#0f172a]/70" />

          <div className="container mx-auto max-w-4xl relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight text-white drop-shadow-lg">
                いつもの街が、
                <br />
                もっと好きになる
              </h2>
              <p className="text-xl sm:text-2xl lg:text-3xl text-gray-200 leading-relaxed font-bold">
                地域のイベントで、
                <span className="border-b-2 border-[#d4af37]">人と街をつなぐ</span>
              </p>
            </motion.div>
          </div>
        </section>

        {/* 最終CTA */}
        <section className="relative py-16 sm:py-24 px-4 sm:px-8 overflow-hidden bg-[#0f172a]">
           {/* 背景：花火イメージ */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{
              backgroundImage:
                'url(https://res.cloudinary.com/dz9trbwma/image/upload/v1761712807/10_%E5%9C%B0%E5%9F%9F%E3%81%AE%E5%A4%8F%E7%A5%AD%E3%82%8A_zi3gse.jpg)'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/80 to-transparent" />

          <div className="container mx-auto max-w-4xl text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight text-white">
                さあ、出掛けよう！
              </h2>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  onClick={onStart}
                  className="h-18 sm:h-20 px-14 sm:px-20 text-xl sm:text-3xl font-extrabold rounded-full shadow-2xl hover:shadow-[0_24px_50px_rgba(92,42,10,0.45)] transform transition-all duration-300 bg-[#73370c] hover:bg-[#5c2a0a] text-white"
                >
                  マップを見る
                </Button>
              </motion.div>

              <p className="text-lg sm:text-xl text-gray-400 font-bold">
                アカウント登録不要 / 今すぐ使えます
              </p>
            </motion.div>
          </div>
        </section>

        {/* フッター */}
        <footer className="py-12 sm:py-16 px-4 sm:px-8 border-t border-white/10 bg-[#0b1120]">
          <div className="container mx-auto max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <div className="flex items-center mb-4 gap-2">
                  <img
                    src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png"
                    alt="トクドク"
                    className="h-10 w-10"
                  />
                  <span className="text-white font-bold text-xl">TOKUDOKU</span>
                </div>
                <p className="text-lg text-gray-400 leading-relaxed font-semibold">
                  地域のイベントを通じて、
                  <br />
                  人と人、人と街をつなぐプラットフォーム
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-extrabold mb-3 text-[#d4af37] text-base sm:text-lg">
                    サービス
                  </h4>
                  <ul className="space-y-2">
                    <li>
                      <a href="/profile" className="text-gray-400 hover:text-white transition-colors font-semibold text-sm sm:text-base">マイページ</a>
                    </li>
                    <li>
                      <a href="/contact" className="text-gray-400 hover:text-white transition-colors font-semibold text-sm sm:text-base">問い合わせ</a>
                    </li>
                    <li>
                      <a href="/release-notes" className="text-gray-400 hover:text-white transition-colors font-semibold text-sm sm:text-base">リリースノート</a>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-extrabold mb-3 text-[#d4af37] text-base sm:text-lg">
                    規約
                  </h4>
                  <ul className="space-y-2">
                    <li>
                      <a href="/terms/terms-of-service" className="text-gray-400 hover:text-white transition-colors font-semibold text-sm sm:text-base">利用規約</a>
                    </li>
                    <li>
                      <a href="/terms/privacy-policy" className="text-gray-400 hover:text-white transition-colors font-semibold text-sm sm:text-base">プライバシーポリシー</a>
                    </li>
                    <li>
                      <a href="/terms/service-policy" className="text-gray-400 hover:text-white transition-colors font-semibold text-sm sm:text-base">サービスポリシー</a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-white/10 text-center">
              <p className="text-sm sm:text-base text-gray-500 font-semibold">
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

  const handleStart = () => {
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
        router.push('/map');
      } catch (error) {
        console.error('位置情報の取得に失敗:', error);
        setShowLocationModal(false);
        router.push('/map');
      }
    } else {
      console.warn('位置情報が利用できません');
      setShowLocationModal(false);
      router.push('/map');
    }
  };

  const handleDenyLocation = () => {
    setShowLocationModal(false);
    router.push('/map');
  };

  return (
    <main className="min-h-screen bg-background">
      <EventLP onStart={handleStart} />

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
              className="w-full bg-[#73370c] hover:bg-[#5c2a0a] text-white font-bold text-base sm:text-lg py-6"
            >
              <MapPin className="mr-2 h-6 w-6" strokeWidth={2.5} />
              位置情報を許可してイベントを探す
            </Button>

            <Button
              onClick={handleDenyLocation}
              variant="outline"
              className="w-full font-bold text-base sm:text-lg py-6"
            >
              今はスキップ
            </Button>
          </div>

          <p className="text-xs sm:text-sm text-gray-500 text-center font-semibold">
            ※ブラウザの設定で位置情報の許可をONにしてください
          </p>
        </div>
      </CustomModal>
    </main>
  );
}