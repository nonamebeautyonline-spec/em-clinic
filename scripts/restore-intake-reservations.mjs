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

async function restoreIntakeReservations() {
  const patientIds = ["20260100966", "20260200126"];

  console.log("\n" + "=".repeat(70));
  console.log("intake予約情報の復元");
  console.log("=".repeat(70));

  for (const patientId of patientIds) {
    console.log(`\n[${patientId}] 処理中...`);

    // 1. reservations tableから予約情報を取得
    const { data: reservations, error: resvError } = await supabase
      .from("reservations")
      .select("reserve_id, patient_id, patient_name, reserved_date, reserved_time, status")
      .eq("patient_id", patientId)
      .eq("reserved_date", "2026-02-03")
      .order("created_at", { ascending: false })
      .limit(1);

    if (resvError) {
      console.error(`  ❌ reservations取得エラー:`, resvError.message);
      continue;
    }

    if (!reservations || reservations.length === 0) {
      console.log(`  ⚠️  予約が見つかりません`);
      continue;
    }

    const reservation = reservations[0];
    console.log(`  予約ID: ${reservation.reserve_id}`);
    console.log(`  患者名: ${reservation.patient_name}`);
    console.log(`  日時: ${reservation.reserved_date} ${reservation.reserved_time}`);
    console.log(`  ステータス: ${reservation.status}`);

    // 2. キャンセルされている場合はスキップ
    if (reservation.status === "canceled") {
      console.log(`  ⏭️  キャンセル済みのため復元しません`);
      continue;
    }

    // 3. intakeに予約情報を書き戻す
    const { data: updated, error: updateError } = await supabase
      .from("intake")
      .update({
        reserve_id: reservation.reserve_id,
        reserved_date: reservation.reserved_date,
        reserved_time: reservation.reserved_time,
      })
      .eq("patient_id", patientId)
      .select("patient_id, patient_name, reserve_id");

    if (updateError) {
      console.error(`  ❌ 更新エラー:`, updateError.message);
      continue;
    }

    if (!updated || updated.length === 0) {
      console.log(`  ⚠️  intakeレコードが見つかりません`);
      continue;
    }

    console.log(`  ✅ 復元完了`);
    console.log(`    - reserve_id: ${updated[0].reserve_id}`);
    console.log(`    - reserved_date: ${reservation.reserved_date}`);
    console.log(`    - reserved_time: ${reservation.reserved_time}`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("復元処理が完了しました");
  console.log("=".repeat(70));
}

restoreIntakeReservations().catch(console.error);
