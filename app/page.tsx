'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin, Users, Sparkles, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomModal } from '@/components/ui/custom-modal';

// イベント特化型ランディングページ
const EventLP = ({ onStart }: { onStart: () => void }) => {
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 relative overflow-x-hidden">
      {/* 背景装飾 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-100/30 via-blue-100/30 to-pink-100/30" />
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative">
        {/* ヘッダー */}
        <nav className={`fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm transition-all duration-300 ${
          scrollPosition > 10 ? 'shadow-md' : ''
        }`}>
          <div className="container mx-auto px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png" 
                alt="トクドク" 
                className="h-10 w-10 sm:h-12 sm:w-12"
              />
            </div>
            <Button 
              onClick={onStart}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-4 sm:px-6 rounded-full shadow-lg"
            >
              <span className="hidden sm:inline">さっそく始める</span>
              <span className="sm:hidden">始める</span>
            </Button>
          </div>
        </nav>

        {/* ヒーローセクション */}
        <section className="min-h-screen flex items-center justify-center px-4 sm:px-8 py-20 pt-32">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center space-y-8 sm:space-y-12"
            >
              {/* メインアイコン */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1, delay: 0.2 }}
                className="flex justify-center mb-8"
              >
                <div className="relative">
                  <motion.div
                    animate={{ 
                      rotate: [0, 2, -2, 0],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="relative z-10"
                  >
                    <img 
                      src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png" 
                      alt="トクドク" 
                      className="h-28 w-28 sm:h-32 sm:w-32"
                    />
                  </motion.div>
                  <div className="absolute -inset-4 bg-purple-400/20 rounded-full blur-2xl" />
                </div>
              </motion.div>

              {/* メインタイトル */}
              <div className="space-y-6 sm:space-y-8">
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-3xl sm:text-4xl lg:text-6xl font-bold leading-tight"
                >
                  あなたの街の<br className="sm:hidden" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#73370c] to-[#8B4513]">イベント情報</span>が、<br />
                  今すぐ見つかる
                </motion.h1>

                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="text-lg sm:text-2xl lg:text-3xl text-gray-700 max-w-4xl mx-auto leading-relaxed"
                >
                  地域のお祭り、マルシェ、ワークショップ。<br className="hidden sm:block" />
                  <span className="font-bold text-[#73370c]">近くで開催中のイベント</span>を地図で見つけよう
                </motion.p>

                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="text-base sm:text-xl text-gray-600 max-w-3xl mx-auto"
                >
                  完全無料で、今日・明日の楽しいを探せる地域密着イベントアプリ
                </motion.p>
              </div>

              {/* CTAボタン */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1 }}
                className="pt-6 sm:pt-8"
              >
                <Button 
                  size="lg" 
                  onClick={onStart}
                  className="h-14 sm:h-16 px-8 sm:px-12 text-lg sm:text-xl font-semibold rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 bg-gradient-to-r from-[#73370c] to-[#8B4513] hover:from-[#5c2a0a] hover:to-[#73370c]"
                >
                  <motion.span
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    イベントを探す
                  </motion.span>
                  <ArrowRight className="ml-3 h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
                <p className="text-sm sm:text-lg text-gray-600 mt-4 font-medium">
                  登録・利用料金完全無料
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* 機能紹介セクション */}
        <section className="py-16 sm:py-24 px-4 sm:px-8 bg-white/50 relative">
          <div className="container mx-auto max-w-6xl relative">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-12 sm:mb-20"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
                トクドクの3つの特徴
              </h2>
              <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto">
                地域のイベントをもっと身近に、もっと楽しく
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
              {[
                {
                  icon: MapPin,
                  title: "地図でかんたん発見",
                  description: "現在地から近いイベントを地図上で一目で確認。気になるイベントをタップで詳細表示"
                },
                {
                  icon: Calendar,
                  title: "リアルタイム更新",
                  description: "今日・明日開催のイベントが常に最新状態。見逃すことなく地域の楽しい情報をキャッチ"
                },
                {
                  icon: Users,
                  title: "地域とつながる",
                  description: "お祭り、マルシェ、ワークショップなど、地域の人と人をつなぐイベント情報が満載"
                }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="flex flex-col items-center text-center p-6 sm:p-8 lg:p-10 rounded-3xl bg-white border-2 border-[#73370c]/20 shadow-lg hover:shadow-2xl transition-all duration-300"
                >
                  <motion.div 
                    className="bg-gradient-to-br from-[#73370c]/10 to-[#8B4513]/10 p-5 sm:p-6 rounded-2xl mb-4 sm:mb-6"
                    whileHover={{ rotate: 5, scale: 1.1 }}
                  >
                    <feature.icon className="h-10 w-10 sm:h-12 sm:w-12 text-[#73370c]" />
                  </motion.div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 最終CTAセクション */}
        <section className="py-16 sm:py-24 px-4 sm:px-8 relative">
          <div className="container mx-auto max-w-5xl text-center relative">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-8 sm:space-y-12"
            >
              <div className="space-y-4 sm:space-y-6">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                  週末の予定、<br className="sm:hidden" />まだ決まってない？
                </h2>
                <p className="text-xl sm:text-2xl lg:text-3xl text-gray-700 max-w-4xl mx-auto leading-relaxed">
                  トクドクで、<span className="font-bold text-[#73370c]">今週のイベント</span>を<br className="hidden sm:block" />
                  チェックしよう！
                </p>
              </div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  size="lg"
                  onClick={onStart}
                  className="h-14 sm:h-16 px-10 sm:px-16 text-lg sm:text-2xl font-bold rounded-full shadow-2xl hover:shadow-3xl transform transition-all duration-300 bg-gradient-to-r from-[#73370c] to-[#8B4513] hover:from-[#5c2a0a] hover:to-[#73370c]"
                >
                  <Sparkles className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
                  <motion.span
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    今すぐ探す
                  </motion.span>
                  <ArrowRight className="ml-2 sm:ml-4 h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              </motion.div>

              <div className="text-base sm:text-lg text-gray-600 space-y-2">
                <p className="font-semibold">✓ 登録・利用料 完全無料</p>
                <p className="font-semibold">✓ 地図で見やすい表示</p>
                <p className="font-semibold">✓ リアルタイム更新</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* フッター */}
        <footer className="py-8 sm:py-12 px-4 sm:px-8 border-t bg-gray-50">
          <div className="container mx-auto max-w-6xl text-center">
            <div className="space-y-4 sm:space-y-6">
              <p className="text-base sm:text-lg text-gray-600 font-medium">© 2025 トクドク All rights reserved.</p>
              <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-sm sm:text-base">
                <Link href="/terms/privacy-policy" className="hover:underline hover:text-[#73370c] transition-colors">
                  プライバシーポリシー
                </Link>
                <Link href="/terms/service-policy" className="hover:underline hover:text-[#73370c] transition-colors">
                  サービスポリシー
                </Link>
                <Link href="/terms/terms-of-service" className="hover:underline hover:text-[#73370c] transition-colors">
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
  const [showLocationModal, setShowLocationModal] = useState(false);

  // 🔥 イベントを探すボタンクリック時に位置情報モーダルを表示
  const handleStart = () => {
    setShowLocationModal(true);
  };

  // 🔥 位置情報を許可してマップ画面へ遷移
  const handleAllowLocation = async () => {
    if ('geolocation' in navigator) {
      try {
        console.log('位置情報を取得中...');
        
        // 位置情報を取得
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });

        console.log('位置情報取得成功:', position.coords);

        // 位置情報をlocalStorageに保存（map-view.tsxが読み込むキー）
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: Date.now(),
          expiresAt: Date.now() + (60 * 60 * 1000) // 1時間有効
        };
        localStorage.setItem('userLocation', JSON.stringify(locationData));
        console.log('位置情報を保存:', locationData);

        // �� LocationPermissionManagerが使用する許可フラグも保存
        localStorage.setItem('locationPermission', JSON.stringify({
          isGranted: true,
          timestamp: Date.now()
        }));

        // モーダルを閉じてマップ画面へ遷移
        setShowLocationModal(false);
        router.push('/map');
      } catch (error) {
        console.error('位置情報の取得に失敗:', error);
        // エラーでもマップ画面へ遷移（マップ側で再度許可を求める）
        setShowLocationModal(false);
        router.push('/map');
      }
    } else {
      console.warn('位置情報が利用できません');
      // 位置情報が利用できない場合もマップ画面へ
      setShowLocationModal(false);
      router.push('/map');
    }
  };

  // �� 位置情報を許可しない場合もマップ画面へ
  const handleDenyLocation = () => {
    setShowLocationModal(false);
    router.push('/map');
  };

  return (
    <main className="min-h-screen bg-background">
      <EventLP onStart={handleStart} />
      
      {/* 🔥 位置情報許可モーダル */}
      <CustomModal
        isOpen={showLocationModal}
        onClose={handleDenyLocation}
        title="位置情報の利用について"
        description="近くのイベントを地図上で表示するために位置情報を使用します"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-[#73370c] mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <p className="font-semibold mb-1">現在地周辺のイベントを表示</p>
                <p className="text-gray-600">あなたの位置情報を使って、近くで開催中のイベントを地図上に表示します。</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-[#73370c] mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <p className="font-semibold mb-1">プライバシーを保護</p>
                <p className="text-gray-600">位置情報はイベント検索のみに使用し、外部に共有されることはありません。</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleAllowLocation}
              className="w-full bg-gradient-to-r from-[#73370c] to-[#8B4513] hover:from-[#5c2a0a] hover:to-[#73370c] text-white font-semibold"
            >
              <MapPin className="mr-2 h-4 w-4" />
              位置情報を許可してイベントを探す
            </Button>
            
            <Button
              onClick={handleDenyLocation}
              variant="outline"
              className="w-full"
            >
              今はスキップ
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 text-center">
            ※ブラウザの設定で位置情報の許可をONにしてください
          </p>
        </div>
      </CustomModal>
    </main>
  );
}