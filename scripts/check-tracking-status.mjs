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
  console.log("=== 追跡番号の状況 ===\n");

  // 全注文数
  const { count: totalCount } = await supabase.from("orders").select("*", { count: "exact", head: true });
  console.log("全注文数:", totalCount);

  // 追跡番号がある注文数
  const { count: withTrackingCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .not("tracking_number", "is", null)
    .neq("tracking_number", "");
  console.log("追跡番号あり:", withTrackingCount);

  // クレカ vs 銀行振込で分類
  const { data: allOrders } = await supabase
    .from("orders")
    .select("id, tracking_number, payment_method");

  const creditCard = allOrders.filter(o => o.payment_method !== "bank_transfer");
  const bankTransfer = allOrders.filter(o => o.payment_method === "bank_transfer");

  const creditCardWithTracking = creditCard.filter(o => o.tracking_number && o.tracking_number.trim() !== "");
  const bankTransferWithTracking = bankTransfer.filter(o => o.tracking_number && o.tracking_number.trim() !== "");

  console.log("\n=== 支払方法別 ===");
  console.log(`クレカ: ${creditCard.length}件 (追跡あり: ${creditCardWithTracking.length}件)`);
  console.log(`銀行振込: ${bankTransfer.length}件 (追跡あり: ${bankTransferWithTracking.length}件)`);

  // 直近30件の注文の追跡番号状況
  console.log("\n=== 直近30件の注文 ===");
  const { data: recentOrders } = await supabase
    .from("orders")
    .select("id, patient_id, patient_name, paid_at, tracking_number, shipping_status, payment_method, shipping_date")
    .order("paid_at", { ascending: false })
    .limit(30);

  if (recentOrders) {
    recentOrders.forEach((o, i) => {
      const date = o.paid_at ? o.paid_at.slice(0, 10) : "(null)";
      const tracking = o.tracking_number || "(なし)";
      const method = o.payment_method === "bank_transfer" ? "銀振" : "クレカ";
      const status = o.shipping_status || "pending";
      console.log(`${i+1}. ${o.id} | ${date} | ${method} | ${status} | 追跡:${tracking}`);
    });
  }

  // shipping_statusがshippedで追跡番号がない注文
  console.log("\n=== shipped状態で追跡なし ===");
  const { data: shippedNoTracking } = await supabase
    .from("orders")
    .select("id, patient_id, patient_name, paid_at, shipping_status, shipping_date")
    .eq("shipping_status", "shipped")
    .or("tracking_number.is.null,tracking_number.eq.")
    .limit(10);

  if (shippedNoTracking && shippedNoTracking.length > 0) {
    shippedNoTracking.forEach((o) => {
      console.log(`- ${o.id} | ${o.patient_name || "(名前なし)"} | shipped on ${o.shipping_date || "(日付なし)"}`);
    });
  } else {
    console.log("(該当なし - shipped状態で追跡なしの注文はありません)");
  }
}

main().catch(console.error);
