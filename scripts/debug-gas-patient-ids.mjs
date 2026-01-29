// scripts/debug-gas-patient-ids.mjs
// GAS APIのpatient_id形式を確認

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

const gasIntakeUrl = envVars.GAS_INTAKE_LIST_URL;

async function debugGasPatientIds() {
  console.log("=== GAS API patient_id デバッグ ===\n");

  const response = await fetch(gasIntakeUrl, {
    method: "GET",
    redirect: "follow",
  });

  if (!response.ok) {
    console.log(`❌ GAS API error: ${response.status}`);
    return;
  }

  const data = await response.json();
  let rows;
  if (data.ok && Array.isArray(data.rows)) {
    rows = data.rows;
  } else if (Array.isArray(data)) {
    rows = data;
  }

  console.log(`総行数: ${rows.length}\n`);

  // 20260100253に近いpatient_idを検索
  const target = "20260100253";
  console.log(`target patient_id: ${target}\n`);

  // 部分一致で検索
  const similar = rows.filter(r => {
    const pid = String(r.patient_id || "").trim();
    return pid.includes("253") || pid.includes("20260100");
  });

  console.log(`部分一致した行: ${similar.length} 件`);
  similar.forEach(r => {
    console.log(`  patient_id: "${r.patient_id}" (type: ${typeof r.patient_id})`);
    console.log(`    name: ${r.name}`);
    console.log(`    sex: ${r.sex || "なし"}`);
    console.log(`    birth: ${r.birth || "なし"}`);
    console.log(`    tel: ${r.tel || "なし"}`);
    console.log("");
  });

  // フィールド名の確認
  if (rows.length > 0) {
    console.log("\n最初の行のフィールド一覧:");
    console.log(Object.keys(rows[0]).join(", "));

    console.log("\n最初の行のサンプルデータ:");
    console.log(JSON.stringify(rows[0], null, 2));
  }

  // patient_idが253を含む全レコードのpatient_idを表示
  console.log("\n\npatient_idに'253'を含む全レコード:");
  rows.forEach((r, idx) => {
    const pid = String(r.patient_id || "");
    if (pid.includes("253")) {
      console.log(`  [${idx}] patient_id: "${pid}" | name: ${r.name || "なし"}`);
    }
  });
}

debugGasPatientIds();
