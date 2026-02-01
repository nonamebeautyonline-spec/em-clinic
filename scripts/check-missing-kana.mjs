// scripts/check-missing-kana.mjs
// 指定された患者のカナ（フリガナ）データを確認

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
const gasIntakeUrl = envVars.GAS_INTAKE_LIST_URL;

const targetPatients = ["20260100576", "20260101597"];

async function check() {
  console.log("=== カナ（フリガナ）欠落調査 ===\n");

  for (const patientId of targetPatients) {
    console.log(`\n【patient_id: ${patientId}】\n`);

    // 1. Supabase intakeテーブル
    console.log("1. Supabase intakeテーブル:");
    const { data: intake } = await supabase
      .from("intake")
      .select("patient_id, patient_name, answers")
      .eq("patient_id", patientId)
      .maybeSingle();

    if (intake) {
      console.log(`   patient_name: ${intake.patient_name || "NULL"}`);
      console.log(`   answers.カナ: ${intake.answers?.カナ || "NULL"}`);
      console.log(`   answers.name_kana: ${intake.answers?.name_kana || "NULL"}`);
      console.log(`   answers.フリガナ: ${intake.answers?.フリガナ || "NULL"}`);
    } else {
      console.log("   ❌ データなし");
    }

    // 2. Supabase answerersテーブル
    console.log("\n2. Supabase answerersテーブル:");
    const { data: answerer } = await supabase
      .from("answerers")
      .select("patient_id, name, name_kana")
      .eq("patient_id", patientId)
      .maybeSingle();

    if (answerer) {
      console.log(`   name: ${answerer.name || "NULL"}`);
      console.log(`   name_kana: ${answerer.name_kana || "NULL"}`);
    } else {
      console.log("   ❌ データなし");
    }

    // 3. GAS問診シート
    console.log("\n3. GAS問診シート:");
    try {
      const gasResponse = await fetch(gasIntakeUrl, {
        method: "GET",
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      if (!gasResponse.ok) {
        console.log(`   ❌ GAS API Error: ${gasResponse.status}`);
        continue;
      }

      const gasData = await gasResponse.json();
      let gasRows = gasData.ok && Array.isArray(gasData.rows) ? gasData.rows : gasData;

      if (!Array.isArray(gasRows)) {
        console.log("   ❌ レスポンスが配列ではありません");
        continue;
      }

      const gasRecord = gasRows.find(r => String(r.patient_id || "").trim() === patientId);

      if (gasRecord) {
        console.log(`   name: ${gasRecord.name || gasRecord.patient_name || "なし"}`);
        console.log(`   カナ: ${gasRecord.カナ || gasRecord.name_kana || gasRecord.kana || "なし"}`);
        console.log(`   フリガナ: ${gasRecord.フリガナ || gasRecord.ふりがな || "なし"}`);

        // answersオブジェクト内も確認
        if (gasRecord.answers) {
          console.log(`   answers.カナ: ${gasRecord.answers.カナ || "なし"}`);
          console.log(`   answers.name_kana: ${gasRecord.answers.name_kana || "なし"}`);
        }
      } else {
        console.log("   ❌ GASシートにデータなし");
      }
    } catch (e) {
      console.log(`   ❌ GAS取得エラー: ${e.message}`);
    }
  }

  console.log("\n\n【次の調査】");
  console.log("GAS問診マスター（J列）を確認します...");
}

check();
