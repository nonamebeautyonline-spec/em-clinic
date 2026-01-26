// patient_id で Supabase のデータを確認するスクリプト
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars: Record<string, string> = {};

envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join("=").trim();
  }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const patientId = process.argv[2] || "20260101464";

async function main() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/intake?patient_id=eq.${patientId}&select=patient_id,reserve_id,reserved_date,reserved_time,patient_name`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );

  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
