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
  // confirmedで決済済みのものを検索
  const { data: confirmed } = await supabase
    .from("reorders")
    .select("id, patient_id, product_code, created_at, gas_row_number")
    .eq("status", "confirmed");

  console.log("=== confirmed reordersで対応するorder(決済済み)があるもの ===\n");

  const toFix = [];
  for (const r of confirmed || []) {
    const { data: orders } = await supabase
      .from("orders")
      .select("id, paid_at")
      .eq("patient_id", r.patient_id)
      .eq("product_code", r.product_code)
      .eq("payment_status", "COMPLETED");

    const reorderTime = new Date(r.created_at).getTime();
    const match = (orders || []).find((o) => new Date(o.paid_at).getTime() > reorderTime);

    if (match) {
      const timeDiff = (new Date(match.paid_at).getTime() - new Date(r.created_at).getTime()) / 1000 / 60;
      console.log(`Reorder ${r.id} | patient: ${r.patient_id}`);
      console.log(`  reorder created: ${r.created_at.slice(0, 19)} | product: ${r.product_code}`);
      console.log(`  order paid:      ${match.paid_at.slice(0, 19)} | 差分: ${timeDiff.toFixed(0)}分後`);
      console.log("");
      toFix.push({ id: r.id, paidAt: match.paid_at });
    }
  }

  console.log(`\n=== 確認対象: ${toFix.length}件 ===`);
  console.log("（自動修正は行いません。内容を確認してください）");
}


main();
