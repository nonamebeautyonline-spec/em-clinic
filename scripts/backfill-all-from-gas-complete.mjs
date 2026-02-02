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

console.log('=== Backfilling ALL patients from GAS (Complete) ===');
console.log('URL:', gasIntakeListUrl);
console.log('');

// Load patient IDs
const patientIdsFile = join(__dirname, 'missing-tel-kana-patient-ids-complete.txt');
const patientIds = readFileSync(patientIdsFile, 'utf-8')
  .split('\n')
  .map(id => id.trim())
  .filter(id => id.length > 0);

console.log(`📋 Loaded ${patientIds.length} patient IDs to backfill\n`);

try {
  // Fetch all intake data from GAS once
  console.log('Fetching all intake data from GAS...');
  const response = await fetch(`${gasIntakeListUrl}?type=getAllIntake`, {
    method: 'GET',
  });

  if (!response.ok) {
    console.error('❌ HTTP error:', response.status);
    process.exit(1);
  }

  const result = await response.json();

  if (!result.ok || !result.data) {
    console.error('❌ Unexpected response format');
    process.exit(1);
  }

  console.log(`✅ Retrieved ${result.data.length} intakes from GAS\n`);

  // Create a map for faster lookup
  const gasIntakeMap = new Map();
  result.data.forEach(intake => {
    const pid = String(intake.patient_id || '').trim();
    if (pid) {
      gasIntakeMap.set(pid, intake);
    }
  });

  console.log('Starting backfill...\n');

  let successCount = 0;
  let notFoundCount = 0;
  let noDataCount = 0;
  let errorCount = 0;

  for (let i = 0; i < patientIds.length; i++) {
    const patientId = patientIds[i];

    // Progress indicator every 50 patients
    if (i % 50 === 0) {
      console.log(`[${i + 1}/${patientIds.length}] Processing...`);
    }

    // Find intake in GAS data
    const gasIntake = gasIntakeMap.get(patientId);

    if (!gasIntake) {
      if (i < 5) console.log(`  ${patientId}: ❌ NOT FOUND in GAS`);
      notFoundCount++;
      continue;
    }

    // Get tel and kana
    const tel = gasIntake.tel || gasIntake.phone || '';
    const kana = gasIntake.name_kana || '';

    if (!tel && !kana) {
      if (i < 5) console.log(`  ${patientId}: ⚠️ No tel/kana in GAS either`);
      noDataCount++;
      continue;
    }

    // Get current intake.answers
    const { data: intake, error: intakeError } = await supabase
      .from('intake')
      .select('answers')
      .eq('patient_id', patientId)
      .single();

    if (intakeError || !intake) {
      if (i < 5) console.log(`  ${patientId}: ❌ Intake not found in Supabase`);
      errorCount++;
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
      noDataCount++;
      continue;
    }

    // Merge and update
    const updatedAnswers = { ...currentAnswers, ...newFields };

    const { error: updateError } = await supabase
      .from('intake')
      .update({ answers: updatedAnswers })
      .eq('patient_id', patientId);

    if (updateError) {
      if (i < 5) console.log(`  ${patientId}: ❌ Update error: ${updateError.message}`);
      errorCount++;
    } else {
      if (i < 5) console.log(`  ${patientId}: ✅ Updated`);
      successCount++;
    }
  }

  console.log('\n\n=== Backfill Complete ===');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Not found in GAS: ${notFoundCount}`);
  console.log(`⚠️ No tel/kana in GAS: ${noDataCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`Total processed: ${patientIds.length}`);
  console.log('');
  console.log(`Final status: ${successCount}/${patientIds.length} patients successfully backfilled`);

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
