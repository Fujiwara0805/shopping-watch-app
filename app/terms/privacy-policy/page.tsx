"use client";

import AppLayout from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="bg-white">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
              プライバシーポリシー
            </h1>
          </div>
          
          <div className="space-y-8 text-gray-800 leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                1. 個人情報の収集
              </h2>
              <p className="text-base leading-7 mb-4">
                当社は、以下の個人情報を収集します。
              </p>
              
              <div className="space-y-4">
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r">
                  <h3 className="font-bold text-red-800 mb-3">必須情報</h3>
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></span>
                      <p className="text-sm text-gray-700">
                        <span className="font-bold">メールアドレス</span><br />
                        <span className="text-xs text-gray-600">（アカウント管理用）</span>
                      </p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></span>
                      <p className="text-sm text-gray-700">
                        <span className="font-bold">パスワード</span><br />
                        <span className="text-xs text-gray-600">（暗号化して保存）</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r">
                  <h3 className="font-bold text-blue-800 mb-3">任意情報</h3>
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                      <p className="text-sm text-gray-700">表示名（ニックネーム）</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                      <p className="text-sm text-gray-700">プロフィール画像</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                      <p className="text-sm text-gray-700">自己紹介文</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                      <p className="text-sm text-gray-700">お気に入り店舗情報（最大3店舗）</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r">
                  <h3 className="font-bold text-green-800 mb-3">自動収集情報</h3>
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></span>
                      <p className="text-sm text-gray-700">
                        <span className="font-bold">位置情報</span><br />
                        <span className="text-xs text-gray-600">（近隣店舗表示用、ユーザーの許可時のみ）</span>
                      </p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></span>
                      <p className="text-sm text-gray-700">
                        <span className="font-bold">利用状況データ</span><br />
                        <span className="text-xs text-gray-600">（サービス改善用）</span>
                      </p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></span>
                      <p className="text-sm text-gray-700">
                        <span className="font-bold">デバイス情報</span><br />
                        <span className="text-xs text-gray-600">（技術的サポート用）</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                2. 個人情報の利用目的
              </h2>
              <p className="text-base leading-7 mb-4">
                収集した個人情報は、以下の目的で利用します。
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  "アカウント管理・認証",
                  "サービス機能の提供",
                  "近隣店舗情報の表示",
                  "LINE通知の配信",
                  "サービス改善・統計分析",
                  "お問い合わせ対応",
                  "利用規約違反の調査・対応"
                ].map((purpose, index) => (
                  <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                    <span className="text-sm font-medium text-gray-800">{purpose}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                3. 個人情報の第三者提供
              </h2>
              <ol className="list-disc pl-8">
                <li>当社は、以下の場合を除き、個人情報を第三者に提供しません。</li>
                <li>ユーザーの同意がある場合</li>
                <li>法令に基づく場合</li>
                <li>人の生命、身体または財産の保護のために必要がある場合</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                4. 個人情報の管理
              </h2>
              <p className="text-base leading-7 mb-4">
                当社は、個人情報の漏洩、滅失または毀損の防止その他の個人情報の安全管理のために必要かつ適切な措置を講じます。
              </p>
              <ul className="list-disc pl-8">
                <li>適切なセキュリティ対策を実施</li>
                <li>不正アクセス・漏洩の防止</li>
                <li>定期的なセキュリティ監査の実施</li>
                <li>暗号化技術による情報保護</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                5. 個人情報の開示・訂正・削除
              </h2>
              <ol className="list-disc pl-8">
                <li>ユーザーは、当社が保有する自己の個人情報について、開示、訂正、削除を求めることができます。</li>
                <li>開示等の請求は、お問い合わせフォームより行ってください。</li>
                <li>当社は、請求に応じて合理的な期間内に対応いたします。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                6. Cookie等の利用
              </h2>
              <ol className="list-disc pl-8">
                <li>本サービスでは、ユーザーの利便性向上のためCookieを使用する場合があります。</li>
                <li>Cookieの使用を希望しない場合は、ブラウザの設定により無効にすることができます。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                7. 外部サービスとの連携
              </h2>
              <p className="text-base leading-7 mb-4">
                本サービスでは、以下の外部サービスと連携しています。
              </p>
              <div className="space-y-3">
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">Google</h3>
                  <p className="text-sm text-gray-600">認証、地図表示</p>
                </div>
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">LINE</h3>
                  <p className="text-sm text-gray-600">認証、通知配信</p>
                </div>
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">Supabase</h3>
                  <p className="text-sm text-gray-600">データベース、認証</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-3 leading-6">
                これらのサービスの利用については、<br />
                各サービスのプライバシーポリシーが適用されます。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                8. 個人情報の保存期間
              </h2>
              <ol className="list-disc pl-8">
                <li>個人情報は、利用目的の達成に必要な期間保存します。</li>
                <li>アカウント削除時は、法令で保存が義務付けられている情報を除き、個人情報を削除します。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                9. プライバシーポリシーの変更
              </h2>
              <ol className="list-disc pl-8">
                <li>当社は、必要に応じて本プライバシーポリシーを変更することができます。</li>
                <li>変更は、本サービス上での告知により効力を生じます。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                10. お問い合わせ
              </h2>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-base leading-7 text-blue-800">
                  個人情報の取扱いに関するお問い合わせは、<br />
                  <span className="font-bold">お問い合わせフォーム</span>よりご連絡ください。
                </p>
              </div>
            </section>

            <div className="bg-gray-100 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-600">
                <span className="font-bold">制定日：</span>2025年6月14日<br />
                <span className="font-bold">最終更新日：</span>2025年6月14日
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