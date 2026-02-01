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

console.log('=== bank_transfer_orders ID=9 を削除 ===\n');

// 削除前に確認
const { data: before, error: beforeError } = await supabase
  .from('bank_transfer_orders')
  .select('*')
  .eq('id', 9)
  .single();

if (beforeError) {
  console.error('❌ エラー:', beforeError.message);
  process.exit(1);
}

console.log('削除対象:');
console.log(`  ID: ${before.id}`);
console.log(`  患者ID: ${before.patient_id}`);
console.log(`  商品コード: ${before.product_code}`);
console.log(`  口座名義: ${before.account_name}`);
console.log(`  作成日時: ${before.created_at}`);
console.log();

// 削除実行
const { error: deleteError } = await supabase
  .from('bank_transfer_orders')
  .delete()
  .eq('id', 9);

if (deleteError) {
  console.error('❌ 削除エラー:', deleteError.message);
  process.exit(1);
}

console.log('✅ 削除完了');

// 確認
const { data: after } = await supabase
  .from('bank_transfer_orders')
  .select('*')
  .eq('id', 9);

console.log(`\n確認: bank_transfer_orders ID=9 件数: ${after?.length || 0}件`);
