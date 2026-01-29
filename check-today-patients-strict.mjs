// check-today-patients-strict.mjs
// 今日作成された患者の厳密チェック

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// .env.productionから環境変数を読み込む
const envFile = readFileSync(".env.production", "utf-8");
const envVars = {};
envFile.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)="?([^"]*)"?$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== 今日作成された患者の厳密チェック ===\n");

try {
  const { data, error } = await supabase
    .from("intake")
    .select("patient_id, patient_name, answerer_id, answers, created_at")
    .gte("created_at", "2026-01-28T00:00:00Z")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ クエリエラー:", error);
    process.exit(1);
  }

  console.log(`今日作成された患者: ${data.length}件\n`);

  // GASと同じ条件でチェック（check-missing-fields.mjsと同じロジック）
  const missing = [];

  data.forEach(row => {
    const answers = row.answers || {};
    const issues = [];

    // patient_name が空
    if (!row.patient_name || row.patient_name.trim() === "") {
      issues.push("patient_name");
    }

    // answerer_id が空
    if (!row.answerer_id || row.answerer_id.trim() === "") {
      issues.push("answerer_id");
    }

    // answers内の氏名が空
    if (!answers.氏名 && !answers.name) {
      issues.push("answers.氏名/name");
    }

    // answers内の性別が空
    if (!answers.性別 && !answers.sex) {
      issues.push("answers.性別/sex");
    }

    // answers内の生年月日が空
    if (!answers.生年月日 && !answers.birth) {
      issues.push("answers.生年月日/birth");
    }

    // answers内のカナが空
    if (!answers.カナ && !answers.name_kana) {
      issues.push("answers.カナ/name_kana");
    }

    // answers内の電話番号が空
    if (!answers.電話番号 && !answers.tel) {
      issues.push("answers.電話番号/tel");
    }

    if (issues.length > 0) {
      missing.push({
        patient_id: row.patient_id,
        patient_name: row.patient_name || "(なし)",
        answerer_id: row.answerer_id || "(なし)",
        issues: issues,
        created_at: row.created_at
      });
    }
  });

  console.log(`個人情報が欠けている患者: ${missing.length}件\n`);

  if (missing.length === 0) {
    console.log("✅ 全ての患者に個人情報が揃っています");
  } else {
    console.log("Patient ID\t作成日時\t\t氏名\t\tAnswerer ID\t欠損フィールド");
    console.log("=".repeat(100));

    missing.forEach(item => {
      const createdJST = new Date(item.created_at).toLocaleString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });

      console.log(`${item.patient_id}\t${createdJST}\t${item.patient_name}\t${item.answerer_id}\t${item.issues.join(", ")}`);
    });

    // フィールド別集計
    console.log("\n=== フィールド別集計 ===");
    const fieldCounts = {};
    missing.forEach(item => {
      item.issues.forEach(field => {
        fieldCounts[field] = (fieldCounts[field] || 0) + 1;
      });
    });

    Object.entries(fieldCounts).sort((a, b) => b[1] - a[1]).forEach(([field, count]) => {
      console.log(`  ${field}: ${count}件`);
    });
  }

} catch (err) {
  console.error("❌ エラー:", err.message);
  process.exit(1);
}
