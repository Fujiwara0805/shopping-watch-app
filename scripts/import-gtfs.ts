/**
 * GTFSデータインポートスクリプト
 *
 * 大分県内のバス事業者GTFSデータをBODIK ODCSからダウンロードし、
 * Supabaseにインポートします。
 *
 * 使用方法: npx tsx scripts/import-gtfs.ts
 *
 * 環境変数:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const GTFS_SOURCES = [
  {
    name: '大分バス',
    url: 'https://data.bodik.jp/dataset/6b8c3167-971c-4c3c-ab84-4eae561be553/resource/9c3c2dbb-493a-40be-991d-44923919908c/download/gtfs01_oitabus.zip',
    agencyId: 'oitabus',
  },
  {
    name: '大分交通',
    url: 'https://data.bodik.jp/dataset/09f3116a-418d-42be-9bd5-4d395c7b3467/resource/899d5ccc-75ee-48a8-bc96-e241a6a0c0cd/download/gtfs04_oitakotsu.zip',
    agencyId: 'oitakotsu',
  },
  // 追加のバス事業者は必要に応じてここに追加
  // {
  //   name: '日田バス',
  //   url: 'https://data.bodik.jp/dataset/440001_gtfs09_hitabus/...',
  //   agencyId: 'hitabus',
  // },
];

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('環境変数 NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です。');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Simple CSV parser
function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^\uFEFF/, '').replace(/"/g, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted fields
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }

  return rows;
}

// Batch insert helper
async function batchInsert(table: string, rows: any[], batchSize: number = 500) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: table === 'gtfs_stop_times' ? 'id' : undefined as any });
    if (error) {
      console.error(`  エラー (${table}, batch ${Math.floor(i / batchSize) + 1}):`, error.message);
    } else {
      process.stdout.write(`  ${table}: ${Math.min(i + batchSize, rows.length)}/${rows.length}\r`);
    }
  }
  console.log();
}

async function downloadAndExtractGTFS(source: typeof GTFS_SOURCES[0]): Promise<string | null> {
  console.log(`\n📥 ${source.name} のGTFSデータをダウンロード中...`);

  try {
    const response = await fetch(source.url);
    if (!response.ok) {
      console.error(`  ダウンロード失敗: ${response.status} ${response.statusText}`);
      return null;
    }

    const buffer = await response.arrayBuffer();
    const tmpDir = path.join(os.tmpdir(), `gtfs_${source.agencyId}_${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    const zipPath = path.join(tmpDir, 'gtfs.zip');
    fs.writeFileSync(zipPath, Buffer.from(buffer));

    // Use system unzip
    const { execSync } = await import('child_process');
    execSync(`unzip -o "${zipPath}" -d "${tmpDir}"`, { stdio: 'pipe' });

    console.log(`  ✅ 展開完了: ${tmpDir}`);
    return tmpDir;
  } catch (err: any) {
    console.error(`  エラー: ${err.message}`);
    return null;
  }
}

async function importGTFSData(gtfsDir: string, agencyId: string) {
  // Import stops
  const stopsFile = path.join(gtfsDir, 'stops.txt');
  if (fs.existsSync(stopsFile)) {
    console.log('  📍 stops.txt をインポート中...');
    const rows = parseCSV(fs.readFileSync(stopsFile, 'utf-8'));
    const stops = rows.map(r => ({
      stop_id: `${agencyId}_${r.stop_id}`,
      stop_name: r.stop_name,
      stop_lat: parseFloat(r.stop_lat),
      stop_lon: parseFloat(r.stop_lon),
      stop_code: r.stop_code || null,
      zone_id: r.zone_id || null,
      location_type: parseInt(r.location_type || '0'),
      parent_station: r.parent_station ? `${agencyId}_${r.parent_station}` : null,
    })).filter(s => !isNaN(s.stop_lat) && !isNaN(s.stop_lon));
    await batchInsert('gtfs_stops', stops);
    console.log(`  ✅ ${stops.length} 件のバス停をインポート`);
  }

  // Import routes
  const routesFile = path.join(gtfsDir, 'routes.txt');
  if (fs.existsSync(routesFile)) {
    console.log('  🚌 routes.txt をインポート中...');
    const rows = parseCSV(fs.readFileSync(routesFile, 'utf-8'));
    const routes = rows.map(r => ({
      route_id: `${agencyId}_${r.route_id}`,
      agency_id: r.agency_id || agencyId,
      route_short_name: r.route_short_name || null,
      route_long_name: r.route_long_name || null,
      route_type: parseInt(r.route_type || '3'),
      route_color: r.route_color || null,
      route_text_color: r.route_text_color || null,
    }));
    await batchInsert('gtfs_routes', routes);
    console.log(`  ✅ ${routes.length} 件の路線をインポート`);
  }

  // Import calendar
  const calendarFile = path.join(gtfsDir, 'calendar.txt');
  if (fs.existsSync(calendarFile)) {
    console.log('  📅 calendar.txt をインポート中...');
    const rows = parseCSV(fs.readFileSync(calendarFile, 'utf-8'));
    const calendar = rows.map(r => ({
      service_id: `${agencyId}_${r.service_id}`,
      monday: r.monday === '1',
      tuesday: r.tuesday === '1',
      wednesday: r.wednesday === '1',
      thursday: r.thursday === '1',
      friday: r.friday === '1',
      saturday: r.saturday === '1',
      sunday: r.sunday === '1',
      start_date: r.start_date,
      end_date: r.end_date,
    }));
    await batchInsert('gtfs_calendar', calendar);
    console.log(`  ✅ ${calendar.length} 件のカレンダーをインポート`);
  }

  // Import trips
  const tripsFile = path.join(gtfsDir, 'trips.txt');
  if (fs.existsSync(tripsFile)) {
    console.log('  🗺️ trips.txt をインポート中...');
    const rows = parseCSV(fs.readFileSync(tripsFile, 'utf-8'));
    const trips = rows.map(r => ({
      trip_id: `${agencyId}_${r.trip_id}`,
      route_id: `${agencyId}_${r.route_id}`,
      service_id: `${agencyId}_${r.service_id}`,
      trip_headsign: r.trip_headsign || null,
      direction_id: r.direction_id ? parseInt(r.direction_id) : null,
      shape_id: r.shape_id || null,
    }));
    await batchInsert('gtfs_trips', trips);
    console.log(`  ✅ ${trips.length} 件のトリップをインポート`);
  }

  // Import stop_times (largest file)
  const stopTimesFile = path.join(gtfsDir, 'stop_times.txt');
  if (fs.existsSync(stopTimesFile)) {
    console.log('  ⏰ stop_times.txt をインポート中...');
    const rows = parseCSV(fs.readFileSync(stopTimesFile, 'utf-8'));
    const stopTimes = rows.map(r => ({
      trip_id: `${agencyId}_${r.trip_id}`,
      arrival_time: r.arrival_time,
      departure_time: r.departure_time,
      stop_id: `${agencyId}_${r.stop_id}`,
      stop_sequence: parseInt(r.stop_sequence),
    }));
    // stop_times uses INSERT (not UPSERT) since it has auto-increment id
    for (let i = 0; i < stopTimes.length; i += 500) {
      const batch = stopTimes.slice(i, i + 500);
      const { error } = await supabase.from('gtfs_stop_times').insert(batch);
      if (error) {
        console.error(`  エラー (gtfs_stop_times, batch ${Math.floor(i / 500) + 1}):`, error.message);
      } else {
        process.stdout.write(`  gtfs_stop_times: ${Math.min(i + 500, stopTimes.length)}/${stopTimes.length}\r`);
      }
    }
    console.log();
    console.log(`  ✅ ${stopTimes.length} 件の時刻データをインポート`);
  }
}

async function main() {
  console.log('🚌 GTFS データインポート開始');
  console.log('================================');

  // Clear existing data (optional - uncomment if you want full refresh)
  console.log('\n🗑️ 既存データをクリア中...');
  await supabase.from('gtfs_stop_times').delete().neq('id', 0);
  await supabase.from('gtfs_trips').delete().neq('trip_id', '');
  await supabase.from('gtfs_calendar').delete().neq('service_id', '');
  await supabase.from('gtfs_routes').delete().neq('route_id', '');
  await supabase.from('gtfs_stops').delete().neq('stop_id', '');
  console.log('  ✅ クリア完了');

  for (const source of GTFS_SOURCES) {
    const gtfsDir = await downloadAndExtractGTFS(source);
    if (gtfsDir) {
      await importGTFSData(gtfsDir, source.agencyId);
      // Cleanup
      fs.rmSync(gtfsDir, { recursive: true, force: true });
    }
  }

  // Update metadata
  console.log('\n📝 メタデータを更新中...');
  await supabase.from('gtfs_metadata').insert({
    data_source: 'BODIK ODCS（大分県バス事業者GTFSデータ）',
    last_updated_at: new Date().toISOString(),
    gtfs_feed_url: 'https://data.bodik.jp',
    notes: `インポート事業者: ${GTFS_SOURCES.map(s => s.name).join(', ')}`,
  });

  console.log('\n================================');
  console.log('✅ GTFSデータインポート完了！');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
