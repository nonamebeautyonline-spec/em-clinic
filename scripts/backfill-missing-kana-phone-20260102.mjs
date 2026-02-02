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
const gasIntakeUrl = env.GAS_INTAKE_LIST_URL;

const patientIds = [
  '20260100833',
  '20260100743',
  '20260100630',
  '20260100756',
  '20260100798',
  '20260100844'
];

console.log('=== GASからカナ・電話番号バックフィル ===\n');

// Fetch all intakes from GAS
console.log('Fetching intake list from GAS...');
const response = await fetch(gasIntakeUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'get_all' })
});

if (!response.ok) {
  console.error('❌ GAS request failed:', response.status);
  process.exit(1);
}

const text = await response.text();
let gasData;
try {
  gasData = JSON.parse(text);
} catch (e) {
  console.error('❌ Failed to parse GAS response');
  console.error('Response:', text.substring(0, 500));
  process.exit(1);
}

if (!gasData.intakes || gasData.intakes.length === 0) {
  console.error('❌ No intakes in GAS response');
  process.exit(1);
}

console.log(`✅ Retrieved ${gasData.intakes.length} intakes from GAS\n`);

let backfilledCount = 0;
let alreadyMissingCount = 0;
let errorCount = 0;

for (const patientId of patientIds) {
  console.log(`\n--- Patient ID: ${patientId} ---`);

  const gasIntake = gasData.intakes.find(i => i.patient_id === patientId);

  if (!gasIntake) {
    console.log('⚠️ Not found in GAS');
    alreadyMissingCount++;
    continue;
  }

  console.log('GAS data:');
  console.log('  patient_name:', gasIntake.patient_name || 'MISSING');
  console.log('  patient_kana:', gasIntake.patient_kana || 'MISSING');
  console.log('  phone:', gasIntake.phone || 'MISSING');
  console.log('  email:', gasIntake.email || 'MISSING');

  if (!gasIntake.patient_kana && !gasIntake.phone) {
    console.log('⚠️ Data also missing in GAS - cannot backfill');
    alreadyMissingCount++;
    continue;
  }

  // Backfill to Supabase
  console.log('Backfilling to Supabase...');
  const { error } = await supabase
    .from('intake')
    .update({
      patient_kana: gasIntake.patient_kana || null,
      phone: gasIntake.phone || null,
      email: gasIntake.email || null,
    })
    .eq('patient_id', patientId);

  if (error) {
    console.error('❌ Backfill failed:', error.message);
    errorCount++;
  } else {
    console.log('✅ Backfilled successfully');
    backfilledCount++;
  }
}

console.log('\n\n=== サマリー ===');
console.log(`Total patients: ${patientIds.length}`);
console.log(`✅ Backfilled: ${backfilledCount}`);
console.log(`⚠️ Missing in GAS: ${alreadyMissingCount}`);
console.log(`❌ Errors: ${errorCount}`);
