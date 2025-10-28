'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, MapPin, Users, Sparkles, Calendar, Menu, X, Heart, Search, Bell } from 'lucide-react';
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
    <div className="min-h-screen bg-white relative overflow-x-hidden">
      {/* 背景装飾 - 祭り・マルシェをイメージした装飾パターン */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40">
        {/* グリッドパターン */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, #fef3e8 1px, transparent 1px),
            linear-gradient(to bottom, #fef3e8 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }} />
        
        {/* 装飾的な円形 - 祭りの提灯やマルシェのテントをイメージ */}
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-gradient-to-br from-orange-200/30 to-yellow-200/30 blur-2xl" />
        <div className="absolute top-40 right-20 w-48 h-48 rounded-full bg-gradient-to-br from-red-200/30 to-pink-200/30 blur-2xl" />
        <div className="absolute bottom-40 left-1/4 w-40 h-40 rounded-full bg-gradient-to-br from-blue-200/30 to-purple-200/30 blur-2xl" />
        <div className="absolute bottom-20 right-1/3 w-36 h-36 rounded-full bg-gradient-to-br from-green-200/30 to-teal-200/30 blur-2xl" />
        
        {/* 祭りの旗をイメージした三角形パターン */}
        <div className="absolute top-0 left-0 right-0 h-16 flex justify-around items-start">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 0.6 }}
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
                className="h-10 w-10 sm:h-12 sm:w-12 drop-shadow-md"
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
                  </nav>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ヒーローセクション */}
        <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-8 overflow-hidden">
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
                  className="text-base sm:text-lg text-[#73370c] font-bold tracking-wider"
                >
                  いつもの街に、新しい発見を
                </motion.p>

                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-4xl sm:text-6xl lg:text-8xl font-extrabold leading-tight tracking-tight"
                >
                  週末を、もっと
                  <br />
                  <span className="text-[#73370c] relative inline-block">
                    ワクワクに
                    <motion.div
                      className="absolute -bottom-2 sm:-bottom-3 left-0 right-0 h-4 sm:h-6 bg-[#fef3e8] -z-10"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.8, delay: 1 }}
                    />
                  </span>
                </motion.h1>

                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="text-xl sm:text-2xl lg:text-3xl text-gray-700 max-w-3xl mx-auto leading-relaxed font-semibold"
                >
                  地域のお祭り、マルシェ、ワークショップ。<br className="hidden sm:block" />
                  近くで今開催中のイベントを、地図で見つけよう。
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
                  className="h-16 sm:h-20 px-12 sm:px-16 text-lg sm:text-2xl font-extrabold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 bg-[#73370c] hover:bg-[#5c2a0a]"
                >
                  イベントを探す
                  <ArrowRight className="ml-3 h-6 w-6 sm:h-7 sm:w-7" strokeWidth={3} />
                </Button>
                <p className="text-base sm:text-lg text-gray-600 mt-4 font-bold">
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
                  className="flex flex-col items-center text-gray-400 text-sm font-semibold"
                >
                  <span className="mb-2">Scroll</span>
                  <div className="w-px h-12 bg-gradient-to-b from-gray-400 to-transparent" />
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* 課題提起セクション */}
        <section className="py-16 sm:py-24 px-4 sm:px-8 bg-gradient-to-b from-gray-50 to-white relative">
          <div className="container mx-auto max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-12 sm:mb-16"
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 px-4">
                こんな経験、<br className="sm:hidden" />ありませんか？
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {[
                {
                  icon: Calendar,
                  iconBg: "bg-gradient-to-br from-blue-100 to-blue-200",
                  iconColor: "text-blue-600",
                  title: "週末の予定が",
                  subtitle: "いつも同じ"
                },
                {
                  icon: Search,
                  iconBg: "bg-gradient-to-br from-orange-100 to-orange-200",
                  iconColor: "text-orange-600",
                  title: "近所のイベント情報を",
                  subtitle: "見逃してしまう"
                },
                {
                  icon: MapPin,
                  iconBg: "bg-gradient-to-br from-purple-100 to-purple-200",
                  iconColor: "text-purple-600",
                  title: "イベント情報が",
                  subtitle: "バラバラで探しづらい"
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white p-8 sm:p-10 rounded-3xl text-center shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100"
                >
                  <div className="flex justify-center mb-6 sm:mb-8">
                    <div className={`${item.iconBg} w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center shadow-lg`}>
                      <item.icon className={`h-10 w-10 sm:h-12 sm:w-12 ${item.iconColor}`} strokeWidth={2.5} />
                    </div>
                  </div>
                  <p className="text-lg sm:text-xl md:text-2xl text-gray-800 font-bold leading-relaxed">
                    {item.title}
                    <br />
                    {item.subtitle}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 解決策提示 */}
        <section className="py-16 sm:py-24 px-4 sm:px-8 bg-white">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-12 sm:mb-20"
            >
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold mb-6">
                <img 
                  src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png" 
                  alt="トクドク" 
                  className="inline-block h-12 w-12 sm:h-16 sm:w-16 mr-3 mb-2"
                />
                が、<br className="sm:hidden" />その悩みを解決します
              </h2>
              <p className="text-xl sm:text-2xl text-gray-600 mt-6 font-bold">
                地図でかんたん、イベント探し
              </p>
            </motion.div>

            <div className="space-y-16 sm:space-y-24">
              {[
                {
                  step: "01",
                  icon: Search,
                  title: "地図で探す",
                  description: "現在地周辺のイベントが地図上に表示されます。タップで詳細を確認。",
                  color: "bg-gradient-to-br from-blue-50 to-blue-100"
                },
                {
                  step: "02",
                  icon: MapPin,
                  title: "気になるイベントを発見",
                  description: "開催日時、場所、内容を一目で確認。気になるイベントをチェック。",
                  color: "bg-gradient-to-br from-green-50 to-green-100"
                },
                {
                  step: "03",
                  icon: Heart,
                  title: "週末を楽しむ",
                  description: "新しい出会い、発見、体験。いつもの街が特別な場所に。",
                  color: "bg-gradient-to-br from-pink-50 to-pink-100"
                }
              ].map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                  className={`flex flex-col ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-8 sm:gap-12`}
                >
                  <div className="flex-1 text-center md:text-left">
                    <div className="inline-block px-5 py-2 bg-[#fef3e8] text-[#73370c] rounded-full text-base font-extrabold mb-4 shadow-sm">
                      STEP {item.step}
                    </div>
                    <h3 className="text-3xl sm:text-4xl font-extrabold mb-4 flex items-center justify-center md:justify-start gap-3">
                      <item.icon className="h-9 w-9 sm:h-10 sm:w-10 text-[#73370c]" strokeWidth={2.5} />
                      {item.title}
                    </h3>
                    <p className="text-lg sm:text-xl text-gray-600 leading-relaxed font-semibold">
                      {item.description}
                    </p>
                  </div>
                  
                  <div className={`flex-1 ${item.color} rounded-3xl p-10 sm:p-14 flex items-center justify-center min-h-[320px] shadow-lg border border-gray-200`}>
                    <div className="text-center">
                      <item.icon className="h-28 w-28 sm:h-36 sm:w-36 text-gray-400 mx-auto" strokeWidth={1.5} />
                      <p className="text-sm sm:text-base text-gray-500 mt-6 font-bold">※実際の画面イメージ</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 特徴 */}
        <section className="py-16 sm:py-24 px-4 sm:px-8 bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-12 sm:mb-16"
            >
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold mb-4">
                <img 
                  src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png" 
                  alt="トクドク" 
                  className="inline-block h-12 w-12 sm:h-16 sm:w-16 mr-3 mb-2"
                />
                の特徴
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {[
                {
                  icon: MapPin,
                  title: "地図で見やすい",
                  description: "現在地から近いイベントを地図上で一目で確認"
                },
                {
                  icon: Calendar,
                  title: "リアルタイム更新",
                  description: "今日・明日開催のイベントが常に最新状態"
                },
                {
                  icon: Users,
                  title: "地域とつながる",
                  description: "地域の人と人をつなぐイベント情報が満載"
                },
                {
                  icon: Bell,
                  title: "見逃さない",
                  description: "気になるイベントを通知でお知らせ"
                },
                {
                  icon: Heart,
                  title: "お気に入り登録",
                  description: "気になるイベントを保存して後で確認"
                },
                {
                  icon: Sparkles,
                  title: "完全無料",
                  description: "登録も利用も完全無料で始められます"
                }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.05 }}
                  viewport={{ once: true }}
                  className="bg-white p-8 sm:p-10 rounded-3xl hover:shadow-xl transition-all duration-300 border border-gray-100 text-center flex flex-col items-center"
                >
                  <div className="bg-[#fef3e8] w-16 h-16 sm:w-18 sm:h-18 rounded-2xl flex items-center justify-center mb-5 shadow-md">
                    <feature.icon className="h-8 w-8 sm:h-9 sm:w-9 text-[#73370c]" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-base sm:text-lg text-gray-600 font-semibold">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* メッセージセクション */}
        <section className="py-20 sm:py-32 px-4 sm:px-8 bg-gradient-to-br from-[#fef3e8] via-[#fff5eb] to-[#fef3e8] relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#73370c] rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#73370c] rounded-full blur-3xl" />
          </div>
          
          <div className="container mx-auto max-w-4xl relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center space-y-8"
            >
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
                いつもの街が、<br className="sm:hidden" />
                もっと好きになる
              </h2>
              <p className="text-xl sm:text-2xl lg:text-3xl text-gray-800 leading-relaxed max-w-3xl mx-auto font-bold">
                <img 
                  src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png" 
                  alt="トクドク" 
                  className="inline-block h-10 w-10 sm:h-12 sm:w-12 mr-2 mb-1"
                />
                は、地域のイベントを通じて、<br className="hidden sm:block" />
                人と人、人と街をつなぐプラットフォームです。<br />
                <br />
                あなたの週末が、もっとワクワクする場所へ。
              </p>
            </motion.div>
          </div>
        </section>

        {/* 最終CTA */}
        <section className="py-16 sm:py-24 px-4 sm:px-8 bg-white">
          <div className="container mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
                さあ、新しい週末を<br className="sm:hidden" />始めよう
              </h2>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  size="lg"
                  onClick={onStart}
                  className="h-18 sm:h-24 px-14 sm:px-20 text-xl sm:text-3xl font-extrabold rounded-full shadow-2xl hover:shadow-3xl transform transition-all duration-300 bg-[#73370c] hover:bg-[#5c2a0a]"
                >
                  無料で始める
                  <ArrowRight className="ml-4 h-7 w-7 sm:h-9 sm:w-9" strokeWidth={3} />
                </Button>
              </motion.div>

              <p className="text-base sm:text-lg text-gray-600 font-bold">
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
                <p className="text-base text-gray-600 leading-relaxed font-semibold">
                  地域のイベントを通じて、<br />
                  人と人、人と街をつなぐプラットフォーム
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-extrabold mb-3 text-[#73370c] text-base">サービス</h4>
                  <ul className="space-y-2">
                    <li>
                      <Link href="/profile" className="text-gray-600 hover:text-[#73370c] transition-colors font-semibold">
                        マイページ
                      </Link>
                    </li>
                    <li>
                      <Link href="/contact" className="text-gray-600 hover:text-[#73370c] transition-colors font-semibold">
                        問い合わせ
                      </Link>
                    </li>
                    <li>
                      <Link href="/release-notes" className="text-gray-600 hover:text-[#73370c] transition-colors font-semibold">
                        リリースノート
                      </Link>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-extrabold mb-3 text-[#73370c] text-base">規約</h4>
                  <ul className="space-y-2">
                    <li>
                      <Link href="/terms/terms-of-service" className="text-gray-600 hover:text-[#73370c] transition-colors font-semibold">
                        利用規約
                      </Link>
                    </li>
                    <li>
                      <Link href="/terms/privacy-policy" className="text-gray-600 hover:text-[#73370c] transition-colors font-semibold">
                        プライバシーポリシー
                      </Link>
                    </li>
                    <li>
                      <Link href="/terms/service-policy" className="text-gray-600 hover:text-[#73370c] transition-colors font-semibold">
                        サービスポリシー
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="pt-8 border-t text-center">
              <p className="text-sm text-gray-500 font-semibold">
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
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-[#73370c] mt-0.5 flex-shrink-0" strokeWidth={2.5} />
              <div className="text-sm text-gray-700">
                <p className="font-bold mb-1">現在地周辺のイベントを表示</p>
                <p className="text-gray-600 font-semibold">あなたの位置情報を使って、近くで開催中のイベントを地図上に表示します。</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-[#73370c] mt-0.5 flex-shrink-0" strokeWidth={2.5} />
              <div className="text-sm text-gray-700">
                <p className="font-bold mb-1">プライバシーを保護</p>
                <p className="text-gray-600 font-semibold">位置情報はイベント検索のみに使用し、外部に共有されることはありません。</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleAllowLocation}
              className="w-full bg-[#73370c] hover:bg-[#5c2a0a] text-white font-bold text-base"
            >
              <MapPin className="mr-2 h-5 w-5" strokeWidth={2.5} />
              位置情報を許可してイベントを探す
            </Button>
            
            <Button
              onClick={handleDenyLocation}
              variant="outline"
              className="w-full font-bold"
            >
              今はスキップ
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 text-center font-semibold">
            ※ブラウザの設定で位置情報の許可をONにしてください
          </p>
        </div>
      </CustomModal>
    </main>
  );
}