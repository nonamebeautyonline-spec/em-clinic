import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local manually
const envPath = join(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    process.env[key] = value;
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updatePatientStatus() {
  const patientId = "20260101668";

  console.log(`\n=== Updating patient ${patientId} status to NULL ===\n`);

  // 現在の状態を確認
  const { data: before, error: beforeError } = await supabase
    .from("intake")
    .select("patient_id, patient_name, status")
    .eq("patient_id", patientId)
    .single();

  if (beforeError) {
    console.error("Error fetching patient:", beforeError);
    return;
  }

  console.log("--- Before update ---");
  console.log(`Patient: ${before.patient_name} (${before.patient_id})`);
  console.log(`Status: ${before.status}`);

  // statusをNULLに更新
  const { data: updated, error: updateError } = await supabase
    .from("intake")
    .update({ status: null })
    .eq("patient_id", patientId)
    .select("patient_id, patient_name, status")
    .single();

  if (updateError) {
    console.error("❌ Update failed:", updateError);
    return;
  }

  console.log("\n--- After update ---");
  console.log(`Patient: ${updated.patient_name} (${updated.patient_id})`);
  console.log(`Status: ${updated.status}`);
  console.log("\n✅ Status updated successfully");
}

updatePatientStatus().catch(console.error);
