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

console.log('=== ordersテーブルの全件数確認 ===\n');

// 全レコード数
const { count: totalCount, error: totalError } = await supabase
  .from('orders')
  .select('*', { count: 'exact', head: true });

console.log(`全レコード数: ${totalCount}件`);

// phone != null のレコード数
const { count: phoneCount, error: phoneError } = await supabase
  .from('orders')
  .select('*', { count: 'exact', head: true })
  .not('phone', 'is', null);

console.log(`phone != null: ${phoneCount}件`);

// phone = null のレコード数
const { count: noPhoneCount, error: noPhoneError } = await supabase
  .from('orders')
  .select('*', { count: 'exact', head: true })
  .is('phone', null);

console.log(`phone = null: ${noPhoneCount}件\n`);

// 実際のデータを全件取得してカウント
console.log('実際のデータを全件取得中...\n');

let allOrders = [];
let hasMore = true;
let offset = 0;
const limit = 1000;

while (hasMore) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, phone')
    .not('phone', 'is', null)
    .range(offset, offset + limit - 1);
  
  if (error) {
    console.error('Error:', error);
    break;
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

// パターン別に集計
const patterns = {
  '00で始まる': 0,
  '0で始まる（正常）': 0,
  '9/8/7で始まる': 0,
  'その他': 0
};

for (const order of allOrders) {
  const phone = order.phone || '';
  if (phone.startsWith('00')) {
    patterns['00で始まる']++;
  } else if (phone.startsWith('0')) {
    patterns['0で始まる（正常）']++;
  } else if (phone.match(/^[789]/)) {
    patterns['9/8/7で始まる']++;
  } else {
    patterns['その他']++;
  }
}

console.log('=== パターン別集計（全件） ===\n');
for (const [pattern, count] of Object.entries(patterns)) {
  console.log(`${pattern}: ${count}件`);
}

const needsFix = patterns['00で始まる'] + patterns['9/8/7で始まる'];
console.log(`\n修正が必要: ${needsFix}件`);
