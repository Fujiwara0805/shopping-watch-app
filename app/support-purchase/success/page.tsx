"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Heart, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/components/layout/app-layout';

export default function SupportPurchaseSuccessPage() {
  const router = useRouter();

  return (
    <AppLayout>
      <div className="container mx-auto max-w-md p-4 min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-6"
        >
          <div className="flex justify-center relative">
            <div className="relative">
              <CheckCircle className="h-24 w-24 text-green-500" />
              <Heart className="h-8 w-8 text-pink-500 absolute -top-2 -right-2 fill-pink-500" />
              <Sparkles className="h-6 w-6 text-yellow-500 absolute -bottom-1 -left-1" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              応援購入が完了しました！
            </h1>
            <p className="text-gray-600">
              投稿者への応援ありがとうございます✨<br/>
              あなたの応援が届きました！
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700">
              💰 収益は自動的に投稿者の口座に振り込まれます
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => router.push('/timeline')}
              className="w-full"
            >
              タイムラインに戻る
            </Button>
            <Button
              onClick={() => router.push('/post')}
              variant="outline"
              className="w-full"
            >
              あなたも投稿してみる
            </Button>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
} 