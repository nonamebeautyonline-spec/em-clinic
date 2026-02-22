const { readFileSync } = require("fs");
const { resolve } = require("path");
const { createClient } = require("@supabase/supabase-js");

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const t = line.trim();
  if (!t || t.startsWith("#")) return;
  const [key, ...vp] = t.split("=");
  if (key && vp.length > 0) {
    let v = vp.join("=").trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    envVars[key.trim()] = v;
  }
});

const sb = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const pid = "20260100866";

  const { data: orders } = await sb
    .from("orders")
    .select("id, patient_id, product_code, payment_status, status, payment_method, paid_at, created_at")
    .eq("patient_id", pid)
    .order("created_at", { ascending: false });

  console.log("=== orders for " + pid + " ===");
  for (const o of orders || []) {
    console.log("  id=" + o.id + "  payment_status=" + o.payment_status + "  status=" + o.status + "  method=" + o.payment_method + "  paid_at=" + o.paid_at + "  product=" + o.product_code);
  }

  const { data: reorders } = await sb
    .from("reorders")
    .select("id, status, product_code, gas_row_number, paid_at, created_at")
    .eq("patient_id", pid)
    .order("created_at", { ascending: false });

  console.log("=== reorders for " + pid + " ===");
  for (const r of reorders || []) {
    console.log("  id=" + r.id + "  status=" + r.status + "  gas_row=" + r.gas_row_number + "  paid_at=" + r.paid_at + "  product=" + r.product_code);
  }
}

main().catch(console.error);
