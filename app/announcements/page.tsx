'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { designTokens } from '@/lib/constants';
import { Breadcrumb } from '@/components/seo/breadcrumb';

// ===================================================================
// お知らせデータ
// ===================================================================

interface Announcement {
  id: string;
  date: string;
  category: 'update' | 'info' | 'event';
  title: string;
  content: string;
}

const categoryConfig = {
  update: {
    label: 'アップデート',
    color: designTokens.colors.primary.base,
    bgColor: `${designTokens.colors.primary.base}12`,
  },
  info: {
    label: 'お知らせ',
    color: designTokens.colors.accent.gold,
    bgColor: `${designTokens.colors.accent.gold}18`,
  },
  event: {
    label: 'イベント',
    color: '#10B981',
    bgColor: '#10B98115',
  },
};

const announcements: Announcement[] = [
  {
    id: '1',
    date: '2026.03.06',
    category: 'update',
    title: 'トクドクがリニューアルしました！イベント検索がより便利に。',
    content: 'トクドクが大幅リニューアル。大分県内のイベント・祭り・マルシェ情報を地図から簡単に探せるようになりました。登録不要で、すぐにご利用いただけます。',
  },
  {
    id: '2',
    date: '2026.03.01',
    category: 'info',
    title: '大分県内のイベント情報を随時更新中です。',
    content: '大分県18市町村のイベント・祭り・マルシェの情報を随時更新しています。最新の情報は地図画面からご確認ください。',
  },
  {
    id: '3',
    date: '2026.02.20',
    category: 'info',
    title: 'トクドクのサービスを開始しました。',
    content: '大分県のイベント情報を一括検索できるサービス「トクドク」をリリースしました。地図上でイベントの場所を確認でき、詳細情報もワンタップで確認できます。',
  },
];

// ===================================================================
// PAGE COMPONENT
// ===================================================================

export default function AnnouncementsPage() {
  const router = useRouter();
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  return (
    <div
      className="min-h-screen"
      style={{ background: designTokens.colors.background.mist }}
    >
      {/* ヘッダー */}
      <header
        className="sticky top-0 z-50 px-4 py-3"
        style={{
          background: `${designTokens.colors.background.white}F0`,
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${designTokens.colors.secondary.stone}20`,
        }}
      >
        <div className="container mx-auto max-w-3xl flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            className="rounded-full h-10 w-10"
            style={{ color: designTokens.colors.text.primary }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1
            className="text-lg font-semibold"
            style={{
              color: designTokens.colors.text.primary,
              fontFamily: designTokens.typography.display,
            }}
          >
            お知らせ
          </h1>
        </div>
      </header>

      <Breadcrumb />

      {/* メインコンテンツ */}
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          {announcements.map((item, index) => {
            const cat = categoryConfig[item.category];
            const isExpanded = expandedId === item.id;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="rounded-2xl overflow-hidden cursor-pointer transition-shadow duration-200 hover:shadow-md"
                style={{
                  background: designTokens.colors.background.white,
                  border: `1px solid ${designTokens.colors.secondary.stone}15`,
                }}
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
              >
                {/* ヘッダー部分 */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span
                          className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                          style={{
                            background: cat.bgColor,
                            color: cat.color,
                          }}
                        >
                          {cat.label}
                        </span>
                        <span
                          className="text-xs flex items-center gap-1"
                          style={{ color: designTokens.colors.text.muted }}
                        >
                          <Calendar className="w-3 h-3" />
                          {item.date}
                        </span>
                      </div>
                      <h3
                        className="text-sm sm:text-base font-semibold leading-relaxed"
                        style={{
                          color: designTokens.colors.text.primary,
                          fontFamily: designTokens.typography.display,
                        }}
                      >
                        {item.title}
                      </h3>
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 flex-shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                      style={{ color: designTokens.colors.text.muted }}
                    />
                  </div>

                  {/* 展開コンテンツ */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.2 }}
                      className="mt-3 pt-3"
                      style={{ borderTop: `1px solid ${designTokens.colors.secondary.stone}15` }}
                    >
                      <p
                        className="text-sm leading-relaxed"
                        style={{
                          color: designTokens.colors.text.secondary,
                          fontFamily: designTokens.typography.body,
                        }}
                      >
                        {item.content}
                      </p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* フッター */}
        <div className="text-center mt-12 pb-8">
          <p
            className="text-xs"
            style={{ color: designTokens.colors.text.muted }}
          >
            これ以前のお知らせはありません
          </p>
        </div>
      </main>
    </div>
  );
}
