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
  envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log('=== bank_transfer_ordersテーブルに shipping_name カラムを追加 ===\n');

// shipping_nameカラムが既に存在するか確認
const { data: columns, error: checkError } = await supabase
  .from('bank_transfer_orders')
  .select('shipping_name')
  .limit(1);

if (!checkError || (checkError && checkError.message && checkError.message.includes('shipping_name'))) {
  console.log('shipping_nameカラムは既に存在しています（またはテーブルが空です）');
  console.log('エラー:', checkError?.message || 'なし');
} else {
  console.log(' shipping_nameカラムを追加します...');
  console.log('⚠️  このスクリプトではALTER TABLEを実行できません。');
  console.log('以下のSQLをSupabase SQL Editorで実行してください：\n');
  console.log('ALTER TABLE bank_transfer_orders ADD COLUMN shipping_name TEXT;');
  console.log("COMMENT ON COLUMN bank_transfer_orders.shipping_name IS '配送先氏名（漢字）';");
}
