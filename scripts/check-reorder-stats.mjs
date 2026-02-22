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

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  // 全件数
  const { count: total } = await supabase.from("reorders").select("id", { count: "exact", head: true });
  console.log("reorders全件:", total);

  // ステータス別
  for (const s of ["pending", "confirmed", "paid", "rejected", "canceled"]) {
    const { count } = await supabase.from("reorders").select("id", { count: "exact", head: true }).eq("status", s);
    console.log(`  status=${s}:`, count);
  }

  // paid_at がnullのpaid
  const { count: paidNoDate } = await supabase.from("reorders").select("id", { count: "exact", head: true }).eq("status", "paid").is("paid_at", null);
  console.log("  paid but paid_at=null:", paidNoDate);

  // product_code がnullのpaid
  const { count: paidNoProd } = await supabase.from("reorders").select("id", { count: "exact", head: true }).eq("status", "paid").is("product_code", null);
  console.log("  paid but product_code=null:", paidNoProd);

  // patient_id がnullのpaid
  const { count: paidNoPat } = await supabase.from("reorders").select("id", { count: "exact", head: true }).eq("status", "paid").is("patient_id", null);
  console.log("  paid but patient_id=null:", paidNoPat);

  // サンプル: paid_atがnullのpaidレコード
  const { data: samples } = await supabase.from("reorders").select("id, gas_row_number, patient_id, product_code, status, paid_at, created_at").eq("status", "paid").is("paid_at", null).limit(5);
  console.log("\npaid_at=nullのサンプル:", JSON.stringify(samples, null, 2));

  // gas_row_number の最大値
  const { data: maxRow } = await supabase.from("reorders").select("gas_row_number").order("gas_row_number", { ascending: false }).limit(1);
  console.log("\ngas_row_number最大:", maxRow?.[0]?.gas_row_number);
}
main().catch(e => console.error(e));
