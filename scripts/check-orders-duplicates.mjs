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

console.log('=== ordersテーブルの重複確認（銀行振込） ===\n');

// ordersテーブルからbt_*のデータを取得
const { data: allOrders, error: fetchError } = await supabase
  .from('orders')
  .select('*')
  .like('id', 'bt_%')
  .order('patient_id', { ascending: true })
  .order('paid_at', { ascending: false });

if (fetchError) {
  console.error('❌ データ取得エラー:', fetchError.message);
  process.exit(1);
}

console.log(`銀行振込注文: ${allOrders.length}件\n`);

// 患者IDごとにグループ化
const byPatientId = new Map();

for (const order of allOrders) {
  const pid = order.patient_id;
  if (!pid) continue;

  // TESTデータはスキップ
  if (String(pid).startsWith('TEST')) continue;

  if (!byPatientId.has(pid)) {
    byPatientId.set(pid, []);
  }
  byPatientId.get(pid).push(order);
}

// 重複がある患者IDを抽出
const duplicates = [];
for (const [pid, orders] of byPatientId.entries()) {
  if (orders.length > 1) {
    duplicates.push({ pid, orders });
  }
}

console.log(`実患者データ: ${byPatientId.size}件`);
console.log(`重複あり: ${duplicates.length}件\n`);

if (duplicates.length === 0) {
  console.log('✅ 重複データはありません。');
  process.exit(0);
}

console.log('=== 重複データ詳細 ===\n');

for (const { pid, orders } of duplicates) {
  console.log(`患者ID: ${pid} (${orders.length}件)`);
  orders.forEach((order, idx) => {
    console.log(`  ${idx + 1}. ID=${order.id}, 決済日時=${order.paid_at}, 商品=${order.product_name}`);
  });
  console.log();
}
