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

console.log('=== Checking migrated patient ===\n');

const oldPatientId = '20251200193';
const newPatientId = '20260101648';

console.log(`Old account: ${oldPatientId} (should be missing)`);
console.log(`New account: ${newPatientId} (should have data)\n`);

// Check old account
const { data: oldData, error: oldError } = await supabase
  .from('intake')
  .select('patient_id, patient_name, answers')
  .eq('patient_id', oldPatientId)
  .single();

console.log('--- Old account (20251200193) ---');
if (oldError || !oldData) {
  console.log('❌ Not found (as expected for migrated account)');
} else {
  const answers = oldData.answers || {};
  const hasTel = answers.tel || answers['電話番号'];
  const hasKana = answers.name_kana || answers['カナ'];
  console.log('✅ Found');
  console.log('  name:', oldData.patient_name);
  console.log('  tel:', hasTel ? '✅ ' + hasTel : '❌ MISSING');
  console.log('  kana:', hasKana ? '✅ ' + hasKana : '❌ MISSING');
}

// Check new account
const { data: newData, error: newError } = await supabase
  .from('intake')
  .select('patient_id, patient_name, answers')
  .eq('patient_id', newPatientId)
  .single();

console.log('\n--- New account (20260101648) ---');
if (newError || !newData) {
  console.log('❌ NOT FOUND - This is a problem!');
  console.log('Error:', newError?.message);
} else {
  const answers = newData.answers || {};
  const hasTel = answers.tel || answers['電話番号'];
  const hasKana = answers.name_kana || answers['カナ'];
  console.log('✅ Found');
  console.log('  name:', newData.patient_name);
  console.log('  tel:', hasTel ? '✅ ' + hasTel : '❌ MISSING');
  console.log('  kana:', hasKana ? '✅ ' + hasKana : '❌ MISSING');

  if (hasTel && hasKana) {
    console.log('\n✅ Migration successful - new account has complete data');
  } else {
    console.log('\n⚠️ Migration incomplete - new account missing data');
  }
}
