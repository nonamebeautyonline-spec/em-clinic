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

const pid = '20260100789';
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
}

// Supabase reservations
const { data: reservations } = await supabase
  .from('reservations')
  .select('*')
  .eq('patient_id', pid);

console.log('Supabase reservations:', reservations?.length || 0, '件');

// GAS
const gasRes = await fetch(envVars.GAS_INTAKE_LIST_URL);
const gasData = await gasRes.json();
const gasRows = gasData.ok ? gasData.rows : gasData;
const row = gasRows.find(r => String(r.patient_id || '').trim() === pid);

if (row) {
  console.log('\n✅ GASに存在します');
  console.log('  name:', row.name);
  console.log('  reserved:', row.reserved_date, row.reserved_time);
} else {
  console.log('\n❌ GASに存在しません');
}
