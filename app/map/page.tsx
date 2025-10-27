"use client";

import { motion } from 'framer-motion';
import { MapView } from '@/components/map/map-view';

export default function MapPage() {
  return (
    <div className="h-full w-full overflow-hidden">
      <motion.div 
        key={'map'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="h-full w-full"
      >
        <MapView />
      </motion.div>
    </div>
  );
}