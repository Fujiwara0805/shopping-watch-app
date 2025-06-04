"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, MapPin, Bell, Users, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common/logo';

const onboardingSlides = [
  {
    title: "お気に入りの店舗を登録",
    description: "よく行くスーパーや近所のお店を登録できます。お気に入りに追加すると、お得な情報をいち早くゲットできます。",
    icon: <MapPin className="w-16 h-16 sm:w-20 sm:h-20 text-primary" />,
    color: "bg-primary/10"
  },
  {
    title: "お得な情報をシェア",
    description: "あなたが見つけたお得な商品をみんなと共有しましょう。写真、価格、お店の情報を簡単に投稿できます。",
    icon: <Tag className="w-16 h-16 sm:w-20 sm:h-20 text-[#FFEB3B]" />,
    color: "bg-[#FFEB3B]/10"
  },
  {
    title: "タイムラインで確認",
    description: "他のユーザーが投稿した近所のお得な情報をタイムラインでチェック。カテゴリやお店で絞り込みも可能です。",
    icon: <Users className="w-16 h-16 sm:w-20 sm:h-20 text-[#E53935]" />,
    color: "bg-[#E53935]/10"
  },
  {
    title: "通知でお知らせ",
    description: "お気に入り店舗のお得な情報が投稿されると、すぐに通知でお知らせします。",
    icon: <Bell className="w-16 h-16 sm:w-20 sm:h-20 text-[#009688]" />,
    color: "bg-[#009688]/10"
  }
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
      // マップページに遷移するよう変更
      localStorage.setItem('hasSeenOnboarding', 'true');
      router.push('/map');
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const skipOnboarding = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    router.push('/map');
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
      className="min-h-screen flex flex-col bg-background"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <header className="p-4 pt-[calc(var(--sat)+0.5rem)] flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="rounded-full  p-2 ">
            <img src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png" alt="App Icon" className="h-12 w-12 object-contain" />
          </div>
          {/* <span className="font-bold text-xl tracking-wider">トクドク</span> */}
        </div>
        <Button 
          variant="ghost" 
          onClick={skipOnboarding}
          className="text-muted-foreground text-lg"
        >
          スキップ
        </Button>
      </header>
      
      <AnimatePresence mode="wait">
        <motion.div 
          key={currentSlide}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-8"
        >
          <div className={`${onboardingSlides[currentSlide].color} p-5 sm:p-6 rounded-full mb-6 sm:mb-8`}>
            {onboardingSlides[currentSlide].icon}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-center">
            {onboardingSlides[currentSlide].title}
          </h2>
          <p className="text-base sm:text-lg text-center text-muted-foreground mb-6 sm:mb-8 max-w-xs sm:max-w-sm">
            {onboardingSlides[currentSlide].description}
          </p>
        </motion.div>
      </AnimatePresence>
      
      <div className="px-4 sm:px-6 py-6 sm:py-8 pb-[calc(var(--sab)+1.5rem)]">
        <div className="flex justify-center space-x-2 mb-6 sm:mb-8">
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
            {currentSlide === onboardingSlides.length - 1 ? '地図を表示' : '次へ'}
            <ChevronRight className="ml-1 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}