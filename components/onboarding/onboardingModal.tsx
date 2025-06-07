import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Heart, Share2, Zap, Gift, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    {
      id: 1,
      title: "お気に入り店舗を登録",
      subtitle: (
        <span>
          プロフィール画面にてお気に入りの店舗を登録しよう。
            <span className="text-[#73370c] font-semibold">最大３つまで</span>登録できます ❤️
        </span>
      ),
      icon: Heart,
      color: "bg-[#73370c]",
      illustration: (
        <div className="relative w-36 h-36 mx-auto mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-[#73370c]/20 to-[#73370c]/30 rounded-full"></div>
          <div className="absolute inset-8 bg-white rounded-full shadow-lg flex items-center justify-center">
            <Heart className="w-12 h-12 text-[#73370c]" />
          </div>
          <div className="absolute -top-2 -right-2 w-3 h-3 bg-amber-400 rounded-full flex items-center justify-center">
            <Star className="w-3 h-3 text-white" />
          </div>
          <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-emerald-400 rounded-full"></div>
        </div>
      )
    },
    {
      id: 2,
      title: "投稿してシェア",
      subtitle: (
        <span>
          お得な情報を投稿してシェアしよう！💡
          <span className="block mt-2">
            １投稿ごとに<span className="text-[#73370c] font-bold ">最大５ポイント</span>付与します 🎉
          </span>
          <span className="block mt-1 text-sm">
            溜まったポイントは<span className="text-amber-600 font-semibold">Amazonギフト券</span>と交換<br /><br/>
            <span className="text-lg font-semibold text-muted-foreground/80">※近日公開予定</span>
          </span>
        </span>
      ),
      icon: Share2,
      color: "bg-[#73370c]",
      illustration: (
        <div className="relative w-36 h-36 mx-auto mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full"></div>
          <div className="absolute inset-8 bg-white rounded-full shadow-lg flex items-center justify-center">
            <Share2 className="w-12 h-12 text-emerald-600" />
          </div>
          <div className="absolute -top-1 -right-1 w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center">
            <Gift className="w-4 h-4 text-white" />
          </div>
          <div className="absolute -bottom-3 -left-1 w-6 h-6 bg-[#73370c] rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">5P</span>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "アプリを使ってみよう！",
      subtitle: (
        <span className="text-lg">
          お気に入りの店舗の
          <span className="text-[#73370c] font-semibold">お得な情報</span>を<br/>
          <span className="text-purple-600 font-bold">いち早く</span>お知らせするよ ⚡️
        </span>
      ),
      icon: Zap,
      color: "bg-[#73370c]",
      illustration: (
        <div className="relative w-36 h-36 mx-auto mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full"></div>
          <div className="absolute inset-8 bg-white rounded-full shadow-lg flex items-center justify-center">
            <Zap className="w-12 h-12 text-purple-600" />
          </div>
          <div className="absolute -top-1 -right-3 w-4 h-4 bg-amber-400 rounded-full animate-bounce"></div>
          <div className="absolute top-8 -left-2 w-3 h-3 bg-pink-400 rounded-full animate-pulse"></div>
          <div className="absolute -bottom-1 right-8 w-4 h-4 bg-[#73370c] rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
        </div>
      )
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.90, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.90, y: 20 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-xs overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative px-6 py-5 border-b border-border">
              {/* Progress Indicator */}
              <div className="flex justify-center space-x-2">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentStep
                        ? 'w-8 bg-[#73370c]'
                        : index < currentStep
                        ? 'w-2 bg-[#73370c]/60'
                        : 'w-2 bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-8 text-center min-h-[360px] flex flex-col justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center"
                >
                  {/* Illustration */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                  >
                    {currentStepData.illustration}
                  </motion.div>

                  {/* Title */}
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="text-xl font-semibold text-foreground mb-4 leading-tight"
                  >
                    手順{currentStepData.id}：{currentStepData.title}
                  </motion.h2>

                  {/* Subtitle */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                    className="text-muted-foreground leading-relaxed text-base px-2"
                  >
                    {currentStepData.subtitle}
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-6 py-5 border-t border-border bg-muted/20">
              <div className="flex justify-between items-center">
                {/* Previous Button */}
                {currentStep > 0 ? (
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    className="flex items-center space-x-2 border-[#73370c]/20 text-[#73370c] hover:bg-[#73370c]/10 hover:border-[#73370c]/40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>前へ</span>
                  </Button>
                ) : (
                  <div></div>
                )}

                {/* Next/Complete Button */}
                {currentStep === steps.length - 1 ? (
                  <Button
                    onClick={handleClose}
                    className="bg-[#73370c] hover:bg-[#73370c]/90 text-white px-8 shadow-lg"
                  >
                    はじめる
                  </Button>
                ) : (
                  <Button
                    onClick={nextStep}
                    className="flex items-center space-x-2 bg-[#73370c] hover:bg-[#73370c]/90 text-white px-6 shadow-lg"
                  >
                    <span>次へ</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingModal;