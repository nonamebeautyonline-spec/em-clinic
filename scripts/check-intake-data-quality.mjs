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
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDataQuality() {
  console.log("========================================");
  console.log("intakeテーブル データ品質チェック");
  console.log("========================================\n");

  // 全件数を取得
  const { count: totalCount } = await supabase
    .from("intake")
    .select("*", { count: "exact", head: true });

  console.log(`総レコード数: ${totalCount}件\n`);

  // 全データ取得（3000件程度なら問題なし）
  const { data: allData, error } = await supabase
    .from("intake")
    .select("patient_id, patient_name, answers, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error:", error);
    return;
  }

  // 問診項目の存在チェック
  const fields = [
    "current_disease_detail",
    "glp_history",
    "med_detail",
    "allergy_detail",
    "ng_check",
    "entry_route"
  ];

  const stats = {
    answersNull: 0,
    answersEmpty: 0,
    answersWithData: 0,
    fieldsPresent: {},
    fieldsMissing: {}
  };

  fields.forEach(f => {
    stats.fieldsPresent[f] = 0;
    stats.fieldsMissing[f] = 0;
  });

  const missingExamples = [];

  allData.forEach(row => {
    if (row.answers === null) {
      stats.answersNull++;
      if (missingExamples.length < 10) {
        missingExamples.push({
          patient_id: row.patient_id,
          patient_name: row.patient_name,
          created_at: row.created_at?.slice(0, 10),
          issue: "answers is null"
        });
      }
    } else if (typeof row.answers === "object" && Object.keys(row.answers).length === 0) {
      stats.answersEmpty++;
      if (missingExamples.length < 10) {
        missingExamples.push({
          patient_id: row.patient_id,
          patient_name: row.patient_name,
          created_at: row.created_at?.slice(0, 10),
          issue: "answers is empty object"
        });
      }
    } else {
      stats.answersWithData++;
      const answers = row.answers || {};
      fields.forEach(f => {
        if (answers[f] !== undefined && answers[f] !== null && answers[f] !== "") {
          stats.fieldsPresent[f]++;
        } else {
          stats.fieldsMissing[f]++;
        }
      });
    }
  });

  console.log(`\n【サンプル ${allData.length}件の詳細】`);
  console.log(`answersがnull: ${stats.answersNull}件`);
  console.log(`answersが空オブジェクト: ${stats.answersEmpty}件`);
  console.log(`answersにデータあり: ${stats.answersWithData}件`);

  console.log(`\n【問診項目の存在率（answersにデータがある ${stats.answersWithData}件中）】`);
  fields.forEach(f => {
    const present = stats.fieldsPresent[f];
    const pct = stats.answersWithData > 0 ? ((present / stats.answersWithData) * 100).toFixed(1) : 0;
    console.log(`  ${f}: ${present}件 (${pct}%)`);
  });

  // 月別の分布
  console.log(`\n【月別 answersデータ状況】`);
  const monthStats = {};
  allData.forEach(row => {
    if (!row.created_at) return;
    const month = row.created_at.slice(0, 7);
    if (!monthStats[month]) {
      monthStats[month] = { total: 0, withData: 0, null: 0, empty: 0 };
    }
    monthStats[month].total++;
    if (row.answers === null) {
      monthStats[month].null++;
    } else if (typeof row.answers === "object" && Object.keys(row.answers).length === 0) {
      monthStats[month].empty++;
    } else {
      monthStats[month].withData++;
    }
  });

  Object.keys(monthStats).sort().forEach(month => {
    const s = monthStats[month];
    const dataPct = ((s.withData / s.total) * 100).toFixed(0);
    console.log(`  ${month}: 全${s.total}件 / データあり${s.withData}件(${dataPct}%) / null${s.null}件 / 空${s.empty}件`);
  });

  // 欠損データのサンプル
  if (missingExamples.length > 0) {
    console.log(`\n【answersが欠損しているサンプル（最大10件）】`);
    missingExamples.forEach((ex, i) => {
      console.log(`  ${i + 1}. ${ex.patient_id} / ${ex.patient_name || "-"} / ${ex.created_at} / ${ex.issue}`);
    });
  }

  // yes/no と detail の整合性チェック
  console.log(`\n【条件付き質問の整合性チェック】`);
  const yesNoChecks = [
    { yesNo: "current_disease_yesno", detail: "current_disease_detail", label: "既往歴" },
    { yesNo: "med_yesno", detail: "med_detail", label: "内服薬" },
    { yesNo: "allergy_yesno", detail: "allergy_detail", label: "アレルギー" }
  ];

  yesNoChecks.forEach(check => {
    let yesWithDetail = 0;
    let yesWithoutDetail = 0;
    let noWithDetail = 0;
    let noWithoutDetail = 0;
    let noYesNo = 0;

    allData.forEach(row => {
      if (!row.answers || typeof row.answers !== "object") return;
      const answers = row.answers;
      const yesNoVal = answers[check.yesNo];
      const detailVal = answers[check.detail];
      const hasDetail = detailVal !== undefined && detailVal !== null && detailVal !== "";

      if (yesNoVal === "yes" || yesNoVal === "はい") {
        if (hasDetail) yesWithDetail++;
        else yesWithoutDetail++;
      } else if (yesNoVal === "no" || yesNoVal === "いいえ") {
        if (hasDetail) noWithDetail++;
        else noWithoutDetail++;
      } else {
        noYesNo++;
      }
    });

    console.log(`  ${check.label}:`);
    console.log(`    「はい」＋詳細あり: ${yesWithDetail}件`);
    console.log(`    「はい」＋詳細なし: ${yesWithoutDetail}件 ← 問題`);
    console.log(`    「いいえ」＋詳細あり: ${noWithDetail}件`);
    console.log(`    「いいえ」＋詳細なし: ${noWithoutDetail}件`);
    console.log(`    yes/no未設定: ${noYesNo}件`);
  });

  // 最新データの確認（移行後のデータは正常か）
  console.log(`\n【最新100件の状況】`);
  const { data: recentData } = await supabase
    .from("intake")
    .select("patient_id, answers, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  let recentNull = 0;
  let recentEmpty = 0;
  let recentWithData = 0;
  recentData?.forEach(row => {
    if (row.answers === null) recentNull++;
    else if (typeof row.answers === "object" && Object.keys(row.answers).length === 0) recentEmpty++;
    else recentWithData++;
  });

  console.log(`  answersがnull: ${recentNull}件`);
  console.log(`  answersが空: ${recentEmpty}件`);
  console.log(`  answersにデータあり: ${recentWithData}件`);
}

checkDataQuality();
