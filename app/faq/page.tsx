'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/seo/breadcrumb';

/**
 * FAQページ - AI検索エンジン向けに最適化
 * よくある質問と回答を構造化して提供
 */

const faqCategories = [
  {
    category: 'サービスについて',
    questions: [
      {
        question: 'トクドクとは何ですか？',
        answer:
          'トクドクは、大分県内の地域イベント情報を地図上で検索できる完全無料のイベント発見プラットフォームです。お祭り、マルシェ、ワークショップなどの地域密着型イベントをリアルタイムで発見できます。位置情報を活用することで、現在地周辺のイベントを簡単に見つけることができます。',
      },
      {
        question: 'トクドクの利用料金はいくらですか？',
        answer:
          'トクドクは完全無料でご利用いただけます。アカウント登録も不要で、今すぐイベント検索を始められます。すべての機能を無料でお使いいただけます。',
      },
      {
        question: 'どのようなイベント情報が掲載されていますか？',
        answer:
          'トクドクでは、大分県内のお祭り、夏祭り、秋祭り、地域のマルシェ、手作り市、ワークショップ、体験イベント、フードフェスティバル、音楽イベントなど、さまざまな地域密着型イベント情報を掲載しています。終了したイベントは自動的に非表示になるため、常に最新の情報をご覧いただけます。',
      },
    ],
  },
  {
    category: '使い方',
    questions: [
      {
        question: 'どうやってイベントを探すのですか？',
        answer:
          'トクドクでは地図上にイベント情報がマーカーで表示されます。マップを移動・拡大縮小して、気になるエリアのイベントを探すことができます。位置情報を許可すると、現在地周辺のイベントが自動的に表示されます。マーカーをタップすると、イベントの詳細情報を確認できます。',
      },
      {
        question: '位置情報を使用する必要がありますか？',
        answer:
          '位置情報の使用は任意です。位置情報を許可すると現在地周辺のイベントを簡単に見つけられますが、許可しなくても地図を手動で操作してイベントを探すことができます。位置情報はイベント検索のみに使用され、外部に共有されることはありません。',
      },
      {
        question: 'アカウント登録は必要ですか？',
        answer:
          'イベント検索にアカウント登録は不要です。今すぐマップを開いてイベントを探し始めることができます。ただし、イベント情報の投稿やお気に入り機能を使用する場合は、アカウント登録が必要です。',
      },
      {
        question: 'スマートフォンで使えますか？',
        answer:
          'はい、トクドクはスマートフォン、タブレット、パソコンなど、あらゆるデバイスでご利用いただけます。ウェブブラウザから簡単にアクセスでき、アプリのインストールは不要です。レスポンシブデザインにより、どのデバイスでも快適にご利用いただけます。',
      },
    ],
  },
  {
    category: 'イベント情報',
    questions: [
      {
        question: '大分県以外のイベントも掲載されていますか？',
        answer:
          '現在、トクドクは大分県内のイベント情報に特化していますが、今後は他の地域へもサービスを拡大していく予定です。',
      },
      {
        question: 'イベント情報の更新頻度は？',
        answer:
          'トクドクのイベント情報はリアルタイムで更新されます。終了したイベントは自動的に表示されなくなり、新しいイベントが随時追加されます。常に最新のイベント情報をご覧いただけます。',
      },
      {
        question: '自分でイベント情報を投稿できますか？',
        answer:
          'はい、アカウント登録後、どなたでもイベント情報を投稿できます。地域のお祭りやマルシェ、ワークショップなどの情報を共有して、地域コミュニティを盛り上げましょう。投稿されたイベント情報は審査後、マップ上に表示されます。',
      },
    ],
  },
  {
    category: '機能・サポート',
    questions: [
      {
        question: 'お気に入り機能はありますか？',
        answer:
          'はい、アカウント登録後、気になるイベントをお気に入りに追加できます。お気に入りに登録したイベントは、マイページからいつでも確認できます。',
      },
      {
        question: '通知機能はありますか？',
        answer:
          'はい、アカウント登録後、お気に入りに登録したイベントの開催日が近づくと、通知でお知らせします。また、新しいイベントが追加されたときにも通知を受け取ることができます。',
      },
      {
        question: 'イベント情報に間違いを見つけた場合はどうすればいいですか？',
        answer:
          'イベント情報に誤りを見つけた場合は、お問い合わせフォームからご連絡ください。内容を確認の上、速やかに修正いたします。',
      },
      {
        question: 'プライバシーは保護されますか？',
        answer:
          'はい、トクドクではユーザーのプライバシー保護を最優先に考えています。位置情報はイベント検索のみに使用され、第三者に共有されることはありません。詳細はプライバシーポリシーをご確認ください。',
      },
    ],
  },
];

export default function FAQPage() {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fef3e7] to-white">
      {/* パンくずリスト */}
      <div className="px-4 sm:px-8 pt-4">
        <Breadcrumb />
      </div>
      
      {/* ヘッダー */}
      <section className="py-20 px-4 sm:px-8">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#73370c] mb-6">
              よくある質問
            </h1>
            <p className="text-xl sm:text-2xl text-gray-700 leading-relaxed">
              トクドクに関するよくある質問をまとめました。<br />
              お困りの際はこちらをご確認ください。
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-8">
        <div className="container mx-auto max-w-4xl">
          <div className="space-y-8">
            {faqCategories.map((category, categoryIndex) => (
              <motion.div
                key={category.category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl shadow-lg overflow-hidden"
              >
                <div className="bg-[#fef3e8] px-6 py-4 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-[#73370c]">
                    {category.category}
                  </h2>
                </div>

                <div className="p-6">
                  <Accordion type="single" collapsible className="w-full">
                    {category.questions.map((item, index) => (
                      <AccordionItem
                        key={`${category.category}-${index}`}
                        value={`${category.category}-${index}`}
                        className="border-b border-gray-200 last:border-0"
                      >
                        <AccordionTrigger className="text-left hover:no-underline py-4">
                          <div className="flex items-start gap-3 pr-4">
                            <span className="flex-shrink-0 w-8 h-8 bg-[#73370c] text-white rounded-full flex items-center justify-center text-sm font-bold">
                              Q
                            </span>
                            <span className="text-lg font-bold text-gray-800">
                              {item.question}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="flex items-start gap-3 pl-11 pr-4 py-2">
                            <span className="flex-shrink-0 w-8 h-8 bg-[#fef3e8] text-[#73370c] rounded-full flex items-center justify-center text-sm font-bold">
                              A
                            </span>
                            <p className="text-gray-700 leading-relaxed">
                              {item.answer}
                            </p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* お問い合わせCTA */}
      <section className="py-20 px-4 sm:px-8 bg-gradient-to-br from-[#fef3e8] to-[#fff5eb]">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-[#73370c] mb-6">
              解決しませんでしたか？
            </h2>
            <p className="text-xl text-gray-700 mb-8">
              その他のご質問やお困りのことがございましたら、<br />
              お気軽にお問い合わせください。
            </p>
            <Link href="/contact">
              <Button
                size="lg"
                className="h-16 px-12 text-xl font-bold rounded-full bg-[#73370c] hover:bg-[#5c2a0a]"
              >
                お問い合わせ
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

