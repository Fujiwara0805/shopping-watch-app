'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Send, Flag, LogIn, LogOut, Hash, Lock, Globe, Sparkles, Users, ShieldCheck } from 'lucide-react';
import { useMeetupRoom } from '@/lib/hooks/use-meetup-room';
import { supabase } from '@/lib/supabaseClient';
import { joinMeetupRoom, leaveMeetupRoom, reportMeetupUser } from '@/app/_actions/meetup';
import { getVerifiedUserIds } from '@/app/_actions/meetup-verify';
import { trackEvent } from '@/lib/services/analytics';

interface Props {
  roomId: string;
}

type Participant = {
  user_id: string;
  status: 'going' | 'maybe' | 'cancelled';
  email?: string;
  display_name?: string;
};

const TYPE_ICON = { open: Globe, host: Sparkles, closed: Lock } as const;

export function MeetupChatClient({ roomId }: Props) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const { room, messages, loading, error, sendMessage } = useMeetupRoom(roomId);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 参加者と email を取得
  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    (async () => {
      const { data: parts } = await supabase
        .from('meetup_participants')
        .select('user_id, status')
        .eq('room_id', roomId);

      if (!parts || cancelled) return;

      const userIds = parts.map((p) => p.user_id);
      const { data: users } = await supabase
        .from('app_users')
        .select('id, email')
        .in('id', userIds);

      const userMap = new Map((users ?? []).map((u: any) => [u.id, u]));
      if (cancelled) return;
      setParticipants(
        parts.map((p) => ({
          ...(p as any),
          email: userMap.get(p.user_id)?.email,
          display_name: deriveDisplayName(userMap.get(p.user_id)?.email),
        }))
      );

      const verified = await getVerifiedUserIds(userIds);
      if (!cancelled) setVerifiedIds(new Set(verified));
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const myParticipation = useMemo(
    () => participants.find((p) => p.user_id === userId),
    [participants, userId]
  );
  const goingCount = participants.filter((p) => p.status === 'going').length;

  const now = new Date();
  const opensAt = room ? new Date(room.opens_at) : null;
  const closesAt = room ? new Date(room.closes_at) : null;
  const chatOpen = !!opensAt && !!closesAt && now >= opensAt && now <= closesAt;
  const beforeWindow = !!opensAt && now < opensAt;
  const afterWindow = !!closesAt && now > closesAt;

  const handleJoin = () => {
    setActionMessage(null);
    startTransition(async () => {
      const res = await joinMeetupRoom(roomId, 'going');
      if (res.error) {
        setActionMessage(translateError(res.error));
        return;
      }
      trackEvent('meetup_join', { room_id: roomId, status: 'going' });
    });
  };

  const handleLeave = () => {
    if (!confirm('このノートから離脱しますか？')) return;
    setActionMessage(null);
    startTransition(async () => {
      const res = await leaveMeetupRoom(roomId);
      if (res.error) {
        setActionMessage(translateError(res.error));
        return;
      }
      trackEvent('meetup_leave', { room_id: roomId });
    });
  };

  const handleSend = async () => {
    if (!userId || !draft.trim()) return;
    setSending(true);
    const result = await sendMessage(userId, draft);
    setSending(false);
    if (result.error) {
      setActionMessage(translateError(result.error));
      return;
    }
    trackEvent('meetup_message_send', { room_id: roomId });
    setDraft('');
  };

  const handleReport = async (targetId: string) => {
    if (targetId === userId) return;
    const reason = prompt('通報理由（500 文字以内）');
    if (!reason) return;
    const res = await reportMeetupUser({ roomId, targetUserId: targetId, reason });
    if (res.error) {
      setActionMessage(translateError(res.error));
      return;
    }
    trackEvent('meetup_report', { room_id: roomId });
    setActionMessage('通報を受け付けました。');
  };

  if (loading) {
    return <FullScreen><p className="text-zinc-400 text-sm">読み込み中...</p></FullScreen>;
  }
  if (error || !room) {
    return (
      <FullScreen>
        <p className="text-zinc-300 text-sm mb-4">{error || 'ノートが見つかりませんでした。'}</p>
        <button
          onClick={() => router.back()}
          className="text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" /> 戻る
        </button>
      </FullScreen>
    );
  }

  const TypeIcon = TYPE_ICON[room.type];

  return (
    <div className="min-h-dvh flex flex-col bg-zinc-950 text-zinc-100">
      {/* Discord 風ヘッダー */}
      <header className="flex items-center gap-3 px-4 h-14 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-zinc-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Hash className="h-4 w-4 text-zinc-500" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{room.title || '（無題のノート）'}</p>
          <p className="text-[11px] text-zinc-500 inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <TypeIcon className="h-3 w-3" />
              {room.type === 'open' ? '公開' : room.type === 'host' ? 'ホスト' : '限定'}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {goingCount}/{room.max_participants}
            </span>
          </p>
        </div>
        {userId && !myParticipation && (
          <button
            onClick={handleJoin}
            disabled={isPending}
            className="text-xs px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white inline-flex items-center gap-1"
          >
            <LogIn className="h-3 w-3" /> 参加
          </button>
        )}
        {userId && myParticipation && myParticipation.status === 'going' && (
          <button
            onClick={handleLeave}
            disabled={isPending}
            className="text-xs px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 inline-flex items-center gap-1"
          >
            <LogOut className="h-3 w-3" /> 離脱
          </button>
        )}
      </header>

      {/* 説明 */}
      {room.description && (
        <div className="px-4 py-2 bg-zinc-900/50 border-b border-zinc-800/50 text-xs text-zinc-400">
          {room.description}
        </div>
      )}

      {/* メッセージ */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-zinc-500 text-center py-8">
            まだメッセージはありません。「○○で会いましょう」と書き込んでみよう。
          </p>
        )}
        {messages.map((m) => {
          const author = participants.find((p) => p.user_id === m.user_id);
          const name = author?.display_name ?? 'ゲスト';
          const isMine = m.user_id === userId;
          return (
            <MessageRow
              key={m.id}
              name={name}
              body={m.body}
              createdAt={m.created_at}
              avatarSeed={author?.email ?? m.user_id}
              verified={verifiedIds.has(m.user_id)}
              canReport={!isMine && !!userId}
              onReport={() => handleReport(m.user_id)}
            />
          );
        })}
      </div>

      {/* 入力欄 */}
      <div className="border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky bottom-0">
        {actionMessage && (
          <div className="px-4 py-2 text-[11px] text-amber-300 bg-amber-900/20 border-b border-amber-900/40">
            {actionMessage}
          </div>
        )}
        {status === 'unauthenticated' ? (
          <div className="px-4 py-3 text-xs text-zinc-400 text-center">
            書き込みにはログインが必要です。
          </div>
        ) : !myParticipation || myParticipation.status !== 'going' ? (
          <div className="px-4 py-3 text-xs text-zinc-400 text-center">
            ノートに「参加」してから書き込めます。
          </div>
        ) : beforeWindow ? (
          <div className="px-4 py-3 text-xs text-zinc-400 text-center">
            チャットは {opensAt!.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} に解禁されます。
          </div>
        ) : afterWindow ? (
          <div className="px-4 py-3 text-xs text-zinc-400 text-center">
            チャット期間は終了しました。履歴のみ閲覧できます。
          </div>
        ) : (
          <form
            className="flex items-center gap-2 px-3 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={1000}
              placeholder={`#${room.title || 'ノート'} へメッセージを送信`}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40"
              aria-label="送信"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function MessageRow({
  name,
  body,
  createdAt,
  avatarSeed,
  verified,
  canReport,
  onReport,
}: {
  name: string;
  body: string;
  createdAt: string;
  avatarSeed: string;
  verified: boolean;
  canReport: boolean;
  onReport: () => void;
}) {
  const initial = (name[0] ?? '?').toUpperCase();
  const color = colorFromSeed(avatarSeed);
  const time = new Date(createdAt).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <div className="group flex gap-3">
      <div
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white"
        style={{ background: color }}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-zinc-100 truncate">{name}</span>
          {verified && (
            <span
              title="メール確認済み"
              className="inline-flex items-center text-emerald-400"
            >
              <ShieldCheck className="h-3 w-3" />
            </span>
          )}
          <span className="text-[10px] text-zinc-500">{time}</span>
          {canReport && (
            <button
              onClick={onReport}
              className="opacity-0 group-hover:opacity-100 text-[10px] text-zinc-500 hover:text-amber-400 inline-flex items-center gap-0.5 transition-opacity"
              title="このメッセージを通報"
            >
              <Flag className="h-2.5 w-2.5" /> 通報
            </button>
          )}
        </div>
        <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">{body}</p>
      </div>
    </div>
  );
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 px-4">
      {children}
    </div>
  );
}

function deriveDisplayName(email?: string | null): string | undefined {
  if (!email) return undefined;
  const local = email.split('@')[0];
  return local.length > 16 ? `${local.slice(0, 16)}…` : local;
}

function colorFromSeed(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

function translateError(code: string | null): string {
  switch (code) {
    case 'unauthorized':
      return 'ログインが必要です。';
    case 'room_full':
      return 'このノートは満員です。';
    case 'room_not_found':
      return 'ノートが見つかりませんでした。';
    case 'cannot_report_self':
      return '自分自身への通報はできません。';
    case 'invalid_body':
      return 'メッセージは 1〜1000 文字で入力してください。';
    case 'meetup_message_rate_limit_exceeded':
      return '少し時間を空けてから再度送信してください。';
    case 'verification_required':
      return 'ホストルーム参加にはメールアドレスの確認（Verified）が必要です。';
    case 'suspended':
      return 'アカウントが一時的に制限されています。';
    default:
      return code ?? 'エラーが発生しました。';
  }
}
