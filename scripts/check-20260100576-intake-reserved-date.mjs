// scripts/check-20260100576-intake-reserved-date.mjs
// 20260100576のSupabase intakeテーブルのreserved_dateを確認

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

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

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const patientId = "20260100576";

async function check() {
  console.log("=== 20260100576のSupabase intakeテーブル ===\n");

  const { data: intake } = await supabase
    .from("intake")
    .select("*")
    .eq("patient_id", patientId)
    .maybeSingle();

  if (!intake) {
    console.log("❌ intakeテーブルにデータがありません");
    return;
  }

  console.log("✅ intakeテーブルのデータ:");
  console.log(`  patient_id: ${intake.patient_id}`);
  console.log(`  patient_name: ${intake.patient_name || "NULL"}`);
  console.log(`  reserve_id: ${intake.reserve_id || "NULL"}`);
  console.log(`  reserved_date: ${intake.reserved_date || "NULL"} ← これが NULL なら除外される！`);
  console.log(`  reserved_time: ${intake.reserved_time || "NULL"}`);
  console.log(`  created_at: ${intake.created_at}`);

  console.log("\n【原因判定】");
  if (!intake.reserved_date) {
    console.log("❌ reserved_date が NULL です！");
    console.log("   /api/intake/list の 29行目で .not('reserved_date', 'is', null) により除外されています");
    console.log("\n【解決方法】");
    console.log("   以下のSQLでreserved_dateを補完してください:");
    console.log(`   UPDATE intake SET reserved_date = '2026-01-30' WHERE patient_id = '${patientId}';`);
  } else {
    console.log("✅ reserved_date は設定されています");
    console.log("   別の原因で除外されている可能性があります");
  }
}

check();
