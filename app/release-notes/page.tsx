"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Zap, 
  Bug, 
  Plus, 
  Sparkles, 
  Shield, 
  Smartphone,
  Calendar,
  CheckCircle,
  AlertCircle,
  Info,
  Star,
  Gift,
  Wrench
} from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// リリースノートのタイプ
type ReleaseType = 'major' | 'minor' | 'patch' | 'hotfix';
type ChangeType = 'new' | 'improvement' | 'fix' | 'security' | 'breaking';

interface ReleaseNote {
  version: string;
  date: string;
  type: ReleaseType;
  title: string;
  description: string;
  changes: {
    type: ChangeType;
    title: string;
    description: string;
  }[];
  isLatest?: boolean;
}

// 変更タイプのアイコンと色を取得
const getChangeTypeConfig = (type: ChangeType) => {
  switch (type) {
    case 'new':
      return {
        icon: Plus,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        label: '新機能'
      };
    case 'improvement':
      return {
        icon: Sparkles,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        label: '改善'
      };
    case 'fix':
      return {
        icon: Bug,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        label: 'バグ修正'
      };
    case 'security':
      return {
        icon: Shield,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        label: 'セキュリティ'
      };
    case 'breaking':
      return {
        icon: AlertCircle,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        label: '重要な変更'
      };
  }
};

// リリースタイプのバッジ色を取得
const getReleaseTypeBadge = (type: ReleaseType) => {
  switch (type) {
    case 'major':
      return 'bg-red-100 text-red-800';
    case 'minor':
      return 'bg-blue-100 text-blue-800';
    case 'patch':
      return 'bg-green-100 text-green-800';
    case 'hotfix':
      return 'bg-orange-100 text-orange-800';
  }
};

// サンプルリリースノートデータ
const releaseNotes: ReleaseNote[] = [
  {
    version: '1.0.0',
    date: '2025-06-16',
    type: 'major',
    title: 'トクドク β版 正式リリース！',
    description: 'みんなでお得な情報を共有できるアプリ「トクドク」のβ版がついに正式リリースされました！',
    isLatest: true,
    changes: [
      {
        type: 'new',
        title: '投稿機能',
        description: 'お得な商品情報を写真付きで投稿できるようになりました'
      },
      {
        type: 'new',
        title: 'タイムライン機能',
        description: '周辺のお得情報をリアルタイムで確認できます'
      },
      {
        type: 'new',
        title: 'お店検索機能',
        description: 'Google Maps連携で近くのお店を簡単に検索できます'
      },
      {
        type: 'new',
        title: 'プロフィール機能',
        description: 'ニックネームやお気に入り店舗を設定できます'
      },
      {
        type: 'new',
        title: '通知機能',
        description: 'お気に入り店舗の新着投稿をプッシュ通知でお知らせ'
      }
    ]
  },
  {
    version: '0.9.5',
    date: '2025-06-16',
    type: 'patch',
    title: 'リリース前最終調整',
    description: 'β版リリースに向けた最終的なバグ修正と安定性の向上を行いました。',
    changes: [
      {
        type: 'fix',
        title: '画像アップロード問題の修正',
        description: '特定の条件下で画像アップロードが失敗する問題を修正しました'
      },
      {
        type: 'improvement',
        title: 'パフォーマンス向上',
        description: 'アプリの起動速度とページ遷移速度を改善しました'
      },
      {
        type: 'fix',
        title: '位置情報取得の安定化',
        description: 'GPS情報の取得がより安定するように改善しました'
      }
    ]
  },
  {
    version: '0.9.0',
    date: '2025-06-16',
    type: 'minor',
    title: 'β版テスト開始',
    description: 'クローズドβテストを開始しました。基本機能の実装が完了しています。',
    changes: [
      {
        type: 'new',
        title: 'ユーザー認証システム',
        description: 'Google認証によるログイン機能を実装しました'
      },
      {
        type: 'new',
        title: 'データベース設計完了',
        description: 'Supabaseを使用したバックエンドシステムを構築しました'
      },
      {
        type: 'new',
        title: 'レスポンシブデザイン',
        description: 'モバイルファーストのUIデザインを実装しました'
      }
    ]
  }
];

// 変更項目コンポーネント
const ChangeItem = ({ change }: { change: ReleaseNote['changes'][0] }) => {
  const config = getChangeTypeConfig(change.type);
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-start space-x-3 p-3 rounded-lg border",
        config.bgColor,
        config.borderColor
      )}
    >
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
        config.color.replace('text-', 'bg-').replace('-600', '-100')
      )}>
        <Icon className={cn("h-3 w-3", config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <p className="font-medium text-sm text-gray-900">{change.title}</p>
          <Badge variant="outline" className="text-xs">
            {config.label}
          </Badge>
        </div>
        <p className="text-xs text-gray-600">{change.description}</p>
      </div>
    </motion.div>
  );
};

// リリースノートカードコンポーネント
const ReleaseNoteCard = ({ release, index }: { release: ReleaseNote; index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "bg-white rounded-xl border shadow-sm p-6 space-y-4",
        release.isLatest && "ring-2 ring-blue-200 bg-gradient-to-br from-blue-50/50 to-white"
      )}
    >
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-bold text-gray-900">{release.title}</h3>
            {release.isLatest && (
              <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <Star className="h-3 w-3 mr-1" />
                最新
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(release.date).toLocaleDateString('ja-JP')}</span>
            </div>
            <Badge className={cn("text-xs", getReleaseTypeBadge(release.type))}>
              v{release.version}
            </Badge>
          </div>
        </div>
      </div>

      {/* 説明 */}
      <p className="text-sm text-gray-700">{release.description}</p>

      {/* 変更内容 */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm text-gray-900 flex items-center">
          <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
          変更内容
        </h4>
        <div className="space-y-2">
          {release.changes.map((change, changeIndex) => (
            <ChangeItem key={changeIndex} change={change} />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default function ReleaseNotesPage() {
  const router = useRouter();

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto max-w-2xl p-4 md:p-8 pb-20"
      >
        {/* ヘッダー */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-4 mb-6"
        >
          <div className="flex-1">
            <p className="text-base text-gray-600 mt-1">
              アプリの最新アップデート情報をお知らせします
            </p>
          </div>
        </motion.div>

        {/* 統計情報 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center border border-blue-200">
            <Smartphone className="h-6 w-6 mx-auto text-blue-600 mb-2" />
            <p className="text-lg font-bold text-blue-900">v1.0.0</p>
            <p className="text-xs text-blue-700">現在のバージョン</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 text-center border border-green-200">
            <Gift className="h-6 w-6 mx-auto text-green-600 mb-2" />
            <p className="text-lg font-bold text-green-900">{releaseNotes.reduce((acc, release) => acc + release.changes.filter(c => c.type === 'new').length, 0)}</p>
            <p className="text-xs text-green-700">新機能</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 text-center border border-orange-200">
            <Wrench className="h-6 w-6 mx-auto text-orange-600 mb-2" />
            <p className="text-lg font-bold text-orange-900">{releaseNotes.reduce((acc, release) => acc + release.changes.filter(c => c.type === 'fix').length, 0)}</p>
            <p className="text-xs text-orange-700">バグ修正</p>
          </div>
        </motion.div>

        {/* リリースノート一覧 */}
        <div className="space-y-6">
          {releaseNotes.map((release, index) => (
            <ReleaseNoteCard key={release.version} release={release} index={index} />
          ))}
        </div>

        {/* フッター */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="bg-gray-50 rounded-lg p-6 border">
            <Info className="h-8 w-8 mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-gray-600 mb-2">
              アプリの改善にご協力ください
            </p>
            <p className="text-xs text-gray-500 mb-4">
              ご意見・ご要望がございましたら、<br />お気軽にお問い合わせください
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/contact')}
              className="text-xs"
            >
              フィードバックを送る
            </Button>
          </div>
        </motion.div>

        {/* 戻るボタン */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <Button
            variant="outline"
            onClick={() => router.push('/timeline')}
            className="px-6 py-2 text-base"
          >
            戻る
          </Button>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}
