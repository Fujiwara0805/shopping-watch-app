'use client';

import './globals.css';
import { Noto_Sans_JP } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme/theme-provider';
import NextAuthProvider from '@/components/providers/NextAuthProvider';
import { GoogleMapsApiProvider } from '@/components/providers/GoogleMapsApiProvider';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { LocationPermissionProvider } from '@/components/providers/LocationPermissionProvider';
import { LoadingProvider } from '@/contexts/loading-context';
import { FeedbackProvider } from '@/contexts/feedback-context';
import { FeedbackIntegration } from '@/components/feedback/feedback-integration';
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { WebsiteStructuredData, FAQStructuredData, LocalBusinessStructuredData } from '@/components/seo/structured-data';

const notoSansJP = Noto_Sans_JP({ 
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
  preload: true,
});

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMapPage = pathname === '/map';
  const isLoginPage = pathname === '/login';
  const isRegisterPage = pathname === '/register';
  const isLandingPage = pathname === '/';
  const isEventPage = pathname === '/events';
  const isCalendarPage = pathname === '/calendar';
  const isEventDetailPage = pathname?.startsWith('/map/event/');
  
  // ヘッダーを表示しないページ
  const hideHeader = isMapPage || isLoginPage || isRegisterPage || isLandingPage || isEventDetailPage || isEventPage || isCalendarPage;

  useEffect(() => {
    // マップページの場合、bodyのスクロールを無効化
    if (isMapPage) {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
    } else {
      document.body.style.overflow = '';
      document.body.style.height = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, [isMapPage]);

  // マップページ専用レイアウト
  if (isMapPage) {
    return (
      <div className="h-screen w-screen overflow-hidden">
        {children}
      </div>
    );
  }

  // 通常ページレイアウト
  return (
    <div className="min-h-screen flex flex-col">
      {!hideHeader && (
        <div className="sticky top-0 z-50">
          <AppHeader />
        </div>
      )}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <title>トクドク - 地域イベント発見アプリ | 大分県のお祭り・マルシェ情報</title>
        <meta name="description" content="大分県内のお祭り、マルシェ、ワークショップを地図で発見！現在地から近いイベントをかんたん検索。週末の予定探しに最適な、完全無料の地域密着イベントアプリです。リアルタイムで更新される最新イベント情報をチェックしよう。" />
        <meta name="keywords" content="トクドク,大分,大分県,イベント,地域イベント,お祭り,夏祭り,秋祭り,マルシェ,ワークショップ,地図,マップ,イベント検索,無料,週末,予定,地域情報,フェスティバル,体験イベント,手作り市,フードフェス,音楽イベント,地域コミュニティ,リアルタイム,現在地,近くのイベント" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#73370c" />
        
        {/* AI検索エンジン向けメタデータ */}
        <meta name="author" content="トクドク" />
        <meta name="application-name" content="トクドク" />
        <meta name="apple-mobile-web-app-title" content="トクドク" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        
        {/* 地理的情報 */}
        <meta name="geo.region" content="JP-44" />
        <meta name="geo.placename" content="大分県" />
        <meta name="geo.position" content="33.2382;131.6126" />
        <meta name="ICBM" content="33.2382, 131.6126" />
        
        {/* SEO最適化 */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow" />
        <meta name="bingbot" content="index, follow" />
        
        {/* Open Graph */}
        <meta property="og:title" content="トクドク - 地域イベント発見アプリ | 大分県のお祭り・マルシェ情報" />
        <meta property="og:description" content="大分県内のお祭り、マルシェ、ワークショップを地図で発見！現在地から近いイベントをかんたん検索。週末の予定探しに最適な、完全無料の地域密着イベントアプリです。" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tokudoku.com" />
        <meta property="og:image" content="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="トクドク" />
        <meta property="og:locale" content="ja_JP" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="トクドク - 地域イベント発見アプリ" />
        <meta name="twitter:description" content="大分県内のお祭り、マルシェ、ワークショップを地図で発見！" />
        <meta name="twitter:image" content="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png" />
        
        {/* Links */}
        <link rel="canonical" href="https://tokudoku.com" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png" />
        <link rel="apple-touch-icon" href="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png" />
        
        {/* Preconnect */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body className={`${notoSansJP.variable} font-sans bg-background text-foreground`}>
        <LoadingProvider>
          <ThemeProvider 
            attribute="class" 
            defaultTheme="system" 
            enableSystem
            disableTransitionOnChange
          >
            <NextAuthProvider>
              <FeedbackProvider>
                <NotificationProvider>
                  <LocationPermissionProvider>
                    {googleMapsApiKey ? (
                      <GoogleMapsApiProvider apiKey={googleMapsApiKey}>
                        <LayoutContent>{children}</LayoutContent>
                        <FeedbackIntegration />
                      </GoogleMapsApiProvider>
                    ) : (
                      <>
                        <div style={{ padding: '20px', backgroundColor: 'red', color: 'white', textAlign: 'center' }}>
                          Google Maps APIキーが設定されていません。
                        </div>
                        <LayoutContent>{children}</LayoutContent>
                        <FeedbackIntegration />
                      </>
                    )}
                    <Toaster />
                  </LocationPermissionProvider>
                </NotificationProvider>
              </FeedbackProvider>
            </NextAuthProvider>
          </ThemeProvider>
        </LoadingProvider>
        <SpeedInsights />
        <Analytics />
        
        {/* 構造化データ(JSON-LD) - AI検索エンジン向け */}
        <WebsiteStructuredData />
        <FAQStructuredData />
        <LocalBusinessStructuredData />
      </body>
    </html>
  );
}