"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Smartphone, Settings, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SafariLocationGuideProps {
  isVisible: boolean;
  isSafari: boolean;
  isPrivateMode: boolean;
  permissionState: string;
  onRequestLocation: () => void;
  onClose?: () => void;
}

export function SafariLocationGuide({ 
  isVisible, 
  isSafari, 
  isPrivateMode, 
  permissionState, 
  onRequestLocation,
  onClose 
}: SafariLocationGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showDetailedGuide, setShowDetailedGuide] = useState(false);

  if (!isVisible) return null;

  // プライベートモードの場合
  if (isPrivateMode) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      >
        <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
          <div className="text-center">
            <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-3">プライベートブラウジング中</h2>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              プライベートブラウジングモードでは位置情報を取得できません。
              通常のSafariでアクセスしてください。
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                ページを再読み込み
              </Button>
              {onClose && (
                <Button variant="outline" onClick={onClose} className="w-full">
                  閉じる
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Safari用のステップガイド
  const safariSteps = [
    {
      title: "位置情報を許可",
      icon: <MapPin className="h-6 w-6 text-blue-500" />,
      description: "地図を表示するために位置情報が必要です",
      action: "許可する",
      actionFn: onRequestLocation
    },
    {
      title: "Safari設定を確認",
      icon: <Settings className="h-6 w-6 text-orange-500" />,
      description: "ブラウザで位置情報がブロックされている可能性があります",
      action: "設定方法を見る",
      actionFn: () => setShowDetailedGuide(true)
    }
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden"
        >
          {!showDetailedGuide ? (
            <>
              {/* メインガイド */}
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="bg-blue-50 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Smartphone className="h-10 w-10 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {isSafari ? "Safari で位置情報を許可" : "位置情報の許可が必要"}
                  </h2>
                  <p className="text-gray-600 text-sm">
                    お近くのお店を探すために現在地が必要です
                  </p>
                </div>

                <div className="space-y-4">
                  {safariSteps.map((step, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        currentStep === index 
                          ? 'border-blue-200 bg-blue-50' 
                          : 'border-gray-100 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          {step.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {step.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3">
                            {step.description}
                          </p>
                          <Button
                            onClick={step.actionFn}
                            size="sm"
                            className={
                              currentStep === index 
                                ? "bg-blue-600 hover:bg-blue-700" 
                                : "bg-gray-600 hover:bg-gray-700"
                            }
                          >
                            {step.action}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {permissionState === 'denied' && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">
                      位置情報がブロックされています。上記の設定方法をご確認ください。
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-6 py-4 flex gap-3">
                {onClose && (
                  <Button variant="outline" onClick={onClose} className="flex-1">
                    後で設定
                  </Button>
                )}
                <Button 
                  onClick={() => setCurrentStep(1)} 
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  設定方法を見る
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* 詳細設定ガイド */}
              <div className="p-6">
                <div className="text-center mb-6">
                  <Settings className="h-12 w-12 text-orange-500 mx-auto mb-3" />
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Safari 位置情報設定方法
                  </h2>
                </div>

                <div className="space-y-6">
                  {/* 方法1: Safari内設定 */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">
                        1
                      </span>
                      Safari内での設定
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600 ml-8">
                      <p>• アドレスバー左の <strong>🔒アイコン</strong> をタップ</p>
                      <p>• 「位置情報」を <strong>「許可」</strong> に変更</p>
                      <p>• ページを再読み込み</p>
                    </div>
                  </div>

                  {/* 方法2: iPhone設定 */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <span className="bg-green-100 text-green-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">
                        2
                      </span>
                      iPhone設定での変更
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600 ml-8">
                      <p>• <strong>設定</strong> アプリを開く</p>
                      <p>• <strong>プライバシーとセキュリティ</strong> をタップ</p>
                      <p>• <strong>位置情報サービス</strong> をタップ</p>
                      <p>• <strong>Safari</strong> を選択</p>
                      <p>• <strong>「このAppの使用中のみ許可」</strong> を選択</p>
                    </div>
                  </div>

                  {/* トラブルシューティング */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h3 className="font-semibold text-amber-800 mb-2">
                      うまくいかない場合
                    </h3>
                    <div className="space-y-1 text-sm text-amber-700">
                      <p>• プライベートブラウジングを無効にする</p>
                      <p>• Safariを完全に閉じて再起動</p>
                      <p>• iPhoneを再起動</p>
                      <p>• WiFi接続を確認</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDetailedGuide(false)}
                  className="flex-1"
                >
                  戻る
                </Button>
                <Button 
                  onClick={() => {
                    setShowDetailedGuide(false);
                    onRequestLocation();
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  再試行
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}