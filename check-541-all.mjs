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

const patientId = "20260101541";

console.log(`=== Patient ID: ${patientId} の確認 ===\n`);

const { data: intakes, error } = await supabase
  .from('intake')
  .select('patient_id, patient_name, answerer_id, line_id, created_at')
  .eq('patient_id', patientId);

if (error) {
  console.error('エラー:', error.message);
  process.exit(1);
}

console.log(`該当件数: ${intakes.length}件\n`);

if (intakes.length === 0) {
  console.log('❌ Supabaseに存在しません');
} else {
  for (const intake of intakes) {
    console.log('--- レコード ---');
    console.log('  patient_id:', intake.patient_id);
    console.log('  patient_name:', intake.patient_name || '(なし)');
    console.log('  answerer_id:', intake.answerer_id || '(なし)');
    console.log('  line_id:', intake.line_id || '(なし)');
    console.log('  created_at:', new Date(intake.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
    
    if (!intake.patient_name || !intake.answerer_id || !intake.line_id) {
      console.log('  ❌ 個人情報欠損');
    } else {
      console.log('  ✅ OK');
    }
    console.log('');
  }
}
