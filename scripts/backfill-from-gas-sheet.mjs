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
const gasIntakeListUrl = env.GAS_INTAKE_LIST_URL;

const patientIds = [
  '20260100833',
  '20260100844',
  '20260100743',
  '20260100798',
  '20260100630',
  '20260100572',
  '20260100756',
];

console.log('=== Fetching tel/kana from GAS intake sheet ===');
console.log('URL:', gasIntakeListUrl);
console.log('');

try {
  // Fetch all intake data from GAS
  const response = await fetch(`${gasIntakeListUrl}?type=getAllIntake`, {
    method: 'GET',
  });

  if (!response.ok) {
    console.error('❌ HTTP error:', response.status);
    const text = await response.text();
    console.error('Response:', text.substring(0, 500));
    process.exit(1);
  }

  const result = await response.json();

  if (!result.ok || !result.data) {
    console.error('❌ Unexpected response format:', result);
    process.exit(1);
  }

  console.log(`✅ Retrieved ${result.data.length} intakes from GAS\n`);

  for (const patientId of patientIds) {
    console.log(`\n--- ${patientId} ---`);

    // Find intake in GAS data
    const gasIntake = result.data.find(i => {
      const pid = String(i.patient_id || '').trim();
      return pid === patientId;
    });

    if (!gasIntake) {
      console.log('❌ NOT FOUND in GAS');
      continue;
    }

    console.log('✅ Found in GAS:');
    console.log('  name:', gasIntake.name || 'MISSING');
    console.log('  name_kana:', gasIntake.name_kana || 'MISSING');
    console.log('  tel:', gasIntake.tel || 'MISSING');

    // Normalize fields
    const tel = gasIntake.tel || gasIntake.phone || '';
    const kana = gasIntake.name_kana || '';

    if (!tel && !kana) {
      console.log('⚠️ No tel/kana in GAS either');
      continue;
    }

    // Get current intake.answers
    const { data: intake, error: intakeError } = await supabase
      .from('intake')
      .select('answers')
      .eq('patient_id', patientId)
      .single();

    if (intakeError || !intake) {
      console.log('❌ Intake not found in Supabase:', intakeError?.message);
      continue;
    }

    const currentAnswers = intake.answers || {};

    // Build new fields
    const newFields = {};
    if (tel && String(tel).trim()) {
      const telStr = String(tel).trim();
      newFields.tel = telStr;
      newFields['電話番号'] = telStr;
    }
    if (kana && String(kana).trim()) {
      const kanaStr = String(kana).trim();
      newFields.name_kana = kanaStr;
      newFields['カナ'] = kanaStr;
    }

    if (Object.keys(newFields).length === 0) {
      console.log('⚠️ No data to backfill');
      continue;
    }

    console.log('\n✏️ Adding to answers:', Object.keys(newFields).join(', '));

    // Merge and update
    const updatedAnswers = { ...currentAnswers, ...newFields };

    const { error: updateError } = await supabase
      .from('intake')
      .update({ answers: updatedAnswers })
      .eq('patient_id', patientId);

    if (updateError) {
      console.log('❌ Update error:', updateError.message);
    } else {
      console.log('✅ Successfully updated intake.answers');
    }
  }

  console.log('\n\n=== Backfill complete ===');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
