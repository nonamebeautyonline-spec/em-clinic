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

console.log('=== 注文ID: 42 の詳細 ===\n');

const { data, error } = await supabase
  .from('bank_transfer_orders')
  .select('*')
  .eq('id', 42)
  .order('created_at', { ascending: true });

if (error) {
  console.error('❌ エラー:', error.message);
  process.exit(1);
}

if (!data || data.length === 0) {
  console.log('データなし');
  process.exit(0);
}

console.log(`見つかったレコード: ${data.length}件\n`);

data.forEach((row, idx) => {
  console.log(`--- レコード ${idx + 1} ---`);
  console.log(`ID: ${row.id}`);
  console.log(`患者ID: ${row.patient_id}`);
  console.log(`氏名: ${row.account_name}`);
  console.log(`商品コード: ${row.product_code}`);
  console.log(`住所: ${row.address}`);
  console.log(`作成日時: ${row.created_at}`);
  console.log(`提出日時: ${row.submitted_at}`);
  console.log(`ステータス: ${row.status}`);
  console.log('');
});
