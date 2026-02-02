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

const gasIntakeListUrl = env.GAS_INTAKE_LIST_URL;

const patientIds = [
  '20260100833',
  '20260100743',
  '20260100630',
  '20260100756',
  '20260100798',
  '20260100844'
];

console.log('=== Fetching from GAS_INTAKE_LIST_URL ===');
console.log('URL:', gasIntakeListUrl);
console.log('');

// Try to get intake list
console.log('Requesting intake list...\n');

try {
  const response = await fetch(gasIntakeListUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'list',
      limit: 200
    })
  });

  const text = await response.text();
  console.log('Response status:', response.status);
  console.log('Response (first 500 chars):', text.substring(0, 500));
  console.log('');

  try {
    const data = JSON.parse(text);

    if (data.intakes && Array.isArray(data.intakes)) {
      console.log(`✅ Retrieved ${data.intakes.length} intakes from GAS\n`);

      // Find our 6 patients
      for (const patientId of patientIds) {
        const intake = data.intakes.find(i => i.patient_id === patientId);

        if (intake) {
          console.log(`\n--- Patient ID: ${patientId} ---`);
          console.log('✅ Found in GAS:');
          console.log('  patient_name:', intake.patient_name || 'MISSING');
          console.log('  patient_kana:', intake.patient_kana || 'MISSING');
          console.log('  phone:', intake.phone || 'MISSING');
          console.log('  email:', intake.email || 'MISSING');
          console.log('  answerer_id:', intake.answerer_id || 'MISSING');

          // Generate SQL if data exists
          if (intake.patient_kana || intake.phone || intake.email) {
            console.log('\n📝 SQL to backfill:');
            const updates = [];
            if (intake.patient_kana) updates.push(`patient_kana = '${intake.patient_kana}'`);
            if (intake.phone) updates.push(`phone = '${intake.phone}'`);
            if (intake.email) updates.push(`email = '${intake.email}'`);

            console.log(`UPDATE intake SET ${updates.join(', ')} WHERE patient_id = '${patientId}';`);
          }
        } else {
          console.log(`\n--- Patient ID: ${patientId} ---`);
          console.log('❌ NOT FOUND in GAS intake list');
        }
      }
    } else {
      console.log('⚠️ No intakes array in response');
      console.log('Response structure:', JSON.stringify(data, null, 2).substring(0, 500));
    }
  } catch (e) {
    console.log('❌ Failed to parse JSON:', e.message);
  }
} catch (error) {
  console.error('❌ Fetch error:', error.message);
}
