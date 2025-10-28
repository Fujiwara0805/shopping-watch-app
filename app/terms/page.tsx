"use client";

import { motion } from 'framer-motion';
import AppLayout from '@/app/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, FileText, Lock, ChevronRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function TermsGatewayPage() {
  const router = useRouter();

  const policies = [
    {
      href: '/terms/service-policy',
      title: 'サービスポリシー',
      description: 'サービスの概要、提供機能、運営方針について説明します。',
      icon: Shield,
      color: 'text-[#73370c]'
    },
    {
      href: '/terms/terms-of-service',
      title: '利用規約',
      description: 'サービスの利用条件、禁止事項、免責事項などを定めています。',
      icon: FileText,
      color: 'text-blue-600'
    },
    {
      href: '/terms/privacy-policy',
      title: 'プライバシーポリシー',
      description: '個人情報の収集、利用目的、管理方法について説明します。',
      icon: Lock,
      color: 'text-green-600'
    },
  ];

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-6 max-w-2xl"
      >
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl sm:text-4xl font-bold text-[#73370c]">
              規約・ポリシー
            </CardTitle>
            <p className="text-muted-foreground pt-2">
              トクドクを安全にご利用いただくための各種規約です。
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {policies.map((policy, index) => (
              <motion.div
                key={policy.href}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1, duration: 0.4 }}
              >
                <Link href={policy.href} passHref>
                  <div className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <policy.icon className={`h-8 w-8 ${policy.color}`} />
                        <div>
                          <h3 className="font-semibold text-lg">{policy.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{policy.description}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
      <div className="mt-12 pt-8 border-t border-gray-200 text-center">
            <Button
              variant="outline"
              onClick={() => router.push('/map')}
              className="flex items-center space-x-2 mx-auto"
            >
              <span>戻る</span>
            </Button>
          </div>
    </AppLayout>
  );
}
