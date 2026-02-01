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
  console.log('=== 銀行振込で氏名が抜けているデータを確認 ===\n');

  // 銀行振込の最新100件を取得
  const { data: orders } = await supabase
    .from('orders')
    .select('id, patient_id, shipping_name, status, paid_at')
    .eq('payment_method', 'bank_transfer')
    .order('paid_at', { ascending: false })
    .limit(100);

  if (!orders || orders.length === 0) {
    console.log('銀行振込データがありません');
    return;
  }

  console.log(`銀行振込 最新100件を確認中...\n`);

  // 患者IDリスト
  const patientIds = [...new Set(orders.map(o => o.patient_id))];

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
    const shippingName = order.shipping_name && order.shipping_name !== 'null' ? order.shipping_name : '';
    const intakeName = patientNameMap[order.patient_id] || '';
    const finalName = shippingName || intakeName;

    if (!finalName) {
      missing.push({
        order_id: order.id,
        patient_id: order.patient_id,
        shipping_name: order.shipping_name,
        intake_name: intakeName,
        status: order.status,
        paid_at: order.paid_at,
      });
    }
  }

  console.log(`氏名が抜けている銀行振込: ${missing.length}件\n`);

  if (missing.length > 0) {
    console.log('詳細:');
    missing.forEach((m, i) => {
      console.log(`  ${i + 1}. Order ID: ${m.order_id}`);
      console.log(`     Patient ID: ${m.patient_id}`);
      console.log(`     orders.shipping_name: "${m.shipping_name}"`);
      console.log(`     intake.patient_name: "${m.intake_name}"`);
      console.log(`     Status: ${m.status}`);
      console.log(`     Paid at: ${m.paid_at}`);
      console.log('');
    });

    // intakeに存在しない患者ID
    const missingInIntake = missing.filter(m => !m.intake_name);
    console.log(`\nintakeテーブルに存在しない患者: ${missingInIntake.length}件`);
    if (missingInIntake.length > 0) {
      console.log('患者ID:');
      missingInIntake.forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.patient_id} (Order: ${m.order_id})`);
      });
    }
  } else {
    console.log('✅ すべての銀行振込に氏名が設定されています');
  }
}

checkMissingNames().catch(console.error);
