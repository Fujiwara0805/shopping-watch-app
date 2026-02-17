import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

/**
 * GET /api/gtfs/stops?swLat=...&swLng=...&neLat=...&neLng=...
 * マップ範囲内のGTFSバス停を取得
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const swLat = parseFloat(searchParams.get('swLat') || '');
  const swLng = parseFloat(searchParams.get('swLng') || '');
  const neLat = parseFloat(searchParams.get('neLat') || '');
  const neLng = parseFloat(searchParams.get('neLng') || '');

  if (isNaN(swLat) || isNaN(swLng) || isNaN(neLat) || isNaN(neLng)) {
    return NextResponse.json({ error: 'swLat, swLng, neLat, neLng は必須です。' }, { status: 400 });
  }

  const { data: stops, error } = await supabaseServer
    .from('gtfs_stops')
    .select('stop_id, stop_name, stop_lat, stop_lon')
    .gte('stop_lat', swLat)
    .lte('stop_lat', neLat)
    .gte('stop_lon', swLng)
    .lte('stop_lon', neLng)
    .or('location_type.eq.0,location_type.eq.1,location_type.is.null')
    .limit(200);

  if (error) {
    console.error('[GTFS Stops] GET error:', error.message);
    return NextResponse.json({ error: 'バス停データの取得に失敗しました。' }, { status: 500 });
  }

  return NextResponse.json({ stops: stops ?? [] });
}
