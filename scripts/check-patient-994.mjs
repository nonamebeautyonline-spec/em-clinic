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
  const pid = "20251200994";

  // Reorders
  const { data: reorders } = await supabase
    .from("reorders")
    .select("id, gas_row_number, status, product_code, created_at")
    .eq("patient_id", pid)
    .order("created_at", { ascending: false });

  console.log("=== Reorders for " + pid + " ===");
  for (const r of reorders || []) {
    console.log(`id:${r.id} gas_row:${r.gas_row_number} status:${r.status} product:${r.product_code} created:${(r.created_at || "").slice(0,19)}`);
  }

  // Orders
  const { data: orders } = await supabase
    .from("orders")
    .select("id, menu_name, status, payment_method, created_at")
    .eq("patient_id", pid)
    .order("created_at", { ascending: false });

  console.log("\n=== Orders for " + pid + " ===");
  for (const o of orders || []) {
    console.log(`id:${o.id} menu:${(o.menu_name || "").slice(0,30)} status:${o.status} payment:${o.payment_method} created:${(o.created_at || "").slice(0,19)}`);
  }
}

main();
