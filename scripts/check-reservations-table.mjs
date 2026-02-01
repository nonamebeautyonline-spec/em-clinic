import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// .env.local を読み込み
const envPath = '/Users/administer/em-clinic/.env.local';
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...valueParts] = trimmed.split('=');
  if (key && valueParts.length > 0) {
    let value = valueParts.join('=').trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log('=== Checking reservations table ===\n');

// テーブルの存在確認と1件取得
try {
  const { data, error, count } = await supabase
    .from('reservations')
    .select('*', { count: 'exact' })
    .limit(1);

  if (error) {
    console.error('❌ Error querying reservations table:');
    console.error('  Message:', error.message);
    console.error('  Details:', error.details);
    console.error('  Hint:', error.hint);
    console.error('  Code:', error.code);
    process.exit(1);
  }

  console.log('✅ reservations table exists');
  console.log('Total records:', count);

  if (data && data.length > 0) {
    console.log('\nSample record:');
    console.log(JSON.stringify(data[0], null, 2));

    console.log('\nColumn names:');
    Object.keys(data[0]).forEach(col => {
      console.log(`  - ${col}`);
    });
  } else {
    console.log('⚠️  No records found in reservations table');
  }
} catch (e) {
  console.error('❌ Unexpected error:', e);
  process.exit(1);
}

// 今日の予約を確認
console.log('\n=== Checking today\'s reservations ===\n');

const now = new Date();
const jstOffset = 9 * 60 * 60 * 1000;
const jstNow = new Date(now.getTime() + jstOffset);
const year = jstNow.getUTCFullYear();
const month = jstNow.getUTCMonth();
const date = jstNow.getUTCDate();

const startOfDay = new Date(Date.UTC(year, month, date, 0, 0, 0) - jstOffset);
const endOfDay = new Date(Date.UTC(year, month, date + 1, 0, 0, 0) - jstOffset);

console.log('Date range:');
console.log('  Start:', startOfDay.toISOString());
console.log('  End:', endOfDay.toISOString());

try {
  const { data, error, count } = await supabase
    .from('reservations')
    .select('*', { count: 'exact' })
    .gte('reserved_time', startOfDay.toISOString())
    .lt('reserved_time', endOfDay.toISOString())
    .order('reserved_time', { ascending: true });

  if (error) {
    console.error('\n❌ Error querying today\'s reservations:');
    console.error('  Message:', error.message);
    console.error('  Details:', error.details);
    console.error('  Hint:', error.hint);
    process.exit(1);
  }

  console.log(`\n✅ Found ${count} reservations for today`);

  if (data && data.length > 0) {
    console.log('\nToday\'s reservations:');
    data.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.reserved_time} - Patient ID: ${r.patient_id} - Status: ${r.status}`);
    });
  }
} catch (e) {
  console.error('❌ Unexpected error:', e);
  process.exit(1);
}

console.log('\n=== Check complete ===');
