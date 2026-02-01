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

async function checkBankTransferStatus() {
  console.log('=== 銀行振込の注文ステータス確認 ===\n');

  const { data, error } = await supabase
    .from('orders')
    .select('id, patient_id, status, created_at, paid_at, payment_method')
    .eq('payment_method', 'bank_transfer')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total: ${data.length} 件\n`);

  data.forEach(order => {
    console.log(`ID: ${order.id}`);
    console.log(`  patient_id: ${order.patient_id}`);
    console.log(`  status: ${order.status}`);
    console.log(`  created_at: ${order.created_at}`);
    console.log(`  paid_at: ${order.paid_at || '(null)'}`);
    console.log('');
  });

  // 20260101083 を詳細確認
  console.log('\n=== 20260101083 詳細 ===');
  const { data: patient083 } = await supabase
    .from('orders')
    .select('*')
    .eq('patient_id', '20260101083')
    .eq('payment_method', 'bank_transfer')
    .single();

  if (patient083) {
    console.log('status:', patient083.status);
    console.log('created_at:', patient083.created_at);
    console.log('paid_at:', patient083.paid_at);
    console.log('id:', patient083.id);
  } else {
    console.log('見つかりません');
  }
}

checkBankTransferStatus().catch(console.error);
