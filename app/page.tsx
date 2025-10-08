'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ArrowRight, ShoppingCart, MapPin, Bell, Users, Menu, X, Leaf, ChevronDown, Circle, ListTodo, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomModal } from '@/components/ui/custom-modal'; // 🔥 追加

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


// PC版最高級ランディングページ
const NormalLP = ({ goToOnboarding, mobileMenuOpen, setMobileMenuOpen, scrollPosition, handlePCLogin }: { 
  goToOnboarding: () => void; 
  mobileMenuOpen: boolean; 
  setMobileMenuOpen: (open: boolean) => void; 
  scrollPosition: number;
  handlePCLogin: () => void;
}) => {
  
  // 通常版LP専用のbody overflow制御
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'auto';
    
    return () => {
      document.body.style.overflow = originalOverflow || '';
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 relative overflow-x-hidden">
      {/* メイン背景画像 */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.15]"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80')`
          }}
        />
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.12]"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80')`
          }}
        />
      </div>
      
      {/* オーバーレイグラデーション */}
      <div className="absolute inset-0 bg-gradient-to-br from-background/88 via-background/85 to-background/80 pointer-events-none" />
      
      {/* 微細なドットパターン */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative">
        {/* ヒーローセクション */}
        <section className="min-h-screen flex items-center justify-center px-8 py-20 pt-24">
          <div className="container mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-center space-y-12"
            >
              {/* メインアイコン */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                className="flex justify-center mb-12"
              >
                <div className="relative">
                  <motion.img 
                    src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png" 
                    alt="トクドク" 
                    className="h-32 w-32 lg:h-40 lg:w-40 drop-shadow-2xl"
                    animate={{ 
                      rotate: [0, 2, -2, 0],
                      scale: [1, 1.02, 1]
                    }}
                    transition={{ 
                      duration: 4,
                      repeat: Infinity,
                      repeatType: "reverse",
                      ease: "easeInOut"
                    }}
                  />
                  <div className="absolute -inset-4 bg-primary/10 rounded-full blur-xl opacity-50" />
                </div>
              </motion.div>

              {/* メインタイトル */}
              <div className="space-y-8">
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight"
                >
                  地域の「今」を、<br />
                  <span className="text-primary relative inline-block">
                    共有して、毎日をおとくに！
                    <motion.div 
                      className="absolute -bottom-2 left-0 right-0 h-1 bg-primary/30 rounded-full"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 1, delay: 1.2 }}
                    />
                  </span>
                </motion.h1>

                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="text-3xl lg:text-4xl font-medium text-muted-foreground max-w-4xl mx-auto leading-relaxed m-t-10"
                >
                  空席情報、在庫状況、PR情報まで。<br />
                  <span className="text-primary font-bold">リアルタイム</span>で地域の「今」が分かる掲示板アプリ
                </motion.p>

                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="text-xl lg:text-2xl text-muted-foreground/80 max-w-3xl mx-auto"
                >
                  買い物メモ機能で家族と共有、地域掲示板で最新情報をキャッチ。<br />
                  トクドクは、お<span className="text-primary font-semibold">トク</span>な情報があなたに<span className="text-primary font-semibold">とドク</span>地域密着アプリです。
                </motion.p>
              </div>

              {/* CTAボタン */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1 }}
                className="pt-8"
              >
                <Button 
                  size="lg" 
                  onClick={goToOnboarding}
                  className="h-16 px-12 text-xl font-semibold rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 bg-primary hover:bg-primary/90"
                >
                  <motion.span
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    さっそく始める！
                  </motion.span>
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
                <p className="text-lg text-muted-foreground mt-4 font-medium">
                  登録・利用料金完全無料！
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* 機能紹介セクション */}
        <section className="py-24 px-8 bg-muted/30 relative">
          {/* セクション背景画像 */}
          <div className="absolute inset-0 pointer-events-none">
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.08]"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80')`
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-muted/35 via-muted/25 to-muted/15" />
          </div>
          <div className="container mx-auto max-w-7xl relative">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                地域密着で、毎日がもっと便利に。<br />
                トクドクの5つの機能
              </h2>
              <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto">
                買い物から情報収集まで、あなたの地域生活をトータルサポート
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 lg:gap-12">
              {[
                {
                  icon: ListTodo,
                  title: "スマート買い物メモ",
                  description: "家族や友人とリアルタイム共有\n買い忘れ・買い過ぎを完全防止！",
                  color: "bg-primary/10",
                  textColor: "text-primary",
                  borderColor: "border-primary/20"
                },
                {
                  icon: Newspaper,
                  title: "地域密着掲示板",
                  description: "空席・在庫・PR情報が1km圏内限定。あなたの街の「今」をリアルタイムで！",
                  color: "bg-destructive/10",
                  textColor: "text-destructive",
                  borderColor: "border-destructive/20"
                },
                {
                  icon: Users,
                  title: "ご近所コミュニティ",
                  description: "地域の人たちと情報をシェア\n助け合いの輪を広げよう！",
                  color: "bg-secondary/10",
                  textColor: "text-secondary",
                  borderColor: "border-secondary/20"
                },
                {
                  icon: Bell,
                  title: "リアルタイム通知",
                  description: "お気に入り店舗の最新情報を即座にお知らせ。見逃し防止で常に最新情報をキャッチ！",
                  color: "bg-accent/10",
                  textColor: "text-accent",
                  borderColor: "border-accent/20"
                },
                {
                  icon: Leaf,
                  title: "地域社会への貢献",
                  description: "必要な人に必要な情報を届ける\n温かい地域コミュニティを一緒に作ろう",
                  color: "bg-green-500/10",
                  textColor: "text-green-500",
                  borderColor: "border-green-500/20"
                }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className={`flex flex-col items-center text-center p-8 lg:p-10 rounded-3xl bg-background border-2 ${feature.borderColor} shadow-lg hover:shadow-2xl transition-all duration-300 group`}
                >
                  <motion.div 
                    className={`${feature.color} p-6 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300`}
                    whileHover={{ rotate: 5 }}
                  >
                    <feature.icon className={`h-12 w-12 lg:h-14 lg:w-14 ${feature.textColor}`} />
                  </motion.div>
                  <h3 className="text-2xl lg:text-3xl font-bold mb-4 leading-tight">
                    {feature.title.split('\n').map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < feature.title.split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </h3>
                  <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed">
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

        {/* 最終CTAセクション */}
        <section className="py-24 px-8 relative">
          {/* CTA背景画像 */}
          <div className="absolute inset-0 pointer-events-none">
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.10]"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80')`
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/90 to-background/85" />
          </div>
          <div className="container mx-auto max-w-6xl text-center relative">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-12"
            >
              <div className="space-y-6">
                <h2 className="text-4xl lg:text-5xl font-bold leading-tight">
                  地域の「今」を知りたいなら、<br />
                  「トクドク」で決まり！
                </h2>
                <p className="text-2xl lg:text-3xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                  空席情報も在庫状況も、買い物メモも家族共有も。<br />
                  地域密着の便利機能が<span className="text-primary font-bold text-3xl lg:text-4xl">完全無料</span>で使い放題！
                </p>
              </div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  size="lg"
                  onClick={goToOnboarding}
                  className="h-18 px-16 text-2xl font-bold rounded-full shadow-2xl hover:shadow-3xl transform transition-all duration-300 bg-primary hover:bg-primary/90"
                >
                  <motion.span
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    今すぐ始める！
                  </motion.span>
                  <ArrowRight className="ml-4 h-7 w-7" />
                </Button>
              </motion.div>

              <div className="text-lg text-muted-foreground space-y-2">
                <p className="font-semibold">✓ 登録料・利用料 完全無料</p>
                <p className="font-semibold">✓ 1km圏内の地域密着情報</p>
                <p className="font-semibold">✓ リアルタイム更新で最新情報をお届け</p>
                <p className="font-semibold">✓ 家族・友人との情報共有機能付き</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* フッター */}
        <footer className="py-12 px-8 border-t bg-muted/20">
          <div className="container mx-auto max-w-6xl text-center">
            <div className="space-y-6">
              <p className="text-lg text-muted-foreground font-medium">© 2025 トクドク All rights reserved.</p>
              <div className="flex justify-center space-x-8 text-base">
                <Link href="/terms/privacy-policy" className="hover:underline hover:text-primary transition-colors">
                  プライバシーポリシー
                </Link>
                <Link href="/terms/service-policy" className="hover:underline hover:text-primary transition-colors">
                  サービスポリシー
                </Link>
                <Link href="/terms/terms-of-service" className="hover:underline hover:text-primary transition-colors">
                  利用規約
                </Link>
              </div>
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [activeTab, setActiveTab] = useState('normal');
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  
  // 🔥 追加：QRコードモーダルの状態
  const [showQrCodeModal, setShowQrCodeModal] = useState(false);
  
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
        // 2秒後にオンボーディング画面判定処理
        setTimeout(() => {
          // 🔥 修正：永続的スキップフラグをチェック
          const skipPermanently = localStorage.getItem('skipOnboardingPermanently');
          
          // 永続的にスキップするフラグがある場合は直接タイムラインに遷移
          if (skipPermanently === 'true') {
            router.push('/timeline');
            return;
          }
          
          // 🔥 修正：初回ユーザーまたは永続スキップしていないユーザーはオンボーディングを表示
          router.push('/timeline');
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

  // 🔥 修正：onboardingへ遷移する関数（PC版でもQRコード表示）
  const goToOnboarding = () => {
    if (isMobileScreen) {
      // 🔥 修正：永続的スキップフラグをチェック
      const skipPermanently = localStorage.getItem('skipOnboardingPermanently');
      
      if (skipPermanently === 'true') {
        // 永続的にスキップする場合は直接タイムラインに遷移
        router.push('/timeline');
      } else {
        // オンボーディングを表示
        localStorage.removeItem('hasSeenOnboarding');
        router.push('/timeline');
      }
    } else {
      // 🔥 PC版では QRコードモーダルを表示
      setShowQrCodeModal(true);
    }
  };

  // 🔥 追加：PC版ログイン・新規登録ボタンのハンドラー
  const handlePCLogin = () => {
    setShowQrCodeModal(true);
  };

  const handlePCRegister = () => {
    setShowQrCodeModal(true);
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
      {/* ヘッダー - シンプルなPC版ヘッダー */}
      {!isMobileScreen && (
        <nav 
          className={`fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm transition-all duration-300 pt-[var(--sat)] ${
            scrollPosition > 10 ? 'shadow-sm border-b' : ''
          }`}
        >
          <div className="container mx-auto px-8 h-20 flex items-center justify-end">
            <div className="flex items-center space-x-6">
              <Button 
                variant="ghost" 
                onClick={handlePCLogin} 
                className="h-12 px-6 text-lg font-medium rounded-full hover:bg-primary/10 transition-colors"
              >
                既にアカウントをお持ちの方
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
          handlePCLogin={handlePCLogin}
        />
      )}

      {/* 🔥 追加：QRコードモーダル */}
      <CustomModal
        isOpen={showQrCodeModal}
        onClose={() => setShowQrCodeModal(false)}
        title="スマートフォンでアクセス"
        description="QRコードを読み取ってスマートフォンからアクセスしてください。"
        className="sm:max-w-sm"
      >
        <div className="flex flex-col items-center justify-center p-4">
          <img
            src="https://res.cloudinary.com/dz9trbwma/image/upload/v1753769575/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2025-06-27_9.29.07_h7cyb8.png"
            alt="QR Code for Mobile Access"
            className="w-48 h-48 sm:w-64 sm:h-64 object-contain mb-4"
          />
          <p className="text-sm text-gray-600 text-center">
            QRコードをスキャンしてスマートフォンから「トクドク」にアクセスしてください。
          </p>
        </div>
        <div className="mt-6 flex justify-end">
          <Button variant="ghost" onClick={() => setShowQrCodeModal(false)} className="text-base px-5 py-2.5 h-auto">
            閉じる
          </Button>
        </div>
      </CustomModal>
    </main>
  );
}