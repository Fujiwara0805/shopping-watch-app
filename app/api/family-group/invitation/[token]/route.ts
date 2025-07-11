import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 招待情報を取得
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json({ error: '招待トークンが必要です' }, { status: 400 });
    }

    // 招待情報を取得
    const { data: invitation, error: invitationError } = await supabase
      .from('family_group_invitations')
      .select(`
        id,
        group_id,
        invitee_email,
        status,
        expires_at,
        family_groups (
          id,
          name,
          owner_id
        )
      `)
      .eq('token', token)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json({ error: '無効な招待トークンです' }, { status: 404 });
    }

    return NextResponse.json({ invitation });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
