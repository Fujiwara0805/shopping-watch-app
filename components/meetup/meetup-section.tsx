'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { BookOpen, Users, Plus, Lock, Globe, Compass, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { designTokens } from '@/lib/constants';
import { CreateMeetupRoomDialog } from './create-meetup-room-dialog';
import { VerifyEmailCta } from './verify-email-cta';

type MeetupRoom = {
  id: string;
  type: 'open' | 'host' | 'closed';
  host_user_id: string | null;
  title: string | null;
  description: string | null;
  max_participants: number;
  opens_at: string;
  closes_at: string;
  created_at: string;
};

type RoomWithStats = MeetupRoom & { participant_count: number };

const TYPE_BADGE: Record<MeetupRoom['type'], { label: string; icon: typeof Globe; color: string }> = {
  open: { label: '公開', icon: Globe, color: designTokens.colors.functional.info },
  host: { label: 'ホスト', icon: Sparkles, color: designTokens.colors.accent.goldDark },
  closed: { label: '限定', icon: Lock, color: designTokens.colors.text.muted },
};

export function MeetupSection({ postId, eventName }: { postId: string; eventName?: string | null }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: roomData } = await supabase
      .from('meetup_rooms')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    const list = (roomData ?? []) as MeetupRoom[];
    const stats = await Promise.all(
      list.map(async (r) => {
        const { count } = await supabase
          .from('meetup_participants')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', r.id)
          .eq('status', 'going');
        return { ...r, participant_count: count ?? 0 };
      })
    );
    setRooms(stats);
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8"
      style={{ borderTop: `1px dashed ${designTokens.colors.secondary.stone}50`, paddingTop: 24 }}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" style={{ color: designTokens.colors.accent.goldDark }} />
          <h2
            className="text-lg font-semibold"
            style={{ fontFamily: designTokens.typography.display, color: designTokens.colors.text.primary }}
          >
            待ち合わせノート
          </h2>
        </div>
        {session?.user?.id && (
          <button
            onClick={() => setShowCreate(true)}
            className="text-xs font-semibold flex items-center gap-1 px-3 py-1.5 rounded-full transition-transform hover:scale-105"
            style={{
              background: `${designTokens.colors.accent.gold}20`,
              color: designTokens.colors.accent.goldDark,
              border: `1px dashed ${designTokens.colors.accent.goldDark}80`,
            }}
          >
            <Plus className="h-3 w-3" /> 新しいノート
          </button>
        )}
      </div>

      <p className="text-xs mb-4 leading-relaxed" style={{ color: designTokens.colors.text.secondary }}>
        このイベントを口実に「現地で待ち合わせしませんか？」と書き込めるノートです。チャットは開催 24 時間前に解禁されます。
      </p>

      {session?.user?.id && (
        <div className="mb-4">
          <VerifyEmailCta />
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <Compass
            className="h-6 w-6 mx-auto"
            style={{ color: designTokens.colors.accent.gold, animation: 'spin 2s linear infinite' }}
          />
        </div>
      ) : rooms.length === 0 ? (
        <EmptyNotePlaceholder
          canCreate={!!session?.user?.id}
          onCreate={() => setShowCreate(true)}
        />
      ) : (
        <div className="space-y-3">
          {rooms.map((r) => (
            <RoomNoteCard key={r.id} room={r} onClick={() => router.push(`/meetup/${r.id}`)} />
          ))}
        </div>
      )}

      {!session?.user?.id && rooms.length > 0 && (
        <p
          className="text-xs mt-3 text-center"
          style={{ color: designTokens.colors.text.muted }}
        >
          ノートを開いたり書き込んだりするにはログインが必要です。
        </p>
      )}

      <CreateMeetupRoomDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        postId={postId}
        eventName={eventName ?? undefined}
        onCreated={(roomId) => router.push(`/meetup/${roomId}`)}
      />
    </motion.div>
  );
}

function EmptyNotePlaceholder({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) {
  return (
    <div
      className="rounded-2xl p-6 text-center"
      style={{
        background: `${designTokens.colors.accent.gold}08`,
        border: `1px dashed ${designTokens.colors.secondary.stoneDark}`,
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 26px, ${designTokens.colors.secondary.stone}33 26px, ${designTokens.colors.secondary.stone}33 27px)`,
      }}
    >
      <BookOpen className="h-8 w-8 mx-auto mb-2" style={{ color: designTokens.colors.text.muted }} />
      <p className="text-sm font-medium mb-1" style={{ color: designTokens.colors.text.primary }}>
        まだ誰もノートを開いていません
      </p>
      <p className="text-xs mb-3" style={{ color: designTokens.colors.text.secondary }}>
        最初の「○○で待ち合わせしませんか？」を書いてみましょう
      </p>
      {canCreate && (
        <button
          onClick={onCreate}
          className="text-xs font-semibold inline-flex items-center gap-1 px-4 py-2 rounded-full"
          style={{
            background: designTokens.colors.accent.gold,
            color: designTokens.colors.text.primary,
            boxShadow: designTokens.elevation.subtle,
          }}
        >
          <Plus className="h-3 w-3" /> 最初のノートを開く
        </button>
      )}
    </div>
  );
}

function RoomNoteCard({ room, onClick }: { room: RoomWithStats; onClick: () => void }) {
  const badge = TYPE_BADGE[room.type];
  const Icon = badge.icon;
  const opens = new Date(room.opens_at);
  const now = new Date();
  const chatOpen = now >= opens && now <= new Date(room.closes_at);

  return (
    <motion.div
      whileHover={{ scale: 1.005, boxShadow: designTokens.elevation.medium }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="cursor-pointer rounded-2xl p-4 pl-6 relative"
      style={{
        background: designTokens.colors.background.white,
        border: `1px solid ${designTokens.colors.secondary.stone}40`,
        boxShadow: designTokens.elevation.subtle,
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 27px, ${designTokens.colors.secondary.stone}1f 27px, ${designTokens.colors.secondary.stone}1f 28px)`,
      }}
    >
      {/* ノートのバインダー風ドット */}
      <div className="absolute left-2 top-3 bottom-3 flex flex-col gap-2 opacity-50">
        <span className="block w-1.5 h-1.5 rounded-full" style={{ background: designTokens.colors.accent.gold }} />
        <span className="block w-1.5 h-1.5 rounded-full" style={{ background: designTokens.colors.accent.gold }} />
        <span className="block w-1.5 h-1.5 rounded-full" style={{ background: designTokens.colors.accent.gold }} />
      </div>

      <div className="flex items-start justify-between gap-2 mb-2">
        <p
          className="text-sm font-semibold leading-snug flex-1 min-w-0"
          style={{ color: designTokens.colors.text.primary, fontFamily: designTokens.typography.display }}
        >
          {room.title || '（無題のノート）'}
        </p>
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

      {room.description && (
        <p
          className="text-xs leading-relaxed mb-2 line-clamp-2"
          style={{ color: designTokens.colors.text.secondary }}
        >
          {room.description}
        </p>
      )}

      <div className="flex items-center gap-3 text-[11px]" style={{ color: designTokens.colors.text.muted }}>
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" />
          {room.participant_count} / {room.max_participants}名
        </span>
        <span
          className="inline-flex items-center gap-1"
          style={{ color: chatOpen ? designTokens.colors.functional.success : designTokens.colors.text.muted }}
        >
          <span className="block w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
          {chatOpen ? 'チャット解禁中' : `解禁: ${opens.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}`}
        </span>
      </div>
    </motion.div>
  );
}
