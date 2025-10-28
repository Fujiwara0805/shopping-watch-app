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
import AppLayout from '@/app/layout';
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
    version: '1.3.0',
    date: '2025-10-20',
    type: 'minor',
    title: 'タイムライン検索とマップ表示の強化、イベント情報対応',
    description: '検索と地図まわりの使い勝手を大幅に改善し、イベント情報の入力・表示に対応しました。投稿カードの表示最適化やご近所モードの高速化など、日常利用時の体感を重視したアップデートです。',
    isLatest: true,
    changes: [
      { type: 'new', title: '「続きを読む」で投稿内容を展開', description: '投稿カードに長文時の展開機能を追加し、可読性と操作性を向上しました。' },
      { type: 'new', title: 'イベント情報フィールドの追加', description: 'イベント名・開催開始/終了日・料金を投稿に付与できるようにし、カード側でも表示するようにしました。' },
      { type: 'new', title: 'イベント入力のバリデーションと自動計算', description: '日付の整合性チェックや、イベント期間に基づく掲載期間の自動計算を実装しました。' },
      { type: 'new', title: 'リアルタイム検索とURLパラメータ対応', description: 'デバウンスを廃止し、検索ボタン/Enterキーに対応。URLクエリからの検索も可能にしました。' },
      { type: 'new', title: '地域フィルター（都道府県・市町村）', description: '投稿ページにエリア入力、タイムラインにフィルター機能を追加し、地域で絞り込みやすくしました。' },
      { type: 'new', title: 'マップのクラスターとラベル', description: 'クラスター用アイコン/ラベル機能を追加し、視認性を向上。地図タイプは明示的にROADMAPを使用します。' },
      { type: 'new', title: '空席/在庫アイコンと残数ラベル', description: 'カテゴリに応じたピンアイコンを作成し、残数をラベル表示して状況を直感的に把握できるようにしました。' },

      { type: 'improvement', title: 'ご近所モードの高速化', description: '距離フィルタとページング処理を見直し、初回取得のキャッシュ化とモード切替時のクリアで体感速度を改善しました。' },
      { type: 'improvement', title: '無限スクロールの改善', description: 'Intersection Observer による読み込み最適化とローディングUIの改善で操作感を向上しました。' },
      { type: 'improvement', title: 'ファイルリンク表示の見直し', description: '投稿カードのファイルリンクをアイコン表示から画像表示に変更し、操作を直感的にしました。' },
      { type: 'improvement', title: '画像読み込み/最適化の強化', description: '常時読み込み＋WebP最適化により表示速度と画質を両立しました。' },
      { type: 'improvement', title: 'イベント名表記の統一', description: 'カード上の表記を「イベント」に統一し、UIの一貫性を高めました。' },
      { type: 'improvement', title: '在庫アイコンの視認性向上', description: '在庫ピンの幅を拡大し、地図上で識別しやすくしました。' },
      { type: 'improvement', title: '検索クエリ連携の強化', description: 'ハイライト投稿IDから店舗名を自動抽出し検索に反映。マップ→タイムライン遷移でもクエリを引き継ぎます。' },
      { type: 'improvement', title: '検索状態と取得処理の整理', description: '状態管理/取得ロジックを簡素化し、ソートと特別検索モードを削除しました。' },
      { type: 'improvement', title: '都道府県フィルターの明示', description: '対象エリアのコメント/説明を明確化して可読性を向上しました。' },
      { type: 'improvement', title: '投稿カードの折りたたみ最適化', description: '折りたたみ時の表示文字数を100→50文字に変更し、一覧性を高めました。' },
      { type: 'improvement', title: '投稿の最大文字数拡張', description: '最大文字数を240→400に拡張し、文字数カウンターを追加しました。' },

      { type: 'fix', title: '不要ログ/デバッグ出力の整理', description: 'マップの説明モーダル削除やconsole整理など、メンテナンス性を向上しました。' }
    ]
  },
  {
    version: '1.2.2',
    date: '2025-10-01',
    type: 'minor',
    title: '店舗位置情報の自動取得とカテゴリシステムの大幅改善',
    description: 'Google Places APIを活用した店舗位置情報の自動取得機能を追加し、投稿時の利便性を大幅に向上させました。また、カテゴリシステムを「空席情報」「在庫情報」「イベント情報」の3つに再編成し、より直感的で使いやすい分類システムを実現しました。',
    isLatest: false,
    changes: [
      {
        type: 'new',
        title: 'Google Places API連携による位置情報自動取得',
        description: '店舗選択時にGoogle Places JavaScript APIを使用して自動的に位置情報を取得する機能を実装。ユーザーが手動で位置情報を入力する手間を大幅に削減し、より正確な位置情報を提供します。'
      },
      {
        type: 'new',
        title: '企業設定の状態管理システム',
        description: 'ユーザーの役割（role）に応じた企業情報の自動入力機能を実装。ビジネスユーザー向けの設定を強化し、企業情報の管理を効率化しました。'
      },
      {
        type: 'new',
        title: '投稿カードURL表示機能',
        description: '投稿カードにURL情報を表示する機能を追加。投稿者が設定したリンク情報をユーザーが直接確認できるようになり、より詳細な情報提供が可能になりました。'
      },
      {
        type: 'improvement',
        title: 'カテゴリシステムの大幅再編成',
        description: '従来の「飲食店」「小売店」「イベント集客」から「空席情報」「在庫情報」「イベント情報」の3つのカテゴリに再編成。より明確で直感的な分類により、ユーザーが求める情報を見つけやすくなりました。'
      },
      {
        type: 'improvement',
        title: '「おとく板」から「掲示板」への名称統一',
        description: '「おとく板」を「掲示板」に名称変更し、関連する説明文やUI要素を更新。ユーザーにとっての理解を深め、地域密着型コミュニティアプリの一貫性を向上させました。'
      },
      {
        type: 'improvement',
        title: 'プロフィール編集ページの企業設定強化',
        description: 'プロフィール編集ページに企業設定フィールドを追加し、ビジネスユーザー向けの設定を強化。ユーザーの役割に応じた適切な情報管理が可能になりました。'
      },
      {
        type: 'improvement',
        title: '店舗検索機能の向上',
        description: 'Google Places APIとの連携により、店舗検索の精度と速度を向上。より正確な店舗情報の取得と表示が可能になりました。'
      },
      {
        type: 'improvement',
        title: 'UI/UXの一貫性向上',
        description: 'カテゴリシステムの変更に伴い、関連するUI要素や説明文を日本語で適切に修正。シンプルでクールなデザインを維持しながら、ユーザビリティを向上させました。'
      }
    ]
  },
  {
    version: '1.2.1',
    date: '2025-09-28',
    type: 'patch',
    title: 'ビジネス認証システムの導入と投稿機能の改善',
    description: 'トクドクが認証した企業の投稿に「認証済み」バッジを表示する機能を追加しました。また、投稿画面の画像表示機能を強化し、より使いやすい投稿体験を提供します。',
    isLatest: false,
    changes: [
      {
        type: 'new',
        title: 'ビジネス認証バッジシステム',
        description: 'app_usersテーブルのroleが「business」のユーザーの投稿に「認証済み」バッジを表示する機能を実装。星アイコンと青色のデザインで、トクドクが認証した企業であることを明確に示します。'
      },
      {
        type: 'new',
        title: 'データベースrole制約の追加',
        description: 'app_usersテーブルのroleカラムに「user」「admin」「business」の3つの値のみを許可するCHECK制約を追加し、データの整合性を向上させました。'
      },
      {
        type: 'improvement',
        title: '投稿画面の画像機能強化',
        description: '投稿画面で画像を詳細情報セクションに移動し、「掲示板では4:5比率で表示」の旨を明記。カテゴリを必須項目として上部に配置し、より直感的な投稿フローを実現しました。'
      },
      {
        type: 'improvement',
        title: '画像モーダル表示機能',
        description: '掲示板で画像をクリックすると元サイズで表示するモーダル機能を追加。複数画像の場合はナビゲーション機能付きで、より詳細な画像確認が可能になりました。'
      },
      {
        type: 'improvement',
        title: '詳細情報フィールドの配置最適化',
        description: '投稿画面の詳細情報を「場所→残数→リンク→画像→来客状況→評価→クーポン→電話番号→ファイル→おすそわけ」の順に再配置し、より論理的で使いやすい順序に改善しました。'
      },
      {
        type: 'improvement',
        title: '認証バッジの視認性向上',
        description: '認証済みバッジのフォントサイズを小（text-xs）から中（text-sm）に変更し、ユーザーが企業の認証状況をより明確に識別できるよう改善しました。'
      },
      {
        type: 'improvement',
        title: 'データベース型定義の強化',
        description: 'AuthorProfileインターフェースにroleフィールドを追加し、投稿者の役割情報を適切に管理できるよう型安全性を向上させました。'
      }
    ]
  },
  {
    version: '1.2.0',
    date: '2025-09-27',
    type: 'minor',
    title: 'UI/UX改善とマップ機能の大幅強化',
    description: 'ユーザビリティを重視したUI改善を実施し、地図機能を大幅に強化しました。投稿カードの操作性向上、地図表示の改善、カテゴリ選択の最適化など、より直感的で使いやすいアプリを実現しました。',
    isLatest: false,
    changes: [
      {
        type: 'new',
        title: '地図表示機能の大幅強化',
        description: '投稿データを地図上にマーカー表示する機能を実装。カテゴリに応じた色分けと手紙アイコンにより、視覚的に分かりやすい地図体験を提供します。'
      },
      {
        type: 'new',
        title: '地図の見方モーダル',
        description: '地図表示コンポーネントに「地図の見方」モーダルを追加。カテゴリー情報を色分けして表示し、初回利用者でも直感的に地図を理解できるようになりました。'
      },
      {
        type: 'new',
        title: '店舗名連携機能',
        description: 'ユーザーが店舗名をクリックすると自動的に地図ページに遷移し、該当店舗の位置を表示する機能を実装。シームレスな店舗検索体験を提供します。'
      },
      {
        type: 'new',
        title: 'モバイル版フィルターモーダル',
        description: 'タイムラインページにモバイル専用のフィルターモーダルを追加。検索条件や表示順をタップで簡単に設定できるようになりました。'
      },
      {
        type: 'new',
        title: '招待モーダル機能',
        description: 'タイムラインページに友達招待用のモーダルを追加。アプリの紹介とシェアがより簡単に行えるようになりました。'
      },
      {
        type: 'new',
        title: 'コメント機能の実装',
        description: '投稿に対するコメント表示・管理機能を追加。コメントモーダルでユーザー同士のコミュニケーションが活発になります。'
      },
      {
        type: 'new',
        title: 'カテゴリ選択UI改善',
        description: '投稿ページにアニメーション付きのカテゴリ選択フィールドを追加。より直感的で視覚的に魅力的な選択体験を提供します。'
      },
      {
        type: 'improvement',
        title: '投稿カードUI最適化',
        description: '投稿カードからクーポン関連機能を削除し、UIのシンプルさを向上。条件に応じたバッジ表示を最適化し、より見やすいデザインを実現しました。'
      },
      {
        type: 'improvement',
        title: '投稿ページの表記統一',
        description: 'ボタンラベルを「場所」と「カテゴリ」に統一し、関連アイコンも更新。ユーザーが理解しやすい明確な表記に改善しました。'
      },
      {
        type: 'improvement',
        title: 'プロフィール設定の改善',
        description: 'プロフィール編集・セットアップページに任意項目のトグル機能を追加。Framer Motionによる滑らかなアニメーションで操作感を向上させました。'
      },
      {
        type: 'improvement',
        title: 'オンボーディング体験の最適化',
        description: 'オンボーディング表示ロジックを改善し、初回ユーザーと既存ユーザーに適した体験を提供。永続スキップ機能も強化しました。'
      },
      {
        type: 'improvement',
        title: '残数入力の簡素化',
        description: '投稿ページの残数入力フィールドのプレースホルダーを「残数」にシンプル化。より直感的な入力体験を実現しました。'
      },
      {
        type: 'improvement',
        title: '位置情報取得の改善',
        description: '保存された位置情報を自動的に使用する機能を追加。ユーザーの利便性を向上させ、投稿作成をより効率的にしました。'
      },
      {
        type: 'improvement',
        title: 'コピー機能の使いやすさ向上',
        description: '投稿カードの店舗名コピーボタンに日本語タイトルを追加し、操作がより分かりやすくなりました。'
      },
      {
        type: 'fix',
        title: 'カテゴリ表示の修正',
        description: 'タイムラインのカテゴリカラーリングを修正し、6つのカテゴリが正しく色分け表示されるよう改善しました。'
      },
      {
        type: 'fix',
        title: 'モーダル表示の最適化',
        description: 'コメントモーダルの投稿内容表示を調整し、必要な情報のみを表示するよう最適化しました。'
      }
    ]
  },
  {
    version: '1.1.0',
    date: '2025-09-16',
    type: 'major',
    title: '投稿システムの大幅刷新 - カテゴリ統合とクーポン機能の実装',
    description: 'トクドクの投稿システムを大幅に改善しました。カテゴリとジャンルを統合し、より直感的な分類システムを実現。さらに、クーポン配布機能や来客状況の表示など、店舗と利用者をつなぐ新機能を多数追加しました。',
    isLatest: false, // 🔥 変更: false に設定
    changes: [
      {
        type: 'new',
        title: 'カテゴリシステムの統合',
        description: 'ジャンルとカテゴリを統合し、「空席情報」「在庫情報」「イベント情報」「助け合い」「口コミ」の5つのカテゴリに再編。より分かりやすい投稿分類を実現しました。'
      },
      {
        type: 'new',
        title: '掲載期間の分単位設定',
        description: '従来の時間単位から分単位に変更し、15分、30分、45分、60分の選択肢を追加。カスタム設定では最大12時間まで1分単位で設定可能になりました。'
      },
      {
        type: 'new',
        title: 'クーポン配布機能',
        description: '投稿時にクーポン番号を設定でき、空席情報カテゴリで条件を満たした投稿には「クーポン配布中」バッジが表示されます。クーポンモーダルから画像として保存も可能です。'
      },
      {
        type: 'new',
        title: '残り枠数表示機能',
        description: '投稿に残り枠数を設定可能。空席情報では「席」、在庫情報では「個」の単位で表示され、「残りわずか」のテキストで緊急性を演出します。'
      },
      {
        type: 'new',
        title: '来客状況表示機能',
        description: '空席情報の投稿で現在の来客状況（男女別人数）を表示可能。男性は青、女性はピンクのアイコンで視覚的に分かりやすく表示されます。'
      },
      {
        type: 'new',
        title: 'PC版ランディングページのQR対応',
        description: 'PC版でのボタンクリック時にQRコードモーダルを表示し、スマートフォンでのアクセスを促進する仕組みを実装しました。'
      },
      {
        type: 'improvement',
        title: '「いいね」ボタンの変更',
        description: 'ハートアイコンを足跡アイコンに変更し、テキストを「行くよ」に変更。より親しみやすい表現になりました。'
      },
      {
        type: 'improvement',
        title: '投稿時間表示の改善',
        description: '「○時間前」の表示を「17時30分投稿」のような具体的な時刻表示に変更し、より正確な情報を提供するようになりました。'
      },
      {
        type: 'improvement',
        title: '詳細情報の表示改善',
        description: '詳細情報をデフォルトで展開表示に変更。「店舗情報」グループを削除し、各項目を独立したボタン形式で配置しました。'
      },
      {
        type: 'improvement',
        title: 'オンボーディング画面の改善',
        description: '「スキップ」ボタンを「次回以降表示しない」に変更し、永続的にスキップできる機能を追加しました。'
      },
      {
        type: 'improvement',
        title: 'タイムライン画面の統一',
        description: 'PC版とモバイル版のレイアウトを統一し、シンプルで一貫したユーザー体験を提供するようになりました。'
      },
      {
        type: 'improvement',
        title: 'カスタム時間設定モーダル',
        description: 'カスタム掲載時間の設定を専用モーダルで行えるようになり、時間と分を直感的に選択できるUIを実装しました。'
      },
      {
        type: 'improvement',
        title: 'データベース構造の最適化',
        description: 'postsテーブルに新しいフィールド（remaining_slots、coupon_code、customer_situation、custom_expiry_minutes）を追加し、新機能に対応しました。'
      },
      {
        type: 'fix',
        title: '投稿期間オプションの修正',
        description: '既存の投稿期間データを新しい分単位システムに適応させるためのデータ移行処理を実装し、エラーを解消しました。'
      },
      {
        type: 'fix',
        title: 'カテゴリ制約エラーの解消',
        description: '新しいカテゴリシステムに対応するため、データベース制約を更新し、既存データとの互換性問題を解決しました。'
      },
      {
        type: 'breaking',
        title: 'ジャンル機能の廃止',
        description: 'ジャンルとカテゴリの統合により、従来のジャンル機能を廃止しました。既存の投稿は新しいカテゴリシステムに自動移行されます。'
      }
    ]
  },
  {
    version: '1.0.9',
    date: '2025-08-03',
    type: 'major',
    title: 'おすそわけ機能の実装 - 投稿者を直接応援できる新システム',
    description: 'トクドクに待望の「おすそわけ機能」が登場しました！おとくな情報を投稿してくれる方におすそわけ（支援購入）できる画期的な機能です。Stripe決済システムを導入し、安全で便利なおすそわけの仕組みを実現しました。',
    isLatest: false, // 🔥 変更: false に設定
    changes: [
      {
        type: 'new',
        title: 'おすそわけシステムの実装',
        description: '投稿に「おすそわけ」ボタンを追加し、投稿者におすそわけできるようになりました。Stripe決済システムにより、安全で確実な決済処理を実現しています。'
      },
      {
        type: 'new',
        title: 'Stripe Connect統合',
        description: 'Stripe Connectを活用したマーケットプレイス型決済システムを構築。投稿者は個別のStripeアカウントを作成し、おすそわけの収益を直接受け取ることができます。'
      },
      {
        type: 'new',
        title: 'Stripeアカウント管理機能',
        description: 'プロフィール画面にStripeアカウントの設定・管理機能を追加。アカウント作成、本人確認、残高確認、支払い履歴の閲覧が可能です。タブ形式の直感的なUIで操作できます。'
      },
      {
        type: 'new',
        title: 'おすそわけ設定機能',
        description: '投稿作成時におすそわけ機能のON/OFF設定と金額選択機能を追加。投稿者は自分の投稿におすそわけボタンを表示するかどうかを選択できます。'
      },
      {
        type: 'new',
        title: 'リアルタイム決済処理',
        description: 'Stripe Checkoutを使用したセキュアな決済画面への遷移機能を実装。決済完了後はWebhookによるリアルタイム処理で、おすそわけ履歴を自動記録します。'
      },
      {
        type: 'new',
        title: '手数料システムの導入',
        description: 'プラットフォーム手数料5%を設定(+stripe決済手数料3.6%)。業界最安水準の手数料率で、投稿者により多くの収益を還元します。手数料は決済時に自動計算・徴収されます。'
      },
      {
        type: 'new',
        title: 'おすそわけ履歴管理',
        description: 'おすそわけの取引履歴を詳細に記録・管理する機能を実装。購入者、投稿者、金額、手数料、決済IDなどの情報を安全に保存します。'
      },
      {
        type: 'new',
        title: 'ローディングアニメーション強化',
        description: '投稿ボタンやタイムライン画面の投稿ボタンに、Framer Motionを活用したスムーズなローディングアニメーションを追加。ユーザー体験を大幅に向上させました。'
      },
      {
        type: 'improvement',
        title: '投稿カードUIの拡張',
        description: 'おすそわけ機能に対応するため、投稿カードにおすそわけボタンとローディング状態表示を追加。エラーハンドリングも強化し、より安定した操作が可能になりました。'
      },
      {
        type: 'improvement',
        title: 'セキュリティ強化',
        description: 'Stripe Connectの厳格なセキュリティ基準に準拠し、決済情報の暗号化、不正利用防止、マネーロンダリング対策を実装。ユーザーの資金と個人情報を最高レベルで保護します。'
      },
      {
        type: 'improvement',
        title: 'エラーハンドリングの改善',
        description: '決済エラー、アカウント設定エラー、ネットワークエラーなど、様々なエラーケースに対応した詳細なエラーメッセージとユーザーガイダンスを実装しました。'
      },
      {
        type: 'improvement',
        title: 'データベース構造の拡張',
        description: 'おすそわけ機能に対応するため、support_purchasesテーブルの新設、app_profilesテーブルへのStripe関連カラム追加、postsテーブルへのおすそわけ設定カラム追加を実施しました。'
      },
      {
        type: 'improvement',
        title: 'API体系の整備',
        description: 'Stripe関連の包括的なAPI群を新設。アカウント作成、情報更新、残高確認、決済処理、Webhook処理など、おすそわけ機能に必要なすべてのAPIを整備しました。'
      },
      {
        type: 'security',
        title: '決済セキュリティの実装',
        description: 'PCI DSS準拠のStripe決済システムを導入し、クレジットカード情報の安全な処理を実現。すべての決済データは暗号化され、トクドクのサーバーには保存されません。'
      },
      {
        type: 'new',
        title: 'カスタムモーダルの活用',
        description: 'Stripeアカウント削除確認などの重要な操作に、統一されたカスタムモーダルUIを導入。Framer Motionによる段階的アニメーションで、ユーザーに適切な注意喚起を行います。'
      }
    ]
  },
  {
    version: '1.0.8',
    date: '2025-07-15',
    type: 'minor',
    title: 'タイムライン機能の大幅改善と投稿機能の拡張',
    description: '地域密着型SNSとしての機能を強化するため、タイムライン機能を大幅に改善しました。また、投稿機能にジャンル分類と複数画像投稿機能を追加し、より詳細で魅力的な投稿が可能になりました。',
    isLatest: false,
    changes: [
      {
        type: 'new',
        title: 'ジャンル機能の追加',
        description: 'ショッピング、空席情報、観光、レジャー、サービス、その他の6つのジャンルを追加。投稿をより詳細に分類できるようになり、ユーザーが求める情報を見つけやすくなりました。'
      },
      {
        type: 'new',
        title: '複数画像投稿機能',
        description: '最大5枚の画像を同時に投稿できるようになりました。各画像5MB以下、JPG・PNG・WEBP形式に対応。商品の詳細や店舗の様子をより多角的に伝えることができます。'
      },
      {
        type: 'new',
        title: '複数画像カルーセル表示',
        description: '投稿カードで複数画像をスライド表示できるカルーセル機能を実装。画像インジケーターと前後ボタンで直感的な操作が可能です。'
      },
      {
        type: 'new',
        title: 'ジャンル・カテゴリー別フィルター検索',
        description: 'タイムライン画面でジャンルとカテゴリーの両方でフィルタリング可能に。ジャンル選択時には対応するカテゴリーのみが表示され、より効率的な検索ができます。'
      },
      {
        type: 'improvement',
        title: '投稿必須項目の最適化',
        description: '投稿時の必須項目を「内容」と「掲載期間」のみに変更。店舗名、ジャンル、カテゴリー、価格は任意項目とし、より気軽に投稿できるようになりました。'
      },
      {
        type: 'improvement',
        title: '投稿カードの基本情報デザイン刷新',
        description: '基本情報にジャンル行を追加し、場所・ジャンル・カテゴリーの順で表示。ジャンル専用アイコン（ショッピング：カート、空席情報：食器、観光：カメラなど）を採用し、視覚的に分かりやすくなりました。'
      },
      {
        type: 'improvement',
        title: 'カテゴリー分類の大幅拡張',
        description: 'ジャンルに応じたカテゴリー分類を実装。ショッピング系11種類、空席情報系8種類、観光系6種類、レジャー系5種類、サービス系5種類の詳細なカテゴリーで、より正確な情報分類が可能になりました。'
      },
      {
        type: 'improvement',
        title: '1km圏内投稿表示の最適化',
        description: '投稿者の端末位置情報を基準とした1km圏内の投稿表示機能を実装。常に地域密着型の情報を提供し、より関連性の高いお得情報を表示できるようになりました。'
      },
      {
        type: 'improvement',
        title: '投稿カードデザインの全面刷新',
        description: '投稿者情報と基本情報を分離し、7行2列の表形式で情報を整理。場所、ジャンル、カテゴリ、価格、視聴回数、残り時間、距離（開発環境）をアイコンと共に見やすく表示するよう改善しました。'
      },
      {
        type: 'improvement',
        title: 'アクションボタンの視認性向上',
        description: 'いいね、コメント、共有ボタンにそれぞれ専用の背景色（#fcebeb、#eff4ff、#eefdf6）と枠線を追加。ボタンとしての認識性を大幅に向上させました。'
      },
      {
        type: 'improvement',
        title: '検索機能の改善',
        description: 'テキスト入力中の検索実行を防ぐため、デバウンス時間を800msに延長。ジャンルも検索対象に追加し、より精度の高い検索が可能になりました。'
      },
      {
        type: 'new',
        title: '友達招待機能の追加',
        description: 'タイムライン画面に招待機能を追加。トクドクサービスへの招待メッセージをコピーして、SNSを通じて友達を招待できるようになりました。'
      },
      {
        type: 'improvement',
        title: '投稿データベース構造の拡張',
        description: 'postsテーブルにuser_latitude、user_longitude、user_location_geom、genre、image_urlsカラムを追加。投稿者の端末位置情報と複数画像、ジャンル情報を適切に管理できるよう改善しました。'
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
        description: 'メインナビゲーションから掲示板を削除し、「タイムライン」「買い物メモ」「おとく地図」「マイページ」の4つの核となる機能に集約。より直感的なナビゲーションを実現しました。'
      },
      {
        type: 'improvement',
        title: 'UI/UXの統一性向上',
        description: 'テキストカラーを#73370cに統一し、ブランドカラーの一貫性を向上。フレーマーモーションを活用したアニメーションで、より洗練されたユーザー体験を提供します。'
      },
      {
        type: 'fix',
        title: '投稿時のNOT NULL制約エラー解消',
        description: '店舗名やカテゴリーが未入力の場合に発生していたデータベースエラーを修正。適切なデフォルト値を設定し、任意項目として正常に動作するよう改善しました。'
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
          description: 'ログインしていないユーザーからの「いいね」もランキングに反映されるようになりました。より多くの支援がランキングを動かします。'
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
            <p className="text-lg font-bold text-blue-900">v1.3.0</p>
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
