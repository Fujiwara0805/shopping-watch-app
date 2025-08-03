"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CustomModal } from '@/components/ui/custom-modal';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Info, Edit, CreditCard, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StripeAccountManagementPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  
  // 🔥 新規追加: 削除確認モーダルの状態
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // フォームデータ
  const [updateForm, setUpdateForm] = useState({
    email: '',
    businessName: '',
    productDescription: '',
    website: '',
    supportPhone: '',
    supportEmail: '',
    individual: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
    }
  });

  useEffect(() => {
    if (session?.user?.id) {
      fetchAccountInfo();
    }
  }, [session]);

  const fetchAccountInfo = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/get-account-info');
      const data = await response.json();
      
      if (data.accountInfo) {
        setAccountInfo(data);
        
        // フォームに現在の情報を設定
        setUpdateForm({
          email: data.accountInfo.email || '',
          businessName: data.accountInfo.business_profile?.name || '',
          productDescription: data.accountInfo.business_profile?.product_description || '',
          website: data.accountInfo.business_profile?.url || '',
          supportPhone: data.accountInfo.business_profile?.support_phone || '',
          supportEmail: data.accountInfo.business_profile?.support_email || '',
          individual: {
            firstName: data.accountInfo.individual?.first_name || '',
            lastName: data.accountInfo.individual?.last_name || '',
            phone: data.accountInfo.individual?.phone || '',
            email: data.accountInfo.individual?.email || '',
          }
        });
      } else {
        toast({
          title: "アカウント情報が見つかりません",
          description: "Stripeアカウントが設定されていません",
          duration: 3000,
        });
        router.push('/profile/stripe-setup');
      }
    } catch (error) {
      console.error('Failed to fetch account info:', error);
      toast({
        title: "エラー",
        description: "アカウント情報の取得に失敗しました",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAccount = async () => {
    setUpdating(true);
    try {
      const response = await fetch('/api/stripe/update-account-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updateData: updateForm }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "✅ 更新完了",
          description: "アカウント情報を更新しました",
          duration: 1000,
        });
        await fetchAccountInfo(); // 情報を再取得
      } else {
        throw new Error(data.error || 'アカウント情報の更新に失敗しました');
      }
    } catch (error: any) {
      console.error('Account update error:', error);
      toast({
        title: "エラー",
        description: error.message || "アカウント情報の更新に失敗しました",
        duration: 3000,
      });
    } finally {
      setUpdating(false);
    }
  };

  // 🔥 更新された削除ハンドラー
  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const response = await fetch('/api/stripe/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmDeletion: true }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "✅ 削除完了",
          description: "Stripeアカウントを削除しました",
          duration: 1000,
        });
        setShowDeleteModal(false);
        router.push('/profile');
      } else {
        throw new Error(data.error || 'アカウントの削除に失敗しました');
      }
    } catch (error: any) {
      console.error('Account deletion error:', error);
      toast({
        title: "エラー",
        description: error.message || "アカウントの削除に失敗しました",
        duration: 5000,
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  // タブボタンコンポーネント
  const TabButton = ({ 
    value, 
    icon: Icon, 
    children, 
    colorClass 
  }: { 
    value: string; 
    icon: any; 
    children: React.ReactNode; 
    colorClass: string;
  }) => (
    <button
      onClick={() => setActiveTab(value)}
      className={cn(
        "flex items-center justify-center p-3 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-all duration-200",
        activeTab === value ? colorClass : ""
      )}
    >
      <Icon className="h-4 w-4 mr-2" />
      {children}
    </button>
  );

  return (
    <div className="container mx-auto max-w-4xl p-4 pb-20 space-y-6">
      <div className="space-y-4">
        {/* カスタムタブナビゲーション */}
        <div className="grid grid-cols-2 gap-2">
          <TabButton 
            value="info" 
            icon={Info} 
            colorClass="bg-blue-50 border-blue-200 text-blue-700"
          >
            アカウント情報
          </TabButton>
          <TabButton 
            value="update" 
            icon={Edit} 
            colorClass="bg-green-50 border-green-200 text-green-700"
          >
            情報更新
          </TabButton>
          <TabButton 
            value="balance" 
            icon={CreditCard} 
            colorClass="bg-purple-50 border-purple-200 text-purple-700"
          >
            残高・支払い
          </TabButton>
          <TabButton 
            value="danger" 
            icon={AlertTriangle} 
            colorClass="bg-red-50 border-red-200 text-red-700"
          >
            危険な操作
          </TabButton>
        </div>

        {/* タブコンテンツ */}
        {activeTab === 'info' && (
          <Card>
            <CardHeader>
              <CardTitle>現在のアカウント情報</CardTitle>
              <CardDescription>
                Stripeに登録されているアカウント情報を確認できます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">アカウントID</Label>
                  <p className="text-sm text-gray-600">{accountInfo?.accountInfo?.id}</p>
                </div>
                <div>
                  <Label className="font-medium">メールアドレス</Label>
                  <p className="text-sm text-gray-600">{accountInfo?.accountInfo?.email || '未設定'}</p>
                </div>
                <div>
                  <Label className="font-medium">アカウントタイプ</Label>
                  <p className="text-sm text-gray-600">{accountInfo?.accountInfo?.type}</p>
                </div>
                <div>
                  <Label className="font-medium">国</Label>
                  <p className="text-sm text-gray-600">{accountInfo?.accountInfo?.country}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="font-medium">アカウント状態</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={accountInfo?.accountInfo?.details_submitted ? 'default' : 'secondary'}>
                    詳細情報: {accountInfo?.accountInfo?.details_submitted ? '提出済み' : '未提出'}
                  </Badge>
                  <Badge variant={accountInfo?.accountInfo?.charges_enabled ? 'default' : 'secondary'}>
                    決済: {accountInfo?.accountInfo?.charges_enabled ? '有効' : '無効'}
                  </Badge>
                  <Badge variant={accountInfo?.accountInfo?.payouts_enabled ? 'default' : 'secondary'}>
                    支払い: {accountInfo?.accountInfo?.payouts_enabled ? '有効' : '無効'}
                  </Badge>
                </div>
              </div>

              {accountInfo?.accountInfo?.business_profile && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="font-medium">ビジネス情報</Label>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <p><span className="font-medium">名前:</span> {accountInfo.accountInfo.business_profile.name || '未設定'}</p>
                      <p><span className="font-medium">説明:</span> {accountInfo.accountInfo.business_profile.product_description || '未設定'}</p>
                      <p><span className="font-medium">ウェブサイト:</span> {accountInfo.accountInfo.business_profile.url || '未設定'}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'update' && (
          <Card>
            <CardHeader>
              <CardTitle>アカウント情報の更新</CardTitle>
              <CardDescription>
                Stripeアカウントの情報を更新できます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input
                    id="email"
                    type="email"
                    value={updateForm.email}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="businessName">ビジネス名</Label>
                  <Input
                    id="businessName"
                    value={updateForm.businessName}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, businessName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="website">ウェブサイト</Label>
                  <Input
                    id="website"
                    type="url"
                    value={updateForm.website}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, website: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="supportEmail">サポートメール</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={updateForm.supportEmail}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, supportEmail: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="productDescription">サービス説明</Label>
                <Textarea
                  id="productDescription"
                  value={updateForm.productDescription}
                  onChange={(e) => setUpdateForm(prev => ({ ...prev, productDescription: e.target.value }))}
                  rows={3}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="font-medium">個人情報</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">姓</Label>
                    <Input
                      id="firstName"
                      value={updateForm.individual.firstName}
                      onChange={(e) => setUpdateForm(prev => ({ 
                        ...prev, 
                        individual: { ...prev.individual, firstName: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">名</Label>
                    <Input
                      id="lastName"
                      value={updateForm.individual.lastName}
                      onChange={(e) => setUpdateForm(prev => ({ 
                        ...prev, 
                        individual: { ...prev.individual, lastName: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleUpdateAccount} 
                disabled={updating}
                className="w-full"
              >
                {updating ? "更新中..." : "アカウント情報を更新"}
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTab === 'balance' && (
          <Card>
            <CardHeader>
              <CardTitle>残高・支払い履歴</CardTitle>
              <CardDescription>
                現在の残高と最近の支払い履歴を確認できます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {accountInfo?.balance && (
                <div className="space-y-2">
                  <Label className="font-medium">現在の残高</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-800">利用可能残高</p>
                      <p className="text-lg font-bold text-green-900">
                        ¥{accountInfo.balance.available.reduce((sum: number, b: any) => sum + b.amount, 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800">保留中残高</p>
                      <p className="text-lg font-bold text-yellow-900">
                        ¥{accountInfo.balance.pending.reduce((sum: number, b: any) => sum + b.amount, 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {accountInfo?.recentPayouts && (
                <div className="space-y-2">
                  <Label className="font-medium">最近の支払い履歴</Label>
                  <div className="space-y-2">
                    {accountInfo.recentPayouts.length > 0 ? (
                      accountInfo.recentPayouts.map((payout: any) => (
                        <div key={payout.id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">¥{payout.amount.toLocaleString()}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(payout.created * 1000).toLocaleDateString('ja-JP')}
                              </p>
                            </div>
                            <Badge variant={payout.status === 'paid' ? 'default' : 'secondary'}>
                              {payout.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-600">支払い履歴がありません</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'danger' && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">危険な操作</CardTitle>
              <CardDescription>
                以下の操作は元に戻すことができません。慎重に実行してください。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-medium text-red-800 mb-2">Stripeアカウントの削除</h3>
                <p className="text-sm text-red-700 mb-4">
                  アカウントを削除すると、すべての応援購入機能が利用できなくなります。
                  未処理の支払いがある場合は削除できません。
                </p>
                
                <Button 
                  variant="destructive" 
                  disabled={deleting}
                  onClick={() => setShowDeleteModal(true)}
                >
                  {deleting ? (
                    <motion.div
                      className="flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                        className="mr-2"
                      >
                        <Loader2 className="h-4 w-4" />
                      </motion.div>
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      >
                        削除中...
                      </motion.span>
                    </motion.div>
                  ) : (
                    "アカウントを削除"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 🔥 新規追加: CustomModalを使用した削除確認モーダル */}
      <CustomModal
        isOpen={showDeleteModal}
        onClose={() => !deleting && setShowDeleteModal(false)}
        title="Stripeアカウントの削除"
        description="本当にStripeアカウントを削除しますか？この操作は元に戻すことができません。"
        className="max-w-lg"
      >
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-4 bg-red-50 border border-red-200 rounded-lg"
          >
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-800">
                  削除後は以下の機能が利用できなくなります：
                </p>
                <ul className="text-sm text-red-700 space-y-1 list-disc list-inside ml-2">
                  <li>応援購入機能の提供</li>
                  <li>支払いの受け取り</li>
                  <li>残高の確認・引き出し</li>
                  <li>取引履歴の閲覧</li>
                </ul>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
          >
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800 mb-1">
                  削除前の確認事項
                </p>
                <p className="text-sm text-yellow-700">
                  未処理の支払いや保留中の残高がないことを確認してください。
                  削除後は復旧できません。
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="flex justify-end space-x-3 pt-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
              className="min-w-[100px]"
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="min-w-[120px] bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <motion.div
                  className="flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="mr-2"
                  >
                    <Loader2 className="h-4 w-4" />
                  </motion.div>
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    削除中...
                  </motion.span>
                </motion.div>
              ) : (
                "削除する"
              )}
            </Button>
          </motion.div>
        </div>
      </CustomModal>
    </div>
  );
} 