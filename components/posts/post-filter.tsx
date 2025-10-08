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
const categories = [
  { id: 'all', name: 'すべて', icon: null },
  { id: 'おとく自慢', name: 'おとく自慢', icon: Trophy },
  { id: '空席状況', name: '空席状況', icon: Utensils },
  { id: '在庫状況', name: '在庫状況', icon: ShoppingBag },
  { id: 'PR', name: 'PR', icon: Megaphone },
  { id: '応援', name: '応援', icon: Heart },
  { id: '雑談', name: '雑談', icon: MessageSquareText },
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
                    "relative rounded-full whitespace-nowrap flex items-center space-x-1 px-3 py-2",
                    activeFilter === category.id 
                      ? "bg-primary text-primary-foreground border-primary" 
                      : "bg-background hover:bg-muted border-gray-300"
                  )}
                  onClick={() => setActiveFilter(category.id)}
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