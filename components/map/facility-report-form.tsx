"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { designTokens } from '@/lib/constants';

interface FacilityReportFormProps {
  latitude: number;
  longitude: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function FacilityReportForm({ latitude, longitude, onClose, onSuccess }: FacilityReportFormProps) {
  const { data: session } = useSession();
  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      setError('名前を入力してください。');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/facility-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityType: 'trash_can',
          storeName: storeName.trim(),
          description: description.trim() || undefined,
          storeLatitude: latitude,
          storeLongitude: longitude,
          userId: session?.user?.id || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '投稿に失敗しました。');
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError('通信エラーが発生しました。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{
          background: designTokens.colors.background.white,
          boxShadow: designTokens.elevation.high,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5 border-b"
          style={{ borderColor: `${designTokens.colors.secondary.stone}30` }}
        >
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" style={{ color: '#6B7280' }} />
            <h3
              className="text-lg font-semibold"
              style={{ fontFamily: designTokens.typography.display, color: designTokens.colors.text.primary }}
            >
              ゴミ箱を報告
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5" style={{ color: designTokens.colors.text.muted }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Location info */}
          <div
            className="flex items-center gap-2 p-3 rounded-xl text-sm"
            style={{ background: designTokens.colors.background.mist, color: designTokens.colors.text.secondary }}
          >
            <MapPin className="h-4 w-4 flex-shrink-0" style={{ color: designTokens.colors.functional.error }} />
            <span>緯度: {latitude.toFixed(6)}, 経度: {longitude.toFixed(6)}</span>
          </div>

          {/* Name */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: designTokens.colors.text.secondary }}
            >
              名前・場所の説明 <span style={{ color: designTokens.colors.functional.error }}>*</span>
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              maxLength={100}
              placeholder="例: コンビニ前のゴミ箱、公園入口"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2"
              style={{
                background: designTokens.colors.background.mist,
                border: `1px solid ${designTokens.colors.secondary.stone}40`,
                color: designTokens.colors.text.primary,
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: designTokens.colors.text.secondary }}
            >
              詳細（任意）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="分別の種類やゴミ箱の特徴など"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2 resize-none"
              style={{
                background: designTokens.colors.background.mist,
                border: `1px solid ${designTokens.colors.secondary.stone}40`,
                color: designTokens.colors.text.primary,
              }}
            />
          </div>

          {error && (
            <p className="text-sm font-medium" style={{ color: designTokens.colors.functional.error }}>
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting || !storeName.trim()}
            className="w-full h-12 rounded-xl font-semibold"
            style={{
              background: storeName.trim() ? '#6B7280' : designTokens.colors.secondary.stone,
              color: designTokens.colors.text.inverse,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? '送信中...' : 'ゴミ箱の場所を報告する'}
          </Button>

          <p className="text-xs text-center" style={{ color: designTokens.colors.text.muted }}>
            ログイン不要で報告できます
          </p>
        </form>
      </motion.div>
    </motion.div>
  );
}
