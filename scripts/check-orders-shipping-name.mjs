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

async function checkShippingNames() {
  console.log('=== ordersテーブルのshipping_name確認 ===\n');

  // クレカ決済の最新20件
  const { data: creditCards } = await supabase
    .from('orders')
    .select('id, patient_id, shipping_name, payment_method')
    .eq('payment_method', 'credit_card')
    .order('paid_at', { ascending: false })
    .limit(20);

  console.log('クレカ決済 最新20件:');
  console.log(`  総件数: ${creditCards?.length || 0}件`);
  const ccWithName = creditCards?.filter(o => o.shipping_name) || [];
  const ccWithoutName = creditCards?.filter(o => !o.shipping_name) || [];
  console.log(`  shipping_nameあり: ${ccWithName.length}件`);
  console.log(`  shipping_nameなし: ${ccWithoutName.length}件`);

  if (ccWithoutName.length > 0) {
    console.log('\n  shipping_nameが空のクレカ決済:');
    ccWithoutName.slice(0, 5).forEach(o => {
      console.log(`    - ID: ${o.id}, PID: ${o.patient_id}`);
    });
  }

  // 銀行振込の最新20件
  const { data: bankTransfers } = await supabase
    .from('orders')
    .select('id, patient_id, shipping_name, payment_method, status')
    .eq('payment_method', 'bank_transfer')
    .order('paid_at', { ascending: false })
    .limit(20);

  console.log('\n銀行振込 最新20件:');
  console.log(`  総件数: ${bankTransfers?.length || 0}件`);
  const btWithName = bankTransfers?.filter(o => o.shipping_name) || [];
  const btWithoutName = bankTransfers?.filter(o => !o.shipping_name) || [];
  console.log(`  shipping_nameあり: ${btWithName.length}件`);
  console.log(`  shipping_nameなし: ${btWithoutName.length}件`);

  if (btWithoutName.length > 0) {
    console.log('\n  shipping_nameが空の銀行振込:');
    btWithoutName.slice(0, 5).forEach(o => {
      console.log(`    - ID: ${o.id}, PID: ${o.patient_id}, Status: ${o.status}`);
    });
  }
}

checkShippingNames().catch(console.error);
