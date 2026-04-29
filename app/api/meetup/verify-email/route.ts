import { NextRequest, NextResponse } from 'next/server';
import { verifyMeetupEmailToken } from '@/app/_actions/meetup-verify';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const redirectBase = appUrl.replace(/\/$/, '') || req.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(`${redirectBase}/meetup?meetup_verify=missing_token`);
  }

  const { error } = await verifyMeetupEmailToken(token);
  if (error) {
    return NextResponse.redirect(`${redirectBase}/meetup?meetup_verify=error&reason=${encodeURIComponent(error)}`);
  }
  return NextResponse.redirect(`${redirectBase}/meetup?meetup_verify=ok`);
}
