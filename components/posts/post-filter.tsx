"use client";

import { motion } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Utensils, ShoppingBag, Megaphone, Heart, Trophy, MessageSquareText } from 'lucide-react';

interface PostFilterProps {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
}

// 🔥 新しいカテゴリ定義（並び順を統一）
export const categories = [
  { id: 'all', name: 'すべて', icon: null },
  { id: '空席情報', name: '空席情報', icon: Utensils },
  { id: '在庫情報', name: '在庫情報', icon: ShoppingBag },
  { id: 'イベント情報', name: 'イベント情報', icon: Megaphone },
  { id: '助け合い', name: '助け合い', icon: Heart },
  { id: '口コミ', name: '口コミ', icon: MessageSquareText },
];

export function PostFilter({ activeFilter, setActiveFilter }: PostFilterProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollShadow, setShowScrollShadow] = useState(false);
  
  // Check if scroll area has overflow
  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollWidth, clientWidth } = scrollRef.current;
        setShowScrollShadow(scrollWidth > clientWidth);
      }
    };
    
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  return (
    <div className="relative">
      {showScrollShadow && (
        <div className="absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      )}
      
      <ScrollArea className="w-full" ref={scrollRef}>
        <div className="flex space-x-2 p-1">
          {categories.map(category => {
            const IconComponent = category.icon;
            return (
              <motion.div
                key={category.id}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "relative rounded-full whitespace-nowrap flex items-center space-x-1 px-3 py-2 transition-colors duration-200",
                    activeFilter === category.id 
                      ? "bg-primary text-primary-foreground border-primary" 
                      : "bg-background hover:bg-muted border-gray-300",
                    // タップ時の色変化を完全に無効化
                    "active:bg-current focus:ring-0 focus:ring-offset-0 focus:outline-none",
                    // ブラウザデフォルトのタップハイライトを無効化
                    "tap-highlight-transparent"
                  )}
                  style={{
                    // Webkit系ブラウザでのタップハイライトを無効化
                    WebkitTapHighlightColor: 'transparent'
                  }}
                  onClick={() => {
                    setActiveFilter(category.id);
                  }}
                >
                  {IconComponent && <IconComponent className="h-3 w-3" />}
                  <span className="text-sm">{category.name}</span>
                </Button>
              </motion.div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5" />
      </ScrollArea>
    </div>
  );
}