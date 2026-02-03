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

async function fixMiyazakiDate() {
  const patientId = "20260200090";

  console.log("\n宮崎琴音の予約日時を修正:");
  console.log("=".repeat(70));

  const { data, error } = await supabase
    .from("intake")
    .update({
      reserved_date: "2026-02-04",
      reserved_time: "10:45",
    })
    .eq("patient_id", patientId)
    .select("patient_id, patient_name, reserved_date, reserved_time");

  if (error) {
    console.error("\n❌ Error:", error);
    return;
  }

  if (data.length === 0) {
    console.log("\n⚠️  更新対象なし");
    return;
  }

  console.log("\n✅ 更新完了:");
  console.log("  患者: " + data[0].patient_name);
  console.log("  日時: " + data[0].reserved_date + " " + data[0].reserved_time);
}

fixMiyazakiDate().catch(console.error);
