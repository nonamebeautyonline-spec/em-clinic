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

console.log('=== Checking today\'s karte data ===\n');

const today = '2026-02-02';

// Get today's reservations from Supabase (same as karte API does)
const { data: validReservations } = await supabase
  .from('reservations')
  .select('reserve_id')
  .gte('reserved_date', today)
  .lte('reserved_date', today)
  .neq('status', 'canceled');

const validReserveIds = new Set(validReservations?.map(r => r.reserve_id) || []);
console.log(`✅ Found ${validReserveIds.size} non-canceled reservations today\n`);

// Get intake data (same as karte API does)
const { data: intakeData, error } = await supabase
  .from('intake')
  .select('*')
  .gte('reserved_date', today)
  .lte('reserved_date', today)
  .not('reserved_date', 'is', null)
  .order('created_at', { ascending: false });

if (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

// Filter to valid reservations only
const filteredData = intakeData.filter(row => {
  if (!row.reserve_id) return true;
  return validReserveIds.has(row.reserve_id);
});

console.log(`✅ Retrieved ${filteredData.length} intake records for today\n`);

// Check first 5 records in detail
for (let i = 0; i < Math.min(5, filteredData.length); i++) {
  const row = filteredData[i];
  console.log(`\n--- Record ${i + 1}: ${row.patient_id} ---`);
  console.log('patient_name:', row.patient_name || 'MISSING');
  console.log('reserve_id:', row.reserve_id || 'MISSING');
  console.log('reserved_time:', row.reserved_time || 'MISSING');

  // Check if top-level columns exist
  console.log('\n📊 Top-level columns:');
  console.log('  patient_kana:', row.patient_kana || 'MISSING');
  console.log('  phone:', row.phone || 'MISSING');
  console.log('  email:', row.email || 'MISSING');

  // Check answers JSONB
  console.log('\n📦 answers JSONB keys:');
  if (row.answers && typeof row.answers === 'object') {
    const answerKeys = Object.keys(row.answers);
    console.log('  Keys:', answerKeys.join(', '));

    // Check for phone/kana in answers
    const phoneKeys = ['tel', 'phone', '電話番号', 'TEL'];
    const kanaKeys = ['name_kana', 'nameKana', 'kana', 'カナ', 'ﾌﾘｶﾞﾅ', 'フリガナ', 'ふりがな'];

    console.log('\n  Phone-related fields:');
    for (const key of phoneKeys) {
      if (row.answers[key]) {
        console.log(`    ${key}: ${row.answers[key]}`);
      }
    }

    console.log('\n  Kana-related fields:');
    for (const key of kanaKeys) {
      if (row.answers[key]) {
        console.log(`    ${key}: ${row.answers[key]}`);
      }
    }

    // Show full answers structure
    console.log('\n  Full answers:');
    console.log('   ', JSON.stringify(row.answers, null, 2).split('\n').join('\n    '));
  } else {
    console.log('  ⚠️ answers is null or not an object');
  }
}

console.log('\n\n=== Summary ===');
let countWithPhone = 0;
let countWithKana = 0;

for (const row of filteredData) {
  const answers = row.answers || {};

  // Check all possible phone fields
  const hasPhone = row.phone ||
    answers.tel || answers.phone || answers['電話番号'] || answers.TEL;

  // Check all possible kana fields
  const hasKana = row.patient_kana ||
    answers.name_kana || answers.nameKana || answers.kana ||
    answers['カナ'] || answers['ﾌﾘｶﾞﾅ'] || answers['フリガナ'] || answers['ふりがな'];

  if (hasPhone) countWithPhone++;
  if (hasKana) countWithKana++;
}

console.log(`\nToday's reservations: ${filteredData.length}`);
console.log(`  With phone: ${countWithPhone} (${Math.round(countWithPhone/filteredData.length*100)}%)`);
console.log(`  With kana: ${countWithKana} (${Math.round(countWithKana/filteredData.length*100)}%)`);
