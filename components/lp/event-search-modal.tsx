'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users } from 'lucide-react';
import { CustomModal } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, addDays } from 'date-fns';

// 大分県内の市町村（14市3町1村）
const OITA_MUNICIPALITIES = [
  '中津市',
  '豊後高田市',
  '宇佐市',
  '国東市',
  '大分市',
  '別府市',
  '臼杵市',
  '津久見市',
  '杵築市',
  '由布市',
  '佐伯市',
  '豊後大野市',
  '日田市',
  '竹田市',
  '日出町',
  '九重町',
  '玖珠町',
  '姫島村',
];

// 誰向けのイベント（任意）。空は Radix Select のため 'none' で表現
const TARGET_AUDIENCE_OPTIONS = [
  { value: 'none', label: '指定なし' },
  { value: '家族向け', label: '家族向け' },
  { value: 'カップル向け', label: 'カップル向け' },
  { value: '一人参加', label: '一人参加' },
  { value: '観光客向け', label: '観光客向け' },
  { value: '子ども向け', label: '子ども向け' },
  { value: 'シニア向け', label: 'シニア向け' },
];

export interface EventSearchParams {
  startDate: string;
  endDate: string;
  city: string;
  target: string;
}

interface EventSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (params: EventSearchParams) => void;
}

const today = format(new Date(), 'yyyy-MM-dd');
const defaultEnd = format(addDays(new Date(), 7), 'yyyy-MM-dd');

export function EventSearchModal({
  isOpen,
  onClose,
  onConfirm,
}: EventSearchModalProps) {
  const [startDate, setStartDate] = React.useState(today);
  const [endDate, setEndDate] = React.useState(defaultEnd);
  const [city, setCity] = React.useState('all');
  const [target, setTarget] = React.useState('none');
  const [errors, setErrors] = React.useState<{ startDate?: string; endDate?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { startDate?: string; endDate?: string } = {};
    if (!startDate.trim()) newErrors.startDate = '開始日を選択してください';
    if (!endDate.trim()) newErrors.endDate = '終了日を選択してください';
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      newErrors.endDate = '終了日は開始日以降にしてください';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    onConfirm({
      startDate,
      endDate,
      city: city === 'all' ? '' : city,
      target: target === 'none' ? '' : target,
    });
    onClose();
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="イベントを探す"
      description="条件を入力して、気になるイベントを検索しましょう"
      dialogContentClassName="p-0"
      className="max-w-lg bg-[#fff8f0] border-[#d4c4a8]"
    >
      <form onSubmit={handleSubmit} className="space-y-6 px-6 pb-6">
        {/* 日付 */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2 text-[#3d2914] font-semibold">
            <Calendar className="h-4 w-4 text-[#8b6914]" />
            日付（必須）
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date" className="text-xs text-[#5c3a21]">
                開始日
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={today}
                className="border-[#d4c4a8] bg-white focus-visible:ring-[#8b6914]"
              />
              {errors.startDate && (
                <p className="text-xs text-red-600">{errors.startDate}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date" className="text-xs text-[#5c3a21]">
                終了日
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || today}
                className="border-[#d4c4a8] bg-white focus-visible:ring-[#8b6914]"
              />
              {errors.endDate && (
                <p className="text-xs text-red-600">{errors.endDate}</p>
              )}
            </div>
          </div>
        </div>

        {/* エリア */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-[#3d2914] font-semibold">
            <MapPin className="h-4 w-4 text-[#8b6914]" />
            エリア
          </Label>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="border-[#d4c4a8] bg-white">
              <SelectValue placeholder="大分県内の市町村を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              {OITA_MUNICIPALITIES.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 誰向け */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-[#3d2914] font-semibold">
            <Users className="h-4 w-4 text-[#8b6914]" />
            誰向けのイベント（任意）
          </Label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger className="border-[#d4c4a8] bg-white">
              <SelectValue placeholder="指定なし" />
            </SelectTrigger>
            <SelectContent>
              {TARGET_AUDIENCE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <motion.div
          className="flex gap-3 pt-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 border-[#8b6914]/50 text-[#5c3a21] hover:bg-[#ffecd2]"
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-gradient-to-r from-[#5c3a21] via-[#8b6914] to-[#5c3a21] hover:from-[#3d2914] hover:via-[#5c3a21] hover:to-[#3d2914] text-[#fff8f0] font-bold"
          >
            イベントを探す
          </Button>
        </motion.div>
      </form>
    </CustomModal>
  );
}
