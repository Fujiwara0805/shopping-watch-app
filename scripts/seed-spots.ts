/**
 * Seed script: Excel データを Supabase にインポート
 *
 * 使い方:
 *   SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=yyy npx tsx scripts/seed-spots.ts <path-to-xlsx>
 *
 * ※ service role key が必要（RLS バイパス）
 */

import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const xlsxPath = process.argv[2] || path.resolve(__dirname, '../data/oita_tourism_database.xlsx');

function readSheet(workbook: XLSX.WorkBook, sheetName: string): Record<string, any>[] {
  const ws = workbook.Sheets[sheetName];
  if (!ws) {
    console.warn(`Sheet "${sheetName}" not found`);
    return [];
  }
  return XLSX.utils.sheet_to_json(ws, { defval: null });
}

async function seedTourismSpots(workbook: XLSX.WorkBook) {
  const rows = readSheet(workbook, 'tourism_spots');
  console.log(`tourism_spots: ${rows.length} rows`);

  // Filter: only spots with valid lat/lng that are NOT 温泉 or グルメ・飲食店
  // (those are stored in separate tables)
  const tourismOnly = rows.filter(r =>
    r.latitude && r.longitude &&
    r.category !== '温泉' &&
    r.category !== 'グルメ・飲食店'
  );
  console.log(`  -> ${tourismOnly.length} tourism-only rows (excluding 温泉/グルメ・飲食店)`);

  const batchSize = 100;
  for (let i = 0; i < tourismOnly.length; i += batchSize) {
    const batch = tourismOnly.slice(i, i + batchSize).map(r => ({
      id: r.id || undefined,
      spot_id: String(r.spot_id),
      spot_name: r.spot_name,
      category: r.category,
      sub_categories: r.sub_categories,
      municipality: r.municipality,
      address: r.address,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      description: r.description,
      business_hours: r.business_hours,
      closed_days: r.closed_days,
      fee: r.fee,
      phone: r.phone,
      access: r.access,
      parking: r.parking,
      website: r.website,
      multilingual: r.multilingual,
      source_url: r.source_url,
      data_source: r.data_source,
      last_updated: r.last_updated,
    }));

    const { error } = await supabase.from('tourism_spots').upsert(batch, { onConflict: 'spot_id' });
    if (error) {
      console.error(`  Error batch ${i}: ${error.message}`);
    } else {
      console.log(`  Inserted ${i + batch.length}/${tourismOnly.length}`);
    }
  }
}

async function seedOnsenSpots(workbook: XLSX.WorkBook) {
  const rows = readSheet(workbook, 'onsen_data');
  console.log(`onsen_data: ${rows.length} rows`);

  const valid = rows.filter(r => r.latitude && r.longitude);

  const batchSize = 100;
  for (let i = 0; i < valid.length; i += batchSize) {
    const batch = valid.slice(i, i + batchSize).map(r => ({
      id: r.id || undefined,
      spot_id: String(r.spot_id),
      onsen_name: r.onsen_name,
      municipality: r.municipality,
      address: r.address,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      spring_quality: r.spring_quality,
      facility_type: r.facility_type,
      fee: r.fee,
      business_hours: r.business_hours,
      closed_days: r.closed_days,
      phone: r.phone,
      website: r.website,
      description: r.description,
      parking: r.parking,
      access: r.access,
      source_url: r.source_url,
      data_source: r.data_source,
      last_updated: r.last_updated,
    }));

    const { error } = await supabase.from('onsen_spots').upsert(batch, { onConflict: 'spot_id' });
    if (error) {
      console.error(`  Error batch ${i}: ${error.message}`);
    } else {
      console.log(`  Inserted ${i + batch.length}/${valid.length}`);
    }
  }
}

async function seedLocalFoodSpots(workbook: XLSX.WorkBook) {
  const rows = readSheet(workbook, 'local_food_spots');
  console.log(`local_food_spots: ${rows.length} rows`);

  const valid = rows.filter(r => r.latitude && r.longitude);

  const batchSize = 100;
  for (let i = 0; i < valid.length; i += batchSize) {
    const batch = valid.slice(i, i + batchSize).map(r => ({
      id: r.id || undefined,
      spot_id: String(r.spot_id),
      shop_name: r.shop_name,
      cuisine_type: r.cuisine_type,
      municipality: r.municipality,
      address: r.address,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      business_hours: r.business_hours,
      closed_days: r.closed_days,
      price_range: r.price_range,
      phone: r.phone,
      website: r.website,
      description: r.description,
      parking: r.parking,
      access: r.access,
      source_url: r.source_url,
      data_source: r.data_source,
      last_updated: r.last_updated,
    }));

    const { error } = await supabase.from('local_food_spots').upsert(batch, { onConflict: 'spot_id' });
    if (error) {
      console.error(`  Error batch ${i}: ${error.message}`);
    } else {
      console.log(`  Inserted ${i + batch.length}/${valid.length}`);
    }
  }
}

async function seedToiletSpots(workbook: XLSX.WorkBook) {
  const rows = readSheet(workbook, 'toilet_spots');
  console.log(`toilet_spots: ${rows.length} rows`);

  const valid = rows.filter(r => r.latitude && r.longitude);

  const batchSize = 100;
  for (let i = 0; i < valid.length; i += batchSize) {
    const batch = valid.slice(i, i + batchSize).map(r => ({
      id: r.id || undefined,
      spot_id: String(r.spot_id),
      facility_name: r.facility_name,
      municipality: r.municipality,
      address: r.address,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      toilet_type: r.toilet_type,
      barrier_free: r.barrier_free,
      business_hours: r.business_hours,
      source_url: r.source_url,
      data_source: r.data_source,
      last_updated: r.last_updated,
    }));

    const { error } = await supabase.from('toilet_spots').upsert(batch, { onConflict: 'spot_id' });
    if (error) {
      console.error(`  Error batch ${i}: ${error.message}`);
    } else {
      console.log(`  Inserted ${i + batch.length}/${valid.length}`);
    }
  }
}

async function main() {
  console.log(`Reading Excel: ${xlsxPath}`);
  const workbook = XLSX.readFile(xlsxPath);
  console.log(`Sheets: ${workbook.SheetNames.join(', ')}`);

  await seedTourismSpots(workbook);
  await seedOnsenSpots(workbook);
  await seedLocalFoodSpots(workbook);
  await seedToiletSpots(workbook);

  console.log('\nDone!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
