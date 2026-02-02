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

console.log('=== Finding all patients missing tel/kana in answers ===\n');

const today = '2026-02-02';

// Get today's reservations
const { data: validReservations } = await supabase
  .from('reservations')
  .select('reserve_id')
  .gte('reserved_date', today)
  .lte('reserved_date', today)
  .neq('status', 'canceled');

const validReserveIds = new Set(validReservations?.map(r => r.reserve_id) || []);

// Get intake data
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

console.log(`Total today's reservations: ${filteredData.length}\n`);

// Find patients missing tel/kana in answers
const missingPatients = [];

for (const row of filteredData) {
  const answers = row.answers || {};

  // Check all possible phone fields
  const hasTel = answers.tel || answers.phone || answers['電話番号'] || answers.TEL;

  // Check all possible kana fields
  const hasKana = answers.name_kana || answers.nameKana || answers.kana ||
    answers['カナ'] || answers['ﾌﾘｶﾞﾅ'] || answers['フリガナ'] || answers['ふりがな'];

  if (!hasTel || !hasKana) {
    missingPatients.push({
      patient_id: row.patient_id,
      patient_name: row.patient_name,
      answerer_id: row.answerer_id,
      reserved_time: row.reserved_time,
      hasTel: !!hasTel,
      hasKana: !!hasKana,
      answerKeys: Object.keys(answers)
    });
  }
}

console.log(`❌ Patients missing tel/kana: ${missingPatients.length}\n`);

for (const patient of missingPatients) {
  console.log(`--- ${patient.patient_id} ---`);
  console.log(`  Name: ${patient.patient_name}`);
  console.log(`  Answerer ID: ${patient.answerer_id}`);
  console.log(`  Reserved time: ${patient.reserved_time}`);
  console.log(`  Has tel: ${patient.hasTel ? '✅' : '❌'}`);
  console.log(`  Has kana: ${patient.hasKana ? '✅' : '❌'}`);
  console.log(`  Answer keys: ${patient.answerKeys.join(', ')}`);
  console.log('');
}

// Export for next script
console.log('\n=== Patient IDs (for backfill) ===');
console.log(missingPatients.map(p => p.patient_id).join('\n'));

console.log('\n=== Answerer IDs ===');
console.log(missingPatients.map(p => p.answerer_id).join('\n'));
