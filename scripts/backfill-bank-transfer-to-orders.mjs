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

// 商品情報マッピング
const productInfo = {
  "tirzepatide-2.5mg-1": { name: "マンジャロ 2.5mg 1ヶ月", price: 13000 },
  "tirzepatide-2.5mg-2": { name: "マンジャロ 2.5mg 2ヶ月", price: 25500 },
  "tirzepatide-2.5mg-3": { name: "マンジャロ 2.5mg 3ヶ月", price: 35000 },
  "tirzepatide-5mg-1": { name: "マンジャロ 5mg 1ヶ月", price: 22850 },
  "tirzepatide-5mg-2": { name: "マンジャロ 5mg 2ヶ月", price: 45500 },
  "tirzepatide-5mg-3": { name: "マンジャロ 5mg 3ヶ月", price: 63000 },
  "tirzepatide-7.5mg-1": { name: "マンジャロ 7.5mg 1ヶ月", price: 34000 },
  "tirzepatide-7.5mg-2": { name: "マンジャロ 7.5mg 2ヶ月", price: 65000 },
  "tirzepatide-7.5mg-3": { name: "マンジャロ 7.5mg 3ヶ月", price: 96000 },
};

console.log('=== 既存銀行振込データをordersテーブルにバックフィル ===\n');

// bank_transfer_ordersテーブルから全データ取得
const { data: bankTransferData, error: fetchError } = await supabase
  .from('bank_transfer_orders')
  .select('*')
  .order('created_at', { ascending: true });

if (fetchError) {
  console.error('❌ bank_transfer_orders取得エラー:', fetchError.message);
  process.exit(1);
}

console.log(`bank_transfer_orders: ${bankTransferData.length}件\n`);

if (bankTransferData.length === 0) {
  console.log('バックフィルするデータがありません。');
  process.exit(0);
}

// 既にordersテーブルにあるbt_*のIDを取得
const { data: existingOrders } = await supabase
  .from('orders')
  .select('id')
  .like('id', 'bt_%');

const existingIds = new Set((existingOrders || []).map(o => o.id));
console.log(`既存のbt_*レコード: ${existingIds.size}件\n`);

// バックフィル対象をフィルタ
const toBackfill = bankTransferData.filter(bt => {
  const paymentId = `bt_${bt.id}`;
  return !existingIds.has(paymentId);
});

console.log(`バックフィル対象: ${toBackfill.length}件\n`);

if (toBackfill.length === 0) {
  console.log('✅ 全てのデータは既にordersテーブルに存在します。');
  process.exit(0);
}

let successCount = 0;
let errorCount = 0;

for (const bt of toBackfill) {
  const paymentId = `bt_${bt.id}`;
  const product = productInfo[bt.product_code] || { name: "マンジャロ", price: 0 };

  const orderData = {
    id: paymentId,
    patient_id: bt.patient_id,
    product_code: bt.product_code,
    product_name: product.name,
    amount: product.price,
    paid_at: bt.confirmed_at || bt.submitted_at || bt.created_at,
    payment_method: "bank_transfer",
    shipping_status: "pending",
    payment_status: "COMPLETED",
    refund_status: null,
    refunded_at: null,
    refunded_amount: null,
    shipping_date: null,
    tracking_number: null,
    carrier: null,
  };

  const { error: insertError } = await supabase
    .from('orders')
    .insert(orderData);

  if (insertError) {
    console.error(`❌ ${paymentId}: ${insertError.message}`);
    errorCount++;
  } else {
    console.log(`✅ ${paymentId}: ${bt.patient_id}`);
    successCount++;
  }
}

console.log('\n=== バックフィル完了 ===');
console.log(`成功: ${successCount}件`);
console.log(`失敗: ${errorCount}件`);

if (errorCount > 0) {
  console.log('\n⚠️ 一部のデータでエラーが発生しました。');
}
