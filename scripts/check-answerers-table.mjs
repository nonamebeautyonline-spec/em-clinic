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

// LステップIDのリスト
const answererIds = [
  '232741502', // 20260100833
  '229355304', // 20260100743
  '232283647', // 20260100630
  '232705789', // 20260100756
  '232743708', // 20260100798
  '232755591', // 20260100844
];

const patientIds = [
  '20260100833',
  '20260100743',
  '20260100630',
  '20260100756',
  '20260100798',
  '20260100844'
];

console.log('=== Checking answerers table ===\n');

for (let i = 0; i < answererIds.length; i++) {
  const answererId = answererIds[i];
  const patientId = patientIds[i];

  console.log(`\n--- Patient ID: ${patientId} (Lstep: ${answererId}) ---`);

  // Check answerers table
  const { data: answerer, error } = await supabase
    .from('answerers')
    .select('*')
    .eq('answerer_id', answererId)
    .single();

  if (error) {
    console.log('❌ Error:', error.message);
    continue;
  }

  if (!answerer) {
    console.log('❌ No data in answerers table');
    continue;
  }

  console.log('✅ Found in answerers table:');
  console.log('  name:', answerer.name || 'MISSING');
  console.log('  name_kana:', answerer.name_kana || 'MISSING');
  console.log('  tel:', answerer.tel || 'MISSING');
  console.log('  email:', answerer.email || 'MISSING');

  // Check if we can backfill
  const hasKana = answerer.name_kana && String(answerer.name_kana).trim();
  const hasTel = answerer.tel && String(answerer.tel).trim();
  const hasEmail = answerer.email && String(answerer.email).trim();

  if (hasKana || hasTel || hasEmail) {
    console.log('\n🔄 Backfilling to intake...');
    const updateData = {};
    if (hasKana) updateData.patient_kana = hasKana;
    if (hasTel) updateData.phone = hasTel;
    if (hasEmail) updateData.email = hasEmail;

    const { error: updateError } = await supabase
      .from('intake')
      .update(updateData)
      .eq('patient_id', patientId);

    if (updateError) {
      console.log('  ❌ Error:', updateError.message);
    } else {
      console.log('  ✅ Success - Updated:', Object.keys(updateData).join(', '));
    }
  } else {
    console.log('\n⚠️ No data to backfill');
  }
}

console.log('\n\n=== Done ===');
