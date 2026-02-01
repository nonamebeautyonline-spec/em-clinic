// scripts/check-gas-intake-detail.mjs
// GAS問診シートの詳細データを確認（全キーを表示）

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
const targetPatients = ["20260100576", "20260101597"];

async function check() {
  console.log("=== GAS問診シートの詳細データ確認 ===\n");

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

    for (const patientId of targetPatients) {
      console.log(`\n【patient_id: ${patientId}】\n`);

      const gasRecord = gasRows.find(r => String(r.patient_id || "").trim() === patientId);

      if (!gasRecord) {
        console.log("❌ GASシートにデータなし");
        continue;
      }

      console.log("全キー一覧:\n");

      // 全てのキーと値を表示
      Object.entries(gasRecord).forEach(([key, value]) => {
        // 値が長すぎる場合は省略
        let displayValue = value;
        if (typeof value === "string" && value.length > 100) {
          displayValue = value.substring(0, 100) + "...";
        } else if (typeof value === "object" && value !== null) {
          displayValue = JSON.stringify(value).substring(0, 100) + "...";
        }

        console.log(`  ${key}: ${displayValue}`);
      });

      // カナに関連しそうなキーを強調表示
      console.log("\n【カナ関連キー】");
      const kanaKeys = Object.keys(gasRecord).filter(k =>
        k.includes("カナ") ||
        k.includes("kana") ||
        k.includes("Kana") ||
        k.includes("フリガナ") ||
        k.includes("ふりがな")
      );

      if (kanaKeys.length > 0) {
        kanaKeys.forEach(k => {
          console.log(`  ${k}: ${gasRecord[k]}`);
        });
      } else {
        console.log("  ❌ カナ関連のキーが見つかりません");
      }
    }
  } catch (e) {
    console.error("❌ エラー発生:", e.message);
  }
}

check();
