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
import { cn } from '@/lib/utils';
import { useFeedback } from '@/contexts/feedback-context';

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
    version: '1.0.8',
    date: '2025-07-15',
    type: 'minor',
    title: 'タイムライン機能の大幅改善と掲示板機能の廃止',
    description: '地域密着型SNSとしての機能を強化するため、タイムライン機能を大幅に改善しました。また、利用頻度の低い掲示板機能を廃止し、よりシンプルで使いやすいアプリにリニューアルしました。',
    isLatest: true,
    changes: [
      {
        type: 'improvement',
        title: '5km圏内投稿表示の最適化',
        description: '投稿者の端末位置情報を基準とした5km圏内の投稿表示機能を実装。常に地域密着型の情報を提供し、より関連性の高いお得情報を表示できるようになりました。'
      },
      {
        type: 'improvement',
        title: '投稿カードデザインの全面刷新',
        description: '投稿者情報と基本情報を分離し、5行2列の表形式で情報を整理。場所、カテゴリ、価格、視聴回数、残り時間をアイコンと共に見やすく表示するよう改善しました。'
      },
      {
        type: 'improvement',
        title: 'アクションボタンの視認性向上',
        description: 'いいね、コメント、共有ボタンにそれぞれ専用の背景色（#fcebeb、#eff4ff、#eefdf6）と枠線を追加。ボタンとしての認識性を大幅に向上させました。'
      },
      {
        type: 'improvement',
        title: '検索機能の改善',
        description: 'テキスト入力中の検索実行を防ぐため、デバウンス時間を800msに延長。ユーザーが快適に検索語を入力できるよう改善しました。'
      },
      {
        type: 'new',
        title: '友達招待機能の追加',
        description: 'タイムライン画面に招待機能を追加。トクドクサービスへの招待メッセージをコピーして、SNSを通じて友達を招待できるようになりました。'
      },
      {
        type: 'improvement',
        title: '投稿データベース構造の拡張',
        description: 'postsテーブルにuser_latitude、user_longitude、user_location_geomカラムを追加。投稿者の端末位置情報を適切に管理できるよう改善しました。'
      },
      {
        type: 'improvement',
        title: 'コメント機能の強化',
        description: 'コメントボタンを「コメントする」テキスト表示に変更し、機能をより明確に。コメント投稿時の視覚的フィードバックも向上させました。'
      },
      {
        type: 'improvement',
        title: '価格表示の改善',
        description: '価格表示を「¥500」から「500円〜」形式に変更。より親しみやすく、日本のユーザーに適した表示に改善しました。'
      },
      {
        type: 'improvement',
        title: '場所情報の操作性向上',
        description: '場所名が20文字を超える場合のテキストサイズ自動調整機能と、場所名のコピー機能を追加。長い店舗名でも見やすく、共有しやすくなりました。'
      },
      {
        type: 'breaking',
        title: '掲示板機能の廃止',
        description: '利用頻度とユーザーフィードバックを考慮し、掲示板機能を完全に廃止しました。関連するページ、API、データベーステーブルをすべて削除し、アプリの焦点を地域密着型SNSに集中させました。'
      },
      {
        type: 'improvement',
        title: 'ナビゲーションの最適化',
        description: 'メインナビゲーションから掲示板を削除し、「タイムライン」「買い物メモ」「お店を探す」「マイページ」の4つの核となる機能に集約。より直感的なナビゲーションを実現しました。'
      },
      {
        type: 'improvement',
        title: 'UI/UXの統一性向上',
        description: 'テキストカラーを#73370cに統一し、ブランドカラーの一貫性を向上。フレーマーモーションを活用したアニメーションで、より洗練されたユーザー体験を提供します。'
      }
    ]
  },
  {
    version: '1.0.7',
    date: '2025-07-14',
    type: 'minor',
    title: 'データ利活用機能の追加とプロフィール機能の強化',
    description: 'より良いサービス提供のため、ユーザー属性データの収集機能を追加しました。収集したデータは個人を特定しない統計データとして、地域の店舗様への情報提供や機能改善に活用させていただきます。',
    isLatest: false,
    changes: [
      {
        type: 'new',
        title: 'データ利活用機能',
        description: '年齢層、性別、居住地域、家族構成、職業・収入、買い物行動などの属性データを収集する機能を追加しました。データは個人を特定しない統計データとして活用されます。'
      },
      {
        type: 'new',
        title: 'プロフィール完成度表示',
        description: 'プロフィール設定画面と編集画面に完成度を表示する機能を追加しました。入力状況を視覚的に確認できます。'
      },
      {
        type: 'new',
        title: 'データ利用同意機能',
        description: 'データ利活用に関する同意機能を追加しました。プロフィールの作成・更新時にデータ利用への同意が必要になります。'
      },
      {
        type: 'improvement',
        title: 'プロフィール画面の改善',
        description: 'プロフィール設定画面と編集画面のUIを改善し、カード形式でより見やすく整理しました。'
      },
      {
        type: 'improvement',
        title: 'データベース構造の最適化',
        description: 'データ利活用項目に対応するためのデータベース構造を最適化し、効率的なデータ管理を実現しました。'
      },
      {
        type: 'security',
        title: 'プライバシー保護の強化',
        description: 'データ利活用に関するプライバシーポリシーを更新し、個人情報保護を強化しました。'
      }
    ]
  },
  {
    version: '1.0.6',
    date: '2025-07-13',
    type: 'minor',
    title: '家族グループ機能の追加',
    description: '家族や友人とTODOリストを共有できる「家族グループ機能」を追加しました！買い物メモはもちろん、家事の分担や作業リストをグループで管理できるようになりました。',
    isLatest: false,
    changes: [
      {
        type: 'new',
        title: '家族グループ作成・管理機能',
        description: '家族や友人とのグループを作成し、メンバーを招待できるようになりました。オーナーはグループを削除でき、メンバーは自由に退出できます。'
      },
      {
        type: 'new',
        title: '共有リスト機能',
        description: 'グループメンバー間でTODOリストを共有できるようになりました。買い物メモ、家事の分担、作業リストなど様々な用途で活用できます。'
      },
      {
        type: 'new',
        title: 'リアルタイム同期',
        description: 'グループ内のリスト変更はリアルタイムで同期され、誰が追加・完了したかも表示されます。オフライン時でもローカルで操作でき、オンライン復帰時に自動同期されます。'
      },
      {
        type: 'new',
        title: '招待機能',
        description: 'メールやSNSを通じてグループメンバーを招待できます。招待リンクの生成やメッセージの共有が簡単に行えます。'
      },
      {
        type: 'new',
        title: 'メモ機能の強化',
        description: '共有リストのアイテムにメモを追加できるようになりました。詳細な情報や補足事項を記録して、より効率的な共有が可能です。'
      },
      {
        type: 'improvement',
        title: 'ナビゲーションの改善',
        description: '買い物メモページからグループ管理画面へ直接アクセスできるボタンを追加しました。グループ機能の利用がより便利になりました。'
      }
    ]
  },
  {
    version: '1.0.5',
    date: '2025-07-09',
    type: 'minor',
    title: '称号＆ランキングシステムの導入',
    description: 'ユーザー同士で「いいね」の数を競い合う「称号＆ランキング」システムを導入しました！月間ランキングで上位を目指し、特別な称号を手に入れましょう。',
    isLatest: false,
    changes: [
      {
        type: 'new',
        title: 'ランキング機能',
        description: '投稿への「いいね」数に基づいた月間ランキングを追加しました。毎月1日〜25日の期間で集計され、上位入賞者には特別な称号が与えられます。'
      },
      {
        type: 'new',
        title: 'ランキングページ',
        description: '上位4名を特別なカードで表示し、5位以降はスクロールで確認できる専用ページを追加しました。お品書きでルールの確認もできます。'
      },
      {
          type: 'new',
          title: '匿名ユーザーのいいね集計',
          description: 'ログインしていないユーザーからの「いいね」もランキングに反映されるようになりました。より多くの応援がランキングを動かします。'
      },
      {
        type: 'improvement',
        title: 'マイページのUI改善',
        description: 'マイページに「ランキングを確認」ボタンを設置し、ランキングページへ直接アクセスできるようになりました。'
      },
      {
        type: 'improvement',
        title: 'データベースの最適化',
        description: 'ランキング集計を高速かつ効率的に行うためのデータベース関数やトリガーを導入し、パフォーマンスを向上させました。'
      }
    ]
  },
  {
    version: '1.0.4',
    date: '2025-07-08',
    type: 'minor',
    title: '買い物メモ機能の追加とナビゲーション改善',
    description: '新機能「買い物メモ」を追加しました！オフラインでも使える便利な買い物リスト機能と、ログイン時の「よく買うもの」同期機能で、より快適なお買い物をサポートします。',
    isLatest: false,
    changes: [
      {
        type: 'new',
        title: '買い物メモ機能',
        description: 'オフラインでも使える買い物リスト機能を追加しました。アイテムの追加・削除・チェック機能で、お買い物をスムーズに管理できます。'
      },
      {
        type: 'new',
        title: '「よく買うもの」同期機能',
        description: 'ログイン時に「よく買うもの」リストを端末間で同期できるようになりました。よく購入するアイテムをワンタップで買い物リストに追加できます。'
      },
      {
        type: 'new',
        title: '割引表・掲示板への便利なアクセス',
        description: '買い物メモ画面から割引表アプリや掲示板へ簡単にアクセスできるボタンを追加しました。お買い物の際により便利にご利用いただけます。'
      },
      {
        type: 'improvement',
        title: 'ナビゲーションの改善',
        description: 'メインナビゲーションから掲示板を削除し、買い物メモを追加しました。より直感的で使いやすいナビゲーションになりました。'
      },
      {
        type: 'improvement',
        title: 'オフライン対応',
        description: '買い物メモ機能はオフライン環境でも利用可能です。ネットワーク接続がない場所でも安心してお買い物リストを管理できます。'
      },
      {
        type: 'improvement',
        title: '使い方ガイドの追加',
        description: '買い物メモ機能の使い方を分かりやすく説明するガイドを追加しました。初回利用時に表示され、機能を素早く理解できます。'
      }
    ]
  },
  {
    version: '1.0.3',
    date: '2025-06-24',
    type: 'minor',
    title: '掲示板機能の追加',
    description: '新機能「掲示板」を追加しました！みんなで今日買うものを共有し、人気商品ランキングをチェックできる新しいコミュニティ機能です。',
    isLatest: false,
    changes: [
      {
        type: 'new',
        title: '掲示板機能',
        description: '「今日買うもの」を投稿・共有できる掲示板機能を追加しました。他のユーザーが何を買う予定なのかを確認できます。'
      },
      {
        type: 'new',
        title: '人気商品ランキング',
        description: 'みんなが投稿した商品の中から人気の商品をランキング形式で表示します。トレンドをチェックしてお買い物の参考にしてください。'
      },
      {
        type: 'new',
        title: 'リアルタイム更新',
        description: '掲示板の投稿内容はリアルタイムで更新され、最新の情報をいつでも確認できます。'
      },
      {
        type: 'improvement',
        title: 'ナビゲーションの改善',
        description: 'メインナビゲーションに掲示板へのアクセスを追加し、より使いやすくなりました。'
      }
    ]
  },
  {
    version: '1.0.2',
    date: '2025-06-21',
    type: 'minor',
    title: 'LINE通知機能の追加',
    description: 'トクドクのLINE公式アカウントとの連携機能を追加しました。お気に入り店舗の新着情報をLINEでも受け取れるようになり、より便利にお得情報をキャッチできます。',
    isLatest: false,
    changes: [
      {
        type: 'new',
        title: 'LINE公式アカウント連携機能',
        description: 'トクドクのLINE公式アカウント（@208uubra）を友達追加することで、アプリとLINEアカウントを連携できるようになりました。'
      },
      {
        type: 'new',
        title: 'LINE通知機能',
        description: 'お気に入り店舗に新しい投稿があった際に、アプリ内通知に加えてLINEでも通知を受け取ることができるようになりました。アプリを開いていなくても重要な情報を見逃しません。'
      },
      {
        type: 'improvement',
        title: 'プロフィール画面の改善',
        description: 'プロフィール画面にLINE連携の設定項目を追加し、接続状況の確認や設定変更が簡単に行えるようになりました。'
      }
    ]
  },
  {
    version: '1.0.1',
    date: '2025-06-18',
    type: 'minor',
    title: 'アプリの品質向上のためのアップデート',
    description: 'いつもトクドクをご利用いただきありがとうございます。皆様により快適なアプリ体験を提供するため、サービスの安定性向上に関するアップデートを行いました。',
    isLatest: false,
    changes: [
      {
        type: 'improvement',
        title: 'パフォーマンス分析ツールの導入',
        description: 'アプリの表示速度や動作を分析するための「Vercel Speed Insights」を導入しました。これは、今後のアップデートでアプリをさらに使いやすく、高速にするためのものです。'
      },
      {
        type: 'improvement',
        title: 'アクセス解析機能の追加',
        description: 'サービスの利用状況を把握し、より良い機能開発に役立てるため、Vercelのアクセス解析機能を導入しました。この解析は匿名で行われ、皆様の個人情報を特定するものではありませんのでご安心ください。'
      }
    ]
  },
  {
    version: '1.0.0',
    date: '2025-06-16',
    type: 'major',
    title: 'トクドク β版 正式リリース！',
    description: 'みんなでお得な情報を共有できるアプリ「トクドク」のβ版がついに正式リリースされました！',
    isLatest: false,
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
  const { showFeedbackModalForced } = useFeedback();

  const handleFeedbackClick = () => {
    showFeedbackModalForced();
  };

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
            <p className="text-base text-gray-600 text-center mt-1">
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
            <p className="text-lg font-bold text-blue-900">v1.0.7</p>
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
              onClick={handleFeedbackClick}
              className="text-base"
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
