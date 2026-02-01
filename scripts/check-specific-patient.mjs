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
  const patientId = '20260100043';

  console.log(`=== 患者 ${patientId} の詳細確認 ===\n`);

  // ordersテーブル
  const { data: orders } = await supabase
    .from('orders')
    .select('id, patient_id, shipping_name, paid_at, payment_method')
    .eq('patient_id', patientId);

  console.log('ordersテーブル:');
  if (orders && orders.length > 0) {
    orders.forEach((o, i) => {
      console.log(`  ${i + 1}. Order ID: ${o.id}`);
      console.log(`     shipping_name: "${o.shipping_name}"`);
      console.log(`     payment_method: ${o.payment_method}`);
      console.log(`     paid_at: ${o.paid_at}`);
      console.log('');
    });
  } else {
    console.log('  データなし\n');
  }

  // intakeテーブル
  const { data: intake } = await supabase
    .from('intake')
    .select('patient_id, patient_name, answerer_id')
    .eq('patient_id', patientId);

  console.log('intakeテーブル:');
  if (intake && intake.length > 0) {
    intake.forEach((p, i) => {
      console.log(`  ${i + 1}. patient_id: ${p.patient_id}`);
      console.log(`     patient_name: "${p.patient_name}"`);
      console.log(`     answerer_id: ${p.answerer_id}`);
      console.log('');
    });
  } else {
    console.log('  データなし（intakeに存在しない）\n');
  }
}

checkPatient().catch(console.error);
