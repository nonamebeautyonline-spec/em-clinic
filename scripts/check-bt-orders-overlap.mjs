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

async function checkOverlap() {
  console.log('=== 重複確認：bank_transfer_orders vs orders ===\n');

  // bank_transfer_ordersから25件取得
  const { data: btOrders } = await supabase
    .from('bank_transfer_orders')
    .select('patient_id, shipping_name, address, created_at')
    .order('created_at', { ascending: true });

  console.log(`bank_transfer_orders: ${btOrders.length}件\n`);

  // ordersから銀行振込データ取得
  const { data: orders, error } = await supabase
    .from('orders')
    .select('patient_id, shipping_name, address, created_at')
    .eq('payment_method', 'bank_transfer')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('orders取得エラー:', error);
    return;
  }

  console.log(`orders（payment_method='bank_transfer'）: ${orders ? orders.length : 0}件\n`);

  // ordersのpatient_idセット
  const ordersPidSet = new Set(orders.map(o => o.patient_id));

  // 重複チェック
  const alreadyInOrders = btOrders.filter(bt => ordersPidSet.has(bt.patient_id));
  const notInOrders = btOrders.filter(bt => !ordersPidSet.has(bt.patient_id));

  console.log('=== 結果 ===');
  console.log(`既にordersに存在: ${alreadyInOrders.length}件`);
  console.log(`ordersに未存在: ${notInOrders.length}件\n`);

  if (alreadyInOrders.length > 0) {
    console.log('=== 既にordersに存在する患者 ===\n');
    alreadyInOrders.forEach((bt, i) => {
      const isTarget = bt.patient_id === '20260101083';
      console.log(`[${i+1}] ${bt.patient_id}${isTarget ? ' ←←← この患者' : ''}`);
      console.log(`    配送先氏名: ${bt.shipping_name || '(未入力)'}`);
      console.log(`    住所: ${bt.address ? '入力済み' : '未入力'}`);
      console.log(`    作成日時: ${bt.created_at}`);
    });
  }

  if (notInOrders.length > 0) {
    console.log('\n=== ordersに未存在の患者（要移行） ===\n');
    notInOrders.forEach((bt, i) => {
      const isTarget = bt.patient_id === '20260101083';
      console.log(`[${i+1}] ${bt.patient_id}${isTarget ? ' ←←← この患者' : ''}`);
      console.log(`    配送先氏名: ${bt.shipping_name || '(未入力)'}`);
      console.log(`    住所: ${bt.address ? '入力済み' : '未入力'}`);
      console.log(`    作成日時: ${bt.created_at}`);
    });
  }

  console.log('\n=== ordersテーブルの住所入力状況 ===');
  const withAddress = orders.filter(o => o.address);
  const withoutAddress = orders.filter(o => !o.address);
  console.log(`住所入力済み: ${withAddress.length}件`);
  console.log(`住所未入力: ${withoutAddress.length}件`);
}

checkOverlap().catch(console.error);
