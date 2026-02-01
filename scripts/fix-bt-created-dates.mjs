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

async function fixCreatedDates() {
  console.log('=== ordersテーブルのcreated_atを元の申請日時に修正 ===\n');

  // bank_transfer_ordersから元のcreated_atを取得
  const { data: btOrders } = await supabase
    .from('bank_transfer_orders')
    .select('patient_id, created_at')
    .order('created_at', { ascending: true });

  console.log(`bank_transfer_orders: ${btOrders.length}件\n`);

  let successCount = 0;
  let skipCount = 0;
  const errors = [];

  for (const btOrder of btOrders) {
    // ordersテーブルで該当するレコードを検索
    const { data: existingOrders } = await supabase
      .from('orders')
      .select('id, patient_id, created_at')
      .eq('patient_id', btOrder.patient_id)
      .eq('payment_method', 'bank_transfer');

    if (!existingOrders || existingOrders.length === 0) {
      console.log(`⚠️  ${btOrder.patient_id}: ordersに存在しない`);
      skipCount++;
      continue;
    }

    const order = existingOrders[0];

    // created_atが既に一致している場合はスキップ
    if (order.created_at === btOrder.created_at) {
      skipCount++;
      continue;
    }

    // created_atを更新
    const { error } = await supabase
      .from('orders')
      .update({
        created_at: btOrder.created_at
      })
      .eq('id', order.id);

    if (error) {
      errors.push({ patient_id: btOrder.patient_id, error: error.message });
      console.log(`❌ ${btOrder.patient_id}: 更新失敗 - ${error.message}`);
    } else {
      successCount++;
      console.log(`✅ ${btOrder.patient_id}: ${order.created_at} → ${btOrder.created_at}`);
    }

    // レート制限回避
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n=== 処理完了 ===');
  console.log(`更新成功: ${successCount}件`);
  console.log(`スキップ: ${skipCount}件`);
  console.log(`エラー: ${errors.length}件`);

  if (errors.length > 0) {
    console.log('\nエラー詳細:');
    errors.forEach(e => {
      console.log(`  ${e.patient_id}: ${e.error}`);
    });
  }

  // 検証
  console.log('\n=== 検証 ===');
  const { data: verifyOrders } = await supabase
    .from('orders')
    .select('patient_id, created_at')
    .eq('payment_method', 'bank_transfer')
    .order('created_at', { ascending: true });

  const btMap = new Map(btOrders.map(o => [o.patient_id, o.created_at]));
  let matchCount = 0;
  let mismatchCount = 0;

  for (const order of verifyOrders) {
    const btDate = btMap.get(order.patient_id);
    if (btDate && btDate === order.created_at) {
      matchCount++;
    } else if (btDate) {
      mismatchCount++;
    }
  }

  console.log(`一致: ${matchCount}件`);
  console.log(`不一致: ${mismatchCount}件`);

  if (mismatchCount === 0 && matchCount === btOrders.length) {
    console.log('\n✅ 全てのcreated_atが正しく修正されました！');
  }
}

fixCreatedDates().catch(console.error);
