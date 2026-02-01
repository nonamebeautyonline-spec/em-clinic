// scripts/sync-missing-intake-cron.mjs  
// GASにあってSupabaseにないintakeを定期的に同期するスクリプト

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const gasIntakeUrl = envVars.GAS_INTAKE_LIST_URL;

async function syncMissing() {
  console.log("=== GAS→Supabase 欠落データ同期 ===");
  console.log(new Date().toISOString() + "\n");

  // 1. GASからすべての問診を取得
  const gasResponse = await fetch(gasIntakeUrl, {
    method: "GET",
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  if (!gasResponse.ok) {
    console.log("❌ GAS API Error:", gasResponse.status);
    return;
  }

  const gasData = await gasResponse.json();
  let gasRows = gasData.ok && Array.isArray(gasData.rows) ? gasData.rows : gasData;

  console.log("GAS問診数:", gasRows.length);

  // 2. Supabase intakeテーブルの全patient_idを取得
  const { data: supabaseIntakes } = await supabase
    .from("intake")
    .select("patient_id");

  const supabasePids = new Set((supabaseIntakes || []).map(r => r.patient_id));
  console.log("Supabase intake数:", supabasePids.size);

  // 3. GASにあってSupabaseにないpatient_idを特定
  const missing = gasRows.filter(r => {
    const pid = String(r.patient_id || "").trim();
    return pid && !supabasePids.has(pid);
  });

  console.log("欠落データ:", missing.length, "件\n");

  if (missing.length === 0) {
    console.log("✅ すべて同期済み");
    return;
  }

  // 4. 欠落データを同期
  let synced = 0;
  for (const gasRecord of missing) {
    const patientId = gasRecord.patient_id;

    const answers = {
      氏名: gasRecord.name || "",
      name: gasRecord.name || "",
      性別: gasRecord.sex || "",
      sex: gasRecord.sex || "",
      生年月日: gasRecord.birth || "",
      birth: gasRecord.birth || "",
      カナ: gasRecord.name_kana || "",
      name_kana: gasRecord.name_kana || "",
      電話番号: gasRecord.tel || "",
      tel: gasRecord.tel || "",
      current_disease_detail: gasRecord.current_disease_detail || "",
      glp_history: gasRecord.glp_history || "",
      med_detail: gasRecord.med_detail || "",
      allergy_detail: gasRecord.allergy_detail || "",
    };

    const { error } = await supabase
      .from("intake")
      .insert({
        patient_id: patientId,
        patient_name: gasRecord.name || null,
        answerer_id: gasRecord.answerer_id || null,
        line_id: gasRecord.line_id || null,
        reserve_id: gasRecord.reserveId || gasRecord.reserved || null,
        reserved_date: gasRecord.reserved_date || null,
        reserved_time: gasRecord.reserved_time || null,
        status: null,
        answers: answers,
      });

    if (!error) {
      synced++;
      console.log("✅", patientId, gasRecord.name);
    } else {
      console.log("❌", patientId, error.message);
    }
  }

  console.log("\n完了:", synced, "/", missing.length, "件同期");
}

syncMissing();
