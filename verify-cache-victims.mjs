// verify-cache-victims.mjs
// 23件の各患者について、実際に予約があるかreservationsテーブルで確認

import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== 23件の予約状況を確認（intake vs reservations） ===\n");

try {
  // 23件のpatient_idを読み込み
  const patientIds = JSON.parse(fs.readFileSync("problematic-intake-patient-ids.json", "utf8"));

  console.log(`対象患者: ${patientIds.length}件\n`);

  // intakeテーブルから情報を取得
  const { data: intakeData, error: intakeError } = await supabase
    .from("intake")
    .select("patient_id, patient_name, reserve_id, status, created_at")
    .in("patient_id", patientIds)
    .order("created_at", { ascending: false });

  if (intakeError) {
    console.error("❌ intakeクエリエラー:", intakeError);
    process.exit(1);
  }

  // patient_idでユニークにする
  const intakeByPid = {};
  intakeData.forEach(row => {
    const pid = row.patient_id;
    if (!intakeByPid[pid]) {
      intakeByPid[pid] = row;
    }
  });

  // reservationsテーブルから予約情報を取得
  const { data: reserveData, error: reserveError } = await supabase
    .from("reservations")
    .select("patient_id, reserve_id, reserved_date, reserved_time, status")
    .in("patient_id", patientIds);

  if (reserveError) {
    console.error("❌ reservationsクエリエラー:", reserveError);
    process.exit(1);
  }

  // patient_idでグループ化
  const reserveByPid = {};
  reserveData.forEach(row => {
    const pid = row.patient_id;
    if (!reserveByPid[pid]) {
      reserveByPid[pid] = [];
    }
    if (row.reserve_id && row.reserve_id.trim() !== "") {
      reserveByPid[pid].push(row);
    }
  });

  console.log("=".repeat(80));

  const withReservation = [];
  const withoutReservation = [];

  patientIds.forEach((pid, idx) => {
    const intake = intakeByPid[pid];
    const reserves = reserveByPid[pid] || [];

    const hasReserve = reserves.length > 0;
    const intakeReserveId = intake?.reserve_id || "";

    console.log(`${idx + 1}. ${intake?.patient_name || "(名前なし)"} (${pid})`);
    console.log(`   intake.reserve_id: ${intakeReserveId || "(なし)"}`);
    console.log(`   reservations: ${reserves.length}件`);

    if (reserves.length > 0) {
      reserves.forEach(r => {
        console.log(`     - ${r.reserve_id}: ${r.reserved_date} ${r.reserved_time} (${r.status || "未判定"})`);
      });
      withReservation.push(pid);
    } else {
      withoutReservation.push(pid);
    }

    console.log("");
  });

  console.log("=".repeat(80));
  console.log("\n=== 集計 ===\n");
  console.log(`予約あり: ${withReservation.length}件`);
  console.log(`予約なし: ${withoutReservation.length}件`);

  if (withReservation.length > 0) {
    console.log("\n⚠️  予約ありの患者:");
    withReservation.forEach(pid => {
      const intake = intakeByPid[pid];
      console.log(`  - ${pid}: ${intake?.patient_name || "(名前なし)"}`);
    });
    console.log("\n→ これらの患者は問診後に予約を取れた（キャッシュ問題の影響なし）");
  }

  if (withoutReservation.length > 0) {
    console.log("\n❌ 予約なしの患者:");
    withoutReservation.forEach(pid => {
      const intake = intakeByPid[pid];
      console.log(`  - ${pid}: ${intake?.patient_name || "(名前なし)"}`);
    });
    console.log("\n→ これらの患者がキャッシュ問題の被害者");
    console.log("   キャッシュクリア済みなので、今は予約できるはず");

    // 被害者リストを保存
    fs.writeFileSync(
      "cache-victims-no-reservation.json",
      JSON.stringify(withoutReservation, null, 2)
    );
    console.log("\n✓ cache-victims-no-reservation.json に保存しました");
  }

} catch (err) {
  console.error("❌ エラー:", err.message);
  console.error(err.stack);
  process.exit(1);
}
