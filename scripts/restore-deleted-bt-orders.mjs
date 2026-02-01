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

// 削除したbt_*レコードのIDリスト
const deletedBtIds = [
  'bt_5', 'bt_4', 'bt_41', 'bt_35', 'bt_6', 'bt_7', 'bt_11', 'bt_12',
  'bt_13', 'bt_15', 'bt_16', 'bt_17', 'bt_19', 'bt_20', 'bt_22', 'bt_23',
  'bt_31', 'bt_14', 'bt_42', 'bt_40', 'bt_38', 'bt_36', 'bt_24', 'bt_26',
  'bt_43', 'bt_45', 'bt_30', 'bt_25', 'bt_27', 'bt_44', 'bt_46', 'bt_37',
  'bt_33', 'bt_32', 'bt_34', 'bt_21', 'bt_28', 'bt_10', 'bt_9', 'bt_8',
  'bt_39', 'bt_29', 'bt_18'
];

console.log(`=== ${deletedBtIds.length}件のbt_*レコードを復元 ===\n`);

// bank_transfer_ordersから対応するデータを取得
const btIdsNumbers = deletedBtIds.map(id => id.replace('bt_', ''));

const { data: bankTransferData, error: fetchError } = await supabase
  .from('bank_transfer_orders')
  .select('*')
  .in('id', btIdsNumbers);

if (fetchError) {
  console.error('❌ エラー:', fetchError.message);
  process.exit(1);
}

console.log(`bank_transfer_ordersから${bankTransferData.length}件取得\n`);

// 商品マスターデータ
const PRODUCTS = {
  "MJL_2.5mg_1m": { name: "マンジャロ 2.5mg 1ヶ月", price: 13000 },
  "MJL_2.5mg_2m": { name: "マンジャロ 2.5mg 2ヶ月", price: 25500 },
  "MJL_2.5mg_3m": { name: "マンジャロ 2.5mg 3ヶ月", price: 35000 },
  "MJL_5mg_1m": { name: "マンジャロ 5mg 1ヶ月", price: 22850 },
  "MJL_5mg_2m": { name: "マンジャロ 5mg 2ヶ月", price: 45500 },
  "MJL_5mg_3m": { name: "マンジャロ 5mg 3ヶ月", price: 63000 },
  "MJL_7.5mg_1m": { name: "マンジャロ 7.5mg 1ヶ月", price: 34000 },
  "MJL_7.5mg_2m": { name: "マンジャロ 7.5mg 2ヶ月", price: 65000 },
  "MJL_7.5mg_3m": { name: "マンジャロ 7.5mg 3ヶ月", price: 96000 },
};

let successCount = 0;
let errorCount = 0;

for (const bt of bankTransferData) {
  const paymentId = `bt_${bt.id}`;
  const productInfo = PRODUCTS[bt.product_code] || { name: "マンジャロ", price: 0 };
  
  const orderData = {
    id: paymentId,
    patient_id: bt.patient_id,
    product_code: bt.product_code,
    product_name: productInfo.name,
    amount: productInfo.price,
    paid_at: bt.confirmed_at || bt.created_at,
    payment_method: "bank_transfer",
    shipping_status: "pending",
    payment_status: "COMPLETED",
  };

  const { error } = await supabase.from('orders').upsert(orderData, {
    onConflict: 'id'
  });

  if (error) {
    console.error(`❌ ${paymentId}: ${error.message}`);
    errorCount++;
  } else {
    console.log(`✅ ${paymentId}: 患者ID ${bt.patient_id}`);
    successCount++;
  }
}

console.log(`\n=== 復元完了 ===`);
console.log(`成功: ${successCount}件`);
console.log(`失敗: ${errorCount}件`);
