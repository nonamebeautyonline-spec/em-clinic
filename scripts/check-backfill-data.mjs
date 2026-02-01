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

async function checkBackfill() {
  console.log('=== バックフィルしたクレカデータのshipping_name確認 ===\n');

  const { data: sample } = await supabase
    .from('orders')
    .select('id, patient_id, shipping_name, paid_at')
    .eq('payment_method', 'credit_card')
    .order('paid_at', { ascending: false })
    .limit(10);

  console.log('クレカ決済 最新10件:');
  console.log('');

  for (let i = 0; i < (sample || []).length; i++) {
    const o = sample[i];
    console.log(`${i + 1}. ID: ${o.id}`);
    console.log(`   PID: ${o.patient_id}`);
    console.log(`   shipping_name: ${o.shipping_name || '(空)'}`);
    console.log(`   paid_at: ${o.paid_at}`);
    console.log('');
  }

  // 統計
  const withName = sample.filter(o => o.shipping_name).length;
  const withoutName = sample.length - withName;
  console.log(`shipping_nameあり: ${withName}件`);
  console.log(`shipping_nameなし: ${withoutName}件`);
}

checkBackfill().catch(console.error);
