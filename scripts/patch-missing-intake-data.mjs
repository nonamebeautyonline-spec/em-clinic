// GASシートから問診データを取得し、DBの不足分を補完するスクリプト
// 使い方: node scripts/patch-missing-intake-data.mjs

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

if (!GAS_INTAKE_URL) {
  console.error("GAS_INTAKE_URL not set");
  process.exit(1);
}

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
  console.log("GASデータ取得 → DB補完スクリプト");
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

  // 2. DBから不完全なレコードを取得（ng_checkがないもの）
  console.log("DBから問診データが不完全なレコードを取得中...");
  let allData = [];
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
    allData = allData.concat(data);
    offset += limit;
    if (data.length < limit) break;
  }

  console.log(`DBから ${allData.length} 件取得\n`);

  // 不完全なレコードを抽出
  const incompleteRecords = allData.filter(row => {
    return !row.answers || !row.answers.ng_check;
  });

  console.log(`問診データ不完全: ${incompleteRecords.length} 件\n`);

  // 3. 補完処理
  let patched = 0;
  let notFoundInGas = 0;
  let noQuestionnaireInGas = 0;
  const patchedList = [];
  const notFoundList = [];

  for (const dbRow of incompleteRecords) {
    const pid = dbRow.patient_id;
    const gasRow = gasMap.get(pid);

    if (!gasRow) {
      notFoundInGas++;
      notFoundList.push(pid);
      continue;
    }

    // GASから問診データを抽出
    const gasAnswers = extractAnswers(gasRow);

    // GASにも問診データがない場合
    if (!gasAnswers.ng_check) {
      noQuestionnaireInGas++;
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
      patched++;
      patchedList.push(pid);
    }
  }

  console.log("========================================");
  console.log("補完結果");
  console.log("========================================");
  console.log(`補完成功: ${patched} 件`);
  console.log(`GASにデータなし: ${notFoundInGas} 件`);
  console.log(`GASにも問診なし: ${noQuestionnaireInGas} 件`);

  if (patchedList.length > 0 && patchedList.length <= 50) {
    console.log("\n【補完した患者ID】");
    patchedList.forEach(p => console.log("  " + p));
  }

  if (notFoundList.length > 0) {
    console.log("\n【GASに存在しない患者ID（" + notFoundList.length + "件）】");
    notFoundList.slice(0, 20).forEach(p => console.log("  " + p));
    if (notFoundList.length > 20) {
      console.log("  ... 他 " + (notFoundList.length - 20) + " 件");
    }
  }

  // 4. 補完後の確認
  console.log("\n========================================");
  console.log("補完後の確認");
  console.log("========================================");

  // 再度不完全なレコードを確認
  let stillIncomplete = 0;
  offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("intake")
      .select("patient_id, answers")
      .range(offset, offset + limit - 1);

    if (error || !data || data.length === 0) break;

    stillIncomplete += data.filter(row => !row.answers || !row.answers.ng_check).length;
    offset += limit;
    if (data.length < limit) break;
  }

  console.log(`補完後も不完全なレコード: ${stillIncomplete} 件`);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
