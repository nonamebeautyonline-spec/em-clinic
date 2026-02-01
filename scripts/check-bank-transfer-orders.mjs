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
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log("=== 銀行振込注文データ確認 ===\n");

const { data: orders, error } = await supabase
  .from("bank_transfer_orders")
  .select("*")
  .order("created_at", { ascending: false });

if (error) {
  console.log("❌ エラー:", error);
} else {
  console.log(`✅ 合計 ${orders.length} 件の銀行振込注文があります\n`);

  // テストデータとリアルデータを分ける
  const testOrders = orders.filter(o => o.patient_id.startsWith("TEST_"));
  const realOrders = orders.filter(o => !o.patient_id.startsWith("TEST_"));

  console.log(`テストデータ: ${testOrders.length} 件`);
  console.log(`実データ: ${realOrders.length} 件\n`);

  if (realOrders.length > 0) {
    console.log("【実データ一覧】");
    console.log("=".repeat(80));
    realOrders.forEach((order, i) => {
      console.log(`\n${i + 1}. ID: ${order.id}`);
      console.log(`   patient_id: ${order.patient_id}`);
      console.log(`   product_code: ${order.product_code}`);
      console.log(`   mode: ${order.mode || "(未設定)"}`);
      console.log(`   reorder_id: ${order.reorder_id || "(なし)"}`);
      console.log(`   account_name: ${order.account_name}`);
      console.log(`   phone_number: ${order.phone_number}`);
      console.log(`   email: ${order.email}`);
      console.log(`   address: ${order.address}`);
      console.log(`   status: ${order.status}`);
      console.log(`   created_at: ${order.created_at}`);
      console.log(`   submitted_at: ${order.submitted_at}`);
    });
  }
}

console.log("\n=== 確認完了 ===");
