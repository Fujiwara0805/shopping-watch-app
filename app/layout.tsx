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
  const isEventDetailPage = pathname?.startsWith('/map/event/');
  
  // ヘッダーを表示しないページ
  const hideHeader = isMapPage || isLoginPage || isRegisterPage || isLandingPage || isEventDetailPage || isEventPage;

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
        <title>トクドク</title>
        <meta name="description" content="地域のお祭り、マルシェ、ワークショップを地図で発見！現在地から近いイベントをかんたん検索。週末の予定探しに最適な、完全無料の地域密着イベントアプリです。" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#73370c" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png" />
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
      </body>
    </html>
  );
}