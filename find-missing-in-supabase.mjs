// find-missing-in-supabase.mjs
// GASシートに存在するがSupabaseに存在しないレコードを検索

import { createClient } from '@supabase/supabase-js';
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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const GAS_INTAKE_URL = envVars.GAS_INTAKE_LIST_URL;

console.log('=== GASにあるがSupabaseにないレコードを検索 ===\n');

// 1. GASシートから全データ取得
console.log('1. GASシートから全データ取得中...');
const gasRes = await fetch(GAS_INTAKE_URL, { method: 'GET' });
const gasData = await gasRes.json();
const gasRows = gasData.ok ? gasData.rows : gasData;

console.log(`  取得: ${gasRows.length}件\n`);

// 2. Supabaseから全patient_idを取得
console.log('2. Supabaseから全patient_idを取得中...');
const allSupabaseIds = new Set();
let offset = 0;
const batchSize = 1000;

while (true) {
  const { data: batch, error } = await supabase
    .from('intake')
    .select('patient_id')
    .range(offset, offset + batchSize - 1);

  if (error) {
    console.error('❌ Supabase取得エラー:', error.message);
    process.exit(1);
  }

  if (batch.length === 0) break;

  for (const record of batch) {
    allSupabaseIds.add(record.patient_id);
  }

  offset += batchSize;

  if (batch.length < batchSize) break;
}

console.log(`  取得: ${allSupabaseIds.size}件\n`);

// 3. 差分を検出
console.log('3. 差分を検出中...\n');

const missingInSupabase = [];

for (const row of gasRows) {
  const pid = String(row.patient_id || '').trim();
  if (!pid) continue;

  if (!allSupabaseIds.has(pid)) {
    missingInSupabase.push({
      patient_id: pid,
      patient_name: row.patient_name || row.name || '(なし)',
      answerer_id: row.answerer_id || '(なし)',
      line_id: row.line_id || '(なし)',
      reserved_date: row.reserved_date || '(なし)'
    });
  }
}

console.log('=== 結果 ===\n');
console.log(`GASシート: ${gasRows.length}件`);
console.log(`Supabase: ${allSupabaseIds.size}件`);
console.log(`Supabaseに存在しない: ${missingInSupabase.length}件\n`);

if (missingInSupabase.length === 0) {
  console.log('✅ 全てのGASレコードがSupabaseに存在します');
} else {
  console.log('❌ 以下のレコードがSupabaseに存在しません:\n');

  // 最新10件を表示
  const toShow = missingInSupabase.slice(0, 20);
  for (const record of toShow) {
    console.log(`${record.patient_id}: ${record.patient_name}`);
    console.log(`  answerer_id: ${record.answerer_id}`);
    console.log(`  line_id: ${record.line_id}`);
    console.log(`  reserved_date: ${record.reserved_date}`);
    console.log('');
  }

  if (missingInSupabase.length > 20) {
    console.log(`... 他 ${missingInSupabase.length - 20}件\n`);
  }

  // 一括作成スクリプトのデータを保存
  const fs = await import('fs');
  fs.writeFileSync(
    'missing-records.json',
    JSON.stringify(missingInSupabase, null, 2)
  );
  console.log('詳細データを missing-records.json に保存しました');
}
