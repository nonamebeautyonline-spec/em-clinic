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

async function checkDetails() {
  const patientIds = ['20260100379', '20260100903', '20260100482'];

  console.log('=== 氏名が抜けている銀行振込患者の詳細 ===\n');

  for (const pid of patientIds) {
    console.log(`患者ID: ${pid}`);
    console.log('─'.repeat(50));

    // ordersテーブルの全データ
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('patient_id', pid);

    if (orders && orders.length > 0) {
      console.log(`\nordersテーブル: ${orders.length}件`);
      orders.forEach((o, i) => {
        console.log(`  ${i + 1}. ID: ${o.id}`);
        console.log(`     payment_method: ${o.payment_method}`);
        console.log(`     status: ${o.status}`);
        console.log(`     shipping_name: "${o.shipping_name}"`);
        console.log(`     account_name: "${o.account_name}"`);
        console.log(`     postal_code: "${o.postal_code}"`);
        console.log(`     address: "${o.address}"`);
        console.log(`     phone: "${o.phone}"`);
        console.log(`     email: "${o.email}"`);
        console.log(`     paid_at: ${o.paid_at}`);
        console.log('');
      });
    } else {
      console.log('  ordersテーブル: データなし\n');
    }

    // intakeテーブル
    const { data: intake } = await supabase
      .from('intake')
      .select('patient_id, patient_name, intake_status')
      .eq('patient_id', pid);

    if (intake && intake.length > 0) {
      console.log('intakeテーブル: 存在する');
      console.log(`  patient_name: "${intake[0].patient_name}"`);
      console.log(`  intake_status: ${intake[0].intake_status}`);
    } else {
      console.log('intakeテーブル: 存在しない');
    }

    console.log('\n');
  }
}

checkDetails().catch(console.error);
