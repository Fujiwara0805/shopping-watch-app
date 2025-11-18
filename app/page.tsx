'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Calendar, Menu, X, Heart, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomModal } from '@/components/ui/custom-modal';

// イベント特化型ランディングページ
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
    <div className="min-h-screen bg-[#fef3e7] relative overflow-x-hidden">
      {/* 背景装飾（シンプルなフラッグのみで上質寄せ） */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40">
        {/* 祭りの旗をイメージした三角形パターン */}
        <div className="absolute top-0 left-0 right-0 h-16 flex justify-around items-start">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 0.6 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="w-0 h-0"
              style={{
                borderLeft: '12px solid transparent',
                borderRight: '12px solid transparent',
                borderTop: `20px solid ${['#ff6b6b', '#ffd93d', '#6bcf7f', '#4d96ff', '#ff8fab'][i % 5]}`
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10">
        {/* ヘッダー */}
        <nav
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            scrollPosition > 10
              ? 'bg-white/95 backdrop-blur-md shadow-sm'
              : 'bg-transparent'
          }`}
        >
          <div className="container mx-auto px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
            <div className="flex items-center">
              <img
                src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png"
                alt="トクドク"
                className="h-12 w-12 sm:h-14 sm:w-14 drop-shadow-md"
              />
            </div>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="メニュー"
            >
              <Menu
                className="h-6 w-6 sm:h-7 sm:w-7 text-[#73370c] font-bold"
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
                className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm"
              />

              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed left-0 top-0 bottom-0 w-72 bg-white shadow-2xl z-[70] overflow-y-auto"
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
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      aria-label="閉じる"
                    >
                      <X className="h-6 w-6 text-gray-600" strokeWidth={2.5} />
                    </button>
                  </div>

                  <nav className="space-y-2">
                    <Link
                      href="/profile"
                      className="block px-4 py-3 text-gray-700 hover:bg-[#fef3e8] hover:text-[#73370c] rounded-lg transition-colors font-bold text-base"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      マイページ
                    </Link>
                    <Link
                      href="/terms/terms-of-service"
                      className="block px-4 py-3 text-gray-700 hover:bg-[#fef3e8] hover:text-[#73370c] rounded-lg transition-colors font-semibold"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      利用規約
                    </Link>
                    <Link
                      href="/terms/privacy-policy"
                      className="block px-4 py-3 text-gray-700 hover:bg-[#fef3e8] hover:text-[#73370c] rounded-lg transition-colors font-semibold"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      プライバシーポリシー
                    </Link>
                    <Link
                      href="/terms/service-policy"
                      className="block px-4 py-3 text-gray-700 hover:bg-[#fef3e8] hover:text-[#73370c] rounded-lg transition-colors font-semibold"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      サービスポリシー
                    </Link>
                    <Link
                      href="/contact"
                      className="block px-4 py-3 text-gray-700 hover:bg-[#fef3e8] hover:text-[#73370c] rounded-lg transition-colors font-semibold"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      問い合わせ
                    </Link>
                    <Link
                      href="/release-notes"
                      className="block px-4 py-3 text-gray-700 hover:bg-[#fef3e8] hover:text-[#73370c] rounded-lg transition-colors font-semibold"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      リリースノート
                    </Link>
                    <a
                      href="https://www.instagram.com/tokudoku_nobody/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start justify-start px-4 py-3 text-gray-700 hover:bg-[#fef3e8] hover:text-[#73370c] rounded-lg transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <img
                        src="https://res.cloudinary.com/dz9trbwma/image/upload/v1759308496/icons8-%E3%82%A4%E3%83%B3%E3%82%B9%E3%82%BF%E3%82%AF%E3%82%99%E3%83%A9%E3%83%A0-100_idedfz.png"
                        alt="Instagram"
                        className="h-8 w-8"
                      />
                    </a>
                  </nav>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ヒーローセクション */}
        <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-8 overflow-hidden">
          {/* 背景画像（ぼかし） */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                'url(https://res.cloudinary.com/dz9trbwma/image/upload/v1761712808/11_%E7%A5%AD%E3%82%8A_%E5%A4%8F%E7%A5%AD%E3%82%8A%E3%81%AE%E6%A7%98%E5%AD%90_oxlvol.jpg)',
              filter: 'blur(8px)'
            }}
          />
          {/* オーバーレイ */}
          <div className="absolute inset-0 bg-black/75" />

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
                  className="text-xl sm:text-2xl md:text-3xl text-[#fef3e7] font-bold tracking-wider drop-shadow-lg"
                >
                  大分県内のイベント情報を
                  <br />
                  多数掲載中!!!
                </motion.p>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl text-[#fef3e7] font-bold leading-tight tracking-tight drop-shadow-lg"
                >
                  わくわくする日常を
                  <br className="hidden sm:block" />
                  <span className="text-[#fef3e7] relative inline-block mt-3">
                    あなたにお届けします
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-[#fef3e7] max-w-3xl mx-auto leading-relaxed font-bold drop-shadow-md"
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
                  className="h-16 sm:h-20 px-12 sm:px-16 text-lg sm:text-2xl font-extrabold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 bg-[#fa8238] hover:bg-[#fa8238]"
                >
                  イベントを探す
                </Button>
                <p className="text-lg sm:text-xl text-white mt-4 font-bold">
                  無料で今すぐ始められます
                </p>
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
                  className="flex flex-col items-center text-gray-300 text-sm font-semibold"
                >
                  <span className="mb-2">Scroll</span>
                  <div className="w-px h-12 bg-gray-400/80" />
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* 使い方セクション（構造を整理してプレミアム感アップ） */}
        <section className="py-20 sm:py-24 px-4 sm:px-8 bg-[#fff7ef] relative overflow-hidden">
          {/* 背景画像（うっすら） */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-15"
            style={{
              backgroundImage:
                'url(https://res.cloudinary.com/dz9trbwma/image/upload/v1761796856/01_%E3%83%9E%E3%83%AB%E3%82%B7%E3%82%A7_%E5%B1%8B%E5%A4%96%E5%B8%82%E5%A0%B4%E5%BB%BA%E7%AF%89_cljqy8.jpg)'
            }}
          />
          {/* ソリッドオーバーレイ */}
          <div className="absolute inset-0 bg-[#fff7ef]/90" />

          <div className="container mx-auto max-w-6xl relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-12 sm:mb-20"
            >
              <p className="inline-block px-5 py-1 mb-4 text-xs sm:text-sm tracking-[0.18em] font-semibold text-[#b47433] border border-[#f0d0ac] rounded-full bg-white/70">
                HOW TO USE
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#73370c] tracking-tight">
                <img
                  src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png"
                  alt="トクドク"
                  className="inline-block h-16 w-16 sm:h-20 sm:w-20 mr-3 mb-2 align-middle"
                />
                かんたん3ステップ
              </h2>
              <p className="text-lg sm:text-xl md:text-2xl text-gray-700 mt-5 font-semibold">
                直感的なマップで、
                <span className="ml-1">今日行きたいイベントがすぐ見つかる</span>
              </p>
            </motion.div>

            {/* STEP カード */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
              {[
                {
                  step: '01',
                  icon: Search,
                  title: '地図をひらく',
                  description: 'アプリを開くと、イベントが地図上にピンで表示されます。',
                  imageUrl:
                    'https://res.cloudinary.com/dz9trbwma/image/upload/v1761742897/1A7F75AD-84B0-45C6-87EF-1EC6EEF1A4EB_1_201_a_gulzoo.jpg'
                },
                {
                  step: '02',
                  icon: MapPin,
                  title: '気になるピンをタップ',
                  description:
                    'ピンを押すと、画面下にイベントの詳細・開催時間・場所がまとまって表示されます。',
                  imageUrl:
'https://res.cloudinary.com/dz9trbwma/image/upload/v1763465785/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2025-11-18_20.35.26_hofjao.png'
                },
                {
                  step: '03',
                  icon: Heart,
                  title: 'あとは出掛けるだけ',
                  description:
                    '気になったイベントに足を運んで、いつもの街をもっと楽しみましょう。',
                  imageUrl:
                    'https://res.cloudinary.com/dz9trbwma/image/upload/v1761712807/08_%E7%A5%AD%E3%82%8A_%E5%B1%8B%E5%8F%B0%E9%A2%A8%E6%99%AF_gen7np.jpg'
                }
              ].map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: index * 0.08 }}
                  viewport={{ once: true }}
                  className="flex flex-col bg-white/95 rounded-3xl border border-[#f0d0ac] shadow-[0_18px_45px_rgba(115,55,12,0.08)] overflow-hidden"
                >
                  <div className="flex items-center justify-between px-6 sm:px-7 pt-6 sm:pt-7 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-[#fef3e8] flex items-center justify-center">
                        <item.icon
                          className="h-6 w-6 sm:h-7 sm:w-7 text-[#73370c]"
                          strokeWidth={2.5}
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold tracking-[0.18em] text-[#b47433]">
                          STEP {item.step}
                        </p>
                        <h3 className="text-xl sm:text-2xl font-extrabold text-[#73370c] leading-tight">
                          {item.title}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 sm:px-7 pb-6">
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed font-semibold">
                      {item.description}
                    </p>
                  </div>

                  <div className="relative mt-auto">
                    <div className="mx-4 mb-5 rounded-2xl overflow-hidden border border-[#ead2b6] bg-[#fef7ef]">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-56 sm:h-64 object-cover"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* ミニ補足 */}
            <div className="mt-12 text-center">
              <p className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-[#f0d0ac] text-xs sm:text-sm font-semibold text-gray-700">
                アカウント登録不要で、開いてすぐこの画面からスタートできます
              </p>
            </div>
          </div>
        </section>

        {/* 特徴セクション（カードを整理して高級感のあるレイアウトに） */}
        <section className="relative py-20 sm:py-24 px-4 sm:px-8 bg-[#fdf2e6] overflow-hidden">
          {/* 背景画像（ごく薄く） */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-10"
            style={{
              backgroundImage:
                'url(https://res.cloudinary.com/dz9trbwma/image/upload/v1761712807/07_%E7%A5%AD%E3%82%8A_%E5%B1%8B%E5%8F%B0%E3%82%AF%E3%82%99%E3%83%AB%E3%83%A1_wwmiek.jpg)'
            }}
          />
          {/* ソリッドオーバーレイ */}
          <div className="absolute inset-0 bg-[#fdf2e6]/90" />

          <div className="container mx-auto max-w-6xl relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-12 sm:mb-16"
            >
              <p className="inline-block px-5 py-1 mb-4 text-xs sm:text-sm tracking-[0.18em] font-semibold text-[#b47433] border border-[#f0d0ac] rounded-full bg-white/70">
                FEATURES
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 text-[#73370c] tracking-tight">
                <img
                  src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png"
                  alt="トクドク"
                  className="inline-block h-16 w-16 sm:h-20 sm:w-20 mr-3 mb-2 align-middle"
                />
                のこだわり
              </h2>
              <p className="text-lg sm:text-xl md:text-2xl text-gray-700 font-semibold mt-2">
                「探しやすさ」「確かさ」「気軽さ」に<br />徹底的にこだわりました
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
              {[
                {
                  icon: MapPin,
                  label: 'FINDABILITY',
                  title: '地図で一目でわかる',
                  description:
                    'どこで何が開催されているか、ピンを見るだけで直感的に把握できます。文字だけの一覧よりも、移動ルートまでイメージしやすくなります。'
                },
                {
                  icon: Calendar,
                  label: 'REAL-TIME',
                  title: '開催中の情報だけ表示',
                  description:
                    '終了したイベント情報は自動で非表示。今日～近日のイベントだけが並ぶので、「行ったらもう終わっていた…」を防ぎます。'
                },
                {
                  icon: Heart,
                  label: 'FREE & EASY',
                  title: '完全無料で、今すぐ使える',
                  description:
                    '会員登録もクレジットカードも不要。アプリを開くだけで、週末どこいく？といった悩みを解決します。'
                }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.08 }}
                  viewport={{ once: true }}
                  className="bg-white/95 p-8 sm:p-9 rounded-3xl border border-[#f0d0ac] shadow-[0_18px_45px_rgba(115,55,12,0.08)] flex flex-col"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#fef3e8] flex items-center justify-center">
                        <feature.icon
                          className="h-8 w-8 sm:h-9 sm:w-9 text-[#73370c]"
                          strokeWidth={2.5}
                        />
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold tracking-[0.22em] text-[#b47433] uppercase">
                        {feature.label}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold mb-3 text-[#73370c]">
                    {feature.title}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed font-semibold">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* メッセージセクション */}
        <section className="py-20 sm:py-32 px-4 sm:px-8 bg-[#fef3e8] relative overflow-hidden">
          <div className="absolute inset-0 opacity-35">
            <div className="absolute top-[-40px] left-1/4 w-80 h-80 bg-[#fef3e7] rounded-full blur-3xl" />
            <div className="absolute bottom-[-40px] right-1/4 w-80 h-80 bg-[#fef3e7] rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto max-w-4xl relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center space-y-6"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight text-[#73370c]">
                いつもの街が、
                <br className="sm:hidden" />
                もっと好きになる
              </h2>
              <p className="text-2xl sm:text-3xl lg:text-4xl text-[#73370c] leading-relaxed max-w-2xl mx-auto font-bold">
                地域のイベントで、
                <br className="sm:hidden" />
                人と街をつなぐ
              </p>
            </motion.div>
          </div>
        </section>

        {/* 最終CTA */}
        <section className="relative py-16 sm:py-24 px-4 sm:px-8 overflow-hidden bg-[#fffaf5]">
          {/* 背景画像 */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25"
            style={{
              backgroundImage:
                'url(https://res.cloudinary.com/dz9trbwma/image/upload/v1761712807/10_%E5%9C%B0%E5%9F%9F%E3%81%AE%E5%A4%8F%E7%A5%AD%E3%82%8A_zi3gse.jpg)'
            }}
          />
          {/* ソリッドオーバーレイ */}
          <div className="absolute inset-0 bg-[#fffaf5]/85" />

          <div className="container mx-auto max-w-4xl text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight text-[#73370c]">
                さあ、出掛けよう！
              </h2>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  onClick={onStart}
                  className="h-18 sm:h-20 px-14 sm:px-20 text-xl sm:text-3xl font-extrabold rounded-full shadow-2xl hover:shadow-[0_24px_50px_rgba(92,42,10,0.45)] transform transition-all duration-300 bg-[#73370c] hover:bg-[#5c2a0a]"
                >
                  マップを見る
                </Button>
              </motion.div>

              <p className="text-lg sm:text-xl text-gray-700 font-bold">
                アカウント登録不要 / 今すぐ使えます
              </p>
            </motion.div>
          </div>
        </section>

        {/* フッター */}
        <footer className="py-12 sm:py-16 px-4 sm:px-8 border-t bg-gray-50">
          <div className="container mx-auto max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <div className="flex items-center mb-4">
                  <img
                    src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png"
                    alt="トクドク"
                    className="h-12 w-12"
                  />
                </div>
                <p className="text-lg text-gray-600 leading-relaxed font-semibold">
                  地域のイベントを通じて、
                  <br />
                  人と人、人と街をつなぐプラットフォーム
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-extrabold mb-3 text-[#73370c] text-base sm:text-lg">
                    サービス
                  </h4>
                  <ul className="space-y-2">
                    <li>
                      <Link
                        href="/profile"
                        className="text-gray-600 hover:text-[#73370c] transition-colors font-semibold text-sm sm:text-base"
                      >
                        マイページ
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/contact"
                        className="text-gray-600 hover:text-[#73370c] transition-colors font-semibold text-sm sm:text-base"
                      >
                        問い合わせ
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/release-notes"
                        className="text-gray-600 hover:text-[#73370c] transition-colors font-semibold text-sm sm:text-base"
                      >
                        リリースノート
                      </Link>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-extrabold mb-3 text-[#73370c] text-base sm:text-lg">
                    規約
                  </h4>
                  <ul className="space-y-2">
                    <li>
                      <Link
                        href="/terms/terms-of-service"
                        className="text-gray-600 hover:text-[#73370c] transition-colors font-semibold text-sm sm:text-base"
                      >
                        利用規約
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/terms/privacy-policy"
                        className="text-gray-600 hover:text-[#73370c] transition-colors font-semibold text-sm sm:text-base"
                      >
                        プライバシーポリシー
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/terms/service-policy"
                        className="text-gray-600 hover:text-[#73370c] transition-colors font-semibold text-sm sm:text-base"
                      >
                        サービスポリシー
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t text-center">
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

// メインコンポーネント
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