/**
 * GTFSデータインポートスクリプト
 *
 * 大分県内のバス事業者GTFSデータをBODIK ODCSからダウンロードし、
 * Supabaseにインポートします。
 *
 * 使用方法: npx tsx scripts/import-gtfs.ts
 *
 * オプション:
 *   --agency=oitabus     特定の事業者のみインポート
 *   --skip-clear         既存データのクリアをスキップ
 *   --dry-run            ダウンロードのみ（DBには書き込まない）
 *
 * 環境変数:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ============================================================
// 大分県内全バス事業者のGTFSデータソース定義
// データ提供: BODIK ODCS (https://data.bodik.jp)
// ライセンス: CC BY 4.0
// ============================================================
interface GtfsSource {
  name: string;
  agencyId: string;
  ckanDatasetId: string;
  fallbackUrl: string;
}

const GTFS_SOURCES: GtfsSource[] = [
  {
    name: '大分バス',
    agencyId: 'oitabus',
    ckanDatasetId: '440001_gtfs01_oitabus',
    fallbackUrl: 'https://data.bodik.jp/dataset/6b8c3167-971c-4c3c-ab84-4eae561be553/resource/9c3c2dbb-493a-40be-991d-44923919908c/download/gtfs01_oitabus.zip',
  },
  {
    name: '大野竹田バス',
    agencyId: 'oonotaketabus',
    ckanDatasetId: '440001_gtfs02_oonotaketabus',
    fallbackUrl: 'https://data.bodik.jp/dataset/82f8e394-562d-4ccf-b279-cf31e2454d13/resource/c9321261-fa35-434a-8a6a-ad0c992b1194/download/gtfs02_oonotaketabus.zip',
  },
  {
    name: '臼津交通',
    agencyId: 'usutsu',
    ckanDatasetId: '440001_gtfs03_kyushinkotsu',
    fallbackUrl: 'https://data.bodik.jp/dataset/af52f355-1e78-405c-9d89-9df309bbb30f/resource/76e548c5-617e-4273-81f7-23499ec3aafe/download/gtfs03_kyushinkotsu.zip',
  },
  {
    name: '大分交通',
    agencyId: 'oitakotsu',
    ckanDatasetId: '440001_gtfs04_oitakotsu',
    fallbackUrl: 'https://data.bodik.jp/dataset/09f3116a-418d-42be-9bd5-4d395c7b3467/resource/899d5ccc-75ee-48a8-bc96-e241a6a0c0cd/download/gtfs04_oitakotsu.zip',
  },
  {
    name: '国東観光バス',
    agencyId: 'kunisakikanko',
    ckanDatasetId: '440001_gtfs05_kunisakikanko',
    fallbackUrl: 'https://data.bodik.jp/dataset/53ed44a0-0507-4002-aa9e-c4421d290dd4/resource/5469eca7-e04b-4fba-8cdd-208a4538a7e9/download/gtfs05_kunisakikanko.zip',
  },
  {
    name: '玖珠観光バス',
    agencyId: 'kusukanko',
    ckanDatasetId: '440001_gtfs06_kusukanko',
    fallbackUrl: 'https://data.bodik.jp/dataset/b90a15f4-9680-4b7c-bcf9-d510d426e210/resource/d99bc99a-4358-4eab-af68-b140c12477a0/download/gtfs06_kusukanko.zip',
  },
  {
    name: '大交北部バス',
    agencyId: 'daikohokubu',
    ckanDatasetId: '440001_gtfs07_daikohokubu',
    fallbackUrl: 'https://data.bodik.jp/dataset/1e5193a5-c771-419a-9e7a-903d45ced2f3/resource/dd886eca-3abb-4244-a866-a62f676ccb83/download/gtfs07_daikohokubu.zip',
  },
  {
    name: '亀の井バス',
    agencyId: 'kamenoibus',
    ckanDatasetId: '440001_gtfs08_kamenoibus',
    fallbackUrl: 'https://data.bodik.jp/dataset/b9319381-3841-4a1c-a796-33e7953b193a/resource/8d18cbd7-eef0-48c6-9fa3-eae936d56f40/download/gtfs08_kamenoibus.zip',
  },
  {
    name: '日田バス',
    agencyId: 'hitabus',
    ckanDatasetId: '440001_gtfs09_hitabus',
    fallbackUrl: 'https://data.bodik.jp/dataset/2dcbcc0d-6fbb-4c6b-9790-2f54ed41bf4f/resource/e37c6f56-ed8b-4032-a91f-4fc24639a18e/download/gtfs09_hitabus.zip',
  },
];

// ============================================================
// CLI引数パース
// ============================================================
const args = process.argv.slice(2);
const agencyFilter = args.find(a => a.startsWith('--agency='))?.split('=')[1];
const skipClear = args.includes('--skip-clear');
const dryRun = args.includes('--dry-run');

// ============================================================
// Supabase client
// ============================================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 環境変数 NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です。');
  console.error('   .env.local ファイルに設定してください。');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================
// インポート統計
// ============================================================
interface ImportStats {
  agency: string;
  stops: number;
  routes: number;
  calendar: number;
  trips: number;
  stopTimes: number;
  success: boolean;
  error?: string;
}

const allStats: ImportStats[] = [];

// ============================================================
// CSV パーサー
// ============================================================
function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  // BOM除去 + ヘッダーパース
  const headers = lines[0].split(',').map(h => h.trim().replace(/^\uFEFF/, '').replace(/"/g, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // クォート対応のCSVパース
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

// ============================================================
// バッチインサート（リトライ付き）
// ============================================================
async function batchInsert(table: string, rows: any[], batchSize: number = 500): Promise<number> {
  let insertedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    let retries = 3;
    while (retries > 0) {
      try {
        const { error } = table === 'gtfs_stop_times'
          ? await supabase.from(table).insert(batch)
          : await supabase.from(table).upsert(batch);

        if (error) {
          retries--;
          if (retries === 0) {
            console.error(`  ❌ エラー (${table}, batch ${Math.floor(i / batchSize) + 1}): ${error.message}`);
            errorCount += batch.length;
          } else {
            // リトライ前に少し待つ
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } else {
          insertedCount += batch.length;
          process.stdout.write(`  ${table}: ${Math.min(i + batchSize, rows.length)}/${rows.length}\r`);
          break;
        }
      } catch (err: any) {
        retries--;
        if (retries === 0) {
          console.error(`  ❌ 例外 (${table}): ${err.message}`);
          errorCount += batch.length;
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }
  console.log();
  if (errorCount > 0) {
    console.warn(`  ⚠️ ${errorCount}件のレコードでエラーが発生`);
  }
  return insertedCount;
}

// ============================================================
// CKAN APIからダウンロードURLを動的に取得
// ============================================================
async function resolveDownloadUrl(source: GtfsSource): Promise<string> {
  try {
    const apiUrl = `https://data.bodik.jp/api/3/action/package_show?id=${source.ckanDatasetId}`;
    const response = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) });

    if (!response.ok) {
      console.warn(`  ⚠️ CKAN API応答エラー (${response.status})、フォールバックURLを使用`);
      return source.fallbackUrl;
    }

    const json = await response.json();
    if (json.success && json.result?.resources?.length > 0) {
      // GTFS ZIPリソースのURLを見つける
      const resource = json.result.resources.find((r: any) =>
        r.url?.endsWith('.zip') || r.format?.toLowerCase() === 'gtfs'
      );
      if (resource?.url) {
        console.log(`  🔗 CKAN APIから最新URLを取得`);
        return resource.url;
      }
    }
  } catch (err: any) {
    console.warn(`  ⚠️ CKAN API接続失敗: ${err.message}、フォールバックURLを使用`);
  }

  return source.fallbackUrl;
}

// ============================================================
// GTFSデータのダウンロードと展開
// ============================================================
async function downloadAndExtractGTFS(source: GtfsSource): Promise<string | null> {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📥 ${source.name}（${source.agencyId}）のGTFSデータをダウンロード中...`);

  try {
    // CKAN APIで最新URLを取得（フォールバック付き）
    const downloadUrl = await resolveDownloadUrl(source);

    const response = await fetch(downloadUrl, {
      signal: AbortSignal.timeout(60000), // 60秒タイムアウト
    });

    if (!response.ok) {
      console.error(`  ❌ ダウンロード失敗: ${response.status} ${response.statusText}`);
      console.error(`  URL: ${downloadUrl}`);
      return null;
    }

    const buffer = await response.arrayBuffer();
    const fileSizeKB = (buffer.byteLength / 1024).toFixed(1);
    console.log(`  📦 ダウンロード完了: ${fileSizeKB} KB`);

    const tmpDir = path.join(os.tmpdir(), `gtfs_${source.agencyId}_${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    const zipPath = path.join(tmpDir, 'gtfs.zip');
    fs.writeFileSync(zipPath, Buffer.from(buffer));

    // unzipコマンドで展開
    const { execSync } = await import('child_process');
    execSync(`unzip -o "${zipPath}" -d "${tmpDir}"`, { stdio: 'pipe' });

    // 展開されたファイル一覧を表示
    const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.txt'));
    console.log(`  📂 展開ファイル: ${files.join(', ')}`);

    return tmpDir;
  } catch (err: any) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      console.error(`  ❌ ダウンロードタイムアウト（60秒）`);
    } else {
      console.error(`  ❌ エラー: ${err.message}`);
    }
    return null;
  }
}

// ============================================================
// GTFSデータのインポート
// ============================================================
async function importGTFSData(gtfsDir: string, agencyId: string): Promise<ImportStats> {
  const stats: ImportStats = {
    agency: agencyId,
    stops: 0,
    routes: 0,
    calendar: 0,
    trips: 0,
    stopTimes: 0,
    success: true,
  };

  try {
    // --------------------------------------------------------
    // 1. stops.txt のインポート
    // --------------------------------------------------------
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

      if (!dryRun) {
        stats.stops = await batchInsert('gtfs_stops', stops);
      } else {
        stats.stops = stops.length;
      }
      console.log(`  ✅ ${stats.stops} 件のバス停をインポート`);
    }

    // --------------------------------------------------------
    // 2. routes.txt のインポート
    // --------------------------------------------------------
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

      if (!dryRun) {
        stats.routes = await batchInsert('gtfs_routes', routes);
      } else {
        stats.routes = routes.length;
      }
      console.log(`  ✅ ${stats.routes} 件の路線をインポート`);
    }

    // --------------------------------------------------------
    // 3. calendar.txt + calendar_dates.txt のインポート
    // --------------------------------------------------------
    const calendarServiceIds = new Set<string>();
    const calendarFile = path.join(gtfsDir, 'calendar.txt');
    if (fs.existsSync(calendarFile)) {
      console.log('  📅 calendar.txt をインポート中...');
      const rows = parseCSV(fs.readFileSync(calendarFile, 'utf-8'));
      const calendar = rows.map(r => {
        const sid = `${agencyId}_${r.service_id}`;
        calendarServiceIds.add(sid);
        return {
          service_id: sid,
          monday: r.monday === '1',
          tuesday: r.tuesday === '1',
          wednesday: r.wednesday === '1',
          thursday: r.thursday === '1',
          friday: r.friday === '1',
          saturday: r.saturday === '1',
          sunday: r.sunday === '1',
          start_date: r.start_date,
          end_date: r.end_date,
        };
      });

      if (!dryRun) {
        stats.calendar = await batchInsert('gtfs_calendar', calendar);
      } else {
        stats.calendar = calendar.length;
      }
      console.log(`  ✅ ${stats.calendar} 件のカレンダーをインポート`);
    }

    // calendar_dates.txt から calendar.txt に存在しないservice_idを補完
    // GTFSでは calendar_dates.txt のみでサービスを定義する事業者がある
    const calendarDatesFile = path.join(gtfsDir, 'calendar_dates.txt');
    if (fs.existsSync(calendarDatesFile)) {
      console.log('  📅 calendar_dates.txt を確認中...');
      const cdRows = parseCSV(fs.readFileSync(calendarDatesFile, 'utf-8'));

      // calendar_dates から日付範囲と曜日パターンを推定
      const serviceIdDates = new Map<string, string[]>();
      for (const r of cdRows) {
        const sid = `${agencyId}_${r.service_id}`;
        if (!serviceIdDates.has(sid)) serviceIdDates.set(sid, []);
        if (r.exception_type === '1') { // 1=追加
          serviceIdDates.get(sid)!.push(r.date);
        }
      }

      // calendar.txt に存在しないservice_idのみ補完
      const missingServiceIds: typeof calendarServiceIds extends Set<infer T> ? T[] : never = [];
      const supplementalCalendar: any[] = [];

      for (const [sid, dates] of Array.from(serviceIdDates.entries())) {
        if (calendarServiceIds.has(sid)) continue;
        missingServiceIds.push(sid);

        // 日付範囲を取得
        const sortedDates = dates.sort();
        const startDate = sortedDates[0] || '20200101';
        const endDate = sortedDates[sortedDates.length - 1] || '20301231';

        // 曜日パターンを推定（含まれる日付の曜日を確認）
        const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0]; // sun, mon, tue, ...
        for (const d of dates) {
          try {
            const year = parseInt(d.slice(0, 4));
            const month = parseInt(d.slice(4, 6)) - 1;
            const day = parseInt(d.slice(6, 8));
            const dow = new Date(year, month, day).getDay();
            dayOfWeekCounts[dow]++;
          } catch { /* ignore */ }
        }

        supplementalCalendar.push({
          service_id: sid,
          monday: dayOfWeekCounts[1] > 0,
          tuesday: dayOfWeekCounts[2] > 0,
          wednesday: dayOfWeekCounts[3] > 0,
          thursday: dayOfWeekCounts[4] > 0,
          friday: dayOfWeekCounts[5] > 0,
          saturday: dayOfWeekCounts[6] > 0,
          sunday: dayOfWeekCounts[0] > 0,
          start_date: startDate,
          end_date: endDate,
        });
        calendarServiceIds.add(sid);
      }

      if (supplementalCalendar.length > 0) {
        console.log(`  📅 calendar_dates.txt から ${supplementalCalendar.length} 件のサービスIDを補完`);
        if (!dryRun) {
          const inserted = await batchInsert('gtfs_calendar', supplementalCalendar);
          stats.calendar += inserted;
        } else {
          stats.calendar += supplementalCalendar.length;
        }
      }
    }

    // --------------------------------------------------------
    // 4. trips.txt のインポート
    // --------------------------------------------------------
    const importedTripIds = new Set<string>();
    const tripsFile = path.join(gtfsDir, 'trips.txt');
    if (fs.existsSync(tripsFile)) {
      console.log('  🗺️ trips.txt をインポート中...');
      const rows = parseCSV(fs.readFileSync(tripsFile, 'utf-8'));
      const allTrips = rows.map(r => ({
        trip_id: `${agencyId}_${r.trip_id}`,
        route_id: `${agencyId}_${r.route_id}`,
        service_id: `${agencyId}_${r.service_id}`,
        trip_headsign: r.trip_headsign || null,
        direction_id: r.direction_id ? parseInt(r.direction_id) : null,
        shape_id: r.shape_id || null,
      }));

      // 外部キー制約違反を防ぐ: calendarに存在するservice_idのみ
      const trips = allTrips.filter(t => calendarServiceIds.has(t.service_id));
      const skipped = allTrips.length - trips.length;
      if (skipped > 0) {
        console.warn(`  ⚠️ ${skipped} 件のトリップをスキップ（カレンダーにservice_idが存在しない）`);
      }

      trips.forEach(t => importedTripIds.add(t.trip_id));

      if (!dryRun) {
        stats.trips = await batchInsert('gtfs_trips', trips);
      } else {
        stats.trips = trips.length;
      }
      console.log(`  ✅ ${stats.trips} 件のトリップをインポート`);
    }

    // --------------------------------------------------------
    // 5. stop_times.txt のインポート（最大テーブル）
    // --------------------------------------------------------
    const stopTimesFile = path.join(gtfsDir, 'stop_times.txt');
    if (fs.existsSync(stopTimesFile)) {
      console.log('  ⏰ stop_times.txt をインポート中...');
      const rows = parseCSV(fs.readFileSync(stopTimesFile, 'utf-8'));
      const allStopTimes = rows.map(r => ({
        trip_id: `${agencyId}_${r.trip_id}`,
        arrival_time: r.arrival_time,
        departure_time: r.departure_time,
        stop_id: `${agencyId}_${r.stop_id}`,
        stop_sequence: parseInt(r.stop_sequence),
      }));

      // 外部キー制約違反を防ぐ: tripsに存在するtrip_idのみ
      const stopTimes = allStopTimes.filter(st => importedTripIds.has(st.trip_id));
      const skippedST = allStopTimes.length - stopTimes.length;
      if (skippedST > 0) {
        console.warn(`  ⚠️ ${skippedST} 件の時刻データをスキップ（tripsにtrip_idが存在しない）`);
      }

      if (!dryRun) {
        stats.stopTimes = await batchInsert('gtfs_stop_times', stopTimes);
      } else {
        stats.stopTimes = stopTimes.length;
      }
      console.log(`  ✅ ${stats.stopTimes} 件の時刻データをインポート`);
    }
  } catch (err: any) {
    stats.success = false;
    stats.error = err.message;
    console.error(`  ❌ インポート中にエラー: ${err.message}`);
  }

  return stats;
}

// ============================================================
// 既存データのクリア
// ============================================================
async function clearExistingData() {
  console.log('\n🗑️ 既存GTFSデータをクリア中...');

  // 外部キー制約の順序に注意して削除
  const tables = [
    { name: 'gtfs_stop_times', column: 'id', value: 0, op: 'neq' as const },
    { name: 'gtfs_trips', column: 'trip_id', value: '', op: 'neq' as const },
    { name: 'gtfs_calendar', column: 'service_id', value: '', op: 'neq' as const },
    { name: 'gtfs_routes', column: 'route_id', value: '', op: 'neq' as const },
    { name: 'gtfs_stops', column: 'stop_id', value: '', op: 'neq' as const },
    { name: 'gtfs_metadata', column: 'id', value: 0, op: 'neq' as const },
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table.name).delete().neq(table.column, table.value);
    if (error) {
      console.error(`  ⚠️ ${table.name} のクリアに失敗: ${error.message}`);
    } else {
      console.log(`  ✓ ${table.name} クリア完了`);
    }
  }
}

// ============================================================
// サマリー表示
// ============================================================
function printSummary(stats: ImportStats[]) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 インポートサマリー');
  console.log('='.repeat(60));

  let totalStops = 0, totalRoutes = 0, totalTrips = 0, totalStopTimes = 0;
  let successCount = 0, failCount = 0;

  for (const stat of stats) {
    const status = stat.success ? '✅' : '❌';
    console.log(`\n  ${status} ${stat.agency}`);
    console.log(`     バス停: ${stat.stops.toLocaleString()} | 路線: ${stat.routes} | トリップ: ${stat.trips.toLocaleString()} | 時刻: ${stat.stopTimes.toLocaleString()}`);
    if (stat.error) {
      console.log(`     エラー: ${stat.error}`);
    }

    totalStops += stat.stops;
    totalRoutes += stat.routes;
    totalTrips += stat.trips;
    totalStopTimes += stat.stopTimes;
    if (stat.success) successCount++; else failCount++;
  }

  console.log('\n' + '-'.repeat(60));
  console.log(`  合計:`);
  console.log(`    バス停: ${totalStops.toLocaleString()} 件`);
  console.log(`    路線:   ${totalRoutes.toLocaleString()} 件`);
  console.log(`    トリップ: ${totalTrips.toLocaleString()} 件`);
  console.log(`    時刻データ: ${totalStopTimes.toLocaleString()} 件`);
  console.log(`    成功: ${successCount} / 失敗: ${failCount}`);
  console.log('='.repeat(60));
}

// ============================================================
// メイン処理
// ============================================================
async function main() {
  console.log('🚌 大分県 GTFS データインポート');
  console.log('================================');
  console.log(`データ提供: BODIK ODCS (https://data.bodik.jp)`);
  console.log(`ライセンス: CC BY 4.0 (大分県)`);
  console.log(`実行日時: ${new Date().toLocaleString('ja-JP')}`);

  if (dryRun) {
    console.log('\n⚠️ ドライランモード: データベースへの書き込みは行いません');
  }

  // フィルタする事業者を決定
  let sourcesToImport = GTFS_SOURCES;
  if (agencyFilter) {
    sourcesToImport = GTFS_SOURCES.filter(s => s.agencyId === agencyFilter);
    if (sourcesToImport.length === 0) {
      console.error(`\n❌ 事業者ID "${agencyFilter}" が見つかりません。`);
      console.error(`利用可能な事業者ID:`);
      GTFS_SOURCES.forEach(s => console.error(`  - ${s.agencyId} (${s.name})`));
      process.exit(1);
    }
    console.log(`\n📌 対象事業者: ${sourcesToImport.map(s => s.name).join(', ')}`);
  } else {
    console.log(`\n📌 対象事業者: 全${sourcesToImport.length}社`);
    sourcesToImport.forEach(s => console.log(`   - ${s.name}（${s.agencyId}）`));
  }

  // 既存データのクリア
  if (!skipClear && !dryRun) {
    await clearExistingData();
  } else if (skipClear) {
    console.log('\n⏩ 既存データのクリアをスキップ');
  }

  // 各事業者のデータをインポート
  for (const source of sourcesToImport) {
    const gtfsDir = await downloadAndExtractGTFS(source);
    if (gtfsDir) {
      const stats = await importGTFSData(gtfsDir, source.agencyId);
      allStats.push(stats);
      // 一時ファイルのクリーンアップ
      try {
        fs.rmSync(gtfsDir, { recursive: true, force: true });
      } catch {
        // クリーンアップの失敗は無視
      }
    } else {
      allStats.push({
        agency: source.agencyId,
        stops: 0, routes: 0, calendar: 0, trips: 0, stopTimes: 0,
        success: false,
        error: 'ダウンロードまたは展開に失敗',
      });
    }
  }

  // メタデータを更新
  if (!dryRun) {
    console.log('\n📝 メタデータを更新中...');
    const successfulAgencies = allStats.filter(s => s.success).map(s => {
      const src = sourcesToImport.find(x => x.agencyId === s.agency);
      return src?.name || s.agency;
    });

    const { error } = await supabase.from('gtfs_metadata').insert({
      data_source: 'BODIK ODCS（大分県バス事業者GTFSデータ）',
      last_updated_at: new Date().toISOString(),
      gtfs_feed_url: 'https://data.bodik.jp',
      notes: `インポート事業者: ${successfulAgencies.join(', ')}（全${successfulAgencies.length}社）`,
    });

    if (error) {
      console.error(`  ⚠️ メタデータの更新に失敗: ${error.message}`);
    } else {
      console.log('  ✅ メタデータ更新完了');
    }
  }

  // サマリー表示
  printSummary(allStats);

  const hasFailed = allStats.some(s => !s.success);
  if (hasFailed) {
    console.log('\n⚠️ 一部の事業者でエラーが発生しました。上記のログを確認してください。');
  } else {
    console.log('\n🎉 全事業者のGTFSデータインポートが完了しました！');
  }

  console.log('\n次のステップ:');
  console.log('  1. アプリのマップ画面でバス停レイヤーをONにして確認');
  console.log('  2. バス停をタップして時刻表が表示されることを確認');
  console.log('  3. データの更新は定期的にこのスクリプトを再実行してください');
}

main().catch(err => {
  console.error('\n💥 致命的エラー:', err);
  process.exit(1);
});
