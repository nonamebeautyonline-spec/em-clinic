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
 * 銀行振込の照合（テスト用）
 * bank_transfer_ordersのstatus='confirmed'をordersテーブルに転記する
 */
async function reconcileBankTransfers() {
  console.log('=== 銀行振込の照合（テスト） ===\n');

  // 1. bank_transfer_ordersからstatus='confirmed'のデータを取得
  console.log('1. bank_transfer_ordersからstatus=confirmedのデータを取得...');
  const { data: btOrders, error: btError } = await supabase
    .from('bank_transfer_orders')
    .select('*')
    .eq('status', 'confirmed');

  if (btError) {
    console.error('❌ エラー:', btError.message);
    return;
  }

  if (!btOrders || btOrders.length === 0) {
    console.log('⚠️  照合対象のデータがありません（status=confirmedのbank_transfer_ordersが0件）');
    return;
  }

  console.log(`✅ ${btOrders.length}件取得\n`);

  // 2. ordersテーブルに転記
  console.log('2. ordersテーブルに転記...');

  const orders = btOrders.map(bt => ({
    id: `bt_${bt.id}`, // payment_id
    patient_id: bt.patient_id,
    product_code: bt.product_code,
    payment_method: 'bank_transfer',
    amount: getProductPrice(bt.product_code),
    paid_at: bt.confirmed_at || bt.submitted_at,
    shipping_date: null, // 未発送
    tracking_number: null,
    created_at: bt.created_at,
    updated_at: new Date().toISOString(),
  }));

  const { error: insertError } = await supabase
    .from('orders')
    .upsert(orders, { onConflict: 'id' });

  if (insertError) {
    console.error('❌ エラー:', insertError.message);
    return;
  }

  console.log(`✅ ${orders.length}件転記完了\n`);

  // 3. 転記したデータを表示
  console.log('3. 転記したデータ:');
  orders.forEach(o => {
    console.log(`  - ${o.id} (patient_id: ${o.patient_id}, product: ${o.product_code})`);
  });

  console.log('\n✅ 照合完了');
  console.log('\n📝 次のステップ:');
  console.log('  1. /admin/shipping/pending にアクセス');
  console.log('  2. クレカ + 銀行振込の注文が表示されることを確認');
}

function getProductPrice(productCode) {
  const prices = {
    'MJL_2.5mg_1m': 13000,
    'MJL_2.5mg_2m': 25500,
    'MJL_2.5mg_3m': 35000,
    'MJL_5mg_1m': 22850,
    'MJL_5mg_2m': 45500,
    'MJL_5mg_3m': 63000,
    'MJL_7.5mg_1m': 34000,
    'MJL_7.5mg_2m': 65000,
    'MJL_7.5mg_3m': 96000,
  };
  return prices[productCode] || 0;
}

reconcileBankTransfers().catch(console.error);
