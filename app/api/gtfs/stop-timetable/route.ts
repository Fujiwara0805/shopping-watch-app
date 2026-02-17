import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

/**
 * GET /api/gtfs/stop-timetable?stop_id=xxx
 * バス停の路線一覧＋時刻表を取得
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stopId = searchParams.get('stop_id');

  if (!stopId) {
    return NextResponse.json({ error: 'stop_id は必須です。' }, { status: 400 });
  }

  // バス停情報
  const { data: stop } = await supabaseServer
    .from('gtfs_stops')
    .select('stop_id, stop_name, stop_lat, stop_lon')
    .eq('stop_id', stopId)
    .single();

  if (!stop) {
    return NextResponse.json({ error: 'バス停が見つかりません。' }, { status: 404 });
  }

  // このバス停の発着情報をJOINで取得
  // stop_times -> trips -> routes
  const { data: stopTimes, error } = await supabaseServer
    .from('gtfs_stop_times')
    .select(`
      departure_time,
      stop_sequence,
      trip_id,
      gtfs_trips!inner(
        trip_id,
        trip_headsign,
        direction_id,
        service_id,
        route_id,
        gtfs_routes!inner(
          route_id,
          route_short_name,
          route_long_name,
          route_color
        )
      )
    `)
    .eq('stop_id', stopId)
    .order('departure_time', { ascending: true })
    .limit(500);

  if (error) {
    console.error('[GTFS StopTimetable] GET error:', error.message);
    return NextResponse.json({ error: '時刻表の取得に失敗しました。' }, { status: 500 });
  }

  // 今日の曜日を取得してカレンダーフィルタ
  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayDay = dayNames[now.getDay()];
  const todayStr = now.toISOString().slice(0, 10).replace(/-/g, '');

  // サービスIDからカレンダー情報を取得
  const serviceIds = Array.from(new Set((stopTimes ?? []).map((st: any) => st.gtfs_trips?.service_id).filter(Boolean)));

  let activeServiceIds = new Set<string>();
  if (serviceIds.length > 0) {
    const { data: calendars } = await supabaseServer
      .from('gtfs_calendar')
      .select('service_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday, start_date, end_date')
      .in('service_id', serviceIds);

    if (calendars) {
      for (const cal of calendars) {
        // 期間チェック
        if (todayStr >= cal.start_date && todayStr <= cal.end_date) {
          // 曜日チェック
          if (cal[todayDay as keyof typeof cal]) {
            activeServiceIds.add(cal.service_id);
          }
        }
      }
    }
    // activeServiceIdsが空の場合は全て表示（カレンダーが未設定の場合）
    if (activeServiceIds.size === 0) {
      activeServiceIds = new Set(serviceIds);
    }
  }

  // 路線ごとにグループ化
  const routeMap = new Map<string, {
    route_id: string;
    route_short_name: string | null;
    route_long_name: string | null;
    route_color: string | null;
    departures: Array<{
      departure_time: string;
      trip_headsign: string | null;
    }>;
  }>();

  for (const st of stopTimes ?? []) {
    const trip = (st as any).gtfs_trips;
    if (!trip) continue;

    // カレンダーフィルタ
    if (!activeServiceIds.has(trip.service_id)) continue;

    const route = trip.gtfs_routes;
    if (!route) continue;

    const routeId = route.route_id;
    if (!routeMap.has(routeId)) {
      routeMap.set(routeId, {
        route_id: routeId,
        route_short_name: route.route_short_name,
        route_long_name: route.route_long_name,
        route_color: route.route_color,
        departures: [],
      });
    }

    routeMap.get(routeId)!.departures.push({
      departure_time: st.departure_time,
      trip_headsign: trip.trip_headsign,
    });
  }

  // 路線配列に変換
  const routes = Array.from(routeMap.values()).sort((a, b) => {
    const aName = a.route_short_name || a.route_long_name || '';
    const bName = b.route_short_name || b.route_long_name || '';
    return aName.localeCompare(bName);
  });

  // メタデータを取得
  const { data: metadata } = await supabaseServer
    .from('gtfs_metadata')
    .select('last_updated_at, data_source, notes')
    .order('last_updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    stop,
    routes,
    metadata: metadata || null,
  });
}
