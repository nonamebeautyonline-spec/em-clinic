#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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

const gasUrl = envVars.GAS_BANK_TRANSFER_URL;

console.log('=== 銀行振込テストデータ削除 ===\n');

// 1. DBからテストデータを確認
console.log('[1/3] DBからテストデータを確認中...\n');

const { data: testData, error: fetchError } = await supabase
  .from('bank_transfer_orders')
  .select('*')
  .like('patient_id', 'TEST%');

if (fetchError) {
  console.error('❌ DBエラー:', fetchError.message);
  process.exit(1);
}

if (testData.length === 0) {
  console.log('✅ DBにテストデータはありません\n');
} else {
  console.log(`📋 DBに ${testData.length} 件のテストデータを発見:`);
  testData.forEach((row, idx) => {
    console.log(`  ${idx + 1}. ID: ${row.id}, 患者ID: ${row.patient_id}, 氏名: ${row.account_name || row.shipping_name}`);
  });
  console.log('');
}

// 2. DBからテストデータを削除
if (testData.length > 0) {
  console.log('[2/3] DBからテストデータを削除中...\n');

  const { error: deleteError } = await supabase
    .from('bank_transfer_orders')
    .delete()
    .like('patient_id', 'TEST%');

  if (deleteError) {
    console.error('❌ 削除エラー:', deleteError.message);
    process.exit(1);
  }

  console.log(`✅ DBから ${testData.length} 件のテストデータを削除しました\n`);
} else {
  console.log('[2/3] 削除するテストデータがありません\n');
}

// 3. GASシートからテストデータを削除
console.log('[3/3] GASシートからテストデータを削除中...\n');

try {
  const response = await fetch(gasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'delete_test_data',
    }),
  });

  const responseText = await response.text();

  if (response.ok) {
    try {
      const json = JSON.parse(responseText);
      if (json.ok) {
        console.log(`✅ GASシートから削除完了: ${json.message || '成功'}`);
      } else {
        console.log(`❌ GASエラー: ${json.error}`);
      }
    } catch (e) {
      console.log(`✅ GAS応答: ${responseText.substring(0, 200)}`);
    }
  } else {
    console.log(`❌ HTTPエラー (${response.status}): ${responseText}`);
  }
} catch (e) {
  console.error(`❌ GAS通信エラー: ${e.message}`);
}

console.log('\n=== 削除完了 ===');
