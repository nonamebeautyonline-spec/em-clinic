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

console.log('=== 00プレフィックスの電話番号を検索 ===\n');

// 全レコードをページネーションで取得
let allOrders = [];
let hasMore = true;
let offset = 0;
const limit = 1000;

console.log('全レコードを取得中...\n');

while (hasMore) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, patient_id, phone, payment_method, created_at')
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

// 00で始まるレコードを抽出
const with00Prefix = allOrders.filter(o => {
  const phone = o.phone || '';
  return phone.startsWith('00');
});

console.log(`00プレフィックス: ${with00Prefix.length}件\n`);

if (with00Prefix.length > 0) {
  console.log('詳細:\n');
  for (const order of with00Prefix) {
    console.log(`ID: ${order.id}`);
    console.log(`  患者ID: ${order.patient_id}`);
    console.log(`  決済方法: ${order.payment_method}`);
    console.log(`  作成日: ${order.created_at}`);
    console.log(`  電話番号: ${order.phone} (${order.phone.length}桁)`);
    console.log(`  修正後: ${order.phone.slice(2)} (${order.phone.slice(2).length}桁)\n`);
  }
}
