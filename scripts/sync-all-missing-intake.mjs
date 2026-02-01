// scripts/sync-all-missing-intake.mjs
// GASにあってSupabaseにない全ての問診データを同期
// 1000件API制限を考慮してバッチ処理

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

console.log("=== GASにあってSupabaseにない全ての問診データを同期 ===\n");

const BATCH_SIZE = 50; // 一度に同期する件数

async function syncAllMissingIntake() {
  // 1. GASから過去90日分の問診データを取得
  console.log("【1】GASから問診データ取得中...");

  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 90);
  const fromDate = from.toISOString().split("T")[0];
  const toDate = today.toISOString().split("T")[0];

  const url = `${gasIntakeListUrl}?from=${fromDate}&to=${toDate}`;
  const response = await fetch(url, { method: "GET" });
  const gasIntakeData = await response.json();

  if (!Array.isArray(gasIntakeData)) {
    console.log("❌ GASからのデータが配列ではありません");
    return;
  }

  console.log(`✅ GASから${gasIntakeData.length}件取得\n`);

  // 2. Supabaseから全intakeのpatient_id取得
  console.log("【2】Supabase intakeテーブル確認中...");

  const { data: supabaseIntakeData } = await supabase
    .from("intake")
    .select("patient_id");

  const supabasePatientIds = new Set((supabaseIntakeData || []).map(r => r.patient_id));

  console.log(`✅ Supabaseに${supabasePatientIds.size}件のレコード\n`);

  // 3. 差分を抽出
  const missingInSupabase = gasIntakeData.filter(row => {
    const patientId = String(row.patient_id || "");
    return patientId && !supabasePatientIds.has(patientId);
  });

  console.log("【3】同期状況:");
  console.log(`  GAS: ${gasIntakeData.length}件`);
  console.log(`  Supabase: ${supabasePatientIds.size}件`);
  console.log(`  不足: ${missingInSupabase.length}件\n`);

  if (missingInSupabase.length === 0) {
    console.log("✅ 全てのGASデータがSupabaseに同期されています");
    return;
  }

  // 4. GASから全予約データ取得（reserve_id紐付けのため）
  console.log("【4】GAS予約データ取得中...");

  const reservationsResponse = await fetch(gasReservationsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "getAllReservations", token: adminToken }),
  });
  const reservationsData = await reservationsResponse.json();
  const allReservations = reservationsData.reservations || [];

  // patient_idごとの最新予約を取得
  const latestReservationByPatient = new Map();
  allReservations.forEach(r => {
    const pid = String(r.patient_id || r.patientId || "");
    const status = (r.status || "").toLowerCase();
    if (!pid || status === "canceled" || status === "キャンセル") return;

    const existing = latestReservationByPatient.get(pid);
    const timestamp = new Date(r.timestamp || r.created_at || 0);

    if (!existing || timestamp > new Date(existing.timestamp || existing.created_at || 0)) {
      latestReservationByPatient.set(pid, r);
    }
  });

  console.log(`✅ GAS予約データ ${allReservations.length}件取得\n`);

  // 5. バッチ処理で同期
  console.log(`【5】Supabaseに同期開始（${BATCH_SIZE}件ずつ）...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < missingInSupabase.length; i += BATCH_SIZE) {
    const batch = missingInSupabase.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(missingInSupabase.length / BATCH_SIZE);

    console.log(`バッチ ${batchNum}/${totalBatches} (${batch.length}件)...`);

    for (const row of batch) {
      const patientId = String(row.patient_id || "");
      const patientName = row.name || row.patient_name || row["氏名"] || "";

      // 最新予約情報を取得
      const latestReservation = latestReservationByPatient.get(patientId);
      const reserveId = latestReservation?.reserve_id || latestReservation?.reserveId || null;
      const reservedDate = latestReservation?.date || latestReservation?.reserved_date || null;
      const reservedTime = latestReservation?.time || latestReservation?.reserved_time || null;

      const lineId = row.line_id || row.lineId || null;
      const answererId = row.answerer_id || row.answererId || null;

      // answersオブジェクトを構築
      const answers = { ...row };
      delete answers.patient_id;
      delete answers.patientId;
      delete answers.patient_name;
      delete answers.name;
      delete answers.reserve_id;
      delete answers.reserveId;
      delete answers.reserved_date;
      delete answers.date;
      delete answers.reserved_time;
      delete answers.time;
      delete answers.line_id;
      delete answers.lineId;
      delete answers.answerer_id;
      delete answers.answererId;
      delete answers.status;
      delete answers.note;
      delete answers.prescription_menu;
      delete answers.created_at;

      const intakeRecord = {
        patient_id: patientId,
        patient_name: patientName,
        answerer_id: answererId,
        line_id: lineId,
        reserve_id: reserveId,
        reserved_date: reservedDate,
        reserved_time: reservedTime,
        status: row.status || null,
        note: row.note || row.doctor_note || null,
        prescription_menu: row.prescription_menu || null,
        answers: answers,
      };

      const { error } = await supabase
        .from("intake")
        .upsert(intakeRecord, {
          onConflict: "patient_id",
        });

      if (error) {
        console.log(`  ❌ ${patientId}: ${error.message}`);
        errorCount++;
      } else {
        successCount++;
      }
    }

    console.log(`  バッチ ${batchNum} 完了: 成功 ${successCount}, エラー ${errorCount}\n`);
  }

  console.log("=== 同期完了 ===");
  console.log(`成功: ${successCount}件`);
  console.log(`エラー: ${errorCount}件`);
}

syncAllMissingIntake().catch(err => {
  console.error("同期エラー:", err);
  process.exit(1);
});
