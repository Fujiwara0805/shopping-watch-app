'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Loader2 } from 'lucide-react';

interface EventSearchLoadingProps {
  isVisible: boolean;
}

export function EventSearchLoading({ isVisible }: EventSearchLoadingProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="event-search-loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#3d2914]/90 backdrop-blur-md"
          aria-live="polite"
          aria-busy="true"
        >
          {/* ローリング（ローディング）演出 */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="mb-8"
          >
            <Compass className="h-20 w-20 text-[#ffecd2]" strokeWidth={1.5} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3"
          >
            <Loader2 className="h-6 w-6 animate-spin text-[#ffecd2]" />
            <p className="text-xl font-bold text-[#ffecd2] tracking-wide">
              イベントを探しています…
            </p>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-3 text-sm text-[#ffecd2]/80"
          >
            しばらくお待ちください
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
