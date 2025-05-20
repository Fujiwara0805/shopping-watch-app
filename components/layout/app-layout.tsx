"use client";

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { MainNav } from '@/components/layout/main-nav';
import { AppHeader } from '@/components/layout/app-header';

interface AppLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showNav?: boolean;
}

export default function AppLayout({ 
  children, 
  showHeader = true, 
  showNav = true 
}: AppLayoutProps) {
  const pathname = usePathname();
  
  // For page transitions
  const variants = {
    hidden: { opacity: 0, x: 0, y: 20 },
    enter: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, x: 0, y: 20 },
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {showHeader && <AppHeader />}
      
      <main className={`flex-1 overflow-auto pb-safe ${showNav ? 'pb-16' : ''}`}>
        <motion.div
          key={pathname}
          initial="hidden"
          animate="enter"
          exit="exit"
          variants={variants}
          transition={{ duration: 0.3, type: 'tween' }}
          className="min-h-full"
        >
          {children}
        </motion.div>
      </main>
      
      {showNav && <MainNav />}
    </div>
  );
}