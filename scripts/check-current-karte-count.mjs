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

async function checkCurrentCount() {
  const today = new Date().toISOString().split('T')[0];

  console.log("\n現在のカルテ件数:");
  console.log("=".repeat(70));

  const { data, error } = await supabase
    .from("intake")
    .select("patient_id, patient_name, reserved_date, reserved_time")
    .eq("reserved_date", today)
    .not("reserve_id", "is", null);

  if (error) {
    console.error("❌ Error:", error);
    return;
  }

  console.log("\nintakeテーブルで今日の予約: " + data.length + "件");
  console.log("（カルテで表示される数）");
}

checkCurrentCount().catch(console.error);
