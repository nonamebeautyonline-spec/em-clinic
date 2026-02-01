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

/**
 * 銀行振込照合テスト用データ作成
 */
async function createTestData() {
  console.log('=== 銀行振込照合テスト用データ作成 ===\n');

  const now = new Date().toISOString();

  // テストデータ（3件）
  const testOrders = [
    {
      id: `bt_pending_test_${Date.now()}_1`,
      patient_id: 'TEST_BT_20260201_001',
      product_code: 'MJL_2.5mg_1m',
      product_name: 'マンジャロ 2.5mg 1ヶ月',
      amount: 13000,
      paid_at: now,
      payment_method: 'bank_transfer',
      payment_status: 'PENDING',
      status: 'pending_confirmation',
      shipping_status: 'pending',
      shipping_name: '山田太郎',
      postal_code: '1000001',
      address: '東京都千代田区千代田1-1',
      phone: '09012345678',
      email: 'test1@example.com',
      account_name: 'ヤマダタロウ', // CSV照合用
      created_at: now,
      updated_at: now,
    },
    {
      id: `bt_pending_test_${Date.now()}_2`,
      patient_id: 'TEST_BT_20260201_002',
      product_code: 'MJL_5mg_1m',
      product_name: 'マンジャロ 5mg 1ヶ月',
      amount: 22850,
      paid_at: now,
      payment_method: 'bank_transfer',
      payment_status: 'PENDING',
      status: 'pending_confirmation',
      shipping_status: 'pending',
      shipping_name: '佐藤花子',
      postal_code: '1500001',
      address: '東京都渋谷区神宮前1-1',
      phone: '08011112222',
      email: 'test2@example.com',
      account_name: 'サトウハナコ', // CSV照合用
      created_at: now,
      updated_at: now,
    },
    {
      id: `bt_pending_test_${Date.now()}_3`,
      patient_id: 'TEST_BT_20260201_003',
      product_code: 'MJL_7.5mg_1m',
      product_name: 'マンジャロ 7.5mg 1ヶ月',
      amount: 34000,
      paid_at: now,
      payment_method: 'bank_transfer',
      payment_status: 'PENDING',
      status: 'pending_confirmation',
      shipping_status: 'pending',
      shipping_name: '鈴木一郎',
      postal_code: '1600022',
      address: '東京都新宿区新宿1-1',
      phone: '07033334444',
      email: 'test3@example.com',
      account_name: 'スズキイチロウ', // CSV照合用
      created_at: now,
      updated_at: now,
    },
  ];

  console.log('1. ordersテーブルにテストデータを挿入中...\n');

  const { error } = await supabase
    .from('orders')
    .insert(testOrders);

  if (error) {
    console.error('❌ エラー:', error.message);
    return;
  }

  console.log('✅ テストデータ作成完了\n');
  console.log('作成したデータ:');
  testOrders.forEach((o, i) => {
    console.log(`  ${i + 1}. ${o.account_name} - ¥${o.amount.toLocaleString()} (${o.product_name})`);
  });

  console.log('\n📋 テスト用CSV（サンプル）:');
  console.log('─────────────────────────────────────');
  console.log('日付,摘要,出金,入金,残高');
  console.log('2026/02/01,フリコミ ヤマダタロウ,,13000,1000000');
  console.log('2026/02/01,フリコミ サトウハナコ,,22850,1022850');
  console.log('2026/02/01,フリコミ スズキイチロウ,,34000,1056850');
  console.log('─────────────────────────────────────\n');

  console.log('📝 テスト手順:');
  console.log('1. 上記のCSVをコピーして test-bank-transfer.csv として保存');
  console.log('2. /admin/bank-transfer/reconcile にアクセス');
  console.log('3. CSVファイルをアップロードして照合実行');
  console.log('4. 3件がマッチすることを確認');
  console.log('5. /admin/shipping/pending で発送待ちリストに表示されることを確認\n');
}

async function cleanupTestData() {
  console.log('=== テストデータのクリーンアップ ===\n');

  const { error } = await supabase
    .from('orders')
    .delete()
    .like('patient_id', 'TEST_BT_20260201_%');

  if (error) {
    console.error('❌ エラー:', error.message);
    return;
  }

  console.log('✅ テストデータ削除完了\n');
}

// コマンドライン引数で処理を切り替え
const command = process.argv[2];

if (command === 'cleanup') {
  cleanupTestData().catch(console.error);
} else {
  createTestData().catch(console.error);
}
