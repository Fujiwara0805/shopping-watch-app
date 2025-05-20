"use client";

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Store } from '@/types/store';

interface StoreInfoCardProps {
  store: Store;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export function StoreInfoCard({ store, onClose, isFavorite, onToggleFavorite }: StoreInfoCardProps) {
  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 50, opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="p-4 sm:p-6">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-2xl font-bold mb-2">{store.name}</h2>
          <p className="text-xl text-muted-foreground mb-6">{store.address}</p>

          <Button
            variant="ghost"
            size="lg"
            className={cn(
              "text-2xl flex items-center",
              isFavorite ? "text-yellow-500 hover:text-yellow-600" : "text-muted-foreground hover:text-yellow-500"
            )}
            onClick={onToggleFavorite}
          >
            <Star className={cn("h-7 w-7 mr-2", isFavorite && "fill-current")} />
            {isFavorite ? 'お気に入り済み' : 'お気に入りに追加'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}