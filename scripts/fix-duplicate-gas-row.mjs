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
  // id:462 は gas_row:463 だが、id:463 と重複
  // id:462 を gas_row:462 に変更

  console.log("=== Before ===");
  const { data: before } = await supabase
    .from("reorders")
    .select("id, gas_row_number, patient_id, status")
    .in("id", [462, 463, 464]);
  console.log(before);

  // id:462 の gas_row_number を 462 に変更
  const { error } = await supabase
    .from("reorders")
    .update({ gas_row_number: 462 })
    .eq("id", 462);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("\n✅ Updated id:462 → gas_row:462");

  console.log("\n=== After ===");
  const { data: after } = await supabase
    .from("reorders")
    .select("id, gas_row_number, patient_id, status")
    .in("id", [462, 463, 464]);
  console.log(after);
}

main();
