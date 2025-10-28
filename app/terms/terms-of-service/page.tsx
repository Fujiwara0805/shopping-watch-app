"use client";

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function TermsOfServicePage() {
  const router = useRouter();

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="bg-white">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
              利用規約
            </h1>
          </div>
          
          <div className="space-y-8 text-gray-800 leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                第1条（適用）
              </h2>
              <div className="space-y-3 pl-4">
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <p className="text-base leading-7">
                    本規約は、<span className="font-bold">トクドク開発チーム</span>（以下「当社」）が提供するサービス「<span className="font-bold">トクドク</span>」（以下「本サービス」）の利用条件を定めるものです。
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <p className="text-base leading-7">
                    本規約は、本サービスを利用するすべてのユーザーに適用されます。
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <p className="text-base leading-7">
                    本サービスの利用により、ユーザーは本規約に同意したものとみなします。
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                第2条（利用登録）
              </h2>
              <div className="space-y-3 pl-4">
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <p className="text-base leading-7">
                    本サービスの利用登録は、<span className="font-bold">メールアドレスとパスワード</span>、<span className="font-bold">Googleアカウント</span>による認証で行うことができます。
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <p className="text-base leading-7">
                    登録時に提供された情報は正確かつ最新のものである必要があります。
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <p className="text-base leading-7">
                    登録情報に変更があった場合は、速やかに更新してください。
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-yellow-200">
                第3条（データ利活用について）
              </h2>
              <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                <p className="text-base leading-7 font-medium text-yellow-800">
                  本サービスでは、サービス向上と地域経済活性化のため、ユーザーの同意に基づいてデータ利活用を行います。
                </p>
              </div>
              <div className="space-y-3 pl-4">
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <p className="text-base leading-7">
                    <span className="font-bold text-yellow-700">データ利活用の内容</span><br />
                    <span className="text-sm text-gray-600">年齢層、性別、居住地域、家族構成、職業・収入、買い物行動等の属性データを個人を特定しない統計データとして活用します。</span>
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <p className="text-base leading-7">
                    <span className="font-bold text-yellow-700">利用目的</span><br />
                    <span className="text-sm text-gray-600">サービス改善、地域店舗様への統計情報提供、地域経済活性化への貢献</span>
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <p className="text-base leading-7">
                    <span className="font-bold text-yellow-700">同意の任意性</span><br />
                    <span className="text-sm text-gray-600">データ利活用への同意は任意であり、同意の撤回はいつでも可能です。</span>
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <p className="text-base leading-7">
                    <span className="font-bold text-yellow-700">プライバシー保護</span><br />
                    <span className="text-sm text-gray-600">個人を特定できる情報は一切含まれず、統計データのみの活用となります。</span>
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-red-200">
                第4条（禁止事項）
              </h2>
              <div className="bg-red-50 p-4 rounded-lg mb-4">
                <p className="text-base leading-7 font-medium text-red-800">
                  ユーザーは、本サービスの利用にあたり、以下の行為を行ってはなりません。
                </p>
              </div>
              <div className="space-y-3 pl-4">
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-red-100 text-red-800 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <p className="text-base leading-7">
                    <span className="font-bold text-red-700">虚偽情報の投稿</span><br />
                    <span className="text-sm text-gray-600">（存在しない特売情報や誤解を招く情報の投稿）</span>
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-red-100 text-red-800 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <p className="text-base leading-7">
                    <span className="font-bold text-red-700">商業利用</span><br />
                    <span className="text-sm text-gray-600">（個人の営利目的での利用、ただし店舗の公式アカウントを除く）</span>
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-red-100 text-red-800 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <p className="text-base leading-7">
                    <span className="font-bold text-red-700">スパム行為</span><br />
                    <span className="text-sm text-gray-600">（同一内容の大量投稿や無関係な投稿）</span>
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-red-100 text-red-800 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <p className="text-base leading-7">
                    <span className="font-bold text-red-700">個人情報の投稿</span><br />
                    <span className="text-sm text-gray-600">（他者の個人情報や店舗スタッフの個人情報の投稿）</span>
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-red-100 text-red-800 rounded-full flex items-center justify-center text-xs font-bold">5</span>
                  <p className="text-base leading-7">
                    <span className="font-bold text-red-700">著作権侵害</span><br />
                    <span className="text-sm text-gray-600">（他者の著作物の無断使用）</span>
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-red-100 text-red-800 rounded-full flex items-center justify-center text-xs font-bold">6</span>
                  <p className="text-base leading-7">
                    <span className="font-bold text-red-700">システムへの攻撃</span><br />
                    <span className="text-sm text-gray-600">（不正アクセスやシステム障害を引き起こす行為）</span>
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-red-100 text-red-800 rounded-full flex items-center justify-center text-xs font-bold">7</span>
                  <p className="text-base leading-7">
                    <span className="font-bold text-red-700">データ利活用の悪用</span><br />
                    <span className="text-sm text-gray-600">（虚偽の属性データの入力や統計データの不正利用）</span>
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-red-100 text-red-800 rounded-full flex items-center justify-center text-xs font-bold">8</span>
                  <p className="text-base leading-7">
                    <span className="font-bold text-red-700">その他の違反行為</span><br />
                    <span className="text-sm text-gray-600">（法令に違反する行為や公序良俗に反する行為）</span>
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                第5条（投稿コンテンツ）
              </h2>
              <div className="space-y-3 pl-4">
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-800 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <p className="text-base leading-7">
                    ユーザーが投稿したコンテンツの<span className="font-bold">著作権は、投稿者に帰属</span>します。
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-800 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <p className="text-base leading-7">
                    ユーザーは、投稿により当社に対し、投稿コンテンツを本サービスで利用する<span className="font-bold">非独占的な権利を許諾</span>するものとします。
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-800 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <p className="text-base leading-7">
                    当社は、不適切と判断した投稿を<span className="font-bold">予告なく削除</span>することができます。
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                第6条（アカウントの停止・削除）
              </h2>
              <div className="space-y-3 pl-4">
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <p className="text-base leading-7">
                    当社は、ユーザーが本規約に違反した場合、事前の通知なくアカウントを停止または削除することができます。
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <p className="text-base leading-7">
                    アカウントが削除された場合、投稿されたコンテンツも削除されます。
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <p className="text-base leading-7">
                    データ利活用に関する統計データは、匿名化処理後に保存される場合があります。
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                第7条（サービスの変更・停止）
              </h2>
              <div className="space-y-3 pl-4">
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-pink-100 text-pink-800 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <p className="text-base leading-7">
                    当社は、ユーザーに事前に通知することなく、本サービスの内容を変更または停止することができます。
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-pink-100 text-pink-800 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <p className="text-base leading-7">
                    システムメンテナンス、障害対応等により、一時的にサービスを停止する場合があります。
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-pink-100 text-pink-800 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <p className="text-base leading-7">
                    データ利活用に関する重要な変更については、事前に通知いたします。
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                第8条（個人情報の取扱い）
              </h2>
              <div className="space-y-3 pl-4">
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-800 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <p className="text-base leading-7">
                    個人情報の取扱いについては、別途定めるプライバシーポリシーに従います。
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-800 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <p className="text-base leading-7">
                    データ利活用に関する詳細については、プライバシーポリシーおよびサービスポリシーをご確認ください。
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                第9条（免責事項）
              </h2>
              <div className="space-y-3 pl-4">
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-gray-100 text-gray-800 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <p className="text-base leading-7">
                    本サービスは「現状有姿」で提供され、当社は明示・黙示を問わず一切の保証を行いません。
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-gray-100 text-gray-800 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <p className="text-base leading-7">
                    投稿された情報の正確性、有用性について、当社は保証しません。
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-gray-100 text-gray-800 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <p className="text-base leading-7">
                    本サービスの利用により生じた損害について、当社は一切の責任を負いません。
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-gray-100 text-gray-800 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <p className="text-base leading-7">
                    データ利活用により生じた損害について、当社は一切の責任を負いません。
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                第10条（サービス利用料）
              </h2>
              <div className="space-y-3 pl-4">
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-teal-100 text-teal-800 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <p className="text-base leading-7">
                    本サービスの基本機能は無料で提供されます。
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-teal-100 text-teal-800 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <p className="text-base leading-7">
                    将来的に有料機能を追加する場合は、事前に告知いたします。
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                第11条（規約の変更）
              </h2>
              <div className="space-y-3 pl-4">
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-800 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <p className="text-base leading-7">
                    当社は、必要に応じて本規約を変更することができます。
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-800 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <p className="text-base leading-7">
                    規約の変更は、本サービス上での告知により効力を生じます。
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-800 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <p className="text-base leading-7">
                    データ利活用に関する重要な変更については、事前に通知いたします。
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                第12条（準拠法・管轄裁判所）
              </h2>
              <div className="space-y-3 pl-4">
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-gray-100 text-gray-800 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <p className="text-base leading-7">
                    本規約は<span className="font-bold">日本法に準拠</span>します。
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-gray-100 text-gray-800 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <p className="text-base leading-7">
                    本サービスに関する紛争については、当社所在地を管轄する裁判所を<span className="font-bold">専属的合意管轄</span>とします。
                  </p>
                </div>
              </div>
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
    </div>
  );
}