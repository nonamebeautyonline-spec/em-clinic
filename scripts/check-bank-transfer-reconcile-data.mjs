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

console.log('=== 銀行振込の照合待ち注文データを確認 ===\n');

try {
  // pending_confirmation の銀行振込注文を取得
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, patient_id, product_code, amount, account_name, shipping_name, created_at')
    .eq('payment_method', 'bank_transfer')
    .eq('status', 'pending_confirmation')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log(`見つかった注文: ${orders.length}件\n`);

  if (orders.length === 0) {
    console.log('✅ 照合待ちの注文はありません');
    process.exit(0);
  }

  orders.forEach((order, i) => {
    console.log(`--- 注文 ${i + 1} ---`);
    console.log(`ID: ${order.id}`);
    console.log(`患者ID: ${order.patient_id}`);
    console.log(`商品コード: ${order.product_code}`);
    console.log(`金額: ¥${order.amount?.toLocaleString() || '0'} (値: ${order.amount})`);
    console.log(`振込名義人 (account_name): ${order.account_name ? `"${order.account_name}"` : '(空)'}`);
    console.log(`配送先氏名 (shipping_name): ${order.shipping_name ? `"${order.shipping_name}"` : '(空)'}`);
    console.log(`作成日時: ${order.created_at}`);
    console.log('');
  });

  // 統計
  const withAccountName = orders.filter(o => o.account_name && o.account_name !== 'null');
  const withoutAccountName = orders.filter(o => !o.account_name || o.account_name === 'null');
  const withAmount = orders.filter(o => o.amount && o.amount > 0);
  const withoutAmount = orders.filter(o => !o.amount || o.amount === 0);

  console.log('=== 統計 ===');
  console.log(`振込名義人あり: ${withAccountName.length}件`);
  console.log(`振込名義人なし: ${withoutAccountName.length}件`);
  console.log(`金額あり (> 0): ${withAmount.length}件`);
  console.log(`金額なし (= 0): ${withoutAmount.length}件`);

  if (withoutAccountName.length > 0) {
    console.log('\n⚠️ 振込名義人が空の注文があります:');
    withoutAccountName.forEach(o => {
      console.log(`  - ${o.id} (患者ID: ${o.patient_id})`);
    });
  }

  if (withoutAmount.length > 0) {
    console.log('\n⚠️ 金額が0の注文があります:');
    withoutAmount.forEach(o => {
      console.log(`  - ${o.id} (患者ID: ${o.patient_id})`);
    });
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
