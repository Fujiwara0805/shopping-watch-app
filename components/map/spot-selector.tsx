"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X } from 'lucide-react';
import { designTokens, FACILITY_ICON_URLS } from '@/lib/constants';
import type { FacilityLayerType } from '@/types/facility-report';

interface SpotConfig {
  type: FacilityLayerType;
  label: string;
  iconUrl: string;
  color: string;
}

export const SPOT_CONFIGS: SpotConfig[] = [
  { type: 'tourism_spot', label: '観光', iconUrl: FACILITY_ICON_URLS.tourism_spot, color: '#059669' },
  { type: 'restaurant', label: 'グルメ', iconUrl: FACILITY_ICON_URLS.restaurant, color: '#EA580C' },
  { type: 'hot_spring', label: '温泉', iconUrl: FACILITY_ICON_URLS.hot_spring, color: '#EF4444' },
  { type: 'toilet', label: 'トイレ', iconUrl: FACILITY_ICON_URLS.toilet, color: '#8B5CF6' },
  { type: 'bus_stop', label: 'バス停', iconUrl: FACILITY_ICON_URLS.bus_stop, color: '#3B82F6' },
  { type: 'train_station', label: '駅', iconUrl: FACILITY_ICON_URLS.train_station, color: '#06B6D4' },
  { type: 'evacuation_site', label: '避難所', iconUrl: FACILITY_ICON_URLS.evacuation_site, color: '#F59E0B' },
  { type: 'trash_can', label: 'ゴミ箱', iconUrl: FACILITY_ICON_URLS.trash_can, color: '#6B7280' },
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
        className="flex flex-col items-center gap-1 relative"
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all overflow-hidden"
          style={{
            background: designTokens.colors.background.white,
            border: `2px solid ${activeSpot ? (activeConfig?.color || designTokens.colors.accent.lilac) : designTokens.colors.secondary.stone}40`,
            boxShadow: designTokens.elevation.medium,
          }}
        >
          {activeConfig ? (
            <img src={activeConfig.iconUrl} alt={activeConfig.label} className="h-6 w-6 object-contain flex-shrink-0" />
          ) : (
            <MapPin className="h-5 w-5 flex-shrink-0" style={{ color: designTokens.colors.text.primary }} />
          )}
        </div>
        <span
          className="text-[10px] font-semibold leading-none"
          style={{
            color: activeSpot ? (activeConfig?.color || designTokens.colors.text.primary) : designTokens.colors.text.primary,
            textShadow: '0 0 4px rgba(255,255,255,0.8)',
          }}
        >
          {activeConfig ? activeConfig.label : 'スポット'}
        </span>
        {activeSpot && (
          <span
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center"
            style={{ background: designTokens.colors.text.secondary }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(null);
            }}
          >
            <X className="h-3 w-3" style={{ color: '#fff' }} />
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

                {/* スポット選択グリッド（4列） */}
                <div className="grid grid-cols-4 gap-2">
                  {SPOT_CONFIGS.map(config => {
                    const isActive = activeSpot === config.type;
                    const isLoading = loadingSpot === config.type;
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
                          className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
                          style={{
                            background: designTokens.colors.background.white,
                            border: `2px solid ${isActive ? config.color : `${config.color}25`}`,
                          }}
                        >
                          <img
                            src={config.iconUrl}
                            alt={config.label}
                            className={`h-5 w-5 object-contain ${isLoading ? 'animate-pulse' : ''}`}
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
