// scripts/check-cleaned-patients.mjs
// 重複予約クリーンアップで処理された3人の患者のintake状態を確認

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

const patientIds = ["20260100211", "20260101576", "20260101559"];

console.log("=== 重複予約クリーンアップで処理された患者の確認 ===\n");

async function checkPatients() {
  for (const pid of patientIds) {
    console.log(`\n【patient_id: ${pid}】`);

    // intakeテーブル確認
    const { data: intake } = await supabase
      .from("intake")
      .select("patient_name, reserve_id, reserved_date, reserved_time")
      .eq("patient_id", pid)
      .maybeSingle();

    if (!intake) {
      console.log("  ❌ intakeレコードなし");
    } else {
      console.log(`  patient_name: ${intake.patient_name}`);
      console.log(`  reserve_id: ${intake.reserve_id || "NULL"}`);
      console.log(`  reserved_date: ${intake.reserved_date || "NULL"}`);
      console.log(`  reserved_time: ${intake.reserved_time || "NULL"}`);

      if (!intake.reserve_id || !intake.reserved_date) {
        console.log("  ⚠️  予約情報がNULL");
      }
    }

    // pending予約確認
    const { data: reservations } = await supabase
      .from("reservations")
      .select("reserve_id, reserved_date, reserved_time")
      .eq("patient_id", pid)
      .eq("status", "pending");

    console.log(`  pending予約: ${reservations?.length || 0}件`);
    if (reservations && reservations.length > 0) {
      reservations.forEach(r => {
        console.log(`    - ${r.reserve_id}: ${r.reserved_date} ${r.reserved_time}`);
      });
    }
  }

  console.log("\n=== 確認完了 ===");
}

checkPatients().catch(err => {
  console.error("エラー:", err);
  process.exit(1);
});
