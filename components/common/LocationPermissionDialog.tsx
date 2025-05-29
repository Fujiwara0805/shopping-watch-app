"use client";

import { motion } from 'framer-motion';
import { MapPin, Check, X as AlertX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationPermissionDialogProps {
  isOpen: boolean;
  onAllow: (option: 'once' | 'while-using') => void;
  onDeny: () => void;
  appName?: string; // アプリ名（例："TABETE"）
}

export function LocationPermissionDialog({
  isOpen,
  onAllow,
  onDeny,
  appName = "このアプリ" // デフォルトのアプリ名
}: LocationPermissionDialogProps) {
  if (!isOpen) return null;

  const handleAllow = (option: 'once' | 'while-using') => {
    onAllow(option);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onDeny} // 背景クリックで閉じる（必要に応じて）
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-card rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()} // ダイアログ内クリックで閉じないように
      >
        <div className="p-6 text-center">
          <div className="flex justify-center mb-4">
            {/* ここに地図のプレビューやイラストを配置できます */}
            {/* 例: <img src="/path-to-map-preview.png" alt="Map preview" className="w-full h-32 object-cover rounded-md" /> */}
            <div className="bg-muted rounded-full p-3">
              <MapPin className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h2 className="text-lg font-semibold mb-2">
            「{appName}」に位置情報の使用を許可しますか？
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            マップでの現在地表示、現在地近くのお店や情報の表示に使用します。
          </p>
        </div>
        
        <div className="flex flex-col border-t border-border">
          <Button
            variant="ghost"
            className="py-4 text-primary text-base rounded-none border-b border-border"
            onClick={() => handleAllow('once')}
          >
            1度だけ許可
          </Button>
          <Button
            variant="ghost"
            className="py-4 text-primary text-base rounded-none"
            onClick={() => handleAllow('while-using')}
          >
            アプリの使用中は許可
          </Button>
          <Button
            variant="ghost"
            className="py-4 text-destructive text-base rounded-none border-t border-border"
            onClick={onDeny}
          >
            許可しない
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
