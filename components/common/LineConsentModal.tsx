import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button'; // Buttonコンポーネントは既存のものを使用

interface LineConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const LineConsentModal: React.FC<LineConsentModalProps> = ({ isOpen, onClose, onConfirm }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="bg-card rounded-lg shadow-xl p-6 w-full max-w-md text-center border dark:border-slate-700"
          >
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              LINEアカウント連携について
            </h2>
            <p className="text-muted-foreground text-sm mb-6 text-left">
              LINEアカウントと連携することで、
              お客様のメールアドレスをLINEから取得し、アプリ内のプロフィール情報と紐付けて管理いたします。
              これにより、異なるSNSアカウントでのログイン時も、同じプロフィール情報でご利用いただけるようになります。
            </p>
            <p className="text-muted-foreground text-sm mb-8 text-left">
              上記の内容にご同意いただけますか？
            </p>
            <div className="flex flex-col space-y-4">
              <Button onClick={onConfirm} className="w-full py-3 bg-line-green hover:bg-line-dark-green text-white font-semibold rounded-lg shadow">
                同意してLINEでログイン
              </Button>
              <Button onClick={onClose} variant="outline" className="w-full py-3 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold rounded-lg">
                キャンセル
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
