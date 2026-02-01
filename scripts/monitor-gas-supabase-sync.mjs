// scripts/monitor-gas-supabase-sync.mjs
// GASとSupabaseの同期状態を監視・検証するスクリプト

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
const gasIntakeListUrl = envVars.GAS_INTAKE_LIST_URL;
const gasReservationsUrl = envVars.GAS_RESERVATIONS_URL;
const adminToken = envVars.ADMIN_TOKEN;

console.log("=== GAS-Supabase 同期状態監視 ===\n");
console.log(`実行時刻: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}\n`);

async function monitorSync() {
  const issues = [];

  // ========================================
  // 1. 問診データの同期チェック
  // ========================================
  console.log("【1】問診データの同期チェック...");

  // 直近7日間の問診データを取得
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fromDate = sevenDaysAgo.toISOString().split("T")[0];

  const gasIntakeUrl = `${gasIntakeListUrl}?from=${fromDate}`;
  const gasIntakeResponse = await fetch(gasIntakeUrl, { method: "GET" });
  const gasIntakeData = await gasIntakeResponse.json();

  if (!Array.isArray(gasIntakeData)) {
    console.log("  ❌ GASからの問診データ取得失敗\n");
    return;
  }

  console.log(`  GAS問診データ: ${gasIntakeData.length}件（直近7日間）`);

  // Supabaseから直近7日間のintakeデータを取得
  const { data: supabaseIntakeData } = await supabase
    .from("intake")
    .select("patient_id, patient_name, reserve_id, reserved_date, created_at")
    .gte("created_at", sevenDaysAgo.toISOString());

  console.log(`  Supabase intakeデータ: ${supabaseIntakeData?.length || 0}件（直近7日間）\n`);

  // patient_idのセットを作成
  const supabasePatientIds = new Set((supabaseIntakeData || []).map(r => r.patient_id));

  // GASにあってSupabaseにない問診を抽出
  const missingIntake = gasIntakeData.filter(r => {
    const patientId = String(r.patient_id || "");
    return patientId && !supabasePatientIds.has(patientId);
  });

  if (missingIntake.length > 0) {
    console.log(`  ⚠️ GASにあってSupabaseにない問診: ${missingIntake.length}件`);
    issues.push({
      type: "missing_intake",
      count: missingIntake.length,
      details: missingIntake.slice(0, 5).map(r => ({
        patient_id: String(r.patient_id),
        name: r.name,
        submitted_at: r.submittedAt || r.timestamp,
      })),
    });
  } else {
    console.log(`  ✅ 問診データの同期OK`);
  }

  // ========================================
  // 2. 予約データの同期チェック
  // ========================================
  console.log("\n【2】予約データの同期チェック...");

  const gasReservationsResponse = await fetch(gasReservationsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "getAllReservations", token: adminToken }),
  });
  const gasReservationsData = await gasReservationsResponse.json();
  const gasReservations = gasReservationsData.reservations || [];

  // 直近7日間の予約のみ
  const recentGasReservations = gasReservations.filter(r => {
    const timestamp = r.timestamp || r.created_at;
    if (!timestamp) return false;
    return new Date(timestamp) >= sevenDaysAgo;
  });

  console.log(`  GAS予約データ: ${recentGasReservations.length}件（直近7日間）`);

  // Supabaseから直近7日間の予約データを取得
  const { data: supabaseReservations } = await supabase
    .from("reservations")
    .select("reserve_id, patient_id, reserved_date, reserved_time, status, created_at")
    .gte("created_at", sevenDaysAgo.toISOString());

  console.log(`  Supabase reservationsデータ: ${supabaseReservations?.length || 0}件（直近7日間）\n`);

  // reserve_idのセットを作成
  const supabaseReserveIds = new Set((supabaseReservations || []).map(r => r.reserve_id));

  // GASにあってSupabaseにない予約を抽出
  const missingReservations = recentGasReservations.filter(r => {
    const reserveId = r.reserve_id || r.reserveId;
    return reserveId && !supabaseReserveIds.has(reserveId);
  });

  if (missingReservations.length > 0) {
    console.log(`  ⚠️ GASにあってSupabaseにない予約: ${missingReservations.length}件`);
    issues.push({
      type: "missing_reservations",
      count: missingReservations.length,
      details: missingReservations.slice(0, 5).map(r => ({
        reserve_id: r.reserve_id || r.reserveId,
        patient_id: String(r.patient_id || r.patientId),
        date: r.date || r.reserved_date,
        time: r.time || r.reserved_time,
      })),
    });
  } else {
    console.log(`  ✅ 予約データの同期OK`);
  }

  // ========================================
  // 3. intakeテーブルの予約情報チェック
  // ========================================
  console.log("\n【3】intakeテーブルの予約情報チェック...");

  // 予約があるのにintakeテーブルのreserve_idがNULLの患者を検出
  const gasReservationsByPatient = new Map();
  recentGasReservations.forEach(r => {
    const pid = String(r.patient_id || r.patientId || "");
    const status = (r.status || "").toLowerCase();
    if (pid && status !== "canceled" && status !== "キャンセル") {
      if (!gasReservationsByPatient.has(pid)) {
        gasReservationsByPatient.set(pid, []);
      }
      gasReservationsByPatient.get(pid).push(r);
    }
  });

  // Supabaseのintakeテーブルで予約情報が欠けている患者を検出
  const intakeWithoutReservation = (supabaseIntakeData || []).filter(intake => {
    const pid = intake.patient_id;
    const hasReservationInGas = gasReservationsByPatient.has(pid);
    const hasReserveIdInIntake = !!intake.reserve_id;
    return hasReservationInGas && !hasReserveIdInIntake;
  });

  if (intakeWithoutReservation.length > 0) {
    console.log(`  ⚠️ 予約があるのにintakeテーブルのreserve_idがNULL: ${intakeWithoutReservation.length}件`);
    issues.push({
      type: "intake_missing_reserve_id",
      count: intakeWithoutReservation.length,
      details: intakeWithoutReservation.slice(0, 5).map(r => ({
        patient_id: r.patient_id,
        patient_name: r.patient_name,
      })),
    });
  } else {
    console.log(`  ✅ intakeテーブルの予約情報OK`);
  }

  // ========================================
  // 4. サマリー
  // ========================================
  console.log("\n" + "=".repeat(60));
  console.log("【サマリー】");

  if (issues.length === 0) {
    console.log("✅ すべての同期チェックがOKです");
  } else {
    console.log(`❌ ${issues.length}件の問題が検出されました:\n`);
    issues.forEach((issue, idx) => {
      console.log(`[${idx + 1}] ${issue.type}: ${issue.count}件`);
      if (issue.details && issue.details.length > 0) {
        console.log(`    最初の数件:`);
        issue.details.forEach(d => {
          console.log(`      - ${JSON.stringify(d)}`);
        });
      }
      console.log();
    });

    console.log("【推奨アクション】");
    if (issues.some(i => i.type === "missing_intake")) {
      console.log("  - scripts/sync-missing-intake.mjs を実行して問診データを同期");
    }
    if (issues.some(i => i.type === "missing_reservations")) {
      console.log("  - scripts/sync-missing-reservations-to-db.mjs を実行して予約データを同期");
    }
    if (issues.some(i => i.type === "intake_missing_reserve_id")) {
      console.log("  - scripts/fix-intake-reserve-id.mjs を実行してintakeテーブルの予約情報を修正");
    }
  }

  console.log("=".repeat(60));
}

monitorSync().catch(err => {
  console.error("監視スクリプトエラー:", err);
  process.exit(1);
});
