import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listMeetupReports } from '@/app/_actions/meetup-admin';
import { MeetupReportsTable } from '@/components/admin/meetup-reports-table';
import { ShieldAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '待ち合わせ通報管理 | TALE Admin',
  robots: { index: false, follow: false },
};

export default async function MeetupReportsAdminPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session?.user?.id) {
    redirect('/login?next=/admin/meetup-reports');
  }
  if (role !== 'admin') {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-zinc-50 px-6">
        <div className="rounded-2xl bg-white border border-zinc-200 p-8 max-w-md text-center shadow-sm">
          <ShieldAlert className="h-10 w-10 mx-auto mb-3 text-amber-500" />
          <h1 className="text-lg font-semibold mb-1">権限がありません</h1>
          <p className="text-sm text-zinc-600">この画面は管理者のみ利用できます。</p>
        </div>
      </div>
    );
  }

  const reports = await listMeetupReports(true);

  return (
    <div className="min-h-dvh bg-zinc-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <ShieldAlert className="h-6 w-6 text-amber-600" />
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">待ち合わせ通報管理</h1>
            <p className="text-xs text-zinc-500">
              通報レコードを確認し、対象ユーザーの凍結／凍結解除を管理します。
            </p>
          </div>
        </div>
        <MeetupReportsTable initialReports={reports} />
      </div>
    </div>
  );
}
