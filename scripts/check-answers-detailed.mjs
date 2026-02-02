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

const patientIds = ['20260100833'];

console.log('=== Detailed answers JSON inspection ===\n');

for (const patientId of patientIds) {
  console.log(`\n--- Patient ID: ${patientId} ---`);

  const { data: intake, error } = await supabase
    .from('intake')
    .select('patient_id, patient_name, answerer_id, answers')
    .eq('patient_id', patientId)
    .single();

  if (error || !intake) {
    console.log('❌ Not found:', error?.message);
    continue;
  }

  console.log('patient_name:', intake.patient_name);
  console.log('answerer_id:', intake.answerer_id);
  console.log('\nanswers JSON (full):');
  console.log(JSON.stringify(intake.answers, null, 2));
}

console.log('\n\n=== Done ===');
