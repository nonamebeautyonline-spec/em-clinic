#!/usr/bin/env node
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
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log('=== bt_* の payment_method を bank_transfer に修正 ===\n');

// ordersテーブルから bt_* で payment_method が credit_card のものを取得
const { data: wrongData, error: fetchError } = await supabase
  .from('orders')
  .select('id, patient_id, payment_method, paid_at')
  .like('id', 'bt_%')
  .neq('payment_method', 'bank_transfer');

if (fetchError) {
  console.error('❌ データ取得エラー:', fetchError.message);
  process.exit(1);
}

console.log(`修正対象: ${wrongData.length}件\n`);

if (wrongData.length === 0) {
  console.log('✅ 修正が必要なデータはありません。');
  process.exit(0);
}

wrongData.forEach(row => {
  console.log(`- ${row.id} (患者ID: ${row.patient_id}, 現在: ${row.payment_method})`);
});

console.log('\n修正を実行します...\n');

let successCount = 0;
let errorCount = 0;

for (const row of wrongData) {
  const { error: updateError } = await supabase
    .from('orders')
    .update({ payment_method: 'bank_transfer' })
    .eq('id', row.id);

  if (updateError) {
    console.error(`❌ ${row.id}: ${updateError.message}`);
    errorCount++;
  } else {
    console.log(`✅ ${row.id}: payment_method を bank_transfer に更新`);
    successCount++;
  }
}

console.log('\n=== 修正完了 ===');
console.log(`成功: ${successCount}件`);
console.log(`失敗: ${errorCount}件`);
