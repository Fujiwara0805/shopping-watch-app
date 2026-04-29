'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type MeetupMessage = {
  id: string;
  room_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export type MeetupRoom = {
  id: string;
  post_id: string;
  type: 'open' | 'host' | 'closed';
  host_user_id: string | null;
  title: string | null;
  description: string | null;
  max_participants: number;
  opens_at: string;
  closes_at: string;
};

export function useMeetupRoom(roomId: string | null) {
  const [room, setRoom] = useState<MeetupRoom | null>(null);
  const [messages, setMessages] = useState<MeetupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      const [{ data: roomData, error: roomErr }, { data: msgData, error: msgErr }] =
        await Promise.all([
          supabase.from('meetup_rooms').select('*').eq('id', roomId).single(),
          supabase
            .from('meetup_messages')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true }),
        ]);

      if (cancelled) return;

      if (roomErr) {
        setError(roomErr.message);
      } else {
        setRoom(roomData as MeetupRoom);
      }
      if (!msgErr && msgData) {
        setMessages(msgData as MeetupMessage[]);
      }
      setLoading(false);
    })();

    const channel = supabase
      .channel(`meetup_room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'meetup_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages((prev) => {
            const next = payload.new as MeetupMessage;
            if (prev.some((m) => m.id === next.id)) return prev;
            return [...prev, next];
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const sendMessage = useCallback(
    async (userId: string, body: string) => {
      if (!roomId) return { error: 'no_room' };
      const trimmed = body.trim();
      if (!trimmed || trimmed.length > 1000) return { error: 'invalid_body' };
      const { error: insertErr } = await supabase.from('meetup_messages').insert({
        room_id: roomId,
        user_id: userId,
        body: trimmed,
      });
      return { error: insertErr?.message ?? null };
    },
    [roomId]
  );

  return { room, messages, loading, error, sendMessage };
}
