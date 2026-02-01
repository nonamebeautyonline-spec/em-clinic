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
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

function normalizePhone(phone) {
  if (!phone) return phone;
  let digits = phone.trim();
  
  // 00プレフィックスを削除
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  
  // 81（国際番号）を削除して0を追加
  if (digits.startsWith('81')) {
    digits = '0' + digits.slice(2);
  }
  
  // 先頭に0がなく、9/8/7で始まる場合は0を追加
  if (!digits.startsWith('0') && digits.match(/^[789]/)) {
    digits = '0' + digits;
  }
  
  return digits;
}

console.log('=== 電話番号の修正（ページネーション対応） ===\n');

// 全レコードをページネーションで取得
let allOrders = [];
let hasMore = true;
let offset = 0;
const limit = 1000;

console.log('全レコードを取得中...\n');

while (hasMore) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, patient_id, phone, payment_method')
    .not('phone', 'is', null)
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  if (data && data.length > 0) {
    allOrders = allOrders.concat(data);
    console.log(`取得済み: ${allOrders.length}件`);
    offset += limit;
    hasMore = data.length === limit;
  } else {
    hasMore = false;
  }
}

console.log(`\n全件取得完了: ${allOrders.length}件\n`);

// ordersという変数名を維持するため
const orders = allOrders;

const toFix = orders.filter(o => {
  const phone = o.phone || '';
  return phone.startsWith('00') || phone.match(/^[789]/);
});

console.log(`修正対象: ${toFix.length}件\n`);

if (toFix.length === 0) {
  console.log('修正が必要なレコードはありません');
  process.exit(0);
}

let successCount = 0;
let errorCount = 0;
let skippedCount = 0;

for (const order of toFix) {
  const originalPhone = order.phone;
  const normalizedPhone = normalizePhone(originalPhone);

  if (originalPhone === normalizedPhone) {
    skippedCount++;
    continue;
  }

  console.log(`ID: ${order.id}`);
  console.log(`  患者ID: ${order.patient_id}`);
  console.log(`  決済方法: ${order.payment_method}`);
  console.log(`  ${originalPhone} (${originalPhone.length}桁) -> ${normalizedPhone} (${normalizedPhone.length}桁)`);

  const { error: updateError } = await supabase
    .from('orders')
    .update({ phone: normalizedPhone })
    .eq('id', order.id);

  if (updateError) {
    console.log(`  ❌ エラー: ${updateError.message}`);
    errorCount++;
  } else {
    console.log(`  ✅ 更新完了`);
    successCount++;
  }

  // 進捗表示
  const processed = successCount + errorCount + skippedCount;
  if (processed % 100 === 0) {
    console.log(`\n--- 進捗: ${processed}/${toFix.length}件処理済み ---\n`);
  }
}

console.log(`\n=== 修正完了 ===`);
console.log(`成功: ${successCount}件`);
console.log(`失敗: ${errorCount}件`);
console.log(`スキップ: ${skippedCount}件`);
