'use client';

import { useState, useTransition } from 'react';
import {
  setMeetupReportStatus,
  setUserSuspended,
  type AdminMeetupReport,
} from '@/app/_actions/meetup-admin';
import { Check, X, ShieldAlert, ShieldOff, RefreshCcw } from 'lucide-react';

interface Props {
  initialReports: AdminMeetupReport[];
}

export function MeetupReportsTable({ initialReports }: Props) {
  const [reports, setReports] = useState<AdminMeetupReport[]>(initialReports);
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [error, setError] = useState<string | null>(null);

  const visible = filter === 'pending' ? reports.filter((r) => r.status === 'pending') : reports;

  const updateLocal = (id: string, patch: Partial<AdminMeetupReport>) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleStatus = (id: string, status: 'reviewed' | 'dismissed') => {
    setError(null);
    startTransition(async () => {
      const res = await setMeetupReportStatus(id, status);
      if (res.error) {
        setError(res.error);
        return;
      }
      updateLocal(id, { status });
    });
  };

  const handleSuspend = (userId: string, suspended: boolean) => {
    setError(null);
    startTransition(async () => {
      const res = await setUserSuspended(userId, suspended);
      if (res.error) {
        setError(res.error);
        return;
      }
      setReports((prev) =>
        prev.map((r) =>
          r.target_user_id === userId ? { ...r, target_is_suspended: suspended } : r
        )
      );
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('pending')}
          className={`text-xs px-3 py-1.5 rounded-full ${
            filter === 'pending'
              ? 'bg-amber-500 text-white font-semibold'
              : 'bg-zinc-100 text-zinc-600'
          }`}
        >
          未対応のみ
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`text-xs px-3 py-1.5 rounded-full ${
            filter === 'all' ? 'bg-zinc-700 text-white font-semibold' : 'bg-zinc-100 text-zinc-600'
          }`}
        >
          全件
        </button>
        <span className="text-xs text-zinc-500 ml-auto">
          {visible.length}件 / 全{reports.length}件
        </span>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 px-6 py-10 text-center text-sm text-zinc-500">
          {filter === 'pending' ? '未対応の通報はありません。' : '通報レコードがありません。'}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              busy={isPending}
              onStatus={(s) => handleStatus(r.id, s)}
              onSuspend={(s) => handleSuspend(r.target_user_id, s)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReportCard({
  report,
  busy,
  onStatus,
  onSuspend,
}: {
  report: AdminMeetupReport;
  busy: boolean;
  onStatus: (s: 'reviewed' | 'dismissed') => void;
  onSuspend: (s: boolean) => void;
}) {
  const time = new Date(report.created_at).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const statusBadge = {
    pending: { text: '未対応', cls: 'bg-amber-100 text-amber-800' },
    reviewed: { text: '対応済', cls: 'bg-emerald-100 text-emerald-800' },
    dismissed: { text: '却下', cls: 'bg-zinc-200 text-zinc-700' },
  }[report.status];

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="text-xs text-zinc-500">{time}</div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusBadge.cls}`}>
          {statusBadge.text}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 text-xs">
        <div>
          <div className="text-zinc-500 mb-0.5">対象ユーザー</div>
          <div className="font-mono text-zinc-800 truncate">{report.target_email ?? report.target_user_id}</div>
          {report.target_is_suspended && (
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
              <ShieldAlert className="h-2.5 w-2.5" /> 凍結中
            </span>
          )}
        </div>
        <div>
          <div className="text-zinc-500 mb-0.5">通報者</div>
          <div className="font-mono text-zinc-800 truncate">{report.reporter_email ?? report.reporter_id}</div>
        </div>
        <div>
          <div className="text-zinc-500 mb-0.5">ルーム</div>
          <div className="text-zinc-800 truncate">{report.room_title || '（不明 / 削除済）'}</div>
        </div>
      </div>

      <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3 text-sm text-zinc-800 whitespace-pre-wrap break-words mb-3">
        {report.reason}
      </div>

      <div className="flex flex-wrap gap-2">
        {report.status === 'pending' && (
          <>
            <button
              onClick={() => onStatus('reviewed')}
              disabled={busy}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <Check className="h-3 w-3" /> 対応済にする
            </button>
            <button
              onClick={() => onStatus('dismissed')}
              disabled={busy}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-zinc-200 text-zinc-700 hover:bg-zinc-300 disabled:opacity-50"
            >
              <X className="h-3 w-3" /> 却下
            </button>
          </>
        )}
        {report.status !== 'pending' && (
          <button
            onClick={() => onStatus('reviewed' === report.status ? 'dismissed' : 'reviewed')}
            disabled={busy}
            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-zinc-100 text-zinc-700 hover:bg-zinc-200 disabled:opacity-50"
          >
            <RefreshCcw className="h-3 w-3" /> ステータス切替
          </button>
        )}
        <button
          onClick={() => onSuspend(!report.target_is_suspended)}
          disabled={busy}
          className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md disabled:opacity-50 ${
            report.target_is_suspended
              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
              : 'bg-red-600 text-white hover:bg-red-500'
          }`}
        >
          {report.target_is_suspended ? (
            <>
              <ShieldOff className="h-3 w-3" /> 凍結解除
            </>
          ) : (
            <>
              <ShieldAlert className="h-3 w-3" /> 対象を凍結
            </>
          )}
        </button>
      </div>
    </div>
  );
}
