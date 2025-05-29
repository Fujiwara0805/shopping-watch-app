"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AppLayout from '@/components/layout/app-layout';
import { MapView } from '@/components/map/map-view';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function MapPage() {
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        <div className="flex-1 relative">
          {loading ? (
            <div className="p-4 h-full">
              <Skeleton className="h-full w-full rounded-lg" />
            </div>
          ) : (
            <motion.div 
              key={'map'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <MapView />
            </motion.div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}