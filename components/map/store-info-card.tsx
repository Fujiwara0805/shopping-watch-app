"use client";

import { motion } from 'framer-motion';
import { Star, X, Clock, Phone, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Store } from '@/types/store';

interface StoreInfoCardProps {
  store: Store;
  onClose: () => void;
}

export function StoreInfoCard({ store, onClose }: StoreInfoCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  
  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-lg">{store.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{store.address}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="p-4 pt-2 space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {store.openStatus === 'open' ? (
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  営業中
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-100 text-gray-800">
                  営業時間外
                </Badge>
              )}
              
              <Badge variant="outline" className="bg-primary/10">
                {store.distance}km
              </Badge>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                isFavorite ? "text-yellow-500" : "text-muted-foreground"
              )}
              onClick={toggleFavorite}
            >
              <Star className={cn("h-5 w-5 mr-1", isFavorite && "fill-current")} />
              {isFavorite ? 'お気に入り済み' : 'お気に入り追加'}
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{store.openingHours}</span>
            </div>
            <div className="flex items-center">
              <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{store.phone}</span>
            </div>
          </div>
          
          {store.posts > 0 && (
            <div className="mt-2 pt-2 border-t text-sm flex justify-between items-center">
              <span>
                <span className="text-accent font-medium">{store.posts}件</span>
                の値引き情報があります
              </span>
              <Button variant="link" size="sm" className="p-0 h-auto">
                <ExternalLink className="h-4 w-4 mr-1" />
                詳細
              </Button>
            </div>
          )}
          
          <div className="flex space-x-2 mt-4">
            <Button className="flex-1">ルート検索</Button>
            <Button variant="outline" className="flex-1">情報を共有</Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}