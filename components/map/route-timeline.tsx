"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  MapPin, Clock, ChevronUp, ChevronDown, Trash2, GripVertical,
  Utensils, Bed, Camera, Coffee, ShoppingBag, Landmark, Music,
  Heart, Star, Sparkles, Mountain, Waves, TreePine, Building,
  Bus, Train, Car, Bike, Footprints, Navigation
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TransportDetailInput, TransportDetails, TransportSummary, DETAILED_TRANSPORT_OPTIONS } from './transport-detail-input';

// スポットのカテゴリアイコン
export const SPOT_CATEGORIES = [
  { value: 'restaurant', label: '食事', icon: Utensils, color: '#ef4444' },
  { value: 'cafe', label: 'カフェ', icon: Coffee, color: '#8b5cf6' },
  { value: 'hotel', label: '宿泊', icon: Bed, color: '#3b82f6' },
  { value: 'viewpoint', label: '絶景', icon: Camera, color: '#22c55e' },
  { value: 'shopping', label: '買い物', icon: ShoppingBag, color: '#f59e0b' },
  { value: 'landmark', label: '名所', icon: Landmark, color: '#8b6914' },
  { value: 'entertainment', label: '娯楽', icon: Music, color: '#ec4899' },
  { value: 'nature', label: '自然', icon: TreePine, color: '#16a34a' },
  { value: 'beach', label: '海', icon: Waves, color: '#0ea5e9' },
  { value: 'mountain', label: '山', icon: Mountain, color: '#78716c' },
  { value: 'temple', label: '寺社', icon: Building, color: '#dc2626' },
  { value: 'favorite', label: 'お気に入り', icon: Heart, color: '#f43f5e' },
  { value: 'recommended', label: 'おすすめ', icon: Star, color: '#eab308' },
  { value: 'special', label: '特別', icon: Sparkles, color: '#a855f7' },
] as const;

export type SpotCategory = typeof SPOT_CATEGORIES[number]['value'];

// スポットデータの型
export interface TimelineSpot {
  id: string;
  name: string;
  category?: SpotCategory;
  stayDuration?: number; // 滞在時間（分）
  latitude?: number;
  longitude?: number;
  note?: string;
}

// 移動区間データの型
export interface TimelineTransport {
  fromSpotId: string;
  toSpotId: string;
  details: TransportDetails;
}

interface RouteTimelineProps {
  spots: TimelineSpot[];
  transports: TimelineTransport[];
  onSpotsChange: (spots: TimelineSpot[]) => void;
  onTransportsChange: (transports: TimelineTransport[]) => void;
  onSpotSelect: (spotId: string) => void;
  selectedSpotId?: string;
  onRemoveSpot: (spotId: string) => void;
  className?: string;
}

/**
 * 旅の行程を表示・編集するタイムラインコンポーネント
 * - ドラッグ&ドロップで順序変更
 * - スポットごとにカテゴリアイコン設定
 * - 移動区間の詳細入力
 * - 地図との双方向連動
 */
export function RouteTimeline({
  spots,
  transports,
  onSpotsChange,
  onTransportsChange,
  onSpotSelect,
  selectedSpotId,
  onRemoveSpot,
  className = '',
}: RouteTimelineProps) {
  const [expandedTransportIndex, setExpandedTransportIndex] = useState<number | null>(null);

  // スポットのカテゴリを更新
  const updateSpotCategory = (spotId: string, category: SpotCategory) => {
    const newSpots = spots.map(spot =>
      spot.id === spotId ? { ...spot, category } : spot
    );
    onSpotsChange(newSpots);
  };

  // スポットの滞在時間を更新
  const updateSpotStayDuration = (spotId: string, duration: number | undefined) => {
    const newSpots = spots.map(spot =>
      spot.id === spotId ? { ...spot, stayDuration: duration } : spot
    );
    onSpotsChange(newSpots);
  };

  // 移動詳細を更新
  const updateTransport = (fromSpotId: string, toSpotId: string, details: TransportDetails) => {
    const existingIndex = transports.findIndex(
      t => t.fromSpotId === fromSpotId && t.toSpotId === toSpotId
    );

    if (existingIndex >= 0) {
      const newTransports = [...transports];
      newTransports[existingIndex] = { fromSpotId, toSpotId, details };
      onTransportsChange(newTransports);
    } else {
      onTransportsChange([...transports, { fromSpotId, toSpotId, details }]);
    }
  };

  // 移動詳細を取得
  const getTransport = (fromSpotId: string, toSpotId: string): TransportDetails => {
    const transport = transports.find(
      t => t.fromSpotId === fromSpotId && t.toSpotId === toSpotId
    );
    return transport?.details || { type: 'none' };
  };

  // 丸数字変換
  const toCircledNumber = (num: number): string => {
    const circled = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩',
      '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'];
    return circled[num - 1] || `${num}`;
  };

  // 総所要時間を計算
  const calculateTotalTime = (): number => {
    let total = 0;
    
    // 滞在時間
    spots.forEach(spot => {
      if (spot.stayDuration) total += spot.stayDuration;
    });
    
    // 移動時間
    transports.forEach(transport => {
      if (transport.details.travelTime) total += transport.details.travelTime;
    });
    
    return total;
  };

  const totalMinutes = calculateTotalTime();
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  return (
    <div className={`bg-[#fdf5e6] rounded-xl border-2 border-[#d4c4a8] shadow-lg overflow-hidden ${className}`}>
      {/* ヘッダー */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#8b6914] to-[#5c3a21] text-[#ffecd2]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            <h3 className="text-base font-bold">旅の行程</h3>
          </div>
          {totalMinutes > 0 && (
            <div className="flex items-center gap-1 text-sm bg-[#ffecd2]/20 px-2 py-1 rounded-full">
              <Clock className="h-4 w-4" />
              <span className="font-medium">
                {totalHours > 0 ? `${totalHours}時間` : ''}{remainingMinutes > 0 ? `${remainingMinutes}分` : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* タイムライン本体 */}
      <div className="p-4">
        {spots.length === 0 ? (
          <div className="text-center py-8 text-[#8b7355]">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">スポットを追加して旅の計画を始めましょう</p>
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={spots}
            onReorder={onSpotsChange}
            className="space-y-0"
          >
            {spots.map((spot, index) => {
              const category = SPOT_CATEGORIES.find(c => c.value === spot.category);
              const CategoryIcon = category?.icon || MapPin;
              const isSelected = spot.id === selectedSpotId;
              const isLast = index === spots.length - 1;

              return (
                <React.Fragment key={spot.id}>
                  {/* スポットカード */}
                  <Reorder.Item
                    value={spot}
                    className="relative"
                  >
                    <div className="flex items-start gap-3">
                      {/* タイムラインのドット＆ライン */}
                      <div className="relative flex flex-col items-center">
                        {/* ドット */}
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          className={`
                            relative z-10 w-10 h-10 rounded-full flex items-center justify-center
                            shadow-md cursor-pointer transition-all
                            ${isSelected
                              ? 'bg-[#8b6914] ring-2 ring-[#ffecd2] ring-offset-2'
                              : 'bg-[#5c3a21]'
                            }
                          `}
                          onClick={() => onSpotSelect(spot.id)}
                        >
                          <span className="text-[#ffecd2] font-bold text-sm">
                            {toCircledNumber(index + 1)}
                          </span>
                        </motion.div>
                        
                        {/* 縦線 */}
                        {!isLast && (
                          <div className="w-0.5 flex-1 bg-[#d4c4a8] min-h-[60px]" />
                        )}
                      </div>

                      {/* スポット情報カード */}
                      <motion.div
                        whileHover={{ y: -2 }}
                        className={`
                          flex-1 p-3 rounded-xl border-2 transition-all cursor-pointer mb-2
                          ${isSelected
                            ? 'border-[#8b6914] bg-[#fff8f0] shadow-md'
                            : 'border-[#e8d5c4] bg-white hover:border-[#8b7355]'
                          }
                        `}
                        onClick={() => onSpotSelect(spot.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          {/* 左側：カテゴリ＆名前 */}
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            {/* カテゴリアイコン選択 */}
                            <CategoryIconSelector
                              value={spot.category}
                              onChange={(cat) => updateSpotCategory(spot.id, cat)}
                              currentIcon={CategoryIcon}
                              currentColor={category?.color || '#5c3a21'}
                            />
                            
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-[#3d2914] truncate">
                                {spot.name || `スポット${index + 1}`}
                              </h4>
                              
                              {/* 滞在時間 */}
                              <div className="flex items-center gap-2 mt-1">
                                <Clock className="h-3.5 w-3.5 text-[#8b7355]" />
                                <input
                                  type="number"
                                  placeholder="30"
                                  className="w-12 h-6 text-xs text-center border border-[#d4c4a8] rounded bg-white"
                                  style={{ fontSize: '14px' }}
                                  min={0}
                                  max={480}
                                  value={spot.stayDuration || ''}
                                  onChange={(e) => updateSpotStayDuration(
                                    spot.id,
                                    e.target.value ? parseInt(e.target.value) : undefined
                                  )}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <span className="text-xs text-[#8b7355]">分滞在</span>
                              </div>
                            </div>
                          </div>

                          {/* 右側：操作ボタン */}
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {/* ドラッグハンドル */}
                            <div className="cursor-grab active:cursor-grabbing p-1 hover:bg-[#fef3e8] rounded">
                              <GripVertical className="h-4 w-4 text-[#8b7355]" />
                            </div>
                            
                            {/* 削除ボタン */}
                            {spots.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 p-0 hover:bg-red-50"
                                onClick={() => onRemoveSpot(spot.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </Reorder.Item>

                  {/* 移動区間（最後のスポット以外） */}
                  {!isLast && (
                    <div className="flex items-start gap-3 ml-5 pl-[14px]">
                      <div className="flex-1 mb-3">
                        <TransportSection
                          fromSpot={spot}
                          toSpot={spots[index + 1]}
                          details={getTransport(spot.id, spots[index + 1].id)}
                          onChange={(details) => updateTransport(spot.id, spots[index + 1].id, details)}
                          isExpanded={expandedTransportIndex === index}
                          onToggle={() => setExpandedTransportIndex(
                            expandedTransportIndex === index ? null : index
                          )}
                        />
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </Reorder.Group>
        )}
      </div>
    </div>
  );
}

/**
 * カテゴリアイコン選択コンポーネント
 */
function CategoryIconSelector({
  value,
  onChange,
  currentIcon: CurrentIcon,
  currentColor,
}: {
  value?: SpotCategory;
  onChange: (category: SpotCategory) => void;
  currentIcon: React.ElementType;
  currentColor: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <motion.button
        type="button"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all border-2"
        style={{
          backgroundColor: `${currentColor}15`,
          borderColor: `${currentColor}40`,
        }}
      >
        <CurrentIcon className="h-4 w-4" style={{ color: currentColor }} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* オーバーレイ */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* ドロップダウン */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl shadow-xl border-2 border-[#d4c4a8] p-2 grid grid-cols-4 gap-1 w-48"
            >
              {SPOT_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = value === cat.value;
                
                return (
                  <motion.button
                    key={cat.value}
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(cat.value);
                      setIsOpen(false);
                    }}
                    className={`
                      w-10 h-10 rounded-lg flex items-center justify-center transition-all
                      ${isSelected ? 'ring-2 ring-offset-1' : 'hover:bg-gray-100'}
                    `}
                    style={{
                      backgroundColor: isSelected ? `${cat.color}20` : undefined,
                      '--tw-ring-color': isSelected ? cat.color : undefined,
                    } as React.CSSProperties}
                    title={cat.label}
                  >
                    <Icon className="h-5 w-5" style={{ color: cat.color }} />
                  </motion.button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * 移動区間セクション
 */
function TransportSection({
  fromSpot,
  toSpot,
  details,
  onChange,
  isExpanded,
  onToggle,
}: {
  fromSpot: TimelineSpot;
  toSpot: TimelineSpot;
  details: TransportDetails;
  onChange: (details: TransportDetails) => void;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const option = DETAILED_TRANSPORT_OPTIONS.find(opt => opt.value === details.type);
  const Icon = option?.lucideIcon || Navigation;

  return (
    <div className="rounded-lg border border-dashed border-[#d4c4a8] bg-[#fff8f0] overflow-hidden">
      {/* コンパクト表示 */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#fef3e8] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon
            className="h-4 w-4"
            style={{ color: option?.color || '#8b7355' }}
          />
          {details.type !== 'none' ? (
            <TransportSummary details={details} />
          ) : (
            <span className="text-sm text-[#8b7355]">移動手段を設定</span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-[#8b7355]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[#8b7355]" />
        )}
      </button>

      {/* 展開時の詳細入力 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-[#e8d5c4]">
              <TransportDetailInput
                value={details}
                onChange={onChange}
                fromSpotName={fromSpot.name}
                toSpotName={toSpot.name}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RouteTimeline;

