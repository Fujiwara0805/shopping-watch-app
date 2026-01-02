"use client";

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabaseClient';

// 🎨 LPカラーパレット
const COLORS = {
  primary: '#8b6914',      // ゴールドブラウン
  primaryDark: '#3d2914',  // ダークブラウン
  secondary: '#5c3a21',    // ミディアムブラウン
  background: '#f5e6d3',   // ベージュ
  surface: '#fff8f0',      // オフホワイト
  cream: '#ffecd2',        // クリーム
  border: '#d4c4a8',       // ライトベージュ
};

export function AppHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [userRole, setUserRole] = useState<string | null>(null);

  // ユーザーの役割を取得
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!session?.user?.id) {
        setUserRole(null);
        return;
      }

      try {
        const { data: userData, error } = await supabase
          .from('app_users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (!error && userData) {
          setUserRole(userData.role);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };

    fetchUserRole();
  }, [session?.user?.id]);
  
  // Get page title based on current path
  const getPageTitle = () => {
    // 動的ルートのチェック（先にチェックする必要がある）
    if (pathname.startsWith('/my-maps/edit/')) {
      return 'My Map編集';
    }
    
    switch (pathname) {
      case '/post':
        return '新規投稿';
      case '/events':
        return 'イベント一覧';
      case '/create-map':
        return '地図づくり';
      case '/my-maps':
        return '作成した地図';
      case '/public-maps':
        return 'ATLAS';
      case '/profile':
        return 'My Page';
      case '/profile/edit':
        return 'プロフィール編集';
      case '/profile/setup':
        return 'プロフィール作成';
      case '/line-connect':
        return 'LINE通知設定';
      case '/notifications':
        return '通知';
      case '/contactm':
        return 'お問い合わせ';
      case '/memo':
        return 'メモ';
      case '/train-schedule':
        return '時刻表';
      case '/terms':
        return '利用規約一覧';
      case '/terms/terms-of-service':
        return '利用規約';
      case '/terms/privacy-policy':
        return 'ポリシー関連';
      case '/terms/service-policy':
        return 'ポリシー関連';
      case '/settings':
        return '設定';
      case '/release-notes':
        return 'リリースノート';
      case '/ads/new':
        return '広告作成';
      default:
        return '';
    }
  };
  
  const title = getPageTitle();

  return (
    <header 
      className="sticky top-0 z-10 border-b"
      style={{ 
        backgroundColor: COLORS.background, 
        borderColor: COLORS.border 
      }}
    >
      <motion.div 
        className="h-14 px-4 flex items-center justify-center"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {title && (
          <h1 
            className="font-bold text-2xl text-center"
            style={{ 
              color: COLORS.primaryDark,
              fontFamily: "'Noto Serif JP', serif"
            }}
          >
            {title}
          </h1>
        )}
      </motion.div>
    </header>
  );
}