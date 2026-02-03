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

const paymentId = "1wf4t5lV6uSPYvXbgmHtNB79ArBZY";

console.log("=== 注文の返金関連フィールド確認 ===");
console.log(`Payment ID: ${paymentId}\n`);

const { data: order, error } = await supabase
  .from("orders")
  .select("*")
  .eq("id", paymentId)
  .single();

if (error) {
  console.error("エラー:", error);
  process.exit(1);
}

console.log("返金関連フィールド:");
console.log(`  status: ${order.status}`);
console.log(`  refund_status: ${order.refund_status || "(null)"}`);
console.log(`  refunded_at: ${order.refunded_at || "(null)"}`);
console.log(`  refunded_amount: ${order.refunded_amount || "(null)"}`);
console.log();

// ordersテーブルのすべてのカラムを確認
console.log("全フィールド一覧:");
Object.keys(order).forEach(key => {
  if (key.toLowerCase().includes("refund")) {
    console.log(`  ${key}: ${order[key] || "(null)"}`);
  }
});
