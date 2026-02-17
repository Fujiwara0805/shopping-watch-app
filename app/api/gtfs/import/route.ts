import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

/**
 * POST /api/gtfs/import
 * GTFSデータのインポートをトリガー（サーバーサイド）
 *
 * ※ このAPIは管理者のみが使用する想定です。
 * ※ 大量データのインポートのため、CLIスクリプト（npx tsx scripts/import-gtfs.ts）の
 *    使用を推奨します。このAPIは簡易的なインポート用です。
 *
 * Headers:
 *   x-admin-key: SUPABASE_SERVICE_ROLE_KEY と一致する必要あり
 *
 * Body (optional):
 *   { "agencies": ["oitabus", "oitakotsu"] }  // 特定の事業者のみ
 */

// 全事業者の定義（CKAN APIを使って最新URLを動的に取得）
const GTFS_SOURCES = [
  { name: '大分バス', agencyId: 'oitabus', ckanDatasetId: '440001_gtfs01_oitabus' },
  { name: '大野竹田バス', agencyId: 'oonotaketabus', ckanDatasetId: '440001_gtfs02_oonotaketabus' },
  { name: '臼津交通', agencyId: 'usutsu', ckanDatasetId: '440001_gtfs03_kyushinkotsu' },
  { name: '大分交通', agencyId: 'oitakotsu', ckanDatasetId: '440001_gtfs04_oitakotsu' },
  { name: '国東観光バス', agencyId: 'kunisakikanko', ckanDatasetId: '440001_gtfs05_kunisakikanko' },
  { name: '玖珠観光バス', agencyId: 'kusukanko', ckanDatasetId: '440001_gtfs06_kusukanko' },
  { name: '大交北部バス', agencyId: 'daikohokubu', ckanDatasetId: '440001_gtfs07_daikohokubu' },
  { name: '亀の井バス', agencyId: 'kamenoibus', ckanDatasetId: '440001_gtfs08_kamenoibus' },
  { name: '日田バス', agencyId: 'hitabus', ckanDatasetId: '440001_gtfs09_hitabus' },
];

/**
 * GET /api/gtfs/import
 * インポート状態の確認（メタデータを返す）
 */
export async function GET() {
  const { data: metadata, error } = await supabaseServer
    .from('gtfs_metadata')
    .select('*')
    .order('last_updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'メタデータの取得に失敗しました。' }, { status: 500 });
  }

  // 各テーブルのレコード数を取得
  const [stopsCount, routesCount, tripsCount, stopTimesCount] = await Promise.all([
    supabaseServer.from('gtfs_stops').select('stop_id', { count: 'exact', head: true }),
    supabaseServer.from('gtfs_routes').select('route_id', { count: 'exact', head: true }),
    supabaseServer.from('gtfs_trips').select('trip_id', { count: 'exact', head: true }),
    supabaseServer.from('gtfs_stop_times').select('id', { count: 'exact', head: true }),
  ]);

  return NextResponse.json({
    metadata: metadata || null,
    counts: {
      stops: stopsCount.count ?? 0,
      routes: routesCount.count ?? 0,
      trips: tripsCount.count ?? 0,
      stop_times: stopTimesCount.count ?? 0,
    },
    available_agencies: GTFS_SOURCES.map(s => ({
      agency_id: s.agencyId,
      name: s.name,
    })),
    import_command: 'npx tsx scripts/import-gtfs.ts',
  });
}

/**
 * POST /api/gtfs/import
 * 簡易インポート: stops.txt のみをインポート（軽量版）
 * 全データのインポートはCLIスクリプトを使用してください。
 */
export async function POST(request: NextRequest) {
  // 管理者認証チェック
  const adminKey = request.headers.get('x-admin-key');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!adminKey || adminKey !== serviceKey) {
    return NextResponse.json(
      { error: '認証に失敗しました。x-admin-key ヘッダーが必要です。' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const requestedAgencies = body.agencies as string[] | undefined;

    let sources = GTFS_SOURCES;
    if (requestedAgencies?.length) {
      sources = GTFS_SOURCES.filter(s => requestedAgencies.includes(s.agencyId));
    }

    const results: Array<{ agency: string; name: string; stops: number; success: boolean; error?: string }> = [];

    for (const source of sources) {
      try {
        // CKAN APIからダウンロードURLを取得
        const apiUrl = `https://data.bodik.jp/api/3/action/package_show?id=${source.ckanDatasetId}`;
        const apiRes = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) });

        let downloadUrl = '';
        if (apiRes.ok) {
          const json = await apiRes.json();
          const resource = json.result?.resources?.find((r: any) =>
            r.url?.endsWith('.zip') || r.format?.toLowerCase() === 'gtfs'
          );
          downloadUrl = resource?.url || '';
        }

        if (!downloadUrl) {
          results.push({
            agency: source.agencyId,
            name: source.name,
            stops: 0,
            success: false,
            error: 'ダウンロードURLの取得に失敗',
          });
          continue;
        }

        // ZIPをダウンロード
        const zipRes = await fetch(downloadUrl, { signal: AbortSignal.timeout(60000) });
        if (!zipRes.ok) {
          results.push({
            agency: source.agencyId,
            name: source.name,
            stops: 0,
            success: false,
            error: `ダウンロード失敗: ${zipRes.status}`,
          });
          continue;
        }

        // ZIPからstops.txtを抽出（簡易版: 全ファイルは大きすぎるためstopsのみ）
        // ※ フルインポートはCLIスクリプトを使用してください
        const buffer = await zipRes.arrayBuffer();
        const uint8 = new Uint8Array(buffer);

        // ZIPファイルからstops.txtを探してパース（簡易ZIPパーサー）
        const stopsData = extractFileFromZip(uint8, 'stops.txt');
        if (!stopsData) {
          results.push({
            agency: source.agencyId,
            name: source.name,
            stops: 0,
            success: false,
            error: 'stops.txt が見つかりません',
          });
          continue;
        }

        const csvText = new TextDecoder('utf-8').decode(stopsData);
        const rows = parseCSVSimple(csvText);

        const stops = rows
          .map(r => ({
            stop_id: `${source.agencyId}_${r.stop_id}`,
            stop_name: r.stop_name,
            stop_lat: parseFloat(r.stop_lat),
            stop_lon: parseFloat(r.stop_lon),
            stop_code: r.stop_code || null,
            zone_id: r.zone_id || null,
            location_type: parseInt(r.location_type || '0'),
            parent_station: r.parent_station ? `${source.agencyId}_${r.parent_station}` : null,
          }))
          .filter(s => !isNaN(s.stop_lat) && !isNaN(s.stop_lon));

        // バッチでupsert
        for (let i = 0; i < stops.length; i += 500) {
          const batch = stops.slice(i, i + 500);
          await supabaseServer.from('gtfs_stops').upsert(batch);
        }

        results.push({
          agency: source.agencyId,
          name: source.name,
          stops: stops.length,
          success: true,
        });
      } catch (err: any) {
        results.push({
          agency: source.agencyId,
          name: source.name,
          stops: 0,
          success: false,
          error: err.message,
        });
      }
    }

    // メタデータ更新
    const successAgencies = results.filter(r => r.success).map(r => r.name);
    if (successAgencies.length > 0) {
      await supabaseServer.from('gtfs_metadata').insert({
        data_source: 'BODIK ODCS（大分県バス事業者GTFSデータ）',
        last_updated_at: new Date().toISOString(),
        gtfs_feed_url: 'https://data.bodik.jp',
        notes: `API簡易インポート（stopsのみ）: ${successAgencies.join(', ')}`,
      });
    }

    const totalStops = results.reduce((sum, r) => sum + r.stops, 0);

    return NextResponse.json({
      message: `${results.filter(r => r.success).length}/${results.length} 事業者のバス停をインポートしました。`,
      total_stops: totalStops,
      results,
      note: '完全なデータ（路線・時刻表を含む）のインポートには、CLIスクリプト「npx tsx scripts/import-gtfs.ts」を使用してください。',
    });
  } catch (err: any) {
    console.error('[GTFS Import] Error:', err);
    return NextResponse.json({ error: `インポートエラー: ${err.message}` }, { status: 500 });
  }
}

// ============================================================
// 簡易ZIPパーサー（stops.txtのみ抽出）
// ============================================================
function extractFileFromZip(zipData: Uint8Array, targetFilename: string): Uint8Array | null {
  // ZIPファイルのLocal File Headerを探す
  let offset = 0;
  while (offset < zipData.length - 4) {
    // Local file header signature = 0x04034b50
    if (
      zipData[offset] === 0x50 &&
      zipData[offset + 1] === 0x4b &&
      zipData[offset + 2] === 0x03 &&
      zipData[offset + 3] === 0x04
    ) {
      const compressionMethod = zipData[offset + 8] | (zipData[offset + 9] << 8);
      const compressedSize = zipData[offset + 18] | (zipData[offset + 19] << 8) | (zipData[offset + 20] << 16) | (zipData[offset + 21] << 24);
      const uncompressedSize = zipData[offset + 22] | (zipData[offset + 23] << 8) | (zipData[offset + 24] << 16) | (zipData[offset + 25] << 24);
      const filenameLength = zipData[offset + 26] | (zipData[offset + 27] << 8);
      const extraFieldLength = zipData[offset + 28] | (zipData[offset + 29] << 8);

      const filenameBytes = zipData.slice(offset + 30, offset + 30 + filenameLength);
      const filename = new TextDecoder('utf-8').decode(filenameBytes);

      const dataOffset = offset + 30 + filenameLength + extraFieldLength;

      if (filename.endsWith(targetFilename) && compressionMethod === 0) {
        // 非圧縮ファイル
        return zipData.slice(dataOffset, dataOffset + uncompressedSize);
      }

      // 次のヘッダーへ
      offset = dataOffset + compressedSize;
    } else {
      offset++;
    }
  }
  return null;
}

// ============================================================
// 簡易CSVパーサー
// ============================================================
function parseCSVSimple(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^\uFEFF/, '').replace(/"/g, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else { current += char; }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((header, idx) => { row[header] = values[idx] || ''; });
    rows.push(row);
  }
  return rows;
}
