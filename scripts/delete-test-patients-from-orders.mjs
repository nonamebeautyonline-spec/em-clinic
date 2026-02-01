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

console.log('=== テスト患者の注文を削除 ===\n');

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
const { data: allOrders, error: fetchError } = await supabase
  .from('orders')
  .select('id, patient_id, product_code, payment_method, status');

if (fetchError) {
  console.error('取得エラー:', fetchError);
  process.exit(1);
}

// テスト患者の注文を抽出
const testOrders = allOrders.filter(order => {
  const pid = order.patient_id.toLowerCase();
  return testPatterns.some(pattern => pid.includes(pattern.toLowerCase()));
});

console.log(`削除対象: ${testOrders.length}件\n`);

if (testOrders.length === 0) {
  console.log('削除対象のテスト患者の注文はありません');
  process.exit(0);
}

// 削除対象を表示
testOrders.forEach(order => {
  console.log(`  ${order.id} - ${order.patient_id} (${order.product_code})`);
});

console.log('\n削除を開始します...\n');

let successCount = 0;
let errorCount = 0;

for (const order of testOrders) {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', order.id);

  if (error) {
    console.error(`❌ ${order.id} 削除失敗:`, error.message);
    errorCount++;
  } else {
    console.log(`✅ ${order.id} 削除成功`);
    successCount++;
  }
}

console.log('\n----------------------------------------');
console.log(`成功: ${successCount}件`);
console.log(`失敗: ${errorCount}件`);
console.log('----------------------------------------\n');

console.log('✅ 削除完了');
