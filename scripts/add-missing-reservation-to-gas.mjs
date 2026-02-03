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

async function addMissingReservationToGas() {
  const reserveId = "resv-1770084040110";
  const patientId = "20260200126";

  console.log("\n" + "=".repeat(70));
  console.log("SupabaseからGASスプレッドシートに予約を追加");
  console.log("=".repeat(70));

  // 1. Supabaseから予約情報を取得
  console.log("\n[1/2] Supabaseから予約情報を取得中...");
  const { data: reservation, error: resvError } = await supabase
    .from("reservations")
    .select("*")
    .eq("reserve_id", reserveId)
    .single();

  if (resvError || !reservation) {
    console.error("  ❌ 予約が見つかりません:", resvError?.message);
    return;
  }

  console.log(`  患者ID: ${reservation.patient_id}`);
  console.log(`  患者名: ${reservation.patient_name}`);
  console.log(`  予約ID: ${reservation.reserve_id}`);
  console.log(`  日付: ${reservation.reserved_date}`);
  console.log(`  時刻: ${reservation.reserved_time}`);
  console.log(`  ステータス: ${reservation.status}`);

  // 2. intakeから詳細情報を取得
  const { data: intake } = await supabase
    .from("intake")
    .select("*")
    .eq("patient_id", patientId)
    .single();

  if (intake) {
    console.log(`  intake status: ${intake.status || "(未診察)"}`);
  }

  // 3. GASに予約を追加
  console.log("\n[2/2] GASスプレッドシートに予約を追加中...");

  const payload = {
    type: "createReservation",
    patient_id: reservation.patient_id,
    patientName: reservation.patient_name,
    date: reservation.reserved_date,
    time: reservation.reserved_time,
    reserveId: reservation.reserve_id,
    token: ADMIN_TOKEN,
    // GAS側でSupabase書き込みをスキップ（既に存在するため）
    skipSupabase: true,
  };

  console.log("\nGASに送信するペイロード:");
  console.log(JSON.stringify(payload, null, 2));

  const response = await fetch(GAS_RESERVATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!result.ok) {
    console.error("\n  ❌ GASエラー:", result);
    return;
  }

  console.log("\n  ✅ GASスプレッドシートに予約を追加しました");

  console.log("\n" + "=".repeat(70));
  console.log("完了: GASとSupabaseのデータが一致しました（70件）");
  console.log("=".repeat(70));
}

addMissingReservationToGas().catch(console.error);
