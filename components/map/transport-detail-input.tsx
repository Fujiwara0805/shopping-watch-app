"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, ChevronUp, Bus, Train, Car, Bike, 
  Footprints, MapPin, Clock, Navigation, Info,
  CircleDot, ArrowRight, Plane, Ship, Plus, Trash2, GripVertical
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

// 移動手段の詳細な選択肢
export const DETAILED_TRANSPORT_OPTIONS = [
  { 
    value: 'none', 
    label: '選択なし', 
    icon: '−',
    lucideIcon: CircleDot,
    color: '#9ca3af',
    hasDetails: false,
  },
  { 
    value: 'walk', 
    label: '徒歩', 
    icon: '🚶',
    lucideIcon: Footprints,
    color: '#22c55e',
    hasDetails: false,
  },
  { 
    value: 'bus', 
    label: 'バス', 
    icon: '🚌',
    lucideIcon: Bus,
    color: '#3b82f6',
    hasDetails: true,
    detailFields: ['departureStop', 'arrivalStop', 'busLine', 'fare'],
  },
  { 
    value: 'taxi', 
    label: 'タクシー', 
    icon: '🚕',
    lucideIcon: Car,
    color: '#f59e0b',
    hasDetails: true,
    detailFields: ['fare', 'note'],
  },
  { 
    value: 'car', 
    label: '車', 
    icon: '🚗',
    lucideIcon: Car,
    color: '#ef4444',
    hasDetails: true,
    detailFields: ['parkingInfo', 'note'],
  },
  { 
    value: 'bicycle', 
    label: '自転車', 
    icon: '🚲',
    lucideIcon: Bike,
    color: '#8b5cf6',
    hasDetails: true,
    detailFields: ['rentalInfo', 'note'],
  },
  { 
    value: 'train', 
    label: '電車', 
    icon: '🚃',
    lucideIcon: Train,
    color: '#06b6d4',
    hasDetails: true,
    detailFields: ['departureStation', 'arrivalStation', 'lineName', 'fare'],
  },
  { 
    value: 'airplane', 
    label: '飛行機', 
    icon: '✈️',
    lucideIcon: Plane,
    color: '#0ea5e9',
    hasDetails: true,
    detailFields: ['departureAirport', 'arrivalAirport', 'flightNumber', 'fare'],
  },
  { 
    value: 'ferry', 
    label: '船', 
    icon: '🚢',
    lucideIcon: Ship,
    color: '#0891b2',
    hasDetails: true,
    detailFields: ['departurePort', 'arrivalPort', 'ferryLine', 'fare'],
  },
] as const;

export type TransportType = typeof DETAILED_TRANSPORT_OPTIONS[number]['value'];

// 個別の移動区間データの型
export interface TransportSegment {
  id: string;
  type: TransportType;
  travelTime?: number; // 所要時間（分）
  departureStop?: string; // 出発バス停
  arrivalStop?: string; // 到着バス停
  busLine?: string; // バス路線名
  departureStation?: string; // 出発駅
  arrivalStation?: string; // 到着駅
  lineName?: string; // 路線名
  fare?: number; // 運賃
  parkingInfo?: string; // 駐車場情報
  rentalInfo?: string; // レンタル情報
  note?: string; // メモ
  // 飛行機用フィールド
  departureAirport?: string; // 出発空港
  arrivalAirport?: string; // 到着空港
  flightNumber?: string; // 便名
  // 船用フィールド
  departurePort?: string; // 出発港
  arrivalPort?: string; // 到着港
  ferryLine?: string; // フェリー路線名
}

// 移動詳細データの型（後方互換性のため）
export interface TransportDetails {
  type: TransportType;
  travelTime?: number;
  departureStop?: string;
  arrivalStop?: string;
  busLine?: string;
  departureStation?: string;
  arrivalStation?: string;
  lineName?: string;
  fare?: number;
  parkingInfo?: string;
  rentalInfo?: string;
  note?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  flightNumber?: string;
  departurePort?: string;
  arrivalPort?: string;
  ferryLine?: string;
  // 乗り換え用フィールド
  segments?: TransportSegment[];
}

// 新しいセグメントを作成するヘルパー
const createNewSegment = (): TransportSegment => ({
  id: crypto.randomUUID(),
  type: 'none',
});

interface TransportDetailInputProps {
  value: TransportDetails;
  onChange: (details: TransportDetails) => void;
  label?: string;
  fromSpotName?: string;
  toSpotName?: string;
  className?: string;
}

/**
 * 詳細な移動手段入力コンポーネント（乗り換え対応版）
 * 複数の移動手段を組み合わせて登録可能
 */
export function TransportDetailInput({
  value,
  onChange,
  label = "移動手段",
  fromSpotName,
  toSpotName,
  className = "",
}: TransportDetailInputProps) {
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set());
  
  // セグメントが存在しない場合は初期化
  const segments = value.segments && value.segments.length > 0 
    ? value.segments 
    : [{ ...createNewSegment(), type: value.type || 'none', travelTime: value.travelTime }];

  // セグメントの展開/折りたたみ
  const toggleSegmentExpand = (segmentId: string) => {
    setExpandedSegments(prev => {
      const next = new Set(prev);
      if (next.has(segmentId)) {
        next.delete(segmentId);
      } else {
        next.add(segmentId);
      }
      return next;
    });
  };

  // セグメントを追加
  const addSegment = () => {
    const newSegment = createNewSegment();
    const newSegments = [...segments, newSegment];
    onChange({
      ...value,
      type: 'none', // 複数セグメントの場合はtypeは'none'
      segments: newSegments,
    });
    setExpandedSegments(prev => new Set(prev).add(newSegment.id));
  };

  // セグメントを削除
  const removeSegment = (segmentId: string) => {
    const newSegments = segments.filter(s => s.id !== segmentId);
    if (newSegments.length === 0) {
      // 最後のセグメントを削除した場合は空のセグメントを追加
      const emptySegment = createNewSegment();
      onChange({
        ...value,
        type: 'none',
        segments: [emptySegment],
      });
    } else {
      onChange({
        ...value,
        type: newSegments.length === 1 ? newSegments[0].type : 'none',
        segments: newSegments,
      });
    }
  };

  // セグメントを更新
  const updateSegment = (segmentId: string, updates: Partial<TransportSegment>) => {
    const newSegments = segments.map(s => 
      s.id === segmentId ? { ...s, ...updates } : s
    );
    onChange({
      ...value,
      type: newSegments.length === 1 ? newSegments[0].type : 'none',
      segments: newSegments,
    });
  };

  // 合計所要時間を計算
  const totalTravelTime = segments.reduce((sum, s) => sum + (s.travelTime || 0), 0);
  
  // 合計運賃を計算
  const totalFare = segments.reduce((sum, s) => sum + (s.fare || 0), 0);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* ヘッダー：移動元→移動先の表示 */}
      {(fromSpotName || toSpotName) && (
        <div className="flex items-center gap-2 text-sm text-[#5c3a21] bg-[#fef3e8] px-3 py-2 rounded-lg border border-[#d4c4a8]">
          <MapPin className="h-4 w-4 text-[#8b6914]" />
          <span className="font-medium truncate max-w-[100px]">{fromSpotName || '出発地'}</span>
          <ArrowRight className="h-4 w-4 text-[#8b7355] flex-shrink-0" />
          <span className="font-medium truncate max-w-[100px]">{toSpotName || '目的地'}</span>
        </div>
      )}

      {/* ラベル */}
      <Label className="text-sm font-semibold mb-2 block text-[#3d2914]">
        <Navigation className="inline-block mr-1.5 h-4 w-4" />
        {label}
        {segments.length > 1 && (
          <span className="ml-2 text-xs font-normal text-[#8b6914] bg-[#fef3e8] px-2 py-0.5 rounded-full">
            乗り換え{segments.length - 1}回
          </span>
        )}
      </Label>

      {/* セグメントリスト */}
      <div className="space-y-3">
        {segments.map((segment, index) => (
          <TransportSegmentCard
            key={segment.id}
            segment={segment}
            index={index}
            totalSegments={segments.length}
            isExpanded={expandedSegments.has(segment.id)}
            onToggleExpand={() => toggleSegmentExpand(segment.id)}
            onUpdate={(updates) => updateSegment(segment.id, updates)}
            onRemove={() => removeSegment(segment.id)}
            canRemove={segments.length > 1 || segment.type !== 'none'}
          />
        ))}
      </div>

      {/* 乗り換え追加ボタン */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={addSegment}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#fff8f0] hover:bg-[#fef3e8] text-[#8b6914] border-2 border-dashed border-[#d4c4a8] rounded-xl transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span className="text-sm font-medium">乗り換えを追加</span>
      </motion.button>

      {/* 合計情報 */}
      {segments.length > 1 && (totalTravelTime > 0 || totalFare > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#8b6914]/10 to-[#d4c4a8]/20 rounded-xl border border-[#d4c4a8]"
        >
          <span className="text-sm font-bold text-[#3d2914]">合計</span>
          <div className="flex items-center gap-4">
            {totalTravelTime > 0 && (
              <div className="flex items-center gap-1 text-sm text-[#5c3a21]">
                <Clock className="h-4 w-4" />
                <span className="font-medium">約{totalTravelTime}分</span>
              </div>
            )}
            {totalFare > 0 && (
              <div className="text-sm font-bold text-[#8b6914]">
                ¥{totalFare.toLocaleString()}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

/**
 * 個別の移動区間カードコンポーネント
 */
interface TransportSegmentCardProps {
  segment: TransportSegment;
  index: number;
  totalSegments: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<TransportSegment>) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function TransportSegmentCard({
  segment,
  index,
  totalSegments,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onRemove,
  canRemove,
}: TransportSegmentCardProps) {
  const selectedOption = DETAILED_TRANSPORT_OPTIONS.find(opt => opt.value === segment.type);
  const hasDetails = selectedOption?.hasDetails ?? false;

  const handleTypeChange = (type: TransportType) => {
    onUpdate({ type });
    if (type !== 'none' && DETAILED_TRANSPORT_OPTIONS.find(opt => opt.value === type)?.hasDetails) {
      onToggleExpand();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white rounded-xl border-2 border-[#e8d5c4] overflow-hidden"
    >
      {/* セグメントヘッダー */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#fdf5e6] border-b border-[#e8d5c4]">
        <div className="flex items-center gap-2 flex-1">
          <span className="flex items-center justify-center w-6 h-6 bg-[#8b6914] text-white text-xs font-bold rounded-full">
            {index + 1}
          </span>
          {totalSegments > 1 && (
            <span className="text-xs text-[#8b7355]">
              {index === 0 ? '最初の移動' : index === totalSegments - 1 ? '最後の移動' : `${index + 1}番目の移動`}
            </span>
          )}
        </div>
        
        {/* 削除ボタン */}
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* セグメント内容 */}
      <div className="p-3 space-y-3">
        {/* 移動手段選択 */}
        <div className="grid grid-cols-5 gap-1.5">
          {DETAILED_TRANSPORT_OPTIONS.filter(opt => opt.value !== 'none').map((option) => {
            const OptionIcon = option.lucideIcon;
            const isSelected = segment.type === option.value;
            
            return (
              <motion.button
                key={option.value}
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleTypeChange(option.value)}
                className={`
                  relative flex flex-col items-center justify-center p-2 rounded-lg border transition-all
                  ${isSelected 
                    ? 'border-[#8b6914] bg-[#fef3e8] shadow-sm' 
                    : 'border-[#e8d5c4] bg-white hover:border-[#8b7355] hover:bg-[#fff8f0]'
                  }
                `}
              >
                <OptionIcon 
                  className="h-4 w-4 mb-0.5" 
                  style={{ color: isSelected ? option.color : '#8b7355' }}
                />
                <span className={`text-[10px] font-medium ${isSelected ? 'text-[#3d2914]' : 'text-[#5c3a21]'}`}>
                  {option.label}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* 所要時間入力 */}
        {segment.type !== 'none' && (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label className="text-xs font-medium text-[#5c3a21] mb-1 block">
                <Clock className="inline-block mr-1 h-3 w-3" />
                所要時間
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="10"
                  className="h-9 w-20 text-center rounded-lg bg-white border-[#d4c4a8] focus:border-[#8b6914]"
                  style={{ fontSize: '16px' }}
                  min={1}
                  max={480}
                  value={segment.travelTime || ''}
                  onChange={(e) => onUpdate({ travelTime: e.target.value ? parseInt(e.target.value) : undefined })}
                />
                <span className="text-sm text-[#5c3a21]">分</span>
              </div>
            </div>
            
            {/* 詳細入力トグル */}
            {hasDetails && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onToggleExpand}
                className="mt-5 border-[#8b6914] text-[#8b6914] hover:bg-[#fef3e8] h-9"
              >
                <Info className="h-3 w-3 mr-1" />
                詳細
                {isExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
              </Button>
            )}
          </div>
        )}

        {/* 詳細入力フォーム */}
        <AnimatePresence>
          {isExpanded && hasDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-3 bg-[#fdf5e6] rounded-lg border border-dashed border-[#d4c4a8] space-y-3">
                <SegmentDetailFields segment={segment} onUpdate={onUpdate} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/**
 * セグメントの詳細入力フィールド
 */
function SegmentDetailFields({
  segment,
  onUpdate,
}: {
  segment: TransportSegment;
  onUpdate: (updates: Partial<TransportSegment>) => void;
}) {
  switch (segment.type) {
    case 'bus':
      return <BusDetailFields segment={segment} onUpdate={onUpdate} />;
    case 'train':
      return <TrainDetailFields segment={segment} onUpdate={onUpdate} />;
    case 'taxi':
      return <TaxiDetailFields segment={segment} onUpdate={onUpdate} />;
    case 'car':
      return <CarDetailFields segment={segment} onUpdate={onUpdate} />;
    case 'bicycle':
      return <BicycleDetailFields segment={segment} onUpdate={onUpdate} />;
    case 'airplane':
      return <AirplaneDetailFields segment={segment} onUpdate={onUpdate} />;
    case 'ferry':
      return <FerryDetailFields segment={segment} onUpdate={onUpdate} />;
    default:
      return null;
  }
}

/**
 * バス移動の詳細入力フィールド
 */
function BusDetailFields({ 
  segment, 
  onUpdate 
}: { 
  segment: TransportSegment; 
  onUpdate: (updates: Partial<TransportSegment>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Bus className="h-4 w-4 text-[#3b82f6]" />
        <span className="text-xs font-bold text-[#3d2914]">バス移動の詳細</span>
      </div>
      
      {/* 出発・到着バス停 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] font-medium text-[#5c3a21] mb-1 block">
            出発バス停
          </Label>
          <Input
            type="text"
            placeholder="例: 大分駅前"
            className="h-9 text-sm rounded-lg bg-white border-[#d4c4a8] focus:border-[#3b82f6]"
            value={segment.departureStop || ''}
            onChange={(e) => onUpdate({ departureStop: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-[10px] font-medium text-[#5c3a21] mb-1 block">
            到着バス停
          </Label>
          <Input
            type="text"
            placeholder="例: 別府北浜"
            className="h-9 text-sm rounded-lg bg-white border-[#d4c4a8] focus:border-[#3b82f6]"
            value={segment.arrivalStop || ''}
            onChange={(e) => onUpdate({ arrivalStop: e.target.value })}
          />
        </div>
      </div>

      {/* 路線名・運賃 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] font-medium text-[#5c3a21] mb-1 block">
            路線名
          </Label>
          <Input
            type="text"
            placeholder="例: 大分交通 AS60"
            className="h-9 text-sm rounded-lg bg-white border-[#d4c4a8]"
            value={segment.busLine || ''}
            onChange={(e) => onUpdate({ busLine: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-[10px] font-medium text-[#5c3a21] mb-1 block">
            運賃（円）
          </Label>
          <Input
            type="number"
            placeholder="500"
            className="h-9 text-sm rounded-lg bg-white border-[#d4c4a8]"
            style={{ fontSize: '16px' }}
            min={0}
            value={segment.fare || ''}
            onChange={(e) => onUpdate({ fare: e.target.value ? parseInt(e.target.value) : undefined })}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * 電車移動の詳細入力フィールド
 */
function TrainDetailFields({ 
  segment, 
  onUpdate 
}: { 
  segment: TransportSegment; 
  onUpdate: (updates: Partial<TransportSegment>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Train className="h-4 w-4 text-[#06b6d4]" />
        <span className="text-xs font-bold text-[#3d2914]">電車移動の詳細</span>
      </div>
      
      {/* 出発・到着駅 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] font-medium text-[#5c3a21] mb-1 block">
            出発駅
          </Label>
          <Input
            type="text"
            placeholder="例: 大分駅"
            className="h-9 text-sm rounded-lg bg-white border-[#d4c4a8] focus:border-[#06b6d4]"
            value={segment.departureStation || ''}
            onChange={(e) => onUpdate({ departureStation: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-[10px] font-medium text-[#5c3a21] mb-1 block">
            到着駅
          </Label>
          <Input
            type="text"
            placeholder="例: 別府駅"
            className="h-9 text-sm rounded-lg bg-white border-[#d4c4a8] focus:border-[#06b6d4]"
            value={segment.arrivalStation || ''}
            onChange={(e) => onUpdate({ arrivalStation: e.target.value })}
          />
        </div>
      </div>

      {/* 路線名・運賃 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] font-medium text-[#5c3a21] mb-1 block">
            路線名
          </Label>
          <Input
            type="text"
            placeholder="例: JR日豊本線"
            className="h-9 text-sm rounded-lg bg-white border-[#d4c4a8]"
            value={segment.lineName || ''}
            onChange={(e) => onUpdate({ lineName: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-[10px] font-medium text-[#5c3a21] mb-1 block">
            運賃（円）
          </Label>
          <Input
            type="number"
            placeholder="280"
            className="h-9 text-sm rounded-lg bg-white border-[#d4c4a8]"
            style={{ fontSize: '16px' }}
            min={0}
            value={segment.fare || ''}
            onChange={(e) => onUpdate({ fare: e.target.value ? parseInt(e.target.value) : undefined })}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * タクシー移動の詳細入力フィールド
 */
function TaxiDetailFields({ 
  segment, 
  onUpdate 
}: { 
  segment: TransportSegment; 
  onUpdate: (updates: Partial<TransportSegment>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Car className="h-4 w-4 text-[#f59e0b]" />
        <span className="text-xs font-bold text-[#3d2914]">タクシー移動の詳細</span>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] font-medium text-[#5c3a21] mb-1 block">
            想定運賃（円）
          </Label>
          <Input
            type="number"
            placeholder="1500"
            className="h-9 text-sm rounded-lg bg-white border-[#d4c4a8]"
            style={{ fontSize: '16px' }}
            min={0}
            value={segment.fare || ''}
            onChange={(e) => onUpdate({ fare: e.target.value ? parseInt(e.target.value) : undefined })}
          />
        </div>
        <div>
          <Label className="text-[10px] font-medium text-[#5c3a21] mb-1 block">
            メモ
          </Label>
          <Input
            type="text"
            placeholder="例: 予約推奨"
            className="h-9 text-sm rounded-lg bg-white border-[#d4c4a8]"
            value={segment.note || ''}
            onChange={(e) => onUpdate({ note: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * 車移動の詳細入力フィールド
 */
function CarDetailFields({ 
  segment, 
  onUpdate 
}: { 
  segment: TransportSegment; 
  onUpdate: (updates: Partial<TransportSegment>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Car className="h-4 w-4 text-[#ef4444]" />
        <span className="text-xs font-bold text-[#3d2914]">車移動の詳細</span>
      </div>
      
      <div>
        <Label className="text-[10px] font-medium text-[#5c3a21] mb-1 block">
          駐車場情報
        </Label>
        <Input
          type="text"
          placeholder="例: 無料駐車場あり（50台）"
          className="h-9 text-sm rounded-lg bg-white border-[#d4c4a8]"
          value={segment.parkingInfo || ''}
          onChange={(e) => onUpdate({ parkingInfo: e.target.value })}
        />
      </div>
      
      <div>
        <Label className="text-[10px] font-medium text-[#5c3a21] mb-1 block">
          メモ
        </Label>
        <Input
          type="text"
          placeholder="例: 山道注意、カーナビ必須"
          className="h-9 text-sm rounded-lg bg-white border-[#d4c4a8]"
          value={segment.note || ''}
          onChange={(e) => onUpdate({ note: e.target.value })}
        />
      </div>
    </div>
  );
}

/**
 * 自転車移動の詳細入力フィールド
 */
function BicycleDetailFields({ 
  segment, 
  onUpdate 
}: { 
  segment: TransportSegment; 
  onUpdate: (updates: Partial<TransportSegment>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Bike className="h-4 w-4 text-[#8b5cf6]" />
        <span className="text-xs font-bold text-[#3d2914]">自転車移動の詳細</span>
      </div>
      
      <div>
        <Label className="text-[10px] font-medium text-[#5c3a21] mb-1 block">
          レンタル情報
        </Label>
        <Input
          type="text"
          placeholder="例: 駅前レンタサイクル 500円/日"
          className="h-9 text-sm rounded-lg bg-white border-[#d4c4a8]"
          value={segment.rentalInfo || ''}
          onChange={(e) => onUpdate({ rentalInfo: e.target.value })}
        />
      </div>
      
      <div>
        <Label className="text-[10px] font-medium text-[#5c3a21] mb-1 block">
          メモ
        </Label>
        <Input
          type="text"
          placeholder="例: 坂道多め、電動アシスト推奨"
          className="h-9 text-sm rounded-lg bg-white border-[#d4c4a8]"
          value={segment.note || ''}
          onChange={(e) => onUpdate({ note: e.target.value })}
        />
      </div>
    </div>
  );
}

/**
 * 飛行機移動の詳細入力フィールド
 */
function AirplaneDetailFields({ 
  segment, 
  onUpdate 
}: { 
  segment: TransportSegment; 
  onUpdate: (updates: Partial<TransportSegment>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Plane className="h-4 w-4 text-[#0ea5e9]" />
        <span className="text-xs font-bold text-[#3d2914]">飛行機移動の詳細</span>
      </div>
      
      {/* 出発・到着空港 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] font-medium text-[#5c3a21] mb-1 block">
            出発空港
          </Label>
          <Input
            type="text"
            placeholder="例: 羽田空港"
            className="h-9 text-sm rounded-lg bg-white border-[#d4c4a8] focus:border-[#0ea5e9]"
            value={segment.departureAirport || ''}
            onChange={(e) => onUpdate({ departureAirport: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-[10px] font-medium text-[#5c3a21] mb-1 block">
            到着空港
          </Label>
          <Input
            type="text"
            placeholder="例: 大分空港"
            className="h-9 text-sm rounded-lg bg-white border-[#d4c4a8] focus:border-[#0ea5e9]"
            value={segment.arrivalAirport || ''}
            onChange={(e) => onUpdate({ arrivalAirport: e.target.value })}
          />
        </div>
      </div>

      {/* 便名・運賃 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] font-medium text-[#5c3a21] mb-1 block">
            便名
          </Label>
          <Input
            type="text"
            placeholder="例: ANA 961"
            className="h-9 text-sm rounded-lg bg-white border-[#d4c4a8]"
            value={segment.flightNumber || ''}
            onChange={(e) => onUpdate({ flightNumber: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-[10px] font-medium text-[#5c3a21] mb-1 block">
            運賃（円）
          </Label>
          <Input
            type="number"
            placeholder="15000"
            className="h-9 text-sm rounded-lg bg-white border-[#d4c4a8]"
            style={{ fontSize: '16px' }}
            min={0}
            value={segment.fare || ''}
            onChange={(e) => onUpdate({ fare: e.target.value ? parseInt(e.target.value) : undefined })}
          />
        </div>
      </div>

      {/* メモ */}
      <div>
        <Label className="text-[10px] font-medium text-[#5c3a21] mb-1 block">
          メモ
        </Label>
        <Input
          type="text"
          placeholder="例: LCC利用、預け荷物別料金"
          className="h-9 text-sm rounded-lg bg-white border-[#d4c4a8]"
          value={segment.note || ''}
          onChange={(e) => onUpdate({ note: e.target.value })}
        />
      </div>
    </div>
  );
}

/**
 * 船移動の詳細入力フィールド
 */
function FerryDetailFields({ 
  segment, 
  onUpdate 
}: { 
  segment: TransportSegment; 
  onUpdate: (updates: Partial<TransportSegment>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Ship className="h-4 w-4 text-[#0891b2]" />
        <span className="text-xs font-bold text-[#3d2914]">船移動の詳細</span>
      </div>
      
      {/* 出発・到着港 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] font-medium text-[#5c3a21] mb-1 block">
            出発港
          </Label>
          <Input
            type="text"
            placeholder="例: 別府港"
            className="h-9 text-sm rounded-lg bg-white border-[#d4c4a8] focus:border-[#0891b2]"
            value={segment.departurePort || ''}
            onChange={(e) => onUpdate({ departurePort: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-[10px] font-medium text-[#5c3a21] mb-1 block">
            到着港
          </Label>
          <Input
            type="text"
            placeholder="例: 八幡浜港"
            className="h-9 text-sm rounded-lg bg-white border-[#d4c4a8] focus:border-[#0891b2]"
            value={segment.arrivalPort || ''}
            onChange={(e) => onUpdate({ arrivalPort: e.target.value })}
          />
        </div>
      </div>

      {/* 路線名・運賃 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] font-medium text-[#5c3a21] mb-1 block">
            フェリー路線名
          </Label>
          <Input
            type="text"
            placeholder="例: 宇和島運輸フェリー"
            className="h-9 text-sm rounded-lg bg-white border-[#d4c4a8]"
            value={segment.ferryLine || ''}
            onChange={(e) => onUpdate({ ferryLine: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-[10px] font-medium text-[#5c3a21] mb-1 block">
            運賃（円）
          </Label>
          <Input
            type="number"
            placeholder="3000"
            className="h-9 text-sm rounded-lg bg-white border-[#d4c4a8]"
            style={{ fontSize: '16px' }}
            min={0}
            value={segment.fare || ''}
            onChange={(e) => onUpdate({ fare: e.target.value ? parseInt(e.target.value) : undefined })}
          />
        </div>
      </div>

      {/* メモ */}
      <div>
        <Label className="text-[10px] font-medium text-[#5c3a21] mb-1 block">
          メモ
        </Label>
        <Input
          type="text"
          placeholder="例: 車両積載可、予約推奨"
          className="h-9 text-sm rounded-lg bg-white border-[#d4c4a8]"
          value={segment.note || ''}
          onChange={(e) => onUpdate({ note: e.target.value })}
        />
      </div>
    </div>
  );
}

/**
 * 移動手段のサマリー表示コンポーネント（乗り換え対応版）
 */
export function TransportSummary({ details }: { details: TransportDetails }) {
  const segments = details.segments && details.segments.length > 0 
    ? details.segments 
    : [details];

  // 有効なセグメントのみフィルタ
  const validSegments = segments.filter(s => s.type !== 'none');
  
  if (validSegments.length === 0) return null;

  // 合計所要時間と運賃を計算
  const totalTime = validSegments.reduce((sum, s) => sum + (s.travelTime || 0), 0);
  const totalFare = validSegments.reduce((sum, s) => sum + (s.fare || 0), 0);

  return (
    <div className="space-y-1">
      {/* 移動手段アイコン列 */}
      <div className="flex items-center gap-1 flex-wrap">
        {validSegments.map((segment, index) => {
          const option = DETAILED_TRANSPORT_OPTIONS.find(opt => opt.value === segment.type);
          if (!option) return null;
          const Icon = option.lucideIcon;
          
          return (
            <React.Fragment key={segment.type + '-' + index}>
              {index > 0 && (
                <ArrowRight className="h-3 w-3 text-[#8b7355]" />
              )}
              <div className="flex items-center gap-1 px-2 py-1 bg-[#fef3e8] rounded-lg">
                <Icon className="h-3 w-3" style={{ color: option.color }} />
                <span className="text-xs font-medium text-[#3d2914]">{option.label}</span>
                {segment.travelTime && (
                  <span className="text-[10px] text-[#8b7355]">{segment.travelTime}分</span>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* 合計情報 */}
      {(totalTime > 0 || totalFare > 0) && validSegments.length > 1 && (
        <div className="flex items-center gap-3 text-xs text-[#5c3a21]">
          {totalTime > 0 && (
            <span>合計 約{totalTime}分</span>
          )}
          {totalFare > 0 && (
            <span className="text-[#8b6914] font-medium">¥{totalFare.toLocaleString()}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default TransportDetailInput;
