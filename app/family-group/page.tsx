"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Plus, Users, Mail, Copy, UserPlus, List, Share2, Check, ChevronDown, ChevronRight, ArrowLeft, Sparkles, Trash2, LogOut, AlertTriangle, Loader2, X, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CustomModal } from '@/components/ui/custom-modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [selectedGroupName, setSelectedGroupName] = useState('');
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [deletingGroups, setDeletingGroups] = useState<Set<string>>(new Set());
  const [leavingGroups, setLeavingGroups] = useState<Set<string>>(new Set());
  const [updatingGroups, setUpdatingGroups] = useState<Set<string>>(new Set());
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    groupId: string;
    groupName: string;
  }>({
    isOpen: false,
    groupId: '',
    groupName: ''
  });
  
  const [leaveConfirmModal, setLeaveConfirmModal] = useState<{
    isOpen: boolean;
    groupId: string;
    groupName: string;
  }>({
    isOpen: false,
    groupId: '',
    groupName: ''
  });

  const [editGroupModal, setEditGroupModal] = useState<{
    isOpen: boolean;
    groupId: string;
    currentName: string;
  }>({
    isOpen: false,
    groupId: '',
    currentName: ''
  });

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

  // 招待リンクとメッセージを生成
  const generateInviteContent = async (groupId: string) => {
    try {
      const response = await fetch('/api/family-group/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          groupId: groupId,
          generateOnly: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '招待リンクの生成に失敗しました');
      }

      const data = await response.json();
      const message = `📋 ${data.groupName}のTODOグループに招待されました！

家族や友達とTODOメモを共有して、効率的にタスクを管理しましょう✨
買い物メモ、家事の分担、作業リストなど何でも管理できます！

参加はこちらから：
${data.inviteLink}

#TODOメモ #家族グループ #トクドクアプリ`;
      
      setInviteLink(data.inviteLink);
      setInviteMessage(message);
      setSelectedGroupName(data.groupName);
    } catch (error: any) {
      console.error('Invite content generation error:', error);
      toast({
        title: "エラー",
        description: error.message || "招待リンクの生成に失敗しました",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // モーダルを開く際に招待コンテンツを生成
  const handleOpenInviteModal = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    setSelectedGroupId(groupId);
    setSelectedGroupName(group?.name || '');
    setIsInviteModalOpen(true);
    generateInviteContent(groupId);
  };

  const copyInviteMessage = async () => {
    try {
      await navigator.clipboard.writeText(inviteMessage);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
      
      toast({
        title: "✅ コピー完了",
        description: "招待メッセージをコピーしました。お好みのSNSに貼り付けてください",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "コピーに失敗しました",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  // メンバー表示のトグル
  const toggleGroupExpansion = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  // グループ削除
  const handleDeleteGroup = async (groupId: string) => {
    if (deletingGroups.has(groupId)) return;

    setDeletingGroups(prev => new Set(prev).add(groupId));
    
    let loadingTimeout: NodeJS.Timeout | undefined;
    
    try {
      // 2秒後にローディング表示
      loadingTimeout = setTimeout(() => {
        if (deletingGroups.has(groupId)) {
          toast({
            title: "処理中",
            description: "グループを削除しています...",
            duration: 1000,
          });
        }
      }, 2000);

      const response = await fetch(`/api/family-group?groupId=${groupId}&action=delete`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'グループの削除に失敗しました');
      }

      toast({
        title: "✅ グループ削除完了",
        description: "グループを削除しました",
        duration: 1000,
      });

      await fetchGroups();
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      if (loadingTimeout) clearTimeout(loadingTimeout);
      setDeletingGroups(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
    }
  };

  // グループ退出
  const handleLeaveGroup = async (groupId: string) => {
    if (leavingGroups.has(groupId)) return;

    setLeavingGroups(prev => new Set(prev).add(groupId));
    
    let loadingTimeout: NodeJS.Timeout | undefined;
    
    try {
      // 2秒後にローディング表示
      loadingTimeout = setTimeout(() => {
        if (leavingGroups.has(groupId)) {
          toast({
            title: "処理中",
            description: "グループから退出しています...",
            duration: 1000,
          });
        }
      }, 2000);

      const response = await fetch(`/api/family-group?groupId=${groupId}&action=leave`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'グループからの退出に失敗しました');
      }

      toast({
        title: "✅ 退出完了",
        description: "グループから退出しました",
        duration: 1000,
      });

      await fetchGroups();
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      if (loadingTimeout) clearTimeout(loadingTimeout);
      setLeavingGroups(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
    }
  };

  // グループ名変更
  const handleUpdateGroupName = async (groupId: string, newName: string) => {
    if (!newName.trim()) {
      toast({
        title: "エラー",
        description: "グループ名を入力してください",
        variant: "destructive",
        duration: 1000,
      });
      return;
    }

    setUpdatingGroups(prev => new Set(prev).add(groupId));
    
    try {
      const response = await fetch('/api/family-group', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          groupId: groupId,
          name: newName.trim() 
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'グループ名の更新に失敗しました');
      }

      toast({
        title: "✅ グループ名更新完了",
        description: "グループ名を更新しました",
        duration: 1000,
      });

      setEditGroupModal({ isOpen: false, groupId: '', currentName: '' });
      await fetchGroups();
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setUpdatingGroups(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
    }
  };

  // グループ名編集モーダルを開く
  const openEditGroupModal = (groupId: string, currentName: string) => {
    setEditGroupModal({
      isOpen: true,
      groupId,
      currentName
    });
  };

  // グループ削除確認モーダルを開く
  const openDeleteConfirmModal = (groupId: string, groupName: string) => {
    setDeleteConfirmModal({
      isOpen: true,
      groupId,
      groupName
    });
  };

  // グループ退出確認モーダルを開く
  const openLeaveConfirmModal = (groupId: string, groupName: string) => {
    setLeaveConfirmModal({
      isOpen: true,
      groupId,
      groupName
    });
  };

  if (status === 'loading' || loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-[#f7f5f3] p-4">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#f7f5f3] p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* ヘッダー */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            {/* お品書き風のデザイン */}
            <div className="relative bg-gradient-to-br from-blue-50 to-indigo-100 border-4 border-blue-300 rounded-lg p-4 shadow-lg">
              {/* 装飾的な角の要素 */}
              <div className="absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 border-blue-400"></div>
              <div className="absolute top-1 right-1 w-3 h-3 border-r-2 border-t-2 border-blue-400"></div>
              <div className="absolute bottom-1 left-1 w-3 h-3 border-l-2 border-b-2 border-blue-400"></div>
              <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-blue-400"></div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-6 h-0.5 bg-blue-400"></div>
                  <Users className="h-6 w-6 text-blue-600" />
                  <div className="w-6 h-0.5 bg-blue-400"></div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-base text-blue-800 font-medium flex items-center justify-center space-x-1">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    <span>家族や友達とグループを<br />作成してメモを共有しよう！</span>
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                  </p>
                </div>
                
                <div className="flex items-center justify-center space-x-2 text-sm text-blue-700">
                  <div className="w-8 h-0.5 bg-blue-300"></div>
                  <span className="font-medium text-center">
                    買い物メモはもちろん、<br />家事の分担や作業リストを<br />
                    グループで共有しよう
                  </span>
                  <div className="w-8 h-0.5 bg-blue-300"></div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ボタン群 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center space-x-4"
          >
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
            >
              戻る
            </Button>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
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
                  <Users className="h-16 w-16 text-blue-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">
                    グループがありません
                  </h3>
                  <p className="text-blue-600 mb-4">
                    最初のグループを作成して、家族や友人と<br />
                    TODOリストを共有しましょう
                  </p>
                  <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    variant="outline"
                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    グループを作成
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-blue-800 mb-2">
                    参加中のグループ
                  </h2>
                  <p className="text-blue-600 text-sm">
                    {groups.length}個のグループに参加しています
                  </p>
                </div>
                
                {groups.map((group, index) => (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="bg-white/80 backdrop-blur-sm border-blue-200 shadow-lg hover:shadow-xl transition-all duration-200">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {/* グループ名 */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center">
                                <img 
                                  src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749098791/%E9%B3%A9_azif4f.png" 
                                  alt="トクドク" 
                                  className="h-9 w-9"
                                />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-blue-800">
                                  {group.name}
                                </h3>
                                <p className="text-sm text-blue-600">
                                  {group.members.length}人のメンバー
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* ボタン群 */}
                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenInviteModal(group.id)}
                              className="border-blue-300 text-blue-600 hover:bg-blue-50"
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              招待
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => router.push(`/family-group/shopping?groupId=${group.id}`)}
                              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                            >
                              <List className="h-4 w-4 mr-1" />
                              共有メモ
                            </Button>
                          </div>

                          {/* グループ管理ボタン */}
                          <div className="pt-2 border-t border-blue-100">
                            {group.userRole === 'owner' ? (
                              <div className="grid grid-cols-2 gap-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                  disabled={updatingGroups.has(group.id)}
                                  onClick={() => openEditGroupModal(group.id, group.name)}
                                >
                                  {updatingGroups.has(group.id) ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      更新中...
                                    </>
                                  ) : (
                                    <>
                                      <Edit3 className="h-4 w-4 mr-2" />
                                      名前変更
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={deletingGroups.has(group.id)}
                                  onClick={() => openDeleteConfirmModal(group.id, group.name)}
                                >
                                  {deletingGroups.has(group.id) ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      削除中...
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      削除
                                    </>
                                  )}
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                                disabled={leavingGroups.has(group.id)}
                                onClick={() => openLeaveConfirmModal(group.id, group.name)}
                              >
                                {leavingGroups.has(group.id) ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    退出中...
                                  </>
                                ) : (
                                  <>
                                    <LogOut className="h-4 w-4 mr-2" />
                                    グループから退出
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                          
                          {/* メンバー（トグル表示） */}
                          <Collapsible
                            open={expandedGroups.has(group.id)}
                            onOpenChange={() => toggleGroupExpansion(group.id)}
                          >
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                className="w-full justify-between p-3 h-auto text-left bg-blue-50/50 hover:bg-blue-100/50 border border-blue-200"
                              >
                                <span className="text-sm font-medium text-blue-700">
                                  メンバー一覧 ({group.members.length}人)
                                </span>
                                {expandedGroups.has(group.id) ? (
                                  <ChevronDown className="h-4 w-4 text-blue-500" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-blue-500" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-2 mt-2">
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                {group.members.map((member) => (
                                  <div
                                    key={member.user_id}
                                    className="flex items-center space-x-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100"
                                  >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-indigo-400 flex items-center justify-center">
                                      {member.app_profiles?.avatar_url ? (
                                        <img
                                          src={member.app_profiles.avatar_url}
                                          alt={member.app_profiles.display_name}
                                          className="w-full h-full rounded-full object-cover"
                                        />
                                      ) : (
                                        <img 
                                          src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749098791/%E9%B3%A9_azif4f.png" 
                                          alt="トクドク" 
                                          className="h-4 w-4"
                                        />
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-blue-900">
                                        {member.app_profiles?.display_name || '名前未設定'}
                                      </p>
                                      <p className="text-xs text-blue-600">
                                        {member.role === 'owner' ? 'オーナー' : 'メンバー'}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </motion.div>
                            </CollapsibleContent>
                          </Collapsible>
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
                style={{ fontSize: '16px' }}
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
          onClose={() => {
            setIsInviteModalOpen(false);
            setInviteEmail('');
            setInviteMessage('');
            setInviteLink('');
            setCopiedMessage(false);
          }}
          title="メンバーを招待"
          description="メール招待またはSNSでの共有を選択してください。"
        >
          <Tabs defaultValue="sns" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sns" className="flex items-center space-x-2">
                <Share2 className="h-4 w-4" />
                <span>SNSシェア</span>
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>メール招待</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sns" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-2">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    招待メッセージ
                  </label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                      {inviteMessage}
                    </pre>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    このメッセージをコピーしてSNSで共有してください
                  </p>
                </div>
                
                <div className="space-y-4">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={copyInviteMessage}
                      variant="outline"
                      className="w-full justify-center space-x-3 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white hover:text-white border-blue-500"
                      disabled={!inviteMessage}
                    >
                      {copiedMessage ? (
                        <>
                          <Check className="h-5 w-5" />
                          <span>コピー完了！</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-5 w-5" />
                          <span>メッセージをコピー</span>
                        </>
                      )}
                    </Button>
                  </motion.div>
                  
                  {/* セキュリティ注意文言を追加 */}
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600 font-medium">
                      ⚠️ 注意：メンバーに追加したいユーザー以外にはリンクを教えないでください
                    </p>
                    <p className="text-xs text-red-500 mt-1">
                      このリンクを知っている人は誰でもグループに参加できます
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsInviteModalOpen(false)}
                  >
                    閉じる
                  </Button>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="email" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
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
              </motion.div>
            </TabsContent>
          </Tabs>
        </CustomModal>

        {/* グループ削除確認モーダル */}
        <CustomModal
          isOpen={deleteConfirmModal.isOpen}
          onClose={() => setDeleteConfirmModal({ isOpen: false, groupId: '', groupName: '' })}
          title="グループを削除しますか？"
          description={`「${deleteConfirmModal.groupName}」を完全に削除します。`}
        >
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span className="font-medium text-red-800">警告</span>
              </div>
              <p className="text-sm text-red-700 mb-2">
                この操作は取り消すことができません。以下のデータがすべて削除されます：
              </p>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                <li>グループ内のすべてのメモ</li>
                <li>メンバー情報</li>
                <li>未完了の招待</li>
              </ul>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmModal({ isOpen: false, groupId: '', groupName: '' })}
                className="flex-1"
                disabled={deletingGroups.has(deleteConfirmModal.groupId)}
              >
                キャンセル
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  handleDeleteGroup(deleteConfirmModal.groupId);
                  setDeleteConfirmModal({ isOpen: false, groupId: '', groupName: '' });
                }}
                disabled={deletingGroups.has(deleteConfirmModal.groupId)}
                className="flex-1"
              >
                削除する
              </Button>
            </div>
          </div>
        </CustomModal>

        {/* グループ退出確認モーダル */}
        <CustomModal
          isOpen={leaveConfirmModal.isOpen}
          onClose={() => setLeaveConfirmModal({ isOpen: false, groupId: '', groupName: '' })}
          title="グループから退出しますか？"
          description={`「${leaveConfirmModal.groupName}」から退出します。`}
        >
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                退出すると、このグループの買い物メモにアクセスできなくなります。
                再度参加するには、オーナーからの招待が必要です。
              </p>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setLeaveConfirmModal({ isOpen: false, groupId: '', groupName: '' })}
                className="flex-1"
                disabled={leavingGroups.has(leaveConfirmModal.groupId)}
              >
                キャンセル
              </Button>
              <Button
                onClick={() => {
                  handleLeaveGroup(leaveConfirmModal.groupId);
                  setLeaveConfirmModal({ isOpen: false, groupId: '', groupName: '' });
                }}
                disabled={leavingGroups.has(leaveConfirmModal.groupId)}
                className="flex-1"
              >
                退出する
              </Button>
            </div>
          </div>
        </CustomModal>

        {/* グループ名編集モーダル */}
        <CustomModal
          isOpen={editGroupModal.isOpen}
          onClose={() => setEditGroupModal({ isOpen: false, groupId: '', currentName: '' })}
          title="グループ名を変更"
          description="新しいグループ名を入力してください。"
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                新しいグループ名
              </label>
              <Input
                value={editGroupModal.currentName}
                onChange={(e) => setEditGroupModal(prev => ({ ...prev, currentName: e.target.value }))}
                placeholder="例: 田中家の買い物"
                maxLength={50}
                className="mt-1"
                style={{ fontSize: '16px' }}
              />
              <p className="text-xs text-gray-500 mt-1">
                {editGroupModal.currentName.length}/50文字
              </p>
            </div>
            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setEditGroupModal({ isOpen: false, groupId: '', currentName: '' })}
                className="flex-1"
                disabled={updatingGroups.has(editGroupModal.groupId)}
              >
                キャンセル
              </Button>
              <Button
                onClick={() => handleUpdateGroupName(editGroupModal.groupId, editGroupModal.currentName)}
                disabled={!editGroupModal.currentName.trim() || updatingGroups.has(editGroupModal.groupId)}
                className="flex-1"
              >
                {updatingGroups.has(editGroupModal.groupId) ? '更新中...' : '更新する'}
              </Button>
            </div>
          </div>
        </CustomModal>
      </div>
    </AppLayout>
  );
}
