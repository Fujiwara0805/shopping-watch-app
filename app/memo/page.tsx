"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, Trash2, History, WifiOff, Loader2, Edit, LogIn, X, CheckSquare, Sparkles, PackageCheck, ShoppingBag, MessageSquare, Users, TrainFront, Info } from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabaseClient';
import { useLocalStorage } from 'usehooks-ts';
import { useRouter } from 'next/navigation';
import { CustomModal } from '@/components/ui/custom-modal';
import { useLocationPermission } from '@/components/providers/LocationPermissionProvider';
import { isWithinOitaUniversityArea } from '@/lib/utils';

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

// 🔥 ローカルストレージの位置情報の型定義
interface StoredLocationData {
  latitude: number;
  longitude: number;
  timestamp: number;
  expiresAt: number;
}

export default function MemoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { latitude, longitude, permissionState, requestLocation } = useLocationPermission();
  
  // 🔥 ローカルストレージから取得した位置情報の状態を追加
  const [storedLocation, setStoredLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  
  // オフライン対応の買い物リスト (localStorage) - 常に利用可能
  const [items, setItems] = useLocalStorage<MemoItem[]>('shoppingMemo', []);
  const [newItemName, setNewItemName] = useState('');

  // 使い方モーダルの表示状態
  const [showUsageModal, setShowUsageModal] = useState(false);

  // オンラインで同期する「よく買うもの」リスト - ログイン時のみ
  const [frequentItems, setFrequentItems] = useState<FrequentItem[]>([]);
  const [appProfileId, setAppProfileId] = useState<string | null>(null);

  // UI状態
  const [loadingFrequentItems, setLoadingFrequentItems] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showFrequentItemModal, setShowFrequentItemModal] = useState(false);
  const [newFrequentItemName, setNewFrequentItemName] = useState('');

  // 🔥 ローカルストレージから位置情報を取得する関数
  const loadStoredLocation = useCallback(() => {
    try {
      const storedLocationStr = localStorage.getItem('userLocation');
      if (storedLocationStr) {
        const storedLocationData: StoredLocationData = JSON.parse(storedLocationStr);
        
        // 有効期限をチェック
        if (storedLocationData.expiresAt && Date.now() < storedLocationData.expiresAt) {
          console.log('買い物メモ: 保存された位置情報を使用します:', storedLocationData);
          setStoredLocation({
            latitude: storedLocationData.latitude,
            longitude: storedLocationData.longitude,
          });
          return true; // 保存された位置情報を使用
        } else {
          console.log('買い物メモ: 保存された位置情報の有効期限が切れています');
          localStorage.removeItem('userLocation');
          setStoredLocation(null);
        }
      }
    } catch (error) {
      console.warn('買い物メモ: 保存された位置情報の読み込みに失敗しました:', error);
      localStorage.removeItem('userLocation');
      setStoredLocation(null);
    }
    return false; // 保存された位置情報が使用できない
  }, []);

  // 🔥 初期化時にローカルストレージから位置情報を取得
  useEffect(() => {
    loadStoredLocation();
  }, [loadStoredLocation]);

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

  // 使い方モーダルを開く関数
  const handleOpenUsageModal = () => {
    setShowUsageModal(true);
  };

  // 割引表（タイムライン）への遷移
  const handleGoToTimeline = () => {
    window.open('https://discount-calculator-app.vercel.app', '_blank');
    
  };

  // 掲示板への遷移
  const handleGoToBoard = () => {
    router.push('/board');
  };

  // グループ管理画面への遷移
  const handleGoToFamilyGroup = () => {
    if (status === 'authenticated') {
      router.push('/family-group');
    } else {
      router.push('/login?callbackUrl=' + encodeURIComponent('/family-group'));
    }
  };

  const handleGoToTrainSchedule = () => {
    router.push('/train-schedule');
  };

  // 🔥 位置情報の判定ロジックを修正：ローカルストレージの位置情報も考慮
  const effectiveLatitude = latitude || storedLocation?.latitude;
  const effectiveLongitude = longitude || storedLocation?.longitude;
  const hasValidLocation = effectiveLatitude !== null && effectiveLongitude !== null;
  
  const showTrainScheduleButton = hasValidLocation && isWithinOitaUniversityArea(effectiveLatitude!, effectiveLongitude!);

  // 🔥 デバッグ用ログ（開発時のみ）
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('買い物メモ - 位置情報状態:', {
        providerLatitude: latitude,
        providerLongitude: longitude,
        storedLatitude: storedLocation?.latitude,
        storedLongitude: storedLocation?.longitude,
        effectiveLatitude,
        effectiveLongitude,
        hasValidLocation,
        showTrainScheduleButton,
        permissionState
      });
    }
  }, [latitude, longitude, storedLocation, effectiveLatitude, effectiveLongitude, hasValidLocation, showTrainScheduleButton, permissionState]);

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
              <p className="text-sm text-muted-foreground mb-4">
                「+」ボタンを使って<br />買うものをメモに追加できます。
              </p>
              <div className="flex justify-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleOpenUsageModal}
                  className="flex items-center gap-2 text-[#fa7415] border-[#fa7415] hover:bg-[#fa7415] hover:text-white"
                >
                  <Info size={16} />
                  使い方を見る
                </Button>
              </div>
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

        {/* 🔥 位置情報の表示状態をデバッグ表示（開発環境のみ） */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
            <div>Provider位置: {latitude ? `${latitude.toFixed(4)}, ${longitude?.toFixed(4)}` : 'なし'}</div>
            <div>Stored位置: {storedLocation ? `${storedLocation.latitude.toFixed(4)}, ${storedLocation.longitude.toFixed(4)}` : 'なし'}</div>
            <div>有効な位置: {hasValidLocation ? `${effectiveLatitude?.toFixed(4)}, ${effectiveLongitude?.toFixed(4)}` : 'なし'}</div>
            <div>時刻表ボタン: {showTrainScheduleButton ? '表示' : '非表示'}</div>
          </div>
        )}

        {/* 画面下部の遷移ボタン */}
        <div className="mt-8 space-y-4">
          {/* 🔥 修正：ローカルストレージの位置情報も考慮した時刻表ボタン */}
          {showTrainScheduleButton && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-gradient-to-r from-green-50 to-lime-50 border border-green-200 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-2 rounded-full">
                    <TrainFront className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-900">時刻表を確認</h3>
                    <p className="text-xs text-green-700">
                      旦野原キャンパス限定で大分駅までの<br />電車とバスの時刻表を確認できます。
                      {storedLocation && !latitude && (
                        <span className="block text-green-600 font-medium mt-1">
                          ※保存された位置情報を使用中
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleGoToTrainSchedule}
                  variant="outline"
                  size="sm"
                  className="border-green-300 text-green-700 hover:bg-green-200"
                >
                  時刻表へ
                </Button>
              </div>
            </motion.div>
          )}

          {/* グループ管理への遷移ボタン（ブルー配色に変更） */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900">グループ共有</h3>
                  <p className="text-sm text-blue-700">
                    家族や友人とメモを共有<br />
                    <span className="text-blue-600 font-medium">※ログインが必須です</span>
                  </p>
                </div>
              </div>
              <Button
                onClick={handleGoToFamilyGroup}
                variant="outline"
                size="sm"
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                管理画面へ
              </Button>
            </div>
          </motion.div>

          {/* 削除: 掲示板への遷移ボタン */}
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

      <CustomModal isOpen={showUsageModal} onClose={() => setShowUsageModal(false)} title="買い物メモの使い方">
        <div className="pt-2 space-y-4">
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
        </div>
      </CustomModal>
    </AppLayout>
  );
}
