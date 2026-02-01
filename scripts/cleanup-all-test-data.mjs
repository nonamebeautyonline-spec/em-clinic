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

async function cleanupAllTestData() {
  console.log('=== 全テストデータのクリーンアップ ===\n');

  // 1. ordersテーブルからテストデータを削除
  console.log('1. ordersテーブルからテストデータを検索...');

  const { data: testOrders, error: findError } = await supabase
    .from('orders')
    .select('id, patient_id, product_code')
    .or('id.like.TEST_%,id.like.bt_test_%,patient_id.like.TEST_%');

  if (findError) {
    console.error('❌ エラー:', findError.message);
  } else {
    console.log(`  見つかったテストデータ: ${testOrders?.length || 0}件`);

    if (testOrders && testOrders.length > 0) {
      testOrders.forEach(o => {
        console.log(`  - ${o.id} (patient_id: ${o.patient_id})`);
      });

      // 削除確認
      console.log('\n削除を実行しますか？ (Ctrl+C でキャンセル)');

      const orderIds = testOrders.map(o => o.id);
      const { error: deleteError } = await supabase
        .from('orders')
        .delete()
        .in('id', orderIds);

      if (deleteError) {
        console.error('❌ 削除エラー:', deleteError.message);
      } else {
        console.log(`✅ ${orderIds.length}件削除完了`);
      }
    }
  }

  // 2. bank_transfer_ordersテーブルからテストデータを削除
  console.log('\n2. bank_transfer_ordersテーブルからテストデータを検索...');

  const { data: testBT, error: findBTError } = await supabase
    .from('bank_transfer_orders')
    .select('id, patient_id, product_code')
    .or('patient_id.like.TEST_%,patient_id.like.20260100%');

  if (findBTError) {
    console.error('❌ エラー:', findBTError.message);
  } else {
    console.log(`  見つかったテストデータ: ${testBT?.length || 0}件`);

    if (testBT && testBT.length > 0) {
      testBT.forEach(o => {
        console.log(`  - id=${o.id} (patient_id: ${o.patient_id})`);
      });

      const btIds = testBT.map(o => o.id);
      const { error: deleteBTError } = await supabase
        .from('bank_transfer_orders')
        .delete()
        .in('id', btIds);

      if (deleteBTError) {
        console.error('❌ 削除エラー:', deleteBTError.message);
      } else {
        console.log(`✅ ${btIds.length}件削除完了`);
      }
    }
  }

  // 3. intakeテーブルからテストデータを削除
  console.log('\n3. intakeテーブルからテストデータを検索...');

  const { data: testIntake, error: findIntakeError } = await supabase
    .from('intake')
    .select('patient_id, patient_name')
    .or('patient_id.like.TEST_%,patient_id.like.20260100%');

  if (findIntakeError) {
    console.error('❌ エラー:', findIntakeError.message);
  } else {
    console.log(`  見つかったテストデータ: ${testIntake?.length || 0}件`);

    if (testIntake && testIntake.length > 0) {
      testIntake.slice(0, 5).forEach(o => {
        console.log(`  - ${o.patient_id} (${o.patient_name})`);
      });
      if (testIntake.length > 5) {
        console.log(`  ... 他 ${testIntake.length - 5}件`);
      }

      const patientIds = testIntake.map(o => o.patient_id);
      const { error: deleteIntakeError } = await supabase
        .from('intake')
        .delete()
        .in('patient_id', patientIds);

      if (deleteIntakeError) {
        console.error('❌ 削除エラー:', deleteIntakeError.message);
      } else {
        console.log(`✅ ${patientIds.length}件削除完了`);
      }
    }
  }

  console.log('\n✅ クリーンアップ完了\n');
}

cleanupAllTestData().catch(console.error);
