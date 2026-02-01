import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach((line) => {
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

console.log('=== 予約ステータスの確認 ===\n');

// 今月の全予約
const { data: statusCounts } = await supabase
  .from('reservations')
  .select('status')
  .gte('created_at', '2026-02-01T00:00:00Z');

const counts = {};
if (statusCounts) {
  statusCounts.forEach(r => {
    counts[r.status] = (counts[r.status] || 0) + 1;
  });
}

console.log('今月の予約ステータス内訳:');
Object.entries(counts).forEach(([status, count]) => {
  console.log(`  ${status}: ${count}件`);
});

// サンプルを表示
const { data: samples } = await supabase
  .from('reservations')
  .select('id, patient_id, status, reserved_date, created_at')
  .gte('created_at', '2026-02-01T00:00:00Z')
  .order('created_at', { ascending: false })
  .limit(5);

console.log('\n最新5件のサンプル:');
samples?.forEach(r => {
  console.log(`  ID: ${r.id}, Status: ${r.status}, 予約日: ${r.reserved_date}`);
});

console.log('\n注: "completed"ステータスのレコードがない場合、');
console.log('予約後の受診率は0%になります。');
