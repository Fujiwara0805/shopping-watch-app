import './globals.css';
import type { Metadata } from 'next';
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

const notoSansJP = Noto_Sans_JP({ 
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-sans-jp',
});

export const metadata: Metadata = {
  title: 'トクドク β版',
  description: 'みんなでお得な情報を共有しよう！',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  themeColor: '#FF6B35',
  manifest: '/manifest.json',
  icons: {
    icon: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png',
    apple: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <html lang="ja" suppressHydrationWarning>
      <head />
      <body className={`${notoSansJP.variable} font-sans bg-background text-foreground overflow-x-hidden touch-manipulation`}>
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
                        {children}
                        <FeedbackIntegration />
                      </GoogleMapsApiProvider>
                    ) : (
                      <>
                        <div style={{ padding: '20px', backgroundColor: 'red', color: 'white', textAlign: 'center' }}>
                          Google Maps APIキーが設定されていません。地図機能は利用できません。
                        </div>
                        {children}
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