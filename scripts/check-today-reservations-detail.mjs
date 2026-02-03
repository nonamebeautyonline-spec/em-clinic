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

async function checkTodayReservations() {
  const today = "2026-02-03";

  console.log("\n" + "=".repeat(70));
  console.log(`本日（${today}）の予約詳細`);
  console.log("=".repeat(70));

  // 1. reservations table - 全ステータス
  const { data: allReservations } = await supabase
    .from("reservations")
    .select("reserve_id, patient_id, patient_name, reserved_time, status")
    .eq("reserved_date", today)
    .order("reserved_time");

  console.log(`\n【reservations table】`);
  console.log(`全体: ${allReservations?.length || 0}件`);

  const statusCount = {
    pending: 0,
    completed: 0,
    canceled: 0,
    other: 0
  };

  allReservations?.forEach(r => {
    if (r.status === "pending") statusCount.pending++;
    else if (r.status === "completed") statusCount.completed++;
    else if (r.status === "canceled") statusCount.canceled++;
    else statusCount.other++;
  });

  console.log(`  - pending: ${statusCount.pending}件`);
  console.log(`  - completed: ${statusCount.completed}件`);
  console.log(`  - canceled: ${statusCount.canceled}件`);
  console.log(`  - その他: ${statusCount.other}件`);

  const notCanceled = allReservations?.filter(r => r.status !== "canceled") || [];
  console.log(`\nキャンセル除外: ${notCanceled.length}件`);

  // 2. intake table - 予約情報あり
  const { data: intakeRecords } = await supabase
    .from("intake")
    .select("patient_id, patient_name, reserve_id, reserved_time, status")
    .eq("reserved_date", today)
    .not("reserve_id", "is", null)
    .order("reserved_time");

  console.log(`\n【intake table】`);
  console.log(`予約情報あり: ${intakeRecords?.length || 0}件`);

  const intakeStatusCount = {
    ok: 0,
    ng: 0,
    pending: 0
  };

  intakeRecords?.forEach(r => {
    const s = (r.status || "").toUpperCase();
    if (s === "OK") intakeStatusCount.ok++;
    else if (s === "NG") intakeStatusCount.ng++;
    else intakeStatusCount.pending++;
  });

  console.log(`  - OK: ${intakeStatusCount.ok}件`);
  console.log(`  - NG: ${intakeStatusCount.ng}件`);
  console.log(`  - 未診察: ${intakeStatusCount.pending}件`);

  // 3. 差分チェック
  console.log("\n" + "=".repeat(70));
  console.log("【差分確認】");
  console.log("=".repeat(70));

  const reservationIds = new Set(notCanceled.map(r => r.reserve_id));
  const intakeIds = new Set(intakeRecords?.map(r => r.reserve_id) || []);

  // reservationsにあるがintakeにない
  const missingInIntake = notCanceled.filter(r => !intakeIds.has(r.reserve_id));
  console.log(`\nreservationsにあるがintakeにない: ${missingInIntake.length}件`);
  if (missingInIntake.length > 0) {
    missingInIntake.forEach(r => {
      console.log(`  ${r.reserved_time} ${r.patient_name} (${r.patient_id}) - status: ${r.status}`);
    });
  }

  // intakeにあるがreservationsにない（またはcanceled）
  const missingInReservations = intakeRecords?.filter(r => !reservationIds.has(r.reserve_id)) || [];
  console.log(`\nintakeにあるがreservations（有効）にない: ${missingInReservations.length}件`);
  if (missingInReservations.length > 0) {
    missingInReservations.forEach(r => {
      console.log(`  ${r.reserved_time} ${r.patient_name} (${r.patient_id}) - intake status: ${r.status || "(空)"}`);
    });
  }

  console.log("\n" + "=".repeat(70));
  console.log("結論:");
  console.log(`  真の予約（reservations - canceled）: ${notCanceled.length}件`);
  console.log(`  カルテ表示（intake - 予約情報あり）: ${intakeRecords?.length || 0}件`);
  console.log(`  差: ${(intakeRecords?.length || 0) - notCanceled.length}件`);
  console.log("=".repeat(70));
}

checkTodayReservations().catch(console.error);
