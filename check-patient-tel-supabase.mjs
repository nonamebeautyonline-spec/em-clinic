// check-patient-tel-supabase.mjs
// 特定の患者のSupabaseデータを確認

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
const patientId = process.argv[2] || '20260101583';

console.log(`=== PID ${patientId} のSupabaseデータ確認 ===\n`);

try {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/intake?patient_id=eq.${patientId}`,
    {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }
  );

  const data = await response.json();

  if (data.length > 0) {
    const row = data[0];
    console.log(`patient_id: ${row.patient_id}`);
    console.log(`patient_name: ${row.patient_name}`);
    console.log(`reserved_date: ${row.reserved_date}`);
    console.log(`reserved_time: ${row.reserved_time}`);
    console.log(`tel (カラム): ${row.tel || '(空)'}`);
    console.log(`answers.tel: ${(row.answers && row.answers.tel) || '(空)'}`);
    console.log(`verified_phone: ${row.verified_phone || '(空)'}`);

    if (row.tel) {
      console.log('\n✅ telカラムに電話番号あり');
    } else {
      console.log('\n❌ telカラムが空');
    }
  } else {
    console.log('❌ データが見つかりません');
  }
} catch (e) {
  console.log('❌ エラー:', e.message);
}

console.log('\n=== 完了 ===');
