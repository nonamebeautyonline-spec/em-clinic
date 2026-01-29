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

const pid = '20260101597';
console.log(`=== Patient ${pid} 確認 ===\n`);

// Supabase intake
const { data: intake, error: intakeError } = await supabase
  .from('intake')
  .select('*')
  .eq('patient_id', pid)
  .single();

if (intakeError) {
  console.log('❌ Supabase intakeに存在しません:', intakeError.message);
} else {
  console.log('✅ Supabase intakeに存在します');
  console.log('  patient_name:', intake.patient_name || '(空)');
  console.log('  answerer_id:', intake.answerer_id || '(空)');
  console.log('  line_id:', intake.line_id || '(空)');
  console.log('  reserve_id:', intake.reserve_id || '(空)');
  console.log('  reserved_date:', intake.reserved_date || '(空)');
  console.log('  reserved_time:', intake.reserved_time || '(空)');
  console.log('  created_at:', intake.created_at);
}

// Supabase reservations
console.log('\nSupabase reservations:');
const { data: reservations } = await supabase
  .from('reservations')
  .select('*')
  .eq('patient_id', pid);

if (reservations && reservations.length > 0) {
  console.log(`  ✅ ${reservations.length}件の予約があります`);
  for (const r of reservations) {
    console.log(`    - ${r.reserved_date} ${r.reserved_time} (${r.reserve_id})`);
  }
} else {
  console.log('  予約なし');
}

// GAS
console.log('\nGASシート:');
const gasRes = await fetch(envVars.GAS_INTAKE_LIST_URL);
const gasData = await gasRes.json();
const gasRows = gasData.ok ? gasData.rows : gasData;
const gasRow = gasRows.find(r => String(r.patient_id || '').trim() === pid);

if (!gasRow) {
  console.log('  ❌ GASに存在しません');
} else {
  console.log('  ✅ GASに存在します');
  console.log('  name:', gasRow.name || '(空)');
  console.log('  answerer_id:', gasRow.answerer_id || '(空)');
  console.log('  line_id:', gasRow.line_id || '(空)');
  console.log('  reserved_date:', gasRow.reserved_date || '(空)');
  console.log('  reserved_time:', gasRow.reserved_time || '(空)');
  console.log('  submittedAt:', gasRow.submittedAt);
}

console.log('\n問題分析:');
if (intake && (!intake.patient_name || !intake.answerer_id)) {
  console.log('❌ 個人情報が欠損しています → 修正が必要');
} else if (intake) {
  console.log('✅ 個人情報は正常です');
}

if (intake && !intake.reserve_id && (!reservations || reservations.length === 0)) {
  console.log('⚠️ 予約情報がありません');
} else if (intake && intake.reserve_id) {
  console.log('✅ 予約情報あり:', intake.reserve_id);
}
