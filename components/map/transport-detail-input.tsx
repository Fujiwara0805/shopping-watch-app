"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, ChevronUp, Bus, Train, Car, Bike, 
  Footprints, MapPin, Clock, Navigation, Info,
  CircleDot, ArrowRight
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
] as const;

export type TransportType = typeof DETAILED_TRANSPORT_OPTIONS[number]['value'];

// 移動詳細データの型
export interface TransportDetails {
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
}

interface TransportDetailInputProps {
  value: TransportDetails;
  onChange: (details: TransportDetails) => void;
  label?: string;
  fromSpotName?: string;
  toSpotName?: string;
  className?: string;
}

/**
 * 詳細な移動手段入力コンポーネント
 * バス停名、駅名、運賃などの詳細情報を入力可能
 */
export function TransportDetailInput({
  value,
  onChange,
  label = "移動手段",
  fromSpotName,
  toSpotName,
  className = "",
}: TransportDetailInputProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const selectedOption = DETAILED_TRANSPORT_OPTIONS.find(opt => opt.value === value.type);
  const hasDetails = selectedOption?.hasDetails ?? false;

  const handleTypeChange = (type: TransportType) => {
    onChange({ ...value, type });
    if (type !== 'none' && DETAILED_TRANSPORT_OPTIONS.find(opt => opt.value === type)?.hasDetails) {
      setIsExpanded(true);
    }
  };

  const handleDetailChange = (field: keyof TransportDetails, fieldValue: any) => {
    onChange({ ...value, [field]: fieldValue });
  };

  const Icon = selectedOption?.lucideIcon || CircleDot;

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

      {/* 移動手段選択 */}
      <div>
        <Label className="text-sm font-semibold mb-2 block text-[#3d2914]">
          <Navigation className="inline-block mr-1.5 h-4 w-4" />
          {label}
        </Label>
        
        <div className="grid grid-cols-4 gap-2">
          {DETAILED_TRANSPORT_OPTIONS.map((option) => {
            const OptionIcon = option.lucideIcon;
            const isSelected = value.type === option.value;
            
            return (
              <motion.button
                key={option.value}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTypeChange(option.value)}
                className={`
                  relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all
                  ${isSelected 
                    ? 'border-[#8b6914] bg-[#fef3e8] shadow-md' 
                    : 'border-[#d4c4a8] bg-white hover:border-[#8b7355] hover:bg-[#fff8f0]'
                  }
                `}
              >
                {/* 選択インジケーター */}
                {isSelected && (
                  <motion.div
                    layoutId="transport-indicator"
                    className="absolute -top-1 -right-1 w-4 h-4 bg-[#8b6914] rounded-full flex items-center justify-center"
                  >
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </motion.div>
                )}
                
                <OptionIcon 
                  className="h-5 w-5 mb-1" 
                  style={{ color: isSelected ? option.color : '#8b7355' }}
                />
                <span className={`text-xs font-medium ${isSelected ? 'text-[#3d2914]' : 'text-[#5c3a21]'}`}>
                  {option.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 所要時間入力 */}
      {value.type !== 'none' && (
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
                className="h-10 w-20 text-center rounded-lg bg-white border-[#d4c4a8] focus:border-[#8b6914]"
                style={{ fontSize: '16px' }}
                min={1}
                max={480}
                value={value.travelTime || ''}
                onChange={(e) => handleDetailChange('travelTime', e.target.value ? parseInt(e.target.value) : undefined)}
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
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-5 border-[#8b6914] text-[#8b6914] hover:bg-[#fef3e8]"
            >
              <Info className="h-4 w-4 mr-1" />
              詳細
              {isExpanded ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
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
            <div className="p-4 bg-[#fdf5e6] rounded-xl border-2 border-dashed border-[#d4c4a8] space-y-4">
              {/* バス詳細 */}
              {value.type === 'bus' && (
                <BusDetailFields value={value} onChange={handleDetailChange} />
              )}

              {/* 電車詳細 */}
              {value.type === 'train' && (
                <TrainDetailFields value={value} onChange={handleDetailChange} />
              )}

              {/* タクシー詳細 */}
              {value.type === 'taxi' && (
                <TaxiDetailFields value={value} onChange={handleDetailChange} />
              )}

              {/* 車詳細 */}
              {value.type === 'car' && (
                <CarDetailFields value={value} onChange={handleDetailChange} />
              )}

              {/* 自転車詳細 */}
              {value.type === 'bicycle' && (
                <BicycleDetailFields value={value} onChange={handleDetailChange} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * バス移動の詳細入力フィールド
 */
function BusDetailFields({ 
  value, 
  onChange 
}: { 
  value: TransportDetails; 
  onChange: (field: keyof TransportDetails, value: any) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Bus className="h-5 w-5 text-[#3b82f6]" />
        <span className="text-sm font-bold text-[#3d2914]">バス移動の詳細</span>
      </div>
      
      {/* 出発・到着バス停 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium text-[#5c3a21] mb-1 block">
            出発バス停 <span className="text-[#8b6914]">★</span>
          </Label>
          <Input
            type="text"
            placeholder="例: 大分駅前"
            className="h-10 text-sm rounded-lg bg-white border-[#d4c4a8] focus:border-[#3b82f6]"
            value={value.departureStop || ''}
            onChange={(e) => onChange('departureStop', e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-[#5c3a21] mb-1 block">
            到着バス停 <span className="text-[#8b6914]">★</span>
          </Label>
          <Input
            type="text"
            placeholder="例: 別府北浜"
            className="h-10 text-sm rounded-lg bg-white border-[#d4c4a8] focus:border-[#3b82f6]"
            value={value.arrivalStop || ''}
            onChange={(e) => onChange('arrivalStop', e.target.value)}
          />
        </div>
      </div>

      {/* 路線名・運賃 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium text-[#5c3a21] mb-1 block">
            路線名
          </Label>
          <Input
            type="text"
            placeholder="例: 大分交通 AS60"
            className="h-10 text-sm rounded-lg bg-white border-[#d4c4a8]"
            value={value.busLine || ''}
            onChange={(e) => onChange('busLine', e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-[#5c3a21] mb-1 block">
            運賃（円）
          </Label>
          <Input
            type="number"
            placeholder="500"
            className="h-10 text-sm rounded-lg bg-white border-[#d4c4a8]"
            style={{ fontSize: '16px' }}
            min={0}
            value={value.fare || ''}
            onChange={(e) => onChange('fare', e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </div>
      </div>

      {/* ヒント */}
      <p className="text-xs text-[#8b7355] bg-[#fff8f0] px-3 py-2 rounded-lg">
        💡 バス停名を入力しておくと、旅行時に迷わずスムーズに移動できます
      </p>
    </div>
  );
}

/**
 * 電車移動の詳細入力フィールド
 */
function TrainDetailFields({ 
  value, 
  onChange 
}: { 
  value: TransportDetails; 
  onChange: (field: keyof TransportDetails, value: any) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Train className="h-5 w-5 text-[#06b6d4]" />
        <span className="text-sm font-bold text-[#3d2914]">電車移動の詳細</span>
      </div>
      
      {/* 出発・到着駅 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium text-[#5c3a21] mb-1 block">
            出発駅 <span className="text-[#8b6914]">★</span>
          </Label>
          <Input
            type="text"
            placeholder="例: 大分駅"
            className="h-10 text-sm rounded-lg bg-white border-[#d4c4a8] focus:border-[#06b6d4]"
            value={value.departureStation || ''}
            onChange={(e) => onChange('departureStation', e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-[#5c3a21] mb-1 block">
            到着駅 <span className="text-[#8b6914]">★</span>
          </Label>
          <Input
            type="text"
            placeholder="例: 別府駅"
            className="h-10 text-sm rounded-lg bg-white border-[#d4c4a8] focus:border-[#06b6d4]"
            value={value.arrivalStation || ''}
            onChange={(e) => onChange('arrivalStation', e.target.value)}
          />
        </div>
      </div>

      {/* 路線名・運賃 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium text-[#5c3a21] mb-1 block">
            路線名
          </Label>
          <Input
            type="text"
            placeholder="例: JR日豊本線"
            className="h-10 text-sm rounded-lg bg-white border-[#d4c4a8]"
            value={value.lineName || ''}
            onChange={(e) => onChange('lineName', e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-[#5c3a21] mb-1 block">
            運賃（円）
          </Label>
          <Input
            type="number"
            placeholder="280"
            className="h-10 text-sm rounded-lg bg-white border-[#d4c4a8]"
            style={{ fontSize: '16px' }}
            min={0}
            value={value.fare || ''}
            onChange={(e) => onChange('fare', e.target.value ? parseInt(e.target.value) : undefined)}
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
  value, 
  onChange 
}: { 
  value: TransportDetails; 
  onChange: (field: keyof TransportDetails, value: any) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Car className="h-5 w-5 text-[#f59e0b]" />
        <span className="text-sm font-bold text-[#3d2914]">タクシー移動の詳細</span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium text-[#5c3a21] mb-1 block">
            想定運賃（円）
          </Label>
          <Input
            type="number"
            placeholder="1500"
            className="h-10 text-sm rounded-lg bg-white border-[#d4c4a8]"
            style={{ fontSize: '16px' }}
            min={0}
            value={value.fare || ''}
            onChange={(e) => onChange('fare', e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-[#5c3a21] mb-1 block">
            メモ
          </Label>
          <Input
            type="text"
            placeholder="例: 予約推奨"
            className="h-10 text-sm rounded-lg bg-white border-[#d4c4a8]"
            value={value.note || ''}
            onChange={(e) => onChange('note', e.target.value)}
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
  value, 
  onChange 
}: { 
  value: TransportDetails; 
  onChange: (field: keyof TransportDetails, value: any) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Car className="h-5 w-5 text-[#ef4444]" />
        <span className="text-sm font-bold text-[#3d2914]">車移動の詳細</span>
      </div>
      
      <div>
        <Label className="text-xs font-medium text-[#5c3a21] mb-1 block">
          駐車場情報
        </Label>
        <Input
          type="text"
          placeholder="例: 無料駐車場あり（50台）"
          className="h-10 text-sm rounded-lg bg-white border-[#d4c4a8]"
          value={value.parkingInfo || ''}
          onChange={(e) => onChange('parkingInfo', e.target.value)}
        />
      </div>
      
      <div>
        <Label className="text-xs font-medium text-[#5c3a21] mb-1 block">
          メモ
        </Label>
        <Input
          type="text"
          placeholder="例: 山道注意、カーナビ必須"
          className="h-10 text-sm rounded-lg bg-white border-[#d4c4a8]"
          value={value.note || ''}
          onChange={(e) => onChange('note', e.target.value)}
        />
      </div>
    </div>
  );
}

/**
 * 自転車移動の詳細入力フィールド
 */
function BicycleDetailFields({ 
  value, 
  onChange 
}: { 
  value: TransportDetails; 
  onChange: (field: keyof TransportDetails, value: any) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Bike className="h-5 w-5 text-[#8b5cf6]" />
        <span className="text-sm font-bold text-[#3d2914]">自転車移動の詳細</span>
      </div>
      
      <div>
        <Label className="text-xs font-medium text-[#5c3a21] mb-1 block">
          レンタル情報
        </Label>
        <Input
          type="text"
          placeholder="例: 駅前レンタサイクル 500円/日"
          className="h-10 text-sm rounded-lg bg-white border-[#d4c4a8]"
          value={value.rentalInfo || ''}
          onChange={(e) => onChange('rentalInfo', e.target.value)}
        />
      </div>
      
      <div>
        <Label className="text-xs font-medium text-[#5c3a21] mb-1 block">
          メモ
        </Label>
        <Input
          type="text"
          placeholder="例: 坂道多め、電動アシスト推奨"
          className="h-10 text-sm rounded-lg bg-white border-[#d4c4a8]"
          value={value.note || ''}
          onChange={(e) => onChange('note', e.target.value)}
        />
      </div>
    </div>
  );
}

/**
 * 移動手段のサマリー表示コンポーネント
 */
export function TransportSummary({ details }: { details: TransportDetails }) {
  const option = DETAILED_TRANSPORT_OPTIONS.find(opt => opt.value === details.type);
  if (!option || details.type === 'none') return null;

  const Icon = option.lucideIcon;

  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4" style={{ color: option.color }} />
      <span className="font-medium">{option.label}</span>
      
      {details.travelTime && (
        <span className="text-[#5c3a21]">約{details.travelTime}分</span>
      )}
      
      {/* バス停情報 */}
      {details.type === 'bus' && details.departureStop && details.arrivalStop && (
        <span className="text-xs text-[#8b7355]">
          ({details.departureStop} → {details.arrivalStop})
        </span>
      )}
      
      {/* 駅情報 */}
      {details.type === 'train' && details.departureStation && details.arrivalStation && (
        <span className="text-xs text-[#8b7355]">
          ({details.departureStation} → {details.arrivalStation})
        </span>
      )}
      
      {/* 運賃 */}
      {details.fare && (
        <span className="text-xs text-[#8b6914] font-medium">
          ¥{details.fare.toLocaleString()}
        </span>
      )}
    </div>
  );
}

export default TransportDetailInput;

