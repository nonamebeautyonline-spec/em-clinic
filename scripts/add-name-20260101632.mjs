// 20260101632 の名前をDBに設定
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log("=== 20260101632 の名前を設定 ===\n");

const patientId = "20260101632";
const patientName = "藤田　美月";

// intakeテーブルに名前を設定
console.log("【1. intakeテーブルに名前を設定】");
const { error: intakeError } = await supabase
  .from("intake")
  .update({
    patient_name: patientName,
    updated_at: new Date().toISOString()
  })
  .eq("patient_id", patientId);

if (intakeError) {
  console.error("❌ intakeエラー:", intakeError.message);
} else {
  console.log(`✅ intake: patient_name="${patientName}"`);
}

// patientsテーブルにも名前があるか確認
console.log("\n【2. patientsテーブルを確認】");
const { data: patient, error: patientError } = await supabase
  .from("patients")
  .select("name")
  .eq("patient_id", patientId)
  .single();

if (patientError) {
  console.log("patientsテーブルにレコードなし（問題なし）");
} else {
  console.log(`patients.name: "${patient.name || "(空)"}"`);
  if (!patient.name) {
    console.log("patientsテーブルにも名前を設定します...");
    const { error: updateError } = await supabase
      .from("patients")
      .update({ name: patientName })
      .eq("patient_id", patientId);

    if (updateError) {
      console.error("❌ patientsエラー:", updateError.message);
    } else {
      console.log("✅ patients: 名前を設定しました");
    }
  }
}

console.log("\n=== 完了 ===");
