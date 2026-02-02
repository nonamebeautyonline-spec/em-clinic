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

const patients = [
  { patient_id: '20260100833', answerer_id: '232741502' },
  { patient_id: '20260100844', answerer_id: '232755591' },
  { patient_id: '20260100743', answerer_id: '229355304' },
  { patient_id: '20260100798', answerer_id: '232743708' },
  { patient_id: '20260100630', answerer_id: '232283647' },
  { patient_id: '20260100572', answerer_id: '232081387' },
  { patient_id: '20260100756', answerer_id: '232705789' },
];

console.log('=== Backfilling tel/kana from answerers to intake.answers ===\n');

for (const { patient_id, answerer_id } of patients) {
  console.log(`\n--- ${patient_id} (answerer: ${answerer_id}) ---`);

  // Get answerer data
  const { data: answerer, error: answererError } = await supabase
    .from('answerers')
    .select('tel, name_kana')
    .eq('answerer_id', answerer_id)
    .single();

  if (answererError || !answerer) {
    console.log('❌ Answerer not found:', answererError?.message);
    continue;
  }

  console.log('📞 Answerer data:');
  console.log('  tel:', answerer.tel || 'MISSING');
  console.log('  name_kana:', answerer.name_kana || 'MISSING');

  // Get current intake data
  const { data: intake, error: intakeError } = await supabase
    .from('intake')
    .select('answers')
    .eq('patient_id', patient_id)
    .single();

  if (intakeError || !intake) {
    console.log('❌ Intake not found:', intakeError?.message);
    continue;
  }

  const currentAnswers = intake.answers || {};
  console.log('\n📦 Current answers keys:', Object.keys(currentAnswers).join(', '));

  // Build new fields to add
  const newFields = {};
  if (answerer.tel && String(answerer.tel).trim()) {
    const tel = String(answerer.tel).trim();
    newFields.tel = tel;
    newFields['電話番号'] = tel;
  }
  if (answerer.name_kana && String(answerer.name_kana).trim()) {
    const kana = String(answerer.name_kana).trim();
    newFields.name_kana = kana;
    newFields['カナ'] = kana;
  }

  if (Object.keys(newFields).length === 0) {
    console.log('⚠️ No data to backfill from answerers');
    continue;
  }

  console.log('\n✏️ Adding to answers:', Object.keys(newFields).join(', '));

  // Merge new fields into answers
  const updatedAnswers = { ...currentAnswers, ...newFields };

  // Update intake
  const { error: updateError } = await supabase
    .from('intake')
    .update({ answers: updatedAnswers })
    .eq('patient_id', patient_id);

  if (updateError) {
    console.log('❌ Update error:', updateError.message);
  } else {
    console.log('✅ Successfully updated intake.answers');
  }
}

console.log('\n\n=== Backfill complete ===');
console.log('Next step: Verify in karte that phone/kana are now displayed');
