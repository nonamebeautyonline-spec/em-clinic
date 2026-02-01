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

async function checkPatient() {
  console.log('=== 患者 20260101083 ===\n');

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('patient_id', '20260101083')
    .eq('payment_method', 'bank_transfer')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('ID:', data.id);
  console.log('patient_id:', data.patient_id);
  console.log('created_at:', data.created_at);
  console.log('updated_at:', data.updated_at);
  console.log('payment_method:', data.payment_method);
  console.log('product_code:', data.product_code || '(なし)');
  console.log('shipping_name:', data.shipping_name || '(なし)');
  console.log('account_name:', data.account_name || '(なし)');
  console.log('address:', data.address ? '入力済み' : '未入力');
  console.log('postal_code:', data.postal_code || '(なし)');
  console.log('phone:', data.phone || '(なし)');
  console.log('email:', data.email || '(なし)');
  console.log('status:', data.status || '(なし)');
  console.log('payment_status:', data.payment_status || '(なし)');
  console.log('shipping_status:', data.shipping_status || '(なし)');
  console.log('shipping_date:', data.shipping_date || '(なし)');

  // bank_transfer_ordersにも存在するか確認
  const { data: btData } = await supabase
    .from('bank_transfer_orders')
    .select('*')
    .eq('patient_id', '20260101083')
    .single();

  console.log('\n=== bank_transfer_orders ===');
  if (btData) {
    console.log('存在する');
    console.log('created_at:', btData.created_at);
    console.log('shipping_name:', btData.shipping_name || '(なし)');
    console.log('account_name:', btData.account_name || '(なし)');
  } else {
    console.log('存在しない（新規追加された患者）');
  }
}

checkPatient().catch(console.error);
