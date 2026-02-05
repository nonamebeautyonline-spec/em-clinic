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
  console.log("=== 全ordersのpayment_method分布 (ページネーション使用) ===\n");

  // ページネーションで全件取得
  let allOrders = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("orders")
      .select("id, payment_method, tracking_number, paid_at")
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.log("エラー:", error);
      return;
    }

    if (!data || data.length === 0) break;
    allOrders = allOrders.concat(data);
    console.log(`  取得: ${offset}-${offset + data.length - 1} (${data.length}件)`);
    offset += pageSize;
  }

  console.log(`\n合計: ${allOrders.length}件\n`);

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

  // 追跡番号の分布
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

  // NULLで追跡番号ありのサンプル
  const nullWithTracking = withTracking.filter(o => !o.payment_method);
  if (nullWithTracking.length > 0) {
    console.log("\n=== payment_method=NULLで追跡番号ありのサンプル ===");
    nullWithTracking.slice(0, 5).forEach(o => {
      console.log(`  ${o.id} | 追跡:${o.tracking_number} | paid_at:${o.paid_at?.slice(0,10) || '(null)'}`);
    });
  }

  // credit_cardで追跡番号なしのサンプル
  const creditNoTracking = withoutTracking.filter(o => o.payment_method === "credit_card");
  if (creditNoTracking.length > 0) {
    console.log("\n=== credit_cardで追跡番号なしの直近5件 ===");
    creditNoTracking.sort((a, b) => new Date(b.paid_at || 0) - new Date(a.paid_at || 0));
    creditNoTracking.slice(0, 5).forEach(o => {
      console.log(`  ${o.id} | paid_at:${o.paid_at?.slice(0,10) || '(null)'}`);
    });
  }
}

main().catch(console.error);
