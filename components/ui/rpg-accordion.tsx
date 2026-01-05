'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// シンプルな開閉アイコン
const AccordionIcon = ({ isOpen, className }: { isOpen: boolean; className?: string }) => (
  <motion.div
    animate={{ rotate: isOpen ? 180 : 0 }}
    transition={{ duration: 0.3, ease: "easeInOut" }}
    className={className}
  >
    <ChevronDown className="w-5 h-5" />
  </motion.div>
);

interface RPGAccordionProps {
  title: string;
  icon?: React.ReactNode;
  iconType?: 'key' | 'scroll'; // 互換性のため残すが未使用
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  badge?: React.ReactNode;
}

export function RPGAccordion({
  title,
  icon,
  defaultOpen = true,
  children,
  className,
  headerClassName,
  contentClassName,
  badge,
}: RPGAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden transition-all duration-300",
      isOpen ? "shadow-md" : "shadow-sm",
      className
    )}>
      {/* ヘッダー */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between p-4 text-left transition-colors",
          "hover:bg-opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8b6914] focus-visible:ring-offset-2",
          isOpen ? "bg-[#73370c] text-white" : "bg-[#fef3e8] text-[#73370c]",
          headerClassName
        )}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <motion.div
              animate={{ rotate: isOpen ? 0 : -10, scale: isOpen ? 1.1 : 1 }}
              transition={{ duration: 0.3 }}
            >
              {icon}
            </motion.div>
          )}
          <span className="text-base font-bold">{title}</span>
          {badge && (
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              isOpen ? "bg-white/20 text-white" : "bg-[#73370c]/10 text-[#73370c]"
            )}>
              {badge}
            </span>
          )}
        </div>
        <AccordionIcon 
          isOpen={isOpen} 
          className={isOpen ? "text-white" : "text-[#73370c]"} 
        />
      </button>

      {/* コンテンツ */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: "auto", 
              opacity: 1,
              transition: {
                height: { duration: 0.3, ease: "easeOut" },
                opacity: { duration: 0.2, delay: 0.1 }
              }
            }}
            exit={{ 
              height: 0, 
              opacity: 0,
              transition: {
                height: { duration: 0.3, ease: "easeIn" },
                opacity: { duration: 0.15 }
              }
            }}
            className="overflow-hidden"
          >
            <div className={cn("p-4", contentClassName)}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RPGAccordion;
