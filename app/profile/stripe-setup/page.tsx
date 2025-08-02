"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, CreditCard, AlertCircle, Loader2 } from 'lucide-react';
// import AppLayout from '@/components/layout/app-layout';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

export default function StripeSetupPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [loading, setLoading] = useState(false);

  const success = searchParams.get('success');
  const refresh = searchParams.get('refresh');

  useEffect(() => {
    if (success) {
      toast({
        title: "✅ 設定完了",
        description: "収益受取の設定が完了しました！応援購入を受け取れるようになりました。",
        duration: 5000,
      });
      // URLパラメータをクリア
      router.replace('/profile/stripe-setup');
    }
  }, [success, toast, router]);

  useEffect(() => {
    // 既存のアカウント情報を確認
    checkExistingAccount();
  }, []);

  const checkExistingAccount = async () => {
    try {
      const response = await fetch('/api/stripe/create-connect-account', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStripeAccountId(data.accountId);
        setOnboardingCompleted(data.onboardingCompleted);
      } else if (data.code === 'PLATFORM_PROFILE_INCOMPLETE') {
        // プラットフォーム設定未完了の場合は静かに処理
        console.warn('Stripe platform profile incomplete');
      }
    } catch (error) {
      console.error('Failed to check existing account:', error);
    }
  };

  const createStripeAccount = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/create-connect-account', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // 特定のエラーコードに応じたハンドリング
        if (data.code === 'PLATFORM_PROFILE_INCOMPLETE') {
          toast({
            title: "⚠️ 設定未完了",
            description: "管理者がStripe Connectの設定を完了する必要があります。しばらくお待ちください。",
            duration: 8000,
          });
          return;
        }
        
        throw new Error(data.error || 'アカウント作成に失敗しました');
      }
      
      setStripeAccountId(data.accountId);
      setOnboardingCompleted(data.onboardingCompleted);
      
      if (!data.onboardingCompleted) {
        startOnboarding(data.accountId);
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "アカウント作成に失敗しました",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const startOnboarding = async (accountId: string) => {
    try {
      const response = await fetch('/api/stripe/create-onboarding-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      
      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      toast({
        title: "エラー",
        description: "設定画面の表示に失敗しました",
        duration: 3000,
      });
    }
  };

  // 🔥 設定完了確認の改善
  const checkAccountStatus = async (accountId: string) => {
    try {
      const response = await fetch('/api/stripe/check-account-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      
      const data = await response.json();
      
      if (data.onboardingCompleted) {
        // データベース更新
        await supabase
          .from('app_profiles')
          .update({ 
            stripe_onboarding_completed: true,
            payout_enabled: data.payoutsEnabled || false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', session?.user?.id);
          
        toast({
          title: "✅ 設定完了",
          description: "応援購入機能が利用可能になりました！",
          duration: 3000,
        });
        
        router.push('/profile?stripe_setup=success');
      }
    } catch (error) {
      console.error('Account status check error:', error);
    }
  };

  return (
      <div className="container mx-auto max-w-2xl p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-6 w-6" />
                <span>応援購入 収益受取設定</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {onboardingCompleted ? (
                <div className="text-center space-y-4">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                  <div>
                    <h3 className="text-xl font-semibold">設定完了！</h3>
                    <p className="text-gray-600">
                      応援購入の収益を受け取る準備ができました✨
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-700">
                      💰 これで投稿に応援購入ボタンを設置できます！<br/>
                      収益は自動的にあなたの銀行口座に振り込まれます。
                    </p>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="space-y-3"
                  >
                    <Button
                      onClick={() => router.push('/post?from_stripe_setup=true')}
                      className="w-full"
                      size="lg"
                    >
                      新規投稿画面へ戻る
                    </Button>
                  </motion.div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-800">応援購入の収益受取について</span>
                    </div>
                    <ul className="mt-2 text-sm text-blue-700 space-y-1">
                      <li>• 応援購入の収益を受け取るには銀行口座の登録が必要です</li>
                      <li>• 購入があるたびに自動的にご指定の口座に振り込まれます</li>
                      <li>• プラットフォーム手数料5%を差し引いた金額が入金されます</li>
                      <li>• 設定は数分で完了します</li>
                    </ul>
                  </div>

                  <Button
                    onClick={createStripeAccount}
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        設定中...
                      </>
                    ) : (
                      "収益受取設定を開始"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
  );
} 