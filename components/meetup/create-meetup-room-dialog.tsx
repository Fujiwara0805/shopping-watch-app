'use client';

import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BookOpen, Globe, Lock, Sparkles } from 'lucide-react';
import { designTokens } from '@/lib/constants';
import { createMeetupRoom, type MeetupRoomType } from '@/app/_actions/meetup';
import { trackEvent } from '@/lib/services/analytics';

interface Props {
  open: boolean;
  onClose: () => void;
  postId: string;
  eventName?: string;
  onCreated: (roomId: string) => void;
}

const TYPE_CHOICES: { value: MeetupRoomType; label: string; icon: typeof Globe; description: string }[] = [
  {
    value: 'open',
    label: '公開',
    icon: Globe,
    description: '誰でも参加表明できるノート。一人参加が一番安心。',
  },
  {
    value: 'host',
    label: 'ホスト',
    icon: Sparkles,
    description: '自分がホストとして当日を取り仕切るノート。',
  },
  {
    value: 'closed',
    label: '限定',
    icon: Lock,
    description: '招待した人だけが入れるノート。MVP では URL を直接共有して招待。',
  },
];

export function CreateMeetupRoomDialog({ open, onClose, postId, eventName, onCreated }: Props) {
  const [type, setType] = useState<MeetupRoomType>('open');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(8);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const res = await createMeetupRoom({
        postId,
        type,
        title: title.trim() || (eventName ? `${eventName}で待ち合わせ` : '待ち合わせノート'),
        description: description.trim() || undefined,
        maxParticipants,
      });
      if (res.error || !res.roomId) {
        setError(translateError(res.error));
        return;
      }
      trackEvent('meetup_room_create', { post_id: postId, type });
      onClose();
      onCreated(res.roomId);
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-5 w-5" style={{ color: designTokens.colors.accent.goldDark }} />
            <DialogTitle style={{ fontFamily: designTokens.typography.display }}>新しい待ち合わせノート</DialogTitle>
          </div>
          <DialogDescription>
            このイベントを口実に集まるためのノートを開きます。1on1 ではなくグループでの合流が前提です。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-xs font-semibold mb-2 block" style={{ color: designTokens.colors.text.secondary }}>
              ノートの種類
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {TYPE_CHOICES.map((c) => {
                const Icon = c.icon;
                const active = type === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setType(c.value)}
                    className="rounded-xl px-2 py-3 text-xs flex flex-col items-center gap-1 transition-all"
                    style={{
                      background: active ? designTokens.colors.accent.gold : designTokens.colors.background.cloud,
                      color: active ? designTokens.colors.text.primary : designTokens.colors.text.secondary,
                      border: `1px ${active ? 'solid' : 'dashed'} ${active ? designTokens.colors.accent.goldDark : designTokens.colors.secondary.stone}`,
                      fontWeight: active ? 700 : 500,
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    {c.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] mt-2 leading-relaxed" style={{ color: designTokens.colors.text.muted }}>
              {TYPE_CHOICES.find((c) => c.value === type)?.description}
            </p>
          </div>

          <div>
            <Label htmlFor="meetup-title" className="text-xs font-semibold mb-1 block" style={{ color: designTokens.colors.text.secondary }}>
              タイトル
            </Label>
            <Input
              id="meetup-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={eventName ? `例: ${eventName}で待ち合わせしませんか？` : '例: 一緒に行きませんか？'}
              maxLength={80}
            />
          </div>

          <div>
            <Label htmlFor="meetup-desc" className="text-xs font-semibold mb-1 block" style={{ color: designTokens.colors.text.secondary }}>
              ひとこと（任意）
            </Label>
            <Textarea
              id="meetup-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="現地集合・解散OK、子連れ歓迎、など"
              maxLength={300}
              rows={3}
            />
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1 block" style={{ color: designTokens.colors.text.secondary }}>
              定員（2〜50名）
            </Label>
            <Input
              type="number"
              min={2}
              max={50}
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(Math.max(2, Math.min(50, Number(e.target.value) || 8)))}
            />
          </div>

          {error && (
            <p className="text-xs" style={{ color: designTokens.colors.functional.error }}>
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isPending}>
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={isPending}
              style={{
                background: designTokens.colors.accent.lilac,
                color: designTokens.colors.text.inverse,
              }}
            >
              {isPending ? '作成中...' : 'ノートを開く'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function translateError(code: string | null): string {
  switch (code) {
    case 'unauthorized':
      return 'ログインが必要です。';
    case 'post_not_found_or_no_event_date':
      return 'このイベントには開催日が設定されていないため、ノートを開けません。';
    case 'plus_required':
      return '限定ノートの作成には Plus 以上のプランが必要です。';
    default:
      return code ? `作成に失敗しました（${code}）` : '作成に失敗しました。';
  }
}
