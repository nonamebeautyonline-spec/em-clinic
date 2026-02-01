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

async function checkMissingNames() {
  console.log('=== 氏名が抜けている注文を確認 ===\n');

  // ordersから最新100件を取得
  const { data: orders } = await supabase
    .from('orders')
    .select('id, patient_id, payment_method')
    .order('paid_at', { ascending: false })
    .limit(100);

  if (!orders || orders.length === 0) {
    console.log('注文データがありません');
    return;
  }

  const patientIds = [...new Set(orders.map(o => o.patient_id))];
  console.log(`患者数: ${patientIds.length}件\n`);

  // intakeから患者名を取得
  const { data: patients } = await supabase
    .from('intake')
    .select('patient_id, patient_name')
    .in('patient_id', patientIds);

  const patientNameMap = {};
  (patients || []).forEach(p => {
    patientNameMap[p.patient_id] = p.patient_name || '';
  });

  // 氏名が抜けているものをチェック
  const missing = [];
  for (const order of orders) {
    const name = patientNameMap[order.patient_id];
    if (!name) {
      missing.push({
        order_id: order.id,
        patient_id: order.patient_id,
        payment_method: order.payment_method,
      });
    }
  }

  console.log(`氏名が抜けている注文: ${missing.length}件\n`);

  if (missing.length > 0) {
    console.log('詳細:');
    missing.forEach((m, i) => {
      console.log(`  ${i + 1}. Order ID: ${m.order_id}, Patient ID: ${m.patient_id}, 決済: ${m.payment_method}`);
    });
    console.log('\n');
  }

  // intakeテーブルに存在しない患者IDを確認
  const missingPatientIds = [...new Set(missing.map(m => m.patient_id))];
  console.log(`intakeに存在しない患者ID: ${missingPatientIds.length}件`);

  if (missingPatientIds.length > 0) {
    console.log('\n患者ID一覧:');
    missingPatientIds.forEach((pid, i) => {
      console.log(`  ${i + 1}. ${pid}`);
    });
  }
}

checkMissingNames().catch(console.error);
