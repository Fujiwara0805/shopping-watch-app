"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, MapPin, Bell, Users, Tag, Smartphone, ShoppingCart, MessageSquare, Share, Plus, StickyNote, MoreVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common/logo';

const onboardingSlides = [
  {
    title: "アプリ登録をしよう！",
    description: (
      <span>
        共有ボタン(
        <Share className="inline w-5 h-5 mx-1 text-gray-600" />or
        <MoreVertical className="inline w-5 h-5 mx-1 text-gray-600" />)
        から「ホーム画面に追加」(
        <span className="inline-flex items-center justify-center w-5 h-5 mx-1 bg-gray-600 rounded-sm">
          <Plus className="w-3 h-3 text-white" />
        </span>)
        を選択して、アプリを登録しよう
      </span>
    ),
    icon: <Smartphone className="w-16 h-16 sm:w-20 sm:h-20 text-[#FF9800]" />,
    color: "bg-[#FF9800]/10"
  },
  {
    title: "買い物メモを使ってみよう！",
    description: (
      <span>
        シンプルで使いやすい買い物メモです。<br />
        「よく買うもの」を登録でき、家族や友達とグループを作成して、メモを共有しよう
      </span>
    ),
    icon: <StickyNote className="w-16 h-16 sm:w-20 sm:h-20 text-[#4CAF50]" />,
    color: "bg-[#4CAF50]/10"
  },
  {
    title: "掲示板に投稿してみよう！",
    description: (
      <span>
        現在地から5km圏内の投稿に限定して表示される掲示板です。
        身近なおとく情報をゲットしてみよう！
      </span>
    ),
    icon: <MessageSquare className="w-16 h-16 sm:w-20 sm:h-20 text-[#9C27B0]" />,
    color: "bg-[#9C27B0]/10"
  },
  {
    title: "通知でお知らせ",
    description: (
      <span>
        マイページにお気に入りのお店を登録しておくと、そのお店の情報が投稿される度に、
        すぐに通知でお知らせします。
      </span>
    ),
    icon: <Bell className="w-16 h-16 sm:w-20 sm:h-20 text-[#009688]" />,
    color: "bg-[#009688]/10"
  },
];

export default function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [startX, setStartX] = useState(0);
  const router = useRouter();

  const nextSlide = () => {
    if (currentSlide < onboardingSlides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      // 掲示板ページに遷移するよう変更
      localStorage.setItem('hasSeenOnboarding', 'true');
      router.push('/timeline');
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  // 🔥 修正：次回以降表示しない処理
  const skipOnboardingPermanently = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    localStorage.setItem('skipOnboardingPermanently', 'true'); // 🔥 追加：永続的にスキップするフラグ
    router.push('/timeline');
  };

  // スワイプ操作のハンドラ
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsSwiping(true);
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = startX - currentX;
    
    // 50px以上のスワイプでスライド変更
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // 右から左へのスワイプ（次へ）
        if (currentSlide < onboardingSlides.length - 1) {
          nextSlide();
        }
      } else {
        // 左から右へのスワイプ（前へ）
        if (currentSlide > 0) {
          prevSlide();
        }
      }
      setIsSwiping(false);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
  };

  return (
    <div 
      className="h-screen overflow-hidden flex flex-col bg-background"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ヘッダー - 固定高さ */}
      <header className="flex-shrink-0 p-4 pt-[calc(var(--sat)+0.5rem)] flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="rounded-full p-2">
            <img src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png" alt="App Icon" className="h-12 w-12 object-contain" />
          </div>
          {/* <span className="font-bold text-xl tracking-wider">トクドク</span> */}
        </div>
        {/* 🔥 修正：スキップボタンを「次回以降表示しない」に変更 */}
        <Button 
          variant="ghost" 
          onClick={skipOnboardingPermanently}
          className="text-muted-foreground text-sm px-2 py-1 h-auto flex items-center space-x-1"
          title="次回以降このオンボーディング画面を表示しません"
        >
          <X className="h-4 w-4" />
          <span className="hidden sm:inline">次回以降表示しない</span>
          <span className="sm:hidden">非表示</span>
        </Button>
      </header>
      
      {/* メインコンテンツ - 残りの領域を使用 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6"
          >
            <div className={`${onboardingSlides[currentSlide].color} p-5 sm:p-6 rounded-full mb-4 sm:mb-6`}>
              {onboardingSlides[currentSlide].icon}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-center">
              {onboardingSlides[currentSlide].title}
            </h2>
            <p className="text-base sm:text-lg text-center text-muted-foreground mb-4 sm:mb-6 max-w-xs sm:max-w-sm">
              {onboardingSlides[currentSlide].description}
            </p>
          </motion.div>
        </AnimatePresence>
        
        {/* ページインジケーター */}
        <div className="flex-shrink-0 flex justify-center space-x-2 mb-4 sm:mb-6">
          {onboardingSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-1 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'w-8 bg-primary' 
                  : 'w-2 bg-muted'
              }`}
              aria-label={`スライド${index + 1}へ移動`}
            />
          ))}
        </div>
        
        {/* ボタン部分 - 固定高さでセーフエリア対応 */}
        <div className="flex-shrink-0 px-4 sm:px-6 pb-[calc(var(--sab)+1rem)]">
          <div className="flex space-x-3 sm:space-x-4">
            <Button 
              variant="outline"
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="flex-1 h-12 rounded-xl"
            >
              <ChevronLeft className="mr-1 h-5 w-5" />
              戻る
            </Button>
            <Button 
              onClick={nextSlide}
              className="flex-1 h-12 rounded-xl bg-primary"
            >
              {currentSlide === onboardingSlides.length - 1 ? '掲示板を表示' : '次へ'}
              <ChevronRight className="ml-1 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}