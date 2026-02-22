// 今日 shipped の注文をリスト表示するだけのスクリプト
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const envContent = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
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

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

const today = "2026-02-08";

// 1) shipping_date が今日 & shipped
const { data: byShipDate, error: e1 } = await supabase
  .from("orders")
  .select("patient_id, product_name, shipping_status, shipping_date, paid_at, tracking_number")
  .eq("shipping_status", "shipped")
  .gte("shipping_date", today)
  .lt("shipping_date", "2026-02-09");

console.log(`\n=== shipping_date = ${today} & status=shipped ===`);
console.log(`${byShipDate?.length || 0} 件`);
if (byShipDate && byShipDate.length > 0) {
  byShipDate.forEach(o => {
    console.log(`  ${o.patient_id} | ${o.product_name} | ship: ${o.shipping_date} | tracking: ${o.tracking_number || "-"}`);
  });
}

// 2) paid_at が今日 & shipped
const { data: byPaidAt } = await supabase
  .from("orders")
  .select("patient_id, product_name, shipping_status, shipping_date, paid_at, tracking_number")
  .eq("shipping_status", "shipped")
  .gte("paid_at", today + "T00:00:00+09:00")
  .lt("paid_at", "2026-02-09T00:00:00+09:00");

console.log(`\n=== paid_at = ${today} & status=shipped ===`);
console.log(`${byPaidAt?.length || 0} 件`);
if (byPaidAt && byPaidAt.length > 0) {
  byPaidAt.forEach(o => {
    console.log(`  ${o.patient_id} | ${o.product_name} | paid: ${o.paid_at?.slice(0, 10)} | ship: ${o.shipping_date} | tracking: ${o.tracking_number || "-"}`);
  });
}

// 3) shipped 全件（最新20件を参考表示）
const { data: recent } = await supabase
  .from("orders")
  .select("patient_id, product_name, shipping_status, shipping_date, paid_at, tracking_number")
  .eq("shipping_status", "shipped")
  .order("shipping_date", { ascending: false, nullsFirst: false })
  .limit(20);

console.log(`\n=== shipped 最新20件（参考） ===`);
if (recent) {
  recent.forEach(o => {
    console.log(`  ${o.patient_id} | ${o.product_name} | ship: ${o.shipping_date || "null"} | paid: ${o.paid_at?.slice(0, 10)} | tracking: ${o.tracking_number || "-"}`);
  });
}

// 4) intake から名前も引く（今日分）
const todayPatientIds = [...new Set([...(byShipDate || []), ...(byPaidAt || [])].map(o => o.patient_id))];
if (todayPatientIds.length > 0) {
  console.log(`\n=== 今日の発送対象（名前付き） ===`);
  for (const pid of todayPatientIds) {
    const { data: intake } = await supabase
      .from("intake")
      .select("patient_name, line_id")
      .eq("patient_id", pid)
      .maybeSingle();
    console.log(`  ${pid} | ${intake?.patient_name || "?"} | LINE: ${intake?.line_id ? "連携済" : "未連携"}`);
  }
}
