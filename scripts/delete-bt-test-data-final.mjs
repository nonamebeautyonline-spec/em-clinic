import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envPath = '/Users/administer/em-clinic/.env.local';
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...valueParts] = trimmed.split('=');
  if (key && valueParts.length > 0) {
    let value = valueParts.join('=').trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  console.log('=== 銀行振込テストデータ削除 ===\n');

  // テストデータのIDリスト
  const testIds = [
    52, 46, 44, 43, 27, 26, 25, 24, 23, 22, 20, 19,
    17, 16, 15, 13, 12, 11, 7, 6, 4, 5
  ];

  console.log(`削除対象: ${testIds.length}件\n`);

  // 削除前に確認
  const { data: beforeData } = await supabase
    .from('bank_transfer_orders')
    .select('id, patient_id, account_name')
    .in('id', testIds)
    .order('id');

  console.log('削除対象データ:');
  beforeData?.forEach(item => {
    console.log(`  ID ${item.id}: ${item.patient_id} - ${item.account_name}`);
  });

  console.log('\n削除を実行します...\n');

  // 削除実行
  const { data: deleteData, error, count: deletedCount } = await supabase
    .from('bank_transfer_orders')
    .delete({ count: 'exact' })
    .in('id', testIds);

  if (error) {
    console.error('❌ 削除エラー:', error);
    console.error('エラー詳細:', JSON.stringify(error, null, 2));
    return;
  }

  console.log(`✅ 削除完了: ${deletedCount}件削除されました\n`);

  // 削除後の確認
  const { data: afterData, count: remainingCount } = await supabase
    .from('bank_transfer_orders')
    .select('*', { count: 'exact', head: true });

  console.log(`残りのデータ件数: ${remainingCount}件`);
}

main();
