'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLORS } from '@/lib/constants';

// タイムラインのスポットデータ型
export interface TimelineSpotData {
  id: string;
  storeName: string;
  hasImage?: boolean; // 未使用だが互換性のため残す
  isComplete?: boolean; // 未使用だが互換性のため残す
}

interface ReorderableTimelineProps {
  spots: TimelineSpotData[];
  currentIndex: number;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  className?: string;
}

// メインの並び替え可能タイムラインコンポーネント
export function ReorderableTimeline({
  spots,
  currentIndex,
  onReorder,
  onSelect,
  onRemove,
  onAdd,
  className,
}: ReorderableTimelineProps) {
  const handleMoveLeft = (index: number) => {
    if (index > 0) {
      onReorder(index, index - 1);
    }
  };

  const handleMoveRight = (index: number) => {
    if (index < spots.length - 1) {
      onReorder(index, index + 1);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-3 gap-2">
        {spots.map((spot, index) => {
          const isSelected = currentIndex === index;
          const isFirst = index === 0;
          const isLast = index === spots.length - 1;

          return (
            <motion.div
              key={spot.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 400, 
                damping: 30 
              }}
              className={cn(
                "relative p-3 rounded-lg border-2 cursor-pointer transition-colors"
              )}
              style={{
                backgroundColor: isSelected ? COLORS.primaryDark : COLORS.surface,
                borderColor: isSelected ? COLORS.primaryDark : COLORS.border,
              }}
              onClick={() => onSelect(index)}
            >
              {/* 番号バッジ */}
              <div 
                className={cn(
                  "absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md"
                )}
                style={{
                  backgroundColor: isSelected ? COLORS.surface : COLORS.primaryDark,
                  color: isSelected ? COLORS.primaryDark : COLORS.cream,
                }}
              >
                {index + 1}
              </div>

              {/* スポット名のみ表示 */}
              <div 
                className={cn("text-sm font-bold truncate mt-1 pr-6", isSelected && "text-white")}
                style={!isSelected ? { color: COLORS.textPrimary } : undefined}
              >
                {spot.storeName || `スポット${index + 1}`}
              </div>

              {/* 矢印ボタン（順番変更） */}
              <div className="flex items-center gap-1 mt-2">
                {/* 左矢印（前に移動） */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveLeft(index);
                  }}
                  disabled={isFirst}
                  className={cn(
                    "w-6 h-6 rounded flex items-center justify-center transition-all",
                    isFirst 
                      ? "opacity-30 cursor-not-allowed" 
                      :                 isSelected 
                      ? "bg-white/20 hover:bg-white/30 text-white" 
                      : ""
                  )}
                  style={!isSelected && !isFirst ? { backgroundColor: COLORS.background, color: COLORS.primaryDark } : undefined}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* 右矢印（後ろに移動） */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveRight(index);
                  }}
                  disabled={isLast}
                  className={cn(
                    "w-6 h-6 rounded flex items-center justify-center transition-all",
                    isLast 
                      ? "opacity-30 cursor-not-allowed" 
                      : isSelected 
                        ? "bg-white/20 hover:bg-white/30 text-white" 
                        : ""
                  )}
                  style={!isSelected && !isLast ? { backgroundColor: COLORS.background, color: COLORS.primaryDark } : undefined}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* 削除ボタン */}
              {spots.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(index);
                  }}
                  className={cn(
                    "absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all",
                    isSelected
                      ? "bg-red-400 text-white hover:bg-red-500"
                      : "bg-red-100 hover:bg-red-200"
                  )}
                  style={!isSelected ? { color: COLORS.error } : undefined}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* スポット追加ボタン */}
      <motion.button
        type="button"
        onClick={onAdd}
        className="w-full p-3 rounded-lg border-2 border-dashed transition-all flex items-center justify-center gap-2"
        style={{
          borderColor: COLORS.border,
          backgroundColor: `${COLORS.surface}80`,
        }}
        whileHover={{ scale: 1.01, borderColor: COLORS.primary, backgroundColor: COLORS.background }}
        whileTap={{ scale: 0.99 }}
      >
        <Plus className="h-5 w-5" style={{ color: COLORS.primary }} />
        <span className="text-sm font-medium" style={{ color: COLORS.primary }}>スポットを追加</span>
      </motion.button>
    </div>
  );
}

export default ReorderableTimeline;
