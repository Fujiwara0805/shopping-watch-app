"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

export default function StripeAccountManagementPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
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
          duration: 3000,
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
          duration: 3000,
        });
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

  return (
    <div className="container mx-auto max-w-4xl p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stripeアカウント管理</h1>
        <Button variant="outline" onClick={() => router.back()}>
          戻る
        </Button>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">アカウント情報</TabsTrigger>
          <TabsTrigger value="update">情報更新</TabsTrigger>
          <TabsTrigger value="balance">残高・支払い</TabsTrigger>
          <TabsTrigger value="danger">危険な操作</TabsTrigger>
        </TabsList>

        {/* アカウント情報表示 */}
        <TabsContent value="info">
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
        </TabsContent>

        {/* 情報更新 */}
        <TabsContent value="update">
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
        </TabsContent>

        {/* 残高・支払い */}
        <TabsContent value="balance">
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
        </TabsContent>

        {/* 危険な操作 */}
        <TabsContent value="danger">
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
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={deleting}>
                      {deleting ? "削除中..." : "アカウントを削除"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Stripeアカウントの削除</AlertDialogTitle>
                      <AlertDialogDescription>
                        本当にStripeアカウントを削除しますか？この操作は元に戻すことができません。
                        削除後は応援購入機能が利用できなくなります。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>キャンセル</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        削除する
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 