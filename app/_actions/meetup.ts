'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase-server';
import { getUserTier, tierAtLeast } from '@/lib/services/subscription';
import { revalidatePath } from 'next/cache';

export type MeetupRoomType = 'open' | 'host' | 'closed';
export type MeetupParticipantStatus = 'going' | 'maybe' | 'cancelled';

const DAY_MS = 24 * 60 * 60 * 1000;

async function requireUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function createMeetupRoom(input: {
  postId: string;
  type: MeetupRoomType;
  title?: string;
  description?: string;
  maxParticipants?: number;
}): Promise<{ roomId: string | null; error: string | null }> {
  const userId = await requireUserId();
  if (!userId) return { roomId: null, error: 'unauthorized' };

  if (input.type === 'closed') {
    const tier = await getUserTier(userId);
    if (!tierAtLeast(tier, 'plus')) {
      return { roomId: null, error: 'plus_required' };
    }
  }

  const { data: post, error: postErr } = await supabaseServer
    .from('posts')
    .select('event_start_date, event_end_date')
    .eq('id', input.postId)
    .single();

  if (postErr || !post?.event_start_date) {
    return { roomId: null, error: 'post_not_found_or_no_event_date' };
  }

  const start = new Date(post.event_start_date);
  const end = new Date(post.event_end_date ?? post.event_start_date);
  const opensAt = new Date(start.getTime() - DAY_MS);
  const closesAt = new Date(end.getTime() + 2 * DAY_MS);

  const { data: room, error } = await supabaseServer
    .from('meetup_rooms')
    .insert({
      post_id: input.postId,
      type: input.type,
      host_user_id: userId,
      title: input.title ?? null,
      description: input.description ?? null,
      max_participants: input.maxParticipants ?? 8,
      opens_at: opensAt.toISOString(),
      closes_at: closesAt.toISOString(),
    })
    .select('id')
    .single();

  if (error || !room) {
    console.error('createMeetupRoom error:', error);
    return { roomId: null, error: error?.message ?? 'insert_failed' };
  }

  await supabaseServer
    .from('meetup_participants')
    .insert({ room_id: room.id, user_id: userId, status: 'going' });

  revalidatePath(`/post/${input.postId}`);
  return { roomId: room.id, error: null };
}

export async function joinMeetupRoom(
  roomId: string,
  status: MeetupParticipantStatus = 'going'
): Promise<{ error: string | null }> {
  const userId = await requireUserId();
  if (!userId) return { error: 'unauthorized' };

  const { data: room } = await supabaseServer
    .from('meetup_rooms')
    .select('id, type, max_participants')
    .eq('id', roomId)
    .single();
  if (!room) return { error: 'room_not_found' };

  if (status === 'going') {
    if (room.type === 'host') {
      const { data: safety } = await supabaseServer
        .from('user_safety_profiles')
        .select('email_verified_at, is_suspended')
        .eq('user_id', userId)
        .maybeSingle();
      if (safety?.is_suspended) return { error: 'suspended' };
      if (!safety?.email_verified_at) return { error: 'verification_required' };
    }

    const { count } = await supabaseServer
      .from('meetup_participants')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .eq('status', 'going');
    if ((count ?? 0) >= room.max_participants) {
      return { error: 'room_full' };
    }
  }

  const { error } = await supabaseServer
    .from('meetup_participants')
    .upsert(
      { room_id: roomId, user_id: userId, status },
      { onConflict: 'room_id,user_id' }
    );

  if (error) return { error: error.message };
  return { error: null };
}

export async function leaveMeetupRoom(
  roomId: string
): Promise<{ error: string | null }> {
  const userId = await requireUserId();
  if (!userId) return { error: 'unauthorized' };

  const { error } = await supabaseServer
    .from('meetup_participants')
    .update({ status: 'cancelled' })
    .eq('room_id', roomId)
    .eq('user_id', userId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function reportMeetupUser(input: {
  roomId?: string;
  targetUserId: string;
  reason: string;
}): Promise<{ error: string | null }> {
  const userId = await requireUserId();
  if (!userId) return { error: 'unauthorized' };
  if (userId === input.targetUserId) return { error: 'cannot_report_self' };
  if (!input.reason || input.reason.length > 500) return { error: 'invalid_reason' };

  const { error } = await supabaseServer.from('meetup_reports').insert({
    room_id: input.roomId ?? null,
    reporter_id: userId,
    target_user_id: input.targetUserId,
    reason: input.reason,
  });
  if (error) return { error: error.message };

  const { count } = await supabaseServer
    .from('meetup_reports')
    .select('*', { count: 'exact', head: true })
    .eq('target_user_id', input.targetUserId)
    .eq('status', 'pending');

  if ((count ?? 0) >= 3) {
    await supabaseServer
      .from('user_safety_profiles')
      .upsert(
        {
          user_id: input.targetUserId,
          is_suspended: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
  }

  return { error: null };
}

export type MyMeetupRoom = {
  room_id: string;
  post_id: string;
  type: 'open' | 'host' | 'closed';
  title: string | null;
  opens_at: string;
  closes_at: string;
  status: 'going' | 'maybe' | 'cancelled';
  event_name: string | null;
  store_name: string | null;
  event_start_date: string | null;
};

export async function getMyMeetupRooms(): Promise<MyMeetupRoom[]> {
  const userId = await requireUserId();
  if (!userId) return [];

  const { data: parts } = await supabaseServer
    .from('meetup_participants')
    .select('room_id, status, joined_at')
    .eq('user_id', userId)
    .neq('status', 'cancelled')
    .order('joined_at', { ascending: false });

  const roomIds = (parts ?? []).map((p: any) => p.room_id);
  if (roomIds.length === 0) return [];

  const { data: rooms } = await supabaseServer
    .from('meetup_rooms')
    .select('id, post_id, type, title, opens_at, closes_at')
    .in('id', roomIds);
  if (!rooms || rooms.length === 0) return [];

  const postIds = Array.from(new Set(rooms.map((r: any) => r.post_id)));
  const { data: posts } = await supabaseServer
    .from('posts')
    .select('id, event_name, store_name, event_start_date')
    .in('id', postIds);

  const postMap = new Map((posts ?? []).map((p: any) => [p.id, p]));
  const partMap = new Map((parts ?? []).map((p: any) => [p.room_id, p]));

  return rooms.map((r: any) => {
    const post = postMap.get(r.post_id);
    const part = partMap.get(r.id);
    return {
      room_id: r.id,
      post_id: r.post_id,
      type: r.type,
      title: r.title,
      opens_at: r.opens_at,
      closes_at: r.closes_at,
      status: part?.status ?? 'going',
      event_name: post?.event_name ?? null,
      store_name: post?.store_name ?? null,
      event_start_date: post?.event_start_date ?? null,
    };
  });
}

export async function checkInMeetupRoom(input: {
  roomId: string;
  metUserIds?: string[];
  lat?: number;
  lng?: number;
}): Promise<{ error: string | null }> {
  const userId = await requireUserId();
  if (!userId) return { error: 'unauthorized' };

  const { error } = await supabaseServer
    .from('meetup_checkins')
    .upsert(
      {
        room_id: input.roomId,
        user_id: userId,
        met_user_ids: input.metUserIds ?? [],
        at_lat: input.lat ?? null,
        at_lng: input.lng ?? null,
        checked_at: new Date().toISOString(),
      },
      { onConflict: 'room_id,user_id' }
    );

  if (error) return { error: error.message };
  return { error: null };
}
