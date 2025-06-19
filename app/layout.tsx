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
  description: 'お気に入りの店舗を登録して、よく行くスーパーや近所のお店を登録できます。お気に入りに追加すると、お得な情報をいち早くゲットできます。',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  themeColor: '#73370c',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png', sizes: '192x192', type: 'image/png' },
      { url: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png',
  },
  openGraph: {
    title: 'トクドク β版',
    description: 'お気に入りの店舗を登録して、よく行くスーパーや近所のお店を登録できます。お気に入りに追加すると、お得な情報をいち早くゲットできます。',
    url: 'https://www.tokudoku.com',
    siteName: 'トクドク β版',
    images: [
      {
        url: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png',
        width: 512,
        height: 512,
        alt: 'トクドク β版',
      },
    ],
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'トクドク β版',
    description: 'お気に入りの店舗を登録して、よく行くスーパーや近所のお店を登録できます。お気に入りに追加すると、お得な情報をいち早くゲットできます。',
    images: ['https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png'],
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