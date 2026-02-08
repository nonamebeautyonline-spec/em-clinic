// GASから全問診データを取得してDBを完全同期するスクリプト
// 既存のanswersとマージして更新（上書きではない）

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

const GAS_INTAKE_URL = envVars.GAS_INTAKE_URL || envVars.GAS_INTAKE_LIST_URL;
const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

// 標準フィールド（answersに入れないもの）
const STANDARD_FIELDS = [
  "patient_id",
  "reserve_id",
  "reserved_date",
  "reserved_time",
  "patient_name",
  "status",
  "note",
  "prescription_menu",
  "line_id",
  "answerer_id",
  "予約時間",
  "reserveId",
  "reserved",
];

function extractAnswers(row) {
  const answers = {};
  for (const key of Object.keys(row)) {
    if (!STANDARD_FIELDS.includes(key) &&
        row[key] !== undefined &&
        row[key] !== null &&
        row[key] !== "") {
      answers[key] = row[key];
    }
  }
  return answers;
}

async function main() {
  console.log("========================================");
  console.log("GAS → DB 完全同期スクリプト");
  console.log("========================================\n");

  // 1. GASから全データ取得
  console.log("GASから問診データを取得中...");
  const gasResponse = await fetch(GAS_INTAKE_URL, {
    method: "GET",
    redirect: "follow",
  });

  if (!gasResponse.ok) {
    throw new Error(`GAS fetch failed: ${gasResponse.status}`);
  }

  const gasData = await gasResponse.json();
  let gasRows;
  if (gasData.ok && Array.isArray(gasData.rows)) {
    gasRows = gasData.rows;
  } else if (Array.isArray(gasData)) {
    gasRows = gasData;
  } else {
    throw new Error("Invalid GAS response");
  }

  console.log(`GASから ${gasRows.length} 件取得\n`);

  // GASデータをpatient_idでマップ化
  const gasMap = new Map();
  gasRows.forEach(row => {
    const pid = String(row.patient_id || "").trim();
    if (pid) {
      gasMap.set(pid, row);
    }
  });

  // 2. DBの全レコードを取得
  console.log("DBから全レコードを取得中...");
  let allDbData = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("intake")
      .select("patient_id, answers")
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("DB Error:", error);
      break;
    }
    if (!data || data.length === 0) break;
    allDbData = allDbData.concat(data);
    offset += limit;
    if (data.length < limit) break;
  }

  console.log(`DBから ${allDbData.length} 件取得\n`);

  // 3. DBにあってGASにもあるレコードを更新
  let updated = 0;
  let skipped = 0;
  let notInGas = 0;
  let alreadyComplete = 0;

  for (const dbRow of allDbData) {
    const pid = dbRow.patient_id;
    const gasRow = gasMap.get(pid);

    if (!gasRow) {
      notInGas++;
      continue;
    }

    // GASから問診データを抽出
    const gasAnswers = extractAnswers(gasRow);

    // GASにも問診データがない場合はスキップ
    if (!gasAnswers.ng_check) {
      skipped++;
      continue;
    }

    // DBに既に問診データがある場合はスキップ
    if (dbRow.answers && dbRow.answers.ng_check) {
      alreadyComplete++;
      continue;
    }

    // 既存のanswersとマージ（GASデータで上書き）
    const mergedAnswers = {
      ...(dbRow.answers || {}),
      ...gasAnswers
    };

    // DBを更新
    const { error } = await supabase
      .from("intake")
      .update({ answers: mergedAnswers })
      .eq("patient_id", pid);

    if (error) {
      console.error(`Update failed for ${pid}:`, error);
    } else {
      updated++;
    }
  }

  console.log("========================================");
  console.log("同期結果");
  console.log("========================================");
  console.log(`更新成功: ${updated} 件`);
  console.log(`既に完備: ${alreadyComplete} 件`);
  console.log(`GASにデータなし: ${notInGas} 件`);
  console.log(`GASに問診なし: ${skipped} 件`);

  // 4. 更新後の確認
  console.log("\n========================================");
  console.log("更新後の確認");
  console.log("========================================");

  // 不完全なレコード数を再確認
  let stillIncomplete = 0;
  offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("intake")
      .select("patient_id, answers, created_at")
      .range(offset, offset + limit - 1);

    if (error || !data || data.length === 0) break;

    data.forEach(row => {
      if (!row.answers || !row.answers.ng_check) {
        stillIncomplete++;
      }
    });
    offset += limit;
    if (data.length < limit) break;
  }

  console.log(`更新後も不完全: ${stillIncomplete} 件`);

  // 日付分布を確認
  console.log("\n【日付別の不完全レコード】");
  offset = 0;
  const dateStats = {};
  while (true) {
    const { data, error } = await supabase
      .from("intake")
      .select("patient_id, answers, created_at")
      .range(offset, offset + limit - 1);

    if (error || !data || data.length === 0) break;

    data.forEach(row => {
      if (!row.answers || !row.answers.ng_check) {
        const date = row.created_at?.slice(0, 10) || "unknown";
        dateStats[date] = (dateStats[date] || 0) + 1;
      }
    });
    offset += limit;
    if (data.length < limit) break;
  }

  Object.keys(dateStats).sort().slice(-10).forEach(d => {
    console.log(`  ${d}: ${dateStats[d]}件`);
  });
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
