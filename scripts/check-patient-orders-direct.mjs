import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment variables
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

const patientId = "20260101640";

console.log("=== 患者注文データ直接確認 ===");
console.log(`患者ID: ${patientId}\n`);

// 1. ordersテーブルから直接クエリ
console.log("【1. Supabase Directクエリ】");
const { data: orders, error } = await supabase
  .from("orders")
  .select("*")
  .eq("patient_id", patientId)
  .order("paid_at", { ascending: false });

if (error) {
  console.error("❌ エラー:", error);
} else {
  console.log(`注文数: ${orders?.length || 0}件\n`);

  if (orders && orders.length > 0) {
    orders.forEach((order, idx) => {
      console.log(`[${idx + 1}] ${order.id}`);
      console.log(`    patient_id: ${order.patient_id}`);
      console.log(`    product_code: ${order.product_code}`);
      console.log(`    amount: ${order.amount}`);
      console.log(`    status: ${order.status}`);
      console.log(`    refund_status: ${order.refund_status || "(null)"}`);
      console.log(`    refunded_at: ${order.refunded_at || "(null)"}`);
      console.log(`    refunded_amount: ${order.refunded_amount || "(null)"}`);
      console.log(`    paid_at: ${order.paid_at}`);
      console.log();
    });
  } else {
    console.log("⚠️ 注文データなし");
  }
}

// 2. 環境変数確認
console.log("\n【2. 環境変数確認】");
console.log(`NEXT_PUBLIC_SUPABASE_URL: ${envVars.NEXT_PUBLIC_SUPABASE_URL ? "設定済み" : "未設定"}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${envVars.SUPABASE_SERVICE_ROLE_KEY ? envVars.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + "..." : "未設定"}`);
