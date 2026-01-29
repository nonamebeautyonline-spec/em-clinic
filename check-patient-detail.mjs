// check-patient-detail.mjs
// 特定患者のSupabaseデータ詳細を確認

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const patientId = process.argv[2] || "20260101543";

console.log(`=== 患者 ${patientId} の詳細データ ===\n`);

try {
  const { data, error } = await supabase
    .from("intake")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("❌ クエリエラー:", error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log("❌ データが見つかりません");
    process.exit(1);
  }

  const row = data[0];

  console.log("基本情報:");
  console.log(`  patient_id: ${row.patient_id}`);
  console.log(`  patient_name: ${row.patient_name || "(なし)"}`);
  console.log(`  answerer_id: ${row.answerer_id || "(なし)"}`);
  console.log(`  line_id: ${row.line_id || "(なし)"}`);
  console.log(`  reserve_id: ${row.reserve_id || "(なし)"}`);
  console.log(`  status: ${row.status || "(なし)"}`);
  console.log(`  created_at: ${row.created_at}`);
  console.log(`  updated_at: ${row.updated_at || "(なし)"}`);

  console.log("\nanswersオブジェクト:");
  if (row.answers && Object.keys(row.answers).length > 0) {
    const answers = row.answers;
    console.log(`  全キー数: ${Object.keys(answers).length}`);
    console.log("");

    // 個人情報フィールド
    console.log("  【個人情報】");
    console.log(`    氏名: ${answers.氏名 || answers.name || "(なし)"}`);
    console.log(`    カナ: ${answers.カナ || answers.name_kana || "(なし)"}`);
    console.log(`    性別: ${answers.性別 || answers.sex || "(なし)"}`);
    console.log(`    生年月日: ${answers.生年月日 || answers.birth || "(なし)"}`);
    console.log(`    電話番号: ${answers.電話番号 || answers.tel || "(なし)"}`);
    console.log(`    answerer_id: ${answers.answerer_id || "(なし)"}`);
    console.log(`    line_id: ${answers.line_id || "(なし)"}`);

    // 問診内容フィールド
    console.log("\n  【問診内容】");
    console.log(`    ng_check: ${answers.ng_check || "(なし)"}`);
    console.log(`    current_disease_yesno: ${answers.current_disease_yesno || "(なし)"}`);
    console.log(`    current_disease_detail: ${answers.current_disease_detail || "(なし)"}`);
    console.log(`    glp_history: ${answers.glp_history || "(なし)"}`);
    console.log(`    med_yesno: ${answers.med_yesno || "(なし)"}`);
    console.log(`    med_detail: ${answers.med_detail || "(なし)"}`);
    console.log(`    allergy_yesno: ${answers.allergy_yesno || "(なし)"}`);
    console.log(`    allergy_detail: ${answers.allergy_detail || "(なし)"}`);
    console.log(`    entry_route: ${answers.entry_route || "(なし)"}`);
    console.log(`    entry_other: ${answers.entry_other || "(なし)"}`);

    // その他のフィールドがあれば表示
    const knownKeys = [
      "氏名", "name", "カナ", "name_kana", "性別", "sex", "生年月日", "birth",
      "電話番号", "tel", "answerer_id", "line_id",
      "ng_check", "current_disease_yesno", "current_disease_detail",
      "glp_history", "med_yesno", "med_detail", "allergy_yesno", "allergy_detail",
      "entry_route", "entry_other"
    ];
    const otherKeys = Object.keys(answers).filter(k => !knownKeys.includes(k));
    if (otherKeys.length > 0) {
      console.log("\n  【その他のフィールド】");
      otherKeys.forEach(k => {
        console.log(`    ${k}: ${answers[k]}`);
      });
    }
  } else {
    console.log("  (answersオブジェクトが空)");
  }

} catch (err) {
  console.error("❌ エラー:", err.message);
  process.exit(1);
}
