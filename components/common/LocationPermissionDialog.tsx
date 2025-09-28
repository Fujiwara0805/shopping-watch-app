"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Check, X as AlertX, Info, AlertTriangle } from 'lucide-react';
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
  appName = "トクドク",
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
    dialogMessage = `端末の設定画面から位置情報を許可してください。`;
    iconComponent = Info;
  } else {
    dialogTitle = `位置情報の使用を許可しますか？`;
    dialogMessage = `近くのおとくな情報を表示するために使用します。`;
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
        className="bg-card rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
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
          <p className="text-sm text-muted-foreground mb-4 whitespace-pre-line">
            {dialogMessage}
          </p>
          
          {/* 🔥 追加: 設定方法の説明 */}
          {permissionState === 'denied' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-left">
              <h3 className="font-semibold text-red-800 mb-3 text-center">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                位置情報の利用許可が必要です
              </h3>
              
              <div className="bg-white rounded p-3 border">
                <h4 className="font-semibold text-gray-700 mb-2">【設定方法】</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <p><strong>1.</strong> 各種(iPhone等)端末の設定 → プライバシーとセキュリティ → 位置情報サービス→各種ブラウザ(Chrome,Safari等)の設定を「使用中のみ」に設定を変更してください</p>
                  <p><strong>2.</strong> 各種ブラウザ(Chrome,Safari等)における設定 → プライバシーとセキュリティから位置情報を許可orアドレスバーの🔒アイコンから設定を変更してください</p>
                </div>
              </div>
            </div>
          )}
          
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
