"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, Trash2, History, WifiOff, Loader2, Edit, LogIn, X, CheckSquare, Sparkles, PackageCheck, ShoppingBag, MessageSquare, Users, ArrowLeft, Crown, StickyNote, ListTodo, Home, Briefcase } from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from 'usehooks-ts';
import { CustomModal } from '@/components/ui/custom-modal';

// ローカルストレージ用のアイテム（拡張版）
interface LocalShoppingItem {
  id: string;
  item_name: string;
  memo?: string;
  is_completed: boolean;
  created_at: string;
  user_id: string; // 作成者ID
  completed_by?: string; // 完了者ID
  completed_at?: string; // 完了日時
  synced: boolean; // サーバーと同期済みかどうか
  creator: {
    display_name: string;
    avatar_url?: string;
  };
  completed_by_profile?: {
    display_name: string;
    avatar_url?: string;
  } | null;
}

// サーバーから取得するアイテム（既存）
interface FamilyShoppingItem {
  id: string;
  item_name: string;
  memo?: string | null;
  quantity: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_completed: boolean;
  completed_by?: string | null;
  completed_at?: string | null;
  created_at: string;
  user_id: string;
  creator: {
    display_name: string;
    avatar_url?: string;
  };
  completed_by_profile?: {
    display_name: string;
    avatar_url?: string;
  } | null;
}

interface FamilyGroup {
  id: string;
  name: string;
  owner_id: string;
  userRole: 'owner' | 'member';
  members: {
    user_id: string;
    role: string;
    app_profiles: {
      display_name: string;
      avatar_url?: string;
    };
  }[];
}

export default function FamilyShoppingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [currentGroup, setCurrentGroup] = useState<FamilyGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  
  // ローカルストレージベースの高速リスト
  const groupId = searchParams.get('groupId');
  const [localItems, setLocalItems] = useLocalStorage<LocalShoppingItem[]>(
    `family-shopping-${groupId || 'default'}`, 
    []
  );
  
  // UI状態
  const [newItemName, setNewItemName] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemMemo, setNewItemMemo] = useState('');
  const [syncingItems, setSyncingItems] = useState<Set<string>>(new Set());

  // 現在のユーザープロフィール情報を取得
  const getCurrentUserProfile = () => {
    if (!session?.user) return null;
    
    const currentMember = currentGroup?.members.find(
      member => member.user_id === session.user.id
    );
    
    return currentMember ? {
      display_name: currentMember.app_profiles?.display_name || '匿名',
      avatar_url: currentMember.app_profiles?.avatar_url
    } : {
      display_name: '匿名',
      avatar_url: undefined
    };
  };

  // 未ログインの場合はリダイレクト
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=${encodeURIComponent('/family-group/shopping')}`);
    }
  }, [status, router]);

  // オンライン状態の監視
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // サーバーデータを取得
  const fetchServerData = useCallback(async () => {
    if (status !== 'authenticated' || !session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      const url = groupId 
        ? `/api/family-group/shopping?groupId=${groupId}`
        : '/api/family-group/shopping';
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('データの取得に失敗しました');
      }
      const data = await response.json();
      
      if (!data.group) {
        router.push('/family-group');
        return;
      }
      
      setCurrentGroup(data.group);
      
      // サーバーデータとローカルデータを同期
      syncWithServer(data.items || []);
    } catch (error) {
      console.error('Data fetch error:', error);
      toast({
        title: "エラー",
        description: "データの取得に失敗しました",
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setLoading(false);
    }
  }, [status, session, router, toast, groupId]);

  // サーバーデータとローカルデータを同期
  const syncWithServer = (serverData: FamilyShoppingItem[]) => {
    console.log('Server data received:', serverData); // デバッグ用
    
    setLocalItems(prev => {
      const unsyncedItems = prev.filter(item => !item.synced);
      console.log('Unsynced items:', unsyncedItems); // デバッグ用
      
      // サーバーデータをローカル形式に変換
      const serverAsLocal: LocalShoppingItem[] = serverData.map(item => ({
        id: item.id,
        item_name: item.item_name,
        memo: item.memo || undefined,
        is_completed: item.is_completed,
        created_at: item.created_at,
        user_id: item.user_id,
        completed_by: item.completed_by || undefined,
        completed_at: item.completed_at || undefined,
        synced: true,
        creator: item.creator,
        completed_by_profile: item.completed_by_profile
      }));
      
      // 未同期アイテムと同期済みアイテムを結合
      // 重複を避けるため、サーバーに存在するアイテムは除外
      const serverItemIds = new Set(serverData.map(item => item.id));
      const filteredUnsyncedItems = unsyncedItems.filter(item => !serverItemIds.has(item.id));
      
      const allItems = [...filteredUnsyncedItems, ...serverAsLocal];
      
      console.log('Final items after sync:', allItems); // デバッグ用
      
      // 作成日時でソート（新しい順）
      return allItems.sort((a, b) => {
        if (a.is_completed !== b.is_completed) {
          return a.is_completed ? 1 : -1; // 未完了を上に
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    });
  };

  // 初回読み込み
  useEffect(() => {
    fetchServerData();
  }, [fetchServerData]);

  // アイテムの追加（ローカル優先）
  const handleAddItem = async () => {
    if (newItemName.trim() === '' || !session?.user?.id) return;
    
    const currentUserProfile = getCurrentUserProfile();
    if (!currentUserProfile) return;

    const newItem: LocalShoppingItem = {
      id: crypto.randomUUID(),
      item_name: newItemName.trim(),
      memo: newItemMemo.trim() || undefined,
      is_completed: false,
      created_at: new Date().toISOString(),
      user_id: session.user.id,
      synced: false,
      creator: currentUserProfile
    };
    
    // ローカルに即座に追加
    setLocalItems(prev => [newItem, ...prev]);
    setNewItemName('');
    setNewItemMemo('');
    setIsAddModalOpen(false);
    
    toast({
      title: "✅アイテムを追加しました",
      description: newItem.item_name,
      duration: 1000,
    });
    
    // 並行してサーバーに送信
    if (isOnline && currentGroup) {
      syncItemToServer(newItem);
    }
  };

  // サーバーへの同期
  const syncItemToServer = async (item: LocalShoppingItem) => {
    setSyncingItems(prev => new Set(prev).add(item.id));
    
    try {
      const response = await fetch('/api/family-group/shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name: item.item_name,
          memo: item.memo,
          group_id: groupId || currentGroup?.id
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // ローカルアイテムを同期済みに更新
        setLocalItems(prev => prev.map(localItem => 
          localItem.id === item.id 
            ? { 
                ...localItem, 
                id: data.item.id, 
                synced: true,
                creator: data.item.creator // サーバーから正確なプロフィール情報を取得
              }
            : localItem
        ));
      } else {
        throw new Error('サーバー同期に失敗しました');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "同期エラー",
        description: "サーバーとの同期に失敗しました",
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setSyncingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  // アイテムの完了状態を切り替え
  const handleToggleCheck = async (id: string) => {
    const item = localItems.find(item => item.id === id);
    if (!item || !session?.user?.id) return;

    const currentUserProfile = getCurrentUserProfile();
    if (!currentUserProfile) return;

    const newCompletedState = !item.is_completed;
    const now = new Date().toISOString();

    // ローカルで即座に更新
    setLocalItems(prev => prev.map(localItem =>
      localItem.id === id 
        ? { 
            ...localItem, 
            is_completed: newCompletedState,
            completed_by: newCompletedState ? session.user.id : undefined,
            completed_at: newCompletedState ? now : undefined,
            completed_by_profile: newCompletedState ? currentUserProfile : null
          }
        : localItem
    ));

    toast({
      title: "✅ 成功",
      description: `${newCompletedState ? '完了' : '未完了'}に変更しました`,
      duration: 1000,
    });

    // サーバーと同期済みの場合は、サーバーも更新
    if (item.synced && isOnline) {
      try {
        const response = await fetch('/api/family-group/shopping', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_id: id,
            is_completed: newCompletedState,
            group_id: groupId || currentGroup?.id
          }),
        });

        if (!response.ok) {
          throw new Error('更新に失敗しました');
        }
      } catch (error) {
        console.error('Toggle error:', error);
        toast({
          title: "エラー",
          description: "サーバー更新に失敗しました",
          variant: "destructive",
          duration: 1000,
        });
      }
    }
  };

  // アイテムの削除
  const handleDeleteItem = async (id: string) => {
    const item = localItems.find(item => item.id === id);
    if (!item) return;

    // グループメンバーなら削除可能（権限チェックを削除）

    // ローカルから即座に削除
    setLocalItems(prev => prev.filter(item => item.id !== id));

    toast({
      title: "✅ 成功",
      description: "アイテムを削除しました",
      duration: 1000,
    });

    // サーバーと同期済みの場合は、サーバーからも削除
    if (item.synced && isOnline) {
      try {
        const url = groupId 
          ? `/api/family-group/shopping?id=${id}&groupId=${groupId}`
          : `/api/family-group/shopping?id=${id}`;
        
        const response = await fetch(url, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || '削除に失敗しました');
        }
      } catch (error) {
        console.error('Delete error:', error);
        toast({
          title: "エラー",
          description: error instanceof Error ? error.message : "サーバー削除に失敗しました",
          variant: "destructive",
          duration: 1000,
        });
        
        // エラーが発生した場合は、ローカルにアイテムを復元
        setLocalItems(prev => [...prev, item]);
      }
    }
  };

  // 未同期アイテムの再同期
  const handleRetrySync = async () => {
    if (!isOnline || !currentGroup) return;
    
    const unsyncedItems = localItems.filter(item => !item.synced);
    
    for (const item of unsyncedItems) {
      await syncItemToServer(item);
    }
  };

  // 手動更新機能
  const handleRefresh = async () => {
    setLoading(true);
    await fetchServerData();
    toast({
      title: "✅ 更新完了",
      description: "最新のデータを取得しました",
      duration: 1000,
    });
  };

  // 削除ボタンの表示条件を確認する関数（グループメンバーなら削除可能）
  const canDeleteItem = (item: LocalShoppingItem) => {
    // グループに参加しているユーザーなら削除可能
    return currentGroup !== null;
  };

  // ローディング状態
  if (status === 'loading' || loading) {
    return (
      <AppLayout>
        <div className="p-4 max-w-2xl mx-auto">
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground mt-2">読み込み中...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // グループに参加していない場合
  if (!currentGroup) {
    return (
      <AppLayout>
        <div className="p-4 max-w-2xl mx-auto">
          <div className="text-center py-12 px-6 bg-secondary/20 rounded-xl border-2 border-dashed border-secondary/30">
            <Users strokeWidth={1.5} className="mx-auto h-16 w-16 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground/80 mb-2">グループに参加していません</h3>
            <p className="text-sm text-muted-foreground mb-4">
              家族の買い物メモを利用するには<br />グループに参加してください。
            </p>
            <Button
              onClick={() => router.push('/family-group')}
              variant="outline"
              size="sm"
            >
              グループ管理へ
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const checkedItems = localItems.filter(item => item.is_completed);
  const uncheckedItems = localItems.filter(item => !item.is_completed);
  const unsyncedCount = localItems.filter(item => !item.synced).length;

  return (
    <AppLayout>
      <div className="p-4 max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {!isOnline && (
              <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-100 px-3 py-1 rounded-full">
                <WifiOff size={16} />
                <span>オフライン</span>
              </div>
            )}
            {syncingItems.size > 0 && (
              <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>同期中</span>
              </div>
            )}
            {unsyncedCount > 0 && isOnline && (
              <Button
                onClick={handleRetrySync}
                size="sm"
                variant="outline"
                className="text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
              >
                未同期({unsyncedCount})を再同期
              </Button>
            )}
          </div>
        </div>

        {/* アイテム追加と更新ボタン */}
        <div className="mb-6 flex gap-3">
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
            size="lg"
          >
            メモを追加
          </Button>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="lg"
            className="border-blue-300 text-blue-600 hover:bg-blue-50"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <History className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* グループメンバー表示 */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-primary">
              <Users size={22} /> グループメンバー
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentGroup.members.map(member => (
              <div 
                key={member.user_id}
                className="flex items-center gap-2 bg-secondary/50 hover:bg-secondary/80 px-3 py-1 rounded-full text-sm"
              >
                <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                  {member.app_profiles?.avatar_url ? (
                    <img
                      src={member.app_profiles.avatar_url}
                      alt={member.app_profiles.display_name || '匿名'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '<svg class="h-2 w-2 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path></svg>';
                        }
                      }}
                    />
                  ) : (
                    <Users className="h-2 w-2 text-gray-600" />
                  )}
                </div>
                <span>{member.app_profiles?.display_name || '匿名'}</span>
                {member.role === 'owner' && (
                  <Crown className="h-3 w-3 text-yellow-500" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 共有リスト */}
        <div className="space-y-3">
          {localItems.length === 0 ? (
            <div className="text-center py-12 px-6 bg-secondary/20 rounded-xl border-2 border-dashed border-secondary/30">
              <ListTodo strokeWidth={1.5} className="mx-auto h-16 w-16 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold text-foreground/80 mb-2">グループで共有する<br />メモを作成しましょう！</h3>
              <p className="text-sm text-muted-foreground">
                「メモを追加」ボタンを使って<br />
                買い物メモや家事の分担、<br />
                作業分担などのTODO管理できます。
              </p>
            </div>
          ) : (
            <>
              {/* 未完了アイテム */}
              <AnimatePresence>
                {uncheckedItems.map(item => (
                  <motion.div 
                    key={item.id} 
                    layout 
                    initial={{ opacity: 0, y: -20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, x: -50 }} 
                    className="flex items-center gap-3 bg-card p-3 rounded-lg shadow-sm"
                  >
                    <button 
                      onClick={() => handleToggleCheck(item.id)} 
                      className={cn(
                        "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center", 
                        item.is_completed ? "bg-primary border-primary" : "border-muted-foreground"
                      )}
                    >
                      {item.is_completed && <Check size={16} className="text-primary-foreground" />}
                    </button>
                    <div className="flex-grow">
                      <span className={cn("text-lg", item.is_completed && "line-through text-muted-foreground")}>
                        {item.item_name}
                      </span>
                      {item.memo && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <StickyNote className="h-3 w-3" />
                          <span>{item.memo}</span>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        {item.creator.avatar_url ? (
                          <img
                            src={item.creator.avatar_url}
                            alt={item.creator.display_name}
                            className="w-3 h-3 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <Users className="h-3 w-3" />
                        )}
                        <span>追加者: {item.creator.display_name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {!item.synced && (
                          <div className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                            未同期
                          </div>
                        )}
                        {syncingItems.has(item.id) && (
                          <div className="flex items-center gap-1 text-xs text-blue-600">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>同期中</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteItem(item.id)} 
                      className="text-muted-foreground hover:text-destructive"
                      disabled={!canDeleteItem(item)}
                    >
                      <Trash2 size={18} />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* 完了済みアイテム */}
              {checkedItems.length > 0 && (
                <>
                  <div className="text-sm text-muted-foreground pt-4">完了済み ({checkedItems.length})</div>
                  <AnimatePresence>
                    {checkedItems.map(item => (
                      <motion.div 
                        key={item.id} 
                        layout 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0, x: -50 }} 
                        className="flex items-center gap-3 bg-card p-3 rounded-lg"
                      >
                        <button 
                          onClick={() => handleToggleCheck(item.id)} 
                          className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-primary border-primary"
                        >
                          <Check size={16} className="text-primary-foreground" />
                        </button>
                        <div className="flex-grow">
                          <span className="text-lg line-through text-muted-foreground">
                            {item.item_name}
                          </span>
                          {item.memo && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                              <StickyNote className="h-3 w-3" />
                              <span>{item.memo}</span>
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            完了者: {item.completed_by_profile?.display_name || '匿名'}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteItem(item.id)} 
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={18} />
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </>
              )}
            </>
          )}
        </div>

        {/* 画面下部の遷移ボタン */}
        <div className="mt-8 space-y-4">
          {/* 活用例の表示 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg"
          >
            <div className="space-y-3">
              <h3 className="font-semibold text-green-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-green-600" />
                活用例
              </h3>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex items-center gap-2 text-green-800">
                  <ShoppingBag className="h-4 w-4 text-green-600" />
                  <span>買い物メモ（牛乳、パン、野菜など）</span>
                </div>
                <div className="flex items-center gap-2 text-green-800">
                  <Home className="h-4 w-4 text-green-600" />
                  <span>家事の分担（掃除、洗濯、料理など）</span>
                </div>
                <div className="flex items-center gap-2 text-green-800">
                  <Briefcase className="h-4 w-4 text-green-600" />
                  <span>作業分担（プロジェクト、イベント準備など）</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 個人メモへの遷移ボタン */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <ShoppingBag className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900">個人の買い物メモ</h3>
                  <p className="text-sm text-blue-700">個人用のメモも<br />ご利用いただけます。</p>
                </div>
              </div>
              <Button
                onClick={() => router.push('/memo')}
                variant="outline"
                size="sm"
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                個人メモへ
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* アイテム追加モーダル */}
      <CustomModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setNewItemName('');
          setNewItemMemo('');
        }}
        title="新しいアイテムを追加"
        description="グループで共有するリストに追加するアイテムを入力してください。"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              アイテム名 *
            </label>
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="例: 牛乳、掃除機かけ、資料作成"
              className="text-base"
              style={{ fontSize: '16px' }}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              メモ（任意）
            </label>
            <Textarea
              value={newItemMemo}
              onChange={(e) => setNewItemMemo(e.target.value)}
              placeholder="例: 低脂肪1リットル、リビングと寝室、来週の会議用"
              className="text-sm resize-none"
              style={{ fontSize: '16px' }}
              rows={2}
            />
          </div>
          
          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddModalOpen(false);
                setNewItemName('');
                setNewItemMemo('');
              }}
              className="flex-1"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleAddItem}
              disabled={newItemName.trim() === ''}
              className="flex-1"
            >
              追加する
            </Button>
          </div>
        </div>
      </CustomModal>
    </AppLayout>
  );
}
