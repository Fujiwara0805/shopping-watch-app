"use client";

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkProfileStatus = async () => {
      try {
        // セッション状態がローディング中の場合は待機
        if (status === 'loading') {
          return;
        }

        // 未認証の場合は新規プロフィール作成画面へ
        if (status === 'unauthenticated') {
          console.log('ProfileLayout: User not authenticated, redirecting to profile setup');
          router.replace('/profile/setup');
          return;
        }

        // 認証済みの場合はプロフィール情報を確認
        if (status === 'authenticated' && session?.user?.id) {
          console.log('ProfileLayout: Checking profile for user:', session.user.id);
          
          const { data: profileData, error: profileError } = await supabase
            .from('app_profiles')
            .select('id, user_id, display_name')
            .eq('user_id', session.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('ProfileLayout: Error fetching profile:', profileError);
            setError('プロフィール情報の取得に失敗しました');
            setIsChecking(false);
            return;
          }

          // プロフィール情報が存在しない場合は新規作成画面へ
          if (!profileData) {
            console.log('ProfileLayout: No profile found, redirecting to profile setup');
            router.replace('/profile/setup');
            return;
          }

          // プロフィール情報が存在する場合は子コンポーネントを表示
          console.log('ProfileLayout: Profile found, showing profile page');
          setIsChecking(false);
        }
      } catch (error) {
        console.error('ProfileLayout: Unexpected error:', error);
        setError('予期しないエラーが発生しました');
        setIsChecking(false);
      }
    };

    checkProfileStatus();
  }, [status, session?.user?.id, router]);

  // ローディング中の表示
  if (status === 'loading' || isChecking) {
    return (
      <AppLayout>
        <div 
          className="h-screen flex items-center justify-center"
          style={{ 
            backgroundColor: '#73370c',
            height: 'calc(var(--mobile-vh, 100vh) - 120px)', // ヘッダーとナビゲーションの高さを考慮
            minHeight: '400px' // 最小高さを設定
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
      </AppLayout>
    );
  }

  // エラー表示
  if (error) {
    return (
      <AppLayout>
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
      </AppLayout>
    );
  }

  // 正常な場合は子コンポーネントを表示
  return <>{children}</>;
}
