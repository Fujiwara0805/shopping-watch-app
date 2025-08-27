'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ArrowRight, ShoppingCart, MapPin, Bell, Users, Menu, X, Leaf, ChevronDown, Circle, ListTodo, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';

// スプラッシュ画面コンポーネント
const SplashScreen = () => (
  <motion.div 
    className="fixed inset-0 z-50 bg-background flex items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.5 }}
  >
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        duration: 0.8, 
        ease: "easeOut",
        delay: 0.2 
      }}
      className="flex flex-col items-center"
    >
      <motion.img 
        src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png" 
        alt="トクドク" 
        className="h-32 w-32 drop-shadow-lg"
        animate={{ 
          rotate: [0, 5, -5, 0],
          scale: [1, 1.05, 1]
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut"
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="mt-8"
      >
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-primary rounded-full"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  </motion.div>
);

// タブ切り替えのコンポーネント
// const LPTabs = ({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) => (
//   <div className="flex items-center justify-center mt-4">
//     <div className="bg-background/80 backdrop-blur-sm border rounded-full p-1">
//       <button
//         onClick={() => setActiveTab('normal')}
//         className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
//           activeTab === 'normal' 
//             ? 'bg-primary text-primary-foreground shadow-sm' 
//             : 'text-muted-foreground hover:text-foreground'
//         }`}
//       >
//         通常版
//       </button>
//       <button
//         onClick={() => setActiveTab('swipe')}
//         className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
//           activeTab === 'swipe' 
//             ? 'bg-primary text-primary-foreground shadow-sm' 
//             : 'text-muted-foreground hover:text-foreground'
//         }`}
//       >
//         スワイプ版
//       </button>
//     </div>
//   </div>
// );

// スワイプインジケーターコンポーネント

const SwipeIndicator = ({ currentSection, totalSections, onSectionClick }: { currentSection: number; totalSections: number; onSectionClick: (index: number) => void }) => (
  <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50 flex flex-col space-y-3">
    {Array.from({ length: totalSections }).map((_, index) => (
      <button
        key={index}
        onClick={() => onSectionClick(index)}
        className={`w-3 h-3 rounded-full transition-all duration-300 ${
          index === currentSection 
            ? 'bg-primary scale-125' 
            : 'bg-white/50 hover:bg-white/70'
        }`}
      />
    ))}
  </div>
);

// 通常版LP（スクロール修正版）
const NormalLP = ({ goToOnboarding, mobileMenuOpen, setMobileMenuOpen, scrollPosition }: { goToOnboarding: () => void; mobileMenuOpen: boolean; setMobileMenuOpen: (open: boolean) => void; scrollPosition: number }) => {
  
  // 通常版LP専用のbody overflow制御
  useEffect(() => {
    // 通常版LPではbodyのoverflowを強制的にautoに設定
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'auto';
    
    return () => {
      // クリーンアップ時に元に戻す
      document.body.style.overflow = originalOverflow || '';
    };
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10 pointer-events-none"
        style={{
          backgroundImage: `url('https://images.pexels.com/photos/3962294/pexels-photo-3962294.jpeg')`
        }}
      />
      <div className="relative">
        {/* モバイルメニュー */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-background/95 backdrop-blur-md pt-[calc(var(--sat)+4rem)]"
            >
              <div className="absolute top-4 right-4 mt-[var(--sat)]">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-full"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <div className="flex flex-col items-center justify-center h-full space-y-6 -mt-16">
                <Button variant="ghost" size="lg" asChild className="w-48 h-14 text-lg rounded-full">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    ログイン
                  </Link>
                </Button>
                <Button 
                  size="lg" 
                  className="w-48 h-14 text-lg rounded-full"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    goToOnboarding();
                  }}
                >
                  さっそく始める！
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <section className="pt-36 md:pt-32 pb-12 md:pb-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold mb-4 md:mb-6">
                毎日をもっと賢く、<br />もっと楽しく。<br />
                <span className="text-primary block sm:inline">
                  あなたの街のおとく情報を、<br />みんなでシェアして、<br />おトクな毎日を送ろう！！！
                </span>
              </h1>
              <p className="text-xl sm:text-2xl text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto px-2">
              今日はどこのお店がお得かな？<br /> {/* ここに改行を追加 */}
                トクドクは、お<span className="text-primary">トク</span>な情報が<span className="sm:hidden" />あなたにと<span className="text-primary">ドク</span>サービスです。 {/* sm:hiddenを調整 */}
              </p>
              <Button 
                size="lg" 
                onClick={goToOnboarding}
                className="animate-pulse h-12 md:h-14 rounded-full text-base"
              >
                さっそく始める！
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </section>

        <section className="py-12 md:py-16 px-4 bg-muted/50">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 md:mb-12">
              毎日がちょっと特別になる、<br className="sm:hidden" />トクドクの便利な機能
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 md:gap-8">
              {[
                {
                  icon: ListTodo,
                  title: "買い忘れ、\n買い過ぎを防ぐ",
                  description: "シンプルで使いやすい買い物メモ\n家族や友達とも共有できるよ！",
                  color: "bg-primary/10",
                  textColor: "text-primary"
                },
                {
                  icon: Newspaper,
                  title: "「欲しい」が\n見つかる",
                  description: "地域のコミュニティ掲示板から、\nあなただけのおとくを見つけよう！",
                  color: "bg-destructive/10",
                  textColor: "text-destructive"
                },
                {
                  icon: Users,
                  title: "みんなで\nおとくをシェア",
                  description: "見つけたおとくな情報を、\n感動を分かち合おう！", // 改行を調整
                  color: "bg-secondary/10",
                  textColor: "text-secondary"
                },
                {
                  icon: Bell,
                  title: "「見逃さない」\nおとく情報",
                  description: "お気に入りのお店のおトクな情報が投稿されると、すぐに通知がとドク！", // 改行を削除
                  color: "bg-accent/10",
                  textColor: "text-accent"
                },
                {
                  icon: Leaf,
                  title: "目の届く人から\n幸せを広げたい",
                  description: "情報を必要とする人に、\n必要な情報が届く社会を作る。",
                  color: "bg-green-500/10",
                  textColor: "text-green-500"
                }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex flex-col items-center text-center p-5 md:p-6 rounded-2xl bg-background border shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className={`${feature.color} p-3 rounded-full mb-3 md:mb-4`}>
                    <feature.icon className={`h-8 w-8 ${feature.textColor}`} />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">
                    {feature.title.split('\n').map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < feature.title.split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </h3>
                  <p className="text-lg md:text-xl text-muted-foreground">
                    {feature.description.split('\n').map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < feature.description.split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16 px-4">
          <div className="container mx-auto max-w-6xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 md:mb-6">
                あなたも「トクドク」で<br className="sm:hidden" />おとくな情報を入手しよう！
              </h2>
              <p className="text-xl sm:text-2xl text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto px-2">
                毎日のお買い物を、<br className="sm:hidden" />もっと賢く、もっと楽しく。<br />
                登録・サービス利用料金無料！！！
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={goToOnboarding}
                  className="h-12 md:h-14 rounded-full"
                >
                  さっそく始める！
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="h-12 md:h-14 rounded-full"
                >
                  <Link href="/login">ログイン</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        <footer className="py-8 px-4 border-t pb-[calc(var(--sab)+2rem)]">
          <div className="container mx-auto max-w-6xl text-center text-sm text-muted-foreground">
            <p className="mb-2">© 2025 トクドク All rights reserved.</p>
            <div className="flex justify-center space-x-4 text-xs md:text-sm">
              <Link href="/terms/privacy-policy" className="hover:underline">プライバシーポリシー</Link>
              <Link href="/terms/service-policy" className="hover:underline">サービスポリシー</Link>
              <Link href="/terms/terms-of-service" className="hover:underline">利用規約</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

// スワイプ版LP（修正版）
const SwipeLP = ({ goToOnboarding, mobileMenuOpen, setMobileMenuOpen }: { goToOnboarding: () => void; mobileMenuOpen: boolean; setMobileMenuOpen: (open: boolean) => void }) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [sectionHeight, setSectionHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // スワイプ版LP専用のbody overflow制御
  useEffect(() => {
    // スワイプ版ではbodyのoverflowを隠す
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      // クリーンアップ時に元に戻す
      document.body.style.overflow = originalOverflow || '';
    };
  }, []);
  
  const features = [
    {
      icon: ListTodo,
      title: "買い忘れ、買い過ぎを防ぐ",
      description: "シンプルで使いやすい買い物メモ\n家族や友達とも共有できるよ！",
      color: "bg-primary/10",
      textColor: "text-primary",
      bgGradient: "from-primary/5 to-primary/20"
    },
    {
      icon: Newspaper,
      title: "「欲しい」が見つかる",
      description: "地域のコミュニティ掲示板から、\nあなただけのおとくを見つけよう！",
      color: "bg-destructive/10",
      textColor: "text-destructive",
      bgGradient: "from-destructive/5 to-destructive/20"
    },
    {
      icon: Users,
      title: "みんなでおとくをシェア",
      description: "見つけたおとくな情報を簡単に投稿。\n感動を分かち合おう！",
      color: "bg-secondary/10",
      textColor: "text-secondary",
      bgGradient: "from-secondary/5 to-secondary/20"
    },
    {
      icon: Bell,
      title: "「見逃さない」おとく情報",
      description: "お気に入りのお店のおトクな情報が投稿されると、すぐに通知がとドク！",
      color: "bg-accent/10",
      textColor: "text-accent",
      bgGradient: "from-accent/5 to-accent/20"
    },
    {
      icon: Leaf,
      title: "目の届く人から\n幸せを広げたい",
      description: "情報を必要とする人に、\n必要な情報が届く社会を作る。",
      color: "bg-green-500/10",
      textColor: "text-green-500",
      bgGradient: "from-green-500/5 to-green-500/20"
    }
  ];

  const totalSections = 1 + features.length + 1; // ヒーロー(1) + 機能(5) + CTA(1) = 7

  // 実際の画面高さを取得・更新する関数
  const updateSectionHeight = useCallback(() => {
    const vh = window.innerHeight;
    const dvh = document.documentElement.clientHeight;
    const visualViewport = window.visualViewport?.height || vh;
    
    const actualHeight = Math.min(vh, dvh, visualViewport);
    setSectionHeight(actualHeight);
    document.documentElement.style.setProperty('--actual-vh', `${actualHeight}px`);
  }, []);

  // 初期化とリサイズ監視
  useEffect(() => {
    updateSectionHeight();
    
    const handleResize = () => updateSectionHeight();
    const handleOrientationChange = () => setTimeout(updateSectionHeight, 100);
    const handleVisualViewportChange = () => updateSectionHeight();

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
      }
    };
  }, [updateSectionHeight]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    setIsDragging(false);
    const threshold = 50;
    
    if (info.offset.y < -threshold) {
      setCurrentSection(prev => Math.min(prev + 1, totalSections - 1));
    } else if (info.offset.y > threshold) {
      setCurrentSection(prev => Math.max(prev - 1, 0));
    }
  };

  const jumpToSection = (sectionIndex: number) => {
    setCurrentSection(sectionIndex);
  };

  // セクション1: ヒーロー
  const HeroSection = () => (
    <motion.section
      className="flex items-center justify-center px-4 bg-gradient-to-br from-background via-primary/5 to-secondary/10 relative overflow-hidden"
      style={{ height: sectionHeight || '100vh' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-5"
        style={{
          backgroundImage: `url('https://images.pexels.com/photos/3962294/pexels-photo-3962294.jpeg')`
        }}
      />
      <div className="relative text-center max-w-4xl mx-auto">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mb-8"
        >
          <img 
            src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png" 
            alt="トクドク" 
            className="h-32 w-32 mx-auto mb-6 drop-shadow-lg"
          />
        </motion.div>
        
        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-4xl md:text-7xl font-bold mb-6 leading-tight"
        >
          毎日をもっと賢く、<br />
          <span className="text-primary">もっと楽しく。</span>
        </motion.h1>
        
        <motion.p
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="text-xl md:text-3xl text-muted-foreground mb-12 leading-relaxed"
        >
          あなたの街のおとく情報を、<br />
          みんなでシェアして、<br />
          おトクな毎日を送ろう！
        </motion.p>
        
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
        >
          <Button 
            size="lg" 
            onClick={goToOnboarding}
            className="h-16 px-8 text-lg rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
          >
            さっそく始める！
            <ArrowRight className="ml-3 h-6 w-6" />
          </Button>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.5 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <div className="flex flex-col items-center text-muted-foreground">
            <span className="text-sm mb-2">スワイプして続きを見る</span>
            <ChevronDown className="h-6 w-6 animate-bounce" />
          </div>
        </motion.div>
      </div>
    </motion.section>
  );

  // セクション2: 機能紹介
  const FeatureSection = ({ feature, index }: { feature: any; index: number }) => (
    <motion.section
      className={`flex items-center justify-center px-4 bg-gradient-to-br ${feature.bgGradient} relative overflow-hidden`}
      style={{ height: sectionHeight || '100vh' }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="text-center max-w-4xl mx-auto">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className={`${feature.color} p-8 rounded-full mb-8 mx-auto w-fit shadow-2xl`}
        >
          <feature.icon className={`h-20 w-20 ${feature.textColor}`} />
        </motion.div>
        
        <motion.h2
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-3xl md:text-5xl font-bold mb-8"
        >
          {/* タイトルも改行できるように修正 */}
          {feature.title.split('\n').map((line: string, i: number) => (
            <span key={i}>
              {line}
              {i < feature.title.split('\n').length - 1 && <br />}
            </span>
          ))}
        </motion.h2>
        
        <motion.p
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-xl md:text-2xl text-muted-foreground leading-relaxed"
        >
          {feature.description.split('\n').map((line: string, i: number) => (
            <span key={i}>
              {line}
              {i < feature.description.split('\n').length - 1 && <br />}
            </span>
          ))}
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-sm text-muted-foreground"
        >
          {index + 2} / {totalSections}
        </motion.div>
      </div>
    </motion.section>
  );

  // セクション3: CTA
  const CTASection = () => (
    <motion.section
      className="flex items-center justify-center px-4 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 relative overflow-hidden"
      style={{ height: sectionHeight || '100vh' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <div className="text-center max-w-4xl mx-auto">
        <motion.h2
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6"
        >
          あなたも「トクドク」で<br />
          おとくな情報を入手しよう！
        </motion.h2>
        
        <motion.p
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg sm:text-xl md:text-xl text-muted-foreground mb-8 leading-relaxed"
        >
          毎日のお買い物を、<br />もっと賢く、もっと楽しく。<br />
          <span className="text-primary font-semibold">登録・サービス利用料金無料！！！</span>
        </motion.p>
        
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="space-y-4 flex flex-col items-center"
        >
          <Button
            size="lg"
            onClick={goToOnboarding}
            className="h-16 px-8 text-lg rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
          >
            さっそく始める！
            <ArrowRight className="ml-3 h-6 w-6" />
          </Button>
          
          <Button
            size="lg"
            variant="outline"
            asChild
            className="h-16 px-8 text-lg rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 "
          >
            <Link href="/login">ログイン</Link>
          </Button>
        </motion.div>
      </div>
    </motion.section>
  );

  return (
    <div 
      ref={containerRef}
      className="overflow-hidden relative"
      style={{ height: sectionHeight || '100vh' }}
    >
      {/* モバイルメニュー */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-background/95 backdrop-blur-md pt-[calc(var(--sat)+4rem)]"
          >
            <div className="absolute top-4 right-4 mt-[var(--sat)]">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-full"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="flex flex-col items-center justify-center h-full space-y-6 -mt-16">
              <Button variant="ghost" size="lg" asChild className="w-48 h-14 text-lg rounded-full">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  ログイン
                </Link>
              </Button>
              <Button 
                size="lg" 
                className="w-48 h-14 text-lg rounded-full"
                onClick={() => {
                  setMobileMenuOpen(false);
                  goToOnboarding();
                }}
              >
                さっそく始める！
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        animate={{ y: sectionHeight ? -currentSection * sectionHeight : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="will-change-transform"
      >
        <HeroSection />
        {features.map((feature, index) => (
          <FeatureSection key={feature.title} feature={feature} index={index} />
        ))}
        <CTASection />
      </motion.div>
      
      <SwipeIndicator 
        currentSection={currentSection} 
        totalSections={totalSections}
        onSectionClick={jumpToSection}
      />
    </div>
  );
};

// メインコンポーネント
export default function Home() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [activeTab, setActiveTab] = useState('normal');
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  
  useEffect(() => {
    // SafeAreaのための変数設定
    document.documentElement.style.setProperty(
      '--sat', `env(safe-area-inset-top, 0px)`
    );
    document.documentElement.style.setProperty(
      '--sab', `env(safe-area-inset-bottom, 0px)`
    );
    
    // 画面サイズ判定
    const checkMobile = () => {
      const isMobile = window.innerWidth < 768;
      setIsMobileScreen(isMobile);
      
      // モバイルの場合はスプラッシュ画面を表示
      if (isMobile) {
        setShowSplash(true);
        // 2秒後にオンボーディング画面に遷移
        setTimeout(() => {
          localStorage.removeItem('hasSeenOnboarding');
          router.push('/onboarding');
        }, 2000);
      }
    };
    
    checkMobile(); // 初期チェック
    window.addEventListener('resize', checkMobile); // リサイズ時に更新
    
    // スクロール位置の監視（NormalLPの場合のみ）
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };
    
    // PCの場合のみスクロールイベントリスナーを設定
    if (!isMobileScreen) {
      window.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [router, isMobileScreen]);

  // モバイルメニューを開いた時にスクロールを無効化
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // onboardingへ遷移する関数
  const goToOnboarding = () => {
    if (isMobileScreen) {
      localStorage.removeItem('hasSeenOnboarding');
      router.push('/onboarding');
    } else {
      router.push('/timeline');
    }
  };

  // モバイルでスプラッシュ画面を表示中の場合
  if (isMobileScreen && showSplash) {
    return (
      <AnimatePresence>
        <SplashScreen />
      </AnimatePresence>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* ヘッダー - PCのみ表示 */}
      {!isMobileScreen && (
        <nav 
          className={`fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b transition-all duration-300 pt-[var(--sat)] ${
            scrollPosition > 10 ? 'shadow-sm' : ''
          }`}
        >
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="rounded-full p-2">
                <img src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png" alt="App Icon" className="h-12 w-12 object-contain" />
              </div>
            </div>

            {/* デスクトップ用ナビゲーション */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" asChild className="h-10 px-4 rounded-full">
                <Link href="/login">ログイン</Link>
              </Button>
              <Button asChild className="h-10 px-4 rounded-full">
                <Link href="/register">新規登録</Link>
              </Button>
            </div>
          </div>
        </nav>
      )}

      {/* コンテンツ - PCの場合のみNormalLPを表示 */}
      {!isMobileScreen && (
        <NormalLP 
          goToOnboarding={goToOnboarding}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          scrollPosition={scrollPosition}
        />
      )}
    </main>
  );
}