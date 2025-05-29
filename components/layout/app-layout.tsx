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
    <div className="flex flex-col min-h-screen bg-background">
      {showHeader && <AppHeader />}
      
      <main className={`flex-1 relative`}>
        <motion.div
          key={pathname}
          initial="hidden"
          animate="enter"
          exit="exit"
          variants={variants}
          transition={{ duration: 0.3, type: 'tween' }}
          className={`absolute inset-0 overflow-y-auto pb-safe ${showNav ? 'pb-16 md:pb-0' : 'pb-0'} flex flex-col`}
        >
          {children}
        </motion.div>
      </main>
      
      {showNav && <MainNav />}
    </div>
  );
}