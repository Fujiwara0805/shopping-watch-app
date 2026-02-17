"use client";

import { motion } from 'framer-motion';
import { Trash2, Bus, TrainFront, Coffee } from 'lucide-react';
import { designTokens } from '@/lib/constants';
import type { FacilityLayerType } from '@/types/facility-report';

interface FacilityLayerTogglesProps {
  activeLayers: Set<FacilityLayerType>;
  onToggle: (type: FacilityLayerType) => void;
  loadingLayers?: Set<string>;
}

const FACILITY_CONFIGS: { type: FacilityLayerType; label: string; icon: React.ElementType; color: string }[] = [
  { type: 'trash_can', label: 'ゴミ箱', icon: Trash2, color: '#6B7280' },
  { type: 'bus_stop', label: 'バス停', icon: Bus, color: '#3B82F6' },
  { type: 'train_station', label: '駅', icon: TrainFront, color: '#EF4444' },
  { type: 'rest_spot', label: '休憩', icon: Coffee, color: '#10B981' },
];

export function FacilityLayerToggles({ activeLayers, onToggle, loadingLayers }: FacilityLayerTogglesProps) {
  return (
    <div className="flex flex-col gap-2">
      {FACILITY_CONFIGS.map(config => {
        const isActive = activeLayers.has(config.type);
        const isLoading = loadingLayers?.has(config.type);
        const Icon = config.icon;
        return (
          <motion.button
            key={config.type}
            whileTap={{ scale: 0.95 }}
            onClick={() => onToggle(config.type)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all shadow-md"
            style={{
              background: isActive ? config.color : designTokens.colors.background.white,
              color: isActive ? '#fff' : designTokens.colors.text.secondary,
              border: `1px solid ${isActive ? config.color : designTokens.colors.secondary.stone}40`,
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            <Icon className={`h-3.5 w-3.5 ${isLoading ? 'animate-pulse' : ''}`} />
            {config.label}
          </motion.button>
        );
      })}
    </div>
  );
}
