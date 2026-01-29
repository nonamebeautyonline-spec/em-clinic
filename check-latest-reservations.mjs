// check-latest-reservations.mjs
// GASの最新予約とSupabaseを比較

import { readFileSync } from 'fs';

const envFile = readFileSync('.env.local', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key] = value;
  }
});

const GAS_INTAKE_URL = envVars.GAS_INTAKE_URL || envVars.GAS_INTAKE_LIST_URL;
const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('=== GAS最新予約とSupabase比較 ===\n');

// 1. GASから全データ取得
console.log('[1] GASから全データ取得中...');
let gasRows = [];

try {
  const response = await fetch(GAS_INTAKE_URL, {
    method: 'GET',
  });

  const data = await response.json();

  if (data.ok && Array.isArray(data.rows)) {
    gasRows = data.rows;
  } else if (Array.isArray(data)) {
    gasRows = data;
  }

  console.log(`  ✅ GASから取得: ${gasRows.length}件\n`);
} catch (e) {
  console.log(`  ❌ エラー: ${e.message}\n`);
  process.exit(1);
}

// 2. 予約がある（reserved_dateとreserved_timeが存在する）レコードのみフィルタ
const gasWithReservations = gasRows.filter(r => {
  const date = String(r.reserved_date || r['予約日'] || '').trim();
  const time = String(r.reserved_time || r['予約時間'] || '').trim();
  return date && time;
});

console.log(`[2] 予約があるレコード: ${gasWithReservations.length}件\n`);

// 3. 最新5件を表示（created_atがないので、配列の最後から取得）
console.log('[3] GASの最新5件:');
const latestGas = gasWithReservations.slice(-5);
latestGas.forEach((row, i) => {
  const pid = row.patient_id;
  const name = row.patient_name || row.name || row['氏名'];
  const reserveId = row.reserveId || row.reserve_id;
  const date = row.reserved_date || row['予約日'];
  const time = row.reserved_time || row['予約時間'];

  console.log(`  ${i + 1}. PID: ${pid}`);
  console.log(`     名前: ${name}`);
  console.log(`     reserveId: ${reserveId}`);
  console.log(`     予約: ${date} ${time}`);
  console.log('');
});

// 4. これらの患者IDがSupabaseに存在するか確認
console.log('[4] Supabaseで存在確認:');
for (const row of latestGas) {
  const pid = row.patient_id;
  const reserveId = row.reserveId || row.reserve_id;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/intake?patient_id=eq.${pid}`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (data.length === 0) {
      console.log(`  ❌ PID: ${pid}, reserveId: ${reserveId} - Supabaseに存在しません`);
    } else {
      const record = data[0];
      if (record.reserve_id === reserveId) {
        console.log(`  ✅ PID: ${pid}, reserveId: ${reserveId} - Supabaseに存在します`);
      } else {
        console.log(`  ⚠️  PID: ${pid} - 存在するが、reserveIdが異なります`);
        console.log(`      GAS: ${reserveId}`);
        console.log(`      Supabase: ${record.reserve_id}`);
      }
    }
  } catch (e) {
    console.log(`  ❌ PID: ${pid} - エラー: ${e.message}`);
  }
}

console.log('\n=== 完了 ===');
