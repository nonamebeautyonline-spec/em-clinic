// scripts/sync-missing-intake-for-today.mjs
// 今日の予約でintakeテーブルに存在しない2件の患者を同期

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
const gasMypageUrl = envVars.GAS_MYPAGE_URL;
const adminToken = envVars.ADMIN_TOKEN;

const missingPatients = [
  { patient_id: "20260101576", reserve_id: "resv-1769700681889", time: "17:15" },
  { patient_id: "20260100211", reserve_id: "resv-1769729904218", time: "15:15" },
];

console.log("=== 今日の予約でintakeテーブルに存在しない2件の患者を同期 ===\n");

async function syncMissingIntake() {
  for (const patient of missingPatients) {
    console.log(`【patient_id: ${patient.patient_id}】`);

    // 1. GASからダッシュボードデータを取得
    const url = `${gasMypageUrl}?type=getDashboard&patient_id=${encodeURIComponent(patient.patient_id)}&token=${encodeURIComponent(adminToken)}&full=1`;

    const response = await fetch(url, { method: "GET" });
    const data = await response.json();

    if (!data.patient) {
      console.log(`  ❌ GASにデータが存在しません\n`);
      continue;
    }

    // 2. GASから問診データを個別に取得（answersが必要）
    // getDashboardにはanswersが含まれていないので、別のAPIを使う必要があります
    // ここでは、シンプルに予約情報から推測してintakeレコードを作成します

    // 最低限の情報でintakeレコードを作成
    const intakeRecord = {
      patient_id: patient.patient_id,
      patient_name: data.patient.displayName || "",
      answerer_id: null,
      line_id: data.patient.line_user_id || null,
      reserve_id: patient.reserve_id,
      reserved_date: "2026-01-30",
      reserved_time: patient.time,
      status: null,
      note: null,
      prescription_menu: null,
      answers: {},  // 空のJSONBオブジェクト
    };

    console.log(`  GASデータ取得成功: ${data.patient.displayName}`);

    // 3. Supabaseにupsert
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

syncMissingIntake();
