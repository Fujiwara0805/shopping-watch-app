"use client";

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { TrainFront, Clock, MapPin, ChevronLeft, BusFront } from 'lucide-react';
import { format, addMinutes, isAfter, parse, getMinutes, getHours } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useState, useEffect } from 'react';

export default function TrainSchedulePage() {
  const router = useRouter();

  // 平日ダイヤの時刻表データ (大分大学前駅 → 大分駅 / 電車)
  const weekdayTrainSchedule = [
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

  // 土日祝ダイヤの時刻表データ (大分大学前駅 → 大分駅 / 電車)
  const weekendHolidayTrainSchedule = [
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

  // 平日ダイヤのバス時刻表データ (大分大学 → 大分駅)
  const weekdayBusSchedule = [
    { busStop: '大分大学前駅', system: 'F40 系統', times: ['12:09', '15:48', '19:15'], duration: '約30分程度' },
    { busStop: '大分大学前駅', system: 'F42 系統', times: ['07:37', '08:30', '10:08', '16:29', '17:20', '18:57'], duration: '約30分程度' },
    { busStop: '大分大学前駅', system: 'G41/G42/H40/H41 系統', times: ['06:54', '07:21', '07:59', '09:25', '10:48', '16:29', '17:24'], duration: '約26〜39分程度' },
    { busStop: '大分大学入口', system: 'G73/H74 急行系統', times: ['07:28', '09:54', '14:41', '16:22'], duration: '約22〜23分程度' }
    // 大学/正門 は大分大学前駅に準ずるため、個別のデータは不要
  ];


  const [upcomingTrainSchedules, setUpcomingTrainSchedules] = useState<any[]>([]);
  const [upcomingBusSchedules, setUpcomingBusSchedules] = useState<any[]>([]);
  const [currentDayType, setCurrentDayType] = useState<'平日' | '土日祝' | null>(null);

  useEffect(() => {
    const getUpcomingTrains = () => {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd'); // 今日の日付
      const dayOfWeek = now.getDay(); // 0: 日曜日, 1: 月曜日, ..., 6: 土曜日

      let activeTrainSchedule = [];
      let dayTypeName: '平日' | '土日祝';

      // 曜日によって使用する時刻表を決定
      if (dayOfWeek === 0 || dayOfWeek === 6) { // 日曜日または土曜日
        activeTrainSchedule = weekendHolidayTrainSchedule;
        dayTypeName = '土日祝';
      } else {
        activeTrainSchedule = weekdayTrainSchedule;
        dayTypeName = '平日';
      }
      setCurrentDayType(dayTypeName);

      const filteredTrains = activeTrainSchedule
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

      setUpcomingTrainSchedules(filteredTrains);
    };

    const getUpcomingBuses = () => {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');

      // バスは平日ダイヤのみ提供なので、曜日はチェックしない
      const activeBusSchedule = weekdayBusSchedule;

      const allUpcomingBuses: any[] = [];

      activeBusSchedule.forEach(busStopData => {
        busStopData.times.forEach(time => {
          const departureTime = parse(`${today} ${time}`, 'yyyy-MM-dd HH:mm', new Date());
          const diffMinutes = Math.ceil((departureTime.getTime() - now.getTime()) / (1000 * 60));

          if (diffMinutes >= 0) {
            allUpcomingBuses.push({
              busStop: busStopData.busStop,
              system: busStopData.system,
              time,
              destination: '大分駅', // バスの目的地は画像から推測して固定
              type: 'バス', // 電車と区別するため
              duration: busStopData.duration,
              departureTime,
              remainingMinutes: diffMinutes,
            });
          }
        });
      });

      // 残り時間の短い順にソートし、次の3本を取得
      const filteredBuses = allUpcomingBuses
        .sort((a, b) => a.remainingMinutes - b.remainingMinutes)
        .slice(0, 3);

      setUpcomingBusSchedules(filteredBuses);
    };

    getUpcomingTrains();
    getUpcomingBuses();
    // 1分ごとに更新
    const intervalId = setInterval(() => {
      getUpcomingTrains();
      getUpcomingBuses();
    }, 60 * 1000); 

    return () => clearInterval(intervalId);
  }, []);

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto max-w-lg p-4 md:p-8"
      > 
        <div className="space-y-6">
          {/* 電車の時刻表セクション */}
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
            {upcomingTrainSchedules.length > 0 ? (
              upcomingTrainSchedules.map((schedule, index) => (
                <motion.div
                  key={`train-${schedule.time}-${index}`}
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
            <p className="mt-1">この機能は、大分大学旦野原キャンパスから1km圏内にいるユーザーのみに表示されています。<br />※運行状況については、最新情報をご確認ください。</p>
            {currentDayType === '土日祝' && (
              <p className="mt-1 text-xs text-yellow-700">※ 07:26発の電車は特定日運行です。</p>
            )}
          </motion.div>

          {/* バスの時刻表セクション */}
          <div className="mt-8 space-y-6">
            <div className="p-4 bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg shadow-md">
              <div className="flex items-center space-x-3 mb-3">
                <BusFront className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-semibold text-green-900">大分大学 最寄りのバス停</h2>
              </div>
              <p className="text-sm text-green-700 flex items-center mb-2">
                <MapPin className="h-4 w-4 mr-2 text-green-500" />
                大分大学 → 大分駅
              </p>
              <p className="text-sm text-green-700 flex items-center">
                <Clock className="h-4 w-4 mr-2 text-green-500" />
                現在の時刻: {format(new Date(), 'HH:mm', { locale: ja })}
              </p>
              <p className="text-xs text-green-700 mt-2">
                現在時刻から最大3本先までのバスの時刻表を掲載しています。
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
                次のバス
              </h3>
              {upcomingBusSchedules.length > 0 ? (
                upcomingBusSchedules.map((schedule, index) => (
                  <motion.div
                    key={`bus-${schedule.busStop}-${schedule.time}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + index * 0.1, duration: 0.3 }}
                    className="flex items-center justify-between p-3 border-b last:border-b-0"
                  >
                    <div className="flex-grow space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl font-bold text-gray-800">{schedule.time}</span>
                        <span className="text-sm font-medium text-gray-600">{schedule.busStop}</span>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{schedule.system} → {schedule.destination}</p>
                        {schedule.duration && <p className="text-xs text-muted-foreground">所要時間: {schedule.duration}</p>}
                        {schedule.notes && <p className="text-xs text-muted-foreground text-orange-500">{schedule.notes}</p>}
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
                <p className="text-center text-muted-foreground py-4">本日の運行は終了しました。<br />または、時刻表が見つかりません。</p>
              )}
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 shadow-md"
            >
              <p>※ これは平日ダイヤの時刻表です。</p>
              <p className="mt-2">バスについてはダイヤ改正が頻繁に行われるため、もし仮にダイヤが異なる場合は<a href="/contact" className="text-blue-600 underline">お問い合わせフォーム</a>よりご連絡ください。</p>
              <p className="mt-1">また、ご不明な点があればご自身で最新の情報を検索して調べてください。</p>
            </motion.div>
          </div>

          {/* 画面下部の戻るボタン */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-8 flex justify-center items-center"
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
    </div>
  );
}
