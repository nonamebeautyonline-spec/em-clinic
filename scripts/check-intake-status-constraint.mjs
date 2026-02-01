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

async function checkConstraint() {
  console.log('=== intake_status_check 制約を確認 ===\n');

  // 既存のステータス値を確認
  console.log('【1】既存データのstatus値を確認\n');

  const { data: statusValues, error: statusError } = await supabase
    .from('intake')
    .select('status')
    .limit(1000);

  if (statusError) {
    console.error('エラー:', statusError);
  } else {
    const uniqueStatuses = [...new Set(statusValues.map(r => r.status))].filter(s => s);
    console.log('既存のstatus値:', uniqueStatuses);
    console.log('');
  }

  // 各status値でテスト
  console.log('【2】各status値でINSERTテスト\n');

  const statusesToTest = [
    'pending',
    '',
    null,
    'OK',
    'NG',
    'cancelled',
    'completed',
  ];

  for (const testStatus of statusesToTest) {
    const testData = {
      reserve_id: 'test_' + Date.now(),
      patient_id: 'TEST_STATUS_' + Date.now(),
      patient_name: 'ステータステスト',
      answers: { test: 'test' },
      status: testStatus,
    };

    const { data, error } = await supabase
      .from('intake')
      .insert(testData)
      .select();

    if (error) {
      console.log(`❌ status="${testStatus}" → 失敗`);
      console.log(`   エラー: ${error.message}`);
    } else {
      console.log(`✅ status="${testStatus}" → 成功`);
      // テストデータを削除
      await supabase
        .from('intake')
        .delete()
        .eq('patient_id', testData.patient_id);
    }

    // レート制限回避のため少し待機
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n【3】制約の確認\n');
  console.log('Supabase SQL Editorで以下のSQLを実行してください:\n');
  console.log(`
SELECT
  conname,
  contype,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'intake'::regclass
AND conname = 'intake_status_check';
  `);
}

checkConstraint().catch(console.error);
