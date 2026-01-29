// check-593.mjs
// patient_id: 20260101593のデータを確認

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

const patientId = "20260101593";

console.log(`=== Patient ID: ${patientId} のデータ確認 ===\n`);

const { data: intake, error } = await supabase
  .from('intake')
  .select('patient_id, patient_name, answerer_id, line_id, created_at, answers')
  .eq('patient_id', patientId)
  .single();

if (error) {
  console.error('❌ Supabaseに存在しません:', error.message);
  process.exit(1);
}

console.log('✅ Supabaseに存在します');
console.log('  patient_id:', intake.patient_id);
console.log('  patient_name:', intake.patient_name || '(なし)');
console.log('  answerer_id:', intake.answerer_id || '(なし)');
console.log('  line_id:', intake.line_id || '(なし)');
console.log('  created_at:', new Date(intake.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
console.log('');
console.log('answers:');
console.log('  氏名:', intake.answers?.氏名 || '(なし)');
console.log('  性別:', intake.answers?.性別 || '(なし)');
console.log('  生年月日:', intake.answers?.生年月日 || '(なし)');
console.log('  カナ:', intake.answers?.カナ || '(なし)');

console.log('');
if (!intake.patient_name || !intake.answerer_id || !intake.line_id) {
  console.log('❌ 個人情報が欠損しています');
} else {
  console.log('✅ 個人情報が正しく保存されています');
}
