#!/usr/bin/env node
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
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log('=== shipping_name カラム確認 ===\n');

const { data, error } = await supabase
  .from('bank_transfer_orders')
  .select('id, patient_id, account_name, shipping_name')
  .order('created_at', { ascending: false })
  .limit(5);

if (error) {
  console.error('❌ エラー:', error.message);
  process.exit(1);
}

console.log(`📋 最新5件のデータ:\n`);
data.forEach((row, idx) => {
  console.log(`${idx + 1}. ID: ${row.id}`);
  console.log(`   患者ID: ${row.patient_id}`);
  console.log(`   口座名義: ${row.account_name}`);
  console.log(`   配送先氏名: ${row.shipping_name || '(未入力)'}`);
  console.log('');
});

const hasShippingName = data.filter(row => row.shipping_name).length;
console.log(`✅ shipping_nameカラムは存在します`);
console.log(`📊 shipping_nameが入力されている: ${hasShippingName}件 / ${data.length}件`);
