'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Menu, X, ArrowRight } from 'lucide-react';
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
      {/* 背景装飾 - よりシンプルに */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        {/* ドットパターン */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #e8d4bf 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        
        {/* 祭りの旗をイメージした三角形パターン */}
        <div className="absolute top-0 left-0 right-0 h-16 flex justify-around items-start">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 0.8 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
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
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrollPosition > 10 ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'
        }`}>
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
              <Menu className="h-6 w-6 sm:h-7 sm:w-7 text-[#73370c] font-bold" strokeWidth={2.5} />
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
          {/* 背景画像（60%ぼかし） */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: 'url(https://res.cloudinary.com/dz9trbwma/image/upload/v1761712808/11_%E7%A5%AD%E3%82%8A_%E5%A4%8F%E7%A5%AD%E3%82%8A%E3%81%AE%E6%A7%98%E5%AD%90_oxlvol.jpg)',
              filter: 'blur(8px)',
            }}
          />
          {/* オーバーレイ（テキストの可読性向上） */}
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
                  大分県内のイベント情報を<br/>
                  多数掲載中!!!
                </motion.p>

                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl text-[#fef3e7] font-bold leading-tight tracking-tight drop-shadow-lg"
                >
                  わくわくする日常を<br className="sm:hidden" />
                  <br className="hidden sm:block" />
                  <span className="text-[#fef3e7] relative inline-block">
                    あなたにお届けします
                  </span>
                </motion.h1>

                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-[#fef3e7] max-w-3xl mx-auto leading-relaxed font-bold drop-shadow-md"
                >     
                  マップ上で<br className="sm:hidden" />イベント情報が見つかる
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
                  className="h-16 sm:h-20 px-12 sm:px-16 text-lg sm:text-2xl font-extrabold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 bg-[#fa8238] hover:bg-[#e67529]"
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
                  <div className="w-px h-12 bg-white/40" />
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* 使い方セクション - 大幅改善 */}
        <section className="py-20 sm:py-32 px-4 sm:px-8 bg-white">
          <div className="container mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16 sm:mb-24"
            >
              <div className="inline-flex items-center gap-3 mb-6">
                <img 
                  src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png" 
                  alt="トクドク" 
                  className="h-16 w-16 sm:h-20 sm:w-20"
                />
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#73370c]">
                  使い方
                </h2>
              </div>
              <p className="text-xl sm:text-2xl md:text-3xl text-[#73370c] mt-6 font-bold">
                3ステップで簡単にイベントを探せます
              </p>
            </motion.div>

            <div className="relative">
              {/* 縦線 - ステップをつなぐ */}
              <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-1 bg-[#fef3e8] -translate-x-1/2" />
              
              <div className="space-y-20 sm:space-y-32">
                {[
                  {
                    step: "01",
                    title: "地図で探す",
                    description: "あなたの周辺や気になるエリアのイベント情報を地図上で一目で確認できます。ピンをタップするだけで詳細をチェック。",
                    imageUrl: "https://res.cloudinary.com/dz9trbwma/image/upload/v1761742897/1A7F75AD-84B0-45C6-87EF-1EC6EEF1A4EB_1_201_a_gulzoo.jpg",
                    color: "#ff6b6b"
                  },
                  {
                    step: "02",
                    title: "気になるイベントをタップ",
                    description: "マップ上のピンをタップすると、イベントの詳細情報が画面下にスライド表示されます。開催日時や場所を素早く確認。",
                    imageUrl: "https://res.cloudinary.com/dz9trbwma/image/upload/v1761742896/EA2E63F9-7E6A-47EF-AF57-5EECDE999271_1_201_a_c95qf8.jpg",
                    color: "#4d96ff"
                  },
                  {
                    step: "03",
                    title: "イベントを楽しむ",
                    description: "気になるイベントを見つけたら、あとは現地へ。いつもの街が特別な場所に変わる瞬間を体験してください。",
                    imageUrl: "https://res.cloudinary.com/dz9trbwma/image/upload/v1761712807/08_%E7%A5%AD%E3%82%8A_%E5%B1%8B%E5%8F%B0%E9%A2%A8%E6%99%AF_gen7np.jpg",
                    color: "#6bcf7f"
                  }
                ].map((item, index) => (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: index * 0.2 }}
                    viewport={{ once: true }}
                    className="relative"
                  >
                    <div className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-8 lg:gap-16`}>
                      {/* テキストエリア */}
                      <div className="flex-1 w-full">
                        <div className="bg-[#fef3e8] rounded-3xl p-8 sm:p-12 shadow-lg border-4 border-white hover:shadow-2xl transition-all duration-300">
                          {/* ステップ番号バッジ */}
                          <div className="flex justify-center mb-6">
                            <div 
                              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shadow-md"
                              style={{ backgroundColor: item.color }}
                            >
                              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                                {item.step}
                              </span>
                            </div>
                          </div>

                          {/* タイトル */}
                          <h3 className="text-3xl sm:text-4xl font-extrabold mb-4 text-[#73370c] text-center">
                            {item.title}
                          </h3>

                          {/* 説明文 */}
                          <p className="text-lg sm:text-xl text-gray-700 leading-relaxed font-medium">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {/* 画像エリア */}
                      <div className="flex-1 w-full">
                        <div className="relative group">
                          <div className="absolute -inset-4 bg-[#fef3e8] rounded-3xl transform rotate-3 group-hover:rotate-6 transition-transform duration-300" />
                          <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                            <img 
                              src={item.imageUrl} 
                              alt={item.title}
                              className="w-full h-[300px] sm:h-[400px] object-cover transform group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 特徴セクション - 大幅改善 */}
        <section className="py-20 sm:py-32 px-4 sm:px-8 bg-[#fef3e8]">
          <div className="container mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16 sm:mb-24"
            >
              <div className="inline-flex items-center gap-3 mb-6">
                <img 
                  src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png" 
                  alt="トクドク" 
                  className="h-16 w-16 sm:h-20 sm:w-20"
                />
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#73370c]">
                  の特徴
                </h2>
              </div>
              <p className="text-xl sm:text-2xl md:text-3xl text-[#73370c] mt-6 font-bold">
                シンプルで使いやすい、3つの魅力
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
              {[
                {
                  title: "地図で探しやすい",
                  description: "視覚的に分かりやすい地図インターフェースで、周辺のイベント情報を一目で確認。気になるエリアを自由に探索できます。",
                  color: "#ff6b6b",
                  number: "01"
                },
                {
                  title: "リアルタイム更新",
                  description: "常に最新のイベント情報を提供。終了したイベントは自動的に非表示になるので、見たい情報だけが表示されます。",
                  color: "#4d96ff",
                  number: "02"
                },
                {
                  title: "完全無料",
                  description: "アカウント登録不要で、すべての機能を無料で利用可能。今すぐブラウザで開くだけで、イベント探しを始められます。",
                  color: "#6bcf7f",
                  number: "03"
                }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.15 }}
                  viewport={{ once: true }}
                  className="relative group"
                >
                  {/* 背景カード */}
                  <div className="absolute inset-0 bg-white rounded-3xl transform group-hover:scale-105 transition-transform duration-300 shadow-lg" />
                  
                  {/* メインコンテンツ */}
                  <div className="relative bg-white rounded-3xl p-8 sm:p-10 border-4 border-white hover:border-[#fef3e8] transition-all duration-300 h-full flex flex-col">
                    {/* ナンバー */}
                    <div className="flex justify-end mb-6">
                      <span className="text-5xl sm:text-6xl font-extrabold text-[#fef3e8]">
                        {feature.number}
                      </span>
                    </div>

                    {/* タイトル */}
                    <h3 className="text-2xl sm:text-3xl font-extrabold mb-4 text-[#73370c]">
                      {feature.title}
                    </h3>

                    {/* 説明文 */}
                    <p className="text-base sm:text-lg text-gray-600 leading-relaxed font-medium flex-grow">
                      {feature.description}
                    </p>

                    {/* アクセント線 */}
                    <div 
                      className="mt-6 h-1 w-16 rounded-full"
                      style={{ backgroundColor: feature.color }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* メッセージセクション */}
        <section className="py-20 sm:py-32 px-4 sm:px-8 bg-white relative overflow-hidden">
          {/* シンプルな背景装飾 */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#73370c] rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#fa8238] rounded-full blur-3xl" />
          </div>
          
          <div className="container mx-auto max-w-4xl relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center space-y-8"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight text-[#73370c]">
                いつもの街が、<br className="sm:hidden" />
                もっと好きになる
              </h2>
              <p className="text-2xl sm:text-3xl lg:text-4xl text-[#73370c] leading-relaxed max-w-2xl mx-auto font-bold">
                地域のイベントで、<br className="sm:hidden" />
                人と街をつなぐ
              </p>
              
              {/* 装飾的な要素 */}
              <div className="flex justify-center gap-4 pt-8">
                {['#ff6b6b', '#ffd93d', '#6bcf7f', '#4d96ff', '#ff8fab'].map((color, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* 最終CTA */}
        <section className="py-20 sm:py-32 px-4 sm:px-8 bg-[#73370c] relative overflow-hidden">
          {/* 背景パターン */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '30px 30px'
            }} />
          </div>
          
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

              <p className="text-xl sm:text-2xl text-white/90 font-bold">
                あなたの街で開催される<br className="sm:hidden" />
                素敵なイベントが待っています
              </p>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="pt-4"
              >
                <Button
                  size="lg"
                  onClick={onStart}
                  className="h-18 sm:h-24 px-14 sm:px-20 text-xl sm:text-3xl font-extrabold rounded-full shadow-2xl hover:shadow-3xl transform transition-all duration-300 bg-white text-[#73370c] hover:bg-[#fef3e8]"
                >
                  マップを見る
                  <ArrowRight className="ml-3 h-8 w-8" strokeWidth={3} />
                </Button>
              </motion.div>

              <p className="text-lg sm:text-xl text-white/80 font-bold">
                アカウント登録不要 / 今すぐ使えます
              </p>
            </motion.div>
          </div>
        </section>

        {/* フッター */}
        <footer className="py-12 sm:py-16 px-4 sm:px-8 border-t bg-white">
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
                  地域のイベントを通じて、<br />
                  人と人、人と街をつなぐプラットフォーム
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-extrabold mb-3 text-[#73370c] text-base sm:text-lg">サービス</h4>
                  <ul className="space-y-2">
                    <li>
                      <Link href="/profile" className="text-gray-600 hover:text-[#73370c] transition-colors font-semibold text-sm sm:text-base">
                        マイページ
                      </Link>
                    </li>
                    <li>
                      <Link href="/contact" className="text-gray-600 hover:text-[#73370c] transition-colors font-semibold text-sm sm:text-base">
                        問い合わせ
                      </Link>
                    </li>
                    <li>
                      <Link href="/release-notes" className="text-gray-600 hover:text-[#73370c] transition-colors font-semibold text-sm sm:text-base">
                        リリースノート
                      </Link>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-extrabold mb-3 text-[#73370c] text-base sm:text-lg">規約</h4>
                  <ul className="space-y-2">
                    <li>
                      <Link href="/terms/terms-of-service" className="text-gray-600 hover:text-[#73370c] transition-colors font-semibold text-sm sm:text-base">
                        利用規約
                      </Link>
                    </li>
                    <li>
                      <Link href="/terms/privacy-policy" className="text-gray-600 hover:text-[#73370c] transition-colors font-semibold text-sm sm:text-base">
                        プライバシーポリシー
                      </Link>
                    </li>
                    <li>
                      <Link href="/terms/service-policy" className="text-gray-600 hover:text-[#73370c] transition-colors font-semibold text-sm sm:text-base">
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
          expiresAt: Date.now() + (60 * 60 * 1000)
        };
        localStorage.setItem('userLocation', JSON.stringify(locationData));

        localStorage.setItem('locationPermission', JSON.stringify({
          isGranted: true,
          timestamp: Date.now()
        }));

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