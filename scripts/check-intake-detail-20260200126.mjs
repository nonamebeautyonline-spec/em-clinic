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

async function checkIntakeDetail() {
  const patientId = "20260200126";

  console.log(`\n${"=".repeat(70)}`);
  console.log(`Intake Table 詳細: ${patientId}`);
  console.log("=".repeat(70));

  try {
    const { data: intake, error } = await supabase
      .from("intake")
      .select("*")
      .eq("patient_id", patientId)
      .single();

    if (error) {
      console.error(`❌ Error:`, error);
      return;
    }

    console.log("\n全フィールド:");
    console.log(JSON.stringify(intake, null, 2));

  } catch (err) {
    console.error(`❌ エラー:`, err.message);
  }
}

checkIntakeDetail().catch(console.error);
