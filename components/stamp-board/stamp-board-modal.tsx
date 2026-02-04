'use client';

import { useState, useEffect } from 'react';
import { CustomModal } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface CheckIn {
  id: string;
  event_name: string;
  checked_in_at: string;
}

export function StampBoardModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    const fetchCheckIns = async () => {
      if (!session?.user?.id) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('check_ins')
          .select('id, event_name, checked_in_at')
          .eq('user_id', session.user.id)
          .order('checked_in_at', { ascending: true })
          .limit(9);
        
        if (error) throw error;
        
        if (data) {
          setCheckIns(data);
        }
      } catch (error) {
        console.error('チェックイン取得エラー:', error);
        toast({
          title: 'エラー',
          description: 'スタンプの取得に失敗しました',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (isOpen) {
      fetchCheckIns();
    }
  }, [isOpen, session?.user?.id, toast]);
  
  const handleSubmit = async () => {
    if (checkIns.length < 9 || !session?.user?.id) return;
    
    setSubmitting(true);
    
    try {
      // スタンプボード送信記録を保存
      const { error: dbError } = await supabase
        .from('stamp_board_submissions')
        .insert({
          user_id: session.user.id,
          check_in_ids: checkIns.map(c => c.id),
        });
      
      if (dbError) throw dbError;
      
      // メール送信API呼び出し
      const response = await fetch('/api/stamp-board/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          userEmail: session.user.email,
          checkIns: checkIns,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'メール送信に失敗しました');
      }
      
      toast({
        title: '🎉 送信完了！',
        description: '賞金申請を受け付けました。ご連絡をお待ちください。',
      });
      
      onClose();
    } catch (error) {
      console.error('送信エラー:', error);
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '送信に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  // 9マスのグリッドを生成（空のマスも含む）
  const stampGrid = Array.from({ length: 9 }, (_, i) => checkIns[i] || null);
  
  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="🎫 スタンプボード"
      className="max-w-md"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* スタンプグリッド（3×3） */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {stampGrid.map((checkIn, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className={`aspect-square rounded-lg border-2 ${
                  checkIn 
                    ? 'border-primary bg-background shadow-md' 
                    : 'border-gray-300 bg-gray-100'
                } p-2 flex flex-col items-center justify-center`}
              >
                {checkIn ? (
                  <>
                    {/* トクドクアイコン */}
                    <div className="relative w-12 h-12 mb-1">
                      <Image
                        src="https://res.cloudinary.com/dz9trbwma/image/upload/v1749032362/icon_n7nsgl.png"
                        alt="トクドク"
                        fill
                        className="object-contain"
                      />
                    </div>
                    {/* イベント名（省略表示） */}
                    <p className="text-xs font-bold text-primary text-center line-clamp-2 leading-tight">
                      {checkIn.event_name}
                    </p>
                    {/* 日付 */}
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {new Date(checkIn.checked_in_at).toLocaleDateString('ja-JP', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </>
                ) : (
                  <div className="text-4xl text-gray-400">?</div>
                )}
              </motion.div>
            ))}
          </div>
          
          {/* プログレス表示 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">
                進捗: {checkIns.length} / 9
              </span>
              <span className="text-xs text-gray-500">
                {checkIns.length >= 9 ? '達成！' : `あと${9 - checkIns.length}個`}
              </span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(checkIns.length / 9) * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-primary"
              />
            </div>
          </div>
          
          {/* 送信ボタン */}
          <Button
            onClick={handleSubmit}
            disabled={checkIns.length < 9 || submitting}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                送信中...
              </>
            ) : (
              '🎁 賞金を申請する'
            )}
          </Button>
          
          {checkIns.length < 9 && (
            <p className="text-xs text-center text-gray-500 mt-3">
              9個のスタンプを集めると賞金申請ができます
            </p>
          )}
          
          {checkIns.length >= 9 && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-center text-green-600 font-bold mt-3"
            >
              🎉 おめでとうございます！申請ボタンを押してください
            </motion.p>
          )}
        </>
      )}
    </CustomModal>
  );
}

