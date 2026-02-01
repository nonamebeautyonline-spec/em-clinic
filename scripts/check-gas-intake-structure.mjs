// scripts/check-gas-intake-structure.mjs
// GASから取得した問診データの構造を確認

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

const gasIntakeListUrl = envVars.GAS_INTAKE_LIST_URL;

console.log("=== GAS問診データの構造確認 ===\n");

async function checkStructure() {
  const today = "2026-01-30";
  const url = `${gasIntakeListUrl}?from=${today}&to=${today}`;

  console.log(`URL: ${url}\n`);

  const response = await fetch(url, { method: "GET" });
  const gasIntakeData = await response.json();

  if (!Array.isArray(gasIntakeData)) {
    console.log("❌ データが配列ではありません");
    console.log(typeof gasIntakeData);
    console.log(JSON.stringify(gasIntakeData, null, 2).substring(0, 500));
    return;
  }

  console.log(`✅ ${gasIntakeData.length}件のデータ取得\n`);

  if (gasIntakeData.length === 0) {
    console.log("データが空です");
    return;
  }

  // 最初の1件を表示
  console.log("【最初の1件のデータ】");
  console.log(JSON.stringify(gasIntakeData[0], null, 2));

  console.log("\n【全レコードのpatient_id一覧】");
  gasIntakeData.forEach((row, idx) => {
    // いろんなフィールド名を試す
    const pid = row.patient_id || row.patientId || row["patient_id"] || row["Z列"] || row["患者ID"];
    console.log(`[${idx + 1}] ${pid}`);
  });
}

checkStructure();
