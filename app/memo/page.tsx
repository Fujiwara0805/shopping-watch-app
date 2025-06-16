"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, Trash2, History, WifiOff, Loader2, Edit, LogIn, X, CheckSquare, Sparkles, PackageCheck, ShoppingBag } from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabaseClient';
import { useLocalStorage } from 'usehooks-ts';
import { useRouter } from 'next/navigation';
import { CustomModal } from '@/components/ui/custom-modal';

// ローカルの買い物アイテム
interface MemoItem {
  id: string;
  name: string;
  checked: boolean;
}

// DBから取得する「よく買うもの」
interface FrequentItem {
  id: string;
  item_name: string;
}

export default function MemoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // オフライン対応の買い物リスト (localStorage) - 常に利用可能
  const [items, setItems] = useLocalStorage<MemoItem[]>('shoppingMemo', []);
  const [newItemName, setNewItemName] = useState('');

  // 使い方ガイドの表示設定をlocalStorageで管理
  const [showUsageGuide, setShowUsageGuide] = useLocalStorage<boolean>('showUsageGuide', true);

  // オンラインで同期する「よく買うもの」リスト - ログイン時のみ
  const [frequentItems, setFrequentItems] = useState<FrequentItem[]>([]);
  const [appProfileId, setAppProfileId] = useState<string | null>(null);

  // UI状態
  const [loadingFrequentItems, setLoadingFrequentItems] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showFrequentItemModal, setShowFrequentItemModal] = useState(false);
  const [newFrequentItemName, setNewFrequentItemName] = useState('');

  // ログイン状態に応じてプロフィールと「よく買うもの」リストを管理
  useEffect(() => {
    // ログアウト時やセッション読み込み中は、関連データをクリア
    if (status !== 'authenticated' || !session?.user?.id) {
      setAppProfileId(null);
      setFrequentItems([]);
      setLoadingFrequentItems(false); // ログインしていないのでロードは行わない
      return;
    }

    // ログイン済みの場合、データを順次取得
    const fetchProfileAndItems = async () => {
      try {
        // 1. ログインユーザーIDを使ってプロフィールIDを取得
        const { data: profileData, error: profileError } = await supabase
          .from('app_profiles')
          .select('id')
          .eq('user_id', session.user.id)
          .single();

        if (profileError) {
          throw new Error(`プロフィール情報の取得に失敗しました: ${profileError.message}`);
        }

        if (profileData) {
          const profileId = profileData.id;
          setAppProfileId(profileId);

          // 2. プロフィールIDを使って「よく買うもの」リストを取得
          setLoadingFrequentItems(true);
          const { data: itemsData, error: itemsError } = await supabase
            .from('frequent_shopping_items')
            .select('id, item_name')
            .eq('app_profile_id', profileId)
            .order('created_at', { ascending: false });
          
          if (itemsError) {
            throw new Error(`「よく買うもの」リストの取得に失敗しました: ${itemsError.message}`);
          }
          setFrequentItems(itemsData || []);
        } else {
          // プロフィールが見つからない場合
          setAppProfileId(null);
          setFrequentItems([]);
        }

      } catch (error) {
        console.error("データ取得中にエラーが発生しました:", error);
        setAppProfileId(null);
        setFrequentItems([]);
      } finally {
        setLoadingFrequentItems(false); // 成功・失敗にかかわらずロード状態を解除
      }
    };

    fetchProfileAndItems();
    
  }, [status, session]);

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

  const handleAddItemFromInput = () => {
    if (newItemName.trim() === '') return;
    const newItem: MemoItem = { id: crypto.randomUUID(), name: newItemName.trim(), checked: false };
    setItems(prev => [newItem, ...prev]);
    setNewItemName('');
  };

  const handleAddItemFromHistory = (name: string) => {
    if (name.trim() === '') return;
    const newItem: MemoItem = { id: crypto.randomUUID(), name: name.trim(), checked: false };
    setItems(prev => [newItem, ...prev]);
  };

  const handleToggleCheck = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };
  
  const handleDeleteShoppingItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleAddFrequentItem = async () => {
    if (!isOnline || !appProfileId || isMutating || newFrequentItemName.trim() === '') return;
    
    const nameToAdd = newFrequentItemName.trim();
    if (frequentItems.some(fi => fi.item_name === nameToAdd)) {
      setNewFrequentItemName('');
      return;
    }
  
    setIsMutating(true);
    try {
      const { data, error } = await supabase.from('frequent_shopping_items').insert({ app_profile_id: appProfileId, item_name: nameToAdd }).select().single();
      if (error) throw error;
      setFrequentItems(prev => [data, ...prev].sort((a,b) => a.item_name.localeCompare(b.item_name, 'ja')));
      setNewFrequentItemName('');
    } catch (error) {
      console.error("Error adding frequent item:", error);
    } finally {
      setIsMutating(false);
    }
  };
  
  const handleDeleteFrequentItem = async (id: string) => {
    if (!isOnline || !appProfileId || isMutating) return;
    setIsMutating(true);
    try {
      const { error } = await supabase.from('frequent_shopping_items').delete().eq('id', id);
      if (error) throw error;
      setFrequentItems(prev => prev.filter(fi => fi.id !== id));
    } catch (error) {
      console.error("Error deleting frequent item:", error);
    } finally {
      setIsMutating(false);
    }
  };

  const checkedItems = items.filter(item => item.checked);
  const uncheckedItems = items.filter(item => !item.checked);

  // 使い方ガイドを閉じる関数
  const handleCloseUsageGuide = (hideForever: boolean = false) => {
    if (hideForever) {
      setShowUsageGuide(false); // 今後表示しない
    } else {
      setShowUsageGuide(false); // 一時的に閉じる（次回は表示される）
    }
  };

  return (
    <AppLayout>
      <div className="p-4 max-w-2xl mx-auto">
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {isMutating && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            {!isOnline && (
              <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-100 px-3 py-1 rounded-full">
                <WifiOff size={16} /><span>オフライン</span>
              </div>
            )}
          </div>
        </header>

        <div className="flex gap-2 mb-4">
          <Input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="アイテム名を入力 (例: 牛乳)" className="text-base" />
          <Button onClick={handleAddItemFromInput} size="icon" className="shrink-0" disabled={newItemName.trim() === ''}><Plus size={20} /></Button>
        </div>

        {showUsageGuide && (
          <AnimatePresence>
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="relative p-4 mb-6 border rounded-lg bg-card"
            >
              <button
                onClick={() => handleCloseUsageGuide(false)}
                className="absolute top-3 right-3 p-1 text-muted-foreground hover:bg-accent rounded-full transition-colors z-10"
              >
                <X size={18} />
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-bold">買い物メモの使い方</h2>
              </div>
          
              <div className="space-y-3 text-sm">
                <div className="p-3 rounded-lg border bg-yellow-50 border-yellow-200/80">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <Sparkles className="h-5 w-5 text-yellow-600" />
                    <h3 className="font-semibold text-yellow-800">かんたんアイテム追加</h3>
                  </div>
                  <p className="text-xs text-yellow-700 pl-1">
                    テキストでアイテムを入力し、<Plus size={12} className="inline-block mx-0.5 -mt-0.5" />ボタンでリストに追加します。
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border bg-green-50 border-green-200/80">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <PackageCheck className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-green-800">リストの管理</h3>
                  </div>
                  <p className="text-xs text-green-700 pl-1">
                    購入済みのアイテムは左の<CheckSquare size={12} className="inline-block mx-0.5 -mt-0.5" />でチェック。不要なアイテムは<Trash2 size={12} className="inline-block mx-0.5 -mt-0.5" />で削除できます。
                  </p>
                </div>

                <div className="p-3 rounded-lg border bg-blue-50 border-blue-200/80">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <History className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-800">便利な「よく買うもの」</h3>
                  </div>
                  <p className="text-xs text-blue-700 pl-1">
                    タップで直接リストに追加。編集は<Edit size={12} className="inline-block mx-0.5 -mt-0.5" />ボタンから行えます。
                  </p>
                </div>
              </div>

              {/* 今後表示しないオプションを追加 */}
              <div className="flex justify-between items-center mt-4 pt-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCloseUsageGuide(true)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  今後表示しない
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCloseUsageGuide(false)}
                >
                  閉じる
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {status === 'authenticated' && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-primary"><History size={22} /> よく買うもの</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowFrequentItemModal(true)} disabled={!isOnline || loadingFrequentItems}>
                <Edit size={18} />
              </Button>
            </div>
            {loadingFrequentItems ? (
              <div className="text-sm text-muted-foreground">読み込み中...</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {frequentItems.map(item => (
                  <Button key={item.id} variant="outline" size="sm" onClick={() => handleAddItemFromHistory(item.item_name)} className="bg-secondary/50 hover:bg-secondary/80">{item.item_name}</Button>
                ))}
                {frequentItems.length === 0 && <p className="text-sm text-muted-foreground">登録済みのアイテムはありません。</p>}
              </div>
            )}
          </div>
        )}

        {status === 'unauthenticated' && (
           <div className="mb-6 text-center text-sm text-muted-foreground p-4 border-2 border-dashed rounded-lg">
            <p>ログインすると「よく買うもの」を<br />端末間で同期できます。</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => router.push('/login')}>
              <LogIn className="mr-2 h-4 w-4"/>
              ログイン / 新規登録
            </Button>
          </div>
        )}
        
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12 px-6 bg-secondary/20 rounded-xl border-2 border-dashed border-secondary/30">
              <ShoppingBag strokeWidth={1.5} className="mx-auto h-16 w-16 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold text-foreground/80 mb-2">買い物メモを作成しましょう！</h3>
              <p className="text-sm text-muted-foreground">
                「+」ボタンを使って<br />買うものをメモに追加できます。
              </p>
            </div>
          ) : (
            <>
              <AnimatePresence>
                {uncheckedItems.map(item => (
                  <motion.div key={item.id} layout initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} className="flex items-center gap-3 bg-card p-3 rounded-lg shadow-sm">
                    <button onClick={() => handleToggleCheck(item.id)} className={cn("flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center", item.checked ? "bg-primary border-primary" : "border-muted-foreground")}>
                      {item.checked && <Check size={16} className="text-primary-foreground" />}
                    </button>
                    <span className={cn("flex-grow text-lg", item.checked && "line-through text-muted-foreground")}>{item.name}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteShoppingItem(item.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={18} /></Button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {checkedItems.length > 0 && (
                 <>
                  <div className="text-sm text-muted-foreground pt-4">購入済み ({checkedItems.length})</div>
                  <AnimatePresence>
                    {checkedItems.map(item => (
                      <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -50 }} className="flex items-center gap-3 bg-card p-3 rounded-lg">
                        <button onClick={() => handleToggleCheck(item.id)} className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-primary border-primary">
                          <Check size={16} className="text-primary-foreground" />
                        </button>
                        <span className="flex-grow text-lg line-through text-muted-foreground">{item.name}</span>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteShoppingItem(item.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={18} /></Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </>
              )}
            </>
          )}
        </div>
      </div>
      
      <CustomModal isOpen={showFrequentItemModal} onClose={() => setShowFrequentItemModal(false)} title="「よく買うもの」を編集">
        <div className="pt-2 space-y-4">
          <div className="flex gap-2">
            <Input value={newFrequentItemName} onChange={(e) => setNewFrequentItemName(e.target.value)} placeholder="アイテム名" />
            <Button onClick={handleAddFrequentItem} disabled={isMutating || newFrequentItemName.trim() === '' || !isOnline}>
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : "追加"}
            </Button>
            <Button variant="outline" onClick={() => setShowFrequentItemModal(false)}>終了</Button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
            {frequentItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-md" style={{ backgroundColor: '#b3e3ba' }}>
                <span>{item.item_name}</span>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteFrequentItem(item.id)} disabled={isMutating || !isOnline}>
                  <Trash2 size={16} className="text-destructive" />
                </Button>
              </div>
            ))}
            {frequentItems.length === 0 && !loadingFrequentItems && <p className="text-sm text-center text-muted-foreground py-4">登録済みのアイテムはありません</p>}
            {loadingFrequentItems && <div className="text-center py-4"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>}
          </div>
        </div>
      </CustomModal>
    </AppLayout>
  );
}
