'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { BookOpen, Calendar, ArrowLeft, Users, Lock, Globe, Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';
import { designTokens } from '@/lib/constants';
import { getMyMeetupRooms, type MyMeetupRoom } from '@/app/_actions/meetup';
import { VerifyEmailCta } from './verify-email-cta';

const TYPE_BADGE = {
  open: { label: '公開', icon: Globe, color: designTokens.colors.functional.info },
  host: { label: 'ホスト', icon: Sparkles, color: designTokens.colors.accent.goldDark },
  closed: { label: '限定', icon: Lock, color: designTokens.colors.text.muted },
} as const;

export function MyMeetupPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { status } = useSession();
  const [rooms, setRooms] = useState<MyMeetupRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const verifyFlash = params?.get('meetup_verify');

  useEffect(() => {
    if (status !== 'authenticated') {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getMyMeetupRooms().then((data) => {
      if (cancelled) return;
      setRooms(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: designTokens.colors.background.mist }}>
        <p className="text-sm" style={{ color: designTokens.colors.text.muted }}>読み込み中...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6" style={{ background: designTokens.colors.background.mist }}>
        <BookOpen className="h-10 w-10 mb-3" style={{ color: designTokens.colors.text.muted }} />
        <p className="text-sm mb-4" style={{ color: designTokens.colors.text.secondary }}>
          待ち合わせ機能を使うにはログインしてください。
        </p>
        <Link href="/login" className="text-sm font-semibold underline" style={{ color: designTokens.colors.accent.lilacDark }}>
          ログインへ
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-12" style={{ background: designTokens.colors.background.mist }}>
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <button
          onClick={() => router.back()}
          className="text-sm mb-4 inline-flex items-center gap-1 transition-colors hover:underline"
          style={{ color: designTokens.colors.text.secondary }}
        >
          <ArrowLeft className="h-4 w-4" /> 戻る
        </button>

        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="h-6 w-6" style={{ color: designTokens.colors.accent.goldDark }} />
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: designTokens.typography.display, color: designTokens.colors.text.primary }}
          >
            待ち合わせノート
          </h1>
        </div>

        {verifyFlash && <VerifyFlashBanner flash={verifyFlash} />}

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <VerifyEmailCta initialFlash={verifyFlash === 'ok' ? 'ok' : null} />
        </motion.div>

        <h2
          className="text-sm font-semibold mb-3"
          style={{ color: designTokens.colors.text.secondary }}
        >
          参加中・参加予定のノート
        </h2>

        {loading ? (
          <p className="text-xs text-center py-8" style={{ color: designTokens.colors.text.muted }}>
            読み込み中...
          </p>
        ) : rooms.length === 0 ? (
          <div
            className="rounded-2xl p-6 text-center"
            style={{
              background: designTokens.colors.background.white,
              border: `1px dashed ${designTokens.colors.secondary.stoneDark}`,
            }}
          >
            <p className="text-sm font-medium mb-1" style={{ color: designTokens.colors.text.primary }}>
              まだ参加しているノートはありません
            </p>
            <p className="text-xs mb-3" style={{ color: designTokens.colors.text.secondary }}>
              イベント詳細ページの「待ち合わせノート」から最初の 1 件を開いてみましょう。
            </p>
            <Link
              href="/events"
              className="text-xs font-semibold inline-flex items-center gap-1 px-4 py-2 rounded-full"
              style={{
                background: designTokens.colors.accent.gold,
                color: designTokens.colors.text.primary,
              }}
            >
              イベントを探す
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((r) => (
              <MyRoomCard key={r.room_id} room={r} onClick={() => router.push(`/meetup/${r.room_id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VerifyFlashBanner({ flash }: { flash: string }) {
  if (flash === 'ok') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl px-4 py-3 mb-4 flex items-center gap-2"
        style={{
          background: `${designTokens.colors.functional.success}1a`,
          border: `1px solid ${designTokens.colors.functional.success}55`,
          color: designTokens.colors.functional.success,
        }}
      >
        <ShieldCheck className="h-4 w-4 flex-shrink-0" />
        <p className="text-xs font-semibold">メールアドレスを確認しました。Verified バッジが付きました。</p>
      </motion.div>
    );
  }
  if (flash === 'error' || flash === 'missing_token') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl px-4 py-3 mb-4 flex items-center gap-2"
        style={{
          background: `${designTokens.colors.functional.warning}1a`,
          border: `1px solid ${designTokens.colors.functional.warning}55`,
          color: designTokens.colors.functional.warning,
        }}
      >
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <p className="text-xs font-semibold">確認リンクが無効か期限切れです。再度送信してください。</p>
      </motion.div>
    );
  }
  return null;
}

function MyRoomCard({ room, onClick }: { room: MyMeetupRoom; onClick: () => void }) {
  const badge = TYPE_BADGE[room.type];
  const Icon = badge.icon;
  const opens = new Date(room.opens_at);
  const closes = new Date(room.closes_at);
  const now = new Date();
  const chatOpen = now >= opens && now <= closes;
  const ended = now > closes;
  const eventDate = room.event_start_date
    ? new Date(room.event_start_date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })
    : '日付未定';

  return (
    <motion.div
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      onClick={onClick}
      className="cursor-pointer rounded-2xl p-4 pl-6 relative"
      style={{
        background: designTokens.colors.background.white,
        border: `1px solid ${designTokens.colors.secondary.stone}40`,
        boxShadow: designTokens.elevation.subtle,
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 27px, ${designTokens.colors.secondary.stone}1f 27px, ${designTokens.colors.secondary.stone}1f 28px)`,
        opacity: ended ? 0.65 : 1,
      }}
    >
      <div className="absolute left-2 top-3 bottom-3 flex flex-col gap-2 opacity-50">
        <span className="block w-1.5 h-1.5 rounded-full" style={{ background: designTokens.colors.accent.gold }} />
        <span className="block w-1.5 h-1.5 rounded-full" style={{ background: designTokens.colors.accent.gold }} />
        <span className="block w-1.5 h-1.5 rounded-full" style={{ background: designTokens.colors.accent.gold }} />
      </div>

      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold leading-snug truncate"
            style={{ color: designTokens.colors.text.primary, fontFamily: designTokens.typography.display }}
          >
            {room.title || '（無題のノート）'}
          </p>
          {room.event_name && (
            <p className="text-[11px] mt-0.5 truncate" style={{ color: designTokens.colors.text.secondary }}>
              {room.event_name}
            </p>
          )}
        </div>
        <span
          className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{
            background: `${badge.color}1a`,
            color: badge.color,
            border: `1px solid ${badge.color}55`,
          }}
        >
          <Icon className="h-2.5 w-2.5" />
          {badge.label}
        </span>
      </div>

      <div className="flex items-center gap-3 text-[11px]" style={{ color: designTokens.colors.text.muted }}>
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {eventDate}
        </span>
        <span
          className="inline-flex items-center gap-1"
          style={{
            color: ended
              ? designTokens.colors.text.muted
              : chatOpen
              ? designTokens.colors.functional.success
              : designTokens.colors.text.muted,
          }}
        >
          <span className="block w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
          {ended ? '終了' : chatOpen ? 'チャット解禁中' : '解禁前'}
        </span>
      </div>
    </motion.div>
  );
}
