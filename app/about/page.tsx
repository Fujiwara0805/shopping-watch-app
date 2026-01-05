'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { MapPin, Calendar, Users, Heart, Sparkles, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/seo/breadcrumb';

/**
 * Aboutページ - AI検索エンジン向けに最適化
 * トクドクの詳細情報をわかりやすく提供
 */
export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fef3e7] to-white">
      {/* パンくずリスト */}
      <div className="px-4 sm:px-8 pt-4">
        <Breadcrumb />
      </div>
      
      {/* ヒーローセクション */}
      <section className="py-20 px-4 sm:px-8">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#73370c] mb-6">
              トクドクについて
            </h1>
            <p className="text-xl sm:text-2xl text-gray-700 leading-relaxed">
              地域のイベント情報を地図で発見。<br />
              人と街をつなぐ、新しいイベント発見プラットフォームです。
            </p>
          </motion.div>
        </div>
      </section>

      {/* ミッション */}
      <section className="py-16 px-4 sm:px-8 bg-white">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center justify-center mb-8">
              <Target className="h-12 w-12 text-[#73370c] mr-4" />
              <h2 className="text-3xl sm:text-4xl font-bold text-[#73370c]">
                私たちのミッション
              </h2>
            </div>
            <p className="text-lg sm:text-xl text-gray-700 leading-relaxed text-center mb-6">
              トクドクは、地域のお祭り、マルシェ、ワークショップなどのイベント情報を、
              誰でも簡単に発見・共有できるプラットフォームです。
            </p>
            <p className="text-lg sm:text-xl text-gray-700 leading-relaxed text-center">
              地域イベントを通じて、人と人、人と街をつなぎ、
              コミュニティの活性化に貢献することを目指しています。
            </p>
          </motion.div>
        </div>
      </section>

      {/* 特徴 */}
      <section className="py-16 px-4 sm:px-8">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#73370c] text-center mb-12">
            トクドクの特徴
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: MapPin,
                title: '地図で直感的に発見',
                description:
                  '現在地周辺のイベントを地図上で視覚的に確認できます。ピンをタップするだけで詳細情報が表示されます。',
              },
              {
                icon: Calendar,
                title: 'リアルタイム更新',
                description:
                  'イベント情報は常に最新の状態に保たれます。終了したイベントは自動的に非表示になります。',
              },
              {
                icon: Users,
                title: '完全無料',
                description:
                  'すべての機能を無料でご利用いただけます。アカウント登録なしでもイベント検索が可能です。',
              },
              {
                icon: Heart,
                title: 'お気に入り機能',
                description:
                  '気になるイベントをお気に入り登録して、後から簡単にアクセスできます。',
              },
              {
                icon: Sparkles,
                title: 'イベント投稿',
                description:
                  '誰でもイベント情報を投稿できます。地域のイベント情報を共有して、コミュニティを盛り上げましょう。',
              },
              {
                icon: Target,
                title: '地域密着',
                description:
                  '大分県内のイベント情報に特化。地域の小さなイベントから大きなお祭りまで、幅広く掲載しています。',
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="bg-[#fef3e8] w-16 h-16 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="h-8 w-8 text-[#73370c]" strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-bold text-[#73370c] mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 使い方 */}
      <section className="py-16 px-4 sm:px-8 bg-white">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#73370c] text-center mb-12">
            使い方
          </h2>

          <div className="space-y-8">
            {[
              {
                step: 1,
                title: 'マップを開く',
                description:
                  'トップページから「イベントを探す」ボタンをクリック。位置情報の利用を許可すると、現在地周辺のイベントが表示されます。',
              },
              {
                step: 2,
                title: 'イベントを探す',
                description:
                  '地図上のピンをタップして詳細情報を確認。開催日、場所、内容などをチェックできます。',
              },
              {
                step: 3,
                title: 'イベントに参加',
                description:
                  '気になるイベントを見つけたら、現地に足を運んでみましょう。新しい発見と出会いがあなたを待っています。',
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="flex items-start gap-6"
              >
                <div className="flex-shrink-0 w-16 h-16 bg-[#73370c] text-white rounded-full flex items-center justify-center text-2xl font-bold">
                  {item.step}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-[#73370c] mb-2">
                    {item.title}
                  </h3>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* サービス詳細 */}
      <section className="py-16 px-4 sm:px-8">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#73370c] text-center mb-12">
            サービス詳細
          </h2>

          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <dl className="space-y-6">
              <div>
                <dt className="text-xl font-bold text-[#73370c] mb-2">対応エリア</dt>
                <dd className="text-lg text-gray-600">
                  現在は大分県内のイベント情報を掲載しています。今後、他の地域にも拡大予定です。
                </dd>
              </div>
              <div>
                <dt className="text-xl font-bold text-[#73370c] mb-2">掲載イベント</dt>
                <dd className="text-lg text-gray-600">
                  お祭り、夏祭り、秋祭り、マルシェ、フリーマーケット、ワークショップ、体験イベント、
                  フードフェスティバル、音楽イベント、地域の催し物など
                </dd>
              </div>
              <div>
                <dt className="text-xl font-bold text-[#73370c] mb-2">利用料金</dt>
                <dd className="text-lg text-gray-600">
                  完全無料。すべての機能を無料でご利用いただけます。
                </dd>
              </div>
              <div>
                <dt className="text-xl font-bold text-[#73370c] mb-2">対応デバイス</dt>
                <dd className="text-lg text-gray-600">
                  スマートフォン、タブレット、パソコンなど、あらゆるデバイスでご利用いただけます。
                  ウェブブラウザから簡単にアクセスでき、アプリのインストールは不要です。
                </dd>
              </div>
              <div>
                <dt className="text-xl font-bold text-[#73370c] mb-2">更新頻度</dt>
                <dd className="text-lg text-gray-600">
                  リアルタイムで更新。新しいイベント情報が随時追加され、
                  終了したイベントは自動的に非表示になります。
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-8 bg-gradient-to-br from-[#fef3e8] to-[#fff5eb]">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-[#73370c] mb-6">
              さあ、始めよう！
            </h2>
            <p className="text-xl text-gray-700 mb-8">
              今すぐトクドクで、あなたの街の楽しいイベントを見つけましょう。
            </p>
            <Link href="/map">
              <Button
                size="lg"
                className="h-16 px-12 text-xl font-bold rounded-full bg-[#73370c] hover:bg-[#5c2a0a]"
              >
                イベントを探す
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 運営情報 */}
      <section className="py-16 px-4 sm:px-8 bg-white">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#73370c] text-center mb-12">
            運営情報
          </h2>
          <div className="bg-gray-50 p-8 rounded-2xl">
            <dl className="space-y-4">
              <div>
                <dt className="font-bold text-gray-700 mb-1">サービス名</dt>
                <dd className="text-gray-600">トクドク</dd>
              </div>
              <div>
                <dt className="font-bold text-gray-700 mb-1">運営会社</dt>
                <dd className="text-gray-600">株式会社Nobody</dd>
              </div>
              <div>
                <dt className="font-bold text-gray-700 mb-1">代表取締役</dt>
                <dd className="text-gray-600">藤原泰樹</dd>
              </div>
              <div>
                <dt className="font-bold text-gray-700 mb-1">お問い合わせ</dt>
                <dd className="text-gray-600">
                  <Link href="/contact" className="text-[#73370c] hover:underline">
                    お問い合わせフォーム
                  </Link>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </div>
  );
}

