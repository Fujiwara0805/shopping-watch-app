'use server';

import jwt from 'jsonwebtoken';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase-server';
import { sendMeetupVerificationEmail } from '@/lib/services/email-service';

const VERIFY_PURPOSE = 'meetup_email_verify';
const VERIFY_TTL_SECONDS = 60 * 60 * 24; // 24h

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set');
  return secret;
}

export async function requestMeetupEmailVerification(): Promise<{ error: string | null }> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId || !email) return { error: 'unauthorized' };

  const { data: existing } = await supabaseServer
    .from('user_safety_profiles')
    .select('email_verified_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing?.email_verified_at) {
    return { error: 'already_verified' };
  }

  try {
    const token = jwt.sign(
      { sub: userId, purpose: VERIFY_PURPOSE, email },
      getSecret(),
      { algorithm: 'HS256', expiresIn: VERIFY_TTL_SECONDS }
    );
    await sendMeetupVerificationEmail({ to: email, verifyToken: token });
    return { error: null };
  } catch (e: any) {
    console.error('requestMeetupEmailVerification failed:', e?.message);
    return { error: e?.message ?? 'send_failed' };
  }
}

export async function verifyMeetupEmailToken(token: string): Promise<{ userId: string | null; error: string | null }> {
  try {
    const payload = jwt.verify(token, getSecret()) as { sub?: string; purpose?: string };
    if (!payload?.sub || payload.purpose !== VERIFY_PURPOSE) {
      return { userId: null, error: 'invalid_token' };
    }

    const now = new Date().toISOString();
    const { error } = await supabaseServer
      .from('user_safety_profiles')
      .upsert(
        { user_id: payload.sub, email_verified_at: now, updated_at: now },
        { onConflict: 'user_id' }
      );

    if (error) return { userId: null, error: error.message };
    return { userId: payload.sub, error: null };
  } catch (e: any) {
    return { userId: null, error: e?.message ?? 'verify_failed' };
  }
}

export async function getMyVerifiedStatus(): Promise<{ verified: boolean; email?: string | null }> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { verified: false };

  const { data } = await supabaseServer
    .from('user_safety_profiles')
    .select('email_verified_at')
    .eq('user_id', userId)
    .maybeSingle();

  return {
    verified: !!data?.email_verified_at,
    email: session.user.email,
  };
}

export async function getVerifiedUserIds(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];
  const { data } = await supabaseServer
    .from('user_safety_profiles')
    .select('user_id, email_verified_at')
    .in('user_id', userIds);
  return (data ?? [])
    .filter((r: any) => !!r.email_verified_at)
    .map((r: any) => r.user_id as string);
}
