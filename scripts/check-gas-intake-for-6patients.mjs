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

const gasAdminUrl = env.GAS_ADMIN_URL;

const patientIds = [
  '20260100833',
  '20260100743',
  '20260100630',
  '20260100756',
  '20260100798',
  '20260100844'
];

console.log('=== GAS問診シート直接確認 ===\n');
console.log('Using GAS_ADMIN_URL:', gasAdminUrl);
console.log('\nFetching intake list...\n');

try {
  // Get all intakes from GAS
  const response = await fetch(gasAdminUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'get_intake_list',
      limit: 100
    })
  });

  if (!response.ok) {
    console.error('❌ GAS request failed:', response.status);
    process.exit(1);
  }

  const text = await response.text();
  console.log('Raw response:', text.substring(0, 200));

  let result;
  try {
    result = JSON.parse(text);
  } catch (e) {
    console.error('❌ Failed to parse JSON:', e.message);
    console.error('Response text:', text);
    process.exit(1);
  }

  if (!result.intakes || result.intakes.length === 0) {
    console.log('❌ No intakes returned from GAS');
    process.exit(1);
  }

  console.log(`✅ Retrieved ${result.intakes.length} intakes from GAS\n`);

  // Find our 6 patients
  for (const patientId of patientIds) {
    console.log(`\n--- Patient ID: ${patientId} ---`);

    const intake = result.intakes.find(i => i.patient_id === patientId);

    if (!intake) {
      console.log('❌ NOT FOUND in GAS intake sheet');
      continue;
    }

    console.log('✅ Found in GAS:');
    console.log('  patient_id:', intake.patient_id);
    console.log('  patient_name:', intake.patient_name || '❌ MISSING');
    console.log('  patient_kana:', intake.patient_kana || '❌ MISSING');
    console.log('  phone:', intake.phone || '❌ MISSING');
    console.log('  email:', intake.email || '❌ MISSING');
    console.log('  answerer_id:', intake.answerer_id || '❌ MISSING');
    console.log('  status:', intake.status || 'null');
    console.log('  created_at:', intake.created_at || '❌ MISSING');

    // Check if data exists in GAS but missing in Supabase
    if (intake.patient_kana && intake.phone) {
      console.log('\n⚠️ DATA EXISTS IN GAS BUT MISSING IN SUPABASE!');
      console.log('   → Need to backfill from GAS to Supabase');
    } else {
      console.log('\n⚠️ DATA ALSO MISSING IN GAS');
      console.log('   → Problem occurred during Lstep data submission');
    }
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
