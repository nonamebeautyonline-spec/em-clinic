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

const pid = '20260101592';
console.log(`=== Patient ${pid} 確認 ===\n`);

// Supabase
const { data, error } = await supabase
  .from('intake')
  .select('*')
  .eq('patient_id', pid)
  .single();

if (error) {
  console.log('❌ Supabaseに存在しません:', error.message);
} else {
  console.log('✅ Supabaseに存在します');
  console.log('  patient_name:', data.patient_name || '(空)');
  console.log('  answerer_id:', data.answerer_id || '(空)');
  console.log('  line_id:', data.line_id || '(空)');
  console.log('  reserve_id:', data.reserve_id || '(空)');
  console.log('  reserved_date:', data.reserved_date || '(空)');
  console.log('  created_at:', data.created_at);
}

// GAS
console.log('\nGASシート:');
const gasRes = await fetch(envVars.GAS_INTAKE_LIST_URL);
const gasData = await gasRes.json();
const gasRows = gasData.ok ? gasData.rows : gasData;
const gasRow = gasRows.find(r => String(r.patient_id || '').trim() === pid);

if (!gasRow) {
  console.log('  ❌ GASに存在しません');
  console.log('  → 予約だけ作られて問診が送信されていない可能性');
} else {
  console.log('  ✅ GASに存在します');
  console.log('  name:', gasRow.name || '(空)');
}
