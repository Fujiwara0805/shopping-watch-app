'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ShoppingCart, MapPin, Bell, Users, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  
  useEffect(() => {
    // SafeAreaのための変数設定
    document.documentElement.style.setProperty(
      '--sat', `env(safe-area-inset-top, 0px)`
    );
    document.documentElement.style.setProperty(
      '--sab', `env(safe-area-inset-bottom, 0px)`
    );
    
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding') === 'true';
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    if (hasSeenOnboarding) {
      if (isLoggedIn) {
        router.push('/map');
      }
    } else {
      router.push('/onboarding');
    }
    
    // スクロール位置の監視
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [router]);

  // モバイルメニューを開いた時にスクロールを無効化
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // onboardingへ遷移する関数
  const goToOnboarding = () => {
    // onboardingフラグをリセット
    localStorage.removeItem('hasSeenOnboarding');
    router.push('/onboarding');
  };

  return (
    <main className="min-h-screen bg-background relative overflow-x-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10 pointer-events-none"
        style={{
          backgroundImage: `url('https://images.pexels.com/photos/3962294/pexels-photo-3962294.jpeg')`
        }}
      />
      <div className="relative">
        <nav 
          className={`fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b transition-all duration-300 pt-[var(--sat)] ${
            scrollPosition > 10 ? 'shadow-sm' : ''
          }`}
        >
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="rounded-full  p-2 ">
                <img src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png" alt="App Icon" className="h-12 w-12 object-contain" />
              </div>
              {/* <span className="font-bold text-xl tracking-wider">トクドク</span> */}
            </div>
            
            {/* デスクトップ用ナビゲーション */}
            <div className="hidden md:flex items-center space-x-4">
              <Button variant="ghost" asChild className="h-10 px-4 rounded-full">
                <Link href="/login">ログイン</Link>
              </Button>
              <Button asChild className="h-10 px-4 rounded-full">
                <Link href="/register">新規登録</Link>
              </Button>
            </div>
            
            {/* モバイル用メニューボタン */}
            <div className="flex md:hidden items-center space-x-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="rounded-full"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </nav>
        
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
                  無料で始める
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
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 md:mb-6">
                近所のスーパーの
                <span className="text-primary block sm:inline">美味しいお惣菜</span>
                <br className="hidden sm:block md:hidden" />
                をリアルタイムで
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto px-2">
                今日のお惣菜は何かな？値引き情報もすぐにお知らせ。
                みんなで共有して、楽しくお買い物しましょう♪
              </p>
              <Button 
                size="lg" 
                onClick={goToOnboarding}
                className="animate-pulse h-12 md:h-14 rounded-full text-base"
              >
                無料で始める
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </section>

        <section className="py-12 md:py-16 px-4 bg-muted/50">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 md:mb-12">主な機能</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
              {[
                {
                  icon: MapPin,
                  title: "お気に入りのお店",
                  description: "近所のスーパーを簡単に登録。新作お惣菜や値引き情報をいち早くお知らせ♪",
                  color: "bg-primary/10",
                  textColor: "text-primary"
                },
                {
                  icon: Users,
                  title: "みんなで共有",
                  description: "見つけた美味しいお惣菜を投稿。写真、感想、お店の情報を楽しくシェア♪",
                  color: "bg-secondary/10",
                  textColor: "text-secondary"
                },
                {
                  icon: Bell,
                  title: "通知機能",
                  description: "お気に入り店舗の新商品や値引き情報が投稿されると、すぐにお知らせ♪",
                  color: "bg-accent/10",
                  textColor: "text-accent"
                },
                {
                  icon: ShoppingCart,
                  title: "タイムライン",
                  description: "みんなのお惣菜情報をタイムラインでチェック。カテゴリやお店で簡単検索♪",
                  color: "bg-destructive/10",
                  textColor: "text-destructive"
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
                    <feature.icon className={`h-6 w-6 ${feature.textColor}`} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm md:text-base text-muted-foreground">{feature.description}</p>
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
                さぁ、美味しいお惣菜を探しに行きましょう！
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto px-2">
                無料で簡単に登録できます。毎日のお買い物がもっと楽しくなりますよ♪
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  onClick={goToOnboarding}
                  className="h-12 md:h-14 rounded-full"
                >
                  無料で始める
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" asChild className="h-12 md:h-14 rounded-full">
                  <Link href="/login">ログイン</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        <footer className="py-8 px-4 border-t pb-[calc(var(--sab)+2rem)]">
          <div className="container mx-auto max-w-6xl text-center text-sm text-muted-foreground">
            <p>© 2025 トクドク All rights reserved.</p>
          </div>
        </footer>
      </div>
    </main>
  );
}