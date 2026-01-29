// check-588.mjs
// patient_id: 20260101591のデータを確認

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

const patientId = "20260101591";

console.log(`=== Patient ID: ${patientId} のデータ確認 ===\n`);

// 1. Supabaseのintakeテーブルを確認
console.log('1. Supabaseデータ:');
const { data: intake, error } = await supabase
  .from('intake')
  .select('patient_id, patient_name, answerer_id, line_id, answers')
  .eq('patient_id', patientId)
  .single();

if (error) {
  console.error('エラー:', error.message);
  process.exit(1);
}

console.log('  patient_id:', intake.patient_id);
console.log('  patient_name:', intake.patient_name || '(なし)');
console.log('  answerer_id:', intake.answerer_id || '(なし)');
console.log('  line_id:', intake.line_id || '(なし)');
console.log('  answers.氏名:', intake.answers?.氏名 || '(なし)');
console.log('  answers.性別:', intake.answers?.性別 || '(なし)');
console.log('  answers.生年月日:', intake.answers?.生年月日 || '(なし)');
console.log('  answers.カナ:', intake.answers?.カナ || '(なし)');

// 2. GASシートのデータを確認
console.log('\n2. GASシートデータ:');
const GAS_INTAKE_URL = envVars.GAS_INTAKE_LIST_URL;

const gasRes = await fetch(GAS_INTAKE_URL, { method: 'GET' });
const gasData = await gasRes.json();
const gasRows = gasData.ok ? gasData.rows : gasData;

const gasMatch = gasRows.find(r => String(r.patient_id).trim() === patientId);

if (!gasMatch) {
  console.error('  ❌ GASシートに該当データが見つかりません');
  process.exit(1);
}

console.log('  patient_id:', gasMatch.patient_id);
console.log('  patient_name:', gasMatch.patient_name || gasMatch.name || '(なし)');
console.log('  sex:', gasMatch.sex || '(なし)');
console.log('  birth:', gasMatch.birth || '(なし)');
console.log('  name_kana:', gasMatch.name_kana || '(なし)');
console.log('  tel:', gasMatch.tel || '(なし)');
console.log('  answerer_id:', gasMatch.answerer_id || '(なし)');
console.log('  line_id:', gasMatch.line_id || '(なし)');

// 3. 比較
console.log('\n=== 結果 ===');
if (!intake.patient_name && gasMatch.patient_name) {
  console.log('❌ Supabaseに氏名が保存されていません');
  console.log('   GASには存在: ', gasMatch.patient_name || gasMatch.name);
}
if (!intake.answerer_id && gasMatch.answerer_id) {
  console.log('❌ Supabaseにanswerer_idが保存されていません');
  console.log('   GASには存在: ', gasMatch.answerer_id);
}
if (!intake.line_id && gasMatch.line_id) {
  console.log('❌ Supabaseにline_idが保存されていません');
  console.log('   GASには存在: ', gasMatch.line_id);
}

if (!intake.patient_name || !intake.answerer_id || !intake.line_id) {
  console.log('\n修正が必要です。fix-588.mjsを作成します。');
}
