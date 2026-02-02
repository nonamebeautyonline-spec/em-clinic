import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
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

console.log('=== Finding ALL intake records with missing tel/kana (complete) ===\n');

// Fetch all records with pagination
let allIntake = [];
let page = 0;
const pageSize = 1000;

while (true) {
  console.log(`Fetching page ${page + 1} (offset ${page * pageSize})...`);

  const { data, error } = await supabase
    .from('intake')
    .select('patient_id, patient_name, answerer_id, answers, created_at')
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    break;
  }

  allIntake = allIntake.concat(data);
  console.log(`  Retrieved ${data.length} records (total so far: ${allIntake.length})`);

  if (data.length < pageSize) {
    break; // Last page
  }

  page++;
}

console.log(`\n✅ Total intake records fetched: ${allIntake.length}\n`);

const missingPatients = [];

for (const intake of allIntake) {
  const answers = intake.answers || {};

  // Check all possible tel fields
  const hasTel = answers.tel || answers.phone || answers['電話番号'] || answers.TEL;

  // Check all possible kana fields
  const hasKana = answers.name_kana || answers.nameKana || answers.kana ||
    answers['カナ'] || answers['ﾌﾘｶﾞﾅ'] || answers['フリガナ'] || answers['ふりがな'];

  if (!hasTel || !hasKana) {
    missingPatients.push({
      patient_id: intake.patient_id,
      patient_name: intake.patient_name,
      answerer_id: intake.answerer_id,
      hasTel: !!hasTel,
      hasKana: !!hasKana,
      created_at: intake.created_at,
    });
  }
}

console.log(`❌ Patients with missing tel/kana: ${missingPatients.length}\n`);

// Group by missing field
const missingTel = missingPatients.filter(p => !p.hasTel);
const missingKana = missingPatients.filter(p => !p.hasKana);
const missingBoth = missingPatients.filter(p => !p.hasTel && !p.hasKana);

console.log('📊 Breakdown:');
console.log(`  Missing tel only: ${missingTel.length - missingBoth.length}`);
console.log(`  Missing kana only: ${missingKana.length - missingBoth.length}`);
console.log(`  Missing both: ${missingBoth.length}`);
console.log('');

// Show first 20
console.log('First 20 patients with missing data:\n');
for (let i = 0; i < Math.min(20, missingPatients.length); i++) {
  const p = missingPatients[i];
  console.log(`${p.patient_id} | ${p.patient_name || '(no name)'} | tel:${p.hasTel ? '✅' : '❌'} kana:${p.hasKana ? '✅' : '❌'} | ${p.created_at?.substring(0, 10)}`);
}

// Export patient IDs for backfill
console.log('\n\n=== Patient IDs for backfill (all) ===');
console.log(`Total: ${missingPatients.length} patients`);

// Save to file
const patientIds = missingPatients.map(p => p.patient_id);
writeFileSync(
  join(__dirname, 'missing-tel-kana-patient-ids-complete.txt'),
  patientIds.join('\n')
);
console.log('\n✅ Saved to missing-tel-kana-patient-ids-complete.txt');
console.log('\nNext step: Run backfill-all-from-gas-complete.mjs');
