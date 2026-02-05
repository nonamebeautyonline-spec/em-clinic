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
  const pid = "20251200280";

  console.log("=== All Reorders for " + pid + " ===");
  const { data: all } = await supabase
    .from("reorders")
    .select("id, gas_row_number, status, product_code, created_at")
    .eq("patient_id", pid)
    .order("created_at", { ascending: false });

  for (const r of all || []) {
    console.log(`id:${r.id} gas_row:${r.gas_row_number} status:${r.status} product:${r.product_code}`);
  }

  // mypage API のロジックをシミュレート
  const { data } = await supabase
    .from("reorders")
    .select("id, status, created_at, product_code, gas_row_number")
    .eq("patient_id", pid)
    .in("status", ["pending", "confirmed", "paid"])
    .order("created_at", { ascending: false });

  console.log("\nFiltered (pending/confirmed/paid):");
  console.log(JSON.stringify(data, null, 2));
}

main();
