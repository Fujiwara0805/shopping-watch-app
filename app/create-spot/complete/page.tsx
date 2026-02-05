"use client";

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle, MapPin } from 'lucide-react';
import { Breadcrumb } from '@/components/seo/breadcrumb';
import { designTokens } from '@/lib/constants/colors';

export default function CreateSpotCompletePage() {
  const router = useRouter();

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-4">
        <Breadcrumb />
      </div>

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
          <CheckCircle className="h-24 w-24" style={{ color: designTokens.colors.functional.success }} />
        </motion.div>
        <h1 className="text-3xl font-bold text-center mb-4" style={{ color: designTokens.colors.text.primary }}>
          スポット登録完了！
        </h1>
        <p className="text-lg text-muted-foreground text-center mb-8">
          スポットが正常に登録されました。<br />
          あなたの発見が、未来の名所になります。
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs">
          <motion.div whileTap={{ scale: 0.98 }} className="w-full">
            <Button
              onClick={() => router.push('/map')}
              className="w-full text-lg py-3 px-6 text-white"
              style={{ backgroundColor: designTokens.colors.primary.base }}
              size="lg"
            >
              <MapPin className="mr-2 h-5 w-5" />
              マップで確認する
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.98 }} className="w-full">
            <Button
              variant="outline"
              onClick={() => router.push('/create-spot')}
              className="w-full text-lg py-3 px-6"
              style={{ borderColor: designTokens.colors.primary.base, color: designTokens.colors.primary.base }}
              size="lg"
            >
              新しいスポットを登録
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
    </div>
  );
}
