"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Check, X as AlertX, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationPermissionDialogProps {
  isOpen: boolean;
  onAllow: () => void;
  onDeny: () => void;
  appName?: string;
  permissionState: 'prompt' | 'granted' | 'denied' | 'unavailable' | 'pending';
}

export function LocationPermissionDialog({
  isOpen,
  onAllow,
  onDeny,
  appName = "このアプリ",
  permissionState
}: LocationPermissionDialogProps) {
  if (!isOpen) return null;

  const handleAllow = () => {
    onAllow();
  };

  let dialogTitle = "";
  let dialogMessage = "";
  let iconComponent = MapPin;

  if (permissionState === 'denied') {
    dialogTitle = "位置情報が無効です";
    dialogMessage = `サービスをより便利にご利用いただくには、位置情報をオンにする必要があります。現在地近くのお得な情報を見つけるために使用します。お客様の位置情報は厳重に管理されますのでご安心ください。ブラウザまたは端末のOS設定で位置情報のアクセスを許可してください。`;
    iconComponent = Info;
  } else {
    dialogTitle = `「${appName}」に位置情報の使用を許可しますか？`;
    dialogMessage = `マップでの現在地表示、現在地近くのお店や情報の表示に使用します。プライバシーに配慮し、取得した位置情報は安全に管理されますのでご安心ください。`;
    iconComponent = MapPin;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onDeny}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-card rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-muted rounded-full p-3">
              {React.createElement(iconComponent, { className: "h-10 w-10 text-primary" })}
            </div>
          </div>
          <h2 className="text-lg font-semibold mb-2">
            {dialogTitle}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {dialogMessage}
          </p>
          <div className="flex flex-col space-y-3">
            {permissionState === 'prompt' && (
              <Button onClick={handleAllow} className="w-full">
                位置情報を許可する
              </Button>
            )}
            <Button variant="outline" onClick={onDeny} className="w-full">
              {permissionState === 'denied' ? '閉じる' : '許可しない'}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
