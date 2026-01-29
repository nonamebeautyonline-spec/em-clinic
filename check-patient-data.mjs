// check-patient-data.mjs
// GASとSupabaseの患者データを比較

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

const patientId = process.argv[2] || '20260101584';

console.log(`=== PID ${patientId} データ比較 ===\n`);

// GASから取得
console.log('[1] GASから取得中...');
const gasResponse = await fetch(GAS_INTAKE_URL, { method: 'GET' });
const gasData = await gasResponse.json();
const gasRows = gasData.ok ? gasData.rows : gasData;
const gasRow = gasRows.find(r => r.patient_id === patientId);

if (gasRow) {
  console.log('\n【GASシート】');
  console.log('  patient_id:', gasRow.patient_id);
  console.log('  patient_name:', gasRow.patient_name || gasRow.name);
  console.log('  reserveId:', gasRow.reserveId || gasRow.reserve_id);
  console.log('  reserved_date:', gasRow.reserved_date);
  console.log('  reserved_time:', gasRow.reserved_time);
  console.log('  tel:', gasRow.tel || '(空)');
  console.log('  answerer_id:', gasRow.answerer_id || '(空)');

  // answersの中身を確認
  if (gasRow.answers) {
    console.log('\n  answers内の主要フィールド:');
    const keys = ['氏名', 'カナ', '性別', '生年月日', '電話番号', 'answerer_id'];
    keys.forEach(key => {
      if (gasRow.answers[key] !== undefined) {
        console.log(`    ${key}:`, gasRow.answers[key]);
      }
    });
  }
} else {
  console.log('❌ GASにデータなし');
}

// Supabaseから取得
console.log('\n[2] Supabaseから取得中...');
const supabaseResponse = await fetch(
  `${SUPABASE_URL}/rest/v1/intake?patient_id=eq.${patientId}`,
  {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  }
);

const supabaseData = await supabaseResponse.json();

if (supabaseData.length > 0) {
  const row = supabaseData[0];
  console.log('\n【Supabase】');
  console.log('  patient_id:', row.patient_id);
  console.log('  patient_name:', row.patient_name || '(空)');
  console.log('  reserve_id:', row.reserve_id || '(空)');
  console.log('  reserved_date:', row.reserved_date || '(空)');
  console.log('  reserved_time:', row.reserved_time || '(空)');
  console.log('  tel:', row.tel || '(空)');
  console.log('  answerer_id:', row.answerer_id || '(空)');

  if (row.answers) {
    console.log('\n  answers内の主要フィールド:');
    const keys = ['氏名', 'カナ', '性別', '生年月日', '電話番号', 'answerer_id'];
    keys.forEach(key => {
      if (row.answers[key] !== undefined) {
        console.log(`    ${key}:`, row.answers[key]);
      }
    });
  }
} else {
  console.log('❌ Supabaseにデータなし');
}

// 差分確認
console.log('\n[3] 差分確認');
if (gasRow && supabaseData.length > 0) {
  const sb = supabaseData[0];
  const diffs = [];

  if ((gasRow.patient_name || gasRow.name) !== sb.patient_name) {
    diffs.push(`  patient_name: GAS="${gasRow.patient_name || gasRow.name}" vs Supabase="${sb.patient_name}"`);
  }
  if ((gasRow.reserveId || gasRow.reserve_id) !== sb.reserve_id) {
    diffs.push(`  reserve_id: GAS="${gasRow.reserveId || gasRow.reserve_id}" vs Supabase="${sb.reserve_id}"`);
  }
  if (gasRow.reserved_date !== sb.reserved_date) {
    diffs.push(`  reserved_date: GAS="${gasRow.reserved_date}" vs Supabase="${sb.reserved_date}"`);
  }
  if (gasRow.reserved_time !== sb.reserved_time) {
    diffs.push(`  reserved_time: GAS="${gasRow.reserved_time}" vs Supabase="${sb.reserved_time}"`);
  }
  if (gasRow.tel !== sb.tel) {
    diffs.push(`  tel: GAS="${gasRow.tel}" vs Supabase="${sb.tel}"`);
  }
  if (gasRow.answerer_id !== sb.answerer_id) {
    diffs.push(`  answerer_id: GAS="${gasRow.answerer_id || '(空)'}" vs Supabase="${sb.answerer_id || '(空)'}"`);
  }

  if (diffs.length > 0) {
    console.log('❌ 差分あり:');
    diffs.forEach(d => console.log(d));
  } else {
    console.log('✅ 差分なし');
  }

  // answers内の差分
  if (gasRow.answers && sb.answers) {
    const answerDiffs = [];
    const keys = ['氏名', 'カナ', '性別', '生年月日', '電話番号', 'answerer_id'];
    keys.forEach(key => {
      const gasVal = String(gasRow.answers[key] || '');
      const sbVal = String(sb.answers[key] || '');
      if (gasVal !== sbVal) {
        answerDiffs.push(`  answers.${key}: GAS="${gasVal}" vs Supabase="${sbVal}"`);
      }
    });

    if (answerDiffs.length > 0) {
      console.log('\n❌ answers内の差分:');
      answerDiffs.forEach(d => console.log(d));
    }
  }
}

console.log('\n=== 完了 ===');
