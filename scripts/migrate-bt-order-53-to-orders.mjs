import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};

envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    let value = valueParts.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

console.log('=== bank_transfer_orders ID=53 を orders に移行 ===\n');

// bank_transfer_ordersからデータ取得
const { data: btOrder, error: btError } = await supabase
  .from('bank_transfer_orders')
  .select('*')
  .eq('id', 53)
  .single();

if (btError) {
  console.error('bank_transfer_orders 取得エラー:', btError);
  process.exit(1);
}

if (!btOrder) {
  console.log('ID=53 のデータが見つかりません');
  process.exit(1);
}

console.log('bank_transfer_orders ID=53 のデータ:');
console.log(`  患者ID: ${btOrder.patient_id}`);
console.log(`  商品コード: ${btOrder.product_code}`);
console.log(`  ステータス: ${btOrder.status}`);
console.log(`  作成日: ${btOrder.created_at}`);
console.log('');

// 商品情報マッピング
const PRODUCTS = {
  "MJL_2.5mg_1m": { name: "マンジャロ 2.5mg 1ヶ月", price: 13000 },
  "MJL_2.5mg_2m": { name: "マンジャロ 2.5mg 2ヶ月", price: 26000 },
  "MJL_2.5mg_3m": { name: "マンジャロ 2.5mg 3ヶ月", price: 35000 },
  "MJL_5mg_1m": { name: "マンジャロ 5mg 1ヶ月", price: 22850 },
  "MJL_5mg_2m": { name: "マンジャロ 5mg 2ヶ月", price: 45500 },
  "MJL_5mg_3m": { name: "マンジャロ 5mg 3ヶ月", price: 63000 },
  "MJL_7.5mg_1m": { name: "マンジャロ 7.5mg 1ヶ月", price: 34000 },
  "MJL_7.5mg_2m": { name: "マンジャロ 7.5mg 2ヶ月", price: 65000 },
  "MJL_7.5mg_3m": { name: "マンジャロ 7.5mg 3ヶ月", price: 96000 },
};

const productInfo = PRODUCTS[btOrder.product_code] || { name: btOrder.product_code, price: 0 };

// 次のbt_XXX IDを取得
const { data: existingBtOrders } = await supabase
  .from('orders')
  .select('id')
  .like('id', 'bt_%');

let maxNum = 0;
if (existingBtOrders && existingBtOrders.length > 0) {
  for (const order of existingBtOrders) {
    const match = order.id.match(/^bt_(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
}

// bt_53 は既に使われているので、bt_54 があるか確認
const nextId = btOrder.status === 'confirmed' ? `bt_${maxNum + 1}` : `bt_pending_${Date.now()}`;

console.log(`新しいID: ${nextId}`);
console.log('');

// ordersテーブルに挿入
const now = new Date().toISOString();
const orderData = {
  id: nextId,
  patient_id: btOrder.patient_id,
  product_code: btOrder.product_code,
  product_name: productInfo.name,
  amount: productInfo.price,
  payment_method: 'bank_transfer',
  status: btOrder.status, // confirmed or pending_confirmation
  paid_at: btOrder.status === 'confirmed' ? btOrder.created_at : null,
  payment_status: btOrder.status === 'confirmed' ? 'COMPLETED' : 'PENDING',
  shipping_status: 'pending',
  shipping_name: btOrder.shipping_name || null,
  postal_code: btOrder.postal_code || null,
  address: btOrder.address || null,
  phone: btOrder.phone_number || null,
  email: btOrder.email || null,
  account_name: btOrder.account_name || null,
  created_at: btOrder.created_at,
  updated_at: now,
};

console.log('orders テーブルに挿入するデータ:');
console.log(orderData);
console.log('');

const { data: insertedOrder, error: insertError } = await supabase
  .from('orders')
  .insert(orderData)
  .select();

if (insertError) {
  console.error('❌ 挿入エラー:', insertError);
  process.exit(1);
}

console.log('✅ orders テーブルに移行完了');
console.log(`  新しいID: ${nextId}`);
console.log('');

// キャッシュ無効化
console.log('キャッシュを無効化中...');
try {
  const response = await fetch(`${envVars.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/invalidate-cache`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${envVars.ADMIN_TOKEN}`,
    },
    body: JSON.stringify({ patient_id: btOrder.patient_id }),
  });

  if (response.ok) {
    console.log('✅ キャッシュ無効化完了');
  } else {
    console.log('⚠️ キャッシュ無効化失敗:', await response.text());
  }
} catch (e) {
  console.error('⚠️ キャッシュ無効化エラー:', e.message);
}

console.log('\n=== 完了 ===');
