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

const GAS_RESERVATIONS_URL = process.env.GAS_RESERVATIONS_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

async function checkKarteCount() {
  const today = new Date().toISOString().split('T')[0];

  console.log("\n" + "=".repeat(70));
  console.log("カルテ件数の差異を確認: " + today);
  console.log("=".repeat(70));

  try {
    // 1. intakeテーブルで今日の予約を確認
    console.log("\n[1/3] Supabase intakeテーブルから今日の予約を取得中...");
    const { data: intakeReservations, error: intakeError } = await supabase
      .from("intake")
      .select("patient_id, patient_name, reserve_id, reserved_date, reserved_time")
      .eq("reserved_date", today)
      .not("reserve_id", "is", null)
      .order("reserved_time", { ascending: true });

    if (intakeError) {
      console.error("❌ Error:", intakeError);
      return;
    }

    console.log("✅ intakeテーブル: " + intakeReservations.length + "件");

    // 2. reservationsテーブルでpending予約を確認
    console.log("\n[2/3] Supabase reservationsテーブルからpending予約を取得中...");
    const { data: reservationsData, error: resvError } = await supabase
      .from("reservations")
      .select("reserve_id, patient_id, patient_name, reserved_time, status")
      .eq("reserved_date", today)
      .eq("status", "pending")
      .order("reserved_time", { ascending: true });

    if (resvError) {
      console.error("❌ Error:", resvError);
      return;
    }

    console.log("✅ reservationsテーブル (pending): " + reservationsData.length + "件");

    // 3. GASから今日の予約を取得
    console.log("\n[3/3] GASから今日の予約を取得中...");
    const response = await fetch(GAS_RESERVATIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "getAllReservations",
        date: today,
        token: ADMIN_TOKEN,
      }),
    });

    if (!response.ok) {
      console.error("❌ HTTP Error:", response.status);
      return;
    }

    const data = await response.json();
    if (!data.ok) {
      console.error("❌ API Error:", data.error);
      return;
    }

    const gasActiveReservations = data.reservations.filter(r => 
      r.status !== 'キャンセル' && r.status !== 'canceled'
    );
    const gasReserveIds = new Set(gasActiveReservations.map(r => r.reserveId || r.reserve_id));

    console.log("✅ GASアクティブ予約: " + gasActiveReservations.length + "件");

    // 4. 差分を確認
    console.log("\n" + "=".repeat(70));
    console.log("差分分析");
    console.log("=".repeat(70));

    // intakeにあってGASにない予約
    const intakeNotInGas = intakeReservations.filter(r => !gasReserveIds.has(r.reserve_id));
    
    console.log("\n【intakeにあってGASにない】: " + intakeNotInGas.length + "件");
    if (intakeNotInGas.length > 0) {
      intakeNotInGas.forEach(r => {
        console.log("  - " + r.reserved_time + " " + r.patient_name + " (" + r.patient_id + ")");
        console.log("    予約ID: " + r.reserve_id);
      });
    }

    // intakeとreservationsの差分
    const intakeReserveIds = new Set(intakeReservations.map(r => r.reserve_id));
    const reservationsReserveIds = new Set(reservationsData.map(r => r.reserve_id));

    const inIntakeNotInReservations = intakeReservations.filter(r => !reservationsReserveIds.has(r.reserve_id));
    const inReservationsNotInIntake = reservationsData.filter(r => !intakeReserveIds.has(r.reserve_id));

    console.log("\n【intakeにあってreservationsにない】: " + inIntakeNotInReservations.length + "件");
    if (inIntakeNotInReservations.length > 0) {
      inIntakeNotInReservations.forEach(r => {
        console.log("  - " + r.reserved_time + " " + r.patient_name + " (" + r.patient_id + ")");
        console.log("    予約ID: " + r.reserve_id);
      });
    }

    console.log("\n【reservationsにあってintakeにない】: " + inReservationsNotInIntake.length + "件");
    if (inReservationsNotInIntake.length > 0) {
      inReservationsNotInIntake.forEach(r => {
        console.log("  - " + r.reserved_time + " " + r.patient_name + " (" + r.patient_id + ")");
        console.log("    予約ID: " + r.reserve_id);
      });
    }

    console.log("\n" + "=".repeat(70));
    console.log("サマリー");
    console.log("=".repeat(70));
    console.log("GAS: " + gasActiveReservations.length + "件（真の予約数）");
    console.log("reservations (pending): " + reservationsData.length + "件");
    console.log("intake: " + intakeReservations.length + "件（カルテで表示される数）");
    console.log("");
    console.log("差分: intake - GAS = " + (intakeReservations.length - gasActiveReservations.length) + "件");

  } catch (err) {
    console.error("\n❌ エラー:", err.message);
    console.error(err.stack);
  }
}

checkKarteCount().catch(console.error);
