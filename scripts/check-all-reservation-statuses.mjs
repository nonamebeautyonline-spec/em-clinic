import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...valueParts] = trimmed.split('=');
  if (key && valueParts.length > 0) {
    let value = valueParts.join('=').trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

console.log('=== 予約テーブルの全ステータス値 ===\n');

// Check all possible status values
const { data: allStatuses } = await supabase
  .from('reservations')
  .select('status')
  .limit(2000);

const uniqueStatuses = [...new Set(allStatuses?.map(r => r.status) || [])];
console.log('全ステータス値:', uniqueStatuses);

// Count each status
const statusCounts = {};
allStatuses?.forEach(r => {
  statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
});

console.log('\nステータス別件数:');
Object.entries(statusCounts).forEach(([status, count]) => {
  console.log(`  ${status}: ${count}件`);
});

console.log('\n注: "completed"ステータスが存在しない場合、');
console.log('予約→受診の流れを別の方法で追跡する必要があります。');
console.log('（例: 予約日が過去で、intakeテーブルにOK/NGステータスがあるか）');
