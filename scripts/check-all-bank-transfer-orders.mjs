#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
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
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log('=== 全銀行振込注文（TEST除く） ===\n');

const { data, error } = await supabase
  .from('bank_transfer_orders')
  .select('*')
  .order('created_at', { ascending: true });

if (error) {
  console.error('❌ エラー:', error.message);
  process.exit(1);
}

const realData = data.filter(row => !row.patient_id.startsWith('TEST'));

console.log(`総数: ${data.length}件（TEST除く: ${realData.length}件）\n`);

// 注文IDの重複チェック
const orderIds = realData.map(d => d.id);
const duplicateOrderIds = orderIds.filter((id, idx) => orderIds.indexOf(id) !== idx);

if (duplicateOrderIds.length > 0) {
  console.log('❌ 注文ID重複あり（これは発生しないはず、PRIMARY KEYなので）:');
  console.log(duplicateOrderIds);
}

// 患者IDの重複チェック
const patientIds = realData.map(d => d.patient_id);
const duplicatePatientIds = patientIds.filter((id, idx) => patientIds.indexOf(id) !== idx);

if (duplicatePatientIds.length > 0) {
  console.log('⚠️  患者ID重複あり:');
  const uniqueDupes = [...new Set(duplicatePatientIds)];
  uniqueDupes.forEach(patientId => {
    const dupes = realData.filter(d => d.patient_id === patientId);
    console.log(`\n患者ID: ${patientId} (${dupes.length}件)`);
    dupes.forEach((d, idx) => {
      console.log(`  ${idx + 1}. 注文ID: ${d.id}, 氏名: ${d.account_name}, 作成: ${d.created_at}`);
    });
  });
  console.log('');
}

console.log('全データ:');
realData.forEach((row, idx) => {
  console.log(`  ${idx + 1}. ID: ${row.id}, 患者ID: ${row.patient_id}, 氏名: ${row.account_name}`);
});
