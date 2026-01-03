'use client';

import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme/theme-provider';
import NextAuthProvider from '@/components/providers/NextAuthProvider';
import { GoogleMapsApiProvider } from '@/components/providers/GoogleMapsApiProvider';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { LocationPermissionProvider } from '@/components/providers/LocationPermissionProvider';
import { LoadingProvider } from '@/contexts/loading-context';
import { FeedbackProvider } from '@/contexts/feedback-context';
import { FeedbackIntegration } from '@/components/feedback/feedback-integration';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { AppHeader } from '@/components/layout/app-header';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMapPage = pathname === '/map';
  const isLoginPage = pathname === '/login';
  const isRegisterPage = pathname === '/register';
  const isLandingPage = pathname === '/';
  const isEventPage = pathname === '/events';
  const isSpotDetailPage = pathname?.startsWith('/map/spot/');
  const isEventDetailPage = pathname?.startsWith('/events/');

  // ヘッダーを表示しないページ
  const hideHeader = isMapPage || isLoginPage || isRegisterPage || isLandingPage || isEventDetailPage || isEventPage || isSpotDetailPage;

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

interface RootLayoutClientProps {
  children: React.ReactNode;
  fontClassName: string;
}

export function RootLayoutClient({ children, fontClassName }: RootLayoutClientProps) {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <body className={`${fontClassName} font-sans bg-background text-foreground`}>
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
    </body>
  );
}

