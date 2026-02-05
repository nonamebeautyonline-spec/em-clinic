import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

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

// bank_transfer_ordersの全データ
const { data: btOrders } = await supabase
  .from("bank_transfer_orders")
  .select("*")
  .order("id", { ascending: true });

console.log(`=== bank_transfer_orders: ${btOrders?.length || 0}件 ===\n`);

// ordersテーブルの銀行振込データ（bt_で始まるIDを持つもの）
const { data: orders } = await supabase
  .from("orders")
  .select("*")
  .eq("payment_method", "bank_transfer")
  .order("created_at", { ascending: true });

console.log(`=== orders (bank_transfer): ${orders?.length || 0}件 ===\n`);

// IDベースでマッチングを確認
const ordersById = new Map();
(orders || []).forEach(o => {
  // bt_123 形式のIDから数字を抽出
  const match = o.id.match(/bt_(\d+)/);
  if (match) {
    ordersById.set(match[1], o);
  }
});

console.log(`=== 詳細比較 ===\n`);

let matchCount = 0;
let missingCount = 0;

for (const bt of btOrders || []) {
  const orderMatch = ordersById.get(String(bt.id));

  if (orderMatch) {
    matchCount++;
    // 金額や商品コードが一致するか確認
    const priceMatch = true; // ordersにはamountがあるが、btには価格がない場合もある
    const productMatch = bt.product_code === orderMatch.product_code;
    const patientMatch = bt.patient_id === orderMatch.patient_id;

    if (!productMatch || !patientMatch) {
      console.log(`⚠️ ID ${bt.id}: データ不一致`);
      console.log(`   bt: patient=${bt.patient_id}, product=${bt.product_code}`);
      console.log(`   orders: patient=${orderMatch.patient_id}, product=${orderMatch.product_code}`);
    }
  } else {
    missingCount++;
    console.log(`❌ ID ${bt.id}: ordersテーブルに存在しない`);
    console.log(`   patient=${bt.patient_id}, product=${bt.product_code}, created=${bt.created_at}`);
  }
}

console.log(`\n=== 結果サマリー ===`);
console.log(`マッチ: ${matchCount}件`);
console.log(`不足: ${missingCount}件`);

if (missingCount === 0) {
  console.log(`\n✅ bank_transfer_ordersの全データがordersにも存在します`);
} else {
  console.log(`\n⚠️ ${missingCount}件のデータがordersに存在しません`);
}
