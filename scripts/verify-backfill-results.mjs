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

const patientIds = [
  '20260100833',
  '20260100844',
  '20260100743',
  '20260100798',
  '20260100630',
  '20260100572',
  '20260100756',
];

console.log('=== Verifying backfill results ===\n');

for (const patientId of patientIds) {
  const { data, error } = await supabase
    .from('intake')
    .select('patient_name, answers')
    .eq('patient_id', patientId)
    .single();

  if (error || !data) {
    console.log(`❌ ${patientId}: Not found`);
    continue;
  }

  const answers = data.answers || {};
  const hasTel = answers.tel || answers['電話番号'];
  const hasKana = answers.name_kana || answers['カナ'];

  console.log(`--- ${patientId}: ${data.patient_name} ---`);
  console.log(`  tel: ${hasTel ? '✅ ' + hasTel : '❌ MISSING'}`);
  console.log(`  name_kana: ${hasKana ? '✅ ' + hasKana : '❌ MISSING'}`);
  console.log('');
}

console.log('=== Summary ===');
console.log('Next: Test in karte UI at /doctor');
