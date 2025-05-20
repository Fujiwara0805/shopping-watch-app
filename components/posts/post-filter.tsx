"use client";

import { motion } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface PostFilterProps {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
}

const categories = [
  { id: 'all', name: 'すべて' },
  { id: '惣菜', name: '惣菜' },
  { id: '弁当', name: '弁当' },
  { id: '肉', name: '肉' },
  { id: '魚', name: '魚' },
  { id: '野菜', name: '野菜' },
  { id: '果物', name: '果物' },
  { id: 'その他', name: 'その他' },
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
          {categories.map(category => (
            <motion.div
              key={category.id}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "relative rounded-full whitespace-nowrap",
                  activeFilter === category.id 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-background hover:bg-muted"
                )}
                onClick={() => setActiveFilter(category.id)}
              >
                {category.name}
              </Button>
            </motion.div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5" />
      </ScrollArea>
    </div>
  );
}