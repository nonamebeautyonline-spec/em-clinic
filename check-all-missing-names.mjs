// check-all-missing-names.mjs
// Supabaseで氏名なしの患者を全件確認

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== Supabaseで氏名なしの患者を全件確認 ===\n");

try {
  const { data, error } = await supabase
    .from("intake")
    .select("patient_id, patient_name, answerer_id, answers, created_at")
    .or("patient_name.is.null,patient_name.eq.")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ クエリエラー:", error);
    process.exit(1);
  }

  console.log(`氏名なし患者: ${data.length}件\n`);
  console.log("Patient ID\t\tCreated At\t\tAnswerer ID\tAnswers有無");
  console.log("=".repeat(80));

  data.forEach((row, idx) => {
    const hasAnswers = row.answers && Object.keys(row.answers).length > 0;
    const nameInAnswers = hasAnswers ? (row.answers.氏名 || row.answers.name || "(なし)") : "(空)";
    const answererId = row.answerer_id || "(なし)";
    const created = new Date(row.created_at).toLocaleString("ja-JP");

    console.log(`${row.patient_id}\t${created}\t${answererId}\t${hasAnswers ? "有(" + nameInAnswers + ")" : "無"}`);
  });

  console.log("\n=== 分類 ===");
  const withAnswers = data.filter(r => r.answers && Object.keys(r.answers).length > 0);
  const withoutAnswers = data.filter(r => !r.answers || Object.keys(r.answers).length === 0);

  console.log(`answersあり: ${withAnswers.length}件 → シートから補完可能`);
  console.log(`answersなし: ${withoutAnswers.length}件 → データ送信失敗の可能性`);

  if (withoutAnswers.length > 0) {
    console.log("\n⚠️  answersなし患者:");
    withoutAnswers.forEach(r => {
      console.log(`  - ${r.patient_id} (${new Date(r.created_at).toLocaleString("ja-JP")})`);
    });
  }

} catch (err) {
  console.error("❌ エラー:", err.message);
  process.exit(1);
}
