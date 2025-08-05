"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft } from 'lucide-react';

export default function StripeSetupPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [accountStatus, setAccountStatus] = useState<any>(null);
  const [isUpdatingCapabilities, setIsUpdatingCapabilities] = useState(false);

  const success = searchParams.get('success');

  useEffect(() => {
    if (success === 'true') {
      updateOnboardingStatus();
      toast({
        title: "✅ 設定完了",
        description: "おすそわけ機能が利用可能になりました！",
        duration: 1000,
      });
      router.replace('/profile/stripe-setup');
    }
  }, [success, toast, router]);

  // 🔥 修正：オンボーディング完了状況をデータベースに更新
  const updateOnboardingStatus = async () => {
    if (!session?.user?.id || !stripeAccountId) return;
    
    try {
      // 🔥 Stripeアカウントの最新状態を確認
      const response = await fetch('/api/stripe/check-account-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: stripeAccountId }),
      });
      
      const accountStatus = await response.json();
      
      const { error } = await supabase
        .from('app_profiles')
        .update({ 
          stripe_onboarding_completed: accountStatus.onboardingCompleted || true,
          payout_enabled: accountStatus.payoutsEnabled || false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Failed to update onboarding status:', error);
      } else {
        setOnboardingCompleted(true);
        console.log('Onboarding status updated:', {
          onboarding: accountStatus.onboardingCompleted,
          payouts: accountStatus.payoutsEnabled
        });
      }
    } catch (error) {
      console.error('Error updating onboarding status:', error);
    }
  };

  useEffect(() => {
    // 既存のアカウント情報を確認
    checkExistingAccount();
  }, []);

  const checkExistingAccount = async () => {
    if (!session?.user?.id) return;
    
    try {
      const { data: profile } = await supabase
        .from('app_profiles')
        .select('stripe_account_id, stripe_onboarding_completed, payout_enabled')
        .eq('user_id', session.user.id)
        .single();

      if (profile?.stripe_account_id) {
        setStripeAccountId(profile.stripe_account_id);
        setOnboardingCompleted(profile.stripe_onboarding_completed || false);
        
        // 🔥 追加：アカウント状態を詳細チェック
        await checkDetailedAccountStatus(profile.stripe_account_id);
      }
    } catch (error) {
      console.error('Error checking existing account:', error);
    }
  };

  // 🔥 新規追加：詳細なアカウント状態チェック
  const checkDetailedAccountStatus = async (accountId: string) => {
    try {
      const response = await fetch('/api/stripe/check-account-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      
      const status = await response.json();
      setAccountStatus(status);
      
      console.log('Detailed account status:', status);
    } catch (error) {
      console.error('Error checking detailed account status:', error);
    }
  };

  // 🔥 新規追加：既存アカウントのcapabilities更新
  const updateAccountCapabilities = async () => {
    if (!stripeAccountId) return;
    
    setIsUpdatingCapabilities(true);
    try {
      const response = await fetch('/api/stripe/update-account-capabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: stripeAccountId }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "✅ アカウント機能を更新しました",
          description: "オンボーディングを再度完了してください",
          duration: 1000,
        });
        
        // オンボーディングを開始
        await startOnboarding(stripeAccountId);
      } else {
        throw new Error(result.error || 'アカウント機能の更新に失敗しました');
      }
    } catch (error) {
      console.error('Error updating account capabilities:', error);
      toast({
        title: "エラー",
        description: "アカウント機能の更新に失敗しました",
        duration: 3000,
      });
    } finally {
      setIsUpdatingCapabilities(false);
    }
  };

  // 既存のコードの createStripeAccount 関数を修正

  const createStripeAccount = async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/create-connect-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      
      if (data.accountId) {
        setStripeAccountId(data.accountId);
        
        if (!data.onboardingCompleted) {
          await startOnboarding(data.accountId);
        } else {
          setOnboardingCompleted(true);
          toast({
            title: "✅ アカウント設定完了",
            description: "おすそわけ機能が利用可能です！",
            duration: 1000,
          });
        }
      } else {
        // 🔥 修正：エラーコードに応じた詳細なメッセージ
        let errorMessage = data.error || 'アカウント作成に失敗しました';
        
        if (data.code === 'TOS_ACCEPTANCE_ERROR') {
          errorMessage = 'Stripe設定に問題があります。しばらく時間をおいて再度お試しください。';
        } else if (data.code === 'PLATFORM_PROFILE_INCOMPLETE') {
          errorMessage = 'プラットフォーム設定が未完了です。管理者にお問い合わせください。';
        } else if (data.code === 'CAPABILITIES_ERROR') {
          errorMessage = 'アカウント機能の設定に問題があります。管理者にお問い合わせください。';
        }
        
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('Stripe account creation error:', error);
      toast({
        title: "エラー",
        description: error.message || "アカウント作成に失敗しました",
        duration: 5000, // エラーメッセージは長めに表示
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
          description: "おすそわけ機能が利用可能になりました！",
          duration: 1000,
        });
        
        router.push('/profile?stripe_setup=success');
      }
    } catch (error) {
      console.error('Account status check error:', error);
    }
  };

  // 🔥 新規追加：capabilities状態の表示
  const renderCapabilitiesStatus = () => {
    if (!accountStatus?.capabilities) return null;

    const { capabilities } = accountStatus;
    
    return (
      <div className="space-y-2">
        <h4 className="font-medium text-sm">アカウント機能状態:</h4>
        <div className="flex flex-wrap gap-2">
          <Badge variant={capabilities.card_payments === 'active' ? 'default' : 'secondary'}>
            カード決済: {capabilities.card_payments || 'inactive'}
          </Badge>
          <Badge variant={capabilities.transfers === 'active' ? 'default' : 'secondary'}>
            転送機能: {capabilities.transfers || 'inactive'}
          </Badge>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-2xl p-4 pb-20">
      <Card>
        <CardHeader>
          <CardTitle>おすそわけ機能の設定</CardTitle>
          <CardDescription>
            投稿におすそわけボタンを設置して、支援を受け取るための設定を行います
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!stripeAccountId ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                おすそわけ機能を利用するには、収益受取のためのアカウント設定が必要です。
              </p>
              <Button 
                onClick={createStripeAccount} 
                disabled={loading}
                className="w-full"
              >
                {loading ? "設定中..." : "収益受取設定を開始"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium">アカウントID: {stripeAccountId}</p>
                <p className="text-sm text-gray-600 mt-1">
                  設定状況: {onboardingCompleted ? "✅ 完了" : "⏳ 未完了"}
                </p>
                
                {/* 🔥 追加：capabilities状態表示 */}
                {renderCapabilitiesStatus()}
                
                {/* 🔥 追加：要件が不足している場合の警告 */}
                {accountStatus?.requirementsNeeded?.length > 0 && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm font-medium text-yellow-800">追加設定が必要です:</p>
                    <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside">
                      {accountStatus.requirementsNeeded.map((req: string, index: number) => (
                        <li key={index}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {!onboardingCompleted && (
                  <Button 
                    onClick={() => startOnboarding(stripeAccountId)} 
                    className="w-full"
                  >
                    設定を完了する
                  </Button>
                )}
                
                {/* 🔥 新規追加：既存アカウントの機能更新ボタン */}
                {accountStatus?.capabilities?.transfers !== 'active' && (
                  <Button 
                    onClick={updateAccountCapabilities}
                    disabled={isUpdatingCapabilities}
                    variant="outline"
                    className="w-full"
                  >
                    {isUpdatingCapabilities ? "更新中..." : "アカウント機能を更新"}
                  </Button>
                )}
                
                <Button 
                  onClick={() => checkAccountStatus(stripeAccountId)} 
                  variant="outline"
                  className="w-full"
                >
                  設定状況を確認
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
    </div>
  );
} 