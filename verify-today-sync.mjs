// verify-today-sync.mjs
// 今日の予約がGASとSupabaseで完全一致するか確認

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

const todayStr = '2026-01-29';

console.log('=== 今日（2026-01-29）の予約同期確認 ===\n');

// 1. GASから取得
console.log('[1] GASから取得中...');
const gasResponse = await fetch(GAS_INTAKE_URL, { method: 'GET' });
const gasData = await gasResponse.json();
const gasRows = gasData.ok ? gasData.rows : gasData;
const gasTodayRows = gasRows.filter(r => {
  const date = String(r.reserved_date || r['予約日'] || '').trim().slice(0, 10);
  return date === todayStr;
});

console.log(`  GAS: ${gasTodayRows.length}件\n`);

// 2. Supabaseから取得
console.log('[2] Supabaseから取得中...');
const supabaseResponse = await fetch(
  `${SUPABASE_URL}/rest/v1/intake?reserved_date=eq.${todayStr}&order=reserved_time.asc`,
  {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  }
);
const supabaseTodayRows = await supabaseResponse.json();

console.log(`  Supabase: ${supabaseTodayRows.length}件\n`);

// 3. 件数確認
console.log('[3] 件数比較');
if (gasTodayRows.length === supabaseTodayRows.length) {
  console.log(`  ✅ 件数一致: ${gasTodayRows.length}件\n`);
} else {
  console.log(`  ❌ 件数不一致: 差分 ${gasTodayRows.length - supabaseTodayRows.length}件\n`);
}

// 4. reserveID完全一致確認
console.log('[4] reserveId完全一致確認');

const gasIds = new Set(
  gasTodayRows.map(r => r.reserveId || r.reserve_id).filter(id => id)
);
const supabaseIds = new Set(
  supabaseTodayRows.map(r => r.reserve_id).filter(id => id)
);

const inGasNotSupabase = [...gasIds].filter(id => !supabaseIds.has(id));
const inSupabaseNotGas = [...supabaseIds].filter(id => !gasIds.has(id));

if (inGasNotSupabase.length === 0 && inSupabaseNotGas.length === 0) {
  console.log('  ✅ reserveId完全一致\n');
} else {
  console.log('  ❌ reserveIdに差分あり\n');

  if (inGasNotSupabase.length > 0) {
    console.log(`  GASにあってSupabaseにない: ${inGasNotSupabase.length}件`);
    inGasNotSupabase.forEach(id => {
      const row = gasTodayRows.find(r => (r.reserveId || r.reserve_id) === id);
      console.log(`    - ${id}`);
      console.log(`      PID: ${row.patient_id}, 名前: ${row.patient_name || row.name}, 時間: ${row.reserved_time || row['予約時間']}`);
    });
    console.log('');
  }

  if (inSupabaseNotGas.length > 0) {
    console.log(`  SupabaseにあってGASにない: ${inSupabaseNotGas.length}件`);
    inSupabaseNotGas.forEach(id => {
      const row = supabaseTodayRows.find(r => r.reserve_id === id);
      console.log(`    - ${id}`);
      console.log(`      PID: ${row.patient_id}, 名前: ${row.patient_name}, 時間: ${row.reserved_time}`);
    });
    console.log('');
  }
}

// 5. 結論
console.log('=== 結論 ===');
if (gasTodayRows.length === supabaseTodayRows.length &&
    inGasNotSupabase.length === 0 &&
    inSupabaseNotGas.length === 0) {
  console.log('✅ 今日の予約はGASとSupabaseで完全に一致しています');
  console.log(`   件数: ${gasTodayRows.length}件`);
} else {
  console.log('❌ GASとSupabaseに差分があります');
  console.log(`   GAS: ${gasTodayRows.length}件`);
  console.log(`   Supabase: ${supabaseTodayRows.length}件`);
  console.log(`   reserveId差分: GASのみ ${inGasNotSupabase.length}件, Supabaseのみ ${inSupabaseNotGas.length}件`);
}
console.log('');
