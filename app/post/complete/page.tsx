"use client";

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AppLayout from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { CheckCircle, FileText } from 'lucide-react';

export default function PostCompletePage() {
  const router = useRouter();

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="container mx-auto max-w-md p-4 md:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-150px)]"
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
          投稿完了！
        </h1>
        <p className="text-lg text-muted-foreground text-center mb-8">
          商品の情報が正常に投稿されました。<br />ご協力ありがとうございます！
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs">
          <motion.div whileTap={{ scale: 0.98 }} className="w-full">
            <Button
              onClick={() => router.push('/timeline')}
              className="w-full text-lg py-3 px-6"
              size="lg"
            >
              タイムラインを見る
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.98 }} className="w-full">
            <Button
              variant="outline"
              onClick={() => router.push('/post')}
              className="w-full text-lg py-3 px-6"
              size="lg"
            >
              新しい投稿をする
            </Button>
          </motion.div>
        </div>
         <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="mt-8 text-muted-foreground"
         >
            トップページへ戻る
         </Button>
      </motion.div>
    </AppLayout>
  );
}
