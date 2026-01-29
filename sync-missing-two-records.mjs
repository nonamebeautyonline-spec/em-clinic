// sync-missing-two-records.mjs
// 最新の2件の予約を手動でSupabaseに同期

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

console.log('=== 不足している2件のレコードを同期 ===\n');

const missingPids = ['20260101568', '20260101569'];

// 1. GASから該当患者のデータを取得
console.log('[1] GASからデータ取得中...');
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

// 2. 不足している2件を抽出
console.log('[2] 不足データを抽出中...');
const missingRecords = gasRows.filter(r => missingPids.includes(r.patient_id));

console.log(`  見つかった件数: ${missingRecords.length}件\n`);

if (missingRecords.length === 0) {
  console.log('❌ 対象データが見つかりませんでした');
  process.exit(1);
}

// 3. Supabaseに挿入
console.log('[3] Supabaseに挿入中...\n');

for (const row of missingRecords) {
  const record = {
    patient_id: String(row.patient_id || '').trim(),
    reserve_id: String(row.reserveId || row.reserve_id || '').trim() || null,
    reserved_date: String(row.reserved_date || '').trim() || null,
    reserved_time: String(row.reserved_time || '').trim() || null,
    patient_name: String(row.patient_name || row.name || row['氏名'] || '').trim() || null,
    status: String(row.status || '').trim() || null,
    note: String(row.note || '').trim() || null,
    prescription_menu: String(row.prescription_menu || '').trim() || null,
    line_id: String(row.line_id || '').trim() || null,
    answerer_id: String(row.answerer_id || '').trim() || null,
    answers: {}
  };

  // answersを抽出
  for (const key of Object.keys(row)) {
    if (![
      'patient_id',
      'reserve_id',
      'reserved_date',
      'reserved_time',
      'patient_name',
      'status',
      'note',
      'prescription_menu',
      'line_id',
      'answerer_id',
      '予約時間',
      'reserveId'
    ].includes(key) &&
      row[key] !== undefined &&
      row[key] !== null &&
      row[key] !== '') {
      record.answers[key] = row[key];
    }
  }

  console.log(`  挿入: PID=${record.patient_id}, reserveId=${record.reserve_id}`);

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/intake`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(record)
    });

    if (response.ok) {
      console.log(`  ✅ 成功: PID=${record.patient_id}\n`);
    } else {
      const errorText = await response.text();
      console.log(`  ❌ 失敗: ${response.status} ${errorText}\n`);
    }
  } catch (e) {
    console.log(`  ❌ エラー: ${e.message}\n`);
  }
}

console.log('=== 同期完了 ===');
