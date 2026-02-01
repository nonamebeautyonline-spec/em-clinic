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

const targetPaymentIds = [
  'bt_42', 'bt_41', 'bt_40', 'bt_39', 'bt_38', 'bt_37', 'bt_36', 'bt_35',
  'bt_34', 'bt_33', 'bt_32', 'bt_31', 'bt_30', 'bt_29', 'bt_28', 'bt_21',
  'bt_18', 'bt_14', 'bt_10', 'bt_9', 'bt_8'
];

console.log('=== 21人の患者キャッシュクリア ===\n');

// ordersテーブルから patient_id を取得
const { data, error } = await supabase
  .from('orders')
  .select('id, patient_id')
  .in('id', targetPaymentIds);

if (error) {
  console.error('❌ エラー:', error.message);
  process.exit(1);
}

console.log(`対象: ${data.length}件\n`);

const adminToken = envVars.ADMIN_TOKEN;
let successCount = 0;
let errorCount = 0;

for (const order of data) {
  const { id, patient_id } = order;

  if (!patient_id) {
    console.log(`⚠️  ${id}: patient_id なし`);
    continue;
  }

  try {
    const response = await fetch('http://localhost:3000/api/admin/invalidate-cache', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ patient_id }),
    });

    if (response.ok) {
      successCount++;
      console.log(`✅ ${id} (${patient_id})`);
    } else {
      errorCount++;
      console.error(`❌ ${id} (${patient_id}): HTTP ${response.status}`);
    }
  } catch (e) {
    errorCount++;
    console.error(`❌ ${id} (${patient_id}): ${e.message}`);
  }
}

console.log(`\n完了: 成功 ${successCount}件 / エラー ${errorCount}件`);
