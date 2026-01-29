// check-specific-patient.mjs
// 特定の患者IDがSupabaseに存在するか確認

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

const patientId = '20260101567';

console.log(`=== 患者ID ${patientId} の確認 ===\n`);

try {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/intake?patient_id=eq.${patientId}`,
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
    console.log('❌ Supabaseにこの患者IDは存在しません\n');
  } else {
    console.log(`✅ Supabaseに存在します（${data.length}件）\n`);
    data.forEach((row, i) => {
      console.log(`レコード ${i + 1}:`);
      console.log(`  reserve_id: ${row.reserve_id || '(なし)'}`);
      console.log(`  reserved_date: ${row.reserved_date || '(なし)'}`);
      console.log(`  reserved_time: ${row.reserved_time || '(なし)'}`);
      console.log(`  patient_name: ${row.patient_name || '(なし)'}`);
      console.log(`  status: ${row.status || '(なし)'}`);
      console.log(`  created_at: ${row.created_at}`);
      console.log('');
    });
  }
} catch (e) {
  console.log('❌ エラー:', e.message);
}
