"use client";

import { motion } from 'framer-motion';
import AppLayout from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { TrainFront, Clock, MapPin, ChevronLeft } from 'lucide-react';
import { format, addMinutes, isAfter, parse, getMinutes, getHours } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useState, useEffect } from 'react';

export default function TrainSchedulePage() {
  const router = useRouter();

  // 平日ダイヤの時刻表データ (大分大学前駅 → 大分駅)
  const weekdaySchedule = [
    { time: '06:14', destination: '大分駅', type: '普通' },
    { time: '06:39', destination: '大分駅', type: '普通' },
    { time: '07:01', destination: '大分駅', type: '普通' },
    { time: '07:26', destination: '大分駅', type: '普通' }, // 平日は常に運行
    { time: '07:47', destination: '大分駅', type: '普通' },
    { time: '08:08', destination: '大分駅', type: '普通' },
    { time: '08:26', destination: '大分駅', type: '普通' },
    { time: '08:47', destination: '大分駅', type: '普通' },
    { time: '09:13', destination: '大分駅', type: '普通' },
    { time: '09:34', destination: '大分駅', type: '普通' },
    { time: '09:54', destination: '大分駅', type: '普通' },
    { time: '10:16', destination: '大分駅', type: '普通' },
    { time: '10:33', destination: '大分駅', type: '普通' },
    { time: '10:53', destination: '大分駅', type: '普通' },
    { time: '11:28', destination: '大分駅', type: '普通' },
    { time: '12:24', destination: '大分駅', type: '普通' },
    { time: '13:16', destination: '大分駅', type: '普通' },
    { time: '13:45', destination: '大分駅', type: '普通' },
    { time: '14:15', destination: '大分駅', type: '普通' },
    { time: '14:42', destination: '大分駅', type: '普通' },
    { time: '15:18', destination: '大分駅', type: '普通' },
    { time: '16:11', destination: '大分駅', type: '普通' },
    { time: '17:04', destination: '大分駅', type: '普通' },
    { time: '17:28', destination: '大分駅', type: '普通' },
    { time: '17:49', destination: '大分駅', type: '普通' },
    { time: '18:01', destination: '大分駅', type: '普通' },
    { time: '18:43', destination: '大分駅', type: '普通' },
    { time: '19:06', destination: '大分駅', type: '普通' },
    { time: '19:27', destination: '大分駅', type: '普通' },
    { time: '19:49', destination: '大分駅', type: '普通' },
    { time: '20:10', destination: '大分駅', type: '普通' },
    { time: '20:35', destination: '大分駅', type: '普通' },
    { time: '20:56', destination: '大分駅', type: '普通' },
    { time: '21:57', destination: '大分駅', type: '普通' },
    { time: '22:34', destination: '大分駅', type: '普通' },
    { time: '23:11', destination: '大分駅', type: '普通' },
  ];

  // 土日祝ダイヤの時刻表データ (大分大学前駅 → 大分駅)
  const weekendHolidaySchedule = [
    { time: '06:14', destination: '大分駅', type: '普通' },
    { time: '06:39', destination: '大分駅', type: '普通' },
    { time: '07:01', destination: '大分駅', type: '普通' },
    { time: '07:26', destination: '大分駅', type: '特定日普通' }, // 特定日運行を区別
    { time: '07:47', destination: '大分駅', type: '普通' },
    { time: '08:08', destination: '大分駅', type: '普通' },
    { time: '08:26', destination: '大分駅', type: '普通' },
    { time: '08:47', destination: '大分駅', type: '普通' },
    { time: '09:13', destination: '大分駅', type: '普通' },
    { time: '09:34', destination: '大分駅', type: '普通' },
    { time: '09:54', destination: '大分駅', type: '普通' },
    { time: '10:16', destination: '大分駅', type: '普通' },
    { time: '10:33', destination: '大分駅', type: '普通' },
    { time: '10:53', destination: '大分駅', type: '普通' },
    { time: '11:28', destination: '大分駅', type: '普通' },
    { time: '12:24', destination: '大分駅', type: '普通' },
    { time: '13:16', destination: '大分駅', type: '普通' },
    { time: '13:45', destination: '大分駅', type: '普通' },
    { time: '14:15', destination: '大分駅', type: '普通' },
    { time: '14:42', destination: '大分駅', type: '普通' },
    { time: '15:18', destination: '大分駅', type: '普通' },
    { time: '16:11', destination: '大分駅', type: '普通' },
    { time: '17:04', destination: '大分駅', type: '普通' },
    { time: '17:28', destination: '大分駅', type: '普通' },
    { time: '17:49', destination: '大分駅', type: '普通' },
    { time: '18:01', destination: '大分駅', type: '普通' },
    { time: '18:43', destination: '大分駅', type: '普通' },
    { time: '19:06', destination: '大分駅', type: '普通' },
    { time: '19:27', destination: '大分駅', type: '普通' },
    { time: '19:49', destination: '大分駅', type: '普通' },
    { time: '20:10', destination: '大分駅', type: '普通' },
    { time: '20:35', destination: '大分駅', type: '普通' },
    { time: '20:56', destination: '大分駅', type: '普通' },
    { time: '21:57', destination: '大分駅', type: '普通' },
    { time: '22:34', destination: '大分駅', type: '普通' },
    { time: '23:11', destination: '大分駅', type: '普通' },
  ];

  const [upcomingSchedules, setUpcomingSchedules] = useState<any[]>([]);
  const [currentDayType, setCurrentDayType] = useState<'平日' | '土日祝' | null>(null);

  useEffect(() => {
    const getUpcomingTrains = () => {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd'); // 今日の日付
      const dayOfWeek = now.getDay(); // 0: 日曜日, 1: 月曜日, ..., 6: 土曜日

      let activeSchedule = [];
      let dayTypeName: '平日' | '土日祝';

      // 曜日によって使用する時刻表を決定
      if (dayOfWeek === 0 || dayOfWeek === 6) { // 日曜日または土曜日
        activeSchedule = weekendHolidaySchedule;
        dayTypeName = '土日祝';
      } else {
        activeSchedule = weekdaySchedule;
        dayTypeName = '平日';
      }
      setCurrentDayType(dayTypeName);

      const filteredSchedules = activeSchedule
        .map(schedule => {
          const departureTime = parse(`${today} ${schedule.time}`, 'yyyy-MM-dd HH:mm', new Date());
          const diffMinutes = Math.ceil((departureTime.getTime() - now.getTime()) / (1000 * 60)); // 残り時間を分で計算

          return {
            ...schedule,
            departureTime,
            remainingMinutes: diffMinutes,
          };
        })
        .filter(schedule => schedule.remainingMinutes >= 0) // 現在時刻以降の電車のみ
        .sort((a, b) => a.remainingMinutes - b.remainingMinutes) // 残り時間の短い順にソート
        .slice(0, 3); // 次の3本

      setUpcomingSchedules(filteredSchedules);
    };

    getUpcomingTrains();
    // 1分ごとに更新
    const intervalId = setInterval(getUpcomingTrains, 60 * 1000); 

    return () => clearInterval(intervalId);
  }, []);

  const handleGoBack = () => {
    router.back();
  };

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto max-w-lg p-4 md:p-8"
      >
        <div className="space-y-6">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-md">
            <div className="flex items-center space-x-3 mb-3">
              <TrainFront className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-blue-900">大分大学 最寄りの駅</h2>
            </div>
            <p className="text-sm text-blue-700 flex items-center mb-2">
              <MapPin className="h-4 w-4 mr-2 text-blue-500" />
              豊肥本線 大分大学前駅 → 大分駅
            </p>
            <p className="text-sm text-blue-700 flex items-center">
              <Clock className="h-4 w-4 mr-2 text-blue-500" />
              現在の時刻: {format(new Date(), 'HH:mm', { locale: ja })}
            </p>
            {/* 説明文の変更 */}
            <p className="text-xs text-blue-700 mt-2">
              現在時刻から最大3本先までの電車の時刻表を掲載しています。
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="p-4 bg-card border rounded-lg shadow-md"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center text-primary">
              <Clock className="mr-2 h-5 w-5" />
              次の電車
            </h3>
            {upcomingSchedules.length > 0 ? (
              upcomingSchedules.map((schedule, index) => (
                <motion.div
                  key={`${schedule.time}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1, duration: 0.3 }}
                  className="flex items-center justify-between p-3 border-b last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl font-bold text-gray-800">{schedule.time}</span>
                    <div>
                      <p className="text-sm text-gray-700">{schedule.destination}</p>
                      <p className="text-xs text-muted-foreground">
                        {schedule.type}
                        {schedule.type === '特定日普通' && <span className="ml-1 text-orange-500">(特定日運行)</span>}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-green-600">
                    {schedule.remainingMinutes === 0
                      ? '出発！'
                      : schedule.remainingMinutes > 0
                      ? `${schedule.remainingMinutes}分後`
                      : ''}
                  </span>
                </motion.div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">本日の運行は終了しました、または時刻表が見つかりません。</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 shadow-md"
          >
            <p>※ これは{currentDayType}ダイヤの時刻表です。</p>
            <p className="mt-1">この機能は、大分大学旦野原キャンパスから5km圏内にいるユーザーのみに表示されています。</p>
            {currentDayType === '土日祝' && (
              <p className="mt-1 text-xs text-yellow-700">※ 07:26発の電車は特定日運行です。</p>
            )}
          </motion.div>

          {/* 画面下部の戻るボタンを追加 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-8 flex justify-center"
          >
            <Button
              onClick={handleGoBack}
              variant="default"
            >
              戻る
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </AppLayout>
  );
}
