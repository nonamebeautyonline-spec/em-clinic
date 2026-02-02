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
  '20260100743',
  '20260100630',
  '20260100756',
  '20260100798',
  '20260100844'
];

console.log('=== Fetching all intake data from GAS ===');
console.log('URL:', gasIntakeListUrl);
console.log('');

try {
  const response = await fetch(`${gasIntakeListUrl}?type=getAllIntake`, {
    method: 'GET',
  });

  if (!response.ok) {
    console.error('❌ HTTP error:', response.status);
    process.exit(1);
  }

  const result = await response.json();

  if (!result.ok || !result.data) {
    console.error('❌ Unexpected response format:', result);
    process.exit(1);
  }

  console.log(`✅ Retrieved ${result.data.length} intakes from GAS\n`);

  const sqlStatements = [];

  for (const patientId of patientIds) {
    console.log(`\n--- Patient ID: ${patientId} ---`);

    const intake = result.data.find(i => String(i.patient_id).trim() === patientId);

    if (!intake) {
      console.log('❌ NOT FOUND in GAS');
      continue;
    }

    console.log('✅ Found in GAS:');
    console.log('  patient_name:', intake.patient_name || 'MISSING');
    console.log('  patient_kana:', intake.patient_kana || 'MISSING');
    console.log('  phone:', intake.phone || 'MISSING');
    console.log('  email:', intake.email || 'MISSING');
    console.log('  answerer_id:', intake.answerer_id || 'MISSING');

    // Check what data we have
    const hasKana = intake.patient_kana && String(intake.patient_kana).trim();
    const hasPhone = intake.phone && String(intake.phone).trim();
    const hasEmail = intake.email && String(intake.email).trim();

    if (!hasKana && !hasPhone && !hasEmail) {
      console.log('⚠️ No kana, phone, or email in GAS either');
      continue;
    }

    // Generate SQL
    const updates = [];
    if (hasKana) updates.push(`patient_kana = '${hasKana}'`);
    if (hasPhone) updates.push(`phone = '${hasPhone}'`);
    if (hasEmail) updates.push(`email = '${hasEmail}'`);

    const sql = `UPDATE intake SET ${updates.join(', ')} WHERE patient_id = '${patientId}';`;
    console.log('\n📝 SQL:');
    console.log(sql);
    sqlStatements.push({ patientId, sql, kana: hasKana, phone: hasPhone, email: hasEmail });
  }

  // Execute backfill
  if (sqlStatements.length > 0) {
    console.log('\n\n=== Executing backfill ===\n');

    for (const { patientId, kana, phone, email } of sqlStatements) {
      console.log(`Backfilling ${patientId}...`);

      const updateData = {};
      if (kana) updateData.patient_kana = kana;
      if (phone) updateData.phone = phone;
      if (email) updateData.email = email;

      const { error } = await supabase
        .from('intake')
        .update(updateData)
        .eq('patient_id', patientId);

      if (error) {
        console.error(`  ❌ Error:`, error.message);
      } else {
        console.log(`  ✅ Success`);
      }
    }

    console.log('\n=== Backfill complete ===');
  } else {
    console.log('\n⚠️ No data to backfill');
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
