'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ShoppingCart, MapPin, Bell, Users, Menu, X, Leaf } from 'lucide-react';
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
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 md:mb-6">
                毎日をもっと賢く、<br className="sm:hidden" />もっと楽しく。
                <br className="sm:hidden" />
                <br className="sm:hidden" />
                <span className="text-primary block sm:inline">
                  あなたの街のお得情報を、<br className="sm:hidden" />みんなでシェアして、<br className="sm:hidden" />おトクな毎日を送ろう！！！
                </span>
              </h1>
              <p className="text-xl sm:text-2xl text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto px-2">
              今日は、どこのお店でお得があるかな？
                <br className="sm:hidden" />
                トクドクは、お<span className="text-primary">トク</span>な情報が<br className="sm:hidden" />あなたにと<span className="text-primary">ドク</span>サービスです。
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
              {[
                {
                  icon: MapPin,
                  title: "近所の「おトク」を発見",
                  description: "お気に入りのお店を登録。\nお店のお得な情報をいち早くキャッチ！",
                  color: "bg-primary/10",
                  textColor: "text-primary"
                },
                {
                  icon: Users,
                  title: "みんなで「お得」をシェア",
                  description: "見つけたお得な情報を簡単に投稿。\n感動を分かち合おう！",
                  color: "bg-secondary/10",
                  textColor: "text-secondary"
                },
                {
                  icon: Bell,
                  title: "「見逃さない」お得情報",
                  description: "お気に入り店舗の新商品やお得な情報が\n投稿されると、すぐに通知がとドク！",
                  color: "bg-accent/10",
                  textColor: "text-accent"
                },
                {
                  icon: ShoppingCart,
                  title: "「欲しい」がすぐに見つかる",
                  description: "タイムラインのみんなの投稿から、\nあなただけのおトクを見つけよう！",
                  color: "bg-destructive/10",
                  textColor: "text-destructive"
                },
                {
                  icon: Leaf,
                  title: "フードロス削減に貢献",
                  description: "お得な情報共有が、お店の廃棄削減や、\nあなたのお財布にも優しい選択に。",
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
                  <h3 className="text-2xl font-semibold mb-2">{feature.title}</h3>
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
                あなたも「トクドク」で<br className="sm:hidden" />お得な情報を入手しよう！
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
              <Link href="/security-policy" className="hover:underline">セキュリティポリシー</Link>
              <Link href="/terms-of-service" className="hover:underline">利用規約</Link>
              <Link href="/release-notes" className="hover:underline">リリースノート</Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}