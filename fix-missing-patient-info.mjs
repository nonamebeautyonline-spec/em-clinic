// fix-missing-patient-info.mjs
// 個人情報が欠けている患者を問診シートから補完（Node.js版）
// 注: 問診シートへのアクセスが必要なため、GAS版を実行することを推奨

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== 個人情報欠損データの確認 ===\n");

try {
  // 今日作成された患者で個人情報が欠けているものを確認
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

  // 個人情報が欠けている患者を抽出
  const missing = data.filter(row => {
    const answers = row.answers || {};
    return !row.patient_name ||
           !row.answerer_id ||
           !answers.氏名 ||
           !answers.name ||
           !answers.電話番号 ||
           !answers.tel;
  });

  console.log(`個人情報が欠けている患者: ${missing.length}件\n`);

  if (missing.length === 0) {
    console.log("✅ 個人情報欠損はありません");
    process.exit(0);
  }

  console.log("Patient ID\t作成日時\t\t氏名\t\tAnswerer ID");
  console.log("=".repeat(80));

  missing.forEach(row => {
    const createdJST = new Date(row.created_at).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
    const name = row.patient_name || "(なし)";
    const answererId = row.answerer_id || "(なし)";

    console.log(`${row.patient_id}\t${createdJST}\t${name}\t${answererId}`);
  });

  console.log("\n=== 次の手順 ===\n");
  console.log("1. Google Apps Scriptエディタを開く");
  console.log("2. gas/intake/fix-missing-names.js の fixMissingNames 関数を実行");
  console.log("3. 実行完了後、再度このスクリプトを実行して確認");
  console.log("\nまたは、GAS実行ログで「更新成功」の件数を確認してください。");

} catch (err) {
  console.error("❌ エラー:", err.message);
  process.exit(1);
}
