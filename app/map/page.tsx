"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AppLayout from '@/components/layout/app-layout';
import { MapView } from '@/components/map/map-view';
import { NearbyStores } from '@/components/map/nearby-stores';
import { Button } from '@/components/ui/button';
import { MapPin, Compass, List } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function MapPage() {
  const [view, setView] = useState<'map' | 'list'>('map');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  useEffect(() => {
    // Simulate loading of Google Maps
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);
  
  const handlePostClick = () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      router.push('/login');
    } else {
      router.push('/post');
    }
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        <div className="p-4 flex justify-between">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={view === 'map' ? 'default' : 'outline'}
              onClick={() => setView('map')}
              className="flex items-center gap-1"
            >
              <MapPin className="h-4 w-4" />
              マップ
            </Button>
            <Button 
              size="sm"
              variant={view === 'list' ? 'default' : 'outline'}
              onClick={() => setView('list')}
              className="flex items-center gap-1"
            >
              <List className="h-4 w-4" />
              リスト
            </Button>
          </div>
          
          <Button size="sm" variant="outline" className="flex items-center gap-1">
            <Compass className="h-4 w-4" />
            現在地
          </Button>
        </div>
        
        <div className="flex-1 relative">
          {loading ? (
            <div className="p-4 h-full">
              <Skeleton className="h-full w-full rounded-lg" />
            </div>
          ) : (
            <motion.div 
              key={view}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              {view === 'map' ? <MapView /> : <NearbyStores />}
            </motion.div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}