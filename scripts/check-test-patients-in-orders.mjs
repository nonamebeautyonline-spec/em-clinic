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

console.log('=== ordersテーブル内のテスト患者確認 ===\n');

// テスト患者のパターン
const testPatterns = [
  'test',
  'TEST',
  'テスト',
  'demo',
  'DEMO',
  'sample',
  'SAMPLE',
];

// すべての注文を取得
const { data: allOrders, error } = await supabase
  .from('orders')
  .select('id, patient_id, product_code, payment_method, status, created_at');

if (error) {
  console.error('エラー:', error);
  process.exit(1);
}

console.log(`総注文数: ${allOrders.length}件\n`);

// テスト患者の注文を抽出
const testOrders = allOrders.filter(order => {
  const pid = order.patient_id.toLowerCase();
  return testPatterns.some(pattern => pid.includes(pattern.toLowerCase()));
});

console.log(`テスト患者の注文数: ${testOrders.length}件\n`);

if (testOrders.length > 0) {
  console.log('テスト患者の注文一覧:');
  console.log('----------------------------------------');

  // patient_idでグループ化
  const groupedByPatient = testOrders.reduce((acc, order) => {
    if (!acc[order.patient_id]) {
      acc[order.patient_id] = [];
    }
    acc[order.patient_id].push(order);
    return acc;
  }, {});

  Object.entries(groupedByPatient).forEach(([patientId, orders]) => {
    console.log(`\n患者ID: ${patientId}`);
    console.log(`  注文数: ${orders.length}件`);
    orders.forEach(order => {
      console.log(`  - ${order.id} | ${order.product_code} | ${order.payment_method} | ${order.status} | ${order.created_at}`);
    });
  });

  console.log('\n----------------------------------------');
  console.log(`\n削除対象の注文ID一覧 (${testOrders.length}件):`);
  testOrders.forEach(order => {
    console.log(`  ${order.id}`);
  });
}

console.log('\n✅ 確認完了');
