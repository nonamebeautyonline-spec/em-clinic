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

async function main() {
  console.log("=== payment_method の分布 ===\n");

  // 全注文を取得
  const { data: allOrders } = await supabase
    .from("orders")
    .select("id, payment_method, tracking_number");

  if (!allOrders) {
    console.log("データ取得失敗");
    return;
  }

  // payment_methodの分布
  const methodCounts = {};
  allOrders.forEach(o => {
    const method = o.payment_method || "(NULL)";
    methodCounts[method] = (methodCounts[method] || 0) + 1;
  });

  console.log("payment_method分布:");
  Object.entries(methodCounts).sort((a, b) => b[1] - a[1]).forEach(([method, count]) => {
    console.log(`  ${method}: ${count}件`);
  });

  // 追跡番号の有無とpayment_methodの関係
  console.log("\n=== 追跡番号とpayment_methodの関係 ===");
  const withTracking = allOrders.filter(o => o.tracking_number && o.tracking_number.trim() !== "");
  const withoutTracking = allOrders.filter(o => !o.tracking_number || o.tracking_number.trim() === "");

  console.log(`\n追跡番号あり (${withTracking.length}件):`);
  const trackingMethodCounts = {};
  withTracking.forEach(o => {
    const method = o.payment_method || "(NULL)";
    trackingMethodCounts[method] = (trackingMethodCounts[method] || 0) + 1;
  });
  Object.entries(trackingMethodCounts).sort((a, b) => b[1] - a[1]).forEach(([method, count]) => {
    console.log(`  ${method}: ${count}件`);
  });

  console.log(`\n追跡番号なし (${withoutTracking.length}件):`);
  const noTrackingMethodCounts = {};
  withoutTracking.forEach(o => {
    const method = o.payment_method || "(NULL)";
    noTrackingMethodCounts[method] = (noTrackingMethodCounts[method] || 0) + 1;
  });
  Object.entries(noTrackingMethodCounts).sort((a, b) => b[1] - a[1]).forEach(([method, count]) => {
    console.log(`  ${method}: ${count}件`);
  });

  // eq("payment_method", "credit_card")で取得できる件数
  console.log("\n=== APIフィルタの影響 ===");
  const creditCardOnly = allOrders.filter(o => o.payment_method === "credit_card");
  const creditCardOrNull = allOrders.filter(o => o.payment_method !== "bank_transfer");

  console.log(`eq("payment_method", "credit_card"): ${creditCardOnly.length}件`);
  console.log(`neq("payment_method", "bank_transfer") (NULLも含む): ${creditCardOrNull.length}件`);
  console.log(`\n→ NULLのレコードが除外されている: ${creditCardOrNull.length - creditCardOnly.length}件`);
}

main().catch(console.error);
