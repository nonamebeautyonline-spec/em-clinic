// scripts/sync-full-intake-data.mjs
// GASから完全な問診データを取得してSupabaseに同期

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
const adminToken = envVars.ADMIN_TOKEN;

const targetPatientIds = ["20260100321"];

console.log("=== GASから不足している問診データを取得してSupabaseに同期 ===\n");

async function syncFullIntakeData() {
  // 1. GASから問診データを取得（full data）
  console.log("【1】GASから問診データ取得中...");

  // 対象患者のデータを確実に取得するため、過去30日分を取得
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 30);
  const fromDate = from.toISOString().split("T")[0];
  const toDate = today.toISOString().split("T")[0];

  const url = `${gasIntakeListUrl}?from=${fromDate}&to=${toDate}`;

  const response = await fetch(url, { method: "GET" });
  const gasIntakeData = await response.json();

  if (!Array.isArray(gasIntakeData)) {
    console.log("❌ GASからのデータが配列ではありません");
    console.log(gasIntakeData);
    return;
  }

  console.log(`✅ GASから${gasIntakeData.length}件の問診データ取得\n`);

  // 2. 対象の2人のデータを抽出
  const targetData = gasIntakeData.filter(row => {
    const patientId = String(row.patient_id || row.patientId || row["patient_id"] || "");
    return targetPatientIds.includes(patientId);
  });

  console.log(`【2】対象患者のデータ: ${targetData.length}件\n`);

  if (targetData.length === 0) {
    console.log("❌ 対象患者のデータが見つかりませんでした");
    return;
  }

  // 3. 各患者のデータをSupabaseに同期
  for (const row of targetData) {
    const patientId = String(row.patient_id || row.patientId || row["patient_id"] || "");
    const patientName = row.patient_name || row.name || row["氏名"] || "";
    const reserveId = row.reserveId || row.reserve_id || row["予約ID"] || "";
    const reservedDate = row.reserved_date || row.date || row["予約日"] || "";
    const reservedTime = row.reserved_time || row.time || row["予約時間"] || "";
    const lineId = row.line_id || row.lineId || null;
    const answererId = row.answerer_id || row.answererId || null;

    console.log(`【patient_id: ${patientId}】`);
    console.log(`  patient_name: ${patientName}`);
    console.log(`  reserve_id: ${reserveId}`);

    // answersオブジェクトを構築（GASの全フィールドを含める）
    const answers = { ...row };

    // 重複するフィールドを削除
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

    console.log(`  answers keys: ${Object.keys(answers).slice(0, 10).join(", ")}...`);

    // Supabaseにupsert
    const { error } = await supabase
      .from("intake")
      .upsert(intakeRecord, {
        onConflict: "patient_id",
      });

    if (error) {
      console.log(`  ❌ Supabase upsertエラー: ${error.message}\n`);
    } else {
      console.log(`  ✅ Supabase同期成功\n`);
    }
  }

  console.log("=== 同期完了 ===");
}

syncFullIntakeData();
