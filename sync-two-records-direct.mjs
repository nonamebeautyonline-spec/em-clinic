// sync-two-records-direct.mjs
// 不足している2件を直接Supabaseに追加

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

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('=== 不足している2件を直接追加 ===\n');

// 手動で2件のデータを定義（check-latest-reservations.mjsの出力から）
const records = [
  {
    patient_id: '20260101568',
    reserve_id: 'resv-1769612787721',
    reserved_date: '2026-01-29',
    reserved_time: '17:15',
    patient_name: '板垣  春香',
    status: null,
    note: null,
    prescription_menu: null,
    line_id: null,
    answerer_id: null,
    answers: {}
  },
  {
    patient_id: '20260101569',
    reserve_id: 'resv-1769612892716',
    reserved_date: '2026-01-31',
    reserved_time: '11:45',
    patient_name: '大井楓',
    status: null,
    note: null,
    prescription_menu: null,
    line_id: null,
    answerer_id: null,
    answers: {}
  }
];

console.log('[1] Supabaseに挿入中...\n');

for (const record of records) {
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
      console.log(`  ✅ 成功\n`);
    } else {
      const errorText = await response.text();
      console.log(`  ❌ 失敗: ${response.status} ${errorText}\n`);
    }
  } catch (e) {
    console.log(`  ❌ エラー: ${e.message}\n`);
  }
}

console.log('[2] 追加完了後の確認...\n');

for (const record of records) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/intake?patient_id=eq.${record.patient_id}`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (data.length > 0) {
      console.log(`  ✅ PID: ${record.patient_id} - Supabaseに存在します`);
      console.log(`     reserveId: ${data[0].reserve_id}`);
      console.log(`     予約: ${data[0].reserved_date} ${data[0].reserved_time}`);
      console.log('');
    } else {
      console.log(`  ❌ PID: ${record.patient_id} - Supabaseに存在しません\n`);
    }
  } catch (e) {
    console.log(`  ❌ PID: ${record.patient_id} - エラー: ${e.message}\n`);
  }
}

console.log('=== 完了 ===');
