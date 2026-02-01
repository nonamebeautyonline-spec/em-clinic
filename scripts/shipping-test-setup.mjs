import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 本日発送予定のpayment_id（クレカ）
const CREDIT_CARD_PAYMENT_IDS = [
  'Zced7DFyfj6RwRU3anc2dDkOUqRZY',
  'hunSHoXlrALUCa7W2BU2r7XuyTFZY',
  'v76SnIHq9B7IsjMqwxMN4bo1FMNZY',
  '3FlqDxjzzv7RjrR3nDKNrIkWGRBZY',
  'xoiZOSLatemKv8GjTNF3vyuU3THZY',
  'fhbzP5NskO6cyn3VbY09P9tXSZOZY',
  'rhOWHTr9qcHsI0QhFCF5JgTPBl6YY',
  'ZwIBJZtNXuIryp5blVg2ZTt97AgZY',
  'nh9Bd3GvmFrfVI0xkIBGQqixrHWZY',
  'NwnrjNgxB7p7efVtCDkBywTH4EZZY',
  'bVcODFPV2dtYFV9LV36xLAL3alUZY',
  'vpliwvFuQvKYMl1sVwsFiuS0DGOZY',
  '1wf4t5lV6uSPYvXbgmHtNB79ArBZY',
  'b1GJeTpbYnnbehCocRotWzc4knSZY',
  'JoGAZfKI6J51twL41FjfuUv6OJGZY',
  'jxU2whYhP2v5fobgGHdbNTYFLCMZY',
  'NcvYXmi0bVnaSnG5fwwud2T9qlfZY',
  'zRwW4PAswL6zm906KAX8vQ0VyXFZY',
  'R6LzdsECdOwvCN9RAnFJRYBfhgHZY',
  '75sptWuYiLMkhkq8dYfEYpmAfUSZY',
  'x4yzNUBXlmW5UYVuyabV0vu02t9YY',
  'jdauAfvIScCIqJZEqWTp1boEtG6YY',
  't6WIzgKwyQp6nJNqc4VG4pnvLIIZY',
  'rVsuku00wvBlyWpYqzUWknG1BkOZY',
  '3bAom7sDO8vNLKCZwC8gQOYX7iOZY',
  'zF0z0DMXqBnjON904AxNIrgr6bcZY',
  'jxUSAIbz2WrPK0QIJJLtFaRi0ebZY',
  'JG7pIpqUJZuNX7QHW4RpBD249vIZY',
  'BUoxf19BjGLgxIREooKfP5WT9tAZY',
  'Feiwri5O2SFZojIrnhtNF86J1aAZY',
  'PNdvh4DG9s6HSxHJujsmwP9JscYZY',
  'xSFytRbXijmLnyHqH57xZbgt7tAZY',
  'Zq19HLt72fDlHj5Qey42P8TDfyGZY',
  '5SFhakrXiQkzLbl9iswiUUh2SOSZY',
  'zFwPjzCkfmOw6xriDPRXghoQ8AIZY',
  'TnPGLILSkT1nbiJQ0JuQ1DRCNoGZY',
  'v7gB56LqWPtMWpSBainOoEaC2OXZY',
  'tMP0BcdXbFgfKdxQ50Ik76Hn7gJZY',
  'L3L7bPWYteslx7bpGG0051PgslTZY',
  'd0xL6UTQHDHqphv7Wo9JovpGDIbZY',
  '9umDk3dhVJUnLcwFXeJPGNPnyV8YY',
  'xSBEbvJDiTDqPBIb1fLcIlWpTz9YY',
  'rnDNsaVE4sUEhSuAnOcTpB3oNlQZY',
  'brRPn6e8BU1EwvdHqRhX8U5ay95YY',
  'TVkjEnwwxPAO1tuvpliGqHvI8jeZY',
  'NkFBvKMx3tS4Lzk1Y5ccWwhwH9bZY',
  'H5To6CBHo9iTuOGwW2ZwNXLhsqVZY',
];

// 銀行振込のorder_id
const BANK_TRANSFER_ORDER_IDS = [45, 47, 48, 49, 50, 51];

async function main() {
  console.log('=== 発送テストデータのセットアップ ===\n');

  const action = process.argv[2];

  if (action === 'cleanup') {
    await cleanup();
  } else if (action === 'setup') {
    await setup();
  } else if (action === 'reset') {
    await cleanup();
    await setup();
  } else {
    console.log('使い方:');
    console.log('  node scripts/shipping-test-setup.mjs cleanup  # テストデータを削除');
    console.log('  node scripts/shipping-test-setup.mjs setup    # テストデータを作成');
    console.log('  node scripts/shipping-test-setup.mjs reset    # 削除→作成');
  }
}

async function cleanup() {
  console.log('🗑️  テストデータをクリーンアップ中...\n');

  // ordersテーブルからクレカのテストデータを削除
  console.log('1. ordersテーブルからクレカのテストデータを削除...');
  const { error: deleteOrdersError } = await supabase
    .from('orders')
    .delete()
    .in('id', CREDIT_CARD_PAYMENT_IDS);

  if (deleteOrdersError) {
    console.error('  ❌ エラー:', deleteOrdersError.message);
  } else {
    console.log(`  ✅ ${CREDIT_CARD_PAYMENT_IDS.length}件削除`);
  }

  // bank_transfer_ordersテーブルからテストデータを削除
  console.log('\n2. bank_transfer_ordersテーブルからテストデータを削除...');
  const { error: deleteBTError } = await supabase
    .from('bank_transfer_orders')
    .delete()
    .in('id', BANK_TRANSFER_ORDER_IDS);

  if (deleteBTError) {
    console.error('  ❌ エラー:', deleteBTError.message);
  } else {
    console.log(`  ✅ ${BANK_TRANSFER_ORDER_IDS.length}件削除`);
  }

  console.log('\n✅ クリーンアップ完了\n');
}

async function setup() {
  console.log('🔧 テストデータをセットアップ中...\n');

  // 1. bank_transfer_ordersにテストデータを作成（照合前の状態 = status='confirmed'）
  console.log('1. bank_transfer_ordersにテストデータを作成（照合前: status=confirmed）...');

  const btOrders = BANK_TRANSFER_ORDER_IDS.map(id => ({
    id,
    patient_id: `20260100${String(id).padStart(3, '0')}`, // テスト用patient_id
    product_code: 'MJL_2.5mg_1m',
    account_name: 'テストタロウ',
    phone_number: '09012345678',
    email: 'test@example.com',
    postal_code: '1000001',
    address: '東京都千代田区千代田1-1',
    status: 'confirmed', // 照合済みだがordersにはまだ入っていない
    submitted_at: new Date().toISOString(),
    confirmed_at: new Date().toISOString(),
  }));

  const { error: insertBTError } = await supabase
    .from('bank_transfer_orders')
    .upsert(btOrders, { onConflict: 'id' });

  if (insertBTError) {
    console.error('  ❌ エラー:', insertBTError.message);
  } else {
    console.log(`  ✅ ${btOrders.length}件作成`);
  }

  // 2. ordersテーブルにクレカのテストデータを作成（shipping_date=NULL）
  console.log('\n2. ordersテーブルにクレカのテストデータを作成（shipping_date=NULL）...');

  const orders = CREDIT_CARD_PAYMENT_IDS.map((id, index) => ({
    id,
    patient_id: `20260100${String(index + 100).padStart(3, '0')}`, // テスト用patient_id
    product_code: 'MJL_2.5mg_1m',
    payment_method: 'credit_card',
    amount: 13000,
    paid_at: new Date().toISOString(),
    shipping_date: null, // 未発送
    tracking_number: null,
  }));

  const { error: insertOrdersError } = await supabase
    .from('orders')
    .upsert(orders, { onConflict: 'id' });

  if (insertOrdersError) {
    console.error('  ❌ エラー:', insertOrdersError.message);
  } else {
    console.log(`  ✅ ${orders.length}件作成`);
  }

  console.log('\n✅ セットアップ完了\n');
  console.log('📝 次のステップ:');
  console.log('  1. /admin/shipping/pending にアクセス');
  console.log('  2. クレカ47件が表示されることを確認（bt_XXはまだ表示されない）');
  console.log('  3. 銀行振込の照合を行う（bank_transfer_ordersからordersへ転記）');
  console.log('  4. 再度 /admin/shipping/pending にアクセス');
  console.log('  5. クレカ47件 + 銀行振込7件 = 54件が表示されることを確認');
}

main().catch(console.error);
