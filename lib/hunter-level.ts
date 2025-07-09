import { Target, Star, Medal, Trophy, Crown, Zap } from "lucide-react";

export interface HunterLevel {
  name: string;
  minLikes: number;
  maxLikes: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const HUNTER_LEVELS: HunterLevel[] = [
  {
    name: "見習いハンター",
    minLikes: 0,
    maxLikes: 9,
    icon: Target,
    color: "bg-gray-100 text-gray-600",
  },
  {
    name: "駆け出しハンター",
    minLikes: 10,
    maxLikes: 29,
    icon: Star,
    color: "bg-blue-100 text-blue-600",
  },
  {
    name: "熟練ハンター",
    minLikes: 30,
    maxLikes: 59,
    icon: Medal,
    color: "bg-green-100 text-green-600",
  },
  {
    name: "エキスパートハンター",
    minLikes: 60,
    maxLikes: 99,
    icon: Trophy,
    color: "bg-yellow-100 text-yellow-600",
  },
  {
    name: "マスターハンター",
    minLikes: 100,
    maxLikes: 199,
    icon: Crown,
    color: "bg-purple-100 text-purple-600",
  },
  {
    name: "レジェンドハンター",
    minLikes: 200,
    maxLikes: Infinity,
    icon: Zap,
    color: "bg-red-100 text-red-600",
  },
];

export const getHunterLevel = (likes: number): HunterLevel => {
  return HUNTER_LEVELS.find(level => 
    likes >= level.minLikes && likes <= level.maxLikes
  ) || HUNTER_LEVELS[0];
};

export const calculateWeeklyLikes = async (userId: string): Promise<number> => {
  // 1週間前の日付を計算
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  // Supabaseクエリで1週間のいいね数を取得
  // 実装は上記のHunterRankingPageを参考
  return 0; // 実装例
};
