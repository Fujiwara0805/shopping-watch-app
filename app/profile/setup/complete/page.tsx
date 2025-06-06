"use client";

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AppLayout from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export default function ProfileSetupCompletePage() {
  const router = useRouter();

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="container mx-auto max-w-md p-4 md:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-150px)]" // ヘッダー分を考慮
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
          className="mb-8"
        >
          <CheckCircle className="h-24 w-24 text-green-500" />
        </motion.div>
        <h1 className="text-3xl font-bold text-center mb-4">
          登録完了！
        </h1>
        <p className="text-base text-muted-foreground text-center mb-8">
          プロフィールの登録が正常に完了しました。
        </p>
        <motion.div whileTap={{ scale: 0.98 }}>
          <Button
            onClick={() => router.push('/profile')}
            className="text-lg py-3 px-6"
            size="lg"
          >
            プロフィールを確認する
          </Button>
        </motion.div>
         <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="mt-4 text-muted-foreground"
         >
            トップページへ戻る
         </Button>
      </motion.div>
    </AppLayout>
  );
}
