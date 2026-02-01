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

console.log('=== DBとGASシートの同期状況確認 ===\n');

// 1/31以降のbank_transfer_ordersを取得
const { data, error } = await supabase
  .from('bank_transfer_orders')
  .select('*')
  .gte('created_at', '2026-01-31T00:00:00Z')
  .order('created_at', { ascending: true });

if (error) {
  console.error('❌ エラー:', error.message);
  process.exit(1);
}

if (!data || data.length === 0) {
  console.log('1/31以降のデータなし');
  process.exit(0);
}

console.log(`1/31以降の銀行振込データ: ${data.length}件\n`);

// テスト系を除外
const realData = data.filter(d => !d.patient_id.startsWith('TEST_'));

console.log(`実データ（TEST除く）: ${realData.length}件\n`);

realData.forEach((order, index) => {
  const createdAt = new Date(order.created_at);
  const jstDate = new Date(createdAt.getTime() + 9 * 60 * 60 * 1000);
  const dateStr = jstDate.toISOString().replace('T', ' ').substring(0, 19);

  console.log(`--- [${index + 1}] ID: ${order.id} ---`);
  console.log(`患者ID: ${order.patient_id}`);
  console.log(`口座名義: ${order.account_name}`);
  console.log(`商品: ${order.product_code}`);
  console.log(`作成日時 (JST): ${dateStr}`);
  console.log(`GASシート確認: 銀行振込管理シート「2026-01 住所情報」または「2026-02 住所情報」に`);
  console.log(`               患者ID「${order.patient_id}」のデータがあるか確認してください`);
  console.log('');
});

console.log('=== GASシート確認手順 ===');
console.log('1. https://docs.google.com/spreadsheets/d/1WL8zQ1PQDzLyLvl_w5StVvZU4T8nfbPGI5rxQvW5Vq0/edit を開く');
console.log('2. 「2026-01 住所情報」タブを開く');
console.log('3. C列（患者ID）で上記の患者IDを検索');
console.log('4. 「2026-02 住所情報」タブも同様に確認');
console.log('');
console.log('見つからない場合 → GASにリクエストが届いていない（タイムアウトまたはエラー）');
console.log('見つかる場合 → GASは正常動作（別の問題）');
