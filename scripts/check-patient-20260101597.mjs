// scripts/check-patient-20260101597.mjs
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

async function checkPatient() {
  const patientId = "20260101597";

  console.log("=== patient_id: 20260101597 (岩波　ひまり) ===\n");

  // GASから取得
  const response = await fetch(gasIntakeUrl, { method: "GET", redirect: "follow" });
  const data = await response.json();
  let rows = data.ok && Array.isArray(data.rows) ? data.rows : data;

  const gasRecord = rows?.find(r => r.patient_id === patientId);

  console.log("1. GASデータ:");
  if (gasRecord) {
    console.log(`  name: ${gasRecord.name || "なし"}`);
    console.log(`  nameKana: ${gasRecord.nameKana || "なし"}`);
    console.log(`  sex: ${gasRecord.sex || "なし"}`);
    console.log(`  birth: ${gasRecord.birth || "なし"}`);
    console.log(`  tel: ${gasRecord.tel || "なし"}`);
    console.log(`  answerer_id: ${gasRecord.answerer_id || "なし"}`);
    console.log(`  line_id: ${gasRecord.line_id || "なし"}`);
  } else {
    console.log("  ❌ データなし");
  }

  // answerers
  const { data: answerer } = await supabase
    .from("answerers")
    .select("*")
    .eq("patient_id", patientId)
    .maybeSingle();

  console.log("\n2. Supabase answerers:");
  if (answerer) {
    console.log(`  name: ${answerer.name || "なし"}`);
    console.log(`  name_kana: ${answerer.name_kana || "なし"}`);
    console.log(`  sex: ${answerer.sex || "なし"}`);
    console.log(`  birthday: ${answerer.birthday || "なし"}`);
    console.log(`  tel: ${answerer.tel || "なし"}`);
  } else {
    console.log("  ❌ データなし");
  }

  // intake
  const { data: intake } = await supabase
    .from("intake")
    .select("*")
    .eq("patient_id", patientId)
    .maybeSingle();

  console.log("\n3. Supabase intake:");
  if (intake) {
    console.log(`  patient_name: ${intake.patient_name || "なし"}`);
    console.log(`  answers.name: ${intake.answers?.name || "なし"}`);
    console.log(`  answers.name_kana: ${intake.answers?.name_kana || "なし"}`);
    console.log(`  answers.カナ: ${intake.answers?.カナ || "なし"}`);
    console.log(`  answers.sex: ${intake.answers?.sex || "なし"}`);
    console.log(`  answers.birth: ${intake.answers?.birth || "なし"}`);
    console.log(`  answers.tel: ${intake.answers?.tel || "なし"}`);
  } else {
    console.log("  ❌ データなし");
  }

  // GASから更新
  if (gasRecord && gasRecord.nameKana) {
    console.log("\n4. 更新実行中...");

    // answerers更新
    const { error: answererError } = await supabase
      .from("answerers")
      .update({ name_kana: gasRecord.nameKana })
      .eq("patient_id", patientId);

    if (answererError) {
      console.log(`  ❌ answerers更新失敗:`, answererError.message);
    } else {
      console.log(`  ✅ answerers更新: name_kana = ${gasRecord.nameKana}`);
    }

    // intake更新
    if (intake) {
      const updatedAnswers = {
        ...intake.answers,
        name_kana: gasRecord.nameKana,
        カナ: gasRecord.nameKana,
      };

      const { error: intakeError } = await supabase
        .from("intake")
        .update({ answers: updatedAnswers })
        .eq("patient_id", patientId);

      if (intakeError) {
        console.log(`  ❌ intake更新失敗:`, intakeError.message);
      } else {
        console.log(`  ✅ intake更新: answers.name_kana = ${gasRecord.nameKana}`);
      }
    }
  }

  console.log("\n=== 確認完了 ===");
}

checkPatient();
