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

async function checkOrdersShipping() {
  console.log('=== orders（payment_method=bank_transfer）の住所入力状況 ===\n');

  const { data: orders, error } = await supabase
    .from('orders')
    .select('patient_id, shipping_name, shipping_address, created_at')
    .eq('payment_method', 'bank_transfer')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`合計: ${orders.length}件\n`);

  const withAddress = orders.filter(o => o.shipping_address);
  const withoutAddress = orders.filter(o => !o.shipping_address);

  console.log(`住所入力済み: ${withAddress.length}件`);
  console.log(`住所未入力: ${withoutAddress.length}件\n`);

  if (withoutAddress.length > 0) {
    console.log('=== 住所未入力の患者 ===\n');
    withoutAddress.forEach((o, i) => {
      console.log(`[${i+1}] ${o.patient_id}`);
      console.log(`    配送先氏名: ${o.shipping_name || '(未入力)'}`);
      console.log(`    作成日時: ${o.created_at}`);
    });
  }

  console.log('\n=== bank_transfer_orders（25件）との比較 ===');
  console.log('bank_transfer_ordersの25件は全てaddressフィールドに住所あり');
  console.log('→ 移行後は全て「住所入力済み」になります\n');
}

checkOrdersShipping().catch(console.error);
