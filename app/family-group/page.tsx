"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Plus, Users, Mail, Copy, Trash2, Crown, UserPlus, Settings, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CustomModal } from '@/components/ui/custom-modal';
import { useToast } from '@/hooks/use-toast';
import AppLayout from '@/components/layout/app-layout';

interface FamilyGroup {
  id: string;
  name: string;
  owner_id: string;
  userRole: 'owner' | 'member';
  joinedAt: string;
  members: {
    user_id: string;
    role: string;
    joined_at: string;
    app_profiles: {
      display_name: string;
      avatar_url?: string;
    };
  }[];
}

export default function FamilyGroupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [groupName, setGroupName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 未ログインの場合はリダイレクト
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // グループ一覧を取得
  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/family-group');
      if (!response.ok) {
        throw new Error('グループの取得に失敗しました');
      }
      const data = await response.json();
      setGroups(data.groups || []);
    } catch (error) {
      console.error('Groups fetch error:', error);
      toast({
        title: "エラー",
        description: "グループの取得に失敗しました",
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchGroups();
    }
  }, [status]);

  // URLパラメータをチェックして自動更新
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('refresh') === 'true') {
      // URLパラメータをクリア
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // データを再取得
      if (status === 'authenticated') {
        fetchGroups();
      }
    }
  }, [status]);

  // グループ作成
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast({
        title: "エラー",
        description: "グループ名を入力してください",
        variant: "destructive",
        duration: 1000,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/family-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'グループの作成に失敗しました');
      }

      toast({
        title: "✅ グループ作成完了",
        description: "新しいグループが作成されました",
        duration: 1000,
      });

      setGroupName('');
      setIsCreateModalOpen(false);
      await fetchGroups();
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 招待送信
  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "エラー",
        description: "メールアドレスを入力してください",
        variant: "destructive",
        duration: 1000,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/family-group/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: inviteEmail.trim(),
          groupId: selectedGroupId 
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '招待の送信に失敗しました');
      }

      const data = await response.json();
      
      if (data.emailSent) {
        // メール送信成功
        toast({
          title: "✅ 招待メール送信完了",
          description: `${inviteEmail}に招待メールを送信しました`,
          duration: 1000,
        });
      } else {
        // メール送信失敗、リンクをクリップボードにコピー
        if (navigator.clipboard && data.inviteLink) {
          await navigator.clipboard.writeText(data.inviteLink);
          toast({
            title: "⚠️ メール送信失敗",
            description: "招待リンクをクリップボードにコピーしました。直接共有してください。",
            duration: 3000,
          });
        } else {
          toast({
            title: "⚠️ メール送信失敗", 
            description: data.emailError || "メール送信に失敗しました",
            variant: "destructive",
            duration: 3000,
          });
        }
      }

      setInviteEmail('');
      setIsInviteModalOpen(false);
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* ヘッダー */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <h1 className="text-2xl font-bold text-gray-800">家族グループ管理</h1>
            <p className="text-gray-600">
              家族や友人とのグループを作成して、買い物メモを共有しましょう
            </p>
          </motion.div>

          {/* グループ作成ボタン */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center"
          >
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              新しいグループを作成
            </Button>
          </motion.div>

          {/* グループ一覧 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {groups.length === 0 ? (
              <Card className="bg-white/80 backdrop-blur-sm border-blue-200 shadow-lg">
                <CardContent className="p-8 text-center">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    グループがありません
                  </h3>
                  <p className="text-gray-600 mb-4">
                    最初のグループを作成して、家族や友人と買い物メモを共有しましょう
                  </p>
                  <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    variant="outline"
                  >
                    グループを作成
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {groups.map((group, index) => (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="bg-white/80 backdrop-blur-sm border-blue-200 shadow-lg">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Users className="h-5 w-5 text-blue-500" />
                            <h3 className="text-lg font-semibold text-gray-800">
                              {group.name}
                            </h3>
                            {group.userRole === 'owner' && (
                              <Badge variant="secondary" className="text-xs">
                                <Crown className="h-3 w-3 mr-1" />
                                オーナー
                              </Badge>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedGroupId(group.id);
                                setIsInviteModalOpen(true);
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              招待
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => router.push('/family-group/shopping')}
                              className="bg-green-500 hover:bg-green-600"
                            >
                              <ShoppingCart className="h-4 w-4 mr-1" />
                              買い物メモを見る
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                              メンバー ({group.members.length}人)
                            </h4>
                            <div className="space-y-2">
                              {group.members.map((member) => (
                                <div
                                  key={member.user_id}
                                  className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50"
                                >
                                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                                    {member.app_profiles?.avatar_url ? (
                                      <img
                                        src={member.app_profiles.avatar_url}
                                        alt={member.app_profiles.display_name}
                                        className="w-full h-full rounded-full object-cover"
                                      />
                                    ) : (
                                      <Users className="h-4 w-4 text-gray-600" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">
                                      {member.app_profiles?.display_name || '名前未設定'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {member.role === 'owner' ? 'オーナー' : 'メンバー'}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* グループ作成モーダル */}
        <CustomModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="新しいグループを作成"
          description="家族や友人と共有するグループを作成します。"
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                グループ名
              </label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="例: 田中家の買い物"
                maxLength={50}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                {groupName.length}/50文字
              </p>
            </div>
            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                className="flex-1"
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? '作成中...' : '作成する'}
              </Button>
            </div>
          </div>
        </CustomModal>

        {/* 招待モーダル */}
        <CustomModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          title="メンバーを招待"
          description="グループに招待したい人のメールアドレスを入力してください。"
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                メールアドレス
              </label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="example@email.com"
                className="mt-1"
              />
            </div>
            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsInviteModalOpen(false)}
                className="flex-1"
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleSendInvite}
                disabled={!inviteEmail.trim() || isSubmitting}
                className="flex-1"
              >
                <Mail className="h-4 w-4 mr-2" />
                {isSubmitting ? '送信中...' : '招待を送信'}
              </Button>
            </div>
          </div>
        </CustomModal>
      </div>
    </AppLayout>
  );
}
