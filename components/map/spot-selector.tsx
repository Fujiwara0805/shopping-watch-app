"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Bus, TrainFront, Shield, Droplets, MapPin, X, Camera, Utensils } from 'lucide-react';
import { designTokens } from '@/lib/constants';
import type { FacilityLayerType } from '@/types/facility-report';

interface SpotConfig {
  type: FacilityLayerType;
  label: string;
  icon: React.ElementType;
  color: string;
}

export const SPOT_CONFIGS: SpotConfig[] = [
  { type: 'trash_can', label: 'ゴミ箱', icon: Trash2, color: '#6B7280' },
  { type: 'bus_stop', label: 'バス停', icon: Bus, color: '#3B82F6' },
  { type: 'train_station', label: '駅', icon: TrainFront, color: '#EF4444' },
  { type: 'evacuation_site', label: '避難所', icon: Shield, color: '#8B5CF6' },
  { type: 'hot_spring', label: '温泉', icon: Droplets, color: '#06B6D4' },
  { type: 'tourism_spot', label: '観光', icon: Camera, color: '#059669' },
  { type: 'restaurant', label: '食事処', icon: Utensils, color: '#EA580C' },
];

interface SpotSelectorProps {
  activeSpot: FacilityLayerType | null;
  onSelect: (type: FacilityLayerType | null) => void;
  loadingSpot?: FacilityLayerType | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SpotSelector({ activeSpot, onSelect, loadingSpot, isOpen, onOpenChange }: SpotSelectorProps) {
  const handleSpotClick = (type: FacilityLayerType) => {
    if (activeSpot === type) {
      onSelect(null);
    } else {
      onSelect(type);
    }
    onOpenChange(false);
  };

  const activeConfig = SPOT_CONFIGS.find(c => c.type === activeSpot);

  return (
    <>
      {/* スポットボタン（左下） */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => onOpenChange(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold shadow-lg transition-all"
        style={{
          background: activeSpot
            ? (activeConfig?.color || designTokens.colors.accent.lilac)
            : designTokens.colors.background.white,
          color: activeSpot ? '#fff' : designTokens.colors.text.primary,
          border: `1px solid ${activeSpot ? 'transparent' : designTokens.colors.secondary.stone}40`,
          boxShadow: designTokens.elevation.medium,
        }}
      >
        {activeConfig ? (
          <>
            <activeConfig.icon className="h-4 w-4 flex-shrink-0" />
            <span>{activeConfig.label}</span>
          </>
        ) : (
          <>
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span>スポット</span>
          </>
        )}
        {activeSpot && (
          <span
            className="ml-1 h-4 w-4 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.3)' }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(null);
            }}
          >
            <X className="h-2.5 w-2.5" />
          </span>
        )}
      </motion.button>

      {/* ボトムシートオーバーレイ */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* 背景オーバーレイ */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.3)' }}
              onClick={() => onOpenChange(false)}
            />

            {/* ボトムシート本体 */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
              style={{
                background: designTokens.colors.background.white,
                boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
              }}
            >
              {/* ハンドルバー */}
              <div className="flex justify-center pt-3 pb-1">
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ background: designTokens.colors.secondary.stone }}
                />
              </div>

              <div className="px-5 pb-6">
                {/* ヘッダー */}
                <div className="flex items-center justify-between mb-4 mt-2">
                  <h3
                    className="text-base font-semibold"
                    style={{ color: designTokens.colors.text.primary, fontFamily: designTokens.typography.display }}
                  >
                    スポットを選択
                  </h3>
                  <button
                    onClick={() => onOpenChange(false)}
                    className="h-8 w-8 rounded-full flex items-center justify-center"
                    style={{ background: designTokens.colors.background.cloud }}
                  >
                    <X className="h-4 w-4" style={{ color: designTokens.colors.text.secondary }} />
                  </button>
                </div>

                {/* スポット選択グリッド（3列） */}
                <div className="grid grid-cols-3 gap-3">
                  {SPOT_CONFIGS.map(config => {
                    const isActive = activeSpot === config.type;
                    const isLoading = loadingSpot === config.type;
                    const Icon = config.icon;
                    return (
                      <motion.button
                        key={config.type}
                        whileTap={{ scale: 0.93 }}
                        onClick={() => handleSpotClick(config.type)}
                        className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl transition-all"
                        style={{
                          background: isActive ? `${config.color}15` : designTokens.colors.background.cloud,
                          border: `2px solid ${isActive ? config.color : 'transparent'}`,
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ background: isActive ? config.color : `${config.color}20` }}
                        >
                          <Icon
                            className={`h-5 w-5 ${isLoading ? 'animate-pulse' : ''}`}
                            style={{ color: isActive ? '#fff' : config.color }}
                          />
                        </div>
                        <span
                          className="text-xs font-medium text-center leading-tight"
                          style={{ color: isActive ? config.color : designTokens.colors.text.secondary }}
                        >
                          {config.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* 選択解除ボタン */}
                {activeSpot && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => { onSelect(null); onOpenChange(false); }}
                    className="w-full mt-4 py-3 rounded-xl text-sm font-medium"
                    style={{
                      background: designTokens.colors.background.cloud,
                      color: designTokens.colors.text.secondary,
                    }}
                  >
                    表示を解除する
                  </motion.button>
                )}
              </div>

              {/* iOS safe area */}
              <div className="pb-safe" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
