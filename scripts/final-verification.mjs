// scripts/final-verification.mjs
// GASとSupabaseの完全な同期確認と情報抜けチェック

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

console.log("=== 最終同期確認と情報抜けチェック ===\n");

async function finalVerification() {
  // 1. GASから全件取得
  console.log("【1】GASから全問診データ取得中...");

  const response = await fetch(gasIntakeListUrl, { method: "GET" });
  const gasData = await response.json();

  console.log(`✅ GAS: ${gasData.length}件\n`);

  // 2. Supabaseから全件取得（ページング処理で1000件制限を回避）
  console.log("【2】Supabase intakeテーブル全件取得中...");

  let supabaseData = [];
  let hasMore = true;
  let offset = 0;
  const pageSize = 1000;

  while (hasMore) {
    const { data, error } = await supabase
      .from("intake")
      .select("*")
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("Supabaseエラー:", error);
      break;
    }

    if (data && data.length > 0) {
      supabaseData = supabaseData.concat(data);
      offset += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  const count = supabaseData.length;

  console.log(`✅ Supabase: ${count}件\n`);

  // 3. 件数比較
  console.log("【3】件数比較:");
  console.log(`  GAS: ${gasData.length}件`);
  console.log(`  Supabase: ${count}件`);
  console.log(`  差分: ${gasData.length - count}件\n`);

  // 4. patient_idベースで差分確認
  const gasPatientIds = new Set(gasData.map(r => String(r.patient_id || "")));
  const supabasePatientIds = new Set(supabaseData.map(r => r.patient_id));

  const missingInSupabase = Array.from(gasPatientIds).filter(pid => pid && !supabasePatientIds.has(pid));

  console.log("【4】patient_id差分確認:");
  if (missingInSupabase.length > 0) {
    console.log(`  ❌ GASにあってSupabaseにない: ${missingInSupabase.length}件`);
    console.log(`  最初の10件: ${missingInSupabase.slice(0, 10).join(", ")}\n`);
  } else {
    console.log(`  ✅ 全てのpatient_idが同期されています\n`);
  }

  // 5. 情報抜けチェック
  console.log("【5】情報抜けチェック:");

  const emptyAnswers = supabaseData.filter(r => {
    const answers = r.answers;
    return !answers || Object.keys(answers).length === 0;
  });

  const noPatientName = supabaseData.filter(r => !r.patient_name || r.patient_name.trim() === "");

  console.log(`  answers が空: ${emptyAnswers.length}件`);
  if (emptyAnswers.length > 0 && emptyAnswers.length <= 10) {
    emptyAnswers.forEach(r => {
      console.log(`    - ${r.patient_id}: ${r.patient_name || "(名前なし)"}`);
    });
  }

  console.log(`  patient_name が空: ${noPatientName.length}件`);
  if (noPatientName.length > 0 && noPatientName.length <= 10) {
    noPatientName.forEach(r => {
      console.log(`    - ${r.patient_id}`);
    });
  }

  console.log();

  // 6. サマリー
  console.log("【6】サマリー:");

  const allGood = (
    gasData.length === count &&
    missingInSupabase.length === 0 &&
    emptyAnswers.length === 0 &&
    noPatientName.length === 0
  );

  if (allGood) {
    console.log("✅✅✅ 全ての問診データが完全に同期されています！");
    console.log(`  - GAS: ${gasData.length}件`);
    console.log(`  - Supabase: ${count}件`);
    console.log(`  - 情報抜けなし`);
  } else {
    console.log("⚠️ 以下の問題が残っています:");
    if (gasData.length !== count) {
      console.log(`  - 件数不一致（GAS: ${gasData.length}, Supabase: ${count}）`);
    }
    if (missingInSupabase.length > 0) {
      console.log(`  - ${missingInSupabase.length}件がSupabaseに未同期`);
    }
    if (emptyAnswers.length > 0) {
      console.log(`  - ${emptyAnswers.length}件のanswersが空`);
    }
    if (noPatientName.length > 0) {
      console.log(`  - ${noPatientName.length}件のpatient_nameが空`);
    }
  }

  console.log("\n=== 確認完了 ===");
}

finalVerification().catch(err => {
  console.error("エラー:", err);
  process.exit(1);
});
