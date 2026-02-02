import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?([^"]*)"?$/);
  if (match && match[1] && match[2]) {
    const key = match[1].trim();
    let value = match[2].trim();
    // Remove quotes
    value = value.replace(/^"/, '').replace(/"$/, '');
    env[key] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
// Use GAS_MYPAGE_URL as it provides intake data
const gasIntakeUrl = env.GAS_INTAKE_URL || env.GAS_MYPAGE_URL;

const supabase = createClient(supabaseUrl, supabaseKey);

const patientIds = [
  '20260100833',
  '20260100743',
  '20260100630',
  '20260100756',
  '20260100798',
  '20260100844'
];

console.log('=== 問診データ確認：カナ・電話番号欠損調査 ===\n');

for (const patientId of patientIds) {
  console.log(`\n--- Patient ID: ${patientId} ---`);

  // Supabase intakeデータを確認
  const { data: intakeData, error: intakeError } = await supabase
    .from('intake')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (intakeError) {
    console.error('❌ Intake fetch error:', intakeError);
    continue;
  }

  if (!intakeData || intakeData.length === 0) {
    console.log('❌ No intake data found in Supabase');
    continue;
  }

  console.log(`\n📊 Supabase intake records: ${intakeData.length}`);

  for (const intake of intakeData) {
    console.log('\nIntake record:');
    console.log('  created_at:', intake.created_at);
    console.log('  patient_id:', intake.patient_id);
    console.log('  patient_name:', intake.patient_name);
    console.log('  patient_kana:', intake.patient_kana || '❌ MISSING');
    console.log('  phone:', intake.phone || '❌ MISSING');
    console.log('  email:', intake.email);
    console.log('  answerer_id (Lstep):', intake.answerer_id);
    console.log('  status:', intake.status);
  }

  // 今日の予約を確認
  const today = new Date().toISOString().split('T')[0];
  const { data: reservations } = await supabase
    .from('reservations')
    .select('*')
    .eq('patient_id', patientId)
    .gte('reserved_date', today)
    .order('reserved_date', { ascending: true });

  if (reservations && reservations.length > 0) {
    console.log('\n📅 Today\'s reservations:');
    for (const res of reservations) {
      console.log(`  ${res.reserved_date} ${res.reserved_time} - Status: ${res.status || 'pending'}`);
    }
  } else {
    console.log('\n❌ No reservations found for today');
  }
}

console.log('\n\n=== GAS問診データ確認 ===');
console.log('Next: Check GAS intake sheet for these patient_ids');
console.log('GAS Intake API: ' + gasIntakeUrl);
console.log('\nFetching from GAS...\n');

// Fetch from GAS for each patient
for (const patientId of patientIds) {
  console.log(`\n--- GAS data for ${patientId} ---`);
  try {
    const response = await fetch(gasIntakeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'get_intake', patient_id: patientId })
    });

    if (!response.ok) {
      console.error(`❌ GAS request failed: ${response.status}`);
      continue;
    }

    const gasData = await response.json();
    console.log('GAS Response:', JSON.stringify(gasData, null, 2));

    if (gasData.status === 'ok' && gasData.intake) {
      const intake = gasData.intake;
      console.log('\n📊 GAS intake data:');
      console.log('  patient_id:', intake.patient_id);
      console.log('  patient_name:', intake.patient_name);
      console.log('  patient_kana:', intake.patient_kana || '❌ MISSING');
      console.log('  phone:', intake.phone || '❌ MISSING');
      console.log('  email:', intake.email);
    }
  } catch (error) {
    console.error('❌ GAS fetch error:', error.message);
  }
}
