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

async function checkPatient() {
  const patientId = "20260101668";

  console.log(`\n=== Checking patient ${patientId} ===\n`);

  // intakeテーブルのdr_statusを確認
  const { data: intake, error: intakeError } = await supabase
    .from("intake")
    .select("*")
    .eq("patient_id", patientId)
    .single();

  if (intakeError) {
    console.error("Intake error:", intakeError);
    if (intakeError.code === "PGRST116") {
      console.log("患者が見つかりません");
    }
    return;
  }

  console.log("--- Intake record ---");
  console.log(`Patient ID: ${intake.patient_id}`);
  console.log(`Patient Name: ${intake.patient_name}`);
  console.log(`Dr Status: ${intake.dr_status}`);
  console.log(`Status: ${intake.status}`);
  console.log(`Created: ${intake.created_at}`);
  console.log();

  // 関連するreservationsを確認
  const { data: reservations } = await supabase
    .from("reservations")
    .select("*")
    .eq("patient_id", patientId);

  console.log(`--- Reservations (${reservations?.length || 0} records) ---`);
  if (reservations && reservations.length > 0) {
    reservations.forEach(r => {
      console.log(`ID: ${r.id}, Status: ${r.status}, Reserved: ${r.reserved_date}`);
    });
  } else {
    console.log("予約なし");
  }
  console.log();

  // 関連するordersを確認
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("patient_id", patientId);

  console.log(`--- Orders (${orders?.length || 0} records) ---`);
  if (orders && orders.length > 0) {
    orders.forEach(o => {
      console.log(`ID: ${o.id}, Product: ${o.product_code}, Status: ${o.status}, Payment: ${o.payment_method}`);
    });
  } else {
    console.log("注文なし");
  }
  console.log();

  // dr_statusがOKの場合、削除可能かチェック
  if (intake.dr_status === "OK") {
    console.log("⚠️  Dr Status = OK です");

    const hasActiveOrders = orders && orders.some(o =>
      o.status !== "cancelled" && o.status !== "refunded"
    );

    const hasActiveReservations = reservations && reservations.some(r =>
      r.status !== "cancelled"
    );

    if (hasActiveOrders || hasActiveReservations) {
      console.log("❌ アクティブな注文または予約があるため、削除できません");
      console.log(`   - アクティブな注文: ${hasActiveOrders ? "あり" : "なし"}`);
      console.log(`   - アクティブな予約: ${hasActiveReservations ? "あり" : "なし"}`);
    } else {
      console.log("✅ 削除可能です（アクティブな注文・予約なし）");
    }
  }
}

checkPatient().catch(console.error);
