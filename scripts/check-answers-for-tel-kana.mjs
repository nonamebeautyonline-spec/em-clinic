import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

const patientIds = [
  '20260100833',
  '20260100743',
  '20260100630',
  '20260100756',
  '20260100798',
  '20260100844'
];

console.log('=== Checking intake.answers JSON for tel and kana ===\n');

for (const patientId of patientIds) {
  console.log(`\n--- Patient ID: ${patientId} ---`);

  const { data: intake, error } = await supabase
    .from('intake')
    .select('patient_id, patient_name, answers')
    .eq('patient_id', patientId)
    .single();

  if (error || !intake) {
    console.log('❌ Not found:', error?.message);
    continue;
  }

  const answers = intake.answers || {};
  console.log('patient_name:', intake.patient_name);
  console.log('answers keys:', Object.keys(answers).join(', '));

  // Check various possible keys for phone and kana
  const tel = answers['電話番号'] || answers.tel || answers.phone || answers['tel'] || answers['phone'];
  const kana = answers['カナ'] || answers.kana || answers.name_kana || answers['name_kana'] || answers['カナ（姓名）'];

  console.log('tel (from answers):', tel || 'MISSING');
  console.log('kana (from answers):', kana || 'MISSING');

  if (tel || kana) {
    console.log('\n✅ Found data in answers JSON!');
  } else {
    console.log('\n⚠️ No tel/kana in answers JSON');
  }
}

console.log('\n\n=== Done ===');
