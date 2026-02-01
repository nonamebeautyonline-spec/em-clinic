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

async function checkMigrationDates() {
  console.log('=== bank_transfer移行データのcreated_at確認 ===\n');

  // ordersから銀行振込データを取得
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, patient_id, created_at, updated_at')
    .eq('payment_method', 'bank_transfer')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`合計: ${orders.length}件\n`);

  // created_atがnullまたは空のレコード
  const withoutCreatedAt = orders.filter(o => !o.created_at);
  const withCreatedAt = orders.filter(o => o.created_at);

  console.log(`created_atあり: ${withCreatedAt.length}件`);
  console.log(`created_atなし: ${withoutCreatedAt.length}件\n`);

  if (withoutCreatedAt.length > 0) {
    console.log('=== created_atが空のレコード ===\n');
    withoutCreatedAt.forEach((o, i) => {
      console.log(`[${i+1}] ID: ${o.id}, patient_id: ${o.patient_id}`);
      console.log(`    created_at: ${o.created_at || '(なし)'}`);
      console.log(`    updated_at: ${o.updated_at || '(なし)'}`);
    });
  }

  // 全レコードの詳細表示
  console.log('\n=== 全レコード詳細 ===\n');
  orders.forEach((o, i) => {
    console.log(`[${i+1}] ${o.patient_id}`);
    console.log(`    ID: ${o.id}`);
    console.log(`    created_at: ${o.created_at || '(なし)'}`);
    console.log(`    updated_at: ${o.updated_at || '(なし)'}`);
  });
}

checkMigrationDates().catch(console.error);
