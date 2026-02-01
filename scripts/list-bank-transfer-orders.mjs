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

console.log('=== 銀行振込 住所入力一覧 ===\n');

// bank_transfer_ordersテーブルから全データを取得
const { data, error } = await supabase
  .from('bank_transfer_orders')
  .select('*')
  .order('created_at', { ascending: false });

if (error) {
  console.error('❌ エラー:', error.message);
  process.exit(1);
}

if (!data || data.length === 0) {
  console.log('データがありません');
  process.exit(0);
}

console.log(`全 ${data.length} 件\n`);

// テーブル形式で表示
data.forEach((order, index) => {
  console.log(`--- [${index + 1}] ID: ${order.id} ---`);
  console.log(`患者ID: ${order.patient_id}`);
  console.log(`商品コード: ${order.product_code}`);
  console.log(`氏名: ${order.account_name}`);
  console.log(`電話番号: ${order.phone_number}`);
  console.log(`メール: ${order.email}`);
  console.log(`郵便番号: ${order.postal_code}`);
  console.log(`住所: ${order.address}`);
  console.log(`ステータス: ${order.status}`);
  console.log(`モード: ${order.mode || '(なし)'}`);
  console.log(`再処方ID: ${order.reorder_id || '(なし)'}`);
  console.log(`作成日時: ${order.created_at}`);
  console.log(`提出日時: ${order.submitted_at || '(なし)'}`);
  console.log(`確認日時: ${order.confirmed_at || '(なし)'}`);
  console.log('');
});

// サマリー
const byStatus = {};
data.forEach((order) => {
  const status = order.status || 'unknown';
  byStatus[status] = (byStatus[status] || 0) + 1;
});

console.log('=== ステータス別集計 ===');
Object.entries(byStatus).forEach(([status, count]) => {
  console.log(`${status}: ${count}件`);
});
