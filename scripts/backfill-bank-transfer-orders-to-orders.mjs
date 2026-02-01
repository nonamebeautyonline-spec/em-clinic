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

async function backfillBankTransferOrders() {
  console.log('=== bank_transfer_orders → orders バックフィル ===\n');

  // bank_transfer_ordersから全データ取得
  const { data: btOrders, error: btError } = await supabase
    .from('bank_transfer_orders')
    .select('*');

  if (btError) {
    console.error('❌ bank_transfer_orders取得エラー:', btError);
    return;
  }

  console.log(`bank_transfer_orders: ${btOrders.length}件\n`);

  if (btOrders.length === 0) {
    console.log('✅ バックフィルするデータがありません');
    return;
  }

  // ordersテーブルに既存の銀行振込注文を取得
  const { data: existingOrders } = await supabase
    .from('orders')
    .select('patient_id, created_at')
    .eq('payment_method', 'bank_transfer');

  const existingSet = new Set(
    (existingOrders || []).map(o => `${o.patient_id}_${o.created_at}`)
  );

  console.log(`orders（銀行振込）既存: ${existingOrders?.length || 0}件\n`);

  let insertCount = 0;
  let skipCount = 0;
  const errors = [];

  console.log('バックフィル開始...\n');

  for (const btOrder of btOrders) {
    const key = `${btOrder.patient_id}_${btOrder.created_at}`;

    // 既存チェック（patient_id + created_atで重複判定）
    if (existingSet.has(key)) {
      skipCount++;
      continue;
    }

    // ordersテーブル用のデータ変換
    const orderData = {
      patient_id: btOrder.patient_id,
      patient_name: btOrder.shipping_name || btOrder.account_name || null,
      payment_method: 'bank_transfer',
      product_code: btOrder.product_code || null,
      shipping_name: btOrder.shipping_name || btOrder.account_name || null,
      shipping_address: btOrder.address || null,
      shipping_postal_code: btOrder.postal_code || null,
      phone: btOrder.phone_number || null,
      email: btOrder.email || null,
      shipping_date: null, // bank_transfer_ordersにはshipping_dateがない
      tracking_number: null,
      created_at: btOrder.created_at,
    };

    const { error } = await supabase
      .from('orders')
      .insert(orderData);

    if (error) {
      errors.push({ patient_id: btOrder.patient_id, error: error.message });
      console.log(`❌ ${btOrder.patient_id}: ${error.message}`);
    } else {
      insertCount++;
      if (insertCount % 10 === 0) {
        console.log(`進捗: ${insertCount}件`);
      }
    }
  }

  console.log('\n=== バックフィル完了 ===');
  console.log(`挿入: ${insertCount}件`);
  console.log(`スキップ（既存）: ${skipCount}件`);
  console.log(`エラー: ${errors.length}件`);

  if (errors.length > 0) {
    console.log('\nエラー詳細:');
    errors.forEach(e => {
      console.log(`  ${e.patient_id}: ${e.error}`);
    });
  }

  // 検証
  console.log('\n=== 検証 ===');
  const { count: finalCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('payment_method', 'bank_transfer');

  console.log(`orders（銀行振込）最終件数: ${finalCount}件`);
  console.log(`bank_transfer_orders件数: ${btOrders.length}件`);

  if (finalCount >= btOrders.length) {
    console.log('\n✅ 全データがordersテーブルに存在します');
  }
}

backfillBankTransferOrders().catch(console.error);
