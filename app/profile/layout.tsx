"use client";

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { User, Loader2 } from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { supabase } from '@/lib/supabaseClient';

interface ProfileLayoutProps {
  children: ReactNode;
}

export default function ProfileLayout({ children }: ProfileLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoadingProfileState, setIsLoadingProfileState] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PWA viewport height fix
  const [viewportHeight, setViewportHeight] = useState('100vh');

  useEffect(() => {
    const updateViewportHeight = () => {
      // 実際のビューポートの高さを取得
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      setViewportHeight(`${window.innerHeight}px`);
    };

    // 初回設定
    updateViewportHeight();

    // リサイズイベント
    window.addEventListener('resize', updateViewportHeight);
    
    // iOS Safari対応：orientationchange、focus、blur イベント
    window.addEventListener('orientationchange', updateViewportHeight);
    window.addEventListener('focus', updateViewportHeight);
    window.addEventListener('blur', updateViewportHeight);
    
    // PWA対応：visibilitychange イベント
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // アプリがフォアグラウンドに戻った時
        setTimeout(updateViewportHeight, 100);
      }
    });

    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('orientationchange', updateViewportHeight);
      window.removeEventListener('focus', updateViewportHeight);
      window.removeEventListener('blur', updateViewportHeight);
    };
  }, []);

  useEffect(() => {
    const checkProfileStatus = async () => {
      setIsLoadingProfileState(true);
      setError(null);

      try {
        if (status === 'loading') {
          return;
        }

        if (status === 'unauthenticated') {
          console.log('ProfileLayout: User not authenticated, redirecting to login');
          router.replace('/login');
          return;
        }

        if (status === 'authenticated' && session?.user?.id) {
          console.log('ProfileLayout: User authenticated, checking profile and path:', pathname);
          
          const { data: profileData, error: profileError } = await supabase
            .from('app_profiles')
            .select('id')
            .eq('user_id', session.user.id)
            .single();

          let profileExists = false;
          if (profileData) {
            profileExists = true;
          } else if (profileError) {
            if (profileError.code === 'PGRST116') {
              profileExists = false;
            } else {
              console.error('ProfileLayout: Error fetching profile:', profileError);
              setError('プロフィール情報の取得に失敗しました。');
              setIsLoadingProfileState(false);
              return;
            }
          }

          if (pathname === '/profile/setup' || pathname.startsWith('/profile/setup/')) {
            if (profileExists) {
              console.log('ProfileLayout: Profile already exists, redirecting from setup to profile');
              router.replace('/profile');
              return;
            } else {
              console.log('ProfileLayout: No profile found, staying on setup page');
            }
          } else {
            if (!profileExists) {
              console.log('ProfileLayout: No profile found, redirecting to profile setup');
              router.replace('/profile/setup');
              return;
            } else {
              console.log('ProfileLayout: Profile found, staying on profile page');
            }
          }
          setIsLoadingProfileState(false);

        } else {
          console.warn('ProfileLayout: Authenticated status but session.user.id is missing.');
          router.replace('/login');
        }

      } catch (err) {
        console.error('ProfileLayout: Unexpected error during profile status check:', err);
        setError('予期せぬエラーが発生しました。');
        setIsLoadingProfileState(false);
      }
    };

    checkProfileStatus();
  }, [status, session?.user?.id, router, pathname]);

  return (
    <AppLayout showHeader={true} showNav={true}>
      {isLoadingProfileState || status === 'loading' ? (
        <div 
          className="h-screen flex items-center justify-center"
          style={{ 
            backgroundColor: '#f3f4f6',
            height: `calc(${viewportHeight} - 120px)`,
            minHeight: '400px'
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-gray-400/30 border-t-gray-600 rounded-full mx-auto mb-4"
            />
            <p className="text-lg text-gray-700 mb-2">プロフィール情報を確認中...</p>
            <p className="text-sm text-gray-500">しばらくお待ちください</p>
          </motion.div>
        </div>
      ) : error ? (
        <div 
          className="h-screen flex items-center justify-center"
          style={{ 
            backgroundColor: '#f3f4f6',
            height: `calc(${viewportHeight} - 120px)`,
            minHeight: '400px'
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-6"
          >
            <User className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <p className="text-lg text-gray-700 mb-2">{error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/timeline')}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors mt-4"
            >
              タイムラインに戻る
            </motion.button>
          </motion.div>
        </div>
      ) : (
        children
      )}
    </AppLayout>
  );
}
