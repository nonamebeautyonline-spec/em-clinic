// check-name-sync.mjs
// 「名前なし」患者のSupabase生データを確認

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const targetPatients = [
  "20260101541",
  "20260101534"
];

console.log("=== 「名前なし」患者のSupabase生データ確認 ===\n");

try {
  for (const patientId of targetPatients) {
    console.log(`Patient ID: ${patientId}`);
    console.log("=".repeat(80));

    const { data, error } = await supabase
      .from("intake")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error(`❌ クエリエラー:`, error.message);
      continue;
    }

    if (!data || data.length === 0) {
      console.log("❌ Supabaseにレコードなし");
      console.log("→ シートからSupabaseへの同期が失敗している\n");
      continue;
    }

    const row = data[0];

    console.log("\nSupabase intake レコード:");
    console.log(`  patient_id: ${row.patient_id}`);
    console.log(`  patient_name: ${row.patient_name || "(なし)"}`);
    console.log(`  reserve_id: ${row.reserve_id || "(なし)"}`);
    console.log(`  status: ${row.status || "(なし)"}`);
    console.log(`  answerer_id: ${row.answerer_id || "(なし)"}`);
    console.log(`  created_at: ${row.created_at}`);
    console.log(`  updated_at: ${row.updated_at || "(なし)"}`);

    console.log("\n  answers:");
    if (row.answers && Object.keys(row.answers).length > 0) {
      const answers = row.answers;
      console.log(`    氏名: ${answers.氏名 || answers.name || "(なし)"}`);
      console.log(`    カナ: ${answers.カナ || answers.name_kana || "(なし)"}`);
      console.log(`    性別: ${answers.性別 || answers.sex || "(なし)"}`);
      console.log(`    生年月日: ${answers.生年月日 || answers.birth || "(なし)"}`);
      console.log(`    電話番号: ${answers.電話番号 || answers.tel || "(なし)"}`);

      // answersに名前があるのにpatient_nameが空の場合
      const nameInAnswers = answers.氏名 || answers.name;
      if (nameInAnswers && !row.patient_name) {
        console.log("\n⚠️  answersには名前あり（" + nameInAnswers + "）だが、patient_nameが空");
        console.log("→ writeToSupabaseIntake_() の問題の可能性");
      } else if (!nameInAnswers && !row.patient_name) {
        console.log("\n❌ answersにもpatient_nameにも名前なし");
        console.log("→ 問診送信時にnameが送られていない（フロント側の問題）");
      }
    } else {
      console.log("    (answersが空)");
    }

    console.log("\n");
  }
} catch (err) {
  console.error("❌ エラー:", err.message);
  console.error(err.stack);
}
