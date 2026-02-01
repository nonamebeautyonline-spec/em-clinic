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

console.log('=== ordersテーブル全データ（最新10件） ===\n');

const { data: ordersData, error: ordersError } = await supabase
  .from('orders')
  .select('*')
  .order('paid_at', { ascending: false })
  .limit(10);

if (ordersError) {
  console.error('❌ エラー:', ordersError.message);
  process.exit(1);
}

console.log(`全体件数の最新10件:\n`);
ordersData.forEach((row, idx) => {
  console.log(`${idx + 1}. ID=${row.id}`);
  console.log(`   患者ID: ${row.patient_id}`);
  console.log(`   決済日時: ${row.paid_at}`);
  console.log(`   決済方法: ${row.payment_method || '(null)'}`);
  console.log(`   商品: ${row.product_name}`);
  console.log(`   金額: ${row.amount}`);
  console.log();
});

// payment_methodの分布を確認
const { data: allOrders } = await supabase
  .from('orders')
  .select('id, payment_method');

const byMethod = {};
allOrders?.forEach(o => {
  const method = o.payment_method || 'null';
  byMethod[method] = (byMethod[method] || 0) + 1;
});

console.log('=== payment_method分布 ===');
Object.entries(byMethod).forEach(([method, count]) => {
  console.log(`${method}: ${count}件`);
});
