"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { motion } from 'framer-motion';
import { ChevronRight, Home, Map, Calendar, User, Settings, FileText, HelpCircle, MessageSquare, Compass, MapPin } from 'lucide-react';

// パス名からパンくず情報を生成するマッピング
const BREADCRUMB_MAP: Record<string, { label: string; icon?: React.ElementType }> = {
  '': { label: 'ホーム', icon: Home },
  'map': { label: '地図', icon: Map },
  'events': { label: 'イベント一覧', icon: Calendar },
  'profile': { label: 'マイページ', icon: User },
  'edit': { label: '編集', icon: Settings },
  'setup': { label: '初期設定', icon: Settings },
  'my-course': { label: 'コース', icon: Compass },
  'create-map': { label: 'コース作成', icon: Map },
  'create-spot': { label: 'スポット作成', icon: MapPin },
  'complete': { label: '完了', icon: FileText },
  'courses': { label: 'コース一覧', icon: Map },
  'post': { label: '投稿', icon: FileText },
  'terms': { label: '規約・ポリシー', icon: FileText },
  'privacy-policy': { label: 'プライバシーポリシー', icon: FileText },
  'service-policy': { label: 'サービスポリシー', icon: FileText },
  'terms-of-service': { label: '利用規約', icon: FileText },
  'contact': { label: 'お問い合わせ', icon: MessageSquare },
  'faq': { label: 'よくある質問', icon: HelpCircle },
  'release-notes': { label: 'リリースノート', icon: FileText },
  'about': { label: 'トクドクとは', icon: HelpCircle },
  'login': { label: 'ログイン', icon: User },
  'register': { label: '新規登録', icon: User },
  'forgot-password': { label: 'パスワードを忘れた方', icon: User },
  'reset-password': { label: 'パスワードリセット', icon: User },
  'memo': { label: '買い物メモ', icon: FileText },
  'train-schedule': { label: '時刻表', icon: Calendar },
  'area': { label: 'エリア', icon: Map },
  'spot': { label: 'スポット', icon: Map },
  'event': { label: 'イベント詳細', icon: Calendar },
  'line-connect': { label: 'LINE連携', icon: MessageSquare },
  'ads': { label: '広告', icon: FileText },
  'new': { label: '新規作成', icon: FileText },
};

// 都道府県マッピング
const PREFECTURE_MAP: Record<string, string> = {
  'oita': '大分県',
  'fukuoka': '福岡県',
  'kumamoto': '熊本県',
  'miyazaki': '宮崎県',
  'kagoshima': '鹿児島県',
  'saga': '佐賀県',
  'nagasaki': '長崎県',
};

export interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: React.ElementType;
  isCurrent?: boolean;
  /** true のときはリンクにせず span で表示（クリック不可） */
  disabled?: boolean;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
  showStructuredData?: boolean;
  baseUrl?: string;
}

/**
 * パンくずリストコンポーネント
 * - Schema.org (JSON-LD) 構造化データを含む
 * - 自動的にパスからパンくずを生成
 * - カスタムアイテムも指定可能
 */
export function Breadcrumb({
  items,
  className = '',
  showStructuredData = true,
  baseUrl = 'https://tokudoku.com',
}: BreadcrumbProps) {
  const pathname = usePathname();

  // パスからパンくずアイテムを自動生成
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (items) return items;

    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'ホーム', href: '/', icon: Home },
    ];

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;

      // 動的パラメータ（[id]など）の処理
      if (segment.startsWith('[') && segment.endsWith(']')) {
        return;
      }

      // 都道府県の処理
      if (PREFECTURE_MAP[segment]) {
        breadcrumbs.push({
          label: PREFECTURE_MAP[segment],
          href: currentPath,
          isCurrent: isLast,
        });
        return;
      }

      // UUID形式のIDは「詳細」として表示
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
      if (isUUID) {
        breadcrumbs.push({
          label: '詳細',
          href: currentPath,
          isCurrent: isLast,
        });
        return;
      }

      const mappedItem = BREADCRUMB_MAP[segment];
      if (mappedItem) {
        breadcrumbs.push({
          label: mappedItem.label,
          href: currentPath,
          icon: mappedItem.icon,
          isCurrent: isLast,
        });
      } else {
        // マッピングにない場合はセグメントをそのまま表示
        breadcrumbs.push({
          label: segment,
          href: currentPath,
          isCurrent: isLast,
        });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbItems = generateBreadcrumbs();

  // JSON-LD構造化データ
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: `${baseUrl}${item.href}`,
    })),
  };

  // ホームページのみの場合はパンくずを表示しない
  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <>
      {/* JSON-LD構造化データ */}
      {showStructuredData && (
        <Script
          id="breadcrumb-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}

      {/* パンくずリストUI */}
      <nav
        aria-label="パンくずリスト"
        className={`py-3 px-4 ${className}`}
      >
        <motion.ol
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center flex-wrap gap-1 text-sm"
        >
          {breadcrumbItems.map((item, index) => {
            const isLast = index === breadcrumbItems.length - 1;
            const Icon = item.icon;

            return (
              <motion.li
                key={item.href}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="flex items-center"
              >
                {index > 0 && (
                  <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground flex-shrink-0" />
                )}

                {isLast ? (
                  <span
                    className="flex items-center gap-1.5 text-foreground font-semibold"
                    aria-current="page"
                  >
                    {Icon && <Icon className="h-4 w-4 text-primary" />}
                    <span className="truncate max-w-[150px] sm:max-w-[200px]">
                      {item.label}
                    </span>
                  </span>
                ) : item.disabled ? (
                  <span className="flex items-center gap-1.5 text-muted-foreground cursor-default">
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                    <span className="truncate max-w-[100px] sm:max-w-[150px]">
                      {item.label}
                    </span>
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="flex items-center gap-1.5 text-[#5c3a21] hover:text-primary transition-colors group"
                  >
                    {Icon && (
                      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                    <span className="truncate max-w-[100px] sm:max-w-[150px] hover:underline underline-offset-2">
                      {item.label}
                    </span>
                  </Link>
                )}
              </motion.li>
            );
          })}
        </motion.ol>
      </nav>
    </>
  );
}

/**
 * RPG風パンくずリストコンポーネント
 * 羊皮紙風のデザインで冒険感を演出
 */
export function RPGBreadcrumb({
  items,
  className = '',
  showStructuredData = true,
  baseUrl = 'https://tokudoku.com',
}: BreadcrumbProps) {
  const pathname = usePathname();

  // パスからパンくずアイテムを自動生成（同じロジック）
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (items) return items;

    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'ホーム', href: '/', icon: Home },
    ];

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;

      if (segment.startsWith('[') && segment.endsWith(']')) return;

      if (PREFECTURE_MAP[segment]) {
        breadcrumbs.push({
          label: PREFECTURE_MAP[segment],
          href: currentPath,
          isCurrent: isLast,
        });
        return;
      }

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
      if (isUUID) {
        breadcrumbs.push({
          label: '詳細',
          href: currentPath,
          isCurrent: isLast,
        });
        return;
      }

      const mappedItem = BREADCRUMB_MAP[segment];
      if (mappedItem) {
        breadcrumbs.push({
          label: mappedItem.label,
          href: currentPath,
          icon: mappedItem.icon,
          isCurrent: isLast,
        });
      } else {
        breadcrumbs.push({
          label: segment,
          href: currentPath,
          isCurrent: isLast,
        });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbItems = generateBreadcrumbs();

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: `${baseUrl}${item.href}`,
    })),
  };

  if (breadcrumbItems.length <= 1) return null;

  return (
    <>
      {showStructuredData && (
        <Script
          id="breadcrumb-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}

      <nav
        aria-label="パンくずリスト"
        className={`relative py-3 px-4 ${className}`}
      >
        {/* 羊皮紙風の背景 */}
        <div className="absolute inset-0 bg-[#fdf5e6] rounded-lg border-2 border-[#d4c4a8] shadow-sm overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <motion.ol
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="relative flex items-center flex-wrap gap-1 text-sm z-10"
        >
          {breadcrumbItems.map((item, index) => {
            const isLast = index === breadcrumbItems.length - 1;
            const Icon = item.icon;

            return (
              <motion.li
                key={item.href}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.08 }}
                className="flex items-center"
              >
                {index > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.08 }}
                    className="mx-2 text-primary font-bold"
                  >
                    ▸
                  </motion.span>
                )}

                {isLast ? (
                  <span
                    className="flex items-center gap-1.5 px-2 py-1 bg-[#8b6914]/20 rounded text-foreground font-bold border border-primary/30"
                    aria-current="page"
                  >
                    {Icon && <Icon className="h-4 w-4 text-primary" />}
                    <span className="truncate max-w-[120px] sm:max-w-[180px]">
                      {item.label}
                    </span>
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="flex items-center gap-1.5 px-2 py-1 text-[#5c3a21] hover:text-primary hover:bg-accent rounded transition-all group"
                  >
                    {Icon && (
                      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                    <span className="truncate max-w-[80px] sm:max-w-[120px] font-medium">
                      {item.label}
                    </span>
                  </Link>
                )}
              </motion.li>
            );
          })}
        </motion.ol>
      </nav>
    </>
  );
}

export default Breadcrumb;

