// ordersテーブルからreordersのpaid_atを埋められるか確認
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

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

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // ordersテーブルのカラム確認
  const { data: sample } = await supabase.from("orders").select("*").not("paid_at", "is", null).limit(3);
  if (sample && sample.length > 0) {
    console.log("=== ordersサンプル（paid_atあり）===");
    console.log("カラム:", Object.keys(sample[0]).join(", "));
    for (const o of sample) {
      console.log(`  id=${o.id}, patient_id=${o.patient_id}, product_code=${o.product_code}, paid_at=${o.paid_at}, payment_method=${o.payment_method}`);
    }
  }

  // ordersの件数
  const { count: totalOrders } = await supabase.from("orders").select("id", { count: "exact", head: true });
  const { count: ordersWithPaidAt } = await supabase.from("orders").select("id", { count: "exact", head: true }).not("paid_at", "is", null);
  console.log(`\norders全件: ${totalOrders}, paid_atあり: ${ordersWithPaidAt}`);

  // reordersのpaid_at=nullかつstatus=paidの件数
  const { count: reorderNeedFix } = await supabase.from("reorders").select("id", { count: "exact", head: true }).eq("status", "paid").is("paid_at", null);
  console.log(`reorders paid_at=null & status=paid: ${reorderNeedFix}`);

  // マッチングテスト: reorders(paid_at=null) ↔ orders(paid_at not null)
  // reorderには patient_id, product_code, created_at(=申請日時) がある
  // ordersには patient_id, product_code, paid_at がある
  const { data: reordersNoPaidAt } = await supabase
    .from("reorders")
    .select("id, gas_row_number, patient_id, product_code, created_at, timestamp")
    .eq("status", "paid")
    .is("paid_at", null)
    .order("created_at", { ascending: true })
    .limit(10);

  console.log("\n=== マッチングテスト ===");
  for (const r of reordersNoPaidAt || []) {
    // このpatient_id + product_codeでordersを検索
    const { data: matchOrders } = await supabase
      .from("orders")
      .select("id, patient_id, product_code, paid_at, payment_method, created_at")
      .eq("patient_id", r.patient_id)
      .eq("product_code", r.product_code)
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: true });

    console.log(`\nreorder gas_row=${r.gas_row_number}, patient=${r.patient_id}, product=${r.product_code}, created=${r.created_at}`);
    if (matchOrders && matchOrders.length > 0) {
      for (const o of matchOrders) {
        console.log(`  → order id=${o.id}, paid_at=${o.paid_at}, method=${o.payment_method}`);
      }
    } else {
      console.log("  → マッチするorderなし");
    }
  }
}

main().catch(e => console.error(e));
