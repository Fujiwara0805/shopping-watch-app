"use client";

import AppLayout from '@/app/layout';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function ServicePolicyPage() {
  const router = useRouter();

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="bg-white">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
              サービスポリシー
            </h1>
          </div>
     
          <div className="space-y-8 text-gray-800 leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                1. サービス概要
              </h2>
              <div className="space-y-3">
                <p className="text-base leading-7">
                  <span className="font-bold text-gray-900">トクドク</span>は、ユーザー同士でお得な商品情報をリアルタイムで共有するコミュニティプラットフォームです。近所のスーパーマーケットやドラッグストア等の特売情報、タイムセール情報を写真付きで投稿・共有し、お得な買い物をサポートします。
                </p>
                <p className="text-base leading-7">
                  また、グループ共有機能により、家族や友人間でのTODOリスト共有も可能です。
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                2. 提供機能
              </h2>
              <div className="space-y-4">
                <div className="pl-4 border-l-4 border-blue-200 bg-blue-50 py-3 px-4 rounded-r">
                  <h3 className="font-bold text-gray-900 mb-2">リアルタイム投稿機能</h3>
                  <p className="text-sm text-gray-700">店舗のお得情報を写真付きで投稿</p>
                </div>
                <div className="pl-4 border-l-4 border-green-200 bg-green-50 py-3 px-4 rounded-r">
                  <h3 className="font-bold text-gray-900 mb-2">位置情報連携</h3>
                  <p className="text-sm text-gray-700">現在地から近い店舗の情報を優先表示</p>
                </div>
                <div className="pl-4 border-l-4 border-yellow-200 bg-yellow-50 py-3 px-4 rounded-r">
                  <h3 className="font-bold text-gray-900 mb-2">LINE通知機能</h3>
                  <p className="text-sm text-gray-700">お気に入り店舗の新着情報をLINEで受信</p>
                </div>
                <div className="pl-4 border-l-4 border-red-200 bg-red-50 py-3 px-4 rounded-r">
                  <h3 className="font-bold text-gray-900 mb-2">検索・フィルター機能</h3>
                  <p className="text-sm text-gray-700">カテゴリ、店舗、期限等での絞り込み</p>
                </div>
                <div className="pl-4 border-l-4 border-indigo-200 bg-indigo-50 py-3 px-4 rounded-r">
                  <h3 className="font-bold text-gray-900 mb-2">買い物メモ機能</h3>
                  <p className="text-sm text-gray-700">チラシ閲覧時のメモ作成・管理</p>
                </div>
                <div className="pl-4 border-l-4 border-purple-200 bg-purple-50 py-3 px-4 rounded-r">
                  <h3 className="font-bold text-gray-900 mb-2">家族グループ機能</h3>
                  <p className="text-sm text-gray-700">家族や友人とのTODOリスト共有</p>
                </div>
                <div className="pl-4 border-l-4 border-pink-200 bg-pink-50 py-3 px-4 rounded-r">
                  <h3 className="font-bold text-gray-900 mb-2">PWA対応</h3>
                  <p className="text-sm text-gray-700">スマートフォンアプリとしてのサービスを利用できます</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                3. データ利活用について
              </h2>
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
                <h3 className="font-bold text-yellow-800 mb-2">データ利活用の目的</h3>
                <p className="text-sm text-gray-700 leading-6">
                  ユーザーの同意に基づいて収集した属性データを、個人を特定しない統計データとして活用し、
                  より良いサービス提供と地域経済の活性化に貢献します。
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">サービス改善への活用</h3>
                  <p className="text-sm text-gray-700 leading-6">
                    ユーザー層の分析により、より適切な機能開発と<br />
                    サービス向上を実現します。
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">店舗様への情報提供</h3>
                  <p className="text-sm text-gray-700 leading-6">
                    地域の店舗様に対して、匿名化された顧客層の統計情報を提供し、<br />
                    より良い商品・サービスの提供をサポートします。
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">地域経済への貢献</h3>
                  <p className="text-sm text-gray-700 leading-6">
                    地域の消費動向データを活用し、<br />
                    地域経済の活性化に貢献します。
                  </p>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mt-4">
                <h3 className="font-bold text-blue-800 mb-2">プライバシー保護の徹底</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 個人を特定できる情報は一切含まれません</li>
                  <li>• 統計データのみの活用となります</li>
                  <li>• データ利用への同意は完全に任意です</li>
                  <li>• 同意の撤回はいつでも可能です</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                4. 運営方針
              </h2>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">コミュニティファースト</h3>
                  <p className="text-sm text-gray-700 leading-6">
                    ユーザー同士の有益な情報共有を最優先に考え、<br />
                    コミュニティの価値向上に努めます。
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">プライバシー保護</h3>
                  <p className="text-sm text-gray-700 leading-6">
                    個人情報の適切な管理と最小限の収集により、<br />
                    安心してご利用いただける環境を提供します。
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">安全性の確保</h3>
                  <p className="text-sm text-gray-700 leading-6">
                    不適切な投稿の監視と迅速な対応により、<br />
                    安全なコミュニティ環境を維持します。
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">継続的改善</h3>
                  <p className="text-sm text-gray-700 leading-6">
                    ユーザーフィードバックに基づく機能向上により、<br />
                    より良いサービスを提供し続けます。
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">透明性の確保</h3>
                  <p className="text-sm text-gray-700 leading-6">
                    データ利活用について明確な説明を行い、<br />
                    ユーザーの理解と同意に基づいた運営を行います。
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                5. サービスの変更・停止
              </h2>
              <div className="space-y-3">
                <p className="text-base leading-7">
                  当社は、サービスの品質向上のため、予告なくサービス内容を変更する場合があります。
                </p>
                <p className="text-base leading-7">
                  また、システムメンテナンスや障害対応等により、一時的にサービスを停止する場合があります。
                </p>
                <p className="text-base leading-7">
                  データ利活用に関する重要な変更については、事前に通知いたします。
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                6. お問い合わせ
              </h2>
              <p className="text-base leading-7">
                本サービスポリシーに関するご質問やご意見がございましたら、<br />
                お問い合わせフォームよりご連絡ください。
              </p>
            </section>

            <div className="bg-gray-100 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-600">
                <span className="font-bold">制定日：</span>2025年6月14日<br />
                <span className="font-bold">最終更新日：</span>2025年7月14日
              </p>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 text-center">
            <Button
              variant="outline"
              onClick={() => router.push('/terms')}
              className="flex items-center space-x-2 mx-auto"
            >
              <span>戻る</span>
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}