"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from "next-auth/react";
import { Trophy, Crown, Medal, Star, Target, ArrowLeft, Calendar, TrendingUp, Award, Zap, Info, Loader2, Clock, NotebookText, Sparkles, User, Plus, RefreshCw } from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabaseClient';
import { CustomModal } from '@/components/ui/custom-modal';
import { getHunterLevel } from '@/lib/hunter-level';
import { useToast } from '@/hooks/use-toast';

// データベース関数の戻り値に合わせた型定義
interface UserRanking {
  app_profile_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_likes: number;
  period_likes: number; // weekly_likesから変更
}

// 順位に応じたアイコンを返す
const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1: return <Crown className="h-6 w-6 text-yellow-500" />;
    case 2: return <Medal className="h-6 w-6 text-gray-400" />;
    case 3: return <Trophy className="h-6 w-6 text-amber-600" />;
    default: return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
  }
};

export default function HunterRankingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [periodRankings, setPeriodRankings] = useState<UserRanking[]>([]); // 週間 -> 期間
  const [totalRankings, setTotalRankings] = useState<UserRanking[]>([]);
  const [currentUserRanking, setCurrentUserRanking] = useState<(UserRanking & { rank: number }) | null>(null);
  const [currentUserLevel, setCurrentUserLevel] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('period'); // 'weekly' -> 'period'
  const [showTitleSystemModal, setShowTitleSystemModal] = useState(false);

  // --- ここから新しいロジック ---
  const [isRankingPeriodActive, setIsRankingPeriodActive] = useState(false);
  const [rankingPeriod, setRankingPeriod] = useState<{ start: Date, end: Date } | null>(null);

  useEffect(() => {
    // 現在のランキング期間を計算する
    const now = new Date();
    const currentDay = now.getDate();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (currentDay >= 1 && currentDay <= 25) {
      // ランキング集計期間内
      const startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0);
      const endDate = new Date(currentYear, currentMonth, 25, 23, 59, 59);
      setRankingPeriod({ start: startDate, end: endDate });
      setIsRankingPeriodActive(true);
    } else {
      // 集計期間外
      setIsRankingPeriodActive(false);
      setLoading(false); // データ取得しないのでローディング終了
    }
  }, []);
  
  useEffect(() => {
    if (isRankingPeriodActive && rankingPeriod) {
      fetchRankings(rankingPeriod.start, rankingPeriod.end);
    }
  }, [session, isRankingPeriodActive, rankingPeriod]);

  const fetchRankings = async (startDate: Date, endDate: Date) => {
    setLoading(true);
    try {
      // 新しいデータベース関数を呼び出す
      const { data, error } = await supabase.rpc('get_rankings', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      });

      if (error) {
        console.error('ランキング取得エラー:', error);
        throw error;
      }

      const typedData = data as UserRanking[];

      const periodSorted = [...typedData]
        .filter(user => user.period_likes > 0)
        .sort((a, b) => b.period_likes - a.period_likes);
        
      const totalSorted = [...typedData]
        .filter(user => user.total_likes > 0)
        .sort((a, b) => b.total_likes - a.total_likes);

      setPeriodRankings(periodSorted);
      setTotalRankings(totalSorted);

      if (session?.user?.id) {
        const currentUserIndex = totalSorted.findIndex(u => u.user_id === session.user.id);
        if (currentUserIndex !== -1) {
          const currentUserData = totalSorted[currentUserIndex];
          setCurrentUserRanking({ ...currentUserData, rank: currentUserIndex + 1 });
          const level = getHunterLevel(currentUserData.total_likes);
          setCurrentUserLevel(level);
        } else {
          setCurrentUserRanking(null);
        }
      }
    } catch (e) {
      console.error(e);
      toast({
        title: "エラー",
        description: "ランキングの取得に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 新しいボタン用のハンドラーを追加
  const handleRefresh = async () => {
    if (isRankingPeriodActive && rankingPeriod) {
      setLoading(true);
      await fetchRankings(rankingPeriod.start, rankingPeriod.end);
      const refreshToast = toast({
        title: "更新しました",
        description: "最新のランキング情報を取得しました。",
      });
      setTimeout(() => {
        refreshToast.dismiss();
      }, 1000);
    } else {
      const offPeriodToast = toast({
        title: "集計期間外です",
        description: "現在、ランキングは集計期間外です。",
      });
      setTimeout(() => {
        offPeriodToast.dismiss();
      }, 1000);
    }
  };

  const handleGoToProfile = () => {
    router.push('/profile');
  };

  const handleGoToPost = () => {
    router.push('/post');
  };

  const RankingCard = ({ user, rank, isWeekly }: { user: UserRanking; rank: number; isWeekly: boolean }) => {
    const hunterLevel = getHunterLevel(user.total_likes);
    const LevelIcon = hunterLevel.icon;
    const likes = isWeekly ? user.period_likes : user.total_likes;
    const isCurrentUser = session?.user?.id === user.user_id;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: rank * 0.05 }}
      >
        <Card className={`${isCurrentUser ? 'ring-2 ring-primary bg-primary/5' : ''} hover:shadow-lg transition-all duration-300`}>
          <CardContent className="p-3">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-8 text-center">
                {getRankIcon(rank)}
              </div>
              
              <Avatar className="h-10 w-10">
                <AvatarImage 
                  src={user.avatar_url ? supabase.storage.from('avatars').getPublicUrl(user.avatar_url).data.publicUrl : undefined} 
                  alt={user.display_name} 
                />
                <AvatarFallback>{user.display_name.charAt(0)}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-4">
                  <h3 className={`font-semibold truncate ${user.display_name.length >= 6 ? 'text-sm' : 'text-sm'}`}>
                    {user.display_name}
                  </h3>
                  {isCurrentUser && <Badge variant="secondary" className="ml-1">あなた</Badge>}
                </div>
                
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className={hunterLevel.color}>
                    <LevelIcon className="h-3 w-3 mr-1" />
                    {hunterLevel.name}
                  </Badge>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-xl font-bold text-primary">{likes}</div>
                <div className="text-sm text-muted-foreground">
                  {isWeekly ? '月間いいね' : '総いいね'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const RankingList = ({ rankings, isWeekly }: { rankings: UserRanking[], isWeekly: boolean }) => {
    if (rankings.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {isWeekly ? '期間内のランキングデータがまだありません' : '総合ランキングデータがありません'}
          </p>
        </div>
      );
    }

    const top4 = rankings.slice(0, 4);
    const rest = rankings.slice(4);

    return (
      <div className="space-y-4">
        {top4.map((user, index) => (
          <RankingCard key={user.app_profile_id} user={user} rank={index + 1} isWeekly={isWeekly} />
        ))}

        {rest.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <Card>
              <CardHeader className="py-3 px-4 border-b">
                <CardTitle className="text-base font-semibold">5位以降のランキング</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-y-auto space-y-4 p-4 custom-scrollbar">
                {rest.map((user, index) => (
                  <RankingCard key={user.app_profile_id} user={user} rank={index + 5} isWeekly={isWeekly} />
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto max-w-4xl p-4">


        {/* お品書き (掲示板風デザイン) */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6"
        >
          <div className="relative bg-gradient-to-br from-amber-50 to-orange-100 border-4 border-amber-300 rounded-lg p-3 shadow-lg">
            {/* 装飾的な角の要素 */}
            <div className="absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 border-amber-400"></div>
            <div className="absolute top-1 right-1 w-3 h-3 border-r-2 border-t-2 border-amber-400"></div>
            <div className="absolute bottom-1 left-1 w-3 h-3 border-l-2 border-b-2 border-amber-400"></div>
            <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-amber-400"></div>
            
            <div className="space-y-2 text-center">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-6 h-0.5 bg-amber-400"></div>
                <Trophy className="h-5 w-5 text-amber-600" />
                <div className="w-6 h-0.5 bg-amber-400"></div>
              </div>
              
              <div className="space-y-1">
                <p className="text-base text-amber-800 font-medium">
                  あなたのおとく情報を投稿して
                </p>
                <p className="text-lg text-amber-900 font-bold flex items-center justify-center space-x-1">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  <span>レジェンドハンターを目指そう！</span>
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                </p>
              </div>
              
              <div className="flex items-center justify-center space-x-2 text-sm text-amber-700">
                <div className="w-8 h-0.5 bg-amber-300"></div>
                <span className="font-medium">いいねをたくさんもらって<br />ランキング上位を目指そう！</span>
                <div className="w-8 h-0.5 bg-amber-300"></div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ナビゲーションボタン */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center justify-center space-x-2 md:space-x-4 mb-6"
        >
          <Button
            variant="default"
            size="sm"
            onClick={handleRefresh}
            className="bg-[#ffcc33] hover:bg-[#e6b82e] text-gray-900 font-medium border-0 shadow-sm flex-1 md:flex-none"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            更新
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleGoToProfile}
            className="bg-[#f97415] hover:brightness-90 text-white font-medium border-0 shadow-sm flex-1 md:flex-none"
          >
            <User className="h-4 w-4 mr-2" />
            マイページ
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleGoToPost}
            className="bg-[#73370c] hover:bg-[#5c2c0a] text-white font-medium border-0 shadow-sm flex-1 md:flex-none"
          >
            投稿する
          </Button>
        </motion.div>

        {/* 現在のユーザー情報 */}
        {currentUserRanking && (
          <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="h-5 w-5" />
                <span>あなたの称号</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage 
                      src={currentUserRanking.avatar_url ? supabase.storage.from('avatars').getPublicUrl(currentUserRanking.avatar_url).data.publicUrl : undefined} 
                      alt={currentUserRanking.display_name} 
                    />
                    <AvatarFallback className="text-lg">{currentUserRanking.display_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <h3 className={`font-bold ${currentUserRanking.display_name.length >= 6 ? 'text-lg' : 'text-xl'}`}>
                      {currentUserRanking.display_name}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      {(() => {
                        const level = getHunterLevel(currentUserRanking.total_likes);
                        const LevelIcon = level.icon;
                        return (
                          <Badge className={level.color}>
                            <LevelIcon className="h-4 w-4 mr-1" />
                            {level.name}
                          </Badge>
                        );
                      })()}
                    </div>
                    {/* 称号システムとは？ボタンを称号の下に移動 */}
                    <div className="mt-2">
                      <button
                        onClick={() => setShowTitleSystemModal(true)}
                        className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <Info className="h-4 w-4" />
                        <span>称号システムとは？</span>
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">{currentUserRanking.total_likes}</div>
                  <div className="text-sm text-muted-foreground">総いいね数</div>
                  {currentUserRanking.rank > 0 && <div className="text-sm text-muted-foreground">総合ランク: #{currentUserRanking.rank}</div>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* タブ切り替え */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="period" className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>月間ランキング</span>
            </TabsTrigger>
            <TabsTrigger value="total" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>総合ランキング</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="period" className="space-y-4">
            {isRankingPeriodActive && rankingPeriod ? (
              <>
                <div className="text-center mb-4">
                  <h2 className="text-lg font-semibold">今月のいいね数ランキング</h2>
                  <p className="text-sm text-muted-foreground">
                    集計期間: {rankingPeriod.start.toLocaleDateString('ja-JP')} 〜 {rankingPeriod.end.toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <RankingList rankings={periodRankings} isWeekly={true} />
              </>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12 bg-gray-50 rounded-lg border"
              >
                <Clock className="h-10 w-10 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700">ランキング集計期間外です</h3>
                <p className="text-muted-foreground mt-2">
                  次のランキングは来月1日から開始します。
                </p>
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="total" className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold">総合いいね数ランキング</h2>
              <p className="text-sm text-muted-foreground">
                アプリ開始以来の累計いいね数
              </p>
            </div>
            <RankingList rankings={totalRankings} isWeekly={false} />
          </TabsContent>
        </Tabs>

        {/* 称号システム説明モーダル */}
        <CustomModal
          isOpen={showTitleSystemModal}
          onClose={() => setShowTitleSystemModal(false)}
          title="称号システムとは？"
          description="いいね数に応じて称号が変わります"
          showCloseButton={true}
          dialogContentClassName="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold flex items-center justify-center space-x-2">
                <Award className="h-5 w-5 text-primary" />
                <span>称号システム</span>
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                投稿にもらったいいね数の合計に応じて、<br />あなたの称号が決まります
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(() => {
                const HUNTER_LEVELS = [
                  { name: "見習いハンター", minLikes: 0, maxLikes: 9, icon: Target, color: "bg-gray-100 text-gray-600" },
                  { name: "駆け出しハンター", minLikes: 10, maxLikes: 29, icon: Star, color: "bg-blue-100 text-blue-600" },
                  { name: "熟練ハンター", minLikes: 30, maxLikes: 59, icon: Medal, color: "bg-green-100 text-green-600" },
                  { name: "エキスパートハンター", minLikes: 60, maxLikes: 99, icon: Trophy, color: "bg-yellow-100 text-yellow-600" },
                  { name: "マスターハンター", minLikes: 100, maxLikes: 199, icon: Crown, color: "bg-purple-100 text-purple-600" },
                  { name: "レジェンドハンター", minLikes: 200, maxLikes: Infinity, icon: Zap, color: "bg-red-100 text-red-600" }
                ];
                return HUNTER_LEVELS;
              })().map((level, index) => {
                const LevelIcon = level.icon;
                return (
                  <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                    <Badge className={level.color}>
                      <LevelIcon className="h-4 w-4 mr-1" />
                      {level.name}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      {level.maxLikes === Infinity ? `${level.minLikes}+` : `${level.minLikes}-${level.maxLikes}`} いいね
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 text-center">
                💡 より多くのいいねをもらって、<br />上位の称号を目指しましょう！
              </p>
            </div>
          </div>
        </CustomModal>
      </div>
    </AppLayout>
  );
}
