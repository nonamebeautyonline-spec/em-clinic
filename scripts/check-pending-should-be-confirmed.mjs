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
  // DBでpendingのreordersを取得
  const { data: pendingReorders } = await supabase
    .from("reorders")
    .select("id, gas_row_number, patient_id, status, product_code, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  console.log(`=== DBで pending のままの reorders: ${(pendingReorders || []).length}件 ===`);
  for (const r of pendingReorders || []) {
    console.log(`id:${r.id} gas_row:${r.gas_row_number} patient:${r.patient_id} product:${r.product_code} created:${(r.created_at || "").slice(0,19)}`);
  }

  console.log("\n★ 上記をGASと照合して、GASでconfirmedなのにDBがpendingのものを特定してください");
}

main();
