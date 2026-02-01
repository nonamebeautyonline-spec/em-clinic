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

console.log('=== bt_* 注文レコードの削除 ===\n');

// bt_*のレコードを取得
const { data: btOrders, error: fetchError } = await supabase
  .from('orders')
  .select('id, patient_id, paid_at, payment_method')
  .like('id', 'bt_%');

if (fetchError) {
  console.error('❌ エラー:', fetchError.message);
  process.exit(1);
}

console.log(`削除対象: ${btOrders.length}件\n`);

if (btOrders.length === 0) {
  console.log('✅ 削除するデータがありません');
  process.exit(0);
}

btOrders.forEach(o => {
  console.log(`- ${o.id} (患者ID: ${o.patient_id}, 日時: ${o.paid_at}, 決済: ${o.payment_method})`);
});

console.log('\n削除を実行します...\n');

const { error: deleteError } = await supabase
  .from('orders')
  .delete()
  .like('id', 'bt_%');

if (deleteError) {
  console.error('❌ 削除エラー:', deleteError.message);
  process.exit(1);
}

console.log(`✅ ${btOrders.length}件を削除しました`);
