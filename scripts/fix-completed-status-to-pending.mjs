import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

async function fixCompletedStatus() {
  console.log("\n" + "=".repeat(70));
  console.log("reservations.status = 'completed' を 'pending' に修正");
  console.log("=".repeat(70));

  const { data, error } = await supabase
    .from("reservations")
    .update({ status: "pending" })
    .eq("status", "completed")
    .select("reserve_id, patient_id, patient_name, reserved_date, reserved_time");

  if (error) {
    console.error("エラー:", error.message);
    return;
  }

  console.log(`\n修正件数: ${data.length}件\n`);

  for (const record of data) {
    console.log(`✅ ${record.patient_name} (${record.patient_id})`);
    console.log(`   予約ID: ${record.reserve_id}`);
    console.log(`   日時: ${record.reserved_date} ${record.reserved_time}`);
    console.log(`   status: completed → pending`);
    console.log("");
  }

  console.log("=".repeat(70));
  console.log("完了しました");
  console.log("=".repeat(70));
}

fixCompletedStatus().catch(console.error);
