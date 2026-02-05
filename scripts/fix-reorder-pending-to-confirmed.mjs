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
  // 対象: id=458, patient=20251200994
  const targetId = 458;

  // 現在の状態確認
  const { data: before } = await supabase
    .from("reorders")
    .select("id, gas_row_number, patient_id, status, product_code")
    .eq("id", targetId)
    .single();

  console.log("=== Before ===");
  console.log(before);

  if (before?.status === "pending") {
    const { error } = await supabase
      .from("reorders")
      .update({
        status: "confirmed",
        approved_at: new Date().toISOString()
      })
      .eq("id", targetId);

    if (error) {
      console.error("Update error:", error);
    } else {
      console.log("\n✅ Updated to confirmed");

      const { data: after } = await supabase
        .from("reorders")
        .select("id, gas_row_number, patient_id, status, product_code")
        .eq("id", targetId)
        .single();

      console.log("\n=== After ===");
      console.log(after);
    }
  } else {
    console.log("\nStatus is not pending, no update needed.");
  }
}

main();
