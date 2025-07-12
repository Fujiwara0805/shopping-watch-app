"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, Trash2, History, WifiOff, Loader2, Edit, LogIn, X, CheckSquare, Sparkles, PackageCheck, ShoppingBag, MessageSquare, Users, ArrowLeft, Crown } from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

// 家族共有の買い物アイテム
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
  const [items, setItems] = useState<FamilyShoppingItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  
  // 個別のローディング状態を管理
  const [addingItem, setAddingItem] = useState(false);
  const [togglingItems, setTogglingItems] = useState<Set<string>>(new Set());
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());

  // URLパラメータからグループIDを取得
  const groupId = searchParams.get('groupId');

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

  // データを取得
  const fetchData = useCallback(async () => {
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
      setItems(data.items || []);
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

  // 初回読み込み
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // アイテムの追加
  const handleAddItemFromInput = async () => {
    if (!isOnline || isMutating || newItemName.trim() === '' || addingItem) return;
    
    setAddingItem(true);
    setIsMutating(true);
    
    let loadingTimeout: NodeJS.Timeout | undefined;
    
    try {
      // 2秒後にローディング表示
      loadingTimeout = setTimeout(() => {
        if (addingItem) {
          toast({
            title: "処理中",
            description: "✅アイテムを追加しています",
            duration: 1000,
          });
        }
      }, 2000);

      const response = await fetch('/api/family-group/shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name: newItemName.trim(),
          group_id: groupId || currentGroup?.id
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'アイテムの追加に失敗しました');
      }

      setNewItemName('');
      await fetchData();
      
      toast({
        title: "成功",
        description: "✅アイテムを追加しました",
        duration: 1000,
      });
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      if (loadingTimeout) clearTimeout(loadingTimeout);
      setAddingItem(false);
      setIsMutating(false);
    }
  };

  // アイテムの完了状態を切り替え
  const handleToggleCheck = async (id: string) => {
    if (!isOnline || togglingItems.has(id)) return;

    const item = items.find(item => item.id === id);
    if (!item) return;

    setTogglingItems(prev => new Set(prev).add(id));
    
    let loadingTimeout: NodeJS.Timeout | undefined;
    
    try {
      // 2秒後にローディング表示
      loadingTimeout = setTimeout(() => {
        if (togglingItems.has(id)) {
          toast({
            title: "処理中",
            description: `${item.is_completed ? '未完了に' : '完了に'}変更しています...`,
            duration: 1000,
          });
        }
      }, 2000);

      const response = await fetch('/api/family-group/shopping', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: id,
          is_completed: !item.is_completed,
          group_id: groupId || currentGroup?.id
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '更新に失敗しました');
      }

      await fetchData();
      
      toast({
        title: "成功",
        description: `${item.is_completed ? '未完了' : '完了'}に変更しました`,
        duration: 1000,
      });
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      if (loadingTimeout) clearTimeout(loadingTimeout);
      setTogglingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  // アイテムの削除
  const handleDeleteShoppingItem = async (id: string) => {
    if (!isOnline || deletingItems.has(id)) return;

    const item = items.find(item => item.id === id);
    if (!item) return;

    setDeletingItems(prev => new Set(prev).add(id));
    
    let loadingTimeout: NodeJS.Timeout | undefined;
    
    try {
      // 2秒後にローディング表示
      loadingTimeout = setTimeout(() => {
        if (deletingItems.has(id)) {
          toast({
            title: "処理中",
            description: "アイテムを削除しています...",
            duration: 1000,
          });
        }
      }, 2000);

      const url = groupId 
        ? `/api/family-group/shopping?id=${id}&groupId=${groupId}`
        : `/api/family-group/shopping?id=${id}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '削除に失敗しました');
      }

      await fetchData();
      
      toast({
        title: "成功",
        description: "アイテムを削除しました",
        duration: 1000,
      });
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      if (loadingTimeout) clearTimeout(loadingTimeout);
      setDeletingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
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

  const checkedItems = items.filter(item => item.is_completed);
  const uncheckedItems = items.filter(item => !item.is_completed);

  return (
    <AppLayout>
      <div className="p-4 max-w-2xl mx-auto">
        {/* アイテム追加 */}
        <div className="flex gap-2 mb-6 py-2">
          <Input 
            type="text" 
            value={newItemName} 
            onChange={e => setNewItemName(e.target.value)} 
            placeholder="リストの追加をしてください" 
            className="text-base"
            onKeyPress={(e) => e.key === 'Enter' && handleAddItemFromInput()}
            disabled={addingItem || !isOnline}
          />
          <Button 
            onClick={handleAddItemFromInput} 
            size="icon" 
            className="shrink-0" 
            disabled={newItemName.trim() === '' || !isOnline || addingItem}
          >
            {addingItem ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Plus size={20} />
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
                        // 画像読み込みエラー時のフォールバック
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

        {/* 買い物リスト */}
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12 px-6 bg-secondary/20 rounded-xl border-2 border-dashed border-secondary/30">
              <ShoppingBag strokeWidth={1.5} className="mx-auto h-16 w-16 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold text-foreground/80 mb-2">家族の買い物メモを作成しましょう！</h3>
              <p className="text-sm text-muted-foreground">
                「+」ボタンを使って<br />買うものをメモに追加できます。
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
                      disabled={togglingItems.has(item.id) || !isOnline}
                    >
                      {togglingItems.has(item.id) ? (
                        <Loader2 size={12} className="animate-spin text-muted-foreground" />
                      ) : (
                        item.is_completed && <Check size={16} className="text-primary-foreground" />
                      )}
                    </button>
                    <div className="flex-grow">
                      <span className={cn("text-lg", item.is_completed && "line-through text-muted-foreground")}>
                        {item.item_name}
                      </span>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        {item.creator.avatar_url ? (
                          <img
                            src={item.creator.avatar_url}
                            alt={item.creator.display_name || '匿名'}
                            className="w-3 h-3 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <Users className="h-3 w-3" />
                        )}
                        <span>追加者: {item.creator.display_name || '匿名'}</span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteShoppingItem(item.id)} 
                      className="text-muted-foreground hover:text-destructive"
                      disabled={deletingItems.has(item.id) || !isOnline}
                    >
                      {deletingItems.has(item.id) ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* 完了済みアイテム */}
              {checkedItems.length > 0 && (
                <>
                  <div className="text-sm text-muted-foreground pt-4">購入済み ({checkedItems.length})</div>
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
                          disabled={togglingItems.has(item.id) || !isOnline}
                        >
                          {togglingItems.has(item.id) ? (
                            <Loader2 size={12} className="animate-spin text-primary-foreground" />
                          ) : (
                            <Check size={16} className="text-primary-foreground" />
                          )}
                        </button>
                        <div className="flex-grow">
                          <span className="text-lg line-through text-muted-foreground">
                            {item.item_name}
                          </span>
                          <div className="text-xs text-muted-foreground">
                            完了者: {item.completed_by_profile?.display_name || '匿名'}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteShoppingItem(item.id)} 
                          className="text-muted-foreground hover:text-destructive"
                          disabled={deletingItems.has(item.id) || !isOnline}
                        >
                          {deletingItems.has(item.id) ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Trash2 size={18} />
                          )}
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
          {/* 個人メモへの遷移ボタン */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
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

          {/* 掲示板への遷移ボタン */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-orange-100 p-2 rounded-full">
                  <MessageSquare className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-orange-900">掲示板</h3>
                  <p className="text-sm text-orange-700">買い物リストを共有すると<br />お得情報が手に入るかも？</p>
                </div>
              </div>
              <Button
                onClick={() => router.push('/board')}
                variant="outline"
                size="sm"
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                掲示板へ
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
