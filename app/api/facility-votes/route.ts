import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

/**
 * GET /api/facility-votes?facility_report_id=xxx&voter_fingerprint=yyy
 * 施設の投票結果を取得
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const facilityReportId = searchParams.get('facility_report_id');
  const voterFingerprint = searchParams.get('voter_fingerprint');

  if (!facilityReportId) {
    return NextResponse.json({ error: 'facility_report_id は必須です。' }, { status: 400 });
  }

  // 投票カウントを取得
  const { data: votes, error } = await supabaseServer
    .from('facility_votes')
    .select('vote_type')
    .eq('facility_report_id', facilityReportId);

  if (error) {
    console.error('[FacilityVotes] GET error:', error.message);
    return NextResponse.json({ error: '投票データの取得に失敗しました。' }, { status: 500 });
  }

  const existsCount = (votes ?? []).filter(v => v.vote_type === 'exists').length;
  const notExistsCount = (votes ?? []).filter(v => v.vote_type === 'not_exists').length;

  // ユーザーの投票状態を確認
  let userVoted: string | null = null;
  if (voterFingerprint) {
    const userVote = (votes ?? []).find((v: any) => false); // voterFingerprintではフィルタ不可（selectにないため）
    // 別クエリで取得
    const { data: userVoteData } = await supabaseServer
      .from('facility_votes')
      .select('vote_type')
      .eq('facility_report_id', facilityReportId)
      .eq('voter_fingerprint', voterFingerprint)
      .maybeSingle();

    userVoted = userVoteData?.vote_type || null;
  }

  return NextResponse.json({
    exists_count: existsCount,
    not_exists_count: notExistsCount,
    user_voted: userVoted,
  });
}

/**
 * POST /api/facility-votes
 * 施設の存在確認投票（UPSERT）
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { facility_report_id, vote_type, voter_fingerprint } = body;

  if (!facility_report_id || !vote_type || !voter_fingerprint) {
    return NextResponse.json({ error: '必須項目が不足しています。' }, { status: 400 });
  }

  if (!['exists', 'not_exists'].includes(vote_type)) {
    return NextResponse.json({ error: 'vote_type は exists または not_exists を指定してください。' }, { status: 400 });
  }

  // UPSERT: 同じfingerprint + facility_report_idの組み合わせがあれば更新
  const { data: existing } = await supabaseServer
    .from('facility_votes')
    .select('id, vote_type')
    .eq('facility_report_id', facility_report_id)
    .eq('voter_fingerprint', voter_fingerprint)
    .maybeSingle();

  if (existing) {
    if (existing.vote_type === vote_type) {
      // 同じ投票の場合は取り消し（削除）
      await supabaseServer
        .from('facility_votes')
        .delete()
        .eq('id', existing.id);
    } else {
      // 違う投票の場合は更新
      await supabaseServer
        .from('facility_votes')
        .update({ vote_type })
        .eq('id', existing.id);
    }
  } else {
    // 新規投票
    const { error: insertError } = await supabaseServer
      .from('facility_votes')
      .insert({
        facility_report_id,
        vote_type,
        voter_fingerprint,
      });

    if (insertError) {
      console.error('[FacilityVotes] POST error:', insertError.message);
      return NextResponse.json({ error: '投票に失敗しました。' }, { status: 500 });
    }
  }

  // 更新後のカウントを返却
  const { data: votes } = await supabaseServer
    .from('facility_votes')
    .select('vote_type')
    .eq('facility_report_id', facility_report_id);

  const existsCount = (votes ?? []).filter(v => v.vote_type === 'exists').length;
  const notExistsCount = (votes ?? []).filter(v => v.vote_type === 'not_exists').length;

  // ユーザーの現在の投票状態
  const { data: userVoteData } = await supabaseServer
    .from('facility_votes')
    .select('vote_type')
    .eq('facility_report_id', facility_report_id)
    .eq('voter_fingerprint', voter_fingerprint)
    .maybeSingle();

  return NextResponse.json({
    exists_count: existsCount,
    not_exists_count: notExistsCount,
    user_voted: userVoteData?.vote_type || null,
  });
}
