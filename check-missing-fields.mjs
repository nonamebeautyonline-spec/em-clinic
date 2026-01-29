// check-missing-fields.mjs
// Supabaseで個人情報フィールドが抜けているデータを確認

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== 個人情報フィールドが抜けているデータを確認 ===\n");

try {
  // 全intakeデータを取得（ページネーション対応）
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;
  let allData = [];

  console.log("Supabaseからデータ取得中...");

  while (hasMore) {
    const { data: pageData, error } = await supabase
      .from("intake")
      .select("patient_id, patient_name, answerer_id, line_id, answers, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("❌ クエリエラー:", error);
      process.exit(1);
    }

    allData = allData.concat(pageData);
    console.log(`  ${allData.length}件取得済み`);

    if (pageData.length < pageSize) {
      hasMore = false;
    } else {
      offset += pageSize;
    }
  }

  const data = allData;
  console.log(`\n全件数: ${data.length}件\n`);

  const issues = [];

  data.forEach(row => {
    const pid = row.patient_id;
    const answers = row.answers || {};

    const missing = [];

    // patient_name が空
    if (!row.patient_name || row.patient_name.trim() === "") {
      missing.push("patient_name");
    }

    // answerer_id が空
    if (!row.answerer_id || row.answerer_id.trim() === "") {
      missing.push("answerer_id");
    }

    // answers内の氏名が空
    if (!answers.氏名 && !answers.name) {
      missing.push("answers.氏名/name");
    }

    // answers内の性別が空
    if (!answers.性別 && !answers.sex) {
      missing.push("answers.性別/sex");
    }

    // answers内の生年月日が空
    if (!answers.生年月日 && !answers.birth) {
      missing.push("answers.生年月日/birth");
    }

    // answers内のカナが空
    if (!answers.カナ && !answers.name_kana) {
      missing.push("answers.カナ/name_kana");
    }

    // answers内の電話番号が空
    if (!answers.電話番号 && !answers.tel) {
      missing.push("answers.電話番号/tel");
    }

    if (missing.length > 0) {
      issues.push({
        patient_id: pid,
        patient_name: row.patient_name || "(なし)",
        answerer_id: row.answerer_id || "(なし)",
        missing: missing,
        created_at: row.created_at
      });
    }
  });

  if (issues.length === 0) {
    console.log("✅ 個人情報フィールドが抜けているデータはありません");
  } else {
    console.log(`⚠️  個人情報フィールドが抜けているデータ: ${issues.length}件\n`);
    console.log("Patient ID\t\t氏名\t\t\tAnswerer ID\t欠損フィールド");
    console.log("=".repeat(100));

    issues.forEach(issue => {
      const name = issue.patient_name || "(なし)";
      const namePadding = name.length < 8 ? "\t\t" : "\t";
      const answererId = issue.answerer_id || "(なし)";
      const answerIdPadding = answererId.length < 8 ? "\t" : "";

      console.log(`${issue.patient_id}\t${name}${namePadding}${answererId}${answerIdPadding}\t${issue.missing.join(", ")}`);
    });

    console.log("\n=== フィールド別集計 ===");
    const fieldCounts = {};
    issues.forEach(issue => {
      issue.missing.forEach(field => {
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
