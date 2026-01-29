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

const pid = '20260101598';
console.log(`=== Patient ${pid} 完全確認 ===\n`);

const { data: intake } = await supabase
  .from('intake')
  .select('*')
  .eq('patient_id', pid)
  .single();

console.log('Supabase intake:');
console.log('  patient_name:', intake?.patient_name || '(空)');
console.log('  reserve_id:', intake?.reserve_id || '(空)');
console.log('  answerer_id:', intake?.answerer_id || '(空)');
console.log('  line_id:', intake?.line_id || '(空)');

console.log('\nSupabase reservations:');
const { data: reservations } = await supabase
  .from('reservations')
  .select('*')
  .eq('patient_id', pid);

if (reservations && reservations.length > 0) {
  console.log(`  ✅ ${reservations.length}件`);
  for (const r of reservations) {
    console.log(`    ${r.reserve_id}: ${r.reserved_date} ${r.reserved_time}`);
  }
} else {
  console.log('  ❌ なし');
}

console.log('\nGAS:');
const gasRes = await fetch(envVars.GAS_INTAKE_LIST_URL);
const gasData = await gasRes.json();
const gasRows = gasData.ok ? gasData.rows : gasData;
const row = gasRows.find(r => String(r.patient_id || '').trim() === pid);
console.log(row ? '  ✅ あり' : '  ❌ なし');

if (reservations && reservations.length > 0 && !intake?.reserve_id) {
  console.log('\n❌ 予約はあるがintakeのreserve_idが空 → 修正必要');
}
