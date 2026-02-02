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

console.log('=== Final Verification - Checking all intake records ===\n');

// Fetch all records with pagination
let allIntake = [];
let page = 0;
const pageSize = 1000;

while (true) {
  const { data, error } = await supabase
    .from('intake')
    .select('patient_id, answers')
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

  if (data.length < pageSize) {
    break;
  }

  page++;
}

console.log(`Total intake records: ${allIntake.length}\n`);

let hasTelCount = 0;
let hasKanaCount = 0;
let hasBothCount = 0;
let missingBothCount = 0;

const stillMissing = [];

for (const intake of allIntake) {
  const answers = intake.answers || {};

  const hasTel = answers.tel || answers.phone || answers['電話番号'] || answers.TEL;
  const hasKana = answers.name_kana || answers.nameKana || answers.kana ||
    answers['カナ'] || answers['ﾌﾘｶﾞﾅ'] || answers['フリガナ'] || answers['ふりがな'];

  if (hasTel) hasTelCount++;
  if (hasKana) hasKanaCount++;
  if (hasTel && hasKana) hasBothCount++;
  if (!hasTel && !hasKana) {
    missingBothCount++;
    stillMissing.push(intake.patient_id);
  }
}

console.log('=== Final Results ===');
console.log(`✅ Has tel: ${hasTelCount} / ${allIntake.length} (${Math.round(hasTelCount/allIntake.length*100)}%)`);
console.log(`✅ Has kana: ${hasKanaCount} / ${allIntake.length} (${Math.round(hasKanaCount/allIntake.length*100)}%)`);
console.log(`✅ Has both tel AND kana: ${hasBothCount} / ${allIntake.length} (${Math.round(hasBothCount/allIntake.length*100)}%)`);
console.log(`❌ Still missing both: ${missingBothCount}`);

if (stillMissing.length > 0) {
  console.log('\n⚠️ Patients still missing both tel and kana:');
  stillMissing.forEach(id => console.log(`  ${id}`));
}

console.log('\n✅ Backfill complete! Check karte UI at /doctor');
