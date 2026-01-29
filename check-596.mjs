// check-596.mjs
// patient_id: 20260101596のデータを確認

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

const pid = '20260101596';
console.log(`=== Patient ${pid} の状態確認 ===\n`);

// Supabaseデータを確認
const { data, error } = await supabase
  .from('intake')
  .select('patient_id, patient_name, answerer_id, line_id, created_at, answers')
  .eq('patient_id', pid)
  .single();

if (error) {
  console.log('❌ Supabaseに存在しません:', error.message);
} else {
  console.log('✅ Supabaseに存在します');
  console.log('  patient_name:', data.patient_name || '(空)');
  console.log('  answerer_id:', data.answerer_id || '(空)');
  console.log('  line_id:', data.line_id || '(空)');
  console.log('  created_at:', data.created_at);
  console.log('\n  answers.氏名:', data.answers?.氏名 || '(空)');
  console.log('  answers.name:', data.answers?.name || '(空)');
  console.log('  answers.answerer_id:', data.answers?.answerer_id || '(空)');
  console.log('  answers.line_id:', data.answers?.line_id || '(空)');
}

// GASデータを確認
console.log('\nGASシートデータ:');
const gasRes = await fetch(envVars.GAS_INTAKE_LIST_URL);
const gasData = await gasRes.json();
const gasRows = gasData.ok ? gasData.rows : gasData;
const gasRow = gasRows.find(r => String(r.patient_id || '').trim() === pid);

if (!gasRow) {
  console.log('  ❌ GASに存在しません');
} else {
  console.log('  ✅ GASに存在します');
  console.log('  patient_name:', gasRow.patient_name || gasRow.name || '(空)');
  console.log('  answerer_id:', gasRow.answerer_id || '(空)');
  console.log('  line_id:', gasRow.line_id || '(空)');
  console.log('  submittedAt:', gasRow.submittedAt || '(空)');
  console.log('  timestamp:', gasRow.timestamp || '(空)');
}

console.log('\n問題分析:');
if (data && (!data.patient_name || !data.answerer_id || !data.line_id)) {
  console.log('❌ Supabaseで個人情報が欠損しています');

  if (gasRow && (gasRow.patient_name || gasRow.name)) {
    console.log('⚠️ GASには情報があるのにSupabaseに反映されていません');
    console.log('⚠️ masterInfo更新処理が動作していない可能性');
  }
}
