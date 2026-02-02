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

const problemPatients = [
  '20260100833',
  '20260100743',
  '20260100630',
  '20260100756',
  '20260100798',
  '20260100844'
];

console.log('=== Comparing problem patients with normal patients ===\n');

// Get problem patients' intake data
console.log('📋 Problem patients (6):\n');

for (const patientId of problemPatients) {
  const { data, error } = await supabase
    .from('intake')
    .select('*')
    .eq('patient_id', patientId)
    .single();

  if (error || !data) {
    console.log(`❌ ${patientId}: Not found`);
    continue;
  }

  console.log(`\n--- ${patientId} ---`);
  console.log('patient_name:', data.patient_name || 'MISSING');
  console.log('answerer_id:', data.answerer_id || 'MISSING');
  console.log('created_at:', data.created_at);
  console.log('reserved_date:', data.reserved_date || 'MISSING');

  if (data.answers && typeof data.answers === 'object') {
    const keys = Object.keys(data.answers);
    console.log('answers keys:', keys.join(', '));

    // Check specific fields
    const hasTel = data.answers.tel || data.answers.phone || data.answers['電話番号'];
    const hasKana = data.answers.name_kana || data.answers.kana || data.answers['カナ'];

    console.log('  Has tel:', hasTel ? '✅ ' + hasTel : '❌ MISSING');
    console.log('  Has kana:', hasKana ? '✅ ' + hasKana : '❌ MISSING');

    console.log('Full answers:');
    console.log(JSON.stringify(data.answers, null, 2));
  } else {
    console.log('⚠️ answers is null or not an object');
  }
}

// Get a normal patient for comparison
console.log('\n\n📋 Normal patient (for comparison):\n');

const { data: normalPatients } = await supabase
  .from('intake')
  .select('*')
  .eq('reserved_date', '2026-02-02')
  .order('created_at', { ascending: false })
  .limit(3);

if (normalPatients && normalPatients.length > 0) {
  for (const data of normalPatients.slice(0, 1)) {
    console.log(`\n--- ${data.patient_id} ---`);
    console.log('patient_name:', data.patient_name || 'MISSING');
    console.log('answerer_id:', data.answerer_id || 'MISSING');
    console.log('created_at:', data.created_at);
    console.log('reserved_date:', data.reserved_date || 'MISSING');

    if (data.answers && typeof data.answers === 'object') {
      const keys = Object.keys(data.answers);
      console.log('answers keys:', keys.join(', '));

      const hasTel = data.answers.tel || data.answers.phone || data.answers['電話番号'];
      const hasKana = data.answers.name_kana || data.answers.kana || data.answers['カナ'];

      console.log('  Has tel:', hasTel ? '✅ ' + hasTel : '❌ MISSING');
      console.log('  Has kana:', hasKana ? '✅ ' + hasKana : '❌ MISSING');

      console.log('Full answers:');
      console.log(JSON.stringify(data.answers, null, 2));
    }
  }
}

console.log('\n\n=== Analysis ===');
console.log('Check if the problem patients:');
console.log('1. Were created on the same date?');
console.log('2. Have different entry_route in answerers?');
console.log('3. Used a different intake form submission method?');
