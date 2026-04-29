'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export type AdminMeetupReport = {
  id: string;
  room_id: string | null;
  reporter_id: string;
  target_user_id: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  created_at: string;
  reporter_email: string | null;
  target_email: string | null;
  target_is_suspended: boolean;
  room_title: string | null;
};

async function requireAdmin(): Promise<{ adminId: string | null; error: string | null }> {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user?.id) return { adminId: null, error: 'unauthorized' };
  if (role !== 'admin') return { adminId: null, error: 'forbidden' };
  return { adminId: session.user.id, error: null };
}

export async function isMeetupAdmin(): Promise<boolean> {
  const { adminId } = await requireAdmin();
  return !!adminId;
}

export async function listMeetupReports(includeResolved = false): Promise<AdminMeetupReport[]> {
  const { adminId, error } = await requireAdmin();
  if (error || !adminId) return [];

  let query = supabaseServer
    .from('meetup_reports')
    .select('id, room_id, reporter_id, target_user_id, reason, status, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (!includeResolved) {
    query = query.eq('status', 'pending');
  }

  const { data: reports, error: reportErr } = await query;
  if (reportErr || !reports) return [];

  const userIds = Array.from(
    new Set(reports.flatMap((r: any) => [r.reporter_id, r.target_user_id]))
  );
  const roomIds = Array.from(
    new Set(reports.map((r: any) => r.room_id).filter(Boolean))
  );

  const [{ data: users }, { data: safety }, { data: rooms }] = await Promise.all([
    userIds.length
      ? supabaseServer.from('app_users').select('id, email').in('id', userIds)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? supabaseServer
          .from('user_safety_profiles')
          .select('user_id, is_suspended')
          .in('user_id', userIds)
      : Promise.resolve({ data: [] }),
    roomIds.length
      ? supabaseServer.from('meetup_rooms').select('id, title').in('id', roomIds)
      : Promise.resolve({ data: [] }),
  ]);

  const userMap = new Map((users ?? []).map((u: any) => [u.id, u.email]));
  const safetyMap = new Map((safety ?? []).map((s: any) => [s.user_id, !!s.is_suspended]));
  const roomMap = new Map((rooms ?? []).map((r: any) => [r.id, r.title]));

  return reports.map((r: any) => ({
    id: r.id,
    room_id: r.room_id,
    reporter_id: r.reporter_id,
    target_user_id: r.target_user_id,
    reason: r.reason,
    status: r.status,
    created_at: r.created_at,
    reporter_email: userMap.get(r.reporter_id) ?? null,
    target_email: userMap.get(r.target_user_id) ?? null,
    target_is_suspended: safetyMap.get(r.target_user_id) ?? false,
    room_title: r.room_id ? roomMap.get(r.room_id) ?? null : null,
  }));
}

export async function setMeetupReportStatus(
  reportId: string,
  status: 'reviewed' | 'dismissed'
): Promise<{ error: string | null }> {
  const { error } = await requireAdmin();
  if (error) return { error };

  const { error: updateErr } = await supabaseServer
    .from('meetup_reports')
    .update({ status })
    .eq('id', reportId);
  if (updateErr) return { error: updateErr.message };

  revalidatePath('/admin/meetup-reports');
  return { error: null };
}

export async function setUserSuspended(
  userId: string,
  suspended: boolean
): Promise<{ error: string | null }> {
  const { error } = await requireAdmin();
  if (error) return { error };

  const { error: upsertErr } = await supabaseServer
    .from('user_safety_profiles')
    .upsert(
      {
        user_id: userId,
        is_suspended: suspended,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  if (upsertErr) return { error: upsertErr.message };

  revalidatePath('/admin/meetup-reports');
  return { error: null };
}
