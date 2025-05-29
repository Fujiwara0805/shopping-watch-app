"use client";

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common/logo';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export function AppHeader() {
  const pathname = usePathname();
  
  // Get page title based on current path
  const getPageTitle = () => {
    switch (pathname) {
      case '/timeline':
        return 'タイムライン';
      case '/map':
        return 'お店を探す';
      case '/post':
        return '新規投稿';
      case '/profile':
        return 'マイページ';
      case '/notifications':
        return '通知';
      default:
        return '';
    }
  };
  
  // Mock notification count - in real app this would come from backend
  const notificationCount = 3;

  const showLogo = pathname === '/timeline';
  const title = getPageTitle();

  return (
    <header className="sticky top-0 z-10 bg-background border-b border-border">
      <motion.div 
        className="h-14 px-4 flex items-center justify-center relative"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="absolute left-4 flex items-center">
          {showLogo && <Logo withText size="small" />}
        </div>
        
        {!showLogo && title && (
          <h1 className="font-bold text-3xl text-center">{title}</h1>
        )}
        
        <div className="absolute right-4 flex items-center space-x-2">
          {/* <Button variant="ghost" size="icon" asChild>
            <Link href="/search">
              <Search className="h-5 w-5" />
            </Link>
          </Button> */}
          
          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link href="/notifications">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center bg-accent text-accent-foreground"
                >
                  {notificationCount}
                </Badge>
              )}
            </Link>
          </Button>
        </div>
      </motion.div>
    </header>
  );
}