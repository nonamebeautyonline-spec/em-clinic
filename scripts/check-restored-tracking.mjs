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
  // 全追跡番号ありを確認
  let allWithTracking = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from("orders")
      .select("id, payment_method, tracking_number, shipping_date")
      .not("tracking_number", "is", null)
      .neq("tracking_number", "")
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allWithTracking = allWithTracking.concat(data);
    offset += 1000;
  }

  console.log("=== 復旧後の追跡番号確認 ===");
  console.log("追跡番号ありの総数:", allWithTracking.length);

  const byMethod = {};
  allWithTracking.forEach(o => {
    const m = o.payment_method || "unknown";
    byMethod[m] = (byMethod[m] || 0) + 1;
  });
  console.log("payment_method別:", JSON.stringify(byMethod, null, 2));

  // クレカのサンプル
  const creditCard = allWithTracking.filter(o => o.payment_method === "credit_card");
  console.log("\nクレカで追跡番号あり:", creditCard.length, "件");

  if (creditCard.length > 0) {
    console.log("サンプル:");
    creditCard.sort((a, b) => (b.shipping_date || "").localeCompare(a.shipping_date || ""));
    creditCard.slice(0, 10).forEach((o, i) => {
      console.log("  " + (i+1) + ". " + o.tracking_number + " | " + (o.shipping_date || "-"));
    });
  }

  // 先ほどの患者IDを確認
  const { data: testOrders } = await supabase
    .from("orders")
    .select("id, patient_id, tracking_number, shipping_date, shipping_status")
    .in("patient_id", ["20260101610", "20260200074"]);

  console.log("\n=== テスト患者の確認 ===");
  testOrders?.forEach(o => {
    console.log("patient:", o.patient_id, "| tracking:", o.tracking_number || "-", "| shipping_date:", o.shipping_date || "-");
  });
}

main().catch(console.error);
