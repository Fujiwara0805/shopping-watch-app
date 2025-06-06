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
            backgroundColor: '#73370c',
            height: 'calc(var(--mobile-vh, 100vh) - 120px)',
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
              className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4"
            />
            <p className="text-lg text-white mb-2">プロフィール情報を確認中...</p>
            <p className="text-sm text-white/70">しばらくお待ちください</p>
          </motion.div>
        </div>
      ) : error ? (
        <div 
          className="h-screen flex items-center justify-center"
          style={{ 
            backgroundColor: '#73370c',
            height: 'calc(var(--mobile-vh, 100vh) - 120px)',
            minHeight: '400px'
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-6"
          >
            <User className="h-16 w-16 mx-auto text-white/60 mb-4" />
            <p className="text-lg text-white mb-2">{error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/timeline')}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-lg transition-colors mt-4"
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
