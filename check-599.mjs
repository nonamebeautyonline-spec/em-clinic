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

const pid = '20260101599';
console.log(`=== Patient ${pid} 確認 ===\n`);

// Supabase
const { data: intake } = await supabase
  .from('intake')
  .select('*')
  .eq('patient_id', pid)
  .single();

if (intake) {
  console.log('Supabase intake:');
  console.log('  patient_name:', intake.patient_name || '(空)');
  console.log('  answerer_id:', intake.answerer_id || '(空)');
  console.log('  line_id:', intake.line_id || '(空)');
  console.log('\n  answers.氏名:', intake.answers?.氏名 || '(空)');
  console.log('  answers.電話番号:', intake.answers?.電話番号 || '(空)');
  console.log('  answers.tel:', intake.answers?.tel || '(空)');
}

// GAS
console.log('\nGAS:');
const gasRes = await fetch(envVars.GAS_INTAKE_LIST_URL);
const gasData = await gasRes.json();
const gasRows = gasData.ok ? gasData.rows : gasData;
const row = gasRows.find(r => String(r.patient_id || '').trim() === pid);

if (row) {
  console.log('  ✅ あり');
  console.log('  name:', row.name || '(空)');
  console.log('  tel:', row.tel || '(空)');
  console.log('  answerer_id:', row.answerer_id || '(空)');
  console.log('  line_id:', row.line_id || '(空)');
} else {
  console.log('  ❌ なし');
}

console.log('\n問題分析:');
if (!intake.answers?.電話番号 && !intake.answers?.tel) {
  console.log('❌ 電話番号が欠損しています');
  if (row && row.tel) {
    console.log('→ GASには電話番号があります: ' + row.tel);
    console.log('→ 補完が必要です');
  }
}
