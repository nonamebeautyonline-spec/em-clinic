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

async function checkOrders() {
  const problemPatients = [
    { pid: '20260100043', source: 'クレカ' },
    { pid: '20260100379', source: '銀行振込' },
    { pid: '20260100903', source: '銀行振込' },
    { pid: '20260100482', source: '銀行振込' },
  ];

  console.log('=== ordersテーブルで4名の患者を確認 ===\n');

  for (const patient of problemPatients) {
    console.log(`【${patient.source}】${patient.pid}`);
    console.log('─'.repeat(60));

    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('patient_id', patient.pid);

    if (!orders || orders.length === 0) {
      console.log('❌ ordersテーブルに存在しません\n');
      continue;
    }

    console.log(`✅ ordersテーブルに${orders.length}件存在\n`);

    orders.forEach((order, i) => {
      console.log(`${i + 1}. Order ID: ${order.id}`);
      console.log(`   payment_method: ${order.payment_method}`);
      console.log(`   status: ${order.status}`);
      console.log(`   shipping_name: "${order.shipping_name}"`);
      console.log(`   account_name: "${order.account_name}"`);
      console.log(`   postal_code: "${order.postal_code}"`);
      console.log(`   address: "${order.address}"`);
      console.log(`   phone: "${order.phone}"`);
      console.log(`   email: "${order.email}"`);
      console.log(`   paid_at: ${order.paid_at}`);
      console.log('');
    });
  }
}

checkOrders().catch(console.error);
