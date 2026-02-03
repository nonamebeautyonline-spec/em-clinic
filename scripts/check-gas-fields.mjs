import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const gasUrl = env.GAS_MYPAGE_URL;

const targetFields = [
  'timestamp', 'reserveId', 'submittedAt', 'name', 'sex', 'birth', 'line_id',
  'reserved_date', 'reserved_time', 'ng_check', 'current_disease_yesno',
  'current_disease_detail', 'glp_history', 'med_yesno', 'med_detail',
  'allergy_yesno', 'allergy_detail', 'entry_route', 'entry_other',
  'status', 'doctor_note', 'prescription_menu', 'name_kana', 'tel',
  'answerer_id', 'patient_id', 'intakeId', 'call_status', 'call_status_updated_at',
  'verified_phone', 'verified_at', 'delivery_date', 'time_band',
  'hold_flag', 'hold_code', 'delivery_updated_at', 'delivery_locked_at'
];

async function main() {
  console.log('=== 同期対象フィールド確認 ===\n');

  const res = await fetch(gasUrl);
  const gasData = await res.json();

  console.log('【GAS フィールド別 値あり件数】 (全', gasData.length, '件中)');
  const gasFieldCounts = {};
  targetFields.forEach(f => gasFieldCounts[f] = 0);

  gasData.forEach(row => {
    targetFields.forEach(f => {
      const val = row[f];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        gasFieldCounts[f]++;
      }
    });
  });

  targetFields.forEach(f => {
    console.log(`  ${f}: ${gasFieldCounts[f]}件`);
  });

  // DBのanswersサンプル
  const { data: dbSample } = await supabase
    .from('intake')
    .select('answers')
    .not('answers', 'is', null)
    .limit(1)
    .single();

  if (dbSample?.answers) {
    console.log('\n【DB answers サンプルのキー】');
    console.log(Object.keys(dbSample.answers).sort().join(', '));
  }
}

main().catch(console.error);
