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

async function fix20260101083() {
  console.log('=== 20260101083 のステータスを pending_confirmation に修正 ===\n');

  // 現在の状態を確認
  const { data: before } = await supabase
    .from('orders')
    .select('*')
    .eq('patient_id', '20260101083')
    .eq('payment_method', 'bank_transfer')
    .single();

  console.log('修正前:');
  console.log('  id:', before.id);
  console.log('  status:', before.status);
  console.log('  paid_at:', before.paid_at);
  console.log('');

  // ステータスを pending_confirmation に変更
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'pending_confirmation',
      updated_at: new Date().toISOString()
    })
    .eq('patient_id', '20260101083')
    .eq('payment_method', 'bank_transfer');

  if (error) {
    console.error('Error:', error);
    return;
  }

  // 修正後の状態を確認
  const { data: after } = await supabase
    .from('orders')
    .select('*')
    .eq('patient_id', '20260101083')
    .eq('payment_method', 'bank_transfer')
    .single();

  console.log('修正後:');
  console.log('  id:', after.id);
  console.log('  status:', after.status);
  console.log('  paid_at:', after.paid_at);
  console.log('\n✅ 修正完了');
}

fix20260101083().catch(console.error);
