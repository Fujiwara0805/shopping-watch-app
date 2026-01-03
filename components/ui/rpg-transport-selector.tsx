"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Compass } from 'lucide-react';

// 🎮 RPG風移動手段選択肢
const TRANSPORT_OPTIONS = [
  { value: 'walk', label: '徒歩', icon: '🚶', description: 'ゆっくり歩いて移動' },
  { value: 'bus', label: 'バス', icon: '🚌', description: '路線バスで移動' },
  { value: 'taxi', label: 'タクシー', icon: '🚕', description: 'タクシーで快適移動' },
  { value: 'car', label: '車', icon: '🚗', description: '自家用車で移動' },
  { value: 'bicycle', label: '自転車', icon: '🚲', description: '自転車で爽快移動' },
  { value: 'train', label: '電車', icon: '🚃', description: '電車・鉄道で移動' },
] as const;

export type TransportType = typeof TRANSPORT_OPTIONS[number]['value'];

interface RPGTransportSelectorProps {
  value?: TransportType | null;
  onChange: (value: TransportType | null) => void;
  label?: string;
  className?: string;
}

/**
 * 🎮 RPG風コマンド選択ウィンドウ
 * セレクトボックスを廃し、ドット絵アイコンと「▶(セレクトカーソル)」による選択体験を提供
 */
export function RPGTransportSelector({ 
  value, 
  onChange, 
  label = "移動手段を選択",
  className = ""
}: RPGTransportSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  const selectedOption = TRANSPORT_OPTIONS.find(opt => opt.value === value);
  const currentIndex = value ? TRANSPORT_OPTIONS.findIndex(opt => opt.value === value) : -1;
  
  // キーボードナビゲーション
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }
    
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setHoveredIndex(prev => 
          prev === null || prev === 0 ? TRANSPORT_OPTIONS.length - 1 : prev - 1
        );
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHoveredIndex(prev => 
          prev === null || prev === TRANSPORT_OPTIONS.length - 1 ? 0 : prev + 1
        );
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (hoveredIndex !== null) {
          onChange(TRANSPORT_OPTIONS[hoveredIndex].value);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };
  
  return (
    <div className={`relative ${className}`}>
      {/* ラベル */}
      <div className="flex items-center gap-2 mb-2">
        <Compass className="h-4 w-4 text-[#8b6914]" />
        <span className="text-sm font-bold text-[#3d2914]">{label}</span>
      </div>
      
      {/* トリガーボタン（RPG風） */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="w-full bg-[#1a1a2e] border-4 border-[#ffecd2] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5),inset_2px_2px_0px_0px_rgba(255,255,255,0.1)] p-3 text-left transition-all hover:border-[#ffd700] focus:outline-none focus:border-[#ffd700]"
        style={{ fontFamily: "'DotGothic16', 'Courier New', monospace" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[#ffecd2] text-lg">▶</span>
            {selectedOption ? (
              <>
                <span className="text-2xl">{selectedOption.icon}</span>
                <span className="text-[#ffecd2] font-bold">{selectedOption.label}</span>
              </>
            ) : (
              <span className="text-[#ffecd2]/50">選択してください</span>
            )}
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-5 w-5 text-[#ffecd2]" />
          </motion.div>
        </div>
      </button>
      
      {/* ドロップダウン（RPG風コマンドウィンドウ） */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scaleY: 0.9 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -10, scaleY: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 bg-[#1a1a2e] border-4 border-[#ffecd2] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5),inset_2px_2px_0px_0px_rgba(255,255,255,0.1)] overflow-hidden"
            style={{ fontFamily: "'DotGothic16', 'Courier New', monospace" }}
          >
            {/* ヘッダー */}
            <div className="px-3 py-2 border-b border-[#ffecd2]/30 bg-[#2a2a4e]">
              <span className="text-[#ffecd2] text-xs font-bold tracking-wider">
                ▼ TRANSPORT SELECT ▼
              </span>
            </div>
            
            {/* 選択肢リスト */}
            <div className="py-1 max-h-[300px] overflow-y-auto">
              {/* 選択なしオプション */}
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setHoveredIndex(-1)}
                className={`w-full px-3 py-2 text-left flex items-center gap-3 transition-all ${
                  hoveredIndex === -1 ? 'bg-[#3a3a5e]' : ''
                } ${!value ? 'bg-[#4a4a6e]' : ''}`}
              >
                <span className={`text-lg transition-opacity ${hoveredIndex === -1 || !value ? 'opacity-100' : 'opacity-0'}`}>
                  ▶
                </span>
                <span className="text-[#ffecd2]/70 text-sm">選択なし</span>
              </button>
              
              {TRANSPORT_OPTIONS.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  className={`w-full px-3 py-3 text-left flex items-center gap-3 transition-all ${
                    hoveredIndex === index ? 'bg-[#3a3a5e]' : ''
                  } ${value === option.value ? 'bg-[#4a4a6e]' : ''}`}
                >
                  {/* セレクトカーソル */}
                  <motion.span 
                    className={`text-lg text-[#ffd700] transition-opacity`}
                    initial={false}
                    animate={{ 
                      opacity: hoveredIndex === index || value === option.value ? 1 : 0,
                      x: hoveredIndex === index ? [0, 4, 0] : 0
                    }}
                    transition={{ 
                      x: { duration: 0.3, repeat: hoveredIndex === index ? Infinity : 0 }
                    }}
                  >
                    ▶
                  </motion.span>
                  
                  {/* アイコン */}
                  <span className="text-2xl">{option.icon}</span>
                  
                  {/* ラベルと説明 */}
                  <div className="flex-1">
                    <div className="text-[#ffecd2] font-bold">{option.label}</div>
                    <div className="text-[#ffecd2]/50 text-xs">{option.description}</div>
                  </div>
                </button>
              ))}
            </div>
            
            {/* フッター */}
            <div className="px-3 py-2 border-t border-[#ffecd2]/30 bg-[#2a2a4e]">
              <div className="flex items-center justify-between text-[#ffecd2]/50 text-xs">
                <span>↑↓: 選択</span>
                <span>Enter: 決定</span>
                <span>Esc: 閉じる</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* オーバーレイ（クリックで閉じる） */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

// 🎮 RPG風所要時間入力コンポーネント
interface RPGTravelTimeInputProps {
  value?: number | null;
  onChange: (value: number | null) => void;
  label?: string;
  className?: string;
}

export function RPGTravelTimeInput({
  value,
  onChange,
  label = "所要時間",
  className = ""
}: RPGTravelTimeInputProps) {
  const handleIncrement = () => {
    onChange(Math.min((value || 0) + 5, 480));
  };
  
  const handleDecrement = () => {
    const newValue = (value || 0) - 5;
    onChange(newValue <= 0 ? null : newValue);
  };
  
  return (
    <div className={className}>
      {/* ラベル */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">⏱️</span>
        <span className="text-sm font-bold text-[#3d2914]">{label}</span>
      </div>
      
      {/* RPG風入力 */}
      <div 
        className="bg-[#1a1a2e] border-4 border-[#ffecd2] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5),inset_2px_2px_0px_0px_rgba(255,255,255,0.1)] p-3 flex items-center justify-between"
        style={{ fontFamily: "'DotGothic16', 'Courier New', monospace" }}
      >
        {/* 減少ボタン */}
        <button
          type="button"
          onClick={handleDecrement}
          className="w-10 h-10 flex items-center justify-center bg-[#3a3a5e] hover:bg-[#4a4a6e] text-[#ffecd2] transition-all border-2 border-[#ffecd2]/30 active:scale-95"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
        
        {/* 値表示 */}
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-[#ffd700]">
            {value || 0}
          </span>
          <span className="text-[#ffecd2] text-sm">分</span>
        </div>
        
        {/* 増加ボタン */}
        <button
          type="button"
          onClick={handleIncrement}
          className="w-10 h-10 flex items-center justify-center bg-[#3a3a5e] hover:bg-[#4a4a6e] text-[#ffecd2] transition-all border-2 border-[#ffecd2]/30 active:scale-95"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

