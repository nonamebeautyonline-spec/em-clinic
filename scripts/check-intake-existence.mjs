// scripts/check-intake-existence.mjs
// GAS問診シートに20251200228と20260101580のデータがあるか確認

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
const targetPatients = ["20251200228", "20260101580"];

async function check() {
  console.log("=== GAS問診シート確認 ===\n");

  try {
    const gasResponse = await fetch(gasIntakeUrl, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    if (!gasResponse.ok) {
      console.log(`❌ GAS API Error: ${gasResponse.status}`);
      return;
    }

    const gasData = await gasResponse.json();
    let gasRows = gasData.ok && Array.isArray(gasData.rows) ? gasData.rows : gasData;

    if (!Array.isArray(gasRows)) {
      console.log("❌ レスポンスが配列ではありません");
      return;
    }

    console.log(`GAS問診シート総件数: ${gasRows.length} 件\n`);

    for (const patientId of targetPatients) {
      console.log(`【patient_id: ${patientId}】`);

      const gasRecord = gasRows.find(r => String(r.patient_id || "").trim() === patientId);

      if (gasRecord) {
        console.log("  ✅ GAS問診シートにデータあり");
        console.log(`  name: ${gasRecord.name || gasRecord.patient_name || "なし"}`);
        console.log(`  reserve_id: ${gasRecord.reserveId || gasRecord.reserved || "なし"}`);
        console.log(`  reserved_date: ${gasRecord.reserved_date || "なし"}`);
        console.log(`  reserved_time: ${gasRecord.reserved_time || "なし"}`);
        console.log(`  timestamp: ${gasRecord.timestamp || "なし"}`);
        console.log(`  submittedAt: ${gasRecord.submittedAt || "なし"}`);
      } else {
        console.log("  ❌ GAS問診シートにデータなし");
        console.log("  → この患者は問診を送信していません");
      }
      console.log();
    }

    console.log("\n【結論】");
    console.log("GAS問診シートにデータがない場合:");
    console.log("  → 問診を送信せずに予約だけした");
    console.log("  → intakeテーブルにデータが作成されないのは正常");
    console.log("  → カルテに表示されないのも正常");
    console.log("\nGAS問診シートにデータがある場合:");
    console.log("  → GASからSupabaseへの同期が失敗した");
    console.log("  → intakeテーブルに手動で追加する必要がある");
  } catch (e) {
    console.error("❌ エラー発生:", e.message);
  }
}

check();
