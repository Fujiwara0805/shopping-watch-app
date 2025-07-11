"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Users, Check, X, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import AppLayout from '@/components/layout/app-layout';

interface InvitationInfo {
  id: string;
  group_id: string;
  invitee_email: string;
  status: string;
  expires_at: string;
  family_groups: {
    id: string;
    name: string;
    owner_id: string;
  };
}

export default function JoinGroupPage({ params }: { params: { token: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string>('');

  // 招待情報を取得
  const fetchInvitation = async () => {
    try {
      const response = await fetch(`/api/family-group/invitation/${params.token}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '招待情報の取得に失敗しました');
      }
      const data = await response.json();
      setInvitation(data.invitation);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitation();
  }, [params.token]);

  // グループに参加
  const handleJoinGroup = async () => {
    if (!session?.user?.id) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setIsJoining(true);
    try {
      const response = await fetch('/api/family-group/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params.token }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'グループへの参加に失敗しました');
      }

      toast({
        title: "✅ 参加完了",
        description: "グループに参加しました",
        duration: 1000,
      });

      // グループ管理ページにリダイレクト
      router.push('/family-group');
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setIsJoining(false);
    }
  };

  // 招待を拒否
  const handleDeclineInvitation = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
          <div className="max-w-md mx-auto mt-20">
            <Card className="bg-white/80 backdrop-blur-sm border-red-200 shadow-lg">
              <CardContent className="p-8 text-center">
                <X className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  招待が無効です
                </h2>
                <p className="text-gray-600 mb-6">
                  {error}
                </p>
                <Button
                  onClick={() => router.push('/')}
                  variant="outline"
                >
                  ホームに戻る
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!invitation) {
    return null;
  }

  // 招待の有効期限チェック
  const isExpired = new Date(invitation.expires_at) < new Date();
  const isAlreadyProcessed = invitation.status !== 'pending';

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="max-w-md mx-auto mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-blue-200 shadow-lg">
              <CardHeader>
                <div className="text-center">
                  <Users className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-gray-800">
                    グループへの招待
                  </h2>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {isExpired ? (
                  <div className="text-center">
                    <p className="text-red-600 mb-4">
                      この招待は有効期限が切れています。
                    </p>
                    <Button
                      onClick={() => router.push('/')}
                      variant="outline"
                    >
                      ホームに戻る
                    </Button>
                  </div>
                ) : isAlreadyProcessed ? (
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">
                      この招待は既に処理済みです。
                    </p>
                    <Button
                      onClick={() => router.push('/family-group')}
                      variant="outline"
                    >
                      グループ管理へ
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        「{invitation.family_groups.name}」
                      </h3>
                      <p className="text-gray-600">
                        上記のグループに招待されています
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-blue-800">
                          招待先: {invitation.invitee_email}
                        </span>
                      </div>
                    </div>

                    {status === 'unauthenticated' ? (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600 text-center">
                          グループに参加するにはログインが必要です
                        </p>
                        <Button
                          onClick={() => router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`)}
                          className="w-full"
                        >
                          ログインして参加
                        </Button>
                      </div>
                    ) : session?.user?.email !== invitation.invitee_email ? (
                      <div className="space-y-4">
                        <p className="text-sm text-red-600 text-center">
                          招待されたメールアドレス（{invitation.invitee_email}）でログインしてください
                        </p>
                        <Button
                          onClick={() => router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`)}
                          variant="outline"
                          className="w-full"
                        >
                          別のアカウントでログイン
                        </Button>
                      </div>
                    ) : (
                      <div className="flex space-x-3">
                        <Button
                          variant="outline"
                          onClick={handleDeclineInvitation}
                          className="flex-1"
                          disabled={isJoining}
                        >
                          <X className="h-4 w-4 mr-2" />
                          辞退
                        </Button>
                        <Button
                          onClick={handleJoinGroup}
                          disabled={isJoining}
                          className="flex-1 bg-green-500 hover:bg-green-600"
                        >
                          {isJoining ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              参加中...
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              参加する
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 text-center">
                      有効期限: {new Date(invitation.expires_at).toLocaleDateString('ja-JP')}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
