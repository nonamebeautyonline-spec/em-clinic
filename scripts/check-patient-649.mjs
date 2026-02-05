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
  const patientId = "20251200649";

  // Reorders
  const { data: reorders } = await supabase
    .from("reorders")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  console.log(`=== Patient ${patientId} Reorders ===`);
  for (const r of reorders || []) {
    console.log(`id:${r.id} status:${r.status} product:${r.product_code} created:${r.created_at?.slice(0,19)}`);
  }

  // Orders
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  console.log(`\n=== Patient ${patientId} Orders ===`);
  for (const o of orders || []) {
    console.log(`id:${o.id} status:${o.payment_status} product:${o.product_code} paidAt:${o.paid_at?.slice(0,19)} tracking:${o.tracking_number || "none"}`);
  }

  // confirmedのreorderがあるか
  const confirmedReorders = (reorders || []).filter(r => r.status === "confirmed");
  console.log(`\n=== Confirmed Reorders: ${confirmedReorders.length}件 ===`);

  if (confirmedReorders.length > 0) {
    console.log("\n⚠️ confirmedが残っている！");
    console.log("対応するordersがあるかチェック:");

    for (const r of confirmedReorders) {
      // 同じproduct_codeで、reorder作成後に決済されたorderを探す
      const matchingOrders = (orders || []).filter(o => {
        const orderPaidAt = new Date(o.paid_at || 0).getTime();
        const reorderCreatedAt = new Date(r.created_at || 0).getTime();
        return o.product_code === r.product_code && orderPaidAt > reorderCreatedAt;
      });

      console.log(`  Reorder id:${r.id} (${r.product_code}) → マッチするorder: ${matchingOrders.length}件`);
      for (const mo of matchingOrders) {
        console.log(`    Order id:${mo.id} paidAt:${mo.paid_at?.slice(0,19)}`);
      }
    }
  }
}

main();
