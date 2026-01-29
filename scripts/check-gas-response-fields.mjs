// scripts/check-gas-response-fields.mjs
// GAS APIレスポンスのフィールド名を確認

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

async function checkGasFields() {
  console.log("GAS APIレスポンス確認中...\n");

  const response = await fetch(gasIntakeUrl, {
    method: "GET",
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`GAS fetch failed: ${response.status}`);
  }

  const data = await response.json();

  let rows;
  if (data.ok && Array.isArray(data.rows)) {
    rows = data.rows;
  } else if (Array.isArray(data)) {
    rows = data;
  } else {
    console.log("Response structure:", Object.keys(data));
    return;
  }

  console.log(`総行数: ${rows.length}\n`);

  if (rows.length > 0) {
    const firstRow = rows[0];
    console.log("1行目のフィールド:");
    console.log(Object.keys(firstRow).join(", "));
    console.log("\nサンプルデータ（1行目）:");
    console.log(JSON.stringify(firstRow, null, 2));

    // 予約関連のフィールドを持つ行を探す
    const withReservation = rows.find(r =>
      r.reserve_id || r.reserveId || r.reserved_date || r.reservedDate
    );

    if (withReservation) {
      console.log("\n予約情報を持つ行のサンプル:");
      console.log(JSON.stringify(withReservation, null, 2));
    } else {
      console.log("\n予約情報を持つ行が見つかりませんでした");
    }
  }
}

checkGasFields();
