import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function checkRLS() {
  console.log('=== Supabase intakeテーブルのRLS設定を確認 ===\n');

  // 1. ANON_KEY でテスト
  console.log('【1】ANON_KEY でのINSERT権限テスト\n');

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const testData = {
    reserve_id: 'test_reserve_' + Date.now(),
    patient_id: 'TEST_RLS_' + Date.now(),
    patient_name: 'RLSテスト患者',
    answers: { test: 'test' },
    status: 'pending',
  };

  console.log('テストデータ挿入を試行中...');

  const { data: insertData, error: insertError } = await anonClient
    .from('intake')
    .insert(testData)
    .select();

  if (insertError) {
    console.log('❌ ANON_KEY での挿入失敗');
    console.log('エラーコード:', insertError.code);
    console.log('エラーメッセージ:', insertError.message);
    console.log('エラー詳細:', insertError.details);
    console.log('エラーヒント:', insertError.hint);
    console.log('\n⚠️ これが原因でGASからのintake書き込みが失敗している可能性があります\n');
  } else {
    console.log('✅ ANON_KEY での挿入成功');
    console.log('挿入されたデータ:', insertData);

    // テストデータを削除
    console.log('\nテストデータを削除中...');
    const serviceRoleClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    await serviceRoleClient
      .from('intake')
      .delete()
      .eq('patient_id', testData.patient_id);

    console.log('✅ テストデータ削除完了\n');
  }

  // 2. SERVICE_ROLE_KEY でテスト
  console.log('【2】SERVICE_ROLE_KEY でのINSERT権限テスト\n');

  const serviceRoleClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const testData2 = {
    reserve_id: 'test_reserve_sr_' + Date.now(),
    patient_id: 'TEST_RLS_SR_' + Date.now(),
    patient_name: 'RLSテスト患者(ServiceRole)',
    answers: { test: 'test' },
    status: 'pending',
  };

  console.log('テストデータ挿入を試行中...');

  const { data: insertData2, error: insertError2 } = await serviceRoleClient
    .from('intake')
    .insert(testData2)
    .select();

  if (insertError2) {
    console.log('❌ SERVICE_ROLE_KEY での挿入失敗');
    console.log('エラー:', insertError2);
  } else {
    console.log('✅ SERVICE_ROLE_KEY での挿入成功');
    console.log('挿入されたデータ:', insertData2);

    // テストデータを削除
    console.log('\nテストデータを削除中...');
    await serviceRoleClient
      .from('intake')
      .delete()
      .eq('patient_id', testData2.patient_id);

    console.log('✅ テストデータ削除完了\n');
  }

  // 3. RLS有効化状態を確認
  console.log('【3】RLS設定の確認\n');

  const { data: tables, error: tablesError } = await serviceRoleClient
    .from('pg_tables')
    .select('tablename, schemaname')
    .eq('tablename', 'intake');

  if (tablesError) {
    console.log('テーブル情報取得エラー:', tablesError);
  } else {
    console.log('intakeテーブル存在確認:', tables);
  }

  // RLSポリシーを確認（直接SQLクエリ）
  console.log('\n【4】RLSポリシーの確認\n');
  console.log('以下のSQLをSupabase SQL Editorで実行してください:\n');
  console.log(`
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'intake';
  `);

  console.log('\nまたは、RLS有効化状態を確認:\n');
  console.log(`
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'intake';
  `);
}

checkRLS().catch(console.error);
