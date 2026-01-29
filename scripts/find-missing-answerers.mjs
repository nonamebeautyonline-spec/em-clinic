// scripts/find-missing-answerers.mjs
// intakeにあってanswerersにない患者を特定

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

async function findMissingAnswerers() {
  console.log("=== intakeにあってanswerersにない患者を検索 ===\n");

  // 1. 全intakeのpatient_idを取得
  console.log("1. intakeから全patient_idを取得中...");
  let allIntakePatients = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data } = await supabase
      .from("intake")
      .select("patient_id, patient_name, answerer_id")
      .range(offset, offset + batchSize - 1);

    if (!data || data.length === 0) break;
    allIntakePatients = allIntakePatients.concat(data);
    if (data.length < batchSize) break;
    offset += batchSize;
  }

  const intakePatientIds = new Set(allIntakePatients.map(i => i.patient_id));
  console.log(`   intake total: ${allIntakePatients.length} records, ${intakePatientIds.size} unique patients\n`);

  // 2. 全answerersのpatient_idを取得
  console.log("2. answerersから全patient_idを取得中...");
  let allAnswerers = [];
  offset = 0;

  while (true) {
    const { data } = await supabase
      .from("answerers")
      .select("patient_id")
      .range(offset, offset + batchSize - 1);

    if (!data || data.length === 0) break;
    allAnswerers = allAnswerers.concat(data);
    if (data.length < batchSize) break;
    offset += batchSize;
  }

  const answererPatientIds = new Set(allAnswerers.map(a => a.patient_id));
  console.log(`   answerers total: ${allAnswerers.length} patients\n`);

  // 3. 差分を検出
  const missingPatients = [];

  for (const patient of allIntakePatients) {
    if (!answererPatientIds.has(patient.patient_id)) {
      // 重複を避けるため
      if (!missingPatients.find(p => p.patient_id === patient.patient_id)) {
        missingPatients.push(patient);
      }
    }
  }

  console.log(`3. answerersにない患者: ${missingPatients.length} 件\n`);

  if (missingPatients.length > 0) {
    console.log("患者リスト:");
    for (const p of missingPatients) {
      console.log(`  - patient_id: ${p.patient_id}, name: ${p.patient_name}, answerer_id: ${p.answerer_id}`);

      // intakeテーブルから詳細情報を取得
      const { data: details } = await supabase
        .from("intake")
        .select("answers")
        .eq("patient_id", p.patient_id)
        .limit(1)
        .single();

      if (details?.answers) {
        console.log(`    sex: ${details.answers.sex || "なし"}`);
        console.log(`    birthday: ${details.answers.birth || "なし"}`);
        console.log(`    tel: ${details.answers.tel || "なし"}`);
        console.log(`    name_kana: ${details.answers.name_kana || "なし"}`);
      }
      console.log("");
    }

    // answerersに登録
    console.log("4. answerersテーブルに登録中...\n");

    for (const p of missingPatients) {
      const { data: intake } = await supabase
        .from("intake")
        .select("answers, answerer_id, line_id")
        .eq("patient_id", p.patient_id)
        .limit(1)
        .single();

      const answers = intake?.answers || {};

      const { error } = await supabase
        .from("answerers")
        .insert({
          patient_id: p.patient_id,
          answerer_id: intake?.answerer_id || null,
          line_id: intake?.line_id || null,
          name: p.patient_name || answers.name || null,
          name_kana: answers.name_kana || answers.カナ || null,
          sex: answers.sex || null,
          birthday: answers.birth || null,
          tel: answers.tel || answers.電話番号 || null,
        });

      if (error) {
        console.log(`  ❌ patient_id=${p.patient_id} 登録失敗:`, error.message);
      } else {
        console.log(`  ✅ patient_id=${p.patient_id} (${p.patient_name}) 登録成功`);
      }
    }

    console.log("\n=== 完了 ===");
  } else {
    console.log("✅ 全ての患者がanswerersに登録されています");
  }
}

findMissingAnswerers();
