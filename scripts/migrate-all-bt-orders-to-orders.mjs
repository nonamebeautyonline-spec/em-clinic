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

console.log('=== bank_transfer_orders → orders 一括移行 ===\n');

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

// bank_transfer_ordersからまだ移行していないデータを取得
const { data: btOrders, error: btError } = await supabase
  .from('bank_transfer_orders')
  .select('*')
  .order('created_at', { ascending: true });

if (btError) {
  console.error('bank_transfer_orders 取得エラー:', btError);
  process.exit(1);
}

if (!btOrders || btOrders.length === 0) {
  console.log('移行対象のデータがありません');
  process.exit(0);
}

console.log(`bank_transfer_orders に ${btOrders.length}件のデータがあります\n`);

// 既存のordersデータを取得（重複チェック用）
const patientIds = btOrders.map(bt => bt.patient_id);
const { data: existingOrders } = await supabase
  .from('orders')
  .select('patient_id, created_at')
  .eq('payment_method', 'bank_transfer')
  .in('patient_id', patientIds);

// 重複チェック用Set（patient_id + created_at の組み合わせ）
const existingSet = new Set();
if (existingOrders && existingOrders.length > 0) {
  for (const order of existingOrders) {
    const key = `${order.patient_id}_${new Date(order.created_at).getTime()}`;
    existingSet.add(key);
  }
}

console.log(`既に ${existingSet.size}件が orders テーブルに存在します\n`);

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

console.log(`最新のbt_ID: bt_${maxNum}\n`);
console.log('=== 移行開始 ===\n');

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

for (const btOrder of btOrders) {
  // 重複チェック
  const key = `${btOrder.patient_id}_${new Date(btOrder.created_at).getTime()}`;
  if (existingSet.has(key)) {
    console.log(`⏭️  スキップ: ${btOrder.patient_id} (既に存在)`);
    skipCount++;
    continue;
  }

  const productInfo = PRODUCTS[btOrder.product_code] || { name: btOrder.product_code, price: 0 };

  // 新しいIDを採番
  maxNum++;
  const newId = btOrder.status === 'confirmed' ? `bt_${maxNum}` : `bt_pending_${Date.now()}_${maxNum}`;

  const now = new Date().toISOString();
  const orderData = {
    id: newId,
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

  const { error: insertError } = await supabase
    .from('orders')
    .insert(orderData);

  if (insertError) {
    console.error(`❌ 失敗: ${btOrder.patient_id} (bt_orders ID=${btOrder.id})`);
    console.error(`   エラー: ${insertError.message}`);
    errorCount++;
  } else {
    console.log(`✅ 成功: ${newId} (患者=${btOrder.patient_id}, bt_orders ID=${btOrder.id})`);
    successCount++;
    existingSet.add(key); // 次回の重複チェックに追加
  }
}

console.log('\n=== 完了 ===');
console.log(`成功: ${successCount}件`);
console.log(`スキップ: ${skipCount}件`);
console.log(`失敗: ${errorCount}件`);

if (successCount > 0) {
  console.log('\n全患者のキャッシュを無効化しています...');
  const uniquePatientIds = [...new Set(btOrders.map(bt => bt.patient_id))];

  for (const patientId of uniquePatientIds) {
    try {
      const response = await fetch(`${envVars.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/invalidate-cache`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${envVars.ADMIN_TOKEN}`,
        },
        body: JSON.stringify({ patient_id: patientId }),
      });

      if (response.ok) {
        console.log(`  ✅ ${patientId}`);
      }
    } catch (e) {
      // エラーでも続行
    }
  }

  console.log('\nキャッシュ無効化完了');
}
