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
    value = value.replace(/^"/, '').replace(/"$/, '');
    env[key] = value;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const today = new Date().toISOString().split('T')[0]; // 2026-02-02

console.log(`=== 今日（${today}）の重複予約チェック ===\n`);

// Get all reservations for today
const { data: reservations, error } = await supabase
  .from('reservations')
  .select('*')
  .eq('reserved_date', today)
  .order('patient_id')
  .order('reserved_time');

if (error) {
  console.error('❌ Error fetching reservations:', error);
  process.exit(1);
}

if (!reservations || reservations.length === 0) {
  console.log('No reservations for today');
  process.exit(0);
}

console.log(`Total reservations today: ${reservations.length}\n`);

// Group by patient_id
const byPatient = {};
for (const res of reservations) {
  if (!byPatient[res.patient_id]) {
    byPatient[res.patient_id] = [];
  }
  byPatient[res.patient_id].push(res);
}

// Find duplicates
const duplicates = Object.entries(byPatient).filter(([_, resList]) => resList.length > 1);

if (duplicates.length === 0) {
  console.log('✅ No duplicate reservations found for today');
  process.exit(0);
}

console.log(`⚠️ Found ${duplicates.length} patients with duplicate reservations:\n`);

for (const [patientId, resList] of duplicates) {
  console.log(`\n--- Patient ID: ${patientId} ---`);
  console.log(`Reservations: ${resList.length}`);

  // Get patient name from intake
  const { data: intake } = await supabase
    .from('intake')
    .select('patient_name, phone, patient_kana')
    .eq('patient_id', patientId)
    .single();

  if (intake) {
    console.log(`Patient: ${intake.patient_name || 'Unknown'}`);
    console.log(`Phone: ${intake.phone || 'Missing'}`);
    console.log(`Kana: ${intake.patient_kana || 'Missing'}`);
  }

  console.log('\nReservations:');
  for (const res of resList) {
    console.log(`  ${res.reserved_date} ${res.reserved_time} - reserve_id: ${res.reserve_id} - status: ${res.status || 'pending'}`);
  }

  // Check if one should be canceled
  const activeCanceled = resList.filter(r => r.status !== 'canceled');
  if (activeCanceled.length > 1) {
    console.log(`\n⚠️ WARNING: ${activeCanceled.length} active reservations (not canceled)`);
  }
}

console.log('\n\n=== サマリー ===');
console.log(`Total patients with duplicates: ${duplicates.length}`);
console.log(`Total reservations: ${reservations.length}`);
