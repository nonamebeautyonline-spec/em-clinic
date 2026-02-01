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

async function compareDates() {
  console.log('=== bank_transfer_orders vs orders のcreated_at比較 ===\n');

  // bank_transfer_ordersから取得
  const { data: btOrders } = await supabase
    .from('bank_transfer_orders')
    .select('patient_id, created_at')
    .order('created_at', { ascending: true });

  console.log(`bank_transfer_orders: ${btOrders.length}件\n`);

  // ordersから銀行振込データを取得
  const { data: orders } = await supabase
    .from('orders')
    .select('patient_id, created_at')
    .eq('payment_method', 'bank_transfer')
    .order('patient_id', { ascending: true });

  console.log(`orders (bank_transfer): ${orders.length}件\n`);

  // patient_idでマッピング
  const btMap = new Map(btOrders.map(o => [o.patient_id, o.created_at]));
  const ordersMap = new Map(orders.map(o => [o.patient_id, o.created_at]));

  // 日時が異なるレコードを確認
  const mismatched = [];
  for (const btOrder of btOrders) {
    const orderDate = ordersMap.get(btOrder.patient_id);
    if (orderDate && orderDate !== btOrder.created_at) {
      mismatched.push({
        patient_id: btOrder.patient_id,
        bt_created_at: btOrder.created_at,
        orders_created_at: orderDate
      });
    }
  }

  console.log(`日時が一致: ${btOrders.length - mismatched.length}件`);
  console.log(`日時が不一致: ${mismatched.length}件\n`);

  if (mismatched.length > 0) {
    console.log('=== created_atが不一致のレコード（最初の10件） ===\n');
    mismatched.slice(0, 10).forEach((m, i) => {
      console.log(`[${i+1}] ${m.patient_id}`);
      console.log(`    bank_transfer_orders: ${m.bt_created_at}`);
      console.log(`    orders: ${m.orders_created_at}`);
    });

    if (mismatched.length > 10) {
      console.log(`\n... 他${mismatched.length - 10}件`);
    }
  }

  // 元のbank_transfer_ordersのcreated_atをサンプル表示
  console.log('\n=== bank_transfer_ordersの元データ（最初の5件） ===\n');
  btOrders.slice(0, 5).forEach((o, i) => {
    console.log(`[${i+1}] ${o.patient_id}: ${o.created_at}`);
  });
}

compareDates().catch(console.error);
