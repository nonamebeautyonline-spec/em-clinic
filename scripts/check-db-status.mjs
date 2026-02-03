import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// .env.localから読み込み
const envContent = readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) {
    let val = vals.join('=').trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key.trim()] = val;
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// date_overridesの確認
const { data: overrides, error: e1 } = await supabase
  .from('doctor_date_overrides')
  .select('*')
  .order('date');

console.log('=== doctor_date_overrides (日別例外設定) ===');
console.log('件数:', overrides?.length || 0);
if (overrides?.length > 0) {
  console.log('データ:', JSON.stringify(overrides, null, 2));
}
if (e1) console.log('Error:', e1.message);

// 3月の予約確認
const { data: reservations, error: e2 } = await supabase
  .from('reservations')
  .select('id, date, time, patient_name, status')
  .gte('date', '2025-03-01')
  .lte('date', '2025-03-31')
  .order('date');

console.log('\n=== 2025年3月の予約 ===');
console.log('件数:', reservations?.length || 0);
if (reservations?.length > 0) {
  console.log(JSON.stringify(reservations, null, 2));
}
if (e2) console.log('Error:', e2.message);

// weekly_rulesの確認
const { data: rules, error: e3 } = await supabase
  .from('doctor_weekly_rules')
  .select('*');

console.log('\n=== doctor_weekly_rules (週間テンプレート) ===');
console.log('件数:', rules?.length || 0);
if (rules?.length > 0) {
  console.log('データ:', JSON.stringify(rules, null, 2));
}
if (e3) console.log('Error:', e3.message);
