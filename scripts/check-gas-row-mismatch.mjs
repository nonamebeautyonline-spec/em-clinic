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
  const { data } = await supabase
    .from("reorders")
    .select("id, gas_row_number, patient_id, status, created_at")
    .order("id", { ascending: true });

  console.log("id\tgas_row\tstatus\t\tcreated_at\t\t\tズレ");
  console.log("─".repeat(80));

  let mismatchCount = 0;
  const mismatches = [];
  for (const r of data || []) {
    const mismatch = r.id !== r.gas_row_number ? "★" : "";
    if (mismatch) {
      mismatchCount++;
      mismatches.push(r);
    }
    console.log(`${r.id}\t${r.gas_row_number}\t${(r.status || "").padEnd(10)}\t${(r.created_at || "").slice(0,19)}\t${mismatch}`);
  }
  console.log(`\n★ズレ: ${mismatchCount}件 / ${(data || []).length}件`);

  if (mismatches.length > 0) {
    console.log("\n=== ズレている reorders ===");
    for (const r of mismatches) {
      console.log(`id:${r.id} → gas_row:${r.gas_row_number} | ${r.patient_id} | ${r.status}`);
    }
  }
}

main();
