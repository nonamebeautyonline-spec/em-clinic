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

async function updateOrdersFromBankTransfer() {
  console.log('=== bank_transfer_orders → orders 更新 + 新規追加 ===\n');

  // bank_transfer_ordersから全データ取得
  const { data: btOrders } = await supabase
    .from('bank_transfer_orders')
    .select('*')
    .order('created_at', { ascending: true });

  console.log(`bank_transfer_orders: ${btOrders.length}件\n`);

  // ordersから銀行振込データ取得
  const { data: orders } = await supabase
    .from('orders')
    .select('id, patient_id, created_at')
    .eq('payment_method', 'bank_transfer');

  console.log(`orders（payment_method='bank_transfer'）: ${orders.length}件\n`);

  // ordersのpatient_idでマップを作成
  const ordersMap = new Map(orders.map(o => [o.patient_id, o]));

  let updateCount = 0;
  let insertCount = 0;
  let skipCount = 0;
  const errors = [];

  console.log('処理開始...\n');

  for (const btOrder of btOrders) {
    const existingOrder = ordersMap.get(btOrder.patient_id);

    if (existingOrder) {
      // 既存レコードを更新
      const updateData = {
        shipping_name: btOrder.shipping_name || btOrder.account_name || null,
        address: btOrder.address || null,
        postal_code: btOrder.postal_code || null,
        phone: btOrder.phone_number || null,
        email: btOrder.email || null,
        account_name: btOrder.account_name || null,
      };

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', existingOrder.id);

      if (error) {
        errors.push({ patient_id: btOrder.patient_id, type: 'update', error: error.message });
        console.log(`❌ 更新失敗 ${btOrder.patient_id}: ${error.message}`);
      } else {
        updateCount++;
        if (updateCount % 10 === 0) {
          console.log(`更新進捗: ${updateCount}件`);
        }
      }
    } else {
      // 新規追加
      const insertData = {
        patient_id: btOrder.patient_id,
        payment_method: 'bank_transfer',
        product_code: btOrder.product_code || null,
        shipping_name: btOrder.shipping_name || btOrder.account_name || null,
        address: btOrder.address || null,
        postal_code: btOrder.postal_code || null,
        phone: btOrder.phone_number || null,
        email: btOrder.email || null,
        account_name: btOrder.account_name || null,
        shipping_date: null,
        tracking_number: null,
        created_at: btOrder.created_at,
      };

      const { error } = await supabase
        .from('orders')
        .insert(insertData);

      if (error) {
        errors.push({ patient_id: btOrder.patient_id, type: 'insert', error: error.message });
        console.log(`❌ 追加失敗 ${btOrder.patient_id}: ${error.message}`);
      } else {
        insertCount++;
        console.log(`✅ 新規追加 ${btOrder.patient_id}`);
      }
    }

    // レート制限回避
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n=== 処理完了 ===');
  console.log(`更新: ${updateCount}件`);
  console.log(`新規追加: ${insertCount}件`);
  console.log(`エラー: ${errors.length}件`);

  if (errors.length > 0) {
    console.log('\nエラー詳細:');
    errors.forEach(e => {
      console.log(`  ${e.patient_id} (${e.type}): ${e.error}`);
    });
  }

  // 最終検証
  console.log('\n=== 最終検証 ===');
  const { data: finalOrders } = await supabase
    .from('orders')
    .select('patient_id, shipping_name, address, postal_code, phone, email, account_name')
    .eq('payment_method', 'bank_transfer')
    .order('created_at', { ascending: true });

  const withAddress = finalOrders.filter(o => o.address);
  const withoutAddress = finalOrders.filter(o => !o.address);

  console.log(`orders総数: ${finalOrders.length}件`);
  console.log(`住所入力済み: ${withAddress.length}件`);
  console.log(`住所未入力: ${withoutAddress.length}件`);

  if (withAddress.length >= btOrders.length) {
    console.log('\n✅ bank_transfer_ordersの全データがordersに反映されました！');
  }
}

updateOrdersFromBankTransfer().catch(console.error);
